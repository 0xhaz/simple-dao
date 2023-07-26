import { ethers, deployments, getNamedAccounts, network } from "hardhat";
import { assert, expect } from "chai";
import {
  FUNC_FUND,
  developmentChains,
  VOTING_DELAY,
  VOTING_PERIOD,
  MIN_DELAY,
  INITIAL_SUPPLY,
  s_fundingTime,
  s_fundRaisingGoalAmount,
  QUORUM_PERCENTAGE,
} from "../hardhat-helper";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { moveTime } from "../utils/move-time";
import { moveBlocks } from "../utils/move-block";
import { Crowdfund } from "../typechain-types";

const tokens = (n: number) => ethers.utils.parseEther(n.toString());
const ether = tokens;

describe("Crowdfund", () => {
  let projectOwner: SignerWithAddress,
    voter2: SignerWithAddress,
    voter3: SignerWithAddress,
    deployer: SignerWithAddress;

  let crowdfund: Crowdfund;

  const PERCENTAGE_FEE = 10;
  const MIN_STAKEHOLDER_FEE = ether(1);

  beforeEach(async () => {
    [deployer, projectOwner, voter2, voter3] = await ethers.getSigners();

    const Crowdfund = await ethers.getContractFactory("Crowdfund");
    crowdfund = await Crowdfund.deploy(
      deployer.address,
      PERCENTAGE_FEE,
      MIN_STAKEHOLDER_FEE
    );
    await crowdfund.deployed();
  });

  describe("Deployment", () => {
    it("should deploy the contracts correctly", async () => {
      assert.exists(crowdfund.address);
      expect(await crowdfund.getDaoPercentage()).to.equal(PERCENTAGE_FEE);
      expect(await crowdfund.getStakeholderFee()).to.equal(MIN_STAKEHOLDER_FEE);
    });
  });

  describe("Become a Stakeholder", () => {
    let transaction: any, result;
    describe("Success", () => {
      beforeEach(async () => {
        transaction = await crowdfund
          .connect(projectOwner)
          .contributeCampaign({ value: ether(1) });
        result = await transaction.wait();
      });

      it("should allow a user to become a stakeholder & contributor", async () => {
        expect(await crowdfund.isStakeholder(projectOwner.address)).to.equal(
          true
        );
        expect(await crowdfund.isContributor(projectOwner.address)).to.equal(
          true
        );
      });

      it("should allow a user to become a contributor if they are already a stakeholder", async () => {
        expect(await crowdfund.isStakeholder(projectOwner.address)).to.equal(
          true
        );
        await crowdfund
          .connect(projectOwner)
          .contributeCampaign({ value: ether(0.5) });
        expect(await crowdfund.isContributor(projectOwner.address)).to.equal(
          true
        );
      });

      it("should add dao balance to the contract", async () => {
        expect(await crowdfund.getDaoBalance()).to.equal(ether(1));
      });

      it("should emit a ProposalContribution event", async () => {
        await expect(transaction)
          .to.emit(crowdfund, "ProposalContribution")
          .withArgs(projectOwner.address, ether(1));
      });
    });

    describe("Failure", () => {
      it("should not allow non-stakeholder to create a proposal", async () => {
        const proposalTitle = "Proposal #1: Store 77 in the Box!";
        const proposalDescription = "Proposal #1: Store 77 in the Box!";
        const recipientAddress = projectOwner.address;
        const proposalAmount = ether(1);

        await expect(
          crowdfund
            .connect(projectOwner)
            .createProposal(
              proposalTitle,
              proposalDescription,
              recipientAddress,
              proposalAmount
            )
        ).to.be.reverted;
      });

      it("should not allow a user to become a stakeholder if the fee is not met", async () => {
        await expect(
          crowdfund.connect(voter2).contributeCampaign({ value: ether(0.5) })
        ).to.be.revertedWithCustomError(crowdfund, "Crowdfund__NotEnoughFunds");
      });
    });
  });

  describe("Create a Proposal", () => {
    let transaction: any, result;
    beforeEach(async () => {
      transaction = await crowdfund
        .connect(projectOwner)
        .contributeCampaign({ value: ether(1) });
      result = await transaction.wait();
    });

    describe("Success", () => {
      it("should allow a stakeholder to create a proposal", async () => {
        const proposalTitle = "Proposal #1: Store 77 in the Box!";
        const proposalDescription = "Proposal #1: Store 77 in the Box!";
        const recipientAddress = projectOwner.address;
        const proposalAmount = ether(1);

        await expect(
          crowdfund
            .connect(projectOwner)
            .createProposal(
              proposalTitle,
              proposalDescription,
              recipientAddress,
              proposalAmount
            )
        ).not.to.be.reverted;
      });

      it("should emit a ProposalCreated event", async () => {
        const proposalTitle = "Proposal #1: Store 77 in the Box!";
        const proposalDescription = "Proposal #1: Store 77 in the Box!";
        const recipientAddress = projectOwner.address;
        const proposalAmount = ether(1);
        transaction = await crowdfund
          .connect(projectOwner)
          .createProposal(
            proposalTitle,
            proposalDescription,
            recipientAddress,
            proposalAmount
          );
        result = await transaction.wait();

        await expect(transaction)
          .to.emit(crowdfund, "ProposalCreated")
          .withArgs(
            0,
            ether(1),
            "Proposal #1: Store 77 in the Box!",
            "Proposal #1: Store 77 in the Box!",
            projectOwner.address,
            projectOwner.address
          );
      });
    });

    describe("Failure", () => {
      it("should not allow a non-stakeholder to create a proposal", async () => {
        const proposalTitle = "Proposal #1: Store 77 in the Box!";
        const proposalDescription = "Proposal #1: Store 77 in the Box!";
        const recipientAddress = projectOwner.address;
        const proposalAmount = ether(1);

        await expect(
          crowdfund
            .connect(voter2)
            .createProposal(
              proposalTitle,
              proposalDescription,
              recipientAddress,
              proposalAmount
            )
        ).to.be.reverted;
      });
    });
  });

  describe("Vote on a Proposal", () => {
    let transaction: any, result: any, proposalId: number;
    beforeEach(async () => {
      transaction = await crowdfund
        .connect(projectOwner)
        .contributeCampaign({ value: ether(1) });
      result = await transaction.wait();

      transaction = await crowdfund.connect(voter2).contributeCampaign({
        value: ether(1),
      });
      result = await transaction.wait();

      const proposalTitle = "Proposal #1: Store 77 in the Box!";
      const proposalDescription = "Proposal #1: Store 77 in the Box!";
      const recipientAddress = projectOwner.address;
      const proposalAmount = ether(1);
      transaction = await crowdfund
        .connect(projectOwner)
        .createProposal(
          proposalTitle,
          proposalDescription,
          recipientAddress,
          proposalAmount
        );
      result = await transaction.wait();
      proposalId = result.events[0].args.id.toNumber();
    });

    describe("Success", () => {
      it("should allow a stakeholder to vote on a proposal", async () => {
        await expect(crowdfund.connect(voter2).voteOnProposal(proposalId, true))
          .not.to.be.reverted;
      });

      it("should emit a ProposalVoted event", async () => {
        const proposalId = result.events[0].args.id.toNumber();
        transaction = await crowdfund
          .connect(voter2)
          .voteOnProposal(proposalId, true);
        result = await transaction.wait();

        await expect(transaction)
          .to.emit(crowdfund, "ProposalVoted")
          .withArgs(proposalId, voter2.address, true);
      });
    });

    describe("Failure", () => {
      it("should not allow a non-stakeholder to vote on a proposal", async () => {
        await expect(crowdfund.connect(voter3).voteOnProposal(0, true)).to.be
          .reverted;
      });

      it("should not allow a stakeholder to vote on a proposal that does not exist", async () => {
        await expect(crowdfund.connect(voter2).voteOnProposal(1, true)).to.be
          .reverted;
      });

      it("should not allow a stakeholder to vote on a proposal that has already been voted on", async () => {
        await crowdfund.connect(voter2).voteOnProposal(0, true);
        await expect(
          crowdfund.connect(voter2).voteOnProposal(0, true)
        ).to.be.revertedWithCustomError(crowdfund, "Crowdfund__NotContributor");
      });
    });
  });

  describe("Release Funds from Chainlink Keeper", () => {
    let transaction: any, result: any, proposalId: number;

    describe("Success", () => {
      beforeEach(async () => {
        transaction = await crowdfund
          .connect(projectOwner)
          .contributeCampaign({ value: ether(1) });
        result = await transaction.wait();

        transaction = await crowdfund.connect(voter2).contributeCampaign({
          value: ether(1),
        });
        result = await transaction.wait();

        const proposalTitle = "Proposal #1: Store 77 in the Box!";
        const proposalDescription = "Proposal #1: Store 77 in the Box!";
        const recipientAddress = projectOwner.address;
        const proposalAmount = ether(1);
        transaction = await crowdfund
          .connect(projectOwner)
          .createProposal(
            proposalTitle,
            proposalDescription,
            recipientAddress,
            proposalAmount
          );
        result = await transaction.wait();
        proposalId = result.events[0].args.id.toNumber();

        transaction = await crowdfund
          .connect(deployer)
          .setKeeperRegistry(deployer.address);
        result = await transaction.wait();

        transaction = await crowdfund
          .connect(voter2)
          .voteOnProposal(proposalId, true);
        result = await transaction.wait();

        await network.provider.send("evm_increaseTime", [86400 * 2]); // Advance the block timestamp by 48 hours
        await network.provider.send("evm_mine"); // Mine a new block with the updated timestamp

        transaction = await crowdfund.connect(deployer).performUpkeep([]);
        result = await transaction.wait();
        // console.log(await crowdfund.getDaoBalance());
      });

      it("should allow Keeper to release funds", async () => {
        expect(await crowdfund.getDaoBalance()).to.equal(
          ethers.utils.parseEther("1")
        );
      });

      it("should emit a ProposalFundsReleased event", async () => {
        await expect(transaction)
          .to.emit(crowdfund, "ProposalPaid")
          .withArgs(
            proposalId,
            projectOwner.address,
            ethers.utils.parseEther("1")
          );
      });
    });

    describe("Failure", () => {
      beforeEach(async () => {
        transaction = await crowdfund
          .connect(projectOwner)
          .contributeCampaign({ value: ether(1) });
        result = await transaction.wait();

        transaction = await crowdfund.connect(voter2).contributeCampaign({
          value: ether(1),
        });
        result = await transaction.wait();

        const proposalTitle = "Proposal #1: Store 77 in the Box!";
        const proposalDescription = "Proposal #1: Store 77 in the Box!";
        const recipientAddress = projectOwner.address;
        const proposalAmount = ether(1);
        transaction = await crowdfund
          .connect(projectOwner)
          .createProposal(
            proposalTitle,
            proposalDescription,
            recipientAddress,
            proposalAmount
          );
        result = await transaction.wait();
        proposalId = result.events[0].args.id.toNumber();

        transaction = await crowdfund
          .connect(deployer)
          .setKeeperRegistry(deployer.address);
        result = await transaction.wait();

        await network.provider.send("evm_increaseTime", [86400 * 2]); // Advance the block timestamp by 48 hours
        await network.provider.send("evm_mine"); // Mine a new block with the updated timestamp

        transaction = await crowdfund.connect(voter2).performUpkeep([]);
        result = await transaction.wait();
      });
      it("should not release the payment if the quorum does not meet", async () => {
        expect(await crowdfund.getDaoBalance()).to.equal(
          ethers.utils.parseEther("2")
        );
      });

      it("should not release the payment if the downvotes are more than upvotes", async () => {
        transaction = await crowdfund
          .connect(voter2)
          .voteOnProposal(proposalId, false);
        result = await transaction.wait();

        expect(await crowdfund.getDaoBalance()).to.equal(
          ethers.utils.parseEther("2")
        );
      });
    });
  });
});

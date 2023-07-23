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
    it("should allow deployer to create a proposal", async () => {
      await crowdfund.grantRoleToUser(
        crowdfund.i_STAKEHOLDER_ROLE(),
        deployer.address
      );

      const proposalTitle = "Proposal #1: Store 77 in the Box!";
      const proposalDescription = "Proposal #1: Store 77 in the Box!";
      const recipientAddress = projectOwner.address;
      const proposalAmount = ether(1);

      await expect(
        crowdfund
          .connect(deployer)
          .createProposal(
            proposalTitle,
            proposalDescription,
            recipientAddress,
            proposalAmount
          )
      ).not.to.be.reverted;
    });

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
});

const { ethers } = require("hardhat");

export const networkConfig = {
  hardhat: {
    chainId: 1337,
    name: "hardhat",
    url: "http://localhost:8545",
    entranceFee: ethers.utils.parseEther("0.01"),
    percentageFee: "10",
  },
  sepolia: {
    chainId: 11155111,
    name: "sepolia",
    url: "https://rpc.sepolia.io",
    entranceFee: ethers.utils.parseEther("0.01"),
    percentageFee: "10",
  },
};

export const developmentChains = ["hardhat", "localhost"];
export const INITIAL_SUPPLY = "1000000000000000000000000";
export const MIN_DELAY = 0;
export const VOTING_DELAY = 0;
export const VOTING_PERIOD = 50;
export const QUORUM_PERCENTAGE = 0;
export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
export const NEW_VALUE = 77;
export const FUNC = "store";
export const FUNC_FUND = "approveFundByDao";
export const FUNC_CANCEL_APPROVAL = "cancelApprovedFundByDao";
export const PROPOSAL_DESCRIPTION = "Proposal #1: Store 77 in the Box!";
export const proposalFile = "proposal.json";
export const s_projectID = 1;
export const s_projectName = "Sample Project";
export const s_website = "https://www.sampleproject.com";
export const s_projectDescription = "Sample Project Description";
export const s_fundRaisingGoalAmount = "1000000";
export const s_roadMap = "Just click the video";
export const s_otherSources = "You dont need anything else";
export const s_fundingTime = 604800; // 10 sec.

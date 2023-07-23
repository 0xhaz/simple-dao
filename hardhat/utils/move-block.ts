import { network } from "hardhat";

export function sleep(timeMS: number) {
  return new Promise(resolve => setTimeout(resolve, timeMS));
}

export async function moveBlocks(amount: number, sleepAmount: number = 0) {
  console.log(`Moving ${amount} blocks...`);
  for (let i = 0; i < amount; i++) {
    await network.provider.request({
      method: "evm_mine",
      params: [],
    });
    if (sleepAmount > 0) {
      console.log(`Sleeping ${sleepAmount} ms...`);
      await sleep(sleepAmount);
    }
  }
}

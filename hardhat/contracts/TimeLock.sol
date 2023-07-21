// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/governance/TimelockController.sol";

contract TimeLock is TimelockController {
    /**
     * @param minDelay Minimum delay for timelock contract
     * @param proposers Array of proposers
     * @param executors Array of executors
     * @param admin Admin of timelock contract
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, msg.sender) {}
}

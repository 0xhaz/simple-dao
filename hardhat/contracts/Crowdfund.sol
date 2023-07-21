// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

error Crowdfund__NotApproved();
error Crowdfund__UpkeepNeeded();
error Crowdfunc__TransferFailed(uint256 _projectId);
error Crowdfund__NotEnoughFunds();
error Crowdfund__WithdrawFunds();
error Crowdfund__WithdrawFundsFailed();
error Crowdfund__EntranceFeeNeeded();

contract Crowdfund is Ownable, KeeperCompatible {
    uint256 private s_projectId;
    uint256 private s_entranceFee;
    uint256 private s_percentageFee;
    uint256 private s_projectCount = 1;

    enum ProjectStatus {
        Pending,
        Active,
        Completed,
        Cancelled
    }

    struct Project {
        uint256 id;
        string name;
        string description;
        uint256 goal;
        uint256 deadline;
        uint256 totalFunds;
        uint256 totalFunders;
        address payable proposer;
        address payable funder;
        ProjectStatus status;
        mapping(address => uint256) funds;
        mapping(address => bool) isFunder;
    }

    mapping(uint256 => Project) private s_projects;
    mapping(uint256 => bool) private s_isFunded;
    mapping(address => bool) private s_isEntranceFeePaid;
    mapping(uint256 => mapping(uint256 => uint256)) private s_projectToTime;
    mapping(uint256 => mapping(address => uint256)) private s_funders;
    mapping(uint256 => uint256) private s_projectTime;
    mapping(uint256 => bool) private s_isApproved;
    mapping(uint256 => address) private s_proposerIndex;
    mapping(uint256 => ProjectStatus) private s_projectStatus;

    event ProjectToFund(uint256 indexed _projectId);
    event EntranceFeePaid(address indexed _proposer);

    modifier daoApproved(uint256 _projectId) {
        if (!s_isApproved[_projectId]) {
            revert Crowdfund__NotApproved();
        }
        _;
    }

    constructor(uint256 _entranceFee, uint256 _percentageFee) {
        s_entranceFee = _entranceFee;
        s_percentageFee = _percentageFee;
    }

    function fundProject(
        uint256 _projectId
    ) public payable daoApproved(_projectId) {
        Project storage project = s_projects[_projectId];

        project.id = _projectId;
        project.funder = payable(msg.sender);

        project.totalFunds += msg.value;
        project.totalFunders += 1;
        project.isFunder[msg.sender] = true;
        project.funds[msg.sender] += msg.value;
    }

    function approveFundByDao(
        string memory _name,
        string memory _description,
        uint256 _goal,
        uint256 _deadline
    ) external onlyOwner {
        uint256 projectId = s_projectCount;

        Project storage newProject = s_projects[projectId];
        newProject.id = projectId;

        if (!s_isEntranceFeePaid[s_proposerIndex[projectId]]) {
            revert Crowdfund__EntranceFeeNeeded();
        }

        newProject.name = _name;
        newProject.description = _description;
        newProject.goal = _goal;
        newProject.deadline = _deadline;
        newProject.proposer = payable(msg.sender);
        newProject.status = ProjectStatus.Pending;

        s_proposerIndex[projectId] = newProject.proposer;
        s_projectToTime[projectId][_deadline] = block.timestamp;
        s_isApproved[projectId] = true;
        s_isFunded[projectId] = true;

        emit ProjectToFund(projectId);

        s_projectCount++;
    }

    function cancelApprovedFundByDao(uint256 _projectId) external onlyOwner {
        s_isApproved[_projectId] = false;
        s_isFunded[_projectId] = false;
        s_projectStatus[_projectId] = ProjectStatus.Cancelled;
    }

    function submitFee() external payable {
        if (msg.value < s_entranceFee) {
            revert Crowdfund__NotEnoughFunds();
        } else {
            s_isEntranceFeePaid[msg.sender] = true;
            s_proposerIndex[s_projectCount] = msg.sender;
            emit EntranceFeePaid(msg.sender);
        }
    }

    function withdrawFund(uint256 _projectId) external {
        if (s_projectStatus[_projectId] == ProjectStatus.Cancelled) {}
    }

    function _payTo(address _to, uint256 _amount) internal {
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Crowdfund: Transfer failed");
    }

    function _payOut(uint256 _projectId) internal {
        Project storage project = s_projects[_projectId];

        uint256 fee = (project.totalFunds * s_percentageFee) / 100;
        uint256 amount = project.totalFunds - fee;

        _payTo(project.proposer, amount);
        _payTo(owner(), fee);
    }
}

// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
import "hardhat/console.sol";

error Crowdfund__NotContributor();
error Crowdfund__NotStakeholder();
error Crowdfund__CampaignExpired();
error Crowdfund__DoubleVoting();
error Crowdfund__CampaignPaid();
error Crowdfund__NotEnoughFunds();
error Crowdfund__EntranceFeeNeeded();

contract Crowdfund is
    AccessControl,
    AccessControlEnumerable,
    ReentrancyGuard,
    KeeperCompatibleInterface
{
    bytes32 private immutable i_CONTRIBUTOR_ROLE = keccak256("CONTRIBUTOR");
    bytes32 private immutable i_STAKEHOLDER_ROLE = keccak256("STAKEHOLDER");
    address private i_KEEPER_REGISTRY;
    uint256 private s_MIN_STAKEHOLDER_FEE = 1 ether;
    uint32 MIN_VOTE_DURATION = 1 days;
    uint256 private s_totalProposals;
    uint256 private s_daoBalance;
    uint256 private s_daoPercentage;

    modifier stakeholderOnly() {
        if (!hasRole(i_STAKEHOLDER_ROLE, msg.sender))
            revert Crowdfund__NotStakeholder();
        _;
    }

    modifier contributorOnly() {
        if (!hasRole(i_CONTRIBUTOR_ROLE, msg.sender))
            revert Crowdfund__NotContributor();
        _;
    }

    struct Proposal {
        uint256 id;
        uint256 amount;
        uint256 duration;
        uint256 upvotes;
        uint256 downvotes;
        string title;
        string description;
        bool passed;
        bool paid;
        address payable recipient;
        address payable proposer;
        address executor;
    }

    struct Voted {
        address voter;
        uint256 timestamp;
        bool vote;
    }

    event ProposalCreated(
        uint256 indexed id,
        uint256 amount,
        string title,
        string description,
        address indexed recipient,
        address indexed proposer
    );

    event ProposalVoted(uint256 indexed id, address indexed voter, bool vote);

    event ProposalPaid(
        uint256 indexed id,
        address indexed recipient,
        uint256 indexed amount
    );

    event ProposalContribution(address indexed contributor, uint256 amount);

    mapping(uint256 => Proposal) private s_proposals;
    mapping(address => uint256[]) private s_stakeholderVotes;
    mapping(uint256 => Voted[]) private s_voted;
    mapping(address => uint256) private s_contributors;
    mapping(address => uint256) private s_stakeholders;
    mapping(uint256 => bool) private s_proposalExists;

    constructor(
        address _admin,
        uint256 _daoPercentage,
        uint256 _stakeholderFee
    ) {
        s_daoPercentage = _daoPercentage;
        s_MIN_STAKEHOLDER_FEE = _stakeholderFee;
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _setupRole(i_STAKEHOLDER_ROLE, _admin);
        _setupRole(i_CONTRIBUTOR_ROLE, _admin);
    }

    function createProposal(
        string calldata _title,
        string calldata _description,
        address payable _recipient,
        uint256 _amount
    ) external stakeholderOnly {
        uint256 proposalId = s_totalProposals++;
        Proposal storage newProposal = s_proposals[proposalId];

        newProposal.id = proposalId;
        newProposal.amount = _amount;
        newProposal.duration = block.timestamp + MIN_VOTE_DURATION;
        newProposal.title = _title;
        newProposal.description = _description;
        newProposal.recipient = _recipient;
        newProposal.proposer = payable(msg.sender);

        s_proposalExists[proposalId] = true;

        emit ProposalCreated(
            proposalId,
            _amount,
            _title,
            _description,
            _recipient,
            msg.sender
        );
    }

    function voteOnProposal(
        uint256 _proposalId,
        bool _vote
    ) external stakeholderOnly {
        require(
            s_proposalExists[_proposalId],
            "Crowdfund: proposal does not exists"
        );
        Proposal storage proposal = s_proposals[_proposalId];
        Voted[] storage voted = s_voted[_proposalId];
        bool hasVoted = false;

        for (uint256 i = 0; i < voted.length; i++) {
            if (voted[i].voter == msg.sender) {
                hasVoted = true;
                break;
            }
        }

        if (hasVoted) {
            revert Crowdfund__NotContributor();
        }

        voted.push(
            Voted({voter: msg.sender, timestamp: block.timestamp, vote: _vote})
        );

        if (_vote) {
            proposal.upvotes++;
        } else {
            proposal.downvotes++;
        }

        uint256 totalStakeholders = _countStakeholders();
        uint256 quorum = (totalStakeholders * 50) / 100;

        if (proposal.upvotes >= quorum) {
            proposal.passed = true;
        } else {
            proposal.passed = false;
        }

        emit ProposalVoted(_proposalId, msg.sender, _vote);
    }

    function contributeCampaign() external payable {
        if (
            msg.value < s_MIN_STAKEHOLDER_FEE &&
            !hasRole(i_STAKEHOLDER_ROLE, msg.sender)
        ) {
            revert Crowdfund__NotEnoughFunds();
        }

        if (!hasRole(i_STAKEHOLDER_ROLE, msg.sender)) {
            uint256 totalContributions = s_contributors[msg.sender] + msg.value;

            if (totalContributions >= s_MIN_STAKEHOLDER_FEE) {
                _grantRole(i_STAKEHOLDER_ROLE, msg.sender);
                _grantRole(i_CONTRIBUTOR_ROLE, msg.sender);
                s_stakeholders[msg.sender] = totalContributions;
            }
            s_contributors[msg.sender] += msg.value;
        } else {
            s_contributors[msg.sender] += msg.value;
            s_stakeholders[msg.sender] += msg.value;
        }

        s_daoBalance += msg.value;

        emit ProposalContribution(msg.sender, msg.value);
    }

    function fundKeeperJob(
        address _keeperRegistry,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        i_KEEPER_REGISTRY = _keeperRegistry;
        _payTo(payable(_keeperRegistry), _amount);
    }

    function setStakeholderFee(
        uint256 _fee
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        s_MIN_STAKEHOLDER_FEE = _fee;
    }

    function grantRoleToUser(
        bytes32 _role,
        address _account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(_role, _account);
    }

    function setVoteDuration(
        uint32 _duration
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        MIN_VOTE_DURATION = _duration;
    }

    function setDaoPercentage(
        uint256 _percentage
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        s_daoPercentage = _percentage;
    }

    function setKeeperRegistry(
        address _keeperRegistry
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        i_KEEPER_REGISTRY = _keeperRegistry;
    }

    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        uint256 latestProposalId = s_totalProposals - 1;
        upkeepNeeded =
            s_proposals[latestProposalId].passed &&
            s_proposals[latestProposalId].duration >= block.timestamp &&
            s_daoBalance >= s_proposals[latestProposalId].amount &&
            !s_proposals[latestProposalId].paid;
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        uint256 latestProposalId = s_totalProposals - 1;
        Proposal storage proposal = s_proposals[latestProposalId];
        uint256 totalStakeholders = _countStakeholders();
        uint256 quorum = (totalStakeholders * 50) / 100;

        if (proposal.passed && !proposal.paid) {
            _payTo(proposal.recipient, proposal.amount);
            s_daoBalance -= proposal.amount;
            proposal.paid = true;

            emit ProposalPaid(
                latestProposalId,
                proposal.recipient,
                proposal.amount
            );
        }
    }

    function getProposals() external view returns (Proposal[] memory) {
        Proposal[] memory proposals = new Proposal[](s_totalProposals);

        for (uint256 i = 0; i < s_totalProposals; i++) {
            proposals[i] = s_proposals[i];
        }

        return proposals;
    }

    function getContributors() external view returns (address[] memory) {
        address[] memory contributors = new address[](s_totalProposals);

        for (uint256 i = 0; i < s_totalProposals; i++) {
            contributors[i] = s_proposals[i].proposer;
        }

        return contributors;
    }

    function getStakeholders() external view returns (address[] memory) {
        address[] memory stakeholders = new address[](s_totalProposals);

        for (uint256 i = 0; i < s_totalProposals; i++) {
            stakeholders[i] = s_proposals[i].proposer;
        }

        return stakeholders;
    }

    function getContributor(
        address _contributor
    ) external view returns (uint256) {
        return s_contributors[_contributor];
    }

    function getStakeholder(
        address _stakeholder
    ) external view returns (uint256) {
        return s_stakeholders[_stakeholder];
    }

    function getDaoBalance() external view returns (uint256) {
        return s_daoBalance;
    }

    function isStakeholder(address _stakeholder) external view returns (bool) {
        return hasRole(i_STAKEHOLDER_ROLE, _stakeholder);
    }

    function isContributor(address _contributor) external view returns (bool) {
        return hasRole(i_CONTRIBUTOR_ROLE, _contributor);
    }

    function getProposal(
        uint256 _proposalId
    ) external view returns (Proposal memory) {
        return s_proposals[_proposalId];
    }

    function getProposalVotes(
        uint256 _proposalId
    ) external view returns (Voted[] memory) {
        return s_voted[_proposalId];
    }

    function getProposalVoters(
        uint256 _proposalId
    ) external view returns (address[] memory) {
        Voted[] memory voted = s_voted[_proposalId];
        address[] memory voters = new address[](voted.length);

        for (uint256 i = 0; i < voted.length; i++) {
            voters[i] = voted[i].voter;
        }

        return voters;
    }

    function getProposalVoter(
        uint256 _proposalId,
        address _voter
    ) external view returns (Voted memory) {
        Voted[] memory voted = s_voted[_proposalId];

        for (uint256 i = 0; i < voted.length; i++) {
            if (voted[i].voter == _voter) {
                return voted[i];
            }
        }
    }

    function getKeeperRegistry() external view returns (address) {
        return i_KEEPER_REGISTRY;
    }

    function getVoteDuration() external view returns (uint32) {
        return MIN_VOTE_DURATION;
    }

    function getStakeholderFee() external view returns (uint256) {
        return s_MIN_STAKEHOLDER_FEE;
    }

    function getDaoPercentage() external view returns (uint256) {
        return s_daoPercentage;
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(AccessControl, AccessControlEnumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _revokeRole(
        bytes32 role,
        address account
    ) internal virtual override(AccessControl, AccessControlEnumerable) {
        super._revokeRole(role, account);
    }

    function _grantRole(
        bytes32 role,
        address account
    ) internal virtual override(AccessControl, AccessControlEnumerable) {
        super._grantRole(role, account);
    }

    function _payTo(address payable _to, uint256 _amount) internal {
        uint256 fee = (_amount * s_daoPercentage) / 100;
        uint256 amount = _amount - fee;
        (bool success, ) = _to.call{value: amount}("");
        require(success, "Crowdfund: transfer failed");
    }

    function _countStakeholders() internal view returns (uint256) {
        return getRoleMemberCount(i_STAKEHOLDER_ROLE);
    }
}

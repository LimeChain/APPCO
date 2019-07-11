pragma solidity ^0.5.3;

import "./../Math/Convert.sol";
import "./../Tokens/ICOToken.sol";
import "./../ITokenTransferLimiter.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract CategoryVoting is ITokenTransferLimiter {

    using Convert for bytes;
    using SafeMath for uint256;
    
    // Categories mapping id->Category

    // struct Category
    // details
    // period len //5 hrs like Moloch, 1 month, 3 months
    // category max payout
    // mapping Periods

    // struct Periods

    // struct Proposal
    // votes
    // details: IPFS hash
    // total votes

    address public sqrtInstance;
    ICOToken public votingToken;
    IERC20 public paymentToken;

    uint256 public constant proposerDeposit = 10**18; // 1 COToken
    uint256 public constant memberBalanceTreshold = 10**18;
    uint256 public constant finalizerReward = 10**16; // 0.01 COToken

    uint256 public creationTime;
    uint256 public constant periodDuration = 17280; // 4.8 hours in seconds (5 periods per day)

    uint256 public constant categoryVotingPeriodLength = 10;

    uint256 public lastCategoryProposalId = 0;

    enum VOTING_TYPE {
        Null,
        Competing,
        Noncompeting
    }

    enum Vote {
        Null, // default value, counted as abstention
        Yes,
        No
    }

    struct Category {
        uint256 id;
        VOTING_TYPE votingType;
        bytes32 name;
        bytes32 details;
        uint256 votingPeriodLength;
        uint256 lastProposalId;
    }

    struct CategoryProposal {
        uint256 id;
        VOTING_TYPE votingType;
        bytes32 name;
        bytes32 details;
        uint256 votingPeriodLength;
        address proposer;
        uint256 startPeriod;
        uint256 yesVotes;
        uint256 noVotes;
        bool processed;
        bool didPass;
        mapping(address => Vote) hasVoted;
    }

    struct NonCompetingProposal {
        uint256 id;
        address proposer;
        uint256 startPeriod;
        bytes32 details;
        uint256 requestedAmount;
        uint256 yesVotes;
        uint256 noVotes;
        bool processed;
        bool didPass;
        mapping(address => Vote) hasVoted;
    }

    Category[] public categories;

    CategoryProposal[] public categoryProposalsQueue;

    mapping(address => uint256) public membersLockPeriod; // Stores the time after which they can move their tokens

    mapping(uint256 => NonCompetingProposal[]) public categoryNonCompetingProposals;

    event CategoryProposed(uint256 proposalId, address proposer);
    event CategoryVote(uint256 proposalId, address voter, uint8 vote);
    event CategoryFinalised(uint256 proposalId, bool didPass);

    event NonCompetingProposed(uint256 categoryId, uint256 proposalId, address proposer);
    event NonCompetingVote(uint256 categoryId, uint256 proposalId, address voter, uint8 vote);
    event NonCompetingFinalised(uint256 categoryId, uint256 proposalId, bool didPass);

    modifier onlyMember {
        require(votingToken.balanceOf(msg.sender) >= memberBalanceTreshold, "onlyMember :: onlyMember - not enough balance");
        _;
    }
    

    constructor(address votingTokenContract, address sqrtContract, address _paymentToken) public {
        require(sqrtContract != address(0), "constructor::SQRT contract could not be an empty address");
        require(votingTokenContract != address(0), "constructor::Proposal token contract could be an empty address");
        require(_paymentToken != address(0), "constructor::Proposal token contract could be an empty address");
        creationTime = now;

        sqrtInstance = sqrtContract;
        votingToken = ICOToken(votingTokenContract);
        paymentToken = IERC20(_paymentToken);
    }

    function proposeCategory(uint8 votingType, bytes32 name, bytes32 details, uint256 votingPeriodLength) public {
        require(votingType > 0 && votingType < 3, "proposeCategory :: invalid voting type");
        require(name != "", "proposeCategory :: invalid name");
        require(details != "", "proposeCategory :: invalid details");
        require(votingPeriodLength > 0, "proposeCategory :: votingPeriodLength less than 0");
        votingToken.transferFrom(msg.sender, address(this), proposerDeposit);

        lastCategoryProposalId++;


        uint256 startPeriod = max(
            getCurrentPeriod(),
            categoryProposalsQueue.length == 0 ? 0 : categoryProposalsQueue[categoryProposalsQueue.length.sub(1)].startPeriod
        ).add(1);

        CategoryProposal memory cp = CategoryProposal({
            id: lastCategoryProposalId,
            votingType: VOTING_TYPE(votingType),
            name: name,
            details: details,
            votingPeriodLength: votingPeriodLength,
            proposer: msg.sender,
            startPeriod: startPeriod,
            yesVotes: 0,
            noVotes: 0,
            processed: false,
            didPass: false
        });

        categoryProposalsQueue.push(cp);

        uint256 endTimestamp = calculateProposalEndTimestamp(startPeriod, categoryVotingPeriodLength);

        updateMoveLockIn(msg.sender, endTimestamp);

        emit CategoryProposed(lastCategoryProposalId, msg.sender);
    }

    function voteCategory(uint256 categoryProposalId, uint8 _vote) public onlyMember {
        require(categoryProposalId > 0 && categoryProposalId <= lastCategoryProposalId, "voteCategory :: invalid category proposal id");
        require(_vote > 0 && _vote < 3, "voteCategory :: invalid vote");

        CategoryProposal storage cp = categoryProposalsQueue[categoryProposalId.sub(1)];
        uint256 currentPeriod = getCurrentPeriod();

        require(currentPeriod >= cp.startPeriod, "voteCategory :: proposal voting has not started");
        require(currentPeriod <= (cp.startPeriod.add(categoryVotingPeriodLength)), "voteCategory :: proposal voting period has finished");
        require(cp.hasVoted[msg.sender] == Vote.Null, "voteCategory :: sender has already voted");

        uint256 userTokenBalance = votingToken.balanceOf(msg.sender);
        uint256 votes = calculateVotesFromTokens(userTokenBalance);

        Vote vote = Vote(_vote);

        cp.hasVoted[msg.sender] = vote;

        if(vote == Vote.Yes) {
            cp.yesVotes = cp.yesVotes.add(votes);
        } else {
            cp.noVotes = cp.noVotes.add(votes);
        }

        uint256 endTimestamp = calculateProposalEndTimestamp(cp.startPeriod, categoryVotingPeriodLength);

        updateMoveLockIn(msg.sender, endTimestamp);

        emit CategoryVote(categoryProposalId, msg.sender, _vote);
    }

    function finalizeCategoryVoting(uint256 categoryProposalId) public {
        require(categoryProposalId > 0 && categoryProposalId <= lastCategoryProposalId, "voteCategory :: invalid category proposal id");

        CategoryProposal storage cp = categoryProposalsQueue[categoryProposalId.sub(1)];
        uint256 currentPeriod = getCurrentPeriod();

        require(currentPeriod > (cp.startPeriod.add(categoryVotingPeriodLength)), "voteCategory :: proposal voting period has finished");



        if(cp.noVotes >= cp.yesVotes) {
            cp.didPass = false;
        } else {
            Category memory c = Category({
                id: categories.length,
                votingType: cp.votingType,
                name: cp.name,
                details: cp.details,
                votingPeriodLength: cp.votingPeriodLength,
                lastProposalId: 0
            });
            categories.push(c);
            cp.didPass = true;
        }

        votingToken.transfer(msg.sender, finalizerReward);
        votingToken.transfer(cp.proposer, proposerDeposit.sub(finalizerReward));
        cp.processed = true;

        emit CategoryFinalised(categoryProposalId, cp.didPass);
    }

    function proposeNonCompeting(uint256 categoryId, bytes32 details, uint requestedAmount) public {
        require(categoryId < categories.length, "proposeNonCompeting :: invalid category");
        require(votingToken.balanceOf(msg.sender) >= proposerDeposit, "proposeNonCompeting :: not enough balance for depositing");
        require(details != "", "proposeNonCompeting :: invalid details");
        votingToken.transferFrom(msg.sender, address(this), proposerDeposit);
        

        Category storage c = categories[categoryId];
        require(c.votingType == VOTING_TYPE.Noncompeting, "proposeNonCompeting :: proposing non competing offer in competing category");
        c.lastProposalId++;

        NonCompetingProposal[] storage categoryQueue = categoryNonCompetingProposals[categoryId];

        uint256 startPeriod = max(
            getCurrentPeriod(),
            categoryQueue.length == 0 ? 0 : categoryQueue[categoryQueue.length.sub(1)].startPeriod
        ).add(1);

        NonCompetingProposal memory p = NonCompetingProposal({
            id: c.lastProposalId,
            proposer: msg.sender,
            startPeriod: startPeriod,
            details: details,
            requestedAmount: requestedAmount,
            yesVotes: 0,
            noVotes: 0,
            processed: false,
            didPass: false
        });

        categoryQueue.push(p);

        uint256 endTimestamp = calculateProposalEndTimestamp(startPeriod, c.votingPeriodLength);

        updateMoveLockIn(msg.sender, endTimestamp);

        emit NonCompetingProposed(categoryId, c.lastProposalId, msg.sender);

    }

    function voteNonCompeting(uint256 categoryId, uint256 proposalId, uint8 _vote) public onlyMember {
        require(categoryId < categories.length, "voteNonCompeting :: invalid category");
        require(_vote > 0 && _vote < 3, "voteNonCompeting :: invalid vote");

        Category memory c = categories[categoryId];
        NonCompetingProposal[] storage categoryQueue = categoryNonCompetingProposals[categoryId];

        require(proposalId > 0 && proposalId <= c.lastProposalId, "voteNonCompeting :: invalid proposal id");

        NonCompetingProposal storage proposal = categoryQueue[proposalId.sub(1)];

        uint256 currentPeriod = getCurrentPeriod();

        require(currentPeriod >= proposal.startPeriod, "voteNonCompeting :: proposal voting has not started");
        require(currentPeriod <= (proposal.startPeriod.add(c.votingPeriodLength)), "voteNonCompeting :: proposal voting period has finished");
        require(proposal.hasVoted[msg.sender] == Vote.Null, "voteNonCompeting :: sender has already voted");

        uint256 userTokenBalance = votingToken.balanceOf(msg.sender);
        uint256 votes = calculateVotesFromTokens(userTokenBalance);

        Vote vote = Vote(_vote);

        proposal.hasVoted[msg.sender] = vote;

        if(vote == Vote.Yes) {
            proposal.yesVotes = proposal.yesVotes.add(votes);
        } else {
            proposal.noVotes = proposal.noVotes.add(votes);
        }

        uint256 endTimestamp = calculateProposalEndTimestamp(proposal.startPeriod, c.votingPeriodLength);

        updateMoveLockIn(msg.sender, endTimestamp);

        emit NonCompetingVote(categoryId, proposalId, msg.sender, _vote);
    }

    function finalizeNonCompeting(uint256 categoryId, uint256 proposalId) public {
        require(categoryId < categories.length, "finalizeNonCompeting :: invalid category");

        Category memory c = categories[categoryId];
        NonCompetingProposal[] storage categoryQueue = categoryNonCompetingProposals[categoryId];

        require(proposalId > 0 && proposalId <= c.lastProposalId, "finalizeNonCompeting :: invalid proposal id");

        NonCompetingProposal storage proposal = categoryQueue[proposalId.sub(1)];

        uint256 currentPeriod = getCurrentPeriod();

        require(currentPeriod > (proposal.startPeriod.add(c.votingPeriodLength)), "finalizeNonCompeting :: proposal voting period has not finished");

        if(proposal.noVotes >= proposal.yesVotes) {
            proposal.didPass = false;
        } else {
            paymentToken.transfer(proposal.proposer, proposal.requestedAmount);
            proposal.didPass = true;
        }

        votingToken.transfer(msg.sender, finalizerReward);
        votingToken.transfer(proposal.proposer, proposerDeposit.sub(finalizerReward));
        proposal.processed = true;

        emit NonCompetingFinalised(categoryId, proposalId, proposal.didPass);
    }

    function getCategoriesLength() public view returns(uint256) {
        return categories.length;
    }

    function calculateProposalEndTimestamp(uint256 startPeriod, uint256 votingLength) internal view returns (uint256) {
        uint256 endPeriod = startPeriod.add(votingLength);
        uint256 endTimestamp = endPeriod.mul(periodDuration);
        return endTimestamp.add(creationTime);
    }

    function updateMoveLockIn(address user, uint256 endTimestamp) internal {
        membersLockPeriod[user] = max(
            membersLockPeriod[user],
            endTimestamp
        );
    }

    // Votes is calculated as => sqrt(voter tokens balance) => 1 token = 1 vote; 9 tokens = 3 votes
    function calculateVotesFromTokens(uint256 tokens) private view returns(uint256) {
        // Call a Vyper SQRT contract in order to work with decimals in sqrt
        (bool success, bytes memory data) = sqrtInstance.staticcall(abi.encodeWithSignature("tokens_sqrt(uint256)", tokens));
        require(success);

        uint votes = data.toUint256();
        return votes;
    }

    function canMoveTokens(address from, address to, uint256 amount) public view returns(bool) {
        return now > membersLockPeriod[from];
    }

    // TODO migrate to new voting
    // function migrateToNewVoting(ITokenTransferLimiter newLimiter) public { 
    //     votingToken.changeTokenLimiter(newLimiter);
    //     uint256 balance = votingToken.balanceOf(address(this));
    //     votingToken.transfer(address(newLimiter), balance);
    // }

    function max(uint256 x, uint256 y) internal pure returns (uint256) {
        return x >= y ? x : y;
    }

    function getCurrentPeriod() public view returns (uint256) {
        return now.sub(creationTime).div(periodDuration);
    }

}

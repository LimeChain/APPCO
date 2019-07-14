pragma solidity ^0.5.3;

import "./../Math/Convert.sol";
import "./../Tokens/ICOToken.sol";
import "./../ITokenTransferLimiter.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract CategoryVoting is ITokenTransferLimiter, Ownable {

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

    uint256 public constant maxCompetingProposals = 10;

    enum VotingType {
        Null,
        Competing,
        Noncompeting
    }

    enum Vote {
        Null, // default value, counted as abstention
        Yes,
        No
    }

    enum CompetingPhases {
        Proposal,
        Voting,
        Rest
    }

    struct Category {
        uint256 id;
        VotingType votingType;
        bytes32 name;
        bytes32 details;
        uint256 votingPeriodLength;
        uint256 lastProposalId;
        uint256 proposePeriodLength; // Used only for Competing
        uint256 restPeriodLength; // Used only for Competing
        uint256 competingStartTime; // Used only for Competing
    }

    struct CategoryProposal {
        uint256 id;
        VotingType votingType;
        bytes32 name;
        bytes32 details;
        uint256 votingPeriodLength;
        address proposer;
        uint256 startPeriod;
        uint256 yesVotes;
        uint256 noVotes;
        bool processed;
        bool didPass;
        uint256 proposePeriodLength; // Used only for Competing
        uint256 restPeriodLength; // Used only for Competing
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

    struct CompetingProposal {
        address recepient;
        bytes32 details;
        uint256 requestedAmount;
        uint256 votes;
    }

    Category[] public categories;

    CategoryProposal[] public categoryProposalsQueue;

    mapping(address => uint256) public membersLockPeriod; // Stores the time after which they can move their tokens

    mapping(uint256 => NonCompetingProposal[]) public categoryNonCompetingProposals;  // Used only for NonCompeting

    mapping(uint256 => CompetingProposal[]) public currentRoundProposals;  // Used only for Competing
    mapping(bytes32 => bool) public roundHasVoted;  // Used only for Competing

    mapping(uint256 => mapping(uint256 =>CompetingProposal)) public categoryRoundWinners;  // Used only for Competing

    event CategoryProposed(uint256 proposalId, address proposer);
    event CategoryVote(uint256 proposalId, address voter, uint8 vote);
    event CategoryFinalised(uint256 proposalId, bool didPass);

    event NonCompetingProposed(uint256 categoryId, uint256 proposalId, address proposer);
    event NonCompetingVote(uint256 categoryId, uint256 proposalId, address voter, uint8 vote);
    event NonCompetingFinalised(uint256 categoryId, uint256 proposalId, bool didPass);

    event CompetingProposed(uint256 categoryId, uint256 proposalIndex, address proposer);
    event CompetingVote(uint256 categoryId, uint256 proposalIndex, address voter);
    event CompetingFinalised(uint256 categoryId, uint256 winningIndex, address winner, uint256 amount);

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

    function proposeCategory(uint8 votingType, bytes32 name, bytes32 details, uint256 votingPeriodLength, uint256 proposePeriodLength, uint256 restPeriodLength) public {
        require(votingType > 0 && votingType < 3, "proposeCategory :: invalid voting type");
        require(name != "", "proposeCategory :: invalid name");
        require(details != "", "proposeCategory :: invalid details");
        require(votingPeriodLength > 0, "proposeCategory :: votingPeriodLength less than 1");

        if(VotingType(votingType) == VotingType.Competing) {
            require(proposePeriodLength > 0, "proposeCategory :: propose period length needs to be at least one period");
            require(restPeriodLength > 0, "proposeCategory :: rest period length needs to be at least one period");
        }

        votingToken.transferFrom(msg.sender, address(this), proposerDeposit);

        lastCategoryProposalId++;


        uint256 startPeriod = max(
            getCurrentPeriod(),
            categoryProposalsQueue.length == 0 ? 0 : categoryProposalsQueue[categoryProposalsQueue.length.sub(1)].startPeriod
        ).add(1);

        CategoryProposal memory cp = CategoryProposal({
            id: lastCategoryProposalId,
            votingType: VotingType(votingType),
            name: name,
            details: details,
            votingPeriodLength: votingPeriodLength,
            proposer: msg.sender,
            startPeriod: startPeriod,
            yesVotes: 0,
            noVotes: 0,
            processed: false,
            didPass: false,
            proposePeriodLength: proposePeriodLength,
            restPeriodLength: restPeriodLength
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
                lastProposalId: 0,
                proposePeriodLength: cp.proposePeriodLength,
                restPeriodLength: cp.restPeriodLength,
                competingStartTime: now
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
        require(c.votingType == VotingType.Noncompeting, "proposeNonCompeting :: proposing non competing offer in competing category");
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

    function getNonCompetingCategoryQueueLength(uint256 categoryId) public view returns(uint256) {
        NonCompetingProposal[] storage categoryQueue = categoryNonCompetingProposals[categoryId];
        return categoryQueue.length;
    }

    function submitCompetingProposal(uint256 categoryId, address recepient, bytes32 details, uint requestedAmount) public onlyOwner {
        require(categoryId < categories.length, "submitCompetingProposal :: invalid category");
        require(details != "", "submitCompetingProposal :: invalid details");

        Category storage c = categories[categoryId];
        require(c.votingType == VotingType.Competing, "submitCompetingProposal :: proposing competing offer in non-competing category");

        CompetingPhases currentPhase = getRoundPhase(c.competingStartTime, c.proposePeriodLength, c.votingPeriodLength, c.restPeriodLength);

        require(currentPhase == CompetingPhases.Proposal, "submitCompetingProposal :: Not in proposals phase");

        bool categoryStarted;
        uint256 currentRound;
        
        (categoryStarted, currentRound) = getCurrentRound(c.competingStartTime, c.proposePeriodLength, c.votingPeriodLength, c.restPeriodLength);
        require(categoryStarted, "submitCompetingProposal :: The category rounds have not started");

        CompetingProposal[] storage proposals = currentRoundProposals[categoryId];

        require(proposals.length < maxCompetingProposals, "submitCompetingProposal :: Proposals limit reached");

        CompetingProposal memory cp = CompetingProposal({
            recepient: recepient,
            details: details,
            requestedAmount: requestedAmount,
            votes: 0
        });

        proposals.push(cp);

        emit CompetingProposed(categoryId, proposals.length.sub(1), recepient);
    }

    function voteCompetingProposal(uint256 categoryId, uint256 proposalIndex) public onlyMember {
        require(categoryId < categories.length, "voteCompetingProposal :: invalid category");

        Category storage c = categories[categoryId];
        require(c.votingType == VotingType.Competing, "voteCompetingProposal :: proposing competing offer in non-competing category");

        CompetingPhases currentPhase = getRoundPhase(c.competingStartTime, c.proposePeriodLength, c.votingPeriodLength, c.restPeriodLength);

        require(currentPhase == CompetingPhases.Voting, "voteCompetingProposal :: Not in voting phase");

        bool categoryStarted;
        uint256 currentRound;
        
        (categoryStarted, currentRound) = getCurrentRound(c.competingStartTime, c.proposePeriodLength, c.votingPeriodLength, c.restPeriodLength);
        require(categoryStarted, "The category rounds have not started");
        CompetingProposal[] storage proposals = currentRoundProposals[categoryId];

        require(proposalIndex < proposals.length, "voteCompetingProposal :: Invalid proposal");
        bytes32 hasVotedKey = keccak256(abi.encodePacked(msg.sender, categoryId, currentRound));
        require(!roundHasVoted[hasVotedKey], "voteCompetingProposal :: You have already voted");

        CompetingProposal storage p = proposals[proposalIndex];

        uint256 userTokenBalance = votingToken.balanceOf(msg.sender);
        uint256 votes = calculateVotesFromTokens(userTokenBalance);

        roundHasVoted[hasVotedKey] = true;

        p.votes = p.votes.add(votes);

        uint256 endTimestamp = getCurrentPeriodEndTimestamp(categoryId);

        updateMoveLockIn(msg.sender, endTimestamp);

        emit CompetingVote(categoryId, proposals.length.sub(1), msg.sender);
    }

    function finalizeCompetingProposal(uint256 categoryId) public {
        require(categoryId < categories.length, "voteCompetingProposal :: invalid category");

        Category storage c = categories[categoryId];
        require(c.votingType == VotingType.Competing, "voteCompetingProposal :: proposing competing offer in non-competing category");

        CompetingPhases currentPhase = getRoundPhase(c.competingStartTime, c.proposePeriodLength, c.votingPeriodLength, c.restPeriodLength);

        require(currentPhase == CompetingPhases.Rest, "voteCompetingProposal :: Not in voting phase");

        bool categoryStarted;
        uint256 currentRound;
        
        (categoryStarted, currentRound) = getCurrentRound(c.competingStartTime, c.proposePeriodLength, c.votingPeriodLength, c.restPeriodLength);
        require(categoryStarted, "The category rounds have not started");
        CompetingProposal[] storage proposals = currentRoundProposals[categoryId];

        uint256 proposalsCount = proposals.length;

        uint256 winningIndex = 0; 

        for(uint256 i = 0; i < proposalsCount; i++) {
            if(proposals[i].votes > proposals[winningIndex].votes) {
                winningIndex = i;
            }
        }

        CompetingProposal memory winner = proposals[winningIndex];

        paymentToken.transfer(winner.recepient, winner.requestedAmount);
        currentRoundProposals[categoryId].length = 0;
        categoryRoundWinners[categoryId][currentRound] = winner;

        emit CompetingFinalised(categoryId, winningIndex, winner.recepient, winner.requestedAmount);
    }

    function getCompetingCurrentRoundProposalsCount(uint256 categoryId) public view returns(uint256) {
        CompetingProposal[] storage proposals = currentRoundProposals[categoryId];
        return proposals.length;
    }

    function getCategoriesLength() public view returns(uint256) {
        return categories.length;
    }

    function calculateProposalEndTimestamp(uint256 startPeriod, uint256 votingLength) internal view returns (uint256) {
        uint256 endPeriod = startPeriod.add(votingLength);
        uint256 endTimestamp = endPeriod.mul(periodDuration);
        return endTimestamp.add(creationTime);
    }

    function getCurrentPeriodEndTimestamp(uint256 categoryId) public view returns(uint256 endTimestamp) {
        Category storage c = categories[categoryId];
        bool categoryStarted;
        uint256 currentRound;
        (categoryStarted, currentRound) = getCurrentRound(c.competingStartTime, c.proposePeriodLength, c.votingPeriodLength, c.restPeriodLength);
        require(categoryStarted, "The category rounds have not started");
        uint256 roundLength = c.proposePeriodLength.add(c.votingPeriodLength).add(c.restPeriodLength);
        endTimestamp = c.competingStartTime.add(currentRound.mul(roundLength).mul(periodDuration));
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

    function getCurrentRound(uint256 startTime, uint256 proposalsPeriod, uint256 votingPeriod, uint256 restPeriod) public view returns(bool, uint256) {
        if(now < startTime) {
            return (false, 0);
        }

        uint256 roundLength = (proposalsPeriod.add(votingPeriod).add(restPeriod)).mul(periodDuration);

        uint256 round = (now.sub(startTime)).div(roundLength);

        return (true, round+1);
    }

    function getRoundPhase(uint256 startTime, uint256 proposalsPeriod, uint256 votingPeriod, uint256 restPeriod) public view returns(CompetingPhases) {
        if(now < startTime) {
            return CompetingPhases.Rest;
        }
        uint256 roundLength = (proposalsPeriod.add(votingPeriod).add(restPeriod)).mul(periodDuration);

        uint currentRoundProgress = (now.sub(startTime)).mod(roundLength);

        if(currentRoundProgress <= proposalsPeriod.mul(periodDuration)) {
            return CompetingPhases.Proposal;
        }

        if(currentRoundProgress <= proposalsPeriod.add(votingPeriod).mul(periodDuration)) {
            return CompetingPhases.Voting;
        }

        return CompetingPhases.Rest;

    }
}

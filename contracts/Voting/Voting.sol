pragma solidity ^0.5.3;

import "./../Math/Convert.sol";
import "./../Tokens/COToken.sol";
import "./../ITokenTransferLimiter.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Voting is ITokenTransferLimiter {
    
    using Convert for bytes;
    using SafeMath for uint256;
    
    uint256 public constant MAX_PROPOSALS_COUNT = 5;
    // This duration is only for POC purpose
    uint256 public constant VOTING_DURATION = 10000 days;
    uint256 public constant MINIMUM_TOKENS_AMOUNT_FOR_VOTING = 10**18; // 1 token

    uint256 public expirationDate;

    address public sqrtInstance;
    COToken public votingToken;

    struct Proposal {
        bytes32 title;
        uint256 tokens;
        uint256 rating;
    }

     // Voter => Proposal
    mapping(address => Proposal) public voters;

    // Proposal => rating (Sum)
    mapping(bytes32 => uint256) public proposals;

    event Vote(address voter, bytes32 proposal, uint256 tokens, uint256 rating);

    modifier whenInLive(){
        require(now <= expirationDate, "Voting period is expired");
        _;
    }

    constructor(address votingTokenContract, bytes32[] memory proposalsNames, address sqrtContract) public {
        require(sqrtContract != address(0), "SQRT contract could not be an empty address");
        require(votingTokenContract != address(0), "Proposal token contract could be an empty address");
        require(proposalsNames.length <= MAX_PROPOSALS_COUNT, "proposals are more than the allowed quantity");
        
        expirationDate = now.add(VOTING_DURATION);

        for(uint8 i = 0; i < proposalsNames.length; i++){
            proposals[proposalsNames[i]] = 1000000000000000000; // initial rating of one token
        }

        sqrtInstance = sqrtContract;
        votingToken = COToken(votingTokenContract);
    }

    function vote(bytes32 proposal) public whenInLive {
        require(voters[msg.sender].title == 0x0 || voters[msg.sender].title == proposal, "Voter can only vote for one proposal per round");

        uint256 voterTokensBalance = votingToken.balanceOf(msg.sender);
        require(voterTokensBalance >= MINIMUM_TOKENS_AMOUNT_FOR_VOTING, "Voter should have at least 1 proposal token in order to vote");
        require(votingToken.allowance(msg.sender, address(this)) >= voterTokensBalance, "Voter did not approved enough balance to be transfered for his votes");
 
        votingToken.transferFrom(msg.sender, address(this), voterTokensBalance);

        uint256 totalRating = __calculateRatingByTokens(voters[msg.sender].tokens.add(voterTokensBalance));
        uint256 additionalRating = totalRating.sub(voters[msg.sender].rating); 

        proposals[proposal] = proposals[proposal].add(additionalRating);

        voters[msg.sender].title = proposal;
        voters[msg.sender].rating = voters[msg.sender].rating.add(additionalRating);
        voters[msg.sender].tokens = voters[msg.sender].tokens.add(voterTokensBalance);

        emit Vote(msg.sender, proposal, voterTokensBalance, additionalRating);
    }

    // Rating is calculated as => sqrt(voter tokens balance) => 1 token = 1 rating; 9 tokens = 3 rating
    function __calculateRatingByTokens(uint256 tokens) private view returns(uint256){
        // Call a Vyper SQRT contract in order to work with decimals in sqrt
        (bool success, bytes memory data) = sqrtInstance.staticcall(abi.encodeWithSignature("tokens_sqrt(uint256)", tokens));
        require(success);

        uint rating = data.toUint256();
        return rating;
    }

    function canMoveTokens(address from, address to, uint256 amount) public view returns(bool) {
        return true;
    }

}

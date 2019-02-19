pragma solidity ^0.5.0;

import "./../Tokens/MovieToken/MovieToken.sol";
import "./../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

// Movie -> voter -> votes

contract Voting {
    
    using SafeMath for uint256;

    uint256 public constant MAX_MOVIES_COUNT = 5;
    uint256 public constant VOTING_DURATION = 14 days;

    uint256 public startDate;
    MovieToken private movieTokenInstance;

    // Voter => votes (Sum)
    mapping(address => mapping(bytes32 => uint256)) public voters;

    // Movie => votes (Sum)
    mapping(bytes32 => uint256) public movies;

    modifier inLive(){
        require(now() <= startDate.add(VOTING_DURATION), "Voting periods is expired");
        _;
    }
    
    constructor(address movieTokenContract, uint256[] movies) public {
        require(movies.length <= MAX_MOVIES_COUNT, "Movies are more than the allowed quantity");

        startDate = now();
        movieTokenInstance = movieTokenContract;
    }

    function vote(bytes32 movieTitle) public inLive {
        uint256 votePrice = __calculateVotePriceForMovie(msg.sender, movieTitle);

        require(movieTokenInstance.balanceOf(msg.sender) >= votePrice, "Not enough balance to vote");

        movieTokenInstance.transferFrom(msg.sender, address(this), votePrice);

        voters[voter][movieTitle] += 1;
        movies[movieTitle] += 1;
    }

    function __calculateVotePrice(address voter, bytes32 movieTitle) private {
        uint256 votes = voters[voter][movieTitle] + 1;
        uint256 votePrice = votes.mul(votes);
        
        return votePrice;
    }
}

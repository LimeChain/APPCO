pragma solidity ^0.5.0;

import "./../Tokens/MovieToken/MovieToken.sol";
import "./../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Voting {
    
    using SafeMath for uint256;
    
    uint256 public constant MAX_MOVIES_COUNT = 5;
    uint256 public constant VOTING_DURATION = 14 days;
    uint256 public constant MINIMUM_TOKENS_AMOUNT_FOR_VOTING = 10^18;

    uint256 public expirationDate;

    address public sqrtInstance;
    MovieToken public movieTokenInstance;

    struct Movie {
        bytes32 title;
        uint256 votingTokens;
    }

     // Voter => Movie
    mapping(address => Movie) public voters;

    // Movie => rating (Sum)
    mapping(bytes32 => uint256) public movies;
   

    modifier whenInLive(){
        require(now() <= expirationDate, "Voting period is expired");
        _;
    }

    constructor(address movieTokenContract, uint256[] movies, address sqrtContract) public {
        require(movies.length <= MAX_MOVIES_COUNT, "Movies are more than the allowed quantity");
        
        expirationDate = now().add(VOTING_DURATION);

        sqrtInstance = sqrtContract;
        movieTokenInstance = movieTokenContract;
    }

    function vote(bytes32 movie) public whenInLive {
        require(voters[msg.sender].title == 0x0, "Voter can only vote only for one movie per round");

        uint256 voterTokensBalance = movieTokenInstance.balanceOf(msg.sender);
        require(voterTokensBalance >= MINIMUM_TOKENS_AMOUNT_FOR_VOTING, "Voter should have at least 1 movie token in order to vote");
        require(movieTokenInstance.allowance(msg.sender, address(this)) >= voterTokensBalance, "Voter did not approved enough balance to be transfered for his votes");
 
        movieTokenInstance.transferFrom(msg.sender, address(this), voterTokensBalance);

        uint256 rating = __calculateRatingByTokens(msg.sender, voterTokensBalance);

        movies[movieTitle] = movies[movieTitle].add(rating);
        voters[msg.sender].votingTokens.add(voterTokensBalance);
    }

    // Rating is calculated as => sqrt(voter tokens balance) => 1 token = 1 rating; 9 tokens = 3 rating
    function __calculateRatingByTokens(address voter, uint256 tokens) private pure returns(uint256){
        // Call a Vyper SQRT contract in order to work with decimals in sqrt
        (bool success, bytes  memory data) = sqrtInstance.call(abi.encodeWithSignature("sqrt_decimal(uint256)", tokens));
        require(success);

        // Convert bytes in to uint256
        uint rating;
        assembly {
            rating := mload(add(data, add(0x20, 0)))
        }
        
        return rating;
    }
}

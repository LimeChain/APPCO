pragma solidity ^0.5.3;

import "./../Math/Convert.sol";
import "./../Tokens/MovieToken/MovieToken.sol";
import "./../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Voting {
    
    using Convert for bytes;
    using SafeMath for uint256;
    
    uint256 public constant MAX_MOVIES_COUNT = 5;
    // This duration is only for POC purpose
    uint256 public constant VOTING_DURATION = 10000 days;
    uint256 public constant MINIMUM_TOKENS_AMOUNT_FOR_VOTING = 10**18; // 1 token

    uint256 public expirationDate;

    address public sqrtInstance;
    MovieToken public movieTokenInstance;

    struct Movie {
        bytes32 title;
        uint256 rating;
    }

     // Voter => Movie
    mapping(address => Movie) public voters;

    // Movie => rating (Sum)
    mapping(bytes32 => uint256) public movies;

    event Vote(address voter, bytes32 movie, uint256 tokens, uint256 rating);


    modifier whenInLive(){
        require(now <= expirationDate, "Voting period is expired");
        _;
    }

    constructor(address movieTokenContract, bytes32[] memory moviesNames, address sqrtContract) public {
        require(sqrtContract != address(0), "SQRT contract could not be an empty address");
        require(movieTokenContract != address(0), "Movie token contract could be an empty address");
        require(moviesNames.length <= MAX_MOVIES_COUNT, "Movies are more than the allowed quantity");
        
        expirationDate = now.add(VOTING_DURATION);

        for(uint8 i = 0; i < moviesNames.length; i++){
            movies[moviesNames[i]] = 1000000000000000000; // initial rating of one token
        }

        sqrtInstance = sqrtContract;
        movieTokenInstance = MovieToken(movieTokenContract);
    }

    function vote(bytes32 movie) public whenInLive {
        require(voters[msg.sender].title == 0x0, "Voter can only vote for one movie per round");

        uint256 voterTokensBalance = movieTokenInstance.balanceOf(msg.sender);
        require(voterTokensBalance >= MINIMUM_TOKENS_AMOUNT_FOR_VOTING, "Voter should have at least 1 movie token in order to vote");
        require(movieTokenInstance.allowance(msg.sender, address(this)) >= voterTokensBalance, "Voter did not approved enough balance to be transfered for his votes");
 
        movieTokenInstance.transferFrom(msg.sender, address(this), voterTokensBalance);

        uint256 rating = __calculateRatingByTokens(voterTokensBalance);
        movies[movie] = movies[movie].add(rating);

        voters[msg.sender].title = movie;
        voters[msg.sender].rating = voterTokensBalance;

        emit Vote(msg.sender, movie, voterTokensBalance, rating);
    }

    // Rating is calculated as => sqrt(voter tokens balance) => 1 token = 1 rating; 9 tokens = 3 rating
    function __calculateRatingByTokens(uint256 tokens) private view returns(uint256){
        // Call a Vyper SQRT contract in order to work with decimals in sqrt
        (bool success, bytes  memory data) = sqrtInstance.staticcall(abi.encodeWithSignature("tokens_sqrt(uint256)", tokens));
        require(success);

        uint rating = data.toUint256();
        return rating;
    }
}

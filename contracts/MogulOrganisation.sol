pragma solidity 0.5.4;

import "./Tokens/MogulDAI/MogulDAI.sol";
import "./Tokens/MogulToken/MogulToken.sol";
import "./Tokens/MovieToken/MovieToken.sol";
import "./Math/BondingMathematics.sol";
import "./../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract MogulOrganisation {

    using SafeMath for uint256;
    
    BondingMathematics public bondingMath;

    MogulDAI public mogulDAI;
    MogulToken public mogulToken;
    MovieToken public movieToken;

    address public mogulBank;

    uint256 public totalDAIInvestments = 0;
    
    uint256 constant public MOVIE_TO_MGL_RATE = 10; // 1 Mogul Token -> 10 Movie Tokens (Utility tokens)
    uint256 constant public DAI_RESERVE_REMAINDER = 5; // 20%
    uint256 constant public INITIAL_MGLTOKEN_SUPPLY = 1000000000000000000; // 1 Mogul Token

    event Invest(address investor, uint256 amount);
    event Withdraw(address investor, uint256 amount);
    event UnlockOrganisation(address unlocker, uint256 initialAmount);
    
    constructor(address _bondingMath, address _mogulDAI, address _movieToken, address _mogulBank) public {
        
        require(_mogulDAI != address(0), "Mogul DAI address is required");
        require(_movieToken != address(0), "Movie Token address is required");
        require(_mogulBank != address(0), "Mogul Bank address is required");
        require(_bondingMath != address(0), "Bonding Math address is required");

        mogulToken = new MogulToken();
        mogulDAI = MogulDAI(_mogulDAI);
        movieToken = MovieToken(_movieToken);

        mogulBank = _mogulBank;
        bondingMath = BondingMathematics(_bondingMath);
        
        mogulToken.mint(address(this), INITIAL_MGLTOKEN_SUPPLY);
    }
    
    function invest(uint256 _daiAmount) public {
        require(totalDAIInvestments > 0, "Organisation is not unlocked for investments yet");
        require(mogulDAI.allowance(msg.sender, address(this)) >= _daiAmount, "Investor tries to invest with unapproved DAI amount");

        uint256 mglTokensToMint = calcRelevantMGLForDAI(_daiAmount);

        uint256 reserveDAIAmount = _daiAmount.div(DAI_RESERVE_REMAINDER);
        mogulDAI.transferFrom(msg.sender, address(this), reserveDAIAmount);
        mogulDAI.transferFrom(msg.sender, address(mogulBank), _daiAmount.sub(reserveDAIAmount));

        mogulToken.mint(msg.sender, mglTokensToMint);
        movieToken.mint(msg.sender, mglTokensToMint.mul(MOVIE_TO_MGL_RATE));

        totalDAIInvestments = totalDAIInvestments.add(_daiAmount);

        emit Invest(msg.sender, _daiAmount);
    }
    
    function revokeInvestment(uint256 _amountMGL) public {
        require(mogulToken.allowance(msg.sender, address(this)) >= _amountMGL, "Investor wants to withdraw his MGL investment");
        
        uint256 daiToReturn = bondingMath.calcTokenSell(mogulToken.totalSupply(), daiReserve, _amountMGL);
        
        daiReserve = daiReserve.sub(daiToReturn);
        daiSupply = daiSupply.sub(daiToReturn);

        mogulDAI.transfer(msg.sender, daiToReturn);
        Withdraw(msg.sender, daiToReturn);
    }
    
    function calcRelevantMGLForDAI(uint256 _daiAmount) public view returns(uint256) {
        uint256 tokensAfterPurchase = bondingMath.calcPurchase(mogulToken.totalSupply(), totalDAIInvestments, _daiAmount);
        return tokensAfterPurchase.sub(mogulToken.totalSupply());
    }

    function unlockOrganisation(uint256 _unlockAmount) public {
        require(totalDAIInvestments == 0, "Organization is already unlocked");
        require(mogulDAI.allowance(msg.sender, address(this)) >= _unlockAmount, "Unlocker tries to unlock with unapproved DAI amount");

        mogulDAI.transferFrom(msg.sender, address(this), _unlockAmount);

        totalDAIInvestments = _unlockAmount;
        emit UnlockOrganisation(msg.sender, _unlockAmount);
    }
}

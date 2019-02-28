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

    uint256 public mglOrgDaiSupply = 0;
    
//    uint256 public

    constructor(address _bondingMath, address _mogulDAI, address _movieToken, uint256 _mglOrgDaiSupply) public {
        bondingMath = BondingMathematics(_bondingMath);
        mogulDAI = MogulDAI(_mogulDAI);
        mogulToken = new MogulToken();
        // TODO: min initial tokens
        movieToken = MovieToken(_movieToken);
        mglOrgDaiSupply = _mglOrgDaiSupply;
    }
    
    function invest(uint256 _daiAmount) public {
        // TODO: require(allowance dai);
        mogulDAI.transferFrom(msg.sender, address(this), _daiAmount);
        mglOrgDaiSupply += _daiAmount;

        uint256 tokensAfterPurchase = bondingMath.calcPurchase(_daiAmount, mogulToken.totalSupply(), mglOrgDaiSupply);
        uint256 mglTokensToMint = tokensAfterPurchase.sub(mogulToken.totalSupply());
    
        mogulToken.mint(msg.sender, mglTokensToMint);
        mintMovieTokens(msg.sender, mglTokensToMint);
        // TODO: invest event

    }
    
    function mintMovieTokens(address _to, uint256 _mglTokens) internal {
        mogulToken.mint(_to, _mglTokens.mul(10));
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
}

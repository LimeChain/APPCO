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

    uint256 public mglOrgDaiSupply = 0;
    uint256 public mglOrgDaiReserve = 0;
    
    // TODO: set this address to real one. Now it's set to 9th of testrpcs
    
//    uint256 public

    constructor(address _bondingMath, address _mogulDAI, address _movieToken, uint256 _mglOrgDaiSupply, uint256 _initialMglSupply, address _mogulBank) public {
        bondingMath = BondingMathematics(_bondingMath);
        mogulDAI = MogulDAI(_mogulDAI);
        mogulToken = new MogulToken();
        movieToken = MovieToken(_movieToken);
        
        mglOrgDaiSupply = _mglOrgDaiSupply;
        mglOrgDaiReserve = _mglOrgDaiSupply.div(5);
        
        mogulToken.mint(address(this), _initialMglSupply);
    }
    
    function invest(uint256 _daiAmount) public {
        // TODO: require(allowance dai);
        mogulDAI.transferFrom(msg.sender, address(this), _daiAmount.div(5));
        mogulDAI.transferFrom(msg.sender, address(mogulBank), _daiAmount.sub(_daiAmount.div(5)));
        
        uint256 mglTokensToMint = calcPurchase(_daiAmount);
        mogulToken.mint(msg.sender, mglTokensToMint);
        
        mglOrgDaiSupply += _daiAmount;
        mglOrgDaiReserve += _daiAmount.div(5);

    
//        mintMovieTokens(msg.sender, mglTokensToMint);
        // TODO: invest event

    }
    
    function calcPurchase(uint256 _daiAmount) public view returns(uint256) {
        uint256 tokensAfterPurchase = bondingMath.calcPurchase(mogulToken.totalSupply(), mglOrgDaiSupply, _daiAmount);
        return tokensAfterPurchase.sub(mogulToken.totalSupply());

    }
    
    function mintMovieTokens(address _to, uint256 _mglTokens) internal {
        mogulToken.mint(_to, _mglTokens.mul(10));
    }
    
}

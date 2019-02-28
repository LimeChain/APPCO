pragma solidity 0.5.3;

import "./Math/BondingMathematics.sol";
import "./Tokens/MogulDAI/MogulDAI.sol";
import "./Tokens/MogulToken/MogulToken.sol";
import "./Tokens/MovieToken/MovieToken.sol";


contract MogulOrganisation {

    BondingMathematics public bondingMath;
    MogulDAI public mogulDAI;
    MogulToken public mogulToken;
    MovieToken public movieToken;

    constructor(address _bondingMath, address _mogulDAI, address _movieToken) public {
        bondingMath = BondingMathematics(_bondingMath);
        mogulDAI = MogulDAI(_mogulDAI);
        mogulToken = new MogulToken();
        movieToken = MovieToken(_movieToken);
    }
    
    function invest(uint256 _daiAmount) public {
    
    }
    
    
}

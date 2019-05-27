pragma solidity ^0.5.4;

import "./Tokens/CODAI.sol";
import "./Tokens/COToken.sol";
import "./Math/BondingMathematics.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract ContinuousOrganisation {

    using SafeMath for uint256;
    
    BondingMathematics public bondingMath;

    CODAI public codaiToken;
    COToken public coToken;

    address public coBank;

    uint256 public totalDAIInvestments = 0;
    
    uint256 constant public DAI_RESERVE_REMAINDER = 5; // 20%
    uint256 constant public INITIAL_MGLTOKEN_SUPPLY = 1000000000000000000; // 1 CO Token

    event Invest(address investor, uint256 amount);
    event Withdraw(address investor, uint256 amount);
    event UnlockOrganisation(address unlocker, uint256 initialAmount);
    
    constructor(address _bondingMath, address _CODAI, address _coBank) public {
        
        require(_CODAI != address(0), "CO DAI address is required");
        require(_coBank != address(0), "CO Bank address is required");
        require(_bondingMath != address(0), "Bonding Math address is required");

        coToken = new COToken();
        codaiToken = CODAI(_CODAI);

        coBank = _coBank;
        bondingMath = BondingMathematics(_bondingMath);
        
        coToken.mint(address(this), INITIAL_MGLTOKEN_SUPPLY);
    }
    
    function invest(uint256 _daiAmount) public {
        require(totalDAIInvestments > 0, "Organisation is not unlocked for investments yet");
        require(codaiToken.allowance(msg.sender, address(this)) >= _daiAmount, "Investor tries to invest with unapproved DAI amount");

        uint256 mglTokensToMint = calcRelevantMGLForDAI(_daiAmount);

        uint256 reserveDAIAmount = _daiAmount.div(DAI_RESERVE_REMAINDER);
        codaiToken.transferFrom(msg.sender, address(this), reserveDAIAmount);
        codaiToken.transferFrom(msg.sender, coBank, _daiAmount.sub(reserveDAIAmount));

        coToken.mint(msg.sender, mglTokensToMint);

        totalDAIInvestments = totalDAIInvestments.add(_daiAmount);

        emit Invest(msg.sender, _daiAmount);
    }
    
    function revokeInvestment(uint256 _amountMGL) public {
        require(coToken.allowance(msg.sender, address(this)) >= _amountMGL, "Investor wants to withdraw MGL without allowance");
        
        uint256 daiToReturn = bondingMath.calcTokenSell(coToken.totalSupply(), codaiToken.balanceOf(address(this)), _amountMGL);
        
        codaiToken.transfer(msg.sender, daiToReturn);
        totalDAIInvestments = totalDAIInvestments.sub(daiToReturn);
        
        coToken.burnFrom(msg.sender, _amountMGL);

        emit Withdraw(msg.sender, daiToReturn);
    }
    
    function calcRelevantMGLForDAI(uint256 _daiAmount) public view returns(uint256) {
        uint256 tokensAfterPurchase = bondingMath.calcPurchase(coToken.totalSupply(), totalDAIInvestments, _daiAmount);
        return tokensAfterPurchase.sub(coToken.totalSupply());
    }

    function unlockOrganisation(uint256 _unlockAmount) public {
        require(totalDAIInvestments == 0, "Organization is already unlocked");
        require(codaiToken.allowance(msg.sender, address(this)) >= _unlockAmount, "Unlocker tries to unlock with unapproved DAI amount");

        codaiToken.transferFrom(msg.sender, address(this), _unlockAmount.div(DAI_RESERVE_REMAINDER));
        codaiToken.transferFrom(msg.sender, coBank, _unlockAmount.sub(_unlockAmount.div(DAI_RESERVE_REMAINDER)));
        
        totalDAIInvestments = _unlockAmount;
        
        emit UnlockOrganisation(msg.sender, _unlockAmount);
    }
}

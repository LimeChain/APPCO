pragma solidity ^0.5.4;

import "./Math/BondingMathematics.sol";
import "./Tokens/ICOToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract ContinuousOrganisation { // TODO this should probably not be ownable

    using SafeMath for uint256;
    
    BondingMathematics public bondingMath;
    ERC20 public approvedToken; // Ex. DAI
    ICOToken public coToken;
    address public votingContract;
    uint256 public totalInvestmentsAndDividends = 0;
    
    uint256 constant public RESERVE_DIVIDER = 5; // Means that it will leave 1/5 (20%) in the reserve // 1 CO Token

    event Invest(address investor, uint256 amount);
    event Exit(address investor, uint256 amount);
    event UnlockOrganisation(address unlocker, uint256 initialAmount);
    event DividentPayed(address payer, uint256 amount);
    
    constructor(
        address _bondingMath,
        address _approvedToken,
        address _coToken,
        address _categoryVoting) public {
        
        require(_approvedToken != address(0), "constructor:: approved token address is required");
        require(_bondingMath != address(0), "constructor:: Bonding Math address is required");
        require(_coToken != address(0), "constructor:: COToken address is required");
        require(_categoryVoting != address(0), "constructor:: CategoryVoting address is required");
        

        coToken = ICOToken(_coToken);
        
        approvedToken = ERC20(_approvedToken);
        
        bondingMath = BondingMathematics(_bondingMath);

        votingContract = _categoryVoting;
        coToken.setTokenLimiter(_categoryVoting);
    }
    
    function invest(uint256 investAmount) public {
        require(totalInvestmentsAndDividends > 0, "invest:: Organisation is not unlocked for investments yet");
        require(approvedToken.allowance(msg.sender, address(this)) >= investAmount, "invest:: Investor tries to invest with unapproved amount");

        uint256 coTokensToMint = COTokensForInvestment(investAmount);

        uint256 reserveAmount = investAmount.div(RESERVE_DIVIDER);
        approvedToken.transferFrom(msg.sender, address(this), reserveAmount);
        approvedToken.transferFrom(msg.sender, votingContract, investAmount.sub(reserveAmount));

        coToken.mint(msg.sender, coTokensToMint);

        totalInvestmentsAndDividends = totalInvestmentsAndDividends.add(investAmount);

        emit Invest(msg.sender, investAmount);
    }
    
    function exit(uint256 coTokenAmount) public {
        require(coToken.allowance(msg.sender, address(this)) >= coTokenAmount, "exit:: Investor wants to Exit MGL without allowance");
        
        uint256 returnAmount = bondingMath.calcTokenSell(coToken.totalSupply(), approvedToken.balanceOf(address(this)), coTokenAmount);
        
        approvedToken.transfer(msg.sender, returnAmount);
        totalInvestmentsAndDividends = totalInvestmentsAndDividends.sub(returnAmount);
        
        coToken.burnFrom(msg.sender, coTokenAmount);

        emit Exit(msg.sender, returnAmount);
    }
    
    function COTokensForInvestment(uint256 investAmount) public view returns(uint256) {
        uint256 tokensAfterPurchase = bondingMath.calcPurchase(coToken.totalSupply(), totalInvestmentsAndDividends, investAmount);
        return tokensAfterPurchase.sub(coToken.totalSupply());
    }

    function DAIOnExit(uint256 coTokenAmount) public view returns(uint256) {
        return bondingMath.calcTokenSell(coToken.totalSupply(), approvedToken.balanceOf(address(this)), coTokenAmount);
    }

    function unlockOrganisation(uint256 investAmount, uint256 mintedCOTokens) public {

        require(totalInvestmentsAndDividends == 0, "unlockOrganisation:: Organization is already unlocked");
        require(approvedToken.allowance(msg.sender, address(this)) >= investAmount, "unlockOrganisation:: Unlocker tries to unlock with unapproved amount");
        coToken.mint(msg.sender, mintedCOTokens);

        uint256 reserveAmount = investAmount.div(RESERVE_DIVIDER);
        approvedToken.transferFrom(msg.sender, address(this), reserveAmount);
        approvedToken.transferFrom(msg.sender, votingContract, investAmount.sub(reserveAmount));
        
        totalInvestmentsAndDividends = investAmount;
        
        emit UnlockOrganisation(msg.sender, investAmount);
    }

    function payDividends(uint256 dividentAmount)  public {
        require(totalInvestmentsAndDividends > 0, "payDividends:: Organisation is not unlocked for dividends payment yet");
        require(approvedToken.allowance(msg.sender, address(this)) >= dividentAmount, "payDividends:: payer tries to pay with unapproved amount");


        uint256 reserveAmount = dividentAmount.div(RESERVE_DIVIDER);
        approvedToken.transferFrom(msg.sender, address(this), reserveAmount);
        approvedToken.transferFrom(msg.sender, votingContract, dividentAmount.sub(reserveAmount));


        totalInvestmentsAndDividends = totalInvestmentsAndDividends.add(dividentAmount);

        emit DividentPayed(msg.sender, dividentAmount);
    }

}

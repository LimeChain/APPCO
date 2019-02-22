pragma solidity ^0.5.3;

import "./Utils/Curve.sol";
import "./../Tokens/MogulToken/MogulToken.sol";
import "./../../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
* @title POC of ContinuousOrganisation
* @dev https://github.com/mogul-studios/poc-contracts
*/
contract ContinuousOrganisation is Curve, Ownable {
    using SafeMath for uint256;
    
    uint256 public scale = 10**18;
    uint256 public reserveBalance = 1 * scale;
    uint256 public reserveRatio;
    MogulToken public mogulToken;
    
    event ContinuousMint(address to, uint256 _amount, uint256 _deposit);
    event ContinuousBurn(address from, uint256 _amount, uint256 _reimburseAmount);
    
    // TODO: implement owners wallet to collect 80% of gathered ethers
    constructor(
        uint256 _reserveRatio,
        address _mogulToken
    ) public {
        mogulToken = MogulToken(_mogulToken);
        reserveRatio = _reserveRatio;
    }
    
    // TODO: add modifier ~onlyNotInited()
    function init() public onlyOwner {
        // TODO: calculate initial dependence between eth and token (think about setting it with the initialisation)
        mogulToken.mint(msg.sender, 1 * scale);
    }
    
    function () external payable { mint(); }
    
    function mint() public payable {
        require(msg.value > 0, "Must send ether to buy tokens.");
        _continuousMint(msg.value);
    }
    
    function burn(uint256 _amount) public {
        uint256 returnAmount = _continuousBurn(_amount);
        // TODO: should send 20%
        msg.sender.transfer(returnAmount);
    }
    
    function calculateContinuousMintReturn(uint256 _amount) public view returns (uint256 mintAmount) {
        return calculatePurchaseReturn(mogulToken.totalSupply(), reserveBalance, uint32(reserveRatio), _amount);
    }
    
    function calculateContinuousBurnReturn(uint256 _amount) public view returns (uint256 burnAmount) {
        return calculateSaleReturn(mogulToken.totalSupply(), reserveBalance, uint32(reserveRatio), _amount);
    }
    
    function _continuousMint(uint256 _deposit) internal returns (uint256) {
        require(_deposit > 0, "Deposit must be non-zero.");
        
        uint256 amount = calculateContinuousMintReturn(_deposit);
        mogulToken.mint(msg.sender, amount);
        reserveBalance = reserveBalance.add(_deposit);
        emit ContinuousMint(msg.sender, amount, _deposit);
        return amount;
    }
    
    function _continuousBurn(uint256 _amount) internal returns (uint256) {
        require(_amount > 0, "Amount must be non-zero.");
        require(mogulToken.balanceOf(msg.sender) >= _amount, "Insufficient tokens to burn.");
        
        uint256 reimburseAmount = calculateContinuousBurnReturn(_amount);
        reserveBalance = reserveBalance.sub(reimburseAmount);
        mogulToken.burnFrom(msg.sender, _amount);
        emit ContinuousBurn(msg.sender, _amount, reimburseAmount);
        return reimburseAmount;
    }
}
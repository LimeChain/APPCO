pragma solidity 0.5.3;

import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./BancorBondingCurve.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


contract MogulToken is ERC20, BancorBondingCurve, Ownable {
    using SafeMath for uint256;

    address private raisingWallet;
    uint256 public scale = 10 ** 18;
    uint256 public reserveBalance = 10 * scale;
    uint256 public reserveRatio;
    
    // % or part of the ethers that will stay in the contract as reserve
    uint256 public reserveRate = 10;

    constructor(
        uint256 _reserveRatio,
        address _raisingWallet
    ) public {
        reserveRatio = _reserveRatio;
        raisingWallet = _raisingWallet;
        _mint(msg.sender, 1 * scale);
    }

    function() external payable {
        mint();
    }
    
    function getRaisingWallet() external view returns(address) {
        return raisingWallet;
    }

    function mint() public payable {
        require(msg.value > 0, "Must send ether to buy tokens.");
        _continuousMint(msg.value);
        reserveBalance = reserveBalance.add(msg.value.div(reserveRate));
    }

    function burn(uint256 _amount) public {
        uint256 returnAmount = _continuousBurn(_amount);
        msg.sender.transfer(returnAmount);
    }

    function _investReturn () external payable {
        reserveBalance = reserveBalance.add(msg.value);
    }
 
    function calculateContinuousMintReturn(uint256 _amount)
    public view returns (uint256 mintAmount) {
        return calculatePurchaseReturn(totalSupply(), reserveBalance, uint32(reserveRatio), _amount.div(reserveRate));
    }

    function calculateContinuousBurnReturn(uint256 _amount)
    public view returns (uint256 burnAmount) {
        return calculateSaleReturn(totalSupply(), reserveBalance, uint32(reserveRatio), _amount);
    }

    function _continuousMint(uint256 _deposit)
    internal returns (uint256) {
        require(_deposit > 0, "Deposit must be non-zero.");

        uint256 amount = calculateContinuousMintReturn(_deposit);
        _mint(msg.sender, amount);
        
//        emit ContinuousMint(msg.sender, amount, _deposit);
        return amount;
    }

    function _continuousBurn(uint256 _amount)
    internal returns (uint256) {
        require(_amount > 0, "Amount must be non-zero.");
        require(balanceOf(msg.sender) >= _amount, "Insufficient tokens to burn.");

        uint256 reimburseAmount = calculateContinuousBurnReturn(_amount);
        reserveBalance = reserveBalance.sub(reimburseAmount);
        _burn(msg.sender, _amount);
        // emit ContinuousBurn(msg.sender, _amount, reimburseAmount);
        return reimburseAmount;
    }
}
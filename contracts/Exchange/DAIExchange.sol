pragma solidity 0.5.4;

import "./../Tokens/MogulDAI/MogulDAI.sol";
import "./../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./../../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract DAIExchange is Ownable {

    using SafeMath for uint256;

    MogulDAI public daiToken;
    uint256 constant public MINIMUM_EXCHANGE_RATE = 100; // 100 rate => 1 ETH = 1 DAI


    constructor(address daiTokenContract) public {
        daiToken = MogulDAI(daiTokenContract);
    }   

    // Rate should be always provided with 2 digits fraction precision
    function exchange(uint256 ethToDAIRate) external payable {

        // Rate -> 138.13 is represented as 13813
        require(ethToDAIRate >= MINIMUM_EXCHANGE_RATE, "Provided rate should be bigger than 100");

        uint256 daiInReturn = ethToDAIRate.mul(msg.value).div(MINIMUM_EXCHANGE_RATE);
        daiToken.mint(msg.sender, daiInReturn);
    } 

    function withdrawETH() external onlyOwner {
        require(msg.sender == owner(), "Only owner can withdraw ethers balance");
        msg.sender.transfer(address(this).balance);
    }
}

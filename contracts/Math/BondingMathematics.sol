pragma solidity 0.5.4;

import "./../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


contract BondingMathematics {
    using SafeMath for uint256;

//    uint256 public tokenSupply = 1000000000000000000;
//    uint256 public etherBalance = 500000000000000000;
//    uint256 public boughtTokens = 0;
//    uint256 public ethersToReturn = 0;

    address public vyperMath;

    constructor(address _vyperMath) public {
        vyperMath = _vyperMath;
    }

//    function purchaseTokens() public payable {
//		uint256 tokensAfter = calcPurchase(msg.value);
//        uint256 tokensToMint = tokensAfter.sub(tokenSupply);
//        etherBalance += msg.value;
//        boughtTokens += tokensToMint;
//        tokenSupply = tokensAfter;
//	}

//    function sellTokens(uint256 _tokenAmount) public {
//        uint256 _ethersToReturn = calcTokenSell(_tokenAmount);
//        ethersToReturn = _ethersToReturn;
//    }

    function calcPurchase(uint256 ethAmount, uint256 reserveTokenSupply, uint256 continuousTokenSupply) public returns (uint256){

        (bool success, bytes memory data) = vyperMath.call(abi.encodeWithSignature("calc_purchase(uint256,uint256,uint256)", continuousTokenSupply, reserveTokenSupply, ethAmount));
        require(success);

	    // Convert bytes in to uint256
        uint tokensAmount;
        assembly {
            tokensAmount := mload(add(data, add(0x20, 0)))
        }

        return tokensAmount;
    }

    function calcTokenSell(uint256 _tokensAmount, uint256 reserveTokenSupply, uint256 continuousTokenSupply) internal returns (uint256){

        (bool success, bytes memory data) = vyperMath.call(abi.encodeWithSignature("calc_sell(uint256,uint256,uint256)", continuousTokenSupply, reserveTokenSupply, _tokensAmount));
        require(success);

        // Convert bytes in to uint256
        uint ethersAmount;
        assembly {
            ethersAmount := mload(add(data, add(0x20, 0)))
        }

        return ethersAmount;
    }

//    function returnTokenSupply() public view returns(uint256) {
//        return tokenSupply;
//    }
//
//    function returnEtherBalance() public view returns(uint256) {
//        return etherBalance;
//    }
//
//    function returnTokenBought() public view returns(uint256) {
//        return boughtTokens;
//    }
//
//    function getEthersToReturn() public view returns(uint256) {
//        return ethersToReturn;
//    }
}
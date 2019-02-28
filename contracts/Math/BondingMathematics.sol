pragma solidity 0.5.4;

import "./../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


contract BondingMathematics {
    using SafeMath for uint256;

    address public vyperMath;

    constructor(address _vyperMath) public {
        vyperMath = _vyperMath;
    }


    function calcPurchase(uint256 continuousTokenSupply,
        uint256 reserveTokenSupply,
        uint256 daiAmount) public view returns (uint256){

        (bool success, bytes memory data) = vyperMath.staticcall(abi.encodeWithSignature("calc_purchase(uint256,uint256,uint256)", continuousTokenSupply, reserveTokenSupply, daiAmount));
        require(success);

        // Convert bytes in to uint256
        uint tokensAmount;
        assembly {
            tokensAmount := mload(add(data, add(0x20, 0)))
        }

        return tokensAmount;
    }

    function calcTokenSell(uint256 continuousTokenSupply,
        uint256 reserveTokenSupply,
        uint256 _tokensAmount) public view returns (uint256){

        (bool success, bytes memory data) = vyperMath.staticcall(abi.encodeWithSignature("calc_sell(uint256,uint256,uint256)", continuousTokenSupply, reserveTokenSupply, _tokensAmount));
        require(success);

        // Convert bytes in to uint256
        uint ethersAmount;
        assembly {
            ethersAmount := mload(add(data, add(0x20, 0)))
        }

        return ethersAmount;
    }
    
}
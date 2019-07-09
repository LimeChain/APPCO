pragma solidity ^0.5.3;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "./../ITokenTransferLimiter.sol";
import "./ICOToken.sol";


contract COToken is ICOToken, ERC20Mintable, ERC20Burnable  {

    ITokenTransferLimiter public tokenTransferLimiter;

    function setTokenLimiter(address _tokenTransferLimiter) public {
        require(address(tokenTransferLimiter) == address(0x0), "Token Limiter already set");
        tokenTransferLimiter = ITokenTransferLimiter(_tokenTransferLimiter);
    }

    function changeTokenLimiter(address _tokenTransferLimiter) public {
        require(address(tokenTransferLimiter) == msg.sender, "Token Limiter can only be changed from the token limiter");
        tokenTransferLimiter = ITokenTransferLimiter(_tokenTransferLimiter);
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(tokenTransferLimiter.canMoveTokens(msg.sender, to, value), "Token moving limited");
        return super.transfer(to, value);
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(tokenTransferLimiter.canMoveTokens(from, to, value), "Token moving limited");
        return super.transferFrom(from, to, value);
    }

    function burnFrom(address from, uint256 value) public {
        require(tokenTransferLimiter.canMoveTokens(from, msg.sender, value), "Token moving limited");
        super.burnFrom(from, value);
    }

}

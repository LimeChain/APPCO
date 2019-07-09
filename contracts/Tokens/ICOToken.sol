pragma solidity ^0.5.3;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "./../ITokenTransferLimiter.sol";


contract ICOToken is IERC20  {

    function setTokenLimiter(address _tokenTransferLimiter) public;

    function changeTokenLimiter(address _tokenTransferLimiter) public;

    function burnFrom(address from, uint256 value) public;
    function mint(address to, uint256 value) public returns (bool);

}

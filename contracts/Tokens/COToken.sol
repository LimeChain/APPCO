pragma solidity ^0.5.3;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";


contract COToken is ERC20Mintable, ERC20Burnable  {
    
    constructor() public {
    }
}

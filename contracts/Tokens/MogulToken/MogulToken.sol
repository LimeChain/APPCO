pragma solidity ^0.5.3;

import "./../../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./../../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "./../../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";


contract MogulToken is ERC20Detailed, ERC20Mintable, ERC20Burnable  {
    
    string private _name = "Mogul";
    string private _symbol = "MGL";
    uint8 private _decimal = 18;
    
    constructor() ERC20Detailed(_name, _symbol, _decimal) public {
    }
}

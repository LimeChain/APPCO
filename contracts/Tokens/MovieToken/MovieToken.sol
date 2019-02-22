pragma solidity ^0.5.3;

import "./../../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./../../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";


contract MovieToken is ERC20Detailed, ERC20Mintable {
    
    string private _name = "Mogul Movie";
    string private _symbol = "MGLM";
    uint8 private _decimal = 18;

    constructor() ERC20Detailed(_name, _symbol, _decimal) public { }
}

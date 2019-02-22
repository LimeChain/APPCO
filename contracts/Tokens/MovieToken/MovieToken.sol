pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";


contract MovieToken is ERC20Detailed {
    
    string private _name = "Mogul Movie";
    string private _symbol = "MGLM";
    uint8 private _decimal = 18;

    constructor() ERC20Detailed(_name, _symbol, _decimal) public { }
}

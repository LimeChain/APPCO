pragma solidity ^0.5.3;

import "./../../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./../../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";


contract MovieToken is ERC20Detailed, ERC20Mintable {

    constructor() ERC20Detailed(
        "Mogul Movie Coin", // name
        "MGLMC", // symbol
         18 // decimals
    ) public { }
}

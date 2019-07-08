pragma solidity ^0.5.4;

contract ITokenTransferLimiter {
	function canMoveTokens(address from, address to, uint256 amount) public view returns(bool);
}
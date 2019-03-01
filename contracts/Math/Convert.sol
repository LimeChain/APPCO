pragma solidity 0.5.4;

library Convert {

    function toUint256(bytes memory bytesValue) internal pure returns (uint256) {

        uint uintValue;
        assembly {
            uintValue := mload(add(bytesValue, add(0x20, 0)))
        }

        return uintValue;
    }
}
pragma solidity ^0.4.24;

import "../ownership/MultiOwnable.sol";

contract MultiOwnableTestHelper is MultiOwnable {
    function isOwner() public view onlyOwner returns(bool) {
        return true;
    }
}

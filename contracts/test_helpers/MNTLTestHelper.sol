pragma solidity ^0.4.23;

import "../MNTL.sol";

contract MNTLTestHelper is MNTL {

    /**
     * Constructor function
     *
     * Initializes contract with initial supply tokens to the creator of the contract
     */
    constructor (
    ) public {
      totalSupply_ = 18000000 * 1 ether;
      balances[this] = totalSupply_;
      emit Transfer(address(0), this, totalSupply_);
    }
}

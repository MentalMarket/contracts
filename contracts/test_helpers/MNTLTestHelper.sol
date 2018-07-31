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
      name = "MentalCoin";
      symbol = "MNTL";
      uint256 initialSupply = 18000000;
      totalSupply_ = initialSupply * 10 ** uint256(decimals);
      balances[this] = totalSupply_;
      emit Transfer(address(0), this, totalSupply_);
    }
}

pragma solidity ^0.4.24;

import '../PreSale.sol';
import './TimeNow.sol';

/// @title Test helper for PreSale, DONT use it in production!
contract PreSaleTestHelper is PreSale, TimeNow {

    constructor (MNTL _token, address _wallet) public
        PreSale(_token, _wallet)
    {
        price = 10000;
    }
}

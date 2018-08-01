pragma solidity ^0.4.24;

import '../PreSale.sol';
import './TimeNow.sol';

/// @title Test helper for PreSale, DONT use it in production!
contract PreSaleTestHelper is PreSale, TimeNow {

    constructor (MNTL _token, uint _startAt, uint _closeAt, uint256 _softcap, uint256 _hardcap, address _wallet) public
        PreSale(_token, _startAt, _closeAt, _softcap, _hardcap, _wallet)
    {
        price = 10000;
    }

    function getWeRaised() public view returns(uint256) {
        return weRaised;
    }

    function getWeSolved() public view returns(uint256) {
        return weSolved;
    }

    function setHardCap(uint _hardcap) public {
        hardcap = _hardcap;
    }

    function setSoftCap(uint _softcap) public {
        softcap = _softcap;
    }

    function getAvailableTokens() public view returns(uint256) {
        return hardcap - weSolved;
    }
}

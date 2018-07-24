pragma solidity ^0.4.24;

import "./Ownable.sol";

contract MultiOwnable is Ownable {

    uint ownersCount;
    mapping(address => bool) public owners;

    modifier onlyOwner() {
        require(owners[msg.sender]);
        _;
    }

    modifier possibleToAd() {
        require(ownersCount < 3);
        _;
    }

    constructor () public {
        ownersCount = 1;
        owners[owner] = true;
    }

    function addOwner(address _owner) public onlyOwner possibleToAd {
        require(_owner != address(0));
        ownersCount += 1;
        owners[_owner] = true;
    }

    function deleteOwner(address _owner) public onlyOwner {
        if (owners[_owner]) {
            ownersCount -= 1;
            delete owners[_owner];
        }
    }
}

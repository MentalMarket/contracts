pragma solidity 0.4.24;

import "./IcoStateEnum.sol";

interface Crowdsale {
    function startAt() external view returns(uint);
    function closeAt() external view returns(uint);
    function state() external view returns(IcoStateEnum.IcoState);
}

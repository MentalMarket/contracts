pragma solidity 0.4.24;

contract TimeNow {
    function getCurrentTime() internal constant returns (uint) {
        return mTime > 0 ? mTime : now;
    }

    function setTime(uint time) external {
        mTime = time;
    }

    uint mTime;
}

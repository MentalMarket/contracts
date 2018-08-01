pragma solidity ^0.4.24;

import 'zeppelin-solidity/contracts/math/Math.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import "../MNTL.sol";
import "../ownership/Pausable.sol";
import "../ownership/MultiOwnable.sol";
import "./IcoStateEnum.sol";

contract BaseCrowdsale is Pausable, IcoStateEnum {
    using Math for uint256;
    using SafeMath for uint256;

    /// @notice ICO token
    MNTL public token;

    /// @notice start time of the ICO
    uint public startAt;

    /// @notice close time of the ICO
    uint public closeAt;

    /// @notice token price
    uint256 public price;
    uint256 public softcap;
    uint256 public hardcap;
    uint256 public weRaised;
    uint256 public weSolved;
    address public wallet; // withdraw wallet
    IcoState public state; // ICO current state


    struct Investment {
        uint256 sum;
        uint256 tokens;
    }

    mapping(address => Investment) deposits; // для хранения каждого вложения

    event StateChanged(IcoState _state);
    event PurchaseSuccess(address indexed benefeciary, uint256 sum);
    event RefundSuccess(address indexed benefeciary, uint256 sum);
    event ChangeCloseAt(uint from, uint to);

    // modifiers
    modifier onlyForInvestors() {
        require(deposits[msg.sender].tokens > 0);
        _;
    }

    modifier mUnderHardcap() {
        require(weSolved < hardcap);
        _;
    }

    modifier mUnderSoftcap() {
        require(weSolved < softcap);
        _;
    }

    modifier mOverSoftcap() {
        require(weSolved >= softcap);
        _;
    }

    modifier afterCloseAt() {
        require(getCurrentTime() > closeAt);
        _;
    }

    modifier isCrowdsaleOpen() {
        require(isActive());
        _;
    }

    modifier onlyActiveState() {
        require(state != IcoState.FAILURE && state != IcoState.HARDCAP_SUCCESS && state != IcoState.SOFTCAP_SUCCESS);
        _;
    }


    constructor (MNTL _token, uint _startAt, uint _closeAt, uint256 _softcap, uint256 _hardcap, address _wallet) public {
        token = _token;
        startAt = _startAt;
        closeAt = _closeAt;
        softcap = _softcap;
        hardcap = _hardcap;
        weRaised = 0; // ethers
        weSolved = 0; // tokens
        wallet = _wallet;
        state = IcoState.INIT;
    }

    // PUBLIC

    function setWithdrawWallet(address _wallet) public onlyOwner {
        wallet = _wallet;
    }

    function isActive() public view returns(bool) {
        return getCurrentTime() > startAt && getCurrentTime() < closeAt;
    }

    function changeCloseAt(uint _closeAt) public onlyOwner mOverSoftcap isCrowdsaleOpen {
        require(_closeAt > startAt);
        emit ChangeCloseAt(closeAt, _closeAt);
        closeAt = _closeAt;
    }


    // PUBLIC interface: owners: maintenance

    function _close() private {
        token.detachController();
    }

    function changeState(IcoState _state) private {
        state = _state;
        emit StateChanged(state);
    }


    // INTERNAL

    function hardcapSuccess() internal {
        _close();
        changeState(IcoState.HARDCAP_SUCCESS);
    }

    function softcapSuccess() internal {
        _close();
        changeState(IcoState.SOFTCAP_SUCCESS);
    }

    function failure() internal {
        _close();
        changeState(IcoState.FAILURE);
    }

    /// @dev to be overridden in tests
    function getCurrentTime() internal constant returns (uint) {
        return now;
    }

    function withdraw() internal {
        wallet.transfer(weRaised);
    }
}

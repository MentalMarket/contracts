pragma solidity ^0.4.24;

import "./MultiOwnable.sol";


/**
 * @title Contract which is owned by owners and operated by controller.
 *
 * @notice Provides a way to set up an entity (typically other contract) entitled to control actions of this contract.
 * Controller is set up by owners or during construction.
 *
 * @dev controller check is performed by onlyController modifier.
 */
contract Controller is MultiOwnable {

    mapping(address => bool) controllers; // чтобы хранить предыдущие контроллеры, ибо через них инвестор может вызвать refund

    event ControllerSet(address controller);
    event ControllerRetired(address was);
    event ChangeState(State from, State to);

    enum State { None, PrivateSale, SecondPrivateSale, PreIco, Ico }

    constructor () public {
        mControllersCount = 0;
        state = State.None;
    }

    modifier onlyController {
        require(msg.sender == mController);
        _;
    }

    modifier onlyInController {
        require(controllers[msg.sender]);
        _;
    }

    modifier onlySquentially(State _state) {
        require(_state > state);
        _;
    }

    modifier whenNotActive() {
        require(mController == address(0));
        _;
    }

    // PUBLIC interface

    function setPrivateSale(address controller) public onlyOwner whenNotActive onlySquentially(State.PrivateSale) {
        setController(controller);
        changeState(State.PrivateSale);
    }

    function setSecondPrivateSale(address controller) public onlyOwner whenNotActive onlySquentially(State.SecondPrivateSale) {
        setController(controller);
        changeState(State.SecondPrivateSale);
    }

    function setPreIco(address controller) public onlyOwner whenNotActive onlySquentially(State.PreIco) {
        setController(controller);
        changeState(State.PreIco);
    }

    function setIco(address controller) public onlyOwner whenNotActive onlySquentially(State.Ico) {
        setController(controller);
        changeState(State.Ico);
    }

    /// @dev ability for controller to step down
    function detachController() external onlyController {
        address was = mController;
        if (was != address(0)) {
            mController = address(0);
            emit ControllerRetired(was);
        }
    }


    // PRIVATE

    function changeState(State _newState) private {
        emit ChangeState(state, _newState);
        state = _newState;
    }

    /// @dev sets the controller
    function setController(address _controller) private {
        require(mControllersCount < 4); // max 4 controllers
        mController = _controller;
        controllers[_controller] = true;
        mControllersCount +=1;
        emit ControllerSet(mController);
    }


    // FIELDS

    /// @notice address of entity entitled to mint new tokens
    address public mController;
    uint256 public mControllersCount;
    State public state;
}

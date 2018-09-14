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

    modifier onlyController {
        require(msg.sender == mController);
        _;
    }

    modifier onlyInController {
        require(controllers[msg.sender]);
        _;
    }

    modifier whenNotActive() {
        require(mController == address(0));
        _;
    }

    // PUBLIC interface

    /// @dev ability for controller to step down
    function detachController() external onlyController {
        address was = mController;
        if (was != address(0)) {
            mController = address(0);
            emit ControllerRetired(was);
        }
    }


    /// @dev sets the controller
    function setController(address _controller) public onlyOwner whenNotActive {
        mController = _controller;
        controllers[_controller] = true;
        emit ControllerSet(mController);
    }

    function isActiveController() public view returns(bool) {
        return mController != address(0);
    }


    // FIELDS

    /// @notice address of entity entitled to mint new tokens
    address public mController;
}

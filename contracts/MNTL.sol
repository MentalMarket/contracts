pragma solidity ^0.4.23;

import "./ownership/Pausable.sol";
import "./ownership/BurnableToken.sol";
import "./crowdsale/iCrowdsale.sol";

contract MNTL is BurnableToken, Pausable {
    // Public variables of the token
    string public constant name = "MentalCoin";
    string public constant symbol = "MNTL";
    uint8 public constant decimals = 18;

    modifier balanceAvailable(uint256 amount) {
        require(balances[this] >= amount);
        _;
    }

    modifier whenNotActiveIco() {
        require(mController == address(0));
        _;
    }


    /**
     * Constructor function
     *
     * Initializes contract with initial supply tokens to the creator of the contract
     */
    constructor (
    ) public {
      uint256 initialSupply = 50625000;
      totalSupply_ = initialSupply * 10 ** uint256(decimals);
      balances[this] = totalSupply_;
      emit Transfer(address(0), this, totalSupply_);
    }

    function buy(address beneficiary, uint256 amount) external onlyController balanceAvailable(amount) {
        require(beneficiary != address(0));
        balances[this] = balances[this].sub(amount);
        balances[beneficiary] = balances[beneficiary].add(amount);
        emit Transfer(this, beneficiary, amount);
    }

    function refund(address beneficiary, uint256 amount) external onlyInController {
        require(beneficiary != address(0));
        require(amount > 0 && balances[beneficiary] >= amount);
        balances[this] = balances[this].add(amount);
        balances[beneficiary] = balances[beneficiary].sub(amount);
        emit Transfer(beneficiary, this, amount);
    }

    function transferFrom(address _from, address _to, uint256 _value) public whenNotPaused whenNotActiveIco returns (bool) {
        return super.transferFrom(_from, _to, _value);
    }

    function transfer(address _to, uint256 _value) public whenNotPaused whenNotActiveIco returns (bool) {
        return super.transfer(_to, _value);
    }

    function availableTokens() public view returns(uint) {
        return balances[this];
    }
}

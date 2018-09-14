pragma solidity ^0.4.23;

import "./ownership/Pausable.sol";
import "./ownership/MintableToken.sol";

contract MNTL is MintableToken, Pausable {
    // Public variables of the token
    string public constant name = "MentalCoin";
    string public constant symbol = "MNTL";
    uint8 public constant decimals = 18;

    /**
     * Constructor function
     *
     * Initializes contract with initial supply tokens to the creator of the contract
     */
    constructor (
    ) public {
      balances[this] = 0;
    }

    function buy(address beneficiary, uint256 amount) external onlyController {
        require(beneficiary != address(0));
        balances[this] = balances[this].sub(amount);
        balances[beneficiary] = balances[beneficiary].add(amount);
        emit Transfer(this, beneficiary, amount);
    }

    function refund(address beneficiary, uint256 amount) external onlyInController {
        require(beneficiary != address(0));
        require(amount > 0 && balances[beneficiary] >= amount);
        totalSupply_ = totalSupply_.sub(amount);
        balances[beneficiary] = balances[beneficiary].sub(amount);

        emit Transfer(beneficiary, this, amount);
    }

    function transferFrom(address _from, address _to, uint256 _value) public whenNotActive whenNotPaused returns (bool) {
        return super.transferFrom(_from, _to, _value);
    }

    function transfer(address _to, uint256 _value) public whenNotActive whenNotPaused returns (bool) {
        return super.transfer(_to, _value);
    }
}

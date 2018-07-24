pragma solidity 0.4.24;

// File: contracts/crowdsale/IcoStateEnum.sol

contract IcoStateEnum {
    enum IcoState { INIT, ICO, PAUSED, FAILURE, DISTRIBUTING_BONUSES, SUCCEEDED, HARDCAP_SUCCESS, SOFTCAP_SUCCESS }
}

// File: contracts/crowdsale/iCrowdsale.sol

interface Crowdsale {
    function startAt() external view returns(uint);
    function closeAt() external view returns(uint);
    function state() external view returns(IcoStateEnum.IcoState);
}

// File: contracts/ownership/Ownable.sol

/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address public owner;


  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  constructor() public {
    owner = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function transferOwnership(address _newOwner) public onlyOwner {
    _transferOwnership(_newOwner);
  }

  /**
   * @dev Transfers control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function _transferOwnership(address _newOwner) internal {
    require(_newOwner != address(0));
    emit OwnershipTransferred(owner, _newOwner);
    owner = _newOwner;
  }
}

// File: contracts/ownership/MultiOwnable.sol

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

// File: contracts/ownership/Controller.sol

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

// File: zeppelin-solidity/contracts/math/SafeMath.sol

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {

  /**
  * @dev Multiplies two numbers, throws on overflow.
  */
  function mul(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // Gas optimization: this is cheaper than asserting 'a' not being zero, but the
    // benefit is lost if 'b' is also tested.
    // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
    if (a == 0) {
      return 0;
    }

    c = a * b;
    assert(c / a == b);
    return c;
  }

  /**
  * @dev Integer division of two numbers, truncating the quotient.
  */
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    // uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return a / b;
  }

  /**
  * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
  */
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  /**
  * @dev Adds two numbers, throws on overflow.
  */
  function add(uint256 a, uint256 b) internal pure returns (uint256 c) {
    c = a + b;
    assert(c >= a);
    return c;
  }
}

// File: zeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol

/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
  function totalSupply() public view returns (uint256);
  function balanceOf(address who) public view returns (uint256);
  function transfer(address to, uint256 value) public returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}

// File: zeppelin-solidity/contracts/token/ERC20/BasicToken.sol

/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract BasicToken is ERC20Basic {
  using SafeMath for uint256;

  mapping(address => uint256) balances;

  uint256 totalSupply_;

  /**
  * @dev total number of tokens in existence
  */
  function totalSupply() public view returns (uint256) {
    return totalSupply_;
  }

  /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));
    require(_value <= balances[msg.sender]);

    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    emit Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) public view returns (uint256) {
    return balances[_owner];
  }

}

// File: zeppelin-solidity/contracts/token/ERC20/ERC20.sol

/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
  function allowance(address owner, address spender)
    public view returns (uint256);

  function transferFrom(address from, address to, uint256 value)
    public returns (bool);

  function approve(address spender, uint256 value) public returns (bool);
  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );
}

// File: zeppelin-solidity/contracts/token/ERC20/StandardToken.sol

/**
 * @title Standard ERC20 token
 *
 * @dev Implementation of the basic standard token.
 * @dev https://github.com/ethereum/EIPs/issues/20
 * @dev Based on code by FirstBlood: https://github.com/Firstbloodio/token/blob/master/smart_contract/FirstBloodToken.sol
 */
contract StandardToken is ERC20, BasicToken {

  mapping (address => mapping (address => uint256)) internal allowed;


  /**
   * @dev Transfer tokens from one address to another
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint256 the amount of tokens to be transferred
   */
  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool)
  {
    require(_to != address(0));
    require(_value <= balances[_from]);
    require(_value <= allowed[_from][msg.sender]);

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
    emit Transfer(_from, _to, _value);
    return true;
  }

  /**
   * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
   *
   * Beware that changing an allowance with this method brings the risk that someone may use both the old
   * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
   * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
   * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender, uint256 _value) public returns (bool) {
    allowed[msg.sender][_spender] = _value;
    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  /**
   * @dev Function to check the amount of tokens that an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint256 specifying the amount of tokens still available for the spender.
   */
  function allowance(
    address _owner,
    address _spender
   )
    public
    view
    returns (uint256)
  {
    return allowed[_owner][_spender];
  }

  /**
   * @dev Increase the amount of tokens that an owner allowed to a spender.
   *
   * approve should be called when allowed[_spender] == 0. To increment
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * From MonolithDAO Token.sol
   * @param _spender The address which will spend the funds.
   * @param _addedValue The amount of tokens to increase the allowance by.
   */
  function increaseApproval(
    address _spender,
    uint _addedValue
  )
    public
    returns (bool)
  {
    allowed[msg.sender][_spender] = (
      allowed[msg.sender][_spender].add(_addedValue));
    emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

  /**
   * @dev Decrease the amount of tokens that an owner allowed to a spender.
   *
   * approve should be called when allowed[_spender] == 0. To decrement
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * From MonolithDAO Token.sol
   * @param _spender The address which will spend the funds.
   * @param _subtractedValue The amount of tokens to decrease the allowance by.
   */
  function decreaseApproval(
    address _spender,
    uint _subtractedValue
  )
    public
    returns (bool)
  {
    uint oldValue = allowed[msg.sender][_spender];
    if (_subtractedValue > oldValue) {
      allowed[msg.sender][_spender] = 0;
    } else {
      allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
    }
    emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

}

// File: contracts/ownership/BurnableToken.sol

/**
 * @title Burnable Token
 * @dev Token that can be irreversibly burned (destroyed).
 */
contract BurnableToken is StandardToken, Controller {

  event Burn(address indexed burner, uint256 value);

  /**
   * @dev Burns a specific amount of tokens.
   * @param _who Beneficiary address.
   * @param _value The amount of token to be burned.
   */
  function burn(address _who, uint256 _value) public onlyController {
    require(_value <= balances[_who]);
    // no need to require value <= totalSupply, since that would imply the
    // sender's balance is greater than the totalSupply, which *should* be an assertion failure

    balances[_who] = balances[_who].sub(_value);
    totalSupply_ = totalSupply_.sub(_value);
    emit Burn(_who, _value);
    emit Transfer(_who, address(0), _value);
  }
}

// File: contracts/ownership/Pausable.sol

/**
 * @title Pausable
 * @dev Base contract which allows children to implement an emergency stop mechanism.
 */
contract Pausable is MultiOwnable {
  event Pause();
  event Unpause();

  bool public paused = false;


  /**
   * @dev Modifier to make a function callable only when the contract is not paused.
   */
  modifier whenNotPaused() {
    require(!paused);
    _;
  }

  /**
   * @dev Modifier to make a function callable only when the contract is paused.
   */
  modifier whenPaused() {
    require(paused);
    _;
  }

  /**
   * @dev called by the owner to pause, triggers stopped state
   */
  function pause() onlyOwner whenNotPaused public {
    paused = true;
    emit Pause();
  }

  /**
   * @dev called by the owner to unpause, returns to normal state
   */
  function unpause() onlyOwner whenPaused public {
    paused = false;
    emit Unpause();
  }
}

// File: contracts/MNTL.sol

contract MNTL is BurnableToken, Pausable {
    // Public variables of the token
    string public name;
    string public symbol;
    uint8 public decimals = 18;

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
      name = "MentalCoin";
      symbol = "MNTL";
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

// File: zeppelin-solidity/contracts/math/Math.sol

/**
 * @title Math
 * @dev Assorted math operations
 */
library Math {
  function max64(uint64 a, uint64 b) internal pure returns (uint64) {
    return a >= b ? a : b;
  }

  function min64(uint64 a, uint64 b) internal pure returns (uint64) {
    return a < b ? a : b;
  }

  function max256(uint256 a, uint256 b) internal pure returns (uint256) {
    return a >= b ? a : b;
  }

  function min256(uint256 a, uint256 b) internal pure returns (uint256) {
    return a < b ? a : b;
  }
}

// File: contracts/crowdsale/BaseCrowdsale.sol

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
        softcap = _softcap.mul(uint256(10) ** token.decimals());
        hardcap = _hardcap.mul(uint256(10) ** token.decimals());
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

// File: contracts/PreSale.sol

contract PreSale is BaseCrowdsale {

    constructor (MNTL _token, uint _startAt, uint _closeAt, uint256 _softcap, uint256 _hardcap, address _wallet)
        BaseCrowdsale(_token, _startAt, _closeAt, _softcap, _hardcap, _wallet) public {
        price = 20000;
    }

    function () public payable whenNotPaused mUnderHardcap isCrowdsaleOpen {
        uint256 _wei = msg.value;
        uint256 tokens = _wei.mul(priceWithBonus(_wei));
        address benefeciary = msg.sender;
        require(tokens > 0);
        uint256 availableTokens = hardcap - weSolved;
        if (tokens >= availableTokens) {
            tokens = availableTokens;
            uint256 sumForUs = tokens.div(priceWithBonus(_wei));
            uint256 sumForBack = _wei.sub(sumForUs);
            benefeciary.transfer(sumForBack);
            successPurchase(benefeciary, sumForUs, tokens);
        } else {
            successPurchase(benefeciary, _wei, tokens);
        }
        payableCallback();
    }

    function priceWithBonus(uint _wei) public view returns(uint256) {
        uint bonus = 0;
        if (_wei > 120 ether)
            bonus = 20;
        else if (_wei > 60 ether)
            bonus = 15;
        else if (_wei > 30 ether)
            bonus = 10;
        else if (_wei > 15 ether)
            bonus = 5;
        return price.mul(bonus.add(100)).div(100);
    }

    function close() public onlyOwner whenNotPaused afterCloseAt onlyActiveState {
        if (weSolved == hardcap) {
            withdraw();
            hardcapSuccess();
        }
        else if (weSolved >= softcap) {
            withdraw();
            softcapSuccess();
        }
        else {
            failure();
        }
    }

    function refund() public whenNotPaused afterCloseAt onlyForInvestors mUnderSoftcap {
        if (weSolved < softcap) {
            address benefeciary = msg.sender;
            Investment storage investment = deposits[benefeciary];
            if (investment.tokens != 0) {
                token.refund(benefeciary, investment.tokens);
                benefeciary.transfer(investment.sum);
                emit RefundSuccess(benefeciary, investment.sum);
                weRaised = weRaised.sub(investment.sum);
                weSolved = weSolved.sub(investment.tokens);
                delete deposits[benefeciary];
            }
        }
    }

    // private

    function successPurchase(address benefeciary, uint256 sum, uint256 tokens) private {
        token.buy(benefeciary, tokens);
        emit PurchaseSuccess(benefeciary, sum);
        weRaised = weRaised.add(sum);
        weSolved = weSolved.add(tokens);
        Investment storage oldDeposit = deposits[benefeciary];
        if (oldDeposit.tokens != 0) {
            deposits[benefeciary] = Investment({
                tokens: oldDeposit.tokens.add(tokens),
                sum: oldDeposit.sum.add(sum)
            });
        } else {
            deposits[benefeciary] = Investment({tokens: tokens, sum: sum});
        }
    }

    function payableCallback() private {
        if (weSolved == hardcap) {
            withdraw();
            hardcapSuccess();
        }
    }
}

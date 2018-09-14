pragma solidity ^0.4.24;

import 'zeppelin-solidity/contracts/math/Math.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import "MNTL.sol";
import "ownership/Pausable.sol";
import "ownership/MultiOwnable.sol";

contract PreSale is Pausable {
    using Math for uint256;
    using SafeMath for uint256;

    /// @notice ICO token
    MNTL public token;

    /// @notice token price
    uint256 public price;
    address public wallet; // withdraw wallet

    struct Investment {
        uint256 sum;
        uint256 tokens;
    }

    mapping(address => Investment) deposits; // для хранения каждого вложения

    event PurchaseSuccess(address indexed benefeciary, uint256 sum);
    event RefundSuccess(address indexed benefeciary, uint256 sum);
    event CrowdsaleStatus(string status);
    event SendBounty(address indexed benefeciary, uint256 tokens);

    constructor (MNTL _token, address _wallet)
        public {
        token = _token;
        wallet = _wallet;
        price = 20000; // our tokens in 1 ether;
        CrowdsaleStatus("start");
    }

    // PUBLIC

    function () public payable whenNotPaused {
        address benefeciary = msg.sender;
        uint256 _wei = msg.value;
        uint256 tokens = _wei.mul(priceWithBonus(_wei));
        require(tokens > 0);
        successPurchase(benefeciary, _wei, tokens);
    }

    function priceWithBonus(uint _wei) public view returns(uint256) {
        uint bonus = 0;
        if (_wei >= 90 ether)
            bonus = 20;
        else if (_wei >= 60 ether)
            bonus = 15;
        else if (_wei >= 30 ether)
            bonus = 10;
        else if (_wei >= 15 ether)
            bonus = 5;
        return price.mul(bonus.add(100)).div(100);
    }

    function close() public onlyOwner whenNotPaused {
        require(address(this).balance == 0);
        token.detachController();
        CrowdsaleStatus("close");
    }

    function refund(address benefeciary) public onlyOwner {
        Investment storage investment = deposits[benefeciary];
        if (investment.tokens != 0) {
            token.refund(benefeciary, investment.tokens);
            benefeciary.transfer(investment.sum);
            emit RefundSuccess(benefeciary, investment.sum);
            delete deposits[benefeciary];
        }
    }

    function setWithdrawWallet(address _wallet) public onlyOwner {
        wallet = _wallet;
    }

    function withdraw(uint sum) public onlyOwner {
        require(sum > 0 && sum <= address(this).balance);
        wallet.transfer(sum);
    }

    function sendBounty(address benefeciary, uint256 tokens) public onlyOwner {
        require(benefeciary != address(0) && tokens > 0);
        token.mint(token, tokens);
        token.buy(benefeciary, tokens);
        emit SendBounty(benefeciary, tokens);
    }


    // INTERNAL

    /// @dev to be overridden in tests
    function getCurrentTime() internal constant returns (uint) {
        return now;
    }

    // private

    function successPurchase(address benefeciary, uint256 sum, uint256 tokens) private {
        token.mint(token, tokens);
        token.buy(benefeciary, tokens);
        emit PurchaseSuccess(benefeciary, sum);
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
}

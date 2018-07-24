pragma solidity ^0.4.24;

import "./crowdsale/BaseCrowdsale.sol";

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

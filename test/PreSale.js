require('truffle-test-utils').init();
require('chai').use(require('chai-as-promised')).should();
const createKeccakHash = require('keccak');
const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Token = artifacts.require('./test_helpers/MNTLTestHelper.sol');
const PreSale = artifacts.require("./test_helpers/PreSaleTestHelper.sol");
const Utils =  require('./helpers/utils.js');


contract('PreSale', function(accounts) {
    const utils = new Utils();
    const reverter = new Reverter(web3);
    afterEach('revert', reverter.revert);

    let token;
    let presale;
    const ERROR_MSG = 'VM Exception while processing transaction: revert';
    const decimals = utils.decimals;

    const date = new Date();
    const start_at = (new Date(date.getFullYear(), date.getMonth(), 1)).getTime() / 1000;  // ICO start
    const close_at = (new Date(date.getFullYear(), date.getMonth() + 1, 0)).getTime() / 1000; // ICO close
    const roles = utils.roles(accounts);

    /// starting exchange rate of MNTL
    const MNTLperETH = 10000;

    // converts amount of MNTL into MNTL-wei
    function MNTL(amount) {
        // decimals is the same as in ether, so..
        return amount * decimals;
    }

    function MNTL_from(sum, bonus=0) {
        let tokens = MNTLperETH * sum;
        if (bonus > 0)
            tokens += tokens * bonus;
        return MNTL(tokens);
    }

    before('setup', async () => {
        const date = new Date();
        const start_at = (new Date(date.getFullYear(), date.getMonth(), 1)).getTime() / 1000;
        const close_at = (new Date(date.getFullYear(), date.getMonth() + 1, 0)).getTime() / 1000;
        const softcap = MNTL(1250000);
        const hardcap = MNTL(3250000);

        token = await Token.new();
        presale = await PreSale.new(token.address, start_at, close_at, softcap, hardcap, roles.wallet);
        await reverter.snapshot();
    });

    it('owner presale', async function () {
        let crowdsale_owner = await presale.owner();
        assert.equal(crowdsale_owner, roles.owner1);
    });

    it('period ICO', async function () {
        assert.equal(await presale.startAt(), start_at);
        assert.equal(await presale.closeAt(), close_at);
    });

    it('prohibition of purchase with inactive ico', async function (){
        await presale.sendTransaction({from: roles.investor1, value: web3.toWei(2, 'ether')}).should.be.rejectedWith(ERROR_MSG);

        await token.setPrivateSale(presale.address);

        await presale.setTime(start_at - 1);
        await presale.sendTransaction({from: roles.investor1, value: web3.toWei(2, 'ether')}).should.be.rejectedWith(ERROR_MSG);

        await presale.setTime(close_at + 1);
        await presale.sendTransaction({from: roles.investor1, value: web3.toWei(2, 'ether')}).should.be.rejectedWith(ERROR_MSG);
    });

    it('payment', async function() {
        await token.setPrivateSale(presale.address);

        await presale.sendTransaction({from: roles.investor1, value: web3.toWei(2, 'ether')});
        assert.equal((await token.balanceOf(roles.investor1)).toNumber(), MNTL(MNTLperETH * 2));

        await presale.sendTransaction({from: roles.investor3, value: web3.toWei(1, 'ether')});
        assert.equal((await token.balanceOf(roles.investor3)).toNumber(), MNTL(MNTLperETH));
        assert.equal((await token.balanceOf(token.address)).toNumber(), MNTL(utils.initialSupply - MNTLperETH * 3));
    });

    it('payment with 5% bonuses', async function() {
        await token.setPrivateSale(presale.address);

        const sum = 16;
        await presale.sendTransaction({from: roles.investor1, value: web3.toWei(sum, 'ether')});
        assert.equal((await token.balanceOf(roles.investor1)).toNumber(), MNTL_from(sum, 0.05));
    });

    it('payment with 10% bonuses', async function() {
        await token.setPrivateSale(presale.address);

        const sum = 31;
        await presale.sendTransaction({from: roles.investor1, value: web3.toWei(sum, 'ether')});
        assert.equal((await token.balanceOf(roles.investor1)).toNumber(), MNTL_from(sum, 0.1));

    });

    it('payment with 15% bonuses', async function() {
        await token.setPrivateSale(presale.address);

        const sum = 61;
        await presale.sendTransaction({from: roles.investor1, value: web3.toWei(sum, 'ether')});
        assert.equal((await token.balanceOf(roles.investor1)).toNumber(), MNTL_from(sum, 0.15));

    });

    it('payment with 20% bonuses', async function() {
        await token.setPrivateSale(presale.address);

        const sum = 121;
        // на 1 акке - 100 ether
        await web3.eth.sendTransaction({to: roles.investor1, from: roles.investor2, value: web3.toWei("22", "ether")});
        await presale.sendTransaction({from: roles.investor1, value: web3.toWei(sum, 'ether')});
        assert.equal((await token.balanceOf(roles.investor1)).toNumber(), MNTL_from(sum, 0.2));
    });

    it('close ICO: failure', async function() {
        await token.setPrivateSale(presale.address);

        const sum = Number(web3.toWei(1, 'ether'));
        await presale.sendTransaction({from: roles.investor1, value: sum});

        const investor1_balance = (await web3.eth.getBalance(roles.investor1)).toNumber();
        const we_raised = (await presale.getWeRaised()).toNumber();
        assert.equal(we_raised, sum);

        await presale.setTime(close_at + 1);
        let tx_log = await presale.close();
        assert.web3Event(tx_log, {
            event: 'StateChanged',
            args: {
                "_state": 3, // FAILURE
            },
        }, 'The event is emitted');

        // refund
        tx_log = await presale.refund({from: roles.investor1});
        assert.web3Event(tx_log, {
            event: 'RefundSuccess',
            args: {
                "benefeciary": roles.investor1,
                "sum" : sum,
            },
        }, 'The event is emitted');

        const investor1_balance_after_refund = (await web3.eth.getBalance(roles.investor1)).toNumber();
        assert.equal(investor1_balance_after_refund > investor1_balance, true);
    });

    it('close ICO: we raised above softcap', async function() {
        await token.setPrivateSale(presale.address);
        await presale.setSoftCap(MNTL(30000));

        const sum = Number(web3.toWei(3, 'ether'));
        await presale.sendTransaction({from: roles.investor1, value: sum});
        assert.equal(await token.balanceOf(roles.investor1), MNTL(30000));

        await presale.setTime(close_at + 1); // close ICO
        const wallet_balance = (await web3.eth.getBalance(roles.wallet)).toNumber();
        const tx_log = await presale.close();
        assert.web3Event(tx_log, {
            event: 'StateChanged',
            args: {
                "_state": 7, // SOFTCAP_SUCCESS
            },
        }, 'The event is emitted');
        // withdraw to wallet
        assert.equal((await web3.eth.getBalance(roles.wallet)).toNumber(), wallet_balance + sum);
    });

    it('auto close ICO: we raised equal hardcap', async function() {
        await token.setPrivateSale(presale.address);
        await presale.setHardCap(MNTL(30000));
        const wallet_balance = (await web3.eth.getBalance(roles.wallet)).toNumber();

        const total_sum = Number(web3.toWei(3, 'ether'));
        const investor1_sum = Number(web3.toWei(2, 'ether'));
        await presale.sendTransaction({from: roles.investor1, value: investor1_sum});
        assert.equal(await token.balanceOf(roles.investor1), MNTL(20000));

        const investor2_wallet_balance_start = (await web3.eth.getBalance(roles.investor2)).toNumber();
        const investor2_sum = Number(web3.toWei(2, 'ether'));
        const tx_log = await presale.sendTransaction({from: roles.investor2, value: investor2_sum});
        assert.web3Event(tx_log, {
            event: 'StateChanged',
            args: {
                "_state": 6, // HARDCAP_SUCCESS
            },
        }, 'The event is emitted');
        assert.equal(await token.balanceOf(roles.investor2), MNTL(10000));
        const investor2_wallet_balance = (await web3.eth.getBalance(roles.investor2)).toNumber();
        // возвращен 1 эфир за вычетом комиссии
        assert.equal(investor2_wallet_balance > (investor2_wallet_balance_start - Number(web3.toWei(2, 'ether'))), true);

        // нет свободных токенов
        const investor3_sum = Number(web3.toWei(1, 'ether'));
        await presale.sendTransaction({from: roles.investor3, value: investor3_sum}).should.be.rejectedWith(ERROR_MSG);

        assert.equal(await presale.getWeSolved(), MNTL(30000));
        assert.equal(await presale.getWeRaised(), Number(web3.toWei(3, 'ether')));
        assert.equal((await web3.eth.getBalance(roles.wallet)).toNumber(), wallet_balance + total_sum);
    });

    it('set withdraw wallet', async () => {
        assert.equal(await presale.wallet(), roles.wallet);
        await presale.setWithdrawWallet(roles.nobody);
        assert.equal(await presale.wallet(), roles.nobody);
        await presale.setWithdrawWallet(roles.wallet, {from: roles.investor1}).should.be.rejectedWith(ERROR_MSG);
    });

    it('pausable', async () => {
        await token.setPrivateSale(presale.address);
        const investor1_sum = Number(web3.toWei(1, 'ether')); // 10000 tokens
        await presale.sendTransaction({from: roles.investor1, value: investor1_sum});

        let tx_log = await presale.pause();
        assert.web3Event(tx_log, {
            event: 'Pause',
        });
        tx_log = await token.pause();
        assert.web3Event(tx_log, {
            event: 'Pause',
        });

        // // pause
        const tokens = MNTL(1);

        await presale.sendTransaction({from: roles.investor1, value: investor1_sum}).should.be.rejectedWith(ERROR_MSG);
        await presale.refund({from: roles.investor1}).should.be.rejectedWith(ERROR_MSG);
        await token.transfer(roles.investor2, tokens, {from: roles.investor1}).should.be.rejectedWith(ERROR_MSG);
        await token.approve(roles.owner1, tokens, {from: roles.investor1});
        await token.transferFrom(roles.investor1, roles.investor2, tokens).should.be.rejectedWith(ERROR_MSG); // {from: roles.owner1}

        // unpause
        tx_log = await presale.unpause();
        assert.web3Event(tx_log, {
            event: 'Unpause',
        });
        tx_log = await token.unpause();
        assert.web3Event(tx_log, {
            event: 'Unpause',
        });

        await presale.sendTransaction({from: roles.investor1, value: investor1_sum});

        assert.equal(await presale.isActive(), true);
        // denied transfer operations while ICO is active
        await token.transfer(roles.investor2, tokens, {from: roles.investor1}).should.be.rejectedWith(ERROR_MSG);
        await token.transferFrom(roles.investor1, roles.investor2, tokens).should.be.rejectedWith(ERROR_MSG);

        // close ICO
        await presale.setTime(close_at + 1); // close ICO
        await presale.close();
        assert.equal(await presale.isActive(), false);
        // permit transfer operations after close ICO
        await token.transfer(roles.investor2, tokens, {from: roles.investor1});
        await token.transferFrom(roles.investor1, roles.investor2, tokens);
    });

    it('change close_at', async () => {
        await token.setPrivateSale(presale.address);
        await presale.setSoftCap(MNTL(10000));

        const investor1_sum = MNTL(1);
        const newCloseAt = start_at + 1;
        // under softcap
        await presale.changeCloseAt(newCloseAt).should.be.rejectedWith(ERROR_MSG);
        // over(and include) softcap
        await presale.sendTransaction({from: roles.investor1, value: investor1_sum});

        await presale.changeCloseAt(start_at).should.be.rejectedWith(ERROR_MSG);
        await presale.changeCloseAt(newCloseAt, {from: roles.investor1}).should.be.rejectedWith(ERROR_MSG);

        const tx_log = await presale.changeCloseAt(newCloseAt);
        assert.web3Event(tx_log, {
            event: 'ChangeCloseAt',
            args: {
                from: close_at,
                to: newCloseAt,
            },
        });
        assert.equal(await presale.closeAt(), newCloseAt);
    });
});

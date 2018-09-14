require('truffle-test-utils').init();
require('chai').use(require('chai-as-promised')).should();
const createKeccakHash = require('keccak');
const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Token = artifacts.require('./test_helpers/MNTL.sol');
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
        token = await Token.new();
        presale = await PreSale.new(token.address, roles.wallet);
        await reverter.snapshot();
    });

    it('owner presale', async function () {
        let crowdsale_owner = await presale.owner();
        assert.equal(crowdsale_owner, roles.owner1);
    });

    it('payment', async function() {
        await token.setController(presale.address);

        await presale.sendTransaction({from: roles.investor1, value: web3.toWei(2, 'ether')});
        assert.equal((await token.balanceOf(roles.investor1)).toNumber(), MNTL(MNTLperETH * 2));

        await presale.sendTransaction({from: roles.investor3, value: web3.toWei(1, 'ether')});
        assert.equal((await token.balanceOf(roles.investor3)).toNumber(), MNTL(MNTLperETH));

        assert.equal((await token.totalSupply()).toNumber(), MNTL(MNTLperETH * 3));
        assert.equal((await token.balanceOf(token.address)).toNumber(), MNTL(0));
    });

    it('payment with 5% bonuses', async function() {
        await token.setController(presale.address);

        const sum = 16;
        await presale.sendTransaction({from: roles.investor1, value: web3.toWei(sum, 'ether')});
        assert.equal((await token.balanceOf(roles.investor1)).toNumber(), MNTL_from(sum, 0.05));
    });

    it('payment with 10% bonuses', async function() {
        await token.setController(presale.address);

        const sum = 31;
        await presale.sendTransaction({from: roles.investor1, value: web3.toWei(sum, 'ether')});
        assert.equal((await token.balanceOf(roles.investor1)).toNumber(), MNTL_from(sum, 0.1));

    });

    it('payment with 15% bonuses', async function() {
        await token.setController(presale.address);

        const sum = 61;
        await presale.sendTransaction({from: roles.investor1, value: web3.toWei(sum, 'ether')});
        assert.equal((await token.balanceOf(roles.investor1)).toNumber(), MNTL_from(sum, 0.15));

    });

    it('payment with 20% bonuses', async function() {
        await token.setController(presale.address);

        const sum = 121;
        // на 1 акке - 100 ether
        await web3.eth.sendTransaction({to: roles.investor1, from: roles.investor2, value: web3.toWei("22", "ether")});
        await presale.sendTransaction({from: roles.investor1, value: web3.toWei(sum, 'ether')});
        assert.equal((await token.balanceOf(roles.investor1)).toNumber(), MNTL_from(sum, 0.2));
    });

    it('set withdraw wallet', async () => {
        assert.equal(await presale.wallet(), roles.wallet);
        await presale.setWithdrawWallet(roles.nobody);
        assert.equal(await presale.wallet(), roles.nobody);
        await presale.setWithdrawWallet(roles.wallet, {from: roles.investor1}).should.be.rejectedWith(ERROR_MSG);
    });

    it('pausable', async () => {
        await token.setController(presale.address);
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

        // denied transfer operations while ICO is active
        await token.transfer(roles.investor2, tokens, {from: roles.investor1}).should.be.rejectedWith(ERROR_MSG);
        await token.transferFrom(roles.investor1, roles.investor2, tokens).should.be.rejectedWith(ERROR_MSG);

        // close ICO
        const total_sum = investor1_sum * 2;
        await presale.withdraw(total_sum);
        // const sum = await web3.eth.getBalance(presale.address);
        // console.log(sum.toNumber());
        await presale.close();
        // permit transfer operations after close ICO
        await token.transfer(roles.investor2, tokens, {from: roles.investor1});
        await token.transferFrom(roles.investor1, roles.investor2, tokens);
    });

    it('close ICO (with withdraw)', async () => {
        await token.setController(presale.address);
        const investor1_sum = Number(web3.toWei(1, 'ether')); // 10000 tokens
        await presale.sendTransaction({from: roles.investor1, value: investor1_sum});

        await presale.close().should.be.rejectedWith(ERROR_MSG); // presale balance > 0

        const wallet_balance = (await web3.eth.getBalance(roles.wallet)).toNumber();
        await presale.withdraw(investor1_sum);
        assert.equal((await web3.eth.getBalance(roles.wallet)).toNumber() - wallet_balance, investor1_sum);
        assert.equal((await web3.eth.getBalance(presale.address)).toNumber(), 0);

        const tx_log = await presale.close();
        assert.web3Event(tx_log, {
            event: 'CrowdsaleStatus',
            args: {
                status: "close"
            },
        });
    });

    it('send bounty', async () => {
        await token.setController(presale.address);
        const tokens = MNTL(10); // 10000 tokens
        const tx_log = await presale.sendBounty(roles.investor1, tokens);
        assert.web3Event(tx_log, {
            event: 'SendBounty',
            args: {
                benefeciary: roles.investor1,
                tokens: tokens
            },
        });
        assert.equal((await token.balanceOf(roles.investor1)).toNumber(), tokens);
    });

    it('refund', async () => {
        await token.setController(presale.address);
        const investor1_sum = Number(web3.toWei(1, 'ether')); // 10000 tokens
        await presale.sendTransaction({from: roles.investor1, value: investor1_sum});
        const investor1_balance = (await web3.eth.getBalance(roles.investor1)).toNumber();

        const investor1_tokens = (await token.balanceOf(roles.investor1)).toNumber();
        assert.equal((await token.totalSupply()).toNumber(), investor1_tokens);

        await presale.refund(roles.investor2).should.be.rejectedWith(ERROR_MSG); // investor2 token balance == 0
        const tx_log = await presale.refund(roles.investor1);
        assert.web3Event(tx_log, {
            event: 'RefundSuccess',
            args: {
                benefeciary: roles.investor1,
                sum: investor1_sum
            },
        });
        assert.equal((await token.totalSupply()).toNumber(), 0);
        assert.equal((await web3.eth.getBalance(roles.investor1)).toNumber(), investor1_balance + investor1_sum);
    });
});

const BigNumber = web3.BigNumber;
require('truffle-test-utils').init();
require('chai').use(require('chai-as-promised')).should();
require('chai').use(require('chai-bignumber')(BigNumber));
const createKeccakHash = require('keccak');
const Asserts = require('./helpers/asserts');
const Token = artifacts.require('MNTL');
const Utils =  require('./helpers/utils.js');
const now = require("performance-now");


contract('MNTL', function(accounts) {
    const utils = new Utils();

    const owner = web3.eth.accounts[0];
    const showGasUsed = false;
    const ERROR_MSG = 'VM Exception while processing transaction: revert';
    const decimals = utils.decimals;
    const roles = utils.roles(accounts);
    let start_time;

    // converts amount of MNTL into MNTL-wei
    function MNTL(amount) {
        return new BigNumber(amount).mul(decimals);
    }

    before('set time', async () => {
        start_time = now();
    });

    after('perfomance', async () => {
        console.log(`Total running time: ${(now()-start_time).toFixed(2)}ms`);
    });

    beforeEach('setup', async () => {
        this.token = await Token.new();
    });

    it('owner token', async () => {
        let token_owner = await this.token.owner();
        assert.equal(token_owner, roles.owner1);
    });

    it('test controller', async () => {
        const tx_log = await this.token.setController(roles.controller);
        assert.web3Event(tx_log, {
            event: 'ControllerSet',
            args: {
                controller: roles.controller,
            }
        }, 'The event is emitted');
        assert.equal(await this.token.mController(), roles.controller);
    });

    it('token initial supply', async () => {
        const totalSupply = await this.token.totalSupply();
        totalSupply.should.be.bignumber.equal(0);
    });

    it('buy token', async () => {
        const _to = roles.investor1;

        const amount = MNTL(10);
        await this.token.buy(_to, amount).should.be.rejectedWith(ERROR_MSG); // permitted only a controller

        await this.token.setController(roles.controller);
        await this.token.mint(this.token.address, amount, {from: roles.controller});
        await this.token.buy(_to, amount, {from: roles.controller});
        assert.equal((await this.token.balanceOf(_to)).toNumber(), amount);
        assert.equal((await this.token.totalSupply()).toNumber(), amount);
    });

    it('mint token', async () => {
        const initialSupply = MNTL(10);
        await this.token.mint(this.token.address, initialSupply).should.be.rejectedWith(ERROR_MSG); // permit only controller
        await this.token.setController(roles.controller);

        const tx_log = await this.token.mint(this.token.address, initialSupply, {from: roles.controller});
        assert.web3Event(tx_log, {
            event: 'Mint',
            args: {
                to: this.token.address,
                amount: initialSupply.toNumber(),
            }
        }, 'The event is emitted');
        assert.web3Event(tx_log, {
            event: 'Transfer',
            args: {
                from: utils.null_address(),
                to: this.token.address,
                value: initialSupply.toNumber(),
            }
        }, 'The event is emitted');
        assert.equal((await this.token.balanceOf(this.token.address)).toNumber(), initialSupply.toNumber());
        assert.equal((await this.token.totalSupply()).toNumber(), initialSupply.toNumber());
    });

    it('refund token', async () => {
        await this.token.setController(roles.controller);

        const amount = MNTL(10);
        const invalid_amount = MNTL(11);
        await this.token.mint(this.token.address, amount, {from: roles.controller});
        await this.token.buy(roles.investor1, amount, {from: roles.controller});

        await this.token.refund(roles.investor1, invalid_amount, {from: roles.controller}).should.be.rejectedWith(ERROR_MSG); // запрещен возврат большего кол-ва токенов
        const tx_log = await this.token.refund(roles.investor1, amount, {from: roles.controller});
        assert.web3Event(tx_log, {
            event: 'Transfer',
            args: {
                from: roles.investor1,
                to: this.token.address,
                value: amount.toNumber(),
            }
        }, 'The event is emitted');
        assert.equal((await this.token.balanceOf(roles.investor1)).toNumber(), 0);
        assert.equal((await this.token.balanceOf(this.token.address)).toNumber(), 0);
    });

    it('transfer tokens', async () => {
        const tokens1 = MNTL(10);
        const tokens2 = MNTL(10);

        // buy tokens
        await this.token.setController(roles.controller);
        const amount = tokens1.add(tokens2);
        await this.token.mint(this.token.address, amount, {from: roles.controller});
        await this.token.buy(roles.investor1, amount, {from: roles.controller});
        await this.token.detachController({from: roles.controller});

        // transfer tokens
        await this.token.approve(roles.owner1, tokens2, {from: roles.investor1});
        await this.token.transfer(roles.investor2, tokens1, {from: roles.investor1});
        await this.token.transferFrom(roles.investor1, roles.investor2, tokens2);
    });

    it('setController', async () => {
        let controller = roles.controller;
        let tx_log = await this.token.setController(controller);
        assert.web3Event(tx_log, {
            event: 'ControllerSet',
            args: {
                "controller" : controller,
            },
        }, 'The event is emitted');
        assert.equal(await this.token.mController(), controller);
        await this.token.detachController({from: controller});
    });
});

const BigNumber = web3.BigNumber;
require('truffle-test-utils').init();
require('chai').use(require('chai-as-promised')).should();
require('chai').use(require('chai-bignumber')(BigNumber));
const createKeccakHash = require('keccak');
const Asserts = require('./helpers/asserts');
const Token = artifacts.require('MNTLTestHelper');
const Utils =  require('./helpers/utils.js');
const now = require("performance-now");


contract('MNTL', function(accounts) {
    const utils = new Utils();

    const owner = web3.eth.accounts[0];
    const showGasUsed = false;
    const ERROR_MSG = 'VM Exception while processing transaction: revert';
    const decimals = web3.toWei(1, 'ether');
    const initialSupply = MMT(utils.initialSupply);
    const aboveInitialSupply = initialSupply + MMT(1);
    const roles = utils.roles(accounts);
    let start_time;

    // converts amount of MMT into MMT-wei
    function MMT(amount) {
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
        const tx_log = await this.token.setPrivateSale(roles.controller);
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
        totalSupply.should.be.bignumber.equal(initialSupply);
    });

    it('buy token', async () => {
        const _to = roles.investor1;

        const amount = MMT(10);
        (await this.token.availableTokens()).should.be.bignumber.equal(initialSupply);
        await this.token.buy(_to, amount).should.be.rejectedWith(ERROR_MSG); // permitted only a controller

        await this.token.setPrivateSale(roles.controller);
        await this.token.buy(_to, amount, {from: roles.controller});
        assert.equal((await this.token.balanceOf(_to)).toNumber(), amount);
        assert.equal((await this.token.availableTokens()).toNumber(), initialSupply - amount);

        await this.token.buy(_to, initialSupply, {from: roles.controller}).should.be.rejectedWith(ERROR_MSG); // запрещена покупка кол-ва токенов больше баланса
    });

    it('burn token', async () => {
        await this.token.burn(this.token.address, initialSupply).should.be.rejectedWith(ERROR_MSG); // permit only controller
        await this.token.setPrivateSale(roles.controller);

        await this.token.burn(this.token.address, aboveInitialSupply).should.be.rejectedWith(ERROR_MSG); // запрещено сжигание токенов больше баланса

        const tx_log = await this.token.burn(this.token.address, initialSupply, {from: roles.controller}); // сжигаем все токены
        assert.web3Event(tx_log, {
            event: 'Burn',
            args: {
                burner: this.token.address,
                value: initialSupply.toNumber(),
            }
        }, 'The event is emitted');
        assert.web3Event(tx_log, {
            event: 'Transfer',
            args: {
                from: this.token.address,
                to: utils.null_address(),
                value: initialSupply.toNumber(),
            }
        }, 'The event is emitted');
        assert.equal((await this.token.balanceOf(this.token.address)).toNumber(), 0);
    });

    it('refund token', async () => {
        await this.token.setPrivateSale(roles.controller);

        const amount = MMT(10);
        const invalid_amount = MMT(11);
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
        assert.equal((await this.token.balanceOf(this.token.address)).toNumber(), initialSupply);
    });

    it('transfer tokens', async () => {
        const tokens1 = MMT(10);
        const tokens2 = MMT(10);

        // buy tokens
        await this.token.setPrivateSale(roles.controller);
        await this.token.buy(roles.investor1, tokens1.add(tokens2), {from: roles.controller});
        await this.token.detachController({from: roles.controller});

        // transfer tokens
        await this.token.approve(roles.owner1, tokens2, {from: roles.investor1});
        await this.token.transfer(roles.investor2, tokens1, {from: roles.investor1});
        await this.token.transferFrom(roles.investor1, roles.investor2, tokens2);
    });

    it('ICO stages', async () => {
        //// PRIVATE SALE ///

        let controller = roles.controller;
        let tx_log = await this.token.setPrivateSale(controller);
        assert.web3Event(tx_log, {
            event: 'ChangeState',
            args: {
                "from": 0, // None
                "to" : 1, // PrivateSale
            },
        }, 'The event is emitted');
        assert.web3Event(tx_log, {
            event: 'ControllerSet',
            args: {
                "controller" : controller,
            },
        }, 'The event is emitted');
        assert.equal(await this.token.state(), 1);
        assert.equal(await this.token.mController(), controller);
        await this.token.detachController({from: controller});


        //// SECOND PRIVATE SALE ///

        controller = roles.controller2;
        tx_log = await this.token.setSecondPrivateSale(controller);
        assert.web3Event(tx_log, {
            event: 'ChangeState',
            args: {
                "from": 1, // PrivateSale
                "to" : 2, // SecondPrivateSale
            },
        }, 'The event is emitted');
        assert.web3Event(tx_log, {
            event: 'ControllerSet',
            args: {
                "controller" : controller,
            },
        }, 'The event is emitted');
        assert.equal(await this.token.state(), 2);
        assert.equal(await this.token.mController(), controller);
        await this.token.detachController({from: controller});


        //// PRE ICO ///

        controller = roles.controller3;
        let controllers_count = (await this.token.mControllersCount()).toNumber();
        tx_log = await this.token.setPreIco(controller);

        assert.web3Event(tx_log, {
            event: 'ChangeState',
            args: {
                "from": 2, // SecondPrivateSale
                "to" : 3, // PreIco
            },
        }, 'The event is emitted');
        assert.web3Event(tx_log, {
            event: 'ControllerSet',
            args: {
                "controller" : controller,
            },
        }, 'The event is emitted');
        assert.equal(await this.token.state(), 3);
        assert.equal(await this.token.mController(), controller);
        await this.token.detachController({from: controller});


        //// ICO ///

        controller = roles.controller3;
        tx_log = await this.token.setIco(controller);
        assert.web3Event(tx_log, {
            event: 'ChangeState',
            args: {
                "from": 3, // PreIco
                "to" : 4, // Ico
            },
        }, 'The event is emitted');
        assert.web3Event(tx_log, {
            event: 'ControllerSet',
            args: {
                "controller" : controller,
            },
        }, 'The event is emitted');
        assert.equal(await this.token.state(), 4);
        assert.equal(await this.token.mController(), controller);
        await this.token.detachController({from: controller});
    });

    it('sequence ICO stages', async () => {
        let controller = roles.controller;
        let tx_log = await this.token.setSecondPrivateSale(controller);
        assert.web3Event(tx_log, {
            event: 'ChangeState',
            args: {
                "from": 0, // None
                "to" : 2, // SecondPrivateSale
            },
        }, 'The event is emitted');
        assert.web3Event(tx_log, {
            event: 'ControllerSet',
            args: {
                "controller" : controller,
            },
        }, 'The event is emitted');
        assert.equal(await this.token.state(), 2);
        assert.equal(await this.token.mController(), controller);
        await this.token.detachController({from: controller});

        controller = roles.controller2;
        await this.token.setPrivateSale(controller).should.be.rejectedWith(ERROR_MSG);

        controller = roles.controller3;
        tx_log = await this.token.setIco(controller);
        assert.web3Event(tx_log, {
            event: 'ChangeState',
            args: {
                "from": 2, // SecondPrivateSale
                "to" : 4, // Ico
            },
        }, 'The event is emitted');
        assert.web3Event(tx_log, {
            event: 'ControllerSet',
            args: {
                "controller" : controller,
            },
        }, 'The event is emitted');
        assert.equal(await this.token.state(), 4);
        assert.equal(await this.token.mController(), controller);
    });
});

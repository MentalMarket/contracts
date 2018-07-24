require('truffle-test-utils').init();
require('chai').use(require('chai-as-promised')).should();
const createKeccakHash = require('keccak');
const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Token = artifacts.require('MNTL');
const Utils =  require('./helpers/utils.js');


contract('MNTL', function(accounts) {
    const utils = new Utils();
    const reverter = new Reverter(web3);
    afterEach('revert', reverter.revert);

    let token;
    const owner = web3.eth.accounts[0];
    const showGasUsed = false;
    const ERROR_MSG = 'VM Exception while processing transaction: revert';
    const decimals = Math.pow(10, 18);
    const initialSupply = MMT(utils.initialSupply);
    const aboveInitialSupply = MMT(18000001);
    const roles = utils.roles(accounts);

    // converts amount of MMT into MMT-wei
    function MMT(amount) {
        // decimals is the same as in ether, so..
        return amount * decimals;
    }

    before('setup', () => {
        return Token.deployed()
            .then(instance => token = instance)
            .then(reverter.snapshot);
    });

    it('owner token', async function () {
        let token_owner = await token.owner();
        assert.equal(token_owner, roles.owner1);
    });

    it('test controller', async function () {
        const tx_log = await token.setPrivateSale(roles.controller);
        assert.web3Event(tx_log, {
            event: 'ControllerSet',
            args: {
                controller: roles.controller,
            }
        }, 'The event is emitted');
        assert.equal(await token.mController(), roles.controller);
    });

    it('token initial supply', async function() {
        assert.equal((await token.totalSupply()).toNumber(), initialSupply);
    });

    it('buy token', async function () {
        const _to = roles.investor1;

        const amount = MMT(10); //
        assert.equal(await token.availableTokens(), initialSupply);
        await token.buy(_to, amount).should.be.rejectedWith(ERROR_MSG); // permitted only a controller

        await token.setPrivateSale(roles.controller);
        await token.buy(_to, amount, {from: roles.controller});
        assert.equal((await token.balanceOf(_to)).toNumber(), amount);
        assert.equal((await token.availableTokens()).toNumber(), initialSupply - amount);

        await token.buy(_to, initialSupply, {from: roles.controller}).should.be.rejectedWith(ERROR_MSG); // запрещена покупка кол-ва токенов больше баланса
    });

    it('burn token', async function() {
        await token.burn(token.address, initialSupply).should.be.rejectedWith(ERROR_MSG); // permit only controller
        await token.setPrivateSale(roles.controller);

        await token.burn(token.address, aboveInitialSupply).should.be.rejectedWith(ERROR_MSG); // запрещено сжигание токенов больше баланса

        const tx_log = await token.burn(token.address, initialSupply, {from: roles.controller}); // сжигаем все токены
        assert.web3Event(tx_log, {
            event: 'Burn',
            args: {
                burner: token.address,
                value: initialSupply,
            }
        }, 'The event is emitted');
        assert.web3Event(tx_log, {
            event: 'Transfer',
            args: {
                from: token.address,
                to: utils.null_address(),
                value: initialSupply,
            }
        }, 'The event is emitted');
        assert.equal((await token.balanceOf(token.address)).toNumber(), 0);
    });

    it('refund token', async function() {
        await token.setPrivateSale(roles.controller);

        const amount = MMT(10);
        const invalid_amount = MMT(11);
        await token.buy(roles.investor1, amount, {from: roles.controller});

        await token.refund(roles.investor1, invalid_amount, {from: roles.controller}).should.be.rejectedWith(ERROR_MSG); // запрещен возврат большего кол-ва токенов
        const tx_log = await token.refund(roles.investor1, amount, {from: roles.controller});
        assert.web3Event(tx_log, {
            event: 'Transfer',
            args: {
                from: roles.investor1,
                to: token.address,
                value: amount,
            }
        }, 'The event is emitted');
        assert.equal((await token.balanceOf(roles.investor1)).toNumber(), 0);
        assert.equal((await token.balanceOf(token.address)).toNumber(), initialSupply);
    });

    it('transfer tokens', async () => {
        const tokens1 = MMT(10);
        const tokens2 = MMT(10);

        // buy tokens
        await token.setPrivateSale(roles.controller);
        await token.buy(roles.investor1, tokens1 + tokens2, {from: roles.controller});
        await token.detachController({from: roles.controller});

        // transfer tokens
        await token.approve(roles.owner1, tokens2, {from: roles.investor1});
        await token.transfer(roles.investor2, tokens1, {from: roles.investor1});
        await token.transferFrom(roles.investor1, roles.investor2, tokens2);
    });

    it('ICO stages', async function () {
        //// PRIVATE SALE ///

        let controller = roles.controller;
        let tx_log = await token.setPrivateSale(controller);
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
        assert.equal(await token.state(), 1);
        assert.equal(await token.mController(), controller);
        await token.detachController({from: controller});


        //// SECOND PRIVATE SALE ///

        controller = roles.controller2;
        tx_log = await token.setSecondPrivateSale(controller);
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
        assert.equal(await token.state(), 2);
        assert.equal(await token.mController(), controller);
        await token.detachController({from: controller});


        //// PRE ICO ///

        controller = roles.controller3;
        let controllers_count = (await token.mControllersCount()).toNumber();
        tx_log = await token.setPreIco(controller);

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
        assert.equal(await token.state(), 3);
        assert.equal(await token.mController(), controller);
        await token.detachController({from: controller});


        //// ICO ///

        controller = roles.controller3;
        tx_log = await token.setIco(controller);
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
        assert.equal(await token.state(), 4);
        assert.equal(await token.mController(), controller);
        await token.detachController({from: controller});
    });

    it('sequence ICO stages', async function () {
        let controller = roles.controller;
        let tx_log = await token.setSecondPrivateSale(controller);
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
        assert.equal(await token.state(), 2);
        assert.equal(await token.mController(), controller);
        await token.detachController({from: controller});

        controller = roles.controller2;
        await token.setPrivateSale(controller).should.be.rejectedWith(ERROR_MSG);

        controller = roles.controller3;
        tx_log = await token.setIco(controller);
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
        assert.equal(await token.state(), 4);
        assert.equal(await token.mController(), controller);
    });
});

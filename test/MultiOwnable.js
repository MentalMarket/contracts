require('truffle-test-utils').init();
require('chai').use(require('chai-as-promised')).should();
const createKeccakHash = require('keccak');
const Reverter = require('./helpers/reverter');
const Asserts = require('./helpers/asserts');
const Utils =  require('./helpers/utils.js');
const MultiOwnable = artifacts.require("./test_helpers/MultiownableTestHelper.sol");


contract('MultiOwnable', function(accounts) {
    const utils = new Utils();
    const reverter = new Reverter(web3);
    afterEach('revert', reverter.revert);

    let multiOwnable;
    const showGasUsed = false;
    const ERROR_MSG = 'VM Exception while processing transaction: revert';
    const roles = utils.roles(accounts);


    before('setup', async () => {
        multiOwnable = await MultiOwnable.new();
        await reverter.snapshot();
    });

    it('owner', async function () {
        let owner = await multiOwnable.owner();
        assert.equal(owner, roles.owner1);

        await multiOwnable.isOwner({from: roles.owner2}).should.be.rejectedWith(ERROR_MSG);
        await multiOwnable.addOwner(roles.owner2);
        await multiOwnable.isOwner({from: roles.owner2});
    });
});

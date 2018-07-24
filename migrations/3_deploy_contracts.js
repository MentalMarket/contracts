const Crowdsale = artifacts.require("PreSale");
const Token = artifacts.require("MNTL");

module.exports = function(deployer) {
    const date = new Date();
    const start_at = (new Date(date.getFullYear(), date.getMonth(), 1)).getTime() / 1000;
    const close_at = (new Date(date.getFullYear(), date.getMonth() + 1, 0)).getTime() / 1000;
    const softcap = 1250000;
    const hardcap = 3250000;
    deployer.deploy(Crowdsale, Token.address, start_at, close_at, softcap, hardcap, web3.eth.accounts[0]);
};
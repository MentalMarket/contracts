const Crowdsale = artifacts.require("PreSale");
const Token = artifacts.require("MNTL");


module.exports = async function(deployer) {
    const date = new Date();
    const start_at = (new Date(date.getFullYear(), date.getMonth(), 1)).getTime() / 1000;
    const close_at = (new Date(date.getFullYear(), date.getMonth() + 1, 0)).getTime() / 1000;
    const softcap = 1250000 * web3.toWei(1, 'ether');
    const hardcap = 3250000 * web3.toWei(1, 'ether');
    const token = await Token.deployed();
    deployer.deploy(Crowdsale, token.address, start_at, close_at, softcap, hardcap, web3.eth.accounts[0]);
};
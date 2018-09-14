const Crowdsale = artifacts.require("PreSale");
const Token = artifacts.require("MNTL");


module.exports = async function(deployer) {
    const token = await Token.deployed();
    deployer.deploy(Crowdsale, token.address, web3.eth.accounts[0]);
};
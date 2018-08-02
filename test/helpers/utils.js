function Util() {
    this.roles = (accounts) => {
        return {
            owner1: accounts[0],
            owner2: accounts[1],
            owner3: accounts[2],
            investor1: accounts[3],
            investor2: accounts[4],
            investor3: accounts[5],
            deployer: accounts[6],
            nobody: accounts[7],
            controller: accounts[8],
            controller2: accounts[1], // учитывать в тестах совпадение с owner2
            controller3: accounts[2], // учитывать в тестах совпадение с owner3
            controller4: accounts[6], // учитывать в тестах совпадение с deployer
            wallet: accounts[9],
        };
    };

    this.null_address = () => "0x0000000000000000000000000000000000000000";

    this.initialSupply = 18000000;
    this.decimals = web3.toWei(1, 'ether');
}

module.exports = Util;

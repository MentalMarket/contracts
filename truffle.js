module.exports = {
    networks: {
        development: {
            host: "0.0.0.0",
            port: 8545,
            network_id: "*",
            gas: 6000000,
            from: "0x887e3b76FcbeD197D02A688054cfbA3AAeB77C16",
        },
        rinkeby: {
            host: "0.0.0.0", // Connect to geth on the specified
            port: 8645,
            from: "0x573c67239231d8b3bdda5ee068b15a93499b01ae", // default address to use for any transaction Truffle makes during migrations
            network_id: 4,
            gas: 6000000, // Gas limit used for deploys
            gasPrice: 3000000000
        }
    }
};
function Reverter(web3) {
  let snapshotId;

  this.revert = () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_revert',
        id: new Date().getTime(),
        params: [snapshotId]
      }, (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(this.snapshot());
      });
    });
  };

  this.snapshot = () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_snapshot',
        id: new Date().getTime()
      }, (err, result) => {
        if (err) {
          return reject(err);
        }
        snapshotId = web3.toDecimal(result.result);
        return resolve();
      });
    });
  };

  this.timeTravel = (time) => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync({
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [time], // 86400 is num seconds in day
            id: new Date().getTime()
        }, (err, result) => {
            if (err) {
                return reject(err);
            }
            return resolve(result)
        });
      });
    };

  this.mineBlock = () => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync({
            jsonrpc: "2.0",
            method: "evm_mine",
            id: new Date().getTime()
        }, (err, result) => {
            if (err) {
                return reject(err);
            }
            return resolve(result)
        });
      });
    };

}

module.exports = Reverter;

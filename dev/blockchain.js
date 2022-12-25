const sha256 = require('sha256'); //importing sha256 hashing
const currentNodeUrl = process.argv[3];
// const uuid = require('uuidv4');


// defining blockcahin structure
function Blockchain() {
    this.chain = [];
    this.pendingTransactions = [];
    this.createNewBlock(100, '0', '0');
    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];
    this.candidate = [];
}


Blockchain.prototype.createNewBlock = function (nonce, previousBlockHash, hash) {
    const newBlock = {
        index: this.chain.length + 1,
        timestamp: Date.now(),
        transactions: this.pendingTransactions,
        nonce: nonce,
        hash: hash,
        previousBlockHash: previousBlockHash
    };
    this.pendingTransactions = [];
    this.chain.push(newBlock);
    return newBlock;
}


Blockchain.prototype.getLastBlock = function () {
    return this.chain[this.chain.length - 1];
}


// Blockchain.prototype.createNewTransaction = function (amount, sender, recipient) {
//     const newTransaction = {
//         amount: amount,
//         sender: sender,
//         recipient: recipient
//     };
//     this.pendingTransactions.push(newTransaction);
//     return this.getLastBlock()['index'] + 1;
// }

//refactoring createTransaction
Blockchain.prototype.createNewTransaction = function (amount, sender, recipient) {
    const newTransaction = {
        amount: amount,
        sender: sender,
        recipient: recipient
        // transactionsId: uuid().split('_').join('')

    };
    return newTransaction;
}

Blockchain.prototype.addTransactionToPendingTransactions = function (transactionObj) {
    this.pendingTransactions.push(transactionObj);
    return this.getLastBlock()['index'] + 1;
}




Blockchain.prototype.hashBlock = function (previousBlockHash, currentBlockData, nonce) {
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
    const hash = sha256(dataAsString);
    return hash;
}


Blockchain.prototype.proofOfWork = function (previousBlockHash, currentBlockData) {
    let nonce = 0;
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    while (hash.substring(0, 4) !== '0000') {
        nonce++;
        hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    }
    return nonce;
}

Blockchain.prototype.chainIsValid = function (blockchain) {
    let validChain = true; //flag
    for (var i = 1; i < blockchain.length; i++) {
        const currentBlock = blockchain[i];
        const prevBlock = blockchain[i - 1];

        // const previousBlockHash = prevBlock['hash'];
        // console.log(`Previous Block Hash = ${previousBlockHash}`);

        // const currentBlockData = {
        //     index : currentBlock['index'],
        //     transactions : currentBlock['transactions']
        // };
        // console.log(`index = ${currentBlockData[0]}`)
        // console.log(`transaction = ${currentBlockData[1]}`)
        

        // const nonce = currentBlock['nonce'];
        // console.log(`nonce = ${nonce}`);

        //error on rehashing
        const blockHash = this.hashBlock(prevBlock['hash'], { transactions: currentBlock['transactions'], index: currentBlock['index'] }, currentBlock['nonce']);
        // if (blockHash.substring(0, 4) !== '0000') validChain = false;

        // console.log(`Block Hash ${blockHash}`);
        // console.log(` substring validChain = ${validChain}`);
        if (currentBlock['previousBlockHash'] !== prevBlock['hash']) validChain = false;
        // console.log(` current == prev hash validChain = ${validChain}`);
    };

    const genesisBlock = blockchain[0];
    const correctNonce = genesisBlock['nonce'] === 100;
    const correctPreviousHash = genesisBlock['previousBlockHash'] === '0';
    const correctHash = genesisBlock['hash'] === '0';
    const correctTransactions = genesisBlock['transactions'] === 0;
    if (!correctNonce || !correctPreviousHash || !correctHash || correctTransactions) validChain = false;
    console.log(` last condition validChain = ${validChain}`);

    return validChain;
}

module.exports = Blockchain;
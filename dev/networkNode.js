var express = require('express');
var app = express();
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const coin = new Blockchain();

const rp = require('request-promise');
const { response } = require('express');

const port = process.argv[2];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//creating blockchain endpoint
app.get('/blockchain', function (req, res) {
    res.send(coin);
});

//creating transaction endpoint
// app.post('/transaction', function (req, res) {
//     const blockIndex = coin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
//     res.json({ note: `Transaction will be added in the block ${blockIndex}` });
// });

// refactoring transaction endpoint
app.post('/transaction', function (req, res) {
    const newTransaction = req.body;
    const blockIndex = coin.addTransactionToPendingTransactions(newTransaction);
    res.json({ note: `Transaction will be added in block ${blockIndex}` });
});

app.post('/transaction/broadcast', function (req, res) {
    const newTransaction = coin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    coin.addTransactionToPendingTransactions(newTransaction);
    const requestPromises = [];
    coin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/transaction',
            method: 'POST',
            body: newTransaction,
            json: true
        };
        requestPromises.push(rp(requestOptions));
    });
    Promise.all(requestPromises)
        .then(data => {
            res.json({ note: "Transaction created and broadcasted successfully!" });
        });
});

// creating mining endpoint
// app.get('/mine', function (req, res) {
//     const lastBlock = coin.getLastBlock();
//     const previousBlockHash = lastBlock['hash'];
//     const currentBlockData = {
//         index: lastBlock['index'] + 1,
//         transactions: coin.pendingTransactions
//     };
//     const nonce = coin.proofOfWork(previousBlockHash, currentBlockData);
//     const blockHash = coin.hashBlock(previousBlockHash, currentBlockData, nonce);
//     const newBlock = coin.createNewBlock(nonce, previousBlockHash, blockHash);
//     res.json({
//         note: "New block has been created!",
//         block: newBlock
//     });
// });

//updating mine information
app.get('/mine', function (req, res) {
    const lastBlock = coin.getLastBlock();
    const previousBlockHash = lastBlock['hash'];

    const currentBlockData = {
        index: lastBlock['index'] + 1,
        transactions: coin.pendingTransactions
    };

    const nonce = coin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = coin.hashBlock(previousBlockHash, currentBlockData, nonce);
    coin.candidate.push(coin.pendingTransactions);
    const newBlock = coin.createNewBlock(nonce, previousBlockHash, blockHash);


    const requestPromises = [];
    coin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/receive-new-block',
            method: 'POST',
            body: { newBlock: newBlock },
            json: true
        };
        requestPromises.push(rp(requestOptions));
    });
    Promise.all(requestPromises)
        .then(data => {
            res.json({
                note: "New Block Mined  and broadcast Successfully!",
                block: newBlock
            });
        });
});

app.post('/receive-new-block', function (req, res) {
    const newBlock = req.body.newBlock;
    const lastBlock = coin.getLastBlock();
    // console.log(`last block index =  ${lastBlock}`);
    const correctHash = lastBlock.hash === newBlock.previousBlockHash;
    const correctIndex = lastBlock['index'] + 1 === newBlock['index'];

    if (correctHash && correctIndex) {
        coin.chain.push(newBlock);
        coin.candidate.push(coin.pendingTransactions);
        coin.pendingTransactions = [];
        res.json({
            note: 'New Block received and accepted',
            newBlock: newBlock
        });
    } else {
        console.log("block rejected")
        res.json({ note: 'New Block Rejected' });
    }
});
// connecting nodes to each other
// New Edndpoints Outline
// register a node and broadcast to a network

app.post('/register-broadcast', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    if (coin.networkNodes.indexOf(newNodeUrl) == -1) coin.networkNodes.push(newNodeUrl);

    const regNodesPromises = [];
    coin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: { newNodeUrl: newNodeUrl },
            json: true
        };
        regNodesPromises.push(rp(requestOptions));
    });
    Promise.all(regNodesPromises)
        .then(data => {
            const bulkRegisterOptions = {
                uri: newNodeUrl + '/register-nodes-bulk',
                method: 'POST',
                body: { allNetworkNodes: [...coin.networkNodes, coin.currentNodeUrl] },
                json: true
            };
            return rp(bulkRegisterOptions);
        })
        .then(data => {
            res.json({ note: 'new node registered in network successfully !' });
        });
});

// register a node with a netwrok
app.post('/register-node', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = coin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = coin.currentNodeUrl !== newNodeUrl;
    if (nodeNotAlreadyPresent && notCurrentNode) coin.networkNodes.push(newNodeUrl);
    res.json({ note: "new node registered successfully" });
});

// register multiple nodes at once
app.post('/register-nodes-bulk', function (req, res) {
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = coin.networkNodes.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = coin.currentNodeUrl !== networkNodeUrl;
        if (nodeNotAlreadyPresent && notCurrentNode) coin.networkNodes.push(networkNodeUrl);
    });
    res.json({ note: 'Bulk registration of nodes successful!' });
});

app.get('/consensus', function (req, res) {
    const requestPromises = [];
    coin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/blockchain',
            method: 'GET',
            json: true
        }
        requestPromises.push(rp(requestOptions));
    });
    Promise.all(requestPromises)
        .then(blockchains => {
            const currentChainLength = coin.chain.length;
            let maxChainLength = currentChainLength;
            let newLongestChain = null;
            let newPendingTransactions = null;
            let newCandidate = coin.candidate;
            blockchains.forEach(blockchain => {
                if (blockchain.chain.length > maxChainLength) {
                    maxChainLength = blockchain.chain.length;
                    newLongestChain = blockchain.chain;
                    newPendingTransactions = blockchain.pendingTransactions;
                    // console.log( coin.chainIsValid(newLongestChain));
                    // newLongestChain.forEach(longeshchain =>{
                    //     console.log(longeshchain);
                    // })
                    // console.log( newLongestChain && coin.chainIsValid(newLongestChain));
                };
            });


            if (!newLongestChain || (newLongestChain && !coin.chainIsValid(newLongestChain))) {
                res.json({
                    note: 'current chain has not been replaced ',
                    chain: coin.chain
                })
            }
            else if (newLongestChain && coin.chainIsValid(newLongestChain)) {
                coin.chain = newLongestChain;
                coin.newPendingTransactions = newPendingTransactions;
                coin.candidate = newCandidate;
                res.json({
                    note: 'this chain hass been replaced',
                    chain: coin.chain
                })
            }

        });
});


app.listen(port, function () {
    console.log(`Listening at port ${port} ....`)
})
var express = require('express');
var app = express();

const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const coin = new Blockchain();

const rp = require('request-promise');

const port = process.argv[2];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


app.get('/blockchain', function (req, res) {
    res.send(coin);
});

app.post('/transaction', function (req, res) {
    const blockIndex = coin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    res.json({ note: `Transaction will be added in the block ${blockIndex}` });

});

app.get('/mine', function (req, res) {
    const lastBlock = coin.getLastBlock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        index: lastBlock['index'] + 1,
        transactions: coin.pendingTransactions
    };
    const nonce = coin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = coin.hashBlock(previousBlockHash, currentBlockData, nonce);
    const newBlock = coin.createNewBlock(nonce, previousBlockHash, blockHash);
    res.json({
        note: "New block has been created!",
        block: newBlock
    });
});



//register node and boradcast that node to the entire network
app.post('/register-broadcast', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    if (coin.networkNodes.indexOf(newNodeUrl) == -1) coin.networkNodes.push(newNodeUrl);

    const regNodesPromises = [];
    coin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: {
                newNodeUrl: newNodeUrl
            },
            json: true
        };
        regNodesPromises.push(rp(requestOptions));
    });
    Promise.all(regNodesPromises)
        .then(data => {
            const bulkRegisterOption = {
                uri: newNodeUrl + '/register-nodes-bulk',
                method: 'POST',
                body: {
                    allNetworkNodes: [...coin.networkNodes, coin.currentNodeUrl]
                },
                json: true
            };
            return rp(bulkRegisterOption);
        })
        .then(data => {
            res.json({ note: "new node registered with network" });
        })
});

// register a node with the network
app.post('/register-node', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = coin.networkNodes.indexOf(newNodeUrl) == -1;
    const noteCurrentNode = coin.currentNodeUrl !== newNodeUrl;
    if (nodeNotAlreadyPresent && noteCurrentNode) coin.networkNodes.push(newNodeUrl);
    res.json({ note: 'new node registered' });
});

//register multiple nodes at once to newNode
app.post('/register-nodes-bulk', function (req, res) {
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = coin.networkNodes.indexOf(networkNodeUrl) == -1;
        const noteCurrentNode = coin.currentNodeUrl !== networkNodeUrl;
        if (nodeNotAlreadyPresent && noteCurrentNode) coin.networkNodes.push(networkNodeUrl);
    });

});


app.listen(port, function () {
    console.log(`Listening at port ${port} ....`)
})
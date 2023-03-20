const hre = require("hardhat");
const marketABI = require("../../artifacts/contracts/Market.sol/Market.json").abi;

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}
let account1, account2, account3, market;

async function main() {
    const marketAddress = "0x4070a3118676D1Ca1682C84abce8cCF0a56801E8";
    market = new hre.ethers.Contract(marketAddress, marketABI, account1);
    [account1, account2,account3] = await hre.ethers.getSigners();
    // account3 = new hre.ethers.Wallet("a1cc4b4e654bbce4508fecdf5347c91ddc8452380144a18541b8b7c97c110382")

    const zeroAddress = "0x0000000000000000000000000000000000000000"
    const nftAddress = "0x93b38db5c4652a23770f2979b0be03035b8317e2";
    const tokenID = 2433;
    let price = hre.ethers.utils.parseEther("1");
    const order = {
        "offerer": account3.address,
        "offer": [
            {
                "itemType": 2,
                "token": nftAddress,
                "identifierOrCriteria": tokenID,
                "startAmount": 1,
                "endAmount": 1
            }
        ],
        "consideration": [
            {
                "itemType": 0,
                "token": zeroAddress,
                "identifierOrCriteria": 0,
                "startAmount": price.toString(),
                "endAmount": price.toString(),
                "recipient": account3.address
            }
        ],
        "startTime": 0,
        "endTime": 1678264663,
        "salt": 0,
        "signature": ''
    }
    const sign = await generateSignOnGoerli(account3, order, 0);
    order.signature = sign;
    const receipt = await market.connect(account3).fulfillOrder(order, { value: price });
    console.log("tx hash: ", receipt.hash);

    /* 
0000000000000000000000005c071f909fade2f3c02f0b272fbf4392771400d824ec135bd4afe500149ab8585bdc37744821470a49b47a11848bde92cdca0ace0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000004155c24f45593d0d55154a6248122cc6abbe319d2e91f9b5ce7c8dd42c4102f8a812a73997ac51641a17363ef08563636c08f7a7383a7b7460902c6941a399901c1b00000000000000000000000000000000000000000000000000000000000000
    

    // send txes
    const nftAddress = "0x2B9e53d2194d810417BD0aC49E0085f6FD681A09";
    const tokenIDs1 = [0, 1, 2, 3, 4];
    const tokenIDs2 = [5, 6, 7, 8, 9];

    const account1BuyAccount2 = false;
    if (account1BuyAccount2) {
        const offerer = account2.address;
        for (let i = 0; i < tokenIDs1.length; i++) {
            const tokenID = tokenIDs1[i];
            const price = hre.ethers.constants.WeiPerEther.div(
                ethers.BigNumber.from(10 * (i + 1))
            )
            let salt = ethers.BigNumber.from(getRandomInt(100000000000)).toString();
            console.log("salt: ", salt);
            const order = {
                "offerer": offerer,
                "offer": [{ "itemType": 2, "token": nftAddress, "identifierOrCriteria": tokenID, "startAmount": 1, "endAmount": 1 }],
                "consideration": [
                    {
                        "itemType": 0,
                        "token": hre.ethers.constants.AddressZero,
                        "identifierOrCriteria": 0,
                        "startAmount": price,
                        "endAmount": price,
                        "recipient": offerer
                    }
                ],
                "startTime": 0,
                "endTime": 100000000000,
                "salt": salt,
                "signature": '0x00'
            }
            const receipt = await market.connect(account1).fulfillOrder(order, { value: price });
            console.log("tx hash: ", receipt.hash);
        }
    } else {
        const offerer = account1.address;
        for (let i = 0; i < tokenIDs1.length; i++) {
            const tokenID = tokenIDs1[i];
            const price = hre.ethers.constants.WeiPerEther.div(
                ethers.BigNumber.from(10 * (i + 1))
            )
            let salt = ethers.BigNumber.from(getRandomInt(100000000000)).toString();
            console.log("salt: ", salt, "price: ",price.toString());
            const order = {
                "offerer": offerer,
                "offer": [{ "itemType": 2, "token": nftAddress, "identifierOrCriteria": tokenID, "startAmount": 1, "endAmount": 1 }],
                "consideration": [
                    {
                        "itemType": 0,
                        "token": hre.ethers.constants.AddressZero,
                        "identifierOrCriteria": 0,
                        "startAmount": price,
                        "endAmount": price,
                        "recipient": offerer
                    }
                ],
                "startTime": 0,
                "endTime": 100000000000,
                "salt": salt,
                "signature": '0x00'
            }
0x5C071F909fAdE2F3c02F0b272fBF4392771400D8,0x24ec135bd4afe500149ab8585bdc37744821470a49b47a11848bde92cdca0ace,0x55c24f45593d0d55154a6248122cc6abbe319d2e91f9b5ce7c8dd42c4102f8a812a73997ac51641a17363ef08563636c08f7a7383a7b7460902c6941a399901c1b
            const sign = generateSignOnGoerli(account1, order, 0);
            order.signature = sign;

            const receipt = await market.connect(account2).fulfillOrder(order, { value: price });
            console.log("tx hash: ", receipt.hash);
        }
    } */

}

async function generateSignOnGoerli(signer, order, counter) {
    // console.log(" = ", hre.ethers.providers.getNetwork(5));
    const domain = {
        name: 'hotluuu.io market',
        version: 'v1.0.0',
        chainId: hre.ethers.providers.getNetwork(5).chainId,
        verifyingContract: market.address
    }
    const types = {
        OfferItem: [
            { name: 'itemType', type: 'uint8' },
            { name: 'token', type: 'address' },
            { name: 'identifierOrCriteria', type: 'uint256' },
            { name: 'startAmount', type: 'uint256' },
            { name: 'endAmount', type: 'uint256' }
        ],
        ConsiderationItem: [
            { name: 'itemType', type: 'uint8' },
            { name: 'token', type: 'address' },
            { name: 'identifierOrCriteria', type: 'uint256' },
            { name: 'startAmount', type: 'uint256' },
            { name: 'endAmount', type: 'uint256' },
            { name: 'recipient', type: 'address' }
        ],
        OrderComponents: [
            { name: 'offerer', type: 'address' },
            { name: 'offer', type: 'OfferItem[]' },
            { name: 'consideration', type: 'ConsiderationItem[]' },
            { name: 'startTime', type: 'uint256' },
            { name: 'endTime', type: 'uint256' },
            { name: 'salt', type: 'uint256' },
            { name: 'counter', type: 'uint256' }
        ]
    };
    const value = {
        offerer: order.offerer,
        offer: [{
            itemType: order.offer[0].itemType,
            token: order.offer[0].token,
            identifierOrCriteria: order.offer[0].identifierOrCriteria,
            startAmount: order.offer[0].startAmount,
            endAmount: order.offer[0].endAmount
        }],
        consideration: [{
            itemType: order.consideration[0].itemType,
            token: order.consideration[0].token,
            identifierOrCriteria: order.consideration[0].identifierOrCriteria,
            startAmount: order.consideration[0].startAmount,
            endAmount: order.consideration[0].endAmount,
            recipient: order.consideration[0].recipient
        }],
        startTime: order.startTime,
        endTime: order.endTime,
        salt: order.salt,
        counter: counter
    }

    return await signer._signTypedData(domain, types, value);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
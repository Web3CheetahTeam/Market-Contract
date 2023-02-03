const hre = require("hardhat");
const marketABI = require("../../artifacts/contracts/Market.sol/Market.json").abi;

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

async function main() {
    let account1, account2;
    [account1, account2] = await hre.ethers.getSigners();

    const marketAddress = "0x84850745011C05116Dc7d7d8b5d588ad6575152c";
    const market = new hre.ethers.Contract(marketAddress, marketABI, account1);

    // send txes
    const nftAddress = "0x2B9e53d2194d810417BD0aC49E0085f6FD681A09";
    const tokenIDs1 = [0, 1, 2, 3, 4];
    const tokenIDs2 = [5, 6, 7, 8, 9];

    const account1BuyAccount2 = true;
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
            const receipt = await market.connect(account2).fulfillOrder(order, { value: price });
            console.log("tx hash: ", receipt.hash);
        }
    }

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
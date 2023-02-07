const hre = require('hardhat');
const { assert } = require('./common');
const { currentTime, toUnit, fastForward } = require('../utils')();
const deployer = require('../../utils/deploy');
const { MerkleTree } = require('merkletreejs');

describe("Market", async function () {
    let market, testNFT1, testNFT2, USDT;

    let owner, user1, user2, user3, marketVault, projectVault, ipVault;

    /* --------- constructor args --------- */
    // 2 days
    const DAY = 86400;
    const name = "Archloot";
    const symbol = "Archloot";
    const zeroAddress = "0x0000000000000000000000000000000000000000"

    beforeEach(async function () {
        [owner, user1, user2, user3, marketVault, projectVault, ipVault] = await hre.ethers.getSigners();

        // deploy
        testNFT1 = await deployer.deployTestNFT(name, symbol);
        testNFT2 = await deployer.deployTestNFT(name, symbol);
        USDT = await deployer.deployTestERC20(name, symbol);
        market = await deployer.deployMarket();
    });

    it('constructor should be success: ', async () => {

    });

    describe("Trade test", async function () {
        beforeEach(async function () {
            /* 
                铸造NFT
            */
            testNFT1.connect(user1).mint(0, 19, user1.address);
            testNFT2.connect(user1).mint(0, 19, user2.address);
            testNFT1.connect(user1).setApprovalForAll(market.address, true);
            testNFT1.connect(user2).setApprovalForAll(market.address, true);

            /* 
                铸造USDT
            */
            USDT.connect(user1).mint(10000, user1.address);

            /* 
                配置交易费
            */
            // 1%,2%,3%
            const fee1 = [100, 200, 300];
            await market.connect(owner).setFees(testNFT1.address, fee1);

            // 2%,3%,4%
            const fee2 = [200, 300, 400];
            await market.connect(owner).setFees(testNFT2.address, fee2);
        });

        it('fixed price by ETH test: ', async () => {
            await market.setCollection(testNFT1.address, true);
            const fees = [100, 100, 200];
            await market.setFees(testNFT1.address, fees);
            await market.setVaults(marketVault.address, projectVault.address, ipVault.address);

            //  Vaults balance
            let marketVaultBalance = await marketVault.getBalance();
            let projectVaultBalance = await projectVault.getBalance();
            let ipVaultBalance = await ipVault.getBalance();

            // user3 buy user1's testNFT1
            const tokenID = 1;
            let price = hre.ethers.utils.parseEther("1");
            const order = {
                "offerer": user1.address,
                "offer": [{ "itemType": 2, "token": testNFT1.address, "identifierOrCriteria": tokenID, "startAmount": 1, "endAmount": 1 }],
                "consideration": [
                    {
                        "itemType": 0,
                        "token": zeroAddress,
                        "identifierOrCriteria": 0,
                        "startAmount": price.toString(),
                        "endAmount": price.toString(),
                        "recipient": user1.address
                    }
                ],
                "startTime": 0,
                "endTime": 100000000000,
                "salt": 1,
                "signature": ''
            }
            const sign = await generateSign(user1, order, 0);
            order.signature = sign;
            await market.connect(user3).fulfillOrder(order, { value: price.toString() });

            assert.equal(await testNFT1.ownerOf(tokenID), user3.address);

            // vaults' balance should be increace
            assert.equal((await marketVault.getBalance()).toString(), marketVaultBalance.add(
                price.mul(hre.ethers.BigNumber.from([fees[0]])).div(hre.ethers.BigNumber.from(10000))).toString());
            assert.equal((await projectVault.getBalance()).toString(), projectVaultBalance.add(
                price.mul(hre.ethers.BigNumber.from([fees[1]])).div(hre.ethers.BigNumber.from(10000))).toString());
            assert.equal((await ipVault.getBalance()).toString(), ipVaultBalance.add(
                price.mul(hre.ethers.BigNumber.from([fees[2]])).div(hre.ethers.BigNumber.from(10000))).toString());
        })

        async function generateSign(signer, order, counter) {
            const domain = {
                name: 'hotluuu.io market',
                version: 'v1.0.0',
                chainId: hre.network.config.chainId,
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
        async function generateSignNotArray(signer, order, counter) {
            const domain = {
                name: 'hotluuu.io market',
                version: 'v1.0.0',
                chainId: hre.network.config.chainId,
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
                    { name: 'offer', type: 'OfferItem' },
                    { name: 'consideration', type: 'ConsiderationItem' },
                    { name: 'startTime', type: 'uint256' },
                    { name: 'endTime', type: 'uint256' },
                    { name: 'salt', type: 'uint256' },
                    { name: 'counter', type: 'uint256' }
                ]
            };
            const value = {
                offerer: order.offerer,
                offer: {
                    itemType: order.offer[0].itemType,
                    token: order.offer[0].token,
                    identifierOrCriteria: order.offer[0].identifierOrCriteria,
                    startAmount: order.offer[0].startAmount,
                    endAmount: order.offer[0].endAmount
                },
                consideration: {
                    itemType: order.consideration[0].itemType,
                    token: order.consideration[0].token,
                    identifierOrCriteria: order.consideration[0].identifierOrCriteria,
                    startAmount: order.consideration[0].startAmount,
                    endAmount: order.consideration[0].endAmount,
                    recipient: order.consideration[0].recipient
                },
                startTime: order.startTime,
                endTime: order.endTime,
                salt: order.salt,
                counter: counter
            }

            return await signer._signTypedData(domain, types, value);
        }
        async function generateSignOfferTest(signer, order, counter) {
            const domain = {
                name: 'hotluuu.io market',
                version: 'v1.0.0',
                chainId: hre.network.config.chainId,
                verifyingContract: market.address
            }
            const types = {
                OfferItem: [
                    { name: 'itemType', type: 'uint8' },
                    { name: 'token', type: 'address' },
                    { name: 'identifierOrCriteria', type: 'uint256' },
                    { name: 'startAmount', type: 'uint256' },
                    { name: 'endAmount', type: 'uint256' }
                ]
            };
            // console.log("------",order);
            const value = {
                itemType: order.offer[0].itemType,
                token: order.offer[0].token,
                identifierOrCriteria: order.offer[0].identifierOrCriteria,
                startAmount: order.offer[0].startAmount,
                endAmount: order.offer[0].endAmount
            }

            console.log("value: ", value);

            return await signer._signTypedData(domain, types, value);
        }
        async function generateSignConsiderationTest(signer, order, counter) {
            const domain = {
                name: 'hotluuu.io market',
                version: 'v1.0.0',
                chainId: hre.network.config.chainId,
                verifyingContract: market.address
            }
            const types = {
                ConsiderationItem: [
                    { name: 'itemType', type: 'uint8' },
                    { name: 'token', type: 'address' },
                    { name: 'identifierOrCriteria', type: 'uint256' },
                    { name: 'startAmount', type: 'uint256' },
                    { name: 'endAmount', type: 'uint256' },
                    { name: 'recipient', type: 'address' }
                ]
            };
            // console.log("------",order);
            const value = {
                itemType: order.consideration[0].itemType,
                token: order.consideration[0].token,
                identifierOrCriteria: order.consideration[0].identifierOrCriteria,
                startAmount: order.consideration[0].startAmount,
                endAmount: order.consideration[0].endAmount,
                recipient: order.consideration[0].recipient
            }

            console.log("value: ", value);

            return await signer._signTypedData(domain, types, value);
        }
    })


    /* 
        ------------- owner setting -------------
    */
    it('setWhiteList test', async () => {
        const users = [user1.address, user2.address, user3.address];
        const permissions = [true, true, true];
        await assert.revert(market.connect(user1).setWhiteList(users, permissions), "Ownable: caller is not the owner");
        await market.connect(owner).setWhiteList(users, permissions);
        assert.equal(await market.whitelist(user1.address), true);
        assert.equal(await market.whitelist(user2.address), true);
        assert.equal(await market.whitelist(user3.address), true);
    })

    it('setFees test: ', async () => {
        const collectionAddress = testNFT1.address;
        const fee = [100, 100, 100]
        await assert.revert(market.connect(user1).setFees(collectionAddress, fee), "Ownable: caller is not the owner");
        await market.connect(owner).setFees(collectionAddress, fee);
        const fees = await market.fees(collectionAddress);
        assert.equal(fees.marketFee.toNumber(), fee[0]);
        assert.equal(fees.projectFee.toNumber(), fee[1]);
        assert.equal(fees.ipFee.toNumber(), fee[2]);
    })

    it('setCollection test: ', async () => {
        const collectionAddress = testNFT1.address;
        assert.equal(await market.collections(collectionAddress), false);
        await assert.revert(market.connect(user1).setCollection(collectionAddress, true), "Ownable: caller is not the owner");
        await market.connect(owner).setCollection(collectionAddress, true);
        assert.equal(await market.collections(collectionAddress), true);
    })

})

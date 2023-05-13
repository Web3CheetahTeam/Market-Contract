const hre = require('hardhat');
const { assert } = require('./common');
const { currentTime, toUnit, fastForward } = require('../utils')();
const deployer = require('../../utils/deploy');
const { MerkleTree } = require('merkletreejs');
const { BigNumber } = require('ethers');

describe("Market", async function () {
    let market, testNFT1, testNFT2, testNFT1155, USDT;

    let owner, user1, user2, user3, marketVault, projectVault, ipVault;

    /* --------- constructor args --------- */
    // 2 days
    const DAY = 86400;
    const name = "Archloot";
    const symbol = "Archloot";
    const uri = "";
    const zeroAddress = "0x0000000000000000000000000000000000000000"

    const marketName = "hotluuu.io market";
    const marketVersion = "v1.0.0";

    const ItemType = {
        NATIVE: 0,
        ERC20: 1,
        ERC721: 2,
        ERC1155: 3
    }

    beforeEach(async function () {
        [owner, user1, user2, user3, marketVault, projectVault, ipVault] = await hre.ethers.getSigners();

        // deploy
        testNFT1 = await deployer.deployTestNFT(name, symbol);
        testNFT2 = await deployer.deployTestNFT(name, symbol);
        testNFT1155 = await deployer.deployTestNFT1155(uri);
        USDT = await deployer.deployTestERC20(name, symbol);
        market = await deployer.deployMarket(marketName, marketVersion);
    });

    it('constructor should be success: ', async () => {

    });

    describe("Trade test", async function () {
        beforeEach(async function () {
            /* 
                铸造NFT
            */
            await testNFT1.connect(user1).mint(0, 19, user1.address);
            await testNFT2.connect(user1).mint(0, 19, user1.address);
            await testNFT1.connect(user1).setApprovalForAll(market.address, true);
            await testNFT1.connect(user2).setApprovalForAll(market.address, true);

            await testNFT1155.connect(user1).mint(0, 20, user1.address);
            await testNFT1155.connect(user1).setApprovalForAll(market.address, true);

            /* 
                铸造USDT
            */
            await USDT.connect(user1).mint(hre.ethers.utils.parseEther("10000"), user1.address);
            await USDT.connect(user2).mint(hre.ethers.utils.parseEther("10000"), user2.address);
            await USDT.connect(user3).mint(hre.ethers.utils.parseEther("10000"), user3.address);

            /* 
                配置交易费
            */
            await market.connect(owner).setVaults(user1.address, user2.address, user3.address);
            await market.setCollection(testNFT1.address, true);
            await market.setCollection(testNFT1155.address, true);
            await market.setVaults(marketVault.address, projectVault.address, ipVault.address);
            // 1%,2%,3%
            const fee1 = [100, 200, 300];
            await market.connect(owner).setFees(testNFT1.address, fee1);

            // 2%,3%,4%
            const fee2 = [200, 300, 400];
            await market.connect(owner).setFees(testNFT1155.address, fee2);
        });

        it.only('fixed price by ETH test: ', async () => {
            const fees = [100, 100, 200];
            await market.setFees(testNFT1.address, fees);

            //  Vaults balance
            let marketVaultBalance = await marketVault.getBalance();
            let projectVaultBalance = await projectVault.getBalance();
            let ipVaultBalance = await ipVault.getBalance();
            let user1Balance = await user1.getBalance();

            // user3 buy user1's testNFT1
            const tokenID = 1;
            let price = hre.ethers.utils.parseEther("1");
            const order = {
                "offerer": user1.address,
                "offer": [
                    {
                        "itemType": 2,
                        "token": testNFT1.address,
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
            {
                order.startTime = order.endTime;
                await assert.revert(market.connect(user3).fulfillOrder(order, { value: price.toString() }), "Time error");
                order.startTime = 1;
                await assert.revert(market.connect(user3).fulfillOrder(order, { value: price.toString() }), "Sign error");
                order.startTime = 0;
            }
            await assert.revert(market.connect(user3).fulfillOrder(order, { value: price.div(BigNumber.from(2).toString()) }), "TX value error");
            await market.connect(user3).fulfillOrder(order, { value: price.toString() });

            assert.equal(await testNFT1.ownerOf(tokenID), user3.address);

            // vaults' balance should be increace 
            assert.equal((await marketVault.getBalance()).toString(), marketVaultBalance.add(
                price.mul(hre.ethers.BigNumber.from([fees[0]])).div(hre.ethers.BigNumber.from(10000))).toString());
            assert.equal((await projectVault.getBalance()).toString(), projectVaultBalance.add(
                price.mul(hre.ethers.BigNumber.from([fees[1]])).div(hre.ethers.BigNumber.from(10000))).toString());
            assert.equal((await ipVault.getBalance()).toString(), ipVaultBalance.add(
                price.mul(hre.ethers.BigNumber.from([fees[2]])).div(hre.ethers.BigNumber.from(10000))).toString());
            // User1's balance
            assert.equal((await user1.getBalance()).toString(), user1Balance.add(
                price.mul(hre.ethers.BigNumber.from((10000 - fees[0] - fees[1] - fees[2]))).div(hre.ethers.BigNumber.from(10000))).toString());

            {
                const order_error = {
                    "offerer": user1.address,
                    "offer": [
                        {
                            "itemType": 1,
                            "token": USDT.address,
                            "identifierOrCriteria": 0,
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
                            "recipient": user1.address
                        }
                    ],
                    "startTime": 0,
                    "endTime": 100000000000,
                    "salt": 1,
                    "signature": ''
                }
                const sign = await generateSign(user1, order_error, 0);
                order_error.signature = sign;
                await assert.revert(market.connect(user3).fulfillOrder(order_error, { value: price.toString() }), "");
            }

            {
                const order_error = {
                    "offerer": user1.address,
                    "offer": [
                        {
                            "itemType": 2,
                            "token": testNFT2.address,
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
                            "recipient": user1.address
                        }
                    ],
                    "startTime": 0,
                    "endTime": 100000000000,
                    "salt": 1,
                    "signature": ''
                }
                const sign = await generateSign(user1, order_error, 0);
                order_error.signature = sign;
                await assert.revert(market.connect(user3).fulfillOrder(order_error, { value: price.toString() }), "ERROR: This collection has no permission");
            }
        })

        it('fixed price by USDT test: ', async () => {
            const fees = [200, 100, 100];
            await market.setFees(testNFT1.address, fees);

            const user1Balance = await USDT.balanceOf(user1.address);
            const user3Balance = await USDT.balanceOf(user3.address);

            // user3 buy user1's testNFT1
            const tokenID = 1;
            let price = hre.ethers.utils.parseEther("1");
            const order = {
                "offerer": user1.address,
                "offer": [
                    {
                        "itemType": ItemType.ERC721,
                        "token": testNFT1.address,
                        "identifierOrCriteria": tokenID,
                        "startAmount": 1,
                        "endAmount": 1
                    }
                ],
                "consideration": [
                    {
                        "itemType": ItemType.ERC20,
                        "token": USDT.address,
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

            // user3 approve
            await USDT.connect(user3).approve(market.address, hre.ethers.constants.MaxUint256);

            await market.connect(user3).fulfillOrder(order, { value: 0 });

            assert.equal(await testNFT1.ownerOf(tokenID), user3.address);

            // vaults' balance should be increace 
            assert.equal((await USDT.balanceOf(marketVault.address)).toString(),
                price.mul(hre.ethers.BigNumber.from([fees[0]])).div(hre.ethers.BigNumber.from(10000)).toString());
            assert.equal((await USDT.balanceOf(projectVault.address)).toString(),
                price.mul(hre.ethers.BigNumber.from([fees[1]])).div(hre.ethers.BigNumber.from(10000)).toString());
            assert.equal((await USDT.balanceOf(ipVault.address)).toString(),
                price.mul(hre.ethers.BigNumber.from([fees[2]])).div(hre.ethers.BigNumber.from(10000)).toString());
            // Users' balance
            assert.equal((await USDT.balanceOf(user1.address)).toString(), user1Balance.add(
                price.mul(hre.ethers.BigNumber.from((10000 - fees[0] - fees[1] - fees[2]))).div(hre.ethers.BigNumber.from(10000))
            ).toString());
            assert.equal((await USDT.balanceOf(user3.address)).toString(), user3Balance.sub(price).toString());
        })

        it('accept offer by USDT test: ', async () => {
            const fees = [200, 100, 100];
            await market.setFees(testNFT1.address, fees);

            const user1Balance = await USDT.balanceOf(user1.address);
            const user3Balance = await USDT.balanceOf(user3.address);

            // user1 accept user3's offer
            const tokenID = 1;
            let offerPrice = hre.ethers.utils.parseEther("1");
            const order = {
                "offerer": user3.address,
                "offer": [{
                    "itemType": ItemType.ERC20,
                    "token": USDT.address,
                    "identifierOrCriteria": 0,
                    "startAmount": offerPrice.toString(),
                    "endAmount": offerPrice.toString(),
                }],
                "consideration": [
                    {
                        "itemType": ItemType.ERC721,
                        "token": testNFT1.address,
                        "identifierOrCriteria": tokenID,
                        "startAmount": 1,
                        "endAmount": 1,
                        "recipient": user3.address
                    }
                ],
                "startTime": 0,
                "endTime": 100000000000,
                "salt": 1,
                "signature": ''
            }
            const sign = await generateSign(user3, order, 0);
            order.signature = sign;

            // user3 approve
            await USDT.connect(user3).approve(market.address, hre.ethers.constants.MaxUint256);

            await market.connect(user1).fulfillOrder(order, { value: 0 });

            assert.equal(await testNFT1.ownerOf(tokenID), user3.address);

            // vaults' balance should be increace 
            assert.equal((await USDT.balanceOf(marketVault.address)).toString(),
                offerPrice.mul(hre.ethers.BigNumber.from([fees[0]])).div(hre.ethers.BigNumber.from(10000)).toString());
            assert.equal((await USDT.balanceOf(projectVault.address)).toString(),
                offerPrice.mul(hre.ethers.BigNumber.from([fees[1]])).div(hre.ethers.BigNumber.from(10000)).toString());
            assert.equal((await USDT.balanceOf(ipVault.address)).toString(),
                offerPrice.mul(hre.ethers.BigNumber.from([fees[2]])).div(hre.ethers.BigNumber.from(10000)).toString());
            // Users' balance
            assert.equal((await USDT.balanceOf(user1.address)).toString(), user1Balance.add(
                offerPrice.mul(hre.ethers.BigNumber.from((10000 - fees[0] - fees[1] - fees[2]))).div(hre.ethers.BigNumber.from(10000))
            ).toString());
            assert.equal((await USDT.balanceOf(user3.address)).toString(), user3Balance.sub(offerPrice).toString());
        })

        it('trade for ERC1155 test (fixed price mode): ', async () => {
            const fees = [100, 100, 200];
            await market.setFees(testNFT1155.address, fees);

            //  Vaults balance
            let marketVaultBalance = await marketVault.getBalance();
            let projectVaultBalance = await projectVault.getBalance();
            let ipVaultBalance = await ipVault.getBalance();
            let user1Balance = await user1.getBalance();

            // user3 buy user1's testNFT1155
            const tokenID = 0;
            let price = hre.ethers.utils.parseEther("1");
            const amount = 5;
            const order = {
                "offerer": user1.address,
                "offer": [
                    {
                        "itemType": ItemType.ERC1155,
                        "token": testNFT1155.address,
                        "identifierOrCriteria": tokenID,
                        "startAmount": amount,
                        "endAmount": amount
                    }
                ],
                "consideration": [
                    {
                        "itemType": ItemType.NATIVE,
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

            assert.equal(await testNFT1155.balanceOf(user3.address, tokenID), amount);
            assert.equal(await testNFT1155.balanceOf(user1.address, tokenID), amount * 3);

            // vaults' balance should be increace 
            assert.equal((await marketVault.getBalance()).toString(), marketVaultBalance.add(
                price.mul(hre.ethers.BigNumber.from([fees[0]])).div(hre.ethers.BigNumber.from(10000))).toString());
            assert.equal((await projectVault.getBalance()).toString(), projectVaultBalance.add(
                price.mul(hre.ethers.BigNumber.from([fees[1]])).div(hre.ethers.BigNumber.from(10000))).toString());
            assert.equal((await ipVault.getBalance()).toString(), ipVaultBalance.add(
                price.mul(hre.ethers.BigNumber.from([fees[2]])).div(hre.ethers.BigNumber.from(10000))).toString());
            // User1's balance
            assert.equal((await user1.getBalance()).toString(), user1Balance.add(
                price.mul(hre.ethers.BigNumber.from((10000 - fees[0] - fees[1] - fees[2]))).div(hre.ethers.BigNumber.from(10000))).toString());
        })

        it('trade for ERC1155 test (accept offer mode): ', async () => {
            const fees = [200, 100, 100];
            await market.setFees(testNFT1155.address, fees);

            const user1Balance = await USDT.balanceOf(user1.address);
            const user3Balance = await USDT.balanceOf(user3.address);

            // user1 accept user3's offer
            const tokenID = 0;
            let offerPrice = hre.ethers.utils.parseEther("1");
            const amount = 5;
            const order = {
                "offerer": user3.address,
                "offer": [{
                    "itemType": ItemType.ERC20,
                    "token": USDT.address,
                    "identifierOrCriteria": 0,
                    "startAmount": offerPrice.toString(),
                    "endAmount": offerPrice.toString(),
                }],
                "consideration": [
                    {
                        "itemType": ItemType.ERC1155,
                        "token": testNFT1155.address,
                        "identifierOrCriteria": tokenID,
                        "startAmount": amount,
                        "endAmount": amount,
                        "recipient": user3.address
                    }
                ],
                "startTime": 0,
                "endTime": 100000000000,
                "salt": 1,
                "signature": ''
            }
            const sign = await generateSign(user3, order, 0);
            order.signature = sign;

            // user3 approve
            await USDT.connect(user3).approve(market.address, hre.ethers.constants.MaxUint256);

            await market.connect(user1).fulfillOrder(order, { value: 0 });

            assert.equal(await testNFT1155.balanceOf(user3.address, tokenID), amount);
            assert.equal(await testNFT1155.balanceOf(user1.address, tokenID), amount * 3);

            // vaults' balance should be increace 
            assert.equal((await USDT.balanceOf(marketVault.address)).toString(),
                offerPrice.mul(hre.ethers.BigNumber.from([fees[0]])).div(hre.ethers.BigNumber.from(10000)).toString());
            assert.equal((await USDT.balanceOf(projectVault.address)).toString(),
                offerPrice.mul(hre.ethers.BigNumber.from([fees[1]])).div(hre.ethers.BigNumber.from(10000)).toString());
            assert.equal((await USDT.balanceOf(ipVault.address)).toString(),
                offerPrice.mul(hre.ethers.BigNumber.from([fees[2]])).div(hre.ethers.BigNumber.from(10000)).toString());
            // Users' balance
            assert.equal((await USDT.balanceOf(user1.address)).toString(), user1Balance.add(
                offerPrice.mul(hre.ethers.BigNumber.from((10000 - fees[0] - fees[1] - fees[2]))).div(hre.ethers.BigNumber.from(10000))
            ).toString());
            assert.equal((await USDT.balanceOf(user3.address)).toString(), user3Balance.sub(offerPrice).toString());
        })

        it('cancel test: ', async () => {
            const fees = [100, 100, 200];
            await market.setFees(testNFT1.address, fees);

            // user3 buy user1's testNFT1
            const tokenID = 1;
            let price = hre.ethers.utils.parseEther("1");
            const order = {
                "offerer": user1.address,
                "offer": [
                    {
                        "itemType": 2,
                        "token": testNFT1.address,
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
            order.counter = 0;

            await assert.revert(market.connect(user3).cancel([order]), "");
            await market.connect(user1).cancel([order]);

            await assert.revert(market.connect(user3).fulfillOrder(order, { value: price.toString() }), "Status error");
        })

        async function generateSign(signer, order, counter) {
            // console.log(hre.network.config.chainId);
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

        it('setWhiteList test', async () => {
            const users = [user1.address, user2.address, user3.address];
            const permissions = [true, true, true];
            await assert.revert(market.connect(user1).setWhiteList(users, permissions), "Ownable: caller is not the owner");
            await market.connect(owner).setWhiteList(users, permissions);
            assert.equal(await market.whitelist(user1.address), true);
            assert.equal(await market.whitelist(user2.address), true);
            assert.equal(await market.whitelist(user3.address), true);

            // test trade
            const fees = [100, 100, 200];
            await market.setFees(testNFT1.address, fees);

            //  Vaults balance
            let marketVaultBalance = await marketVault.getBalance();
            let projectVaultBalance = await projectVault.getBalance();
            let ipVaultBalance = await ipVault.getBalance();
            let user1Balance = await user1.getBalance();

            // user3 buy user1's testNFT1
            const tokenID = 1;
            let price = hre.ethers.utils.parseEther("1");
            const order = {
                "offerer": user1.address,
                "offer": [
                    {
                        "itemType": 2,
                        "token": testNFT1.address,
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

            // vaults' balance should not be increace 
            assert.equal((await marketVault.getBalance()).toString(), marketVaultBalance.toString());
            assert.equal((await projectVault.getBalance()).toString(), projectVaultBalance.toString());
            assert.equal((await ipVault.getBalance()).toString(), ipVaultBalance.toString());
            // User1's balance
            assert.equal((await user1.getBalance()).toString(), user1Balance.add(price).toString());

        })
    })


    /* 
        ------------- owner setting -------------
    */

    it('setFees test: ', async () => {
        const collectionAddress = testNFT1.address;
        const fee = [100, 100, 100];
        await assert.revert(market.connect(owner).setFees(collectionAddress, fee), "ERROR: vault is empty");
        await market.setVaults(marketVault.address, projectVault.address, ipVault.address);
        const fee_error = [9000, 1000, 100];
        await assert.revert(market.connect(owner).setFees(collectionAddress, fee_error), "exceed max fee");
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
        await assert.revert(market.connect(owner).setCollection(collectionAddress, true), "ERROR: vault is empty");

        await market.connect(owner).setVaults(user1.address, user2.address, user3.address);
        await market.connect(owner).setCollection(collectionAddress, true);
        assert.equal(await market.collections(collectionAddress), true);
    })

    it('setVaults test: ', async () => {
        const collectionAddress = testNFT1.address;
        await assert.revert(market.connect(user1).setVaults(user1.address, user2.address, user3.address), "Ownable: caller is not the owner");
        await market.connect(owner).setVaults(user1.address, user2.address, user3.address);
        assert.equal(await market.marketVault(), user1.address);
        assert.equal(await market.projectVault(), user2.address);
        assert.equal(await market.ipVault(), user3.address);
    })

})

const hre = require('hardhat');

exports.deployTestNFT = async function (name, symbol) {
    const TestNFT = await hre.ethers.getContractFactory("TestNFT");
    const testNFT = await TestNFT.deploy(name, symbol);
    await testNFT.deployed();
    return testNFT;
}

exports.deployTestNFT1155 = async function (uri) {
    const TestNFT = await hre.ethers.getContractFactory("TestNFT1155");
    const testNFT = await TestNFT.deploy(uri);
    await testNFT.deployed();
    return testNFT;
}

exports.deployTestERC20 = async function (name, symbol) {
    const TestERC20 = await hre.ethers.getContractFactory("TestERC20");
    const testERC20 = await TestERC20.deploy(name, symbol);
    await testERC20.deployed();
    return testERC20;
}

exports.deployMarket = async function (name, version) {
    const Market = await hre.ethers.getContractFactory("Market");
    const market = await hre.upgrades.deployProxy(
        Market, [name, version],
        { initializer: 'initialize' });
    await market.deployed();
    return market;
}

exports.upgradeMarket = async function (marketAddress) {
    const Market = await hre.ethers.getContractFactory("Market");
    const market = await upgrades.upgradeProxy(marketAddress, Market);
    return market;
}
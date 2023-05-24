// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const deployer = require('../utils/deploy');

async function main() {
    const addr = "0xBce5270d62C4a80DA514f87fBae63670268cb952";
    const Market = await hre.ethers.getContractFactory("Market");
    const market = await upgrades.upgradeProxy(addr, Market);
    console.log("market upgrade success:", market.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

const etherlime = require('etherlime');

const MogulDAI = require('./../../build/MogulDAI');
const MovieToken = require('./../../build/MovieToken');
const MogulToken = require('./../../build/MogulToken');

const SQRT = require('./../../contracts/Math/SQRT.json');
const BondingMathematics = require('./../../build/BondingMathematics');

const MogulOrganisation = require('./../../build/MogulOrganisation');

let deployTokensSQRT = async (deployerAddr) => {
    let tx = await deployerAddr.sendTransaction({
        data: SQRT.bytecode
    });
    return (await deployerAddr.provider.getTransactionReceipt(tx.hash)).contractAddress;
};

let getMogulToken = async (mogulOrganisationInstance, deployerWallet) => {
    let mogulTokenAddress = await mogulOrganisationInstance.mogulToken();
    return new ethers.Contract(mogulTokenAddress, MogulToken.abi, deployerWallet);
};

let mintDAI = async (mogulDAIInstance, addr, amount) => {
    await mogulDAIInstance.mint(addr, amount)
};

let approveDAI = async (mogulDAIInstance, approver, to, amount) => {
    await mogulDAIInstance.from(approver).approve(to, amount)
};

module.exports = {
    deployTokensSQRT,
    getMogulToken,
    mintDAI,
    approveDAI
};
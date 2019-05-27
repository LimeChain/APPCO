const etherlime = require('etherlime-lib');

const CODAI = require('./../../build/CODAI');
const COToken = require('./../../build/COToken');

const SQRT = require('./../../build/SQRT.json');
const BondingMathematics = require('./../../build/BondingMathematics');

const ContinuousOrganisation = require('./../../build/ContinuousOrganisation');

const deployerWallet = accounts[0].signer;
const CO_BANK = accounts[9].signer.address;

const deployer = new etherlime.EtherlimeGanacheDeployer();
deployer.setDefaultOverrides({ gasLimit: 4700000, gasPrice: 9000000000 })


let deployContinuousOrganisation = async (mglDai) => {

    let bondingMathematicsInstance = await deployBondingMath();

    return deployer.deploy(ContinuousOrganisation, {},
        bondingMathematicsInstance.contractAddress,
        mglDai.contractAddress,
        CO_BANK);
};

let deployTokensSQRT = async () => {
    return deployer.deploy(SQRT);
};

let getCoToken = async (COInstance, wallet) => {
    let coTokenAddress = await COInstance.coToken();
    let coTokenContract = new ethers.Contract(coTokenAddress, COToken.abi, deployerWallet.provider);
    return coTokenContract.connect(wallet);

};

let deployBondingMath = async () => {
    let sqrtContractAddress = await deployTokensSQRT();
    return deployer.deploy(BondingMathematics, {}, sqrtContractAddress.contractAddress);
};

let deployCODAI = async () => {
    return deployer.deploy(CODAI);
};

let mintDAI = async (CODAIInstance, to, amount) => {
    await CODAIInstance.mint(to, amount)
};

let approveDAI = async (CODAIInstance, approver, to, amount) => {
    await CODAIInstance.from(approver).approve(to, amount)
};

module.exports = {
    getCoToken,
    mintDAI,
    approveDAI,
    deployContinuousOrganisation,
    deployCODAI
};
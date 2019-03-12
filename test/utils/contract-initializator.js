const etherlime = require('etherlime');

const MogulDAI = require('./../../build/MogulDAI');
const MovieToken = require('./../../build/MovieToken');
const MogulToken = require('./../../build/MogulToken');

const SQRT = require('./../../contracts/Math/SQRT.json');
const BondingMathematics = require('./../../build/BondingMathematics');

const MogulOrganisation = require('./../../build/MogulOrganisation');

const deployerWallet = accounts[0].signer;
const MOGUL_BANK = accounts[9].signer.address;

const deployer = new etherlime.EtherlimeGanacheDeployer();


let deployMogulOrganization = async (mglDai, movieTokenInstance) => {

    let bondingMathematicsInstance = await deployBondingMath();

    return deployer.deploy(MogulOrganisation, {},
        bondingMathematicsInstance.contractAddress,
        mglDai.contractAddress,
        movieTokenInstance.contractAddress,
        MOGUL_BANK);
};

let deployMovieToken = async () => {
    return deployer.deploy(MovieToken);
};

let addMovieTokenMinter = async (movieTokenInstance, minterAddr) => {
    await movieTokenInstance.addMinter(minterAddr);
};

let deployTokensSQRT = async (deployerWallet) => {
    let tx = await deployerWallet.sendTransaction({
        data: SQRT.bytecode
    });
    return deployerWallet.provider.getTransactionReceipt(tx.hash);
};

let getMogulToken = async (mogulOrganisationInstance, wallet) => {
    let mogulTokenAddress = await mogulOrganisationInstance.mogulToken();
    let mogulTokenContract = new ethers.Contract(mogulTokenAddress, MogulToken.abi, deployerWallet.provider);
    return mogulTokenContract.connect(wallet);

};

let deployBondingMath = async () => {
    let sqrtContractAddress = await deployTokensSQRT(deployerWallet);
    return deployer.deploy(BondingMathematics, {}, sqrtContractAddress.contractAddress);
};

let deployMglDai = async () => {
    return deployer.deploy(MogulDAI);
};

let mintDAI = async (mogulDAIInstance, to, amount) => {
    await mogulDAIInstance.mint(to, amount)
};

let approveDAI = async (mogulDAIInstance, approver, to, amount) => {
    await mogulDAIInstance.from(approver).approve(to, amount)
};

module.exports = {
    getMogulToken,
    mintDAI,
    approveDAI,
    deployMogulOrganization,
    deployMglDai,
    addMovieTokenMinter,
    deployMovieToken
};
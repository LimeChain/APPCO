const etherlime = require('etherlime-lib');

const CODAI = require('./../../build/CODAI');
const COToken = require('./../../build/COToken');
const SQRT = require('./../../build/SQRT.json');
const BondingMathematics = require('./../../build/BondingMathematics');
const ContinuousOrganisation = require('./../../build/ContinuousOrganisation');
const TokensSQRT = require('./../../build/TokensSQRT.json');
const CategoryVoting = require('./../../build/CategoryVoting');

const deployerWallet = accounts[0].signer;

const deployer = new etherlime.EtherlimeGanacheDeployer();
deployer.setDefaultOverrides({ gasLimit: 4700000 })


let deployContinuousOrganisation = async (COTokenDai, votingContractInstance, coTokenInstance) => {

        let bondingMathematicsInstance = await deployBondingMath();

        const coContract = await deployer.deploy(ContinuousOrganisation, {},
                bondingMathematicsInstance.contractAddress,
                COTokenDai.contractAddress,
                coTokenInstance.contractAddress,
                votingContractInstance.contractAddress);

        await coTokenInstance.addMinter(coContract.contractAddress);
        await coTokenInstance.renounceMinter();

        return coContract;
};

let deployVotingContract = async (coTokenAddress, daiTokenAddress) => {
        const tokenSqrtContract = await deployTokenSQRT();

        return deployer.deploy(CategoryVoting, {}, coTokenAddress, tokenSqrtContract.contractAddress, daiTokenAddress);
}

let deployTokenSQRT = async () => {
        return deployer.deploy(TokensSQRT, {});
};

let deploySQRT = async () => {
        return deployer.deploy(SQRT);
};

let getCoToken = async (COInstance, wallet) => {

        let coTokenAddress = await COInstance.coToken();
        let coTokenContract = new ethers.Contract(coTokenAddress, COToken.abi, deployerWallet.provider);
        return coTokenContract.connect(wallet);
};

let deployBondingMath = async () => {
        let sqrtContractAddress = await deploySQRT();
        return deployer.deploy(BondingMathematics, {}, sqrtContractAddress.contractAddress);
};

let deployCODAI = async () => {
        return deployer.deploy(CODAI);
};

let deployCOToken = async () => {
        return deployer.deploy(COToken);
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
        deployCODAI,
        deployTokenSQRT,
        deployVotingContract,
        deployCOToken
}
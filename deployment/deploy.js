const ethers = require('ethers');
const etherlime = require('etherlime-lib');

const DAIToken = require('./../build/CODAI');
const COToken = require('./../build/COToken');
const CategoryVoting = require('./../build/CategoryVoting')
const BondingMath = require('./../build/BondingMathematics');
const ContinuousOrganisation = require('./../build/ContinuousOrganisation');
const BondingSQRT = require('./../build/SQRT.json');
const TokensSQRT = require('./../build/TokensSQRT.json');

const UNLOCK_AMOUNT = "500000000000000000000";
const UNLOCK_MINT = "499000000000000000000";

let DAI_TOKEN_ADDRESS = '0x9738c64e9435729a7b6a65c6b34186f151117f86';

const ENV = {
    LOCAL: 'LOCAL',
    TEST: 'TEST'
}

const DEPLOYERS = {
    LOCAL: (secret) => { return new etherlime.EtherlimeGanacheDeployer() },
    TEST: (secret, network) => { return new etherlime.InfuraPrivateKeyDeployer(secret, network, '40c2813049e44ec79cb4d7e0d18de173') }
}


const deploy = async (network, secret, etherscanApiKey) => {

    // Change ENV in order to deploy on test net (Ropsten)
    const deployer = getDeployer(ENV.TEST, secret, network);
    deployer.setDefaultOverrides({ gasLimit: 4700000 })
    deployer.setVerifierApiKey(etherscanApiKey)
    const daiContract = await getDAIContract(deployer);

    const coToken = await deployer.deploy(COToken, {});

    const votingContract = await deployCategoryVoting(deployer, coToken, daiContract);

    const cOrganisation = await deployContinuousOrganisation(deployer, daiContract.address, votingContract.contractAddress, coToken);

    const approveTx = await daiContract.approve(cOrganisation.contractAddress, UNLOCK_AMOUNT);
    await cOrganisation.verboseWaitForTransaction(approveTx, "Approve Unlock Transaction")
    const unlockTx = await cOrganisation.unlockOrganisation(UNLOCK_AMOUNT, UNLOCK_MINT);
    await cOrganisation.verboseWaitForTransaction(unlockTx, "Unlock Transaction")

};

let getDeployer = function (env, secret, network) {
    let deployer = DEPLOYERS[env](secret, network);

    deployer.ENV = env;

    return deployer;
}

let getDAIContract = async function (deployer) {
    if (deployer.ENV == ENV.LOCAL) {
        let daiContractDeployed = await deployer.deploy(DAIToken, {});
        await daiContractDeployed.mint(deployer.signer.address, UNLOCK_AMOUNT);

        return daiContractDeployed.contract;
    }

    return new ethers.Contract(DAI_TOKEN_ADDRESS, DAIToken.abi, deployer.signer);
}


let deployContinuousOrganisation = async function (deployer, daiToken, votingContract, coTokenContract) {

    // Deploy Organization Bonding SQRT Math
    const bondingSQRTContract = await deployer.deploy(BondingSQRT, {});


    // Deploy Bonding Calculations
    const bondingMathContractDeployed = await deployer.deploy(BondingMath, {}, bondingSQRTContract.contractAddress);


    // Deploy Organization
    const coContract = await deployer.deployAndVerify(ContinuousOrganisation, {},
        bondingMathContractDeployed.contractAddress,
        daiToken,
        coTokenContract.contractAddress,
        votingContract
    );

    const transferOwnershipTx = await coTokenContract.addMinter(coContract.contractAddress);
    coContract.verboseWaitForTransaction(transferOwnershipTx, "Adding CO as a minter")

    const renounceMintingPrivilige = await coTokenContract.renounceMinter();
    coContract.verboseWaitForTransaction(renounceMintingPrivilige, "removing deployer as minter")

    return coContract;
}

let deployCategoryVoting = async function (deployer, votingToken, daiContract) {

    // Deploy Token SQRT Math
    const tokenSQRTContract = await deployer.deploy(TokensSQRT, {});

    const votingContractDeployed = await deployer.deployAndVerify(CategoryVoting, {}, votingToken.contractAddress, tokenSQRTContract.contractAddress, daiContract.address);
    return votingContractDeployed;
}

module.exports = { deploy };

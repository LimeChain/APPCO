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

// Mogul wallet address
let CO_BANK = '0x53E63Ee92e1268919CF4757A9b1d48048C501A50';
let DAI_TOKEN_ADDRESS = '0xe0B206A30c778f8809c753844210c73D23001a96';

const ENV = {
    LOCAL: 'LOCAL',
    TEST: 'TEST'
}

const DEPLOYERS = {
    LOCAL: (secret) => { return new etherlime.EtherlimeGanacheDeployer() },
    TEST: (secret) => { return new etherlime.InfuraPrivateKeyDeployer(secret, 'ropsten', '') }
}


const deploy = async (network, secret) => {

    // Change ENV in order to deploy on test net (Ropsten)
    const deployer = getDeployer(ENV.LOCAL, secret);
    deployer.setDefaultOverrides({ gasLimit: 4700000 })
    const daiContract = await getDAIContract(deployer);

    const coToken = await deployer.deploy(COToken, {});

    const votingContract = await deployCategoryVoting(deployer, coToken, daiContract);

    const cOrganisation = await deployContinuousOrganisation(deployer, daiContract.address, votingContract.contractAddress, coToken);

    const approveTx = await daiContract.approve(cOrganisation.contractAddress, UNLOCK_AMOUNT);
    await cOrganisation.verboseWaitForTransaction(approveTx, "Approve Unlock Transaction")
    const unlockTx = await cOrganisation.unlockOrganisation(UNLOCK_AMOUNT, UNLOCK_MINT);
    await cOrganisation.verboseWaitForTransaction(unlockTx, "Unlock Transaction")

};

let getDeployer = function (env, secret) {
    let deployer = DEPLOYERS[env](secret);

    deployer.ENV = env;
    deployer.defaultOverrides = { gasLimit: 4700000, gasPrice: 9000000000 };

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

let deployDAIExchange = async function (deployer, daiToken) {
    const exchangeContractDeployed = await deployer.deploy(DAIExchange, {}, daiToken.address);
    return exchangeContractDeployed;
}

let deployContinuousOrganisation = async function (deployer, daiToken, votingContract, coTokenContract) {

    // Deploy Organization Bonding SQRT Math
    const bondingSQRTContract = await deployer.deploy(BondingSQRT, {});


    // Deploy Bonding Calculations
    const bondingMathContractDeployed = await deployer.deploy(BondingMath, {}, bondingSQRTContract.contractAddress);


    // Deploy Organization
    const coContract = await deployer.deploy(ContinuousOrganisation, {},
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

    const votingContractDeployed = await deployer.deploy(CategoryVoting, {}, votingToken.contractAddress, tokenSQRTContract.contractAddress, daiContract.address);
    return votingContractDeployed;
}

module.exports = { deploy };

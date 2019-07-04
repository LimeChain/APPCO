const ethers = require('ethers');
const etherlime = require('etherlime-lib');

const DAIToken = require('./../build/CODAI');
const Voting = require('./../build/Voting')
const BondingMath = require('./../build/BondingMathematics');
const ContinuousOrganisation = require('./../build/ContinuousOrganisation');
const BondingSQRT = require('./../build/SQRT.json');
const TokensSQRT = require('./../build/TokensSQRT.json');

const UNLOCK_AMOUNT = '1000000000000000000'; // 1 ETH

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
    const daiContract = await getDAIContract(deployer);

    const cOrganisation = await deployContinuousOrganisation(deployer, daiContract.address);

    const coToken = await cOrganisation.coToken();

    await deployVoting(deployer, coToken);

    await daiContract.approve(cOrganisation.contractAddress, UNLOCK_AMOUNT);
    await cOrganisation.unlockOrganisation(UNLOCK_AMOUNT);
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

let deployContinuousOrganisation = async function (deployer, daiToken) {

    // Deploy Organization Bonding SQRT Math
    const bondingSQRTContract = await deployer.deploy(BondingSQRT, {});


    // Deploy Bonding Calculations
    const bondingMathContractDeployed = await deployer.deploy(BondingMath, {}, bondingSQRTContract.contractAddress);


    // Deploy Organization
    const coContract = await deployer.deploy(ContinuousOrganisation, {},
        bondingMathContractDeployed.contractAddress,
        daiToken,
        CO_BANK
    );

    return coContract;
}

let deployVoting = async function (deployer, votingToken) {

    const MOVIES = [
        '0x4d6f766965310000000000000000000000000000000000000000000000000000', // Movie1
        '0x4d6f766965320000000000000000000000000000000000000000000000000000', // Movie2
        '0x4d6f766965330000000000000000000000000000000000000000000000000000', // Movie3
        '0x4d6f766965340000000000000000000000000000000000000000000000000000', // Movie4
        '0x4d6f766965350000000000000000000000000000000000000000000000000000'  // Movie5
    ];


    // Deploy Token SQRT Math
    const tokenSQRTContract = await deployer.deploy(TokensSQRT, {});


    // Deploy Voting
    const votingContractDeployed = await deployer.deploy(Voting, {}, votingToken, MOVIES, tokenSQRTContract.contractAddress);
    return votingContractDeployed;
}

module.exports = { deploy };

const ethers = require('ethers');
const etherlime = require('etherlime');

const DAIToken = require('./../build/MogulDAI');
const MovieToken = require('./../build/MovieToken');

const Voting = require('./../build/Voting');
const BondingMath = require('./../build/BondingMathematics');
const MogulOrganization = require('./../build/MogulOrganisation');

const BondingSQRT = require('./../contracts/Math/SQRT.json');
const TokensSQRT = require('./../contracts/Math/TokensSQRT.json');

const UNLOCK_AMOUNT = '1000000000000000000'; // 1 ETH

// Mogul wallet address
let MOGUL_BANK = '0x53E63Ee92e1268919CF4757A9b1d48048C501A50';
let DAI_TOKEN_ADDRESS = '0xe0B206A30c778f8809c753844210c73D23001a96';

const ENV = {
    LOCAL: 'LOCAL',
    TEST: 'TEST'
};

const DEPLOYERS = {
    LOCAL: (secret) => { return new etherlime.EtherlimeGanacheDeployer(secret, 8545, '') },
    TEST: (secret) => { return new etherlime.InfuraPrivateKeyDeployer(secret, 'ropsten', '') }
};


const deploy = async (network, secret) => {

    // Change ENV in order to deploy on test net (Ropsten)
    const deployer = getDeployer(ENV.LOCAL, secret);
    const daiContract = await getDAIContract(deployer);

    // Deploy Movie Token
    const movieTokenContractDeployed = await deployer.deploy(MovieToken, {});

    await deployVoting(deployer, movieTokenContractDeployed);

    const mogulOrganization = await deployMogulOrganization(deployer, movieTokenContractDeployed, daiContract.address);

    await movieTokenContractDeployed.addMinter(mogulOrganization.contractAddress);
    await daiContract.approve(mogulOrganization.contractAddress, UNLOCK_AMOUNT);
    await mogulOrganization.unlockOrganisation(UNLOCK_AMOUNT);
};

let getDeployer = function (env, secret) {
    let deployer = DEPLOYERS[env](secret);

    deployer.ENV = env;
    deployer.defaultOverrides = { gasLimit: 4700000, gasPrice: 9000000000 };

    return deployer;
};

let getDAIContract = async function (deployer) {
    if (deployer.ENV == ENV.LOCAL) {
        let daiContractDeployed = await deployer.deploy(DAIToken, {});
        await daiContractDeployed.mint(deployer.signer.address, UNLOCK_AMOUNT);

        return daiContractDeployed.contract;
    }

    return new ethers.Contract(DAI_TOKEN_ADDRESS, DAIToken.abi, deployer.signer);
};

let deployMogulOrganization = async function (deployer, movieToken, daiToken) {

    // Deploy Organization Bonding SQRT Math
    const bondingSqrtDeployTx = await deployer.signer.sendTransaction({
        data: BondingSQRT.bytecode
    });

    await deployer.provider.waitForTransaction(bondingSqrtDeployTx.hash);
    bondingSqrtContractAddress = (await deployer.provider.getTransactionReceipt(bondingSqrtDeployTx.hash)).contractAddress;


    // Deploy Bonding Calculations
    const bondingMathContractDeployed = await deployer.deploy(BondingMath, {}, bondingSqrtContractAddress);


    // Deploy Organization
    const mogulOrganizationContractDeployed = await deployer.deploy(MogulOrganization, {},
        bondingMathContractDeployed.contractAddress,
        daiToken,
        movieToken.contractAddress,
        MOGUL_BANK
    );

    return mogulOrganizationContractDeployed;
};

let deployVoting = async function (deployer, movieToken) {

    const MOVIES = [
        '0x4d6f766965310000000000000000000000000000000000000000000000000000', // Movie1
        '0x4d6f766965320000000000000000000000000000000000000000000000000000', // Movie2
        '0x4d6f766965330000000000000000000000000000000000000000000000000000', // Movie3
        '0x4d6f766965340000000000000000000000000000000000000000000000000000', // Movie4
        '0x4d6f766965350000000000000000000000000000000000000000000000000000'  // Movie5
    ];


    // Deploy Token SQRT Math
    const tokenSqrtDeployTx = await deployer.signer.sendTransaction({
        data: TokensSQRT.bytecode
    });

    await deployer.provider.waitForTransaction(tokenSqrtDeployTx.hash);
    tokenSqrtContractAddress = (await deployer.provider.getTransactionReceipt(tokenSqrtDeployTx.hash)).contractAddress;


    // Deploy Voting
    const votingContractDeployed = await deployer.deploy(Voting, {}, movieToken.contractAddress, MOVIES, tokenSqrtContractAddress);
    return votingContractDeployed;
};

module.exports = { deploy };
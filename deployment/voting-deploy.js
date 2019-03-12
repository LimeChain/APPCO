const ethers = require('ethers');
const etherlime = require('etherlime');

const Voting = require('./../build/Voting');
const MovieToken = require('./../build/MovieToken');
const TokensSQRT = require('./../contracts/Math/TokensSQRT');

const deploy = async (network, secret) => {

    const deployer = new etherlime.EtherlimeGanacheDeployer(secret, 8545, '');
    deployer.defaultOverrides = { gasLimit: 4700000, gasPrice: 9000000000 };

    const deployerWallet = (new ethers.Wallet(secret)).connect(deployer.provider);

    // Deploy Movie Token
    const movieTokenContractDeployed = await deployer.deploy(MovieToken, {});


    // Deploy SQRT Math
    const sqrtDeployTx = await deployerWallet.sendTransaction({
        data: TokensSQRT.bytecode
    });
    sqrtContractAddress = (await deployerWallet.provider.getTransactionReceipt(sqrtDeployTx.hash)).contractAddress;


    // Deploy Voting
    const MOVIES = [
        '0x4d6f766965310000000000000000000000000000000000000000000000000000', // Movie1
        '0x4d6f766965320000000000000000000000000000000000000000000000000000', // Movie2
        '0x4d6f766965330000000000000000000000000000000000000000000000000000', // Movie3
        '0x4d6f766965340000000000000000000000000000000000000000000000000000', // Movie4
        '0x4d6f766965350000000000000000000000000000000000000000000000000000'  // Movie5
    ];
    await deployer.deploy(Voting, {}, movieTokenContractDeployed.contractAddress, MOVIES, sqrtContractAddress);
};

module.exports = { deploy };
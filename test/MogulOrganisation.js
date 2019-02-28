const etherlime = require('etherlime');
const MogulDAI = require('../build/MogulDAI');
const MogulOrganisation = require('./../build/MogulOrganisation');
const MovieToken = require('../build/MovieToken');
// const MogulToken = require('../build/MogulToken');
const BondingMathematics = require('../build/BondingMathematics');
const SQRT = require('./../contracts/Math/SQRT.json');

describe('MogulOrganisation Contract', () => {

    const deployer = new etherlime.EtherlimeGanacheDeployer();
    const OWNER = accounts[0].signer;

    let sqrtContractAddress;
    let bondingMathematicsInstance;
    let movieTokenInstance;
    let mogulOrganisationInstance;
    let mogulDAIInstance;

    async function deployTokensSQRT() {
        let tx = await OWNER.sendTransaction({
            data: SQRT.bytecode
        });
        sqrtContractAddress = (await OWNER.provider.getTransactionReceipt(tx.hash)).contractAddress;
    }

    async function deployContracts() {
        await deployTokensSQRT();
        bondingMathematicsInstance = await deployer.deploy(BondingMathematics, {}, sqrtContractAddress);
        mogulDAIInstance = await deployer.deploy(MogulDAI);
        movieTokenInstance = await deployer.deploy(MovieToken);

        mogulOrganisationInstance = await deployer.deploy(MogulOrganisation, {},
            bondingMathematicsInstance.contractAddress,
            mogulDAIInstance.contractAddress,
            movieTokenInstance.contractAddress)

    }

    it('Should initialize the contract correctly', async () => {
        await deployContracts();
        console.log(mogulOrganisationInstance.contractAddress);
    });
});
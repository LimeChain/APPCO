const etherlime = require('etherlime');
const MogulDAI = require('../build/MogulDAI');
const MogulOrganisationTests = require('./../build/MogulOrganisation');
const MovieToken = require('../build/MovieToken');
const MogulToken = require('../build/MogulToken');
const BondingMathematics = require('../build/BondingMathematics');
const SQRT = require('./../contracts/Math/SQRT.json');

describe('MogulOrganisation Contract', () => {

    const deployer = new etherlime.EtherlimeGanacheDeployer();
    const OWNER = accounts[0].signer;
    const mglOrgDaiSupply = "500000000000000000";
    const initialMglSupply = "1000000000000000000";
    const ONE_ETH = "1000000000000000000";
    const MOGUL_BANK = accounts[9].signer.address;

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

        mogulOrganisationInstance = await deployer.deploy(MogulOrganisationTests, {},
            bondingMathematicsInstance.contractAddress,
            mogulDAIInstance.contractAddress,
            movieTokenInstance.contractAddress,
            mglOrgDaiSupply,
            MOGUL_BANK)
    }

    async function mintDAI(addr, amount) {
        await mogulDAIInstance.mint(addr, amount)
    }

    async function approveDAI(to, amount) {
        await mogulDAIInstance.approve(to, amount)
    }

    it('Should invest', async () => {
        await deployContracts();
        await mintDAI(OWNER.address, ONE_ETH);
        await approveDAI(mogulOrganisationInstance.contractAddress, ONE_ETH);

        await mogulOrganisationInstance.invest(ONE_ETH, {
            gasLimit: 200000
        });

    });
});
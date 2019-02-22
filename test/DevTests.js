const etherlime = require('etherlime');
const ContinuousOrganisation = require('../build/ContinuousOrganisation');
const MogulToken = require('../build/MogulToken');

const deployer = new etherlime.EtherlimeGanacheDeployer();
// const raisingWallet = accounts[9].wallet.address;
const continuousRate = "500000";
let ContinuousOrganisationInstance;
let MogulTokenInstance;
let oneEth = "1000000000000000000";

// !!!IMPORTANT!!! This tests are only for development purposes!
describe("Prices", () => {

    beforeEach(async () => {
        MogulTokenInstance = await deployer.deploy(MogulToken);
        ContinuousOrganisationInstance = await deployer.deploy(ContinuousOrganisation, {}, continuousRate, MogulTokenInstance.contractAddress);
        await MogulTokenInstance.addMinter(ContinuousOrganisationInstance.contractAddress);
        await ContinuousOrganisationInstance.init({
            gasLimit: 6700000
        });
    });

    async function mintOneEth() {
        await ContinuousOrganisationInstance.mint({
            value: ethers.utils.bigNumberify(oneEth)
        });
    }

    async function tokensForOneEth() {
        let tokenstForOneEth = await ContinuousOrganisationInstance.calculateContinuousMintReturn(oneEth);
        console.log(tokenstForOneEth.toString());
    }

    it('BuyTokens ', async () => {
        for (let i = 0; i < 10; i++) {
            await tokensForOneEth();
            await mintOneEth();
        }
    });

});
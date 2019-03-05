const etherlime = require('etherlime');
const { buyCalc, sellCalc } = require('./utils/token-price-calculation');

const MogulDAI = require('../build/MogulDAI');
const MovieToken = require('../build/MovieToken');

const SQRT = require('./../contracts/Math/SQRT.json');
const BondingMathematics = require('../build/BondingMathematics');

const MogulOrganisationTests = require('./../build/MogulOrganisation');

describe.only('Mogul Organisation Contract', () => {

    const deployer = new etherlime.EtherlimeGanacheDeployer();

    const OWNER = accounts[0].signer;
    const INVESTOR = accounts[1].signer;
    const MOGUL_BANK = accounts[9].signer.address;

    const mglOrgDaiSupply = "500000000000000000";
    const initialMglSupply = "1000000000000000000";
    const ONE_ETH = "1000000000000000000";
    const TWO_ETH = "2000000000000000000";

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
            MOGUL_BANK);


        // Mint and Approve 1 ETH in order to unlock the organization
        await mintDAI(OWNER.address, ONE_ETH);
        await approveDAI(OWNER, mogulOrganisationInstance.contractAddress, ONE_ETH);

        await movieTokenInstance.addMinter(mogulOrganisationInstance.contractAddress);
    }

    async function mintDAI(addr, amount) {
        await mogulDAIInstance.mint(addr, amount)
    }

    async function approveDAI(approver, to, amount) {
        await mogulDAIInstance.from(approver).approve(to, amount)
    }

    describe('Invest', function () {
        it('Should invest', async () => {
            await deployContracts();
            await mintDAI(INVESTOR.address, ONE_ETH);

            // Approve 1 ETH for investment
            await approveDAI(INVESTOR, mogulOrganisationInstance.contractAddress, ONE_ETH);

            await mogulOrganisationInstance.unlockOrganisation(ONE_ETH);
            await mogulOrganisationInstance.from(INVESTOR).invest(ONE_ETH, {
                gasLimit: 300000
            });

            const EXPECTED_BANK_BALANCE = '200000000000000000'; // 0.2 ETH
            let bankBalance = await mogulDAIInstance.balanceOf(MOGUL_BANK);
            assert(bankBalance.eq(EXPECTED_BANK_BALANCE), 'Incorrect bank balance after investment');

            const EXPECTED_RESERVE_BALANCE = '800000000000000000'; // 0.8 ETH
            let reserveBalance = await mogulDAIInstance.balanceOf(mogulOrganisationInstance.contractAddress);
            assert(reserveBalance.eq(EXPECTED_RESERVE_BALANCE), 'Incorrect reserve balance after investment');


            // Wrap mogulOrganisationInstance.mogulToken in MogulToken interface
            const EXPECTED_INVESTOR_MOGUL_BALANCE = buyCalc();
            let investorMogulBalance = await movieTokenInstance.balanceOf(INVESTOR.address);
            assert(investorMogulBalance.eq(EXPECTED_INVESTOR_MOGUL_BALANCE), 'Incorrect investor mogul balance after investment');
            // let investorMovieBalance = 


            // let daiSupply = await mogulOrganisationInstance.daiSupply();
            // let daiReserve = await mogulOrganisationInstance.daiReserve();

            // assert(daiSupply.eq('1000000000000000000'), 'Incorrect dai supply after investment');
            // assert(daiReserve.eq());
        });

        it('Should throw if one tries to invest in non-unlocked organisation', async () => {
            await deployContracts();
            await mintDAI(INVESTOR.address, ONE_ETH);
            await approveDAI(INVESTOR, mogulOrganisationInstance.contractAddress, ONE_ETH);

            await assert.revert(mogulOrganisationInstance.from(INVESTOR).invest(ONE_ETH), 'An investment has been processed for a non-unlocked organisation');
        });

        it('Should throw if an investor tries to invest with unapproved DAI amount', async () => {
            await deployContracts();

            await assert.revert(mogulOrganisationInstance.from(INVESTOR).invest(ONE_ETH), 'An investment has been processed with unapproved DAI amount');
        });
    });

    describe('Unlock', function () {
        it('Should unlock the organisation', async () => {
            await deployContracts();

            await mogulOrganisationInstance.unlockOrganisation(ONE_ETH);

            let organisationBalance = await mogulDAIInstance.balanceOf(mogulOrganisationInstance.contractAddress);
            assert(organisationBalance.eq(ONE_ETH), 'Organisation balance is incorrect after unlocking');
        });

        it('Should throw on re-unlocking', async () => {
            await deployContracts();

            await mogulOrganisationInstance.unlockOrganisation(ONE_ETH);

            await assert.revert(mogulOrganisationInstance.unlockOrganisation(ONE_ETH), 'Re-unlocking of an organisation did not throw');
        });

        it('Should throw if an unlocker tries to unlock with unapproved DAI amount', async () => {
            await deployContracts();

            // In 'deployContracts' only 1 ether is approved for unlocking
            await assert.revert(mogulOrganisationInstance.unlockOrganisation(TWO_ETH), 'Organisation has been unlocked with unapproved DAI amount');
        });
    });
});
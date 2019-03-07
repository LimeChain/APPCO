const etherlime = require('etherlime');
const { buyCalc, sellCalc } = require('./utils/token-price-calculation');
const contractInitializator = require('./utils/contract-initializator');

const MogulDAI = require('./../build/MogulDAI');
const MovieToken = require('./../build/MovieToken');
const MogulToken = require('./../build/MogulToken');

const SQRT = require('./../contracts/Math/SQRT.json');
const BondingMathematics = require('./../build/BondingMathematics');

const MogulOrganisation = require('./../build/MogulOrganisation');

describe('Mogul Organisation Contract', () => {

    const deployer = new etherlime.EtherlimeGanacheDeployer();

    const OWNER = accounts[0].signer;
    const INVESTOR = accounts[1].signer;
    const MOGUL_BANK = accounts[9].signer.address;

    const INITIAL_MOGUL_SUPPLY = "1000000000000000000";

    const ONE_ETH = "1000000000000000000";
    const TWO_ETH = "2000000000000000000";
    const normalization = 1000000000000000000;

    const INVESTMENT_AMOUNT = ONE_ETH;
    const UNLOCK_AMOUNT = ONE_ETH;

    let sqrtContractAddress;
    let bondingMathematicsInstance;

    let mogulDAIInstance;
    let movieTokenInstance;
    let mogulTokenInstance;

    let mogulOrganisationInstance;

    async function deployContracts() {
        sqrtContractAddress = await contractInitializator.deployTokensSQRT(OWNER);

        bondingMathematicsInstance = await deployer.deploy(BondingMathematics, {}, sqrtContractAddress);

        mogulDAIInstance = await deployer.deploy(MogulDAI);
        movieTokenInstance = await deployer.deploy(MovieToken);

        mogulOrganisationInstance = await deployer.deploy(MogulOrganisation, {},
            bondingMathematicsInstance.contractAddress,
            mogulDAIInstance.contractAddress,
            movieTokenInstance.contractAddress,
            MOGUL_BANK);

        mogulTokenInstance = await contractInitializator.getMogulToken(mogulOrganisationInstance, OWNER);

        // Mint and Approve 1 ETH in order to unlock the organization
        await contractInitializator.mintDAI(mogulDAIInstance,OWNER.address, ONE_ETH);
        await contractInitializator.approveDAI(mogulDAIInstance, OWNER, mogulOrganisationInstance.contractAddress, ONE_ETH);

        await movieTokenInstance.addMinter(mogulOrganisationInstance.contractAddress);
    }

    describe('Invest', function () {

        beforeEach(async () => {
            await deployContracts();

            // await approveDAI(INVESTOR, mogulOrganisationInstance.contractAddress, INVESTMENT_AMOUNT);
            await contractInitializator.mintDAI(mogulDAIInstance,INVESTOR.address, ONE_ETH);
            await contractInitializator.approveDAI(mogulDAIInstance, INVESTOR, mogulOrganisationInstance.contractAddress, ONE_ETH);

            await mogulOrganisationInstance.unlockOrganisation(UNLOCK_AMOUNT);
            await mogulOrganisationInstance.from(INVESTOR).invest(INVESTMENT_AMOUNT, {
                gasLimit: 300000
            });
        });

        it('should send correct dai amount to the mogul bank', async () => {

            const EXPECTED_BANK_BALANCE = '800000000000000000'; // 0.8 ETH
            let bankBalance = await mogulDAIInstance.balanceOf(MOGUL_BANK);
            assert(bankBalance.eq(EXPECTED_BANK_BALANCE), 'Incorrect bank balance after investment');
        });

        it('should send correct amount to the reserve', async () => {

            const EXPECTED_RESERVE_BALANCE = '1200000000000000000'; // 1.2 ETH (Unlocking + investment)
            let reserveBalance = await mogulDAIInstance.balanceOf(mogulOrganisationInstance.contractAddress);
            assert(reserveBalance.eq(EXPECTED_RESERVE_BALANCE), 'Incorrect reserve balance after investment');
        });

        it('should send corect amount mogul tokens to the investor', async () => {
            // normalization is because of 18 decimals of mogul token
            const EXPECTED_INVESTOR_MOGUL_BALANCE = (buyCalc(INITIAL_MOGUL_SUPPLY, UNLOCK_AMOUNT, INVESTMENT_AMOUNT) / normalization).toFixed(9);
            let investorMogulBalance = await mogulTokenInstance.balanceOf(INVESTOR.address);
            investorMogulBalance = (Number(investorMogulBalance.toString()) / normalization).toFixed(9);

            assert.strictEqual(investorMogulBalance, EXPECTED_INVESTOR_MOGUL_BALANCE, 'Incorrect investor mogul balance after investment');
        });

        it('should send correct movie tokens to the investor', async () => {
            // 1:10 = mogul:movie token
            let investorMogulBalance = await mogulTokenInstance.balanceOf(INVESTOR.address);
            let EXPECTED_INVESTOR_MOVIE_BALANCE = (investorMogulBalance * 10).toFixed(8);
            let investorMovieBalance = await movieTokenInstance.balanceOf(INVESTOR.address);
            investorMovieBalance = (Number(investorMovieBalance.toString()) / normalization).toFixed(8);

            assert.strictEqual(investorMovieBalance, EXPECTED_INVESTOR_MOVIE_BALANCE, 'Incorrect investor movie balance after investment');
        });

        it('Should receive correct invest amount', async () => {
            // EXPECTED_INVESTMENTS_AMOUNT = unlocking amount + investment amount
            const EXPECTED_INVESTMENTS_AMOUNT = '2000000000000000000'; // 2 ETH
            let totalDAIInvestments = await mogulOrganisationInstance.totalDAIInvestments();
            assert(totalDAIInvestments.eq(EXPECTED_INVESTMENTS_AMOUNT), 'Incorrect investments amount after investment');
        });

        it('Should throw if one tries to invest in non-unlocked organisation', async () => {
            await deployContracts();
            // await mintDAI(INVESTOR.address, ONE_ETH);
            await contractInitializator.mintDAI(mogulDAIInstance,INVESTOR.address, ONE_ETH);
            await contractInitializator.approveDAI(mogulDAIInstance, INVESTOR, mogulOrganisationInstance.contractAddress, ONE_ETH);
            // await approveDAI(INVESTOR, mogulOrganisationInstance.contractAddress, ONE_ETH);

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
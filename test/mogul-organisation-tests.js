const etherlime = require('etherlime-lib');
const { buyCalc, sellCalc } = require('./utils/token-price-calculation');
const contractInitializator = require('./utils/contract-initializator');

describe('Continuous Organisation Contract', () => {

    const deployer = new etherlime.EtherlimeGanacheDeployer();

    const OWNER = accounts[0].signer;
    const INVESTOR = accounts[1].signer;
    const CO_BANK = accounts[9].signer.address;

    const INITIAL_COTOKEN_SUPPLY = "1000000000000000000";

    const ONE_ETH = "1000000000000000000";
    const TWO_ETH = "2000000000000000000";
    const normalization = 1000000000000000000;

    const INVESTMENT_AMOUNT = ONE_ETH;
    const UNLOCK_AMOUNT = ONE_ETH;

    let CODAIInstance;
    let coTokenInstance;

    let coInstance;


    describe('Continuous Organisation Contract', function () {

        beforeEach(async () => {
            CODAIInstance = await contractInitializator.deployCODAI();

            coInstance = await contractInitializator.deployContinuousOrganisation(CODAIInstance);

            coTokenInstance = await contractInitializator.getCoToken(coInstance, INVESTOR);

            // Mint and Approve 1 ETH in order to unlock the organization
            await contractInitializator.mintDAI(CODAIInstance, OWNER.address, ONE_ETH);
            await contractInitializator.approveDAI(CODAIInstance, OWNER, coInstance.contractAddress, ONE_ETH);

            // await approveDAI(INVESTOR, coInstance.contractAddress, INVESTMENT_AMOUNT);
            await contractInitializator.mintDAI(CODAIInstance, INVESTOR.address, ONE_ETH);
            await contractInitializator.approveDAI(CODAIInstance, INVESTOR, coInstance.contractAddress, ONE_ETH);

        });

        describe('Unlocking', function () {

            it('Should unlock the organisation', async () => {
                let expectedBalance = "200000000000000000"; // 20% of one eth
                await coInstance.unlockOrganisation(UNLOCK_AMOUNT);
                let organisationBalance = await CODAIInstance.balanceOf(coInstance.contractAddress);
                assert(organisationBalance.eq(expectedBalance), 'Organisation balance is incorrect after unlocking');
            });

            it('Should throw on re-unlocking', async () => {
                await coInstance.unlockOrganisation(UNLOCK_AMOUNT);
                await assert.revert(coInstance.unlockOrganisation(ONE_ETH), 'Re-unlocking of an organisation did not throw');
            });

            it('Should throw if an unlocker tries to unlock with unapproved DAI amount', async () => {
                await coInstance.unlockOrganisation(UNLOCK_AMOUNT);
                await assert.revert(coInstance.unlockOrganisation(TWO_ETH), 'Organisation has been unlocked with unapproved DAI amount');
            });

            it('Should throw if one tries to invest in non-unlocked organisation', async () => {
                await assert.revert(coInstance.from(INVESTOR).invest(ONE_ETH), 'An investment has been processed for a non-unlocked organisation');
            });
        });

        describe('Investment', function () {
            beforeEach(async () => {
                await coInstance.unlockOrganisation(UNLOCK_AMOUNT);
                await coInstance.from(INVESTOR).invest(INVESTMENT_AMOUNT, {
                    gasLimit: 300000
                });
            });

            it('should send correct dai amount to the CO bank', async () => {
                const EXPECTED_BANK_BALANCE = '1600000000000000000'; // 1.6 ETH (0.8 from unlocking + 0.8 from investing)
                let bankBalance = await CODAIInstance.balanceOf(CO_BANK);
                assert(bankBalance.eq(EXPECTED_BANK_BALANCE), 'Incorrect bank balance after investment');
            });

            it('should send correct dai amount to the reserve', async () => {

                const EXPECTED_RESERVE_BALANCE = '400000000000000000'; // 0.4 ETH (Unlocking + investment)
                let reserveBalance = await CODAIInstance.balanceOf(coInstance.contractAddress);
                assert(reserveBalance.eq(EXPECTED_RESERVE_BALANCE), 'Incorrect reserve balance after investment');
            });

            it('should send correct amount co tokens to the investor', async () => {
                // normalization is because of 18 decimals of co token
                const EXPECTED_INVESTOR_CO_BALANCE = (buyCalc(INITIAL_COTOKEN_SUPPLY, UNLOCK_AMOUNT, INVESTMENT_AMOUNT) / normalization).toFixed(9);
                let investorCoTokenBalance = await coTokenInstance.balanceOf(INVESTOR.address);
                investorCoTokenBalance = (Number(investorCoTokenBalance.toString()) / normalization).toFixed(9);

                assert.strictEqual(investorCoTokenBalance, EXPECTED_INVESTOR_CO_BALANCE, 'Incorrect investor co token balance after investment');
            });

            it('Should receive correct invest amount', async () => {
                // EXPECTED_INVESTMENTS_AMOUNT = unlocking amount + investment amount
                const EXPECTED_INVESTMENTS_AMOUNT = '2000000000000000000'; // 2 ETH
                let totalDAIInvestments = await coInstance.totalDAIInvestments();
                assert(totalDAIInvestments.eq(EXPECTED_INVESTMENTS_AMOUNT), 'Incorrect investments amount after investment');
            });

            it('Should throw if an investor tries to invest with unapproved DAI amount', async () => {
                let investorWithoutDAI = accounts[3].signer;
                await assert.revert(coInstance.from(investorWithoutDAI).invest(ONE_ETH), 'An investment has been processed with unapproved DAI amount');
            });

        });

        describe('Revoke Investment', function () {

            beforeEach(async () => {
                await coInstance.unlockOrganisation(UNLOCK_AMOUNT);
                await coInstance.from(INVESTOR).invest(INVESTMENT_AMOUNT, {
                    gasLimit: 300000
                });
            });

            it('Should sell MGL Tokens for ~ 80% less of their buying price', async () => {
                let mglTokens = await coTokenInstance.balanceOf(INVESTOR.address);

                let organisationCoTokenBalance = await coTokenInstance.totalSupply();
                let reserveBalance = await CODAIInstance.balanceOf(coInstance.contractAddress);

                let expectedDai = sellCalc(organisationCoTokenBalance, reserveBalance, mglTokens);

                await coTokenInstance.approve(coInstance.contractAddress, mglTokens);
                await coInstance.from(INVESTOR).revokeInvestment(mglTokens);


                let daiBalance = await CODAIInstance.balanceOf(INVESTOR.address);

                let normalizedDAIBalance = (daiBalance / normalization).toFixed(6);
                let expectedBalance = (expectedDai / normalization).toFixed(6);

                assert.strictEqual(normalizedDAIBalance, expectedBalance);
            });

            it('Should sell MGL Tokens on profit after some investments', async () => {
                let mglTokens = await coTokenInstance.balanceOf(INVESTOR.address);

                let randomInvestment = "40000000000000000000";
                await contractInitializator.mintDAI(CODAIInstance, OWNER.address, randomInvestment);
                await CODAIInstance.from(OWNER).approve(coInstance.contractAddress, randomInvestment);

                await coInstance.from(OWNER).invest(randomInvestment, {
                    gasLimit: 300000
                });

                await coTokenInstance.approve(coInstance.contractAddress, mglTokens);
                await coInstance.from(INVESTOR).revokeInvestment(mglTokens);

                let daiBalance = await CODAIInstance.balanceOf(INVESTOR.address);

                let normDaiBalance = (daiBalance / normalization).toFixed(6);

                assert(1 <= normDaiBalance, "tokens are not sold on profit");
            });

            it('Should revert if one tries to sell unapproved tokens', async () => {
                let tokens = "414213562299999999";
                await assert.revert(coInstance.from(INVESTOR).revokeInvestment(tokens));

            });

            it("Should revert if one tries to sell tokens that he doesn't have", async () => {
                let tokens = "414213562299999999";
                await assert.revert(coInstance.from(OWNER).revokeInvestment(tokens));
            });
        })

    });
});
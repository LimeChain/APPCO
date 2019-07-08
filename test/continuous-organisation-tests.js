const etherlime = require('etherlime-lib');
const { buyCalc, sellCalc } = require('./utils/token-price-calculation');
const contractInitializator = require('./utils/contract-initializator');

describe('Continuous Organisation Contract', () => {

    const deployer = new etherlime.EtherlimeGanacheDeployer();

    const OWNER = accounts[0].signer;
    const INVESTOR = accounts[1].signer;
    const REPAYER = accounts[2].signer;
    let votingContract;

    const INITIAL_COTOKEN_SUPPLY = "1000000000000000000";

    const ONE_ETH = "1000000000000000000";
    const TWO_ETH = "2000000000000000000";
    const normalization = 1000000000000000000;

    const INVESTMENT_AMOUNT = ONE_ETH;
    const UNLOCK_AMOUNT = "500000000000000000000";
    const UNLOCK_MINT = "499000000000000000000";

    const DOUBLE_UNLOCK_AMOUNT = "1000000000000000000000";

    let CODAIInstance;
    let coTokenInstance;
    let tokenSQRTInstance;

    let coInstance;


    describe('Continuous Organisation Contract', function () {

        beforeEach(async () => {
            CODAIInstance = await contractInitializator.deployCODAI();

            coInstance = await contractInitializator.deployContinuousOrganisation(CODAIInstance);

            coTokenInstance = await contractInitializator.getCoToken(coInstance, INVESTOR);

            // Mint and Approve 500 DAI in order to unlock the organization
            await contractInitializator.mintDAI(CODAIInstance, OWNER.address, UNLOCK_AMOUNT);
            await contractInitializator.approveDAI(CODAIInstance, OWNER, coInstance.contractAddress, UNLOCK_AMOUNT);

            await contractInitializator.mintDAI(CODAIInstance, INVESTOR.address, ONE_ETH);
            await contractInitializator.approveDAI(CODAIInstance, INVESTOR, coInstance.contractAddress, ONE_ETH);

        });

        it('Should have no tokens and no DAI', async () => {
            let expectedBalance = "0";
            let organisationDaiBalance = await CODAIInstance.balanceOf(coInstance.contractAddress);
            let organisationTokenBalance = await coTokenInstance.balanceOf(coInstance.contractAddress);
            assert(organisationDaiBalance.eq(expectedBalance), 'Organisation DAI balance is incorrect before unlocking');
            assert(organisationTokenBalance.eq(expectedBalance), 'Organisation COToken balance is incorrect before unlocking');
        });

        describe('Unlocking', function () {

            beforeEach(async () => {

                tokenSQRTInstance = await contractInitializator.deployTokenSQRT();

            });

            it('Should unlock the organisation', async () => {
                let expectedBalance = "100000000000000000000"; // 20% from 500 DAI = 100 DAI

                await coInstance.unlockOrganisation(UNLOCK_AMOUNT, UNLOCK_MINT, tokenSQRTInstance.contractAddress);
                let organisationBalance = await CODAIInstance.balanceOf(coInstance.contractAddress);
                assert(organisationBalance.eq(expectedBalance), 'Organisation balance is incorrect after unlocking');
            });

            it('Should throw on re-unlocking', async () => {
                await coInstance.unlockOrganisation(UNLOCK_AMOUNT, UNLOCK_MINT, tokenSQRTInstance.contractAddress);
                await assert.revert(coInstance.unlockOrganisation(UNLOCK_AMOUNT, UNLOCK_MINT, tokenSQRTInstance.contractAddress), 'Re-unlocking of an organisation did not throw');
            });

            it('Should throw if an unlocker tries to unlock with unapproved DAI amount', async () => {
                await assert.revert(coInstance.unlockOrganisation(DOUBLE_UNLOCK_AMOUNT, UNLOCK_MINT, tokenSQRTInstance.contractAddress), 'Organisation has been unlocked with unapproved DAI amount');
            });

            it('Should throw if one tries to invest in non-unlocked organisation', async () => {
                await assert.revert(coInstance.from(INVESTOR).invest(ONE_ETH), 'An investment has been processed for a non-unlocked organisation');
            });
        });

        describe('Investment', function () {
            beforeEach(async () => {
                tokenSQRTInstance = await contractInitializator.deployTokenSQRT();
                await coInstance.unlockOrganisation(UNLOCK_AMOUNT, UNLOCK_MINT, tokenSQRTInstance.contractAddress);
                await coInstance.from(INVESTOR).invest(INVESTMENT_AMOUNT, {
                    gasLimit: 300000
                });
                votingContract = await coInstance.votingContract();
            });

            it('should send correct dai amount to the voting contract', async () => {
                const EXPECTED_BANK_BALANCE = '400800000000000000000'; // 400 DAI + 0.8 DAI
                let bankBalance = await CODAIInstance.balanceOf(votingContract);
                assert(bankBalance.eq(EXPECTED_BANK_BALANCE), 'Incorrect bank balance after investment');
            });

            it('should send correct dai amount to the reserve', async () => {

                const EXPECTED_RESERVE_BALANCE = '100200000000000000000'; // 100 DAI + 0.2 DAI
                let reserveBalance = await CODAIInstance.balanceOf(coInstance.contractAddress);
                assert(reserveBalance.eq(EXPECTED_RESERVE_BALANCE), 'Incorrect reserve balance after investment');
            });

            it('should send correct amount co tokens to the investor', async () => {
                const EXPECTED_INVESTOR_CO_BALANCE = (buyCalc(UNLOCK_MINT, UNLOCK_AMOUNT, INVESTMENT_AMOUNT) / normalization).toFixed(7);
                let investorCoTokenBalance = await coTokenInstance.balanceOf(INVESTOR.address);
                investorCoTokenBalance = (Number(investorCoTokenBalance.toString()) / normalization).toFixed(7);

                assert.strictEqual(investorCoTokenBalance, EXPECTED_INVESTOR_CO_BALANCE, 'Incorrect investor co token balance after investment');
            });

            it('Should receive correct invest amount', async () => {
                const EXPECTED_INVESTMENTS_AMOUNT = '501000000000000000000'; // 501 DAI
                let totalDAIInvestments = await coInstance.totalInvestmentsAndDividents();
                assert(totalDAIInvestments.eq(EXPECTED_INVESTMENTS_AMOUNT), 'Incorrect investments amount after investment');
            });

            it('Should throw if an investor tries to invest with unapproved DAI amount', async () => {
                let investorWithoutDAI = accounts[3].signer;
                await assert.revert(coInstance.from(investorWithoutDAI).invest(ONE_ETH), 'An investment has been processed with unapproved DAI amount');
            });

        });

        describe('Exit Investment', function () {

            beforeEach(async () => {
                tokenSQRTInstance = await contractInitializator.deployTokenSQRT();
                await coInstance.unlockOrganisation(UNLOCK_AMOUNT, UNLOCK_MINT, tokenSQRTInstance.contractAddress);
                await coInstance.from(INVESTOR).invest(INVESTMENT_AMOUNT, {
                    gasLimit: 300000
                });
            });

            it('Should sell CO Tokens for ~ 80% less of their buying price', async () => {
                let coTokens = await coTokenInstance.balanceOf(INVESTOR.address);

                let organisationCoTokenBalance = await coTokenInstance.totalSupply();
                let reserveBalance = await CODAIInstance.balanceOf(coInstance.contractAddress);

                let expectedDai = sellCalc(organisationCoTokenBalance, reserveBalance, coTokens);

                await coTokenInstance.approve(coInstance.contractAddress, coTokens);
                await coInstance.from(INVESTOR).exit(coTokens);


                let daiBalance = await CODAIInstance.balanceOf(INVESTOR.address);

                let normalizedDAIBalance = (daiBalance / normalization).toFixed(6);
                let expectedBalance = (expectedDai / normalization).toFixed(6);

                assert.strictEqual(normalizedDAIBalance, expectedBalance);
            });

            it('Should sell CO Tokens on loss on immediate sell', async () => {
                let coTokens = await coTokenInstance.balanceOf(INVESTOR.address);

                let daiBalance = await CODAIInstance.balanceOf(INVESTOR.address);

                await coTokenInstance.approve(coInstance.contractAddress, coTokens);
                await coInstance.from(INVESTOR).exit(coTokens);

                daiBalance = await CODAIInstance.balanceOf(INVESTOR.address);

                assert(daiBalance.lt(INVESTMENT_AMOUNT), "tokens are not sold on profit");
            });

            it('Should sell CO Tokens on profit after some investments', async () => {
                let coTokens = await coTokenInstance.balanceOf(INVESTOR.address);

                let daiBalance = await CODAIInstance.balanceOf(INVESTOR.address);

                let randomBigInvestment = "40000000000000000000000"; // 4000 DAI
                await contractInitializator.mintDAI(CODAIInstance, OWNER.address, randomBigInvestment);
                await CODAIInstance.from(OWNER).approve(coInstance.contractAddress, randomBigInvestment);

                await coInstance.from(OWNER).invest(randomBigInvestment, {
                    gasLimit: 300000
                });

                await coTokenInstance.approve(coInstance.contractAddress, coTokens);
                await coInstance.from(INVESTOR).exit(coTokens);

                daiBalance = await CODAIInstance.balanceOf(INVESTOR.address);

                assert(daiBalance.gt(INVESTMENT_AMOUNT), "tokens are not sold on profit");
            });

            it('Should revert if one tries to sell unapproved tokens', async () => {
                let tokens = "414213562299999999";
                await assert.revert(coInstance.from(INVESTOR).exit(tokens));

            });

            it("Should revert if one tries to sell tokens that he doesn't have", async () => {
                let tokens = "414213562299999999";
                await assert.revert(coInstance.from(OWNER).exit(tokens));
            });
        })

        describe('Paying dividents', function () {

            beforeEach(async () => {
                tokenSQRTInstance = await contractInitializator.deployTokenSQRT();
                await coInstance.unlockOrganisation(UNLOCK_AMOUNT, UNLOCK_MINT, tokenSQRTInstance.contractAddress);
                await coInstance.from(INVESTOR).invest(INVESTMENT_AMOUNT, {
                    gasLimit: 300000
                });

                await contractInitializator.mintDAI(CODAIInstance, REPAYER.address, ONE_ETH);
                await contractInitializator.approveDAI(CODAIInstance, REPAYER.address, coInstance.contractAddress, ONE_ETH);
            });

            it('Should lower COToken returned on investment after paying dividents', async () => {

                const coTokensPerInvestmentBefore = await coInstance.COTokensForInvestment(INVESTMENT_AMOUNT);

                await coInstance.from(REPAYER).payDividents(ONE_ETH, {
                    gasLimit: 300000
                });

                const coTokensPerInvestmentAfter = await coInstance.COTokensForInvestment(INVESTMENT_AMOUNT);

                assert(coTokensPerInvestmentAfter.lt(coTokensPerInvestmentBefore), "The tokens received after dividents repayment were not less than before")

            });

            it('Should receive more DAI on COToken exit after paying dividents', async () => {

                let coTokens = await coTokenInstance.balanceOf(INVESTOR.address);

                const DAIReturnedForInvestmentBefore = await coInstance.DAIOnExit(coTokens)

                await coInstance.from(REPAYER).payDividents(ONE_ETH, {
                    gasLimit: 300000
                });

                await coTokenInstance.approve(coInstance.contractAddress, coTokens);
                await coInstance.from(INVESTOR).exit(coTokens);

                const DAIReturnedForInvestmentAfter = await coInstance.DAIOnExit(coTokens)

                assert(DAIReturnedForInvestmentAfter.gt(DAIReturnedForInvestmentBefore), "The DAI received after exit was not more than before dividents payout")

            });

            it('Should revert if one tries to repay with unapproved DAI', async () => {
                await contractInitializator.mintDAI(CODAIInstance, REPAYER.address, ONE_ETH);
                await assert.revert(coInstance.from(REPAYER).payDividents(TWO_ETH, {
                    gasLimit: 300000
                }));

            });

            it("Should revert if one tries to repay DAI that he doesn't have", async () => {
                await assert.revert(coInstance.from(REPAYER).payDividents(TWO_ETH, {
                    gasLimit: 300000
                }));
            });
        })

    });
});
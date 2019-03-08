// const etherlime = require('etherlime');
// const { buyCalc, buyCalc1 } = require('./utils/token-price-calculation');

// const MogulDAI = require('./../build/MogulDAI');
// const MovieToken = require('./../build/MovieToken');
// const MogulToken = require('./../build/MogulToken');

// const SQRT = require('./../contracts/Math/SQRT.json');
// const BondingMathematics = require('./../build/BondingMathematics');

// const MogulOrganisation = require('./../build/MogulOrganisation');

// describe('Mogul Organisation Contract', function () {

//     const deployer = new etherlime.EtherlimeGanacheDeployer();

//     const OWNER = accounts[0].signer;
//     const INVESTOR = accounts[1].signer;
//     const MOGUL_BANK = accounts[9].signer.address;

//     const mglOrgDaiSupply = "500000000000000000";
//     const INITIAL_MOGUL_SUPPLY = "1000000000000000000";

//     const ONE_ETH = "1000000000000000000";
//     const TWO_ETH = "2000000000000000000";

//     let sqrtContractAddress;
//     let bondingMathematicsInstance;

//     let mogulDAIInstance;
//     let movieTokenInstance;
//     let mogulTokenInstance;

//     let mogulOrganisationInstance;

//     async function deployTokensSQRT() {
//         let tx = await OWNER.sendTransaction({
//             data: SQRT.bytecode
//         });
//         sqrtContractAddress = (await OWNER.provider.getTransactionReceipt(tx.hash)).contractAddress;
//     }

//     async function deployContracts() {
//         await deployTokensSQRT();
//         bondingMathematicsInstance = await deployer.deploy(BondingMathematics, {}, sqrtContractAddress);
//         mogulDAIInstance = await deployer.deploy(MogulDAI);
//         movieTokenInstance = await deployer.deploy(MovieToken);

//         mogulOrganisationInstance = await deployer.deploy(MogulOrganisation, {},
//             bondingMathematicsInstance.contractAddress,
//             mogulDAIInstance.contractAddress,
//             movieTokenInstance.contractAddress,
//             MOGUL_BANK);

//         let mogulTokenAddress = await mogulOrganisationInstance.mogulToken();
//         mogulTokenInstance = new ethers.Contract(mogulTokenAddress, MogulToken.abi, OWNER);

//         // Mint and Approve 1 ETH in order to unlock the organization
//         await mintDAI(OWNER.address, ONE_ETH);
//         await approveDAI(OWNER, mogulOrganisationInstance.contractAddress, ONE_ETH);

//         await movieTokenInstance.addMinter(mogulOrganisationInstance.contractAddress);
//     }

//     async function mintDAI(addr, amount) {
//         await mogulDAIInstance.mint(addr, amount)
//     }

//     async function approveDAI(approver, to, amount) {
//         await mogulDAIInstance.from(approver).approve(to, amount)
//     }

//     this.timeout(20000000);
//     describe('Invest', function () {
//         it('Should invest', async function () {
//             await deployContracts();
//             const HUNDRED_ETH = '100000000000000000000';
//             await mintDAI(INVESTOR.address, HUNDRED_ETH);

//             const INVESTMENT_AMOUNT = ONE_ETH;
//             const UNLOCK_AMOUNT = ONE_ETH;



//             // Approve 1 ETH for investment
//             await approveDAI(INVESTOR, mogulOrganisationInstance.contractAddress, HUNDRED_ETH);

//             await mogulOrganisationInstance.unlockOrganisation(UNLOCK_AMOUNT);

//             for (let i = 0; i < 3; i++) {
//                 await mogulOrganisationInstance.from(INVESTOR).invest('3000000000000000000', {
//                     gasLimit: 300000
//                 });
//             }

//             let investorMogulBalance = await mogulTokenInstance.balanceOf(INVESTOR.address);
//             console.log(investorMogulBalance.toString());

//             // const EXPECTED_INVESTOR_MOGUL_BALANCE1 = (buyCalc(1000000000000000000)).toString();
//             // console.log(EXPECTED_INVESTOR_MOGUL_BALANCE1);

//             await deployContracts();
//             await mintDAI(INVESTOR.address, HUNDRED_ETH);
//             await approveDAI(INVESTOR, mogulOrganisationInstance.contractAddress, HUNDRED_ETH);
//             await mogulOrganisationInstance.unlockOrganisation(UNLOCK_AMOUNT);

//             let tx = await mogulOrganisationInstance.from(INVESTOR).invest('9000000000000000000', {
//                 gasLimit: 300000
//             });

//             investorMogulBalance = await mogulTokenInstance.balanceOf(INVESTOR.address);
//             console.log(investorMogulBalance.toString());

//             const EXPECTED_INVESTOR_MOGUL_BALANCE = (buyCalc1(ONE_ETH, ONE_ETH, '9000000000000000000')).toString();
//             console.log(EXPECTED_INVESTOR_MOGUL_BALANCE);

//             // // 219500
//             // const result = await mogulOrganisationInstance.verboseWaitForTransaction(tx, 'Transfer Ownership');
//             // console.log(result.gasUsed.toString());

//             // const EXPECTED_BANK_BALANCE = '800000000000000000'; // 0.8 ETH
//             // let bankBalance = await mogulDAIInstance.balanceOf(MOGUL_BANK);
//             // assert(bankBalance.eq(EXPECTED_BANK_BALANCE), 'Incorrect bank balance after investment');


//             // const EXPECTED_RESERVE_BALANCE = '1200000000000000000'; // 1.2 ETH (Unlocking + investment)
//             // let reserveBalance = await mogulDAIInstance.balanceOf(mogulOrganisationInstance.contractAddress);
//             // assert(reserveBalance.eq(EXPECTED_RESERVE_BALANCE), 'Incorrect reserve balance after investment');


//             // // normalization is because of 18 decimals of mogul token
//             // investorMogulBalance = await mogulTokenInstance.balanceOf(INVESTOR.address);
//             // console.log(investorMogulBalance.toString());

//             // const EXPECTED_INVESTOR_MOGUL_BALANCE = (buyCalc1(ONE_ETH, ONE_ETH, HUNDRED_ETH)).toString();
//             // console.log(EXPECTED_INVESTOR_MOGUL_BALANCE);


//             // Rounding Error of 200 wei a.k.a 0.000000000000000200
//             // assert.strictEqual(investorMogulBalance.add(200).toString(), EXPECTED_INVESTOR_MOGUL_BALANCE, 'Incorrect investor mogul balance after investment');


//             // // 1:10 = mogul:movie token
//             // let EXPECTED_INVESTOR_MOVIE_BALANCE = investorMogulBalance.mul(10);
//             // let investorMovieBalance = await movieTokenInstance.balanceOf(INVESTOR.address);

//             // assert(investorMovieBalance.eq(EXPECTED_INVESTOR_MOVIE_BALANCE), 'Incorrect investor movie balance after investment');


//             // // EXPECTED_INVESTMENTS_AMOUNT = unlocking amount + investment amount
//             // const EXPECTED_INVESTMENTS_AMOUNT = '2000000000000000000'; // 2 ETH
//             // let totalDAIInvestments = await mogulOrganisationInstance.totalDAIInvestments();
//             // assert(totalDAIInvestments.eq(EXPECTED_INVESTMENTS_AMOUNT), 'Incorrect investments amount after investment');
//         });

//         it('Should throw if one tries to invest in non-unlocked organisation', async () => {
//             await deployContracts();
//             await mintDAI(INVESTOR.address, ONE_ETH);
//             await approveDAI(INVESTOR, mogulOrganisationInstance.contractAddress, ONE_ETH);

//             await assert.revert(mogulOrganisationInstance.from(INVESTOR).invest(ONE_ETH), 'An investment has been processed for a non-unlocked organisation');
//         });

//         it('Should throw if an investor tries to invest with unapproved DAI amount', async () => {
//             await deployContracts();

//             await assert.revert(mogulOrganisationInstance.from(INVESTOR).invest(ONE_ETH), 'An investment has been processed with unapproved DAI amount');
//         });
//     });

//     describe('Unlock', function () {
//         it('Should unlock the organisation', async () => {
//             await deployContracts();

//             await mogulOrganisationInstance.unlockOrganisation(ONE_ETH);

//             let organisationBalance = await mogulDAIInstance.balanceOf(mogulOrganisationInstance.contractAddress);
//             assert(organisationBalance.eq(ONE_ETH), 'Organisation balance is incorrect after unlocking');
//         });

//         it('Should throw on re-unlocking', async () => {
//             await deployContracts();

//             await mogulOrganisationInstance.unlockOrganisation(ONE_ETH);

//             await assert.revert(mogulOrganisationInstance.unlockOrganisation(ONE_ETH), 'Re-unlocking of an organisation did not throw');
//         });

//         it('Should throw if an unlocker tries to unlock with unapproved DAI amount', async () => {
//             await deployContracts();

//             // In 'deployContracts' only 1 ether is approved for unlocking
//             await assert.revert(mogulOrganisationInstance.unlockOrganisation(TWO_ETH), 'Organisation has been unlocked with unapproved DAI amount');
//         });
//     });
// });
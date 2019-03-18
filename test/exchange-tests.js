const etherlime = require('etherlime');
const deployer = new etherlime.EtherlimeGanacheDeployer();

const DAIToken = require('./../build/MogulDAI');
const DAIExchange = require('./../build/DAIExchange');

describe('DAI Exchange Contract', () => {

    const OWNER = accounts[0].signer;
    const EXCHANGER = accounts[1].signer;

    const EXCHANGE_AMOUNT = '0xDE0B6B3A7640000'; // 1 ETH
    const DAI_RESERVE = '1000000000000000000000'; // 1000 DAI tokens
    const EXCHANGE_RATE = '13813'; // 1 ETH = 138.13 DAI tokens

    let exchangeContract;
    let daiTokenContract;

    beforeEach(async () => {
        daiTokenContract = await deployer.deploy(DAIToken, {});
        exchangeContract = await deployer.deploy(DAIExchange, {}, daiTokenContract.contractAddress);

        await daiTokenContract.addMinter(exchangeContract.contractAddress);
    });

    it('Should initialize the contract correctly', async () => {
        let daiToken = await exchangeContract.daiToken();
        assert.equal(daiToken, daiTokenContract.contractAddress, 'DAI token address was not set properly');
    });

    it('Should exchange successfully', async () => {
        await exchangeContract.from(EXCHANGER).exchange(EXCHANGE_RATE, { value: EXCHANGE_AMOUNT, gasLimit: 300000 });

        let exchangerBalance = await daiTokenContract.balanceOf(EXCHANGER.address);
        assert(exchangerBalance.div('10000000000000000').eq(EXCHANGE_RATE), 'Incorrect exchanger DAI balance');
    });

    it('Should withdraw ethers successfully', async () => {
        await exchangeContract.from(EXCHANGER).exchange(EXCHANGE_RATE, { value: EXCHANGE_AMOUNT, gasLimit: 300000 });

        let ownerBalanceBeforeWithdraw = await OWNER.getBalance();
        await exchangeContract.withdrawETH({ gasLimit: 300000 });
        let ownerBalanceAfterWithdraw = await OWNER.getBalance();

        assert(ownerBalanceBeforeWithdraw.lt(ownerBalanceAfterWithdraw), 'Owner balance after withdraw is lower than before');

        let exchangeContractBalance = await exchangeContract.provider.getBalance(exchangeContract.contractAddress);
        assert(exchangeContractBalance.eq(0), 'Incorrect exchange contract balance after ethers withdraw');
    });
});

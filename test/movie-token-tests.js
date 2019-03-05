const etherlime = require('etherlime');

const MovieToken = require('./../build/MovieToken');

describe('Movie Token Contract', () => {

    const OWNER = accounts[0].signer.address;

    const TOKEN_NAME = 'Mogul Movie Coin';
    const TOKEN_SYMBOL = 'MGLMC';
    const TOKEN_DECIMALS = 18;

    it('Should initialize the contract correctly', async () => {
        let deployer = new etherlime.EtherlimeGanacheDeployer();
        let movieTokenContract = await deployer.deploy(MovieToken, {});

        let tokenName = await movieTokenContract.name();
        let tokenSymbol = await movieTokenContract.symbol();
        let tokenDecimals = await movieTokenContract.decimals();
        let isMinter = await movieTokenContract.isMinter(OWNER);

        assert.equal(tokenName, TOKEN_NAME, 'Token name is incorrect');
        assert.equal(tokenSymbol, TOKEN_SYMBOL, 'Token symbol is incorrect');
        assert.equal(tokenDecimals, TOKEN_DECIMALS, 'Token decimal is incorrect');
        assert(isMinter, 'Owner is not a minter');
    });
});
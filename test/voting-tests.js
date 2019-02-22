const etherlime = require('etherlime');

const Voting = require('./../build/Voting');
const MovieToken = require('./../build/MovieToken');

describe('Voting Contract', () => {

    const OWNER = accounts[0].wallet.address;
    const VOTER_ONE = accounts[1].wallet.address;
    const VOTER_TWO = accounts[2].wallet.address;

    const MOVIES = [
        '0x4d6f76696531', // Movie1
        '0x4d6f76696532', // Movie2
        '0x4d6f76696533', // Movie3
        '0x4d6f76696534', // Movie4
        '0x4d6f76696535'  // Movie5
    ];

    let voteContract;
    let movieTokenContract;


    describe('Initialization', function () {
        it('Should initialize the contract correctly', async () => {
            let deployer = new etherlime.EtherlimeGanacheDeployer();

            movieTokenContract = (await deployer.deploy(MovieToken, {})).contract;

            let approximateStartDate = new Date(Date.now());
            let approximateStartDate = approximateStartDate.setMinutes(approximateStartDate.getMinutes() + 1);

            voteContract = await deployer.deploy(Voting, {}, movieTokenContract.address, MOVIES);

            let votingMovies = await contract.movies();

            for (let i = 0; i < votingMovies.length; i++) {
                assert.equal(votingMovies[i], MOVIES[i], 'Incorrect movie');
            }

            let tokenContract = await voteContract.movieTokenContract();
            assert.equal(tokenContract, movieTokenContract.address, 'Incorrect movie token');

            let votingStartDate = await voteContract.startDate();
            assert(approximateStartDate < votingStartDate < new Date(approximateStartDate).setMinutes());
        });

        it('Should throw if one provide empty movie token address', async () => {

        });

        it('Should throw if provided movies\'s count is bigger than 5', async () => {

        });
    });

    describe('Voting', function () {

        beforeEach(async () => {
            let deployer = new etherlime.EtherlimeGanacheDeployer();

            movieTokenContract = await deployer.deploy(MovieToken, {});
            voteContract = await deployer.deploy(Voting, {}, continuousRate, raisingWallet);
        });

        it('Should vote with different votes amount correctly', async () => {

        });

        it('Should throw if voting period is expired', async () => {

        });

        it('Should throw if one tries to vote for more than one movie', async () => {

        });

        it('Should throw if one does not approve required tokens amount for votes', async () => {

        });

        it('Should throw if ', async () => {

        });
    });
});
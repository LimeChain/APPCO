const ethers = require('ethers');
const etherlime = require('etherlime');

const Voting = require('./../build/Voting');
const TokensSQRT = require('./../contracts/Math/TokensSQRT.json');

const MovieToken = require('./../build/MovieToken');

describe('Voting Contract', () => {

    const OWNER = accounts[0].signer;
    const VOTER_ONE = accounts[1].signer;
    const VOTER_TWO = accounts[2].signer;

    const MOVIES = [
        '0x4d6f766965310000000000000000000000000000000000000000000000000000', // Movie1
        '0x4d6f766965320000000000000000000000000000000000000000000000000000', // Movie2
        '0x4d6f766965330000000000000000000000000000000000000000000000000000', // Movie3
        '0x4d6f766965340000000000000000000000000000000000000000000000000000', // Movie4
        '0x4d6f766965350000000000000000000000000000000000000000000000000000'  // Movie5
    ];

    let sqrtContractAddress;
    let votingContract;
    let movieTokenContract;

    let deployer = new etherlime.EtherlimeGanacheDeployer();


    async function deployMovieToken() {
        movieTokenContract = (await deployer.deploy(MovieToken, {})).contract;
    }

    async function deployTokensSQRT() {
        let tx = await OWNER.sendTransaction({
            data: TokensSQRT.bytecode
        });

        sqrtContractAddress = (await OWNER.provider.getTransactionReceipt(tx.hash)).contractAddress;
    }

    async function deployVoting() {
        votingContract = (await deployer.deploy(Voting, {}, movieTokenContract.address, MOVIES, sqrtContractAddress)).contract;
    }

    describe('Initialization', function () {
        it('Should initialize the contract correctly', async () => {

            // 14 days
            const VOTING_DURATION = 24 * 60 * 60 * 14;

            await deployMovieToken();
            await deployTokensSQRT();

            let startDate = Date.now() / 1000 | 0;
            await deployVoting();


            for (let i = 0; i < MOVIES.length; i++) {
                let movieInitialRating = await votingContract.movies(MOVIES[i]);
                assert.equal(movieInitialRating, 1, 'Incorrect movie');
            }

            let tokenContract = await votingContract.movieTokenInstance();
            assert.equal(tokenContract, movieTokenContract.address, 'Incorrect movie token');

            let sqrtContract = await votingContract.sqrtInstance();
            assert.equal(sqrtContract, sqrtContractAddress, 'Incorrect sqrt instance');

            let votingExpirationDate = (await votingContract.expirationDate());
            let expectedExpirationDate = startDate + VOTING_DURATION;

            assert(votingExpirationDate.eq(expectedExpirationDate), 'Expiration date is not correct');
        });

        it('Should throw if one provide empty movie token address', async () => {

        });

        it('Should throw if provided movies\'s count is bigger than 5', async () => {

        });
    });

    describe('Voting', function () {

        beforeEach(async () => {
            await deployMovieToken();
            await deployTokensSQRT();
            await deployVoting();
        });

        it.only('Should vote with different votes amount correctly', async () => {
            const TOKENS_AMOUNT = '5269871000000000000000000';
            await movieTokenContract.mint(VOTER_ONE.address, TOKENS_AMOUNT);


            let tokenContractVoter = new ethers.Contract(movieTokenContract.address, MovieToken.abi, VOTER_ONE);
            await tokenContractVoter.approve(votingContract.address, TOKENS_AMOUNT);

            let votingContractVoter = new ethers.Contract(votingContract.address, Voting.abi, VOTER_ONE);
            await votingContractVoter.vote(MOVIES[0]);

            let movieRating = await votingContract.movies(MOVIES[0]);
            console.log(movieRating.toString());

        });

        it('Should throw if voting period is expired', async () => {

        });

        it('Should throw if one tries to vote for more than one movie', async () => {

        });

        it('Should throw if one does not approve required tokens amount for votes', async () => {

        });
    });
});
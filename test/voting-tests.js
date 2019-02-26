const etherlime = require('etherlime');

const Voting = require('./../build/Voting');
const TokensSQRT = require('./../contracts/Math/TokensSQRT.json');

const MovieToken = require('./../build/MovieToken');

describe('Voting Contract', () => {

    const OWNER = accounts[0].signer;
    const VOTER = accounts[1].signer;

    // 10000 days for POC version
    const VOTING_DURATION = 24 * 60 * 60 * 10000;

    const MOVIES = [
        '0x4d6f766965310000000000000000000000000000000000000000000000000000', // Movie1
        '0x4d6f766965320000000000000000000000000000000000000000000000000000', // Movie2
        '0x4d6f766965330000000000000000000000000000000000000000000000000000', // Movie3
        '0x4d6f766965340000000000000000000000000000000000000000000000000000', // Movie4
        '0x4d6f766965350000000000000000000000000000000000000000000000000000'  // Movie5
    ];

    let votingContract;
    let movieTokenContract;
    let sqrtContractAddress;

    let deployer = new etherlime.EtherlimeGanacheDeployer();

    async function deployMovieToken() {
        movieTokenContract = await deployer.deploy(MovieToken, {});
    }

    async function deployTokensSQRT() {
        let tx = await OWNER.sendTransaction({
            data: TokensSQRT.bytecode
        });

        sqrtContractAddress = (await OWNER.provider.getTransactionReceipt(tx.hash)).contractAddress;
    }

    async function deployVoting() {
        votingContract = await deployer.deploy(Voting, {}, movieTokenContract.contractAddress, MOVIES, sqrtContractAddress);
    }

    describe('Initialization', function () {
        it('Should initialize the contract correctly', async () => {

            const INITIAL_MOVIES_RATING = '1000000000000000000';

            await deployMovieToken();
            await deployTokensSQRT();

            let currentBlockNumber = await deployer.provider.getBlockNumber();
            let startDate = (await deployer.provider.getBlock(currentBlockNumber)).timestamp;

            await deployVoting();

            for (let i = 0; i < MOVIES.length; i++) {
                let movieInitialRating = await votingContract.movies(MOVIES[i]);
                assert(movieInitialRating.eq(INITIAL_MOVIES_RATING), 'Incorrect movie rating');
            }

            let tokenContract = await votingContract.movieTokenInstance();
            assert.equal(tokenContract, movieTokenContract.contractAddress, 'Incorrect movie token');

            let sqrtContract = await votingContract.sqrtInstance();
            assert.equal(sqrtContract, sqrtContractAddress, 'Incorrect sqrt instance');

            let votingExpirationDate = (await votingContract.expirationDate());
            let expectedExpirationDate = startDate + VOTING_DURATION;

            assert(votingExpirationDate.eq(expectedExpirationDate), 'Expiration date is not correct');
        });

        it('Should throw if one provide empty addresses', async () => {
            await deployTokensSQRT();
            await deployMovieToken();

            const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

            await assert.revert(deployer.deploy(Voting, {}, EMPTY_ADDRESS, MOVIES, sqrtContractAddress), 'Providing invalid movie token address did not throw');
            await assert.revert(deployer.deploy(Voting, {}, movieTokenContract.contractAddress, MOVIES, EMPTY_ADDRESS), 'Providing invalid sqrt contract address did not throw');
        });

        it('Should throw if the count of provided movies is bigger than 5', async () => {
            await deployMovieToken();
            await deployTokensSQRT();

            let incorrectMovies = JSON.parse(JSON.stringify(MOVIES));
            incorrectMovies.push('0x4d6f766965360000000000000000000000000000000000000000000000000000'); // Movie 6

            await assert.revert(deployer.deploy(Voting, {}, movieTokenContract.contractAddress, incorrectMovies, sqrtContractAddress), 'Providing more movies than allowed did not throw');
        });
    });

    describe('Voting', function () {

        beforeEach(async () => {
            await deployMovieToken();
            await deployTokensSQRT();
            await deployVoting();
        });

        it('Should vote correctly', async () => {
            const TOKENS_AMOUNT = '5269871000000000000'; // 5.269871 tokens

            await movieTokenContract.mint(VOTER.address, TOKENS_AMOUNT);
            await movieTokenContract.from(VOTER).approve(votingContract.contractAddress, TOKENS_AMOUNT);

            let vote = await votingContract.from(VOTER).vote(MOVIES[0]);

            let movieRating = await votingContract.movies(MOVIES[0]);

            // 3295619959800000000 is: 1 initial movie rating + 2.2956199598 tokens (sqrt of 5.269871)
            assert.equal(movieRating.toString(), '3295619959800000000', 'Incorrect movie rating');
        });

        it('Should throw if voting period is expired', async () => {
            const DAY = 60 * 60 * 24;
            utils.timeTravel(deployer.provider, VOTING_DURATION + DAY); // One day after the expiration date of voting 

            await assert.revert(votingContract.from(VOTER).vote(MOVIES[0]), 'Voting after the expiration date did not throw');
        });

        it('Should throw if a voter tries to vote with balance lower than the minimum required', async () => {
            await assert.revert(votingContract.from(VOTER).vote(MOVIES[0]), 'Voting with balance lower the the required one did not throw');
        });

        it('Should throw if one tries to vote for more than one movie', async () => {
            const TOKENS_AMOUNT = '1000000000000000000';

            await movieTokenContract.mint(VOTER.address, TOKENS_AMOUNT);
            await movieTokenContract.from(VOTER).approve(votingContract.contractAddress, TOKENS_AMOUNT);

            await votingContract.from(VOTER).vote(MOVIES[0]);

            // A voter could vote only with his whole balance of tokens
            // In order to vote again, he should buy more mogul tokens in order to get movie tokens
            await movieTokenContract.mint(VOTER.address, TOKENS_AMOUNT);
            await movieTokenContract.from(VOTER).approve(votingContract.contractAddress, TOKENS_AMOUNT);

            await assert.revert(votingContract.from(VOTER).vote(MOVIES[1]), 'Voting for more than one movie did not throw');
        });

        it('Should throw if one does not approve required tokens amount for votes', async () => {
            const TOKENS_AMOUNT = '1000000000000000000';
            await movieTokenContract.mint(VOTER.address, TOKENS_AMOUNT);

            await assert.revert(votingContract.from(VOTER).vote(MOVIES[0]), 'Voting without required approve did not throw');
        });
    });
});
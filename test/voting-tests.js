const etherlime = require('etherlime-lib');

const Voting = require('./../build/Voting');
const TokensSQRT = require('./../build/TokensSQRT.json');

const ERC20Mintable = require('./../build/ERC20Mintable');

describe('Voting Contract', function () {

    this.timeout(20000);

    const OWNER = accounts[0].signer;
    const VOTER = accounts[1].signer;

    // 10000 days for POC version
    const VOTING_DURATION = 24 * 60 * 60 * 10000;

    const PROPOSALS = [
        '0x4d6f766965310000000000000000000000000000000000000000000000000000', // Movie1
        '0x4d6f766965320000000000000000000000000000000000000000000000000000', // Movie2
        '0x4d6f766965330000000000000000000000000000000000000000000000000000', // Movie3
        '0x4d6f766965340000000000000000000000000000000000000000000000000000', // Movie4
        '0x4d6f766965350000000000000000000000000000000000000000000000000000'  // Movie5
    ];

    let votingContract;
    let ERC20MintableContract;
    let sqrtContractAddress;

    let deployer = new etherlime.EtherlimeGanacheDeployer();

    async function deployERC20Mintable() {
        ERC20MintableContract = await deployer.deploy(ERC20Mintable, {});
    }

    async function deployTokensSQRT() {

        sqrtContractAddress = (await deployer.deploy(TokensSQRT, {})).contractAddress;
    }

    async function deployVoting() {
        votingContract = await deployer.deploy(Voting, {}, ERC20MintableContract.contractAddress, PROPOSALS, sqrtContractAddress);
    }

    describe('Initialization', function () {
        it('Should initialize the contract correctly', async () => {

            const INITIAL_PROPOSALS_RATING = '1000000000000000000';

            await deployERC20Mintable();
            await deployTokensSQRT();

            let currentBlockNumber = await deployer.provider.getBlockNumber();
            let startDate = (await deployer.provider.getBlock(currentBlockNumber)).timestamp;

            await deployVoting();

            for (let i = 0; i < PROPOSALS.length; i++) {
                let movieInitialRating = await votingContract.proposals(PROPOSALS[i]);
                assert(movieInitialRating.eq(INITIAL_PROPOSALS_RATING), 'Incorrect movie rating');
            }

            let tokenContract = await votingContract.votingToken();
            assert.equal(tokenContract, ERC20MintableContract.contractAddress, 'Incorrect movie token');

            let sqrtContract = await votingContract.sqrtInstance();
            assert.equal(sqrtContract, sqrtContractAddress, 'Incorrect sqrt instance');

            let votingExpirationDate = (await votingContract.expirationDate());
            let expectedExpirationDate = startDate + VOTING_DURATION;

            assert(votingExpirationDate.eq(expectedExpirationDate), 'Expiration date is not correct');
        });

        it('Should throw if one provides empty addresses', async () => {
            await deployTokensSQRT();
            await deployERC20Mintable();

            const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

            await assert.revert(deployer.deploy(Voting, {}, EMPTY_ADDRESS, PROPOSALS, sqrtContractAddress), 'Providing invalid movie token address did not throw');
            await assert.revert(deployer.deploy(Voting, {}, ERC20MintableContract.contractAddress, PROPOSALS, EMPTY_ADDRESS), 'Providing invalid sqrt contract address did not throw');
        });

        it('Should throw if the count of provided PROPOSALS is bigger than 5', async () => {
            await deployERC20Mintable();
            await deployTokensSQRT();

            let incorrectPROPOSALS = JSON.parse(JSON.stringify(PROPOSALS));
            incorrectPROPOSALS.push('0x4d6f766965360000000000000000000000000000000000000000000000000000'); // Movie 6

            await assert.revert(deployer.deploy(Voting, {}, ERC20MintableContract.contractAddress, incorrectPROPOSALS, sqrtContractAddress), 'Providing more PROPOSALS than allowed did not throw');
        });
    });

    describe('Voting', function () {

        beforeEach(async () => {
            await deployERC20Mintable();
            await deployTokensSQRT();
            await deployVoting();
        });

        it('Should vote correctly', async () => {
            const TOKENS_AMOUNT = '5269871000000000000'; // 5.269871 tokens

            await ERC20MintableContract.mint(VOTER.address, TOKENS_AMOUNT);
            await ERC20MintableContract.from(VOTER).approve(votingContract.contractAddress, TOKENS_AMOUNT);

            await votingContract.from(VOTER).vote(PROPOSALS[0]);

            let movieRating = await votingContract.proposals(PROPOSALS[0]);

            // 3295619959800000000 is: 1 initial movie rating + 2.2956199598 tokens (sqrt of 5.269871)
            assert.equal(movieRating.toString(), '3295619959800000000', 'Incorrect movie rating');

            let voterStat = await votingContract.voters(VOTER.address);
            assert.equal(voterStat.rating.toString(), '2295619959800000000', 'Incorrect voter rating');
            assert.equal(voterStat.tokens.toString(), '5269871000000000000', 'Incorrect voter tokens');
        });

        it('Should vote correctly when one tries to vote one more time', async () => {
            const TOKENS_AMOUNT_FIRST_VOTE = '9000000000000000000'; // 9 tokens -> 9 tokens = 3 votes
            const TOKENS_AMOUNT_SECOND_VOTE = '7000000000000000000'; // 7 tokens -> 7 tokens = 1 vote

            // First vote
            await ERC20MintableContract.mint(VOTER.address, TOKENS_AMOUNT_FIRST_VOTE);
            await ERC20MintableContract.from(VOTER).approve(votingContract.contractAddress, TOKENS_AMOUNT_FIRST_VOTE);

            await votingContract.from(VOTER).vote(PROPOSALS[0]);

            let movieRating = await votingContract.proposals(PROPOSALS[0]);
            assert.equal(movieRating.toString(), '4000000000000000000', 'Incorrect movie rating after first vote');

            // Second vote
            await ERC20MintableContract.mint(VOTER.address, TOKENS_AMOUNT_SECOND_VOTE);
            await ERC20MintableContract.from(VOTER).approve(votingContract.contractAddress, TOKENS_AMOUNT_SECOND_VOTE);

            await votingContract.from(VOTER).vote(PROPOSALS[0]);

            movieRating = await votingContract.proposals(PROPOSALS[0]);
            assert.equal(movieRating.toString(), '5000000000000000000', 'Incorrect movie rating after second vote');

            let voterStat = await votingContract.voters(VOTER.address);
            assert.equal(voterStat.rating.toString(), '4000000000000000000', 'Incorrect voter rating');
            assert.equal(voterStat.tokens.toString(), '16000000000000000000', 'Incorrect voter tokens');
        });

        it('Should throw if voting period is expired', async () => {
            const DAY = 60 * 60 * 24;
            utils.timeTravel(deployer.provider, VOTING_DURATION + DAY); // One day after the expiration date of voting 

            await assert.revert(votingContract.from(VOTER).vote(PROPOSALS[0]), 'Voting after the expiration date did not throw');
        });

        it('Should throw if a voter tries to vote with balance lower than the minimum required', async () => {
            await assert.revert(votingContract.from(VOTER).vote(PROPOSALS[0]), 'Voting with balance lower the the required one did not throw');
        });

        it('Should throw if one tries to vote for more than one movie', async () => {
            const TOKENS_AMOUNT = '1000000000000000000';

            await ERC20MintableContract.mint(VOTER.address, TOKENS_AMOUNT);
            await ERC20MintableContract.from(VOTER).approve(votingContract.contractAddress, TOKENS_AMOUNT);

            await votingContract.from(VOTER).vote(PROPOSALS[0]);

            // A voter could vote only with his whole balance of tokens
            // In order to vote again, he should buy more mogul tokens in order to get movie tokens
            await ERC20MintableContract.mint(VOTER.address, TOKENS_AMOUNT);
            await ERC20MintableContract.from(VOTER).approve(votingContract.contractAddress, TOKENS_AMOUNT);

            await assert.revert(votingContract.from(VOTER).vote(PROPOSALS[1]), 'Voting for more than one movie did not throw');
        });

        it('Should throw if one does not approve required tokens amount for votes', async () => {
            const TOKENS_AMOUNT = '1000000000000000000';
            await ERC20MintableContract.mint(VOTER.address, TOKENS_AMOUNT);

            await assert.revert(votingContract.from(VOTER).vote(PROPOSALS[0]), 'Voting without required approve did not throw');
        });
    });
});

const etherlime = require('etherlime-lib');
const ethers = require('ethers');

const COToken = require('./../build/COToken');
const TokensSQRT = require('./../build/TokensSQRT.json');
const CategoryVoting = require('./../build/CategoryVoting');

describe('Category Voting Contract', function () {

	this.timeout(20000);

	const OWNER = accounts[0].signer;
	const FINALIZER = accounts[6].signer;
	const PROPOSER = accounts[7].signer;
	const PROPOSER2 = accounts[8].signer;
	const VOTER = accounts[9].signer;

	const ONE_TOKEN = ethers.utils.bigNumberify('1000000000000000000')
	const TEN_TOKEN = ONE_TOKEN.mul(10);

	const SQRT_TEN_TOKENS = ethers.utils.bigNumberify('3162277660100000000');

	const ONE_PERIOD = ethers.utils.bigNumberify(17280);

	const VOTING_TYPE = 2;
	const NAME = ethers.utils.formatBytes32String("Roadmap Development");
	const DETAILS = ethers.utils.formatBytes32String("ipfshashgoeshere");
	const VOTING_LEN = 5;

	const VOTE = {
		NULL: 0,
		YES: 1,
		NO: 2
	}

	let coTokenContract;
	let tokenSqrtContract;
	let categoryVotingContract;

	let deployer = new etherlime.EtherlimeGanacheDeployer();

	const deployTokenAndSQRTContracts = async () => {
		coTokenContract = await deployer.deploy(COToken);
		tokenSqrtContract = await deployer.deploy(TokensSQRT);
	}

	const deployAndInitializeVotingContract = async () => {
		categoryVotingContract = await deployer.deploy(CategoryVoting, {}, coTokenContract.contractAddress, tokenSqrtContract.contractAddress);
		await coTokenContract.setTokenLimiter(categoryVotingContract.contractAddress);
	}

	const mintProposerTokens = async () => {
		await coTokenContract.mint(PROPOSER.address, ONE_TOKEN);
		await utils.timeTravel(deployer.provider, ONE_PERIOD.toNumber());
	}

	const proposeCategory = async () => {
		await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
		await categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN);
	}

	const voteYesOnProposal = async () => {
		await coTokenContract.mint(VOTER.address, TEN_TOKEN);
		await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(2).toNumber());
		await categoryVotingContract.from(VOTER).voteCategory(categoryProposalId, VOTE.YES);
	}

	const voteNoOnProposal = async () => {
		await coTokenContract.mint(VOTER.address, TEN_TOKEN);
		await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(2).toNumber());
		await categoryVotingContract.from(VOTER).voteCategory(categoryProposalId, VOTE.NO);
	}

	describe('Initialization', function () {
		beforeEach(async () => {
			await deployTokenAndSQRTContracts();
		})

		it('Should initialize the contract correctly', async () => {

			categoryVotingContract = await deployer.deploy(CategoryVoting, {}, coTokenContract.contractAddress, tokenSqrtContract.contractAddress);

			const readCoTokenAddress = await categoryVotingContract.votingToken();
			const readSqrtAddress = await categoryVotingContract.sqrtInstance();

			const categoryProposalsLength = await categoryVotingContract.lastCategoryProposalId();

			assert.equal(coTokenContract.contractAddress, readCoTokenAddress, "The address written for COToken is not the same as the supplied");
			assert.equal(tokenSqrtContract.contractAddress, readSqrtAddress, "The address written for SQRT is not the same as the supplied");
			assert.equal(categoryProposalsLength, 0, "There were already more than 0 category in the contract");

		});

		it('Should fail on wrong COToken or SQRT address', async () => {

			await assert.revert(deployer.deploy(CategoryVoting, {}, '0x0000000000000000000000000000000000000000', tokenSqrtContract.contractAddress));
			await assert.revert(deployer.deploy(CategoryVoting, {}, coTokenContract.contractAddress, '0x0000000000000000000000000000000000000000'));

		});
	});

	describe('Proposing Category', function () {

		beforeEach(async () => {

			await deployTokenAndSQRTContracts();
			await deployAndInitializeVotingContract();
			await mintProposerTokens();

		})

		it('Should propose category successfully with correct data', async () => {

			const proposerTokenLockInBefore = await categoryVotingContract.membersLockPeriod(PROPOSER.address);
			assert(proposerTokenLockInBefore.eq(0), "The lock in period before first transaction was not 0")

			const canMoveTokensBefore = await categoryVotingContract.canMoveTokens(PROPOSER.address, categoryVotingContract.contractAddress, ONE_TOKEN);
			assert(canMoveTokensBefore, "Should be able move tokens before proposal");

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN);

			const proposerTokenLockInAfter = await categoryVotingContract.membersLockPeriod(PROPOSER.address);
			const lastProposalId = await categoryVotingContract.lastCategoryProposalId();

			assert(proposerTokenLockInAfter.gt(0), "The lock in period after proposal is still 0")
			assert(lastProposalId.eq(1), "The last proposal id was not 1 on the first proposal")

			const balanceAfter = await coTokenContract.balanceOf(PROPOSER.address);
			assert(balanceAfter.eq(0), "CO Token was not deposited (it should be 0)")

			const categoryProposal = await categoryVotingContract.categoryProposalsQueue(0);
			const currentPeriod = await categoryVotingContract.getCurrentPeriod();

			assert(categoryProposal.id.eq(lastProposalId), 'The last proposal id was not set correctly');
			assert(categoryProposal.votingType == VOTING_TYPE, 'The voting type was not set correctly');
			assert(categoryProposal.name == NAME, 'The name was not set correctly');
			assert(categoryProposal.details == DETAILS, 'The details was not set correctly');
			assert(categoryProposal.votingPeriodLength.eq(VOTING_LEN), 'The voting period was not set correctly');
			assert(categoryProposal.proposer == PROPOSER.address, 'The proposer address was not set correctly');
			assert(categoryProposal.startPeriod.eq(currentPeriod.add(1)), 'The starting period was not set correctly');
			assert(categoryProposal.yesVotes.eq(0), 'The yes votes were not set correctly');
			assert(categoryProposal.noVotes.eq(0), 'The no votes were not set correctly');
			assert(categoryProposal.processed == false, 'The processed was not set correctly');
			assert(categoryProposal.didPass == false, 'The didPass was not set correctly');

			const canMoveTokensAfter = await categoryVotingContract.canMoveTokens(PROPOSER.address, categoryVotingContract.contractAddress, ONE_TOKEN);
			assert(canMoveTokensAfter == false, "Should not be able move tokens before proposal");

		});

		it('Should fail on wrong voting type', async () => {

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await assert.revert(categoryVotingContract.from(PROPOSER).proposeCategory(3, NAME, DETAILS, VOTING_LEN));
			await assert.revert(categoryVotingContract.from(PROPOSER).proposeCategory(0, NAME, DETAILS, VOTING_LEN));

			const balanceAfter = await coTokenContract.balanceOf(PROPOSER.address);
			assert(balanceAfter.eq(ONE_TOKEN), "CO Token was taken")

		});

		it('Should fail on wrong category name', async () => {

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await assert.revert(categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, ethers.utils.formatBytes32String(""), DETAILS, VOTING_LEN));

			const balanceAfter = await coTokenContract.balanceOf(PROPOSER.address);
			assert(balanceAfter.eq(ONE_TOKEN), "CO Token was taken")

		});

		it('Should fail on wrong category description', async () => {

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await assert.revert(categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, ethers.utils.formatBytes32String(""), VOTING_LEN));

			const balanceAfter = await coTokenContract.balanceOf(PROPOSER.address);
			assert(balanceAfter.eq(ONE_TOKEN), "CO Token was taken")

		});

		it('Should fail on wrong voting period length', async () => {

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await assert.revert(categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, 0));

			const balanceAfter = await coTokenContract.balanceOf(PROPOSER.address);
			assert(balanceAfter.eq(ONE_TOKEN), "CO Token was taken")

		});

		it('Should propose second category successfully', async () => {

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN);

			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());
			await coTokenContract.mint(PROPOSER.address, ONE_TOKEN);

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN);

			const lastProposalId = await categoryVotingContract.lastCategoryProposalId();

			assert(lastProposalId.eq(2), "The last proposal id was not 2 on the second proposal");

		});

		it('Should fail on not enough tokens', async () => {

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN);

			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());
			await coTokenContract.mint(PROPOSER.address, ONE_TOKEN.div(2));

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await assert.revert(categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN));

		});

	})

	describe('Voting On Category Proposal', function () {

		let categoryProposalId;

		beforeEach(async () => {

			await deployTokenAndSQRTContracts();
			await deployAndInitializeVotingContract();
			await mintProposerTokens();
			await proposeCategory();

			await coTokenContract.mint(VOTER.address, TEN_TOKEN);
			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(2).toNumber());
			categoryProposalId = await categoryVotingContract.lastCategoryProposalId();

		})

		it('Should be able to vote Yes with quadratic number of votes', async () => {

			const voterTokenLockInBefore = await categoryVotingContract.membersLockPeriod(VOTER.address);
			assert(voterTokenLockInBefore.eq(0), "The lock in period before first transaction was not 0")

			const canMoveTokensBefore = await categoryVotingContract.canMoveTokens(VOTER.address, PROPOSER.address, TEN_TOKEN);
			assert(canMoveTokensBefore, "Should be able move tokens before proposal");

			const categoryProposalBefore = await categoryVotingContract.categoryProposalsQueue(categoryProposalId.sub(1));

			await categoryVotingContract.from(VOTER).voteCategory(categoryProposalId, VOTE.YES);

			const categoryProposalAfter = await categoryVotingContract.categoryProposalsQueue(categoryProposalId.sub(1));

			assert(categoryProposalAfter.noVotes.sub(categoryProposalBefore.noVotes).eq(0), "The no votes have increased but should not have");
			assert(categoryProposalAfter.yesVotes.sub(categoryProposalBefore.yesVotes).eq(SQRT_TEN_TOKENS), "The yes votes have increased but not with sqrt of 10 votes");

			const canMoveTokensAfter = await categoryVotingContract.canMoveTokens(VOTER.address, PROPOSER.address, TEN_TOKEN);
			assert(!canMoveTokensAfter, "Should not be able move tokens before proposal");

			const voterTokenLockInAfter = await categoryVotingContract.membersLockPeriod(VOTER.address);
			assert(voterTokenLockInAfter.gt(0), "The lock in period after proposal is still 0")

		});

		it('Should be able to vote No with quadratic number of votes', async () => {
			const voterTokenLockInBefore = await categoryVotingContract.membersLockPeriod(VOTER.address);
			assert(voterTokenLockInBefore.eq(0), "The lock in period before first transaction was not 0")

			const canMoveTokensBefore = await categoryVotingContract.canMoveTokens(VOTER.address, PROPOSER.address, TEN_TOKEN);
			assert(canMoveTokensBefore, "Should be able move tokens before proposal");

			const categoryProposalBefore = await categoryVotingContract.categoryProposalsQueue(categoryProposalId.sub(1));

			await categoryVotingContract.from(VOTER).voteCategory(categoryProposalId, VOTE.NO);

			const categoryProposalAfter = await categoryVotingContract.categoryProposalsQueue(categoryProposalId.sub(1));

			assert(categoryProposalAfter.yesVotes.sub(categoryProposalBefore.yesVotes).eq(0), "The no votes have increased but should not have");
			assert(categoryProposalAfter.noVotes.sub(categoryProposalBefore.noVotes).eq(SQRT_TEN_TOKENS), "The yes votes have increased but not with sqrt of 10 votes");

			const canMoveTokensAfter = await categoryVotingContract.canMoveTokens(VOTER.address, PROPOSER.address, TEN_TOKEN);
			assert(!canMoveTokensAfter, "Should not be able move tokens before proposal");

			const voterTokenLockInAfter = await categoryVotingContract.membersLockPeriod(VOTER.address);
			assert(voterTokenLockInAfter.gt(0), "The lock in period after proposal is still 0")
		});

		it('Should not be able to vote without atleast 1 token', async () => {
			await assert.revert(categoryVotingContract.from(OWNER).voteCategory(categoryProposalId, VOTE.YES));
		});

		it('Should fail on voting twice on the same proposal', async () => {
			await categoryVotingContract.from(VOTER).voteCategory(categoryProposalId, VOTE.NO);
			await assert.revert(categoryVotingContract.from(VOTER).voteCategory(categoryProposalId, VOTE.YES));
		});

		it('Should be able to vote twice on different proposals', async () => {
			await coTokenContract.mint(PROPOSER2.address, ONE_TOKEN);
			await coTokenContract.from(PROPOSER2).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await categoryVotingContract.from(PROPOSER2).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN);
			await utils.timeTravel(deployer.provider, ONE_PERIOD.toNumber());
			const categoryProposalId2 = await categoryVotingContract.lastCategoryProposalId();
			await categoryVotingContract.from(VOTER).voteCategory(categoryProposalId, VOTE.NO);
			await categoryVotingContract.from(VOTER).voteCategory(categoryProposalId2, VOTE.YES);
		});

		it('Should fail on voting with wrong vote type', async () => {
			await assert.revert(categoryVotingContract.from(VOTER).voteCategory(categoryProposalId, VOTE.NULL));
		});

		it('Should fail on voting for finished proposal', async () => {
			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());
			await assert.revert(categoryVotingContract.from(VOTER).voteCategory(categoryProposalId, VOTE.YES));
		});

		it('Should fail on voting for proposal not started', async () => {
			await coTokenContract.mint(PROPOSER2.address, ONE_TOKEN);
			await coTokenContract.from(PROPOSER2).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await categoryVotingContract.from(PROPOSER2).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN);
			const categoryProposalId2 = await categoryVotingContract.lastCategoryProposalId();
			await assert.revert(categoryVotingContract.from(VOTER).voteCategory(categoryProposalId2, VOTE.NO));
		});

		it('Should fail on voting for not existing proposal', async () => {
			await assert.revert(categoryVotingContract.from(VOTER).voteCategory(15, VOTE.NO));
		});

	})

	describe('Finalizing Category Proposal', function () {

		beforeEach(async () => {

			await deployTokenAndSQRTContracts();
			await deployAndInitializeVotingContract();
			await mintProposerTokens();
			await proposeCategory();

			categoryProposalId = await categoryVotingContract.lastCategoryProposalId();

		})

		it('Should finalize successfully Yes vote and add it to categories', async () => {
			await voteYesOnProposal();

			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());

			await categoryVotingContract.from(FINALIZER).finalizeCategoryVoting(categoryProposalId);

			const finalizerBalance = await coTokenContract.balanceOf(FINALIZER.address);
			const proposerBalance = await coTokenContract.balanceOf(PROPOSER.address);

			assert(finalizerBalance.eq(ONE_TOKEN.div(100)), "The proposer did not get 1% of the deposit");
			assert(proposerBalance.eq(ONE_TOKEN.sub(ONE_TOKEN.div(100))), "The proposer did not get 99% of the deposit");

			const categoryProposal = await categoryVotingContract.categoryProposalsQueue(categoryProposalId.sub(1));

			assert(categoryProposal.processed, "The proposal was not marked as processed")
			assert(categoryProposal.didPass, "The proposal was not marked as passed")


			const categoriesLength = await categoryVotingContract.getCategoriesLength();
			assert(categoriesLength.eq(1), "The categories have not increased");

			const category = await categoryVotingContract.categories(0);

			assert(category.id.eq(0), 'The last proposal id was not set correctly');
			assert(category.votingType == VOTING_TYPE, 'The voting type was not set correctly');
			assert(category.name == NAME, 'The name was not set correctly');
			assert(category.details == DETAILS, 'The details was not set correctly');
			assert(category.votingPeriodLength.eq(VOTING_LEN), 'The voting period was not set correctly');

		});

		it('Should finalize successfully No vote and not add it to categories', async () => {
			await voteNoOnProposal();

			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());

			await categoryVotingContract.from(FINALIZER).finalizeCategoryVoting(categoryProposalId);

			const finalizerBalance = await coTokenContract.balanceOf(FINALIZER.address);
			const proposerBalance = await coTokenContract.balanceOf(PROPOSER.address);

			assert(finalizerBalance.eq(ONE_TOKEN.div(100)), "The proposer did not get 1% of the deposit");
			assert(proposerBalance.eq(ONE_TOKEN.sub(ONE_TOKEN.div(100))), "The proposer did not get 99% of the deposit");

			const categoryProposal = await categoryVotingContract.categoryProposalsQueue(categoryProposalId.sub(1));

			assert(categoryProposal.processed, "The proposal was not marked as processed")
			assert(!categoryProposal.didPass, "The proposal was marked as passed")
		});

		it('Should not finalize on wrong proposal id', async () => {

			await voteNoOnProposal();

			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());

			await assert.revert(categoryVotingContract.from(FINALIZER).finalizeCategoryVoting(12));

		});

		it('Should not finalize on proposal not finished', async () => {

			await voteNoOnProposal();

			await assert.revert(categoryVotingContract.from(FINALIZER).finalizeCategoryVoting(categoryProposalId));

		});


	})

	describe('Moving tokens', function () {

		beforeEach(async () => {
			await deployTokenAndSQRTContracts();
			await deployAndInitializeVotingContract();
			await mintProposerTokens();
		})

		it('Should be able to move tokens if one has not voted or proposed', async () => {
			await coTokenContract.from(PROPOSER).transfer(PROPOSER2.address, ONE_TOKEN);
			const proposerBalance = await coTokenContract.balanceOf(PROPOSER.address);
			assert(proposerBalance.eq(0), "The tokens were not moved succesfully");
		});

		it('Should be able to move tokens after proposal is finished', async () => {
			await mintProposerTokens();
			await proposeCategory();
			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());

			await coTokenContract.from(PROPOSER).transfer(PROPOSER2.address, ONE_TOKEN);
			const proposer2Balance = await coTokenContract.balanceOf(PROPOSER2.address);
			assert(proposer2Balance.eq(ONE_TOKEN), "The tokens were not moved succesfully");
		});

		it('Should be not be able to move tokens until proposed category proposal finished', async () => {
			await mintProposerTokens();
			await proposeCategory();
			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(6).toNumber());

			await assert.revert(coTokenContract.from(PROPOSER).transfer(PROPOSER2.address, ONE_TOKEN));
		});

		it('Should be not be able to move tokens until voted category proposal finished', async () => {

			await proposeCategory();
			await coTokenContract.mint(VOTER.address, TEN_TOKEN);
			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(2).toNumber());
			categoryProposalId = await categoryVotingContract.lastCategoryProposalId();

			await categoryVotingContract.from(VOTER).voteCategory(categoryProposalId, VOTE.YES);

			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(6).toNumber());

			await assert.revert(coTokenContract.from(VOTER).transfer(PROPOSER2.address, ONE_TOKEN));
		});
	})

});
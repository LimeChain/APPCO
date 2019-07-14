
const etherlime = require('etherlime-lib');
const ethers = require('ethers');

const COToken = require('./../build/COToken');
const CODAI = require('./../build/CODAI');
const TokensSQRT = require('./../build/TokensSQRT.json');
const CategoryVoting = require('./../build/CategoryVoting');

describe('Category Voting Contract', function () {

	this.timeout(20000);

	const OWNER = accounts[0].signer;
	const RECEPIENT = accounts[4].signer;
	const RECEPIENT2 = accounts[5].signer;
	const FINALIZER = accounts[6].signer;
	const PROPOSER = accounts[7].signer;
	const PROPOSER2 = accounts[8].signer;
	const VOTER = accounts[9].signer;

	const ONE_TOKEN = ethers.utils.bigNumberify('1000000000000000000')
	const TWO_TOKEN = ONE_TOKEN.mul(2);
	const TEN_TOKEN = ONE_TOKEN.mul(10);

	const SQRT_TEN_TOKENS = ethers.utils.bigNumberify('3162277660100000000');

	const ONE_PERIOD = ethers.utils.bigNumberify(17280);

	const PROPOSE_PERIOD_LENGTH = 10; // 2 days
	const VOTING_PERIOD_LENGTH = 5; // 1 days
	const REST_PERIOD_LENGTH = 15; // 3 days

	const VOTING_TYPES = {
		NULL: 0,
		Competing: 1,
		NonCompeting: 2
	}

	const VOTING_TYPE = VOTING_TYPES.NonCompeting;
	const NAME = ethers.utils.formatBytes32String("Roadmap Development");
	const DETAILS = ethers.utils.formatBytes32String("ipfshashgoeshere");
	const VOTING_LEN = VOTING_PERIOD_LENGTH;



	const VOTE = {
		NULL: 0,
		YES: 1,
		NO: 2
	}

	let coTokenContract;
	let tokenSqrtContract;
	let categoryVotingContract;
	let coDaiContract;

	let deployer = new etherlime.EtherlimeGanacheDeployer();

	const now = async () => {
		const blockNum = await deployer.provider.getBlockNumber();
		const block = await deployer.provider.getBlock(blockNum);
		return block.timestamp;
	}

	const deployTokenAndSQRTContracts = async () => {
		coTokenContract = await deployer.deploy(COToken);
		tokenSqrtContract = await deployer.deploy(TokensSQRT);
		coDaiContract = await deployer.deploy(CODAI)
	}

	const deployAndInitializeVotingContract = async () => {
		categoryVotingContract = await deployer.deploy(CategoryVoting, {}, coTokenContract.contractAddress, tokenSqrtContract.contractAddress, coDaiContract.contractAddress);
		await coTokenContract.setTokenLimiter(categoryVotingContract.contractAddress);
		await coDaiContract.mint(categoryVotingContract.contractAddress, TEN_TOKEN);
	}

	const mintProposerTokens = async () => {
		await coTokenContract.mint(PROPOSER.address, ONE_TOKEN);
		await utils.timeTravel(deployer.provider, ONE_PERIOD.toNumber());
	}

	const proposeCategory = async () => {
		await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
		await categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH);
	}

	const proposeCompetingCategory = async () => {
		await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
		await categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPES.Competing, NAME, DETAILS, VOTING_LEN, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH);
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

			categoryVotingContract = await deployer.deploy(CategoryVoting, {}, coTokenContract.contractAddress, tokenSqrtContract.contractAddress, coDaiContract.contractAddress);

			const readCoTokenAddress = await categoryVotingContract.votingToken();
			const readSqrtAddress = await categoryVotingContract.sqrtInstance();
			const readPaymentToken = await categoryVotingContract.paymentToken();

			const categoryProposalsLength = await categoryVotingContract.lastCategoryProposalId();

			assert.equal(coTokenContract.contractAddress, readCoTokenAddress, "The address written for COToken is not the same as the supplied");
			assert.equal(tokenSqrtContract.contractAddress, readSqrtAddress, "The address written for SQRT is not the same as the supplied");
			assert.equal(coDaiContract.contractAddress, readPaymentToken, "The address written for payment token is not the same as the supplied");
			assert.equal(categoryProposalsLength, 0, "There were already more than 0 category in the contract");

		});

		it('Should fail on wrong COToken, SQRT or CODAI address', async () => {

			await assert.revert(deployer.deploy(CategoryVoting, {}, '0x0000000000000000000000000000000000000000', tokenSqrtContract.contractAddress, coDaiContract.contractAddress));
			await assert.revert(deployer.deploy(CategoryVoting, {}, coTokenContract.contractAddress, '0x0000000000000000000000000000000000000000', coDaiContract.contractAddress));
			await assert.revert(deployer.deploy(CategoryVoting, {}, coTokenContract.contractAddress, tokenSqrtContract.contractAddress, '0x0000000000000000000000000000000000000000'));

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
			await categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH);

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
			await assert.revert(categoryVotingContract.from(PROPOSER).proposeCategory(3, NAME, DETAILS, VOTING_LEN, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH));
			await assert.revert(categoryVotingContract.from(PROPOSER).proposeCategory(0, NAME, DETAILS, VOTING_LEN, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH));

			const balanceAfter = await coTokenContract.balanceOf(PROPOSER.address);
			assert(balanceAfter.eq(ONE_TOKEN), "CO Token was taken")

		});

		it('Should fail on wrong category name', async () => {

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await assert.revert(categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, ethers.utils.formatBytes32String(""), DETAILS, VOTING_LEN, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH));

			const balanceAfter = await coTokenContract.balanceOf(PROPOSER.address);
			assert(balanceAfter.eq(ONE_TOKEN), "CO Token was taken")

		});

		it('Should fail on wrong category description', async () => {

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await assert.revert(categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, ethers.utils.formatBytes32String(""), VOTING_LEN, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH));

			const balanceAfter = await coTokenContract.balanceOf(PROPOSER.address);
			assert(balanceAfter.eq(ONE_TOKEN), "CO Token was taken")

		});

		it('Should fail on wrong voting period length', async () => {

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await assert.revert(categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, 0, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH));

			const balanceAfter = await coTokenContract.balanceOf(PROPOSER.address);
			assert(balanceAfter.eq(ONE_TOKEN), "CO Token was taken")

		});

		it('Should propose second category successfully', async () => {

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH);

			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());
			await coTokenContract.mint(PROPOSER.address, ONE_TOKEN);

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH);

			const lastProposalId = await categoryVotingContract.lastCategoryProposalId();

			assert(lastProposalId.eq(2), "The last proposal id was not 2 on the second proposal");

		});

		it('Should fail on not enough tokens', async () => {

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH);

			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());
			await coTokenContract.mint(PROPOSER.address, ONE_TOKEN.div(2));

			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
			await assert.revert(categoryVotingContract.from(PROPOSER).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH));

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
			await categoryVotingContract.from(PROPOSER2).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH);
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
			await categoryVotingContract.from(PROPOSER2).proposeCategory(VOTING_TYPE, NAME, DETAILS, VOTING_LEN, PROPOSE_PERIOD_LENGTH, REST_PERIOD_LENGTH);
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

			assert(finalizerBalance.eq(ONE_TOKEN.div(100)), "The finalizer did not get 1% of the deposit");
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

			assert(finalizerBalance.eq(ONE_TOKEN.div(100)), "The finalizer did not get 1% of the deposit");
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

	describe('Non-competing voting', async function () {

		let category;

		beforeEach(async () => {
			await deployTokenAndSQRTContracts();
			await deployAndInitializeVotingContract();
			await mintProposerTokens();
			await proposeCategory();

			categoryProposalId = await categoryVotingContract.lastCategoryProposalId();
			await voteYesOnProposal();

			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());

			await categoryVotingContract.from(FINALIZER).finalizeCategoryVoting(categoryProposalId);

			category = await categoryVotingContract.categories(0);

			await coTokenContract.mint(PROPOSER.address, ONE_TOKEN);
			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);

		})

		describe('Submitting proposal', async function () {
			it('Should be able to submit proposal', async () => {
				await categoryVotingContract.from(PROPOSER).proposeNonCompeting(category.id, DETAILS, ONE_TOKEN, { gasLimit: 1500000 })

				const currentPeriod = await categoryVotingContract.getCurrentPeriod();

				const proposal = await categoryVotingContract.categoryNonCompetingProposals(category.id, 0);

				assert.strictEqual(proposal.proposer, PROPOSER.address, "Proposer address was not stored correctly");
				assert(proposal.startPeriod.eq(currentPeriod.add(1)), "The starting period was not set correctly");
				assert(proposal.requestedAmount.eq(ONE_TOKEN), "The requested amount was not set correctly");
				assert(proposal.details == DETAILS, 'The details was not set correctly');
				assert(proposal.yesVotes.eq(0), 'The yes votes were not set correctly');
				assert(proposal.noVotes.eq(0), 'The no votes were not set correctly');
				assert(proposal.processed == false, 'The processed was not set correctly');
				assert(proposal.didPass == false, 'The didPass was not set correctly');
			});

			it('Should revert on wrong proposal category id', async () => {
				await assert.revert(categoryVotingContract.from(PROPOSER).proposeNonCompeting(15, DETAILS, ONE_TOKEN, { gasLimit: 1500000 }));
			});

			it('Should revert on no details', async () => {
				await assert.revert(categoryVotingContract.from(PROPOSER).proposeNonCompeting(category.id, ethers.utils.formatBytes32String(""), ONE_TOKEN, { gasLimit: 1500000 }));
			});

			it('Should fail on wrong category voting type', async () => {
				await deployTokenAndSQRTContracts();
				await deployAndInitializeVotingContract();
				await mintProposerTokens();
				await proposeCompetingCategory()

				categoryProposalId = await categoryVotingContract.lastCategoryProposalId();
				await voteYesOnProposal();

				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());

				await categoryVotingContract.from(FINALIZER).finalizeCategoryVoting(categoryProposalId);

				category = await categoryVotingContract.categories(0);

				await coTokenContract.mint(PROPOSER.address, ONE_TOKEN);
				await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);

				await assert.revert(categoryVotingContract.from(PROPOSER).proposeNonCompeting(category.id, DETAILS, ONE_TOKEN, { gasLimit: 1500000 }));
			})

			it('Should throw on proposer not having enough tokens to deposit', async () => {
				await coTokenContract.from(PROPOSER).transfer(OWNER.address, ONE_TOKEN);
				await assert.revert(categoryVotingContract.from(PROPOSER).proposeNonCompeting(category.id, DETAILS, ONE_TOKEN, { gasLimit: 1500000 }));
			});

			it('Should not allow the proposer to move tokens until end of proposal', async () => {
				await coTokenContract.mint(PROPOSER.address, ONE_TOKEN);
				await categoryVotingContract.from(PROPOSER).proposeNonCompeting(category.id, DETAILS, ONE_TOKEN, { gasLimit: 1500000 })
				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(1).toNumber());
				await assert.revert(coTokenContract.from(PROPOSER).transfer(OWNER.address, ONE_TOKEN));
			});
		});


		describe('Voting on proposal', async function () {

			let proposal;

			beforeEach(async () => {
				await categoryVotingContract.from(PROPOSER).proposeNonCompeting(category.id, DETAILS, ONE_TOKEN, { gasLimit: 1500000 })

				proposal = await categoryVotingContract.categoryNonCompetingProposals(category.id, 0);
			})

			it('Should be able to vote yes on proposal', async () => {

				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(2).toNumber()); // Get into the period
				await categoryVotingContract.from(VOTER).voteNonCompeting(category.id, proposal.id, VOTE.YES, { gasLimit: 1500000 });

				const proposalAfter = await categoryVotingContract.categoryNonCompetingProposals(category.id, 0);

				assert(proposalAfter.yesVotes.eq(SQRT_TEN_TOKENS), "The voter has not voted with sqrt of his 10 tokens");

			});

			it('Should be able to vote no on proposal', async () => {

				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(2).toNumber()); // Get into the period
				await categoryVotingContract.from(VOTER).voteNonCompeting(category.id, proposal.id, VOTE.NO, { gasLimit: 1500000 });

				const proposalAfter = await categoryVotingContract.categoryNonCompetingProposals(category.id, 0);

				assert(proposalAfter.noVotes.eq(SQRT_TEN_TOKENS), "The voter has not voted with sqrt of his 10 tokens");
			});

			it('Should fail on wrong proposal id', async () => {
				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(2).toNumber()); // Get into the period
				await assert.revert(categoryVotingContract.from(VOTER).voteNonCompeting(13, proposal.id, VOTE.NO, { gasLimit: 1500000 }));
				await assert.revert(categoryVotingContract.from(VOTER).voteNonCompeting(category.id, 14, VOTE.NO, { gasLimit: 1500000 }));
			});

			it('Should fail on voting for proposal that have not started, but vote successfully once started', async () => {
				await assert.revert(categoryVotingContract.from(VOTER).voteNonCompeting(category.id, proposal.id, VOTE.NO, { gasLimit: 1500000 }));
				await utils.timeTravel(deployer.provider, ONE_PERIOD.toNumber()); // Get into the period
				await categoryVotingContract.from(VOTER).voteNonCompeting(category.id, proposal.id, VOTE.YES, { gasLimit: 1500000 });
			});

			it('Should fail proposal that have ended', async () => {

				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(7).toNumber());
				await assert.revert(categoryVotingContract.from(VOTER).voteNonCompeting(category.id, proposal.id, VOTE.NO, { gasLimit: 1500000 }));

			});

			it('Should not allow the proposer to move tokens until end of proposal', async () => {
				await coTokenContract.mint(VOTER.address, ONE_TOKEN);
				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(2).toNumber()); // Get into the period
				await categoryVotingContract.from(VOTER).voteNonCompeting(category.id, proposal.id, VOTE.YES, { gasLimit: 1500000 });
				await assert.revert(coTokenContract.from(PROPOSER).transfer(OWNER.address, ONE_TOKEN));
			});

		});

		describe('Finalizing proposal', async function () {

			beforeEach(async () => {
				await categoryVotingContract.from(PROPOSER).proposeNonCompeting(category.id, DETAILS, ONE_TOKEN, { gasLimit: 1500000 })

				proposal = await categoryVotingContract.categoryNonCompetingProposals(category.id, 0);
				await utils.timeTravel(deployer.provider, ONE_PERIOD.toNumber()); // get into voting
			})


			it('Should be able to finalize successful yes vote and release funds', async () => {
				await categoryVotingContract.from(VOTER).voteNonCompeting(category.id, proposal.id, VOTE.YES, { gasLimit: 1500000 });

				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(6).toNumber()); // Exit the voting period

				const proposerDAIBalanceBefore = await coDaiContract.balanceOf(PROPOSER.address);
				const contractBalanceBefore = await coDaiContract.balanceOf(categoryVotingContract.contractAddress);
				const finalizerBalanceBefore = await coTokenContract.balanceOf(FINALIZER.address);
				const proposerBalanceBefore = await coTokenContract.balanceOf(PROPOSER.address);

				await categoryVotingContract.from(FINALIZER).finalizeNonCompeting(category.id, proposal.id);

				const proposerDAIBalanceAfter = await coDaiContract.balanceOf(PROPOSER.address);
				const contractBalanceAfter = await coDaiContract.balanceOf(categoryVotingContract.contractAddress);
				const proposalAfter = await categoryVotingContract.categoryNonCompetingProposals(category.id, 0);

				const finalizerBalanceAfter = await coTokenContract.balanceOf(FINALIZER.address);
				const proposerBalanceAfter = await coTokenContract.balanceOf(PROPOSER.address);

				assert(finalizerBalanceAfter.sub(finalizerBalanceBefore).eq(ONE_TOKEN.div(100)), "The finalizer did not get 1% of the deposit");
				assert(proposerBalanceAfter.sub(proposerBalanceBefore).eq(ONE_TOKEN.sub(ONE_TOKEN.div(100))), "The proposer did not get 99% of the deposit");

				assert(proposalAfter.processed, "The proposal was not marked as processed");
				assert(proposalAfter.didPass, "The proposal was not marked as passed")

				assert(proposerDAIBalanceAfter.sub(proposerDAIBalanceBefore).eq(ONE_TOKEN), "The proposer has not received their requested amount");
				assert(contractBalanceBefore.sub(contractBalanceAfter).eq(ONE_TOKEN), "The contract has not sent one token");

			});

			it('Should be able to finalize successful no vote without releasing funds', async () => {
				await categoryVotingContract.from(VOTER).voteNonCompeting(category.id, proposal.id, VOTE.NO, { gasLimit: 1500000 });

				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(6).toNumber()); // Exit the voting period

				const proposerDAIBalanceBefore = await coDaiContract.balanceOf(PROPOSER.address);
				const contractBalanceBefore = await coDaiContract.balanceOf(categoryVotingContract.contractAddress);
				const finalizerBalanceBefore = await coTokenContract.balanceOf(FINALIZER.address);
				const proposerBalanceBefore = await coTokenContract.balanceOf(PROPOSER.address);

				await categoryVotingContract.from(FINALIZER).finalizeNonCompeting(category.id, proposal.id);

				const proposerDAIBalanceAfter = await coDaiContract.balanceOf(PROPOSER.address);
				const contractBalanceAfter = await coDaiContract.balanceOf(categoryVotingContract.contractAddress);
				const proposalAfter = await categoryVotingContract.categoryNonCompetingProposals(category.id, 0);

				const finalizerBalanceAfter = await coTokenContract.balanceOf(FINALIZER.address);
				const proposerBalanceAfter = await coTokenContract.balanceOf(PROPOSER.address);

				assert(finalizerBalanceAfter.sub(finalizerBalanceBefore).eq(ONE_TOKEN.div(100)), "The finalizer did not get 1% of the deposit");
				assert(proposerBalanceAfter.sub(proposerBalanceBefore).eq(ONE_TOKEN.sub(ONE_TOKEN.div(100))), "The proposer did not get 99% of the deposit");

				assert(proposalAfter.processed, "The proposal was not marked as processed");
				assert(!proposalAfter.didPass, "The proposal was not marked as passed")

				assert(proposerDAIBalanceAfter.eq(proposerDAIBalanceBefore), "The proposer DAI balance changed");
				assert(contractBalanceBefore.eq(contractBalanceAfter), "The contract DAI balance changed");
			});

			it('Should fail on wrong proposal id and category id', async () => {

				await categoryVotingContract.from(VOTER).voteNonCompeting(category.id, proposal.id, VOTE.NO, { gasLimit: 1500000 });

				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(6).toNumber()); // Exit the voting period

				await assert.revert(categoryVotingContract.from(FINALIZER).finalizeNonCompeting(13, proposal.id));
				await assert.revert(categoryVotingContract.from(FINALIZER).finalizeNonCompeting(category.id, 13));
			});

			it('Should fail proposal that have not ended', async () => {
				await categoryVotingContract.from(VOTER).voteNonCompeting(category.id, proposal.id, VOTE.NO, { gasLimit: 1500000 });
				await assert.revert(categoryVotingContract.from(FINALIZER).finalizeNonCompeting(category.id, proposal.id));
			});

		});


	});

	describe('Competing voting', async function () {

		let category;

		beforeEach(async () => {
			await deployTokenAndSQRTContracts();
			await deployAndInitializeVotingContract();
			await mintProposerTokens();
			await proposeCompetingCategory();

			categoryProposalId = await categoryVotingContract.lastCategoryProposalId();
			await voteYesOnProposal();

			await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());

			await categoryVotingContract.from(FINALIZER).finalizeCategoryVoting(categoryProposalId);

			category = await categoryVotingContract.categories(0);

			await coTokenContract.mint(PROPOSER.address, ONE_TOKEN);
			await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);

		})

		describe('Submitting proposal', async function () {
			it('Should propose category successfully', async () => {
				await categoryVotingContract.submitCompetingProposal(category.id, RECEPIENT.address, DETAILS, TWO_TOKEN);
				await categoryVotingContract.submitCompetingProposal(category.id, RECEPIENT2.address, DETAILS, ONE_TOKEN);

				const proposalsCount = await categoryVotingContract.getCompetingCurrentRoundProposalsCount(category.id);

				assert(proposalsCount.eq(2), "The proposals count not storred correctly");

				const proposal1 = await categoryVotingContract.currentRoundProposals(category.id, 0);
				const proposal2 = await categoryVotingContract.currentRoundProposals(category.id, 1);

				assert.strictEqual(proposal1.recepient, RECEPIENT.address, "The stored proposal 1 recepient address is not the same");
				assert.strictEqual(proposal1.details, DETAILS, "The stored proposal 1 details is not the same");
				assert(proposal1.requestedAmount.eq(TWO_TOKEN), "The stored proposal 1 requested amount is not two tokens");
				assert(proposal1.votes.eq(0), "The stored proposal 1 already has votes");

				assert.strictEqual(proposal2.recepient, RECEPIENT2.address, "The stored proposal 2 recepient address is not the same");
				assert.strictEqual(proposal2.details, DETAILS, "The stored proposal 2 details is not the same");
				assert(proposal2.requestedAmount.eq(ONE_TOKEN), "The stored proposal 2 requested amount is not two tokens");
				assert(proposal2.votes.eq(0), "The stored proposal 2 already has votes");

			})

			it('Should fail when proposing not from the governer', async () => {
				await assert.revert(categoryVotingContract.from(PROPOSER).submitCompetingProposal(category.id, RECEPIENT.address, DETAILS, TWO_TOKEN));
			})

			it('Should fail on non-existant category', async () => {
				await assert.revert(categoryVotingContract.submitCompetingProposal(15, RECEPIENT.address, DETAILS, TWO_TOKEN));
			})

			it('Should fail on non-existant category', async () => {
				await assert.revert(categoryVotingContract.submitCompetingProposal(category.id, RECEPIENT.address, ethers.utils.formatBytes32String(""), TWO_TOKEN));
			})

			it('Should fail when proposing not in the proposing period', async () => {
				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(PROPOSE_PERIOD_LENGTH + 1).toNumber());
				await assert.revert(categoryVotingContract.submitCompetingProposal(category.id, RECEPIENT.address, DETAILS, TWO_TOKEN));
			})

			it('Should fail when proposing in the wrong category', async () => {
				await deployTokenAndSQRTContracts();
				await deployAndInitializeVotingContract();
				await mintProposerTokens();
				await proposeCategory();

				categoryProposalId = await categoryVotingContract.lastCategoryProposalId();
				await voteYesOnProposal();

				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());

				await categoryVotingContract.from(FINALIZER).finalizeCategoryVoting(categoryProposalId);

				category = await categoryVotingContract.categories(0);

				await coTokenContract.mint(PROPOSER.address, ONE_TOKEN);
				await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
				await categoryVotingContract.from(PROPOSER).proposeNonCompeting(category.id, DETAILS, ONE_TOKEN, { gasLimit: 1500000 })
				await utils.timeTravel(deployer.provider, ONE_PERIOD.toNumber()); // get into voting
				await assert.revert(categoryVotingContract.submitCompetingProposal(category.id, RECEPIENT.address, DETAILS, TWO_TOKEN));
			})

		});


		describe('Voting on proposal', async function () {

			beforeEach(async () => {
				await deployTokenAndSQRTContracts();
				await deployAndInitializeVotingContract();
				await mintProposerTokens();
				await proposeCompetingCategory();

				categoryProposalId = await categoryVotingContract.lastCategoryProposalId();
				await voteYesOnProposal();

				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());

				await categoryVotingContract.from(FINALIZER).finalizeCategoryVoting(categoryProposalId);

				category = await categoryVotingContract.categories(0);

				await coTokenContract.mint(PROPOSER.address, ONE_TOKEN);
				await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);

				await categoryVotingContract.submitCompetingProposal(category.id, RECEPIENT.address, DETAILS, TWO_TOKEN);
				await categoryVotingContract.submitCompetingProposal(category.id, RECEPIENT2.address, DETAILS, ONE_TOKEN);
				await categoryVotingContract.submitCompetingProposal(category.id, PROPOSER.address, DETAILS, TWO_TOKEN);
			})

			it('Should successfully vote for proposal', async () => {
				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(PROPOSE_PERIOD_LENGTH + 1).toNumber()); // Get into the period
				await categoryVotingContract.from(VOTER).voteCompetingProposal(category.id, 1);

				const proposalAfter = await categoryVotingContract.currentRoundProposals(category.id, 1);

				assert(proposalAfter.votes.eq(SQRT_TEN_TOKENS), "The voter has not voted with sqrt of his 10 tokens");
			})

			it('Should fail when voter has less than 1 token', async () => {
				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(PROPOSE_PERIOD_LENGTH + 1).toNumber()); // Get into the period
				await assert.revert(categoryVotingContract.from(RECEPIENT).voteCompetingProposal(category.id, 1));
			})

			it('Should fail on wrong category', async () => {
				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(PROPOSE_PERIOD_LENGTH + 1).toNumber()); // Get into the period
				await assert.revert(categoryVotingContract.from(VOTER).voteCompetingProposal(17, 1));
			})

			it('Should fail on wrong index', async () => {
				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(PROPOSE_PERIOD_LENGTH + 1).toNumber()); // Get into the period
				await assert.revert(categoryVotingContract.from(VOTER).voteCompetingProposal(category.id, 3));
			})

			it('Should fail on voting outside of the period', async () => {
				await assert.revert(categoryVotingContract.from(VOTER).voteCompetingProposal(category.id, 1));
			})

			it('Should fail when proposing in the wrong category', async () => {
				await deployTokenAndSQRTContracts();
				await deployAndInitializeVotingContract();
				await mintProposerTokens();
				await proposeCategory();

				categoryProposalId = await categoryVotingContract.lastCategoryProposalId();
				await voteYesOnProposal();

				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());

				await categoryVotingContract.from(FINALIZER).finalizeCategoryVoting(categoryProposalId);

				category = await categoryVotingContract.categories(0);

				await coTokenContract.mint(PROPOSER.address, ONE_TOKEN);
				await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
				await categoryVotingContract.from(PROPOSER).proposeNonCompeting(category.id, DETAILS, ONE_TOKEN, { gasLimit: 1500000 })
				await assert.revert(categoryVotingContract.from(VOTER).voteCompetingProposal(category.id, 0));
			})

			it('Should not allow the voter to move tokens until end of proposal', async () => {


				await coTokenContract.mint(VOTER.address, ONE_TOKEN);
				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(PROPOSE_PERIOD_LENGTH + 1).toNumber()); // Get into the period
				await categoryVotingContract.from(VOTER).voteCompetingProposal(category.id, 1);

				const canMoveTokensAfter = await categoryVotingContract.canMoveTokens(VOTER.address, categoryVotingContract.contractAddress, ONE_TOKEN);
				const getCurrentPeriodEndTimestamp = await categoryVotingContract.getCurrentPeriodEndTimestamp(category.id);

				const curT = await now();
				await assert.revert(coTokenContract.from(VOTER).transfer(OWNER.address, ONE_TOKEN));
			});

		});

		describe('Finalizing proposal', async function () {
			beforeEach(async () => {
				await deployTokenAndSQRTContracts();
				await deployAndInitializeVotingContract();
				await mintProposerTokens();
				await proposeCompetingCategory();

				categoryProposalId = await categoryVotingContract.lastCategoryProposalId();
				await voteYesOnProposal();

				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());

				await categoryVotingContract.from(FINALIZER).finalizeCategoryVoting(categoryProposalId);

				category = await categoryVotingContract.categories(0);

				await coTokenContract.mint(PROPOSER.address, ONE_TOKEN);
				await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);

				await categoryVotingContract.submitCompetingProposal(category.id, RECEPIENT.address, DETAILS, TWO_TOKEN);
				await categoryVotingContract.submitCompetingProposal(category.id, RECEPIENT2.address, DETAILS, ONE_TOKEN);
				await categoryVotingContract.submitCompetingProposal(category.id, PROPOSER.address, DETAILS, TWO_TOKEN);
				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(PROPOSE_PERIOD_LENGTH + 1).toNumber()); // Get into the period
				await categoryVotingContract.from(VOTER).voteCompetingProposal(category.id, 1);
			})

			it('Should successfully finalize the proposal and disburse the money to the recepient', async () => {
				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(VOTING_PERIOD_LENGTH).toNumber()); // Get into the period
				const proposerDAIBalanceBefore = await coDaiContract.balanceOf(RECEPIENT2.address);

				await categoryVotingContract.from(FINALIZER).finalizeCompetingProposal(category.id);

				const proposerDAIBalanceAfter = await coDaiContract.balanceOf(RECEPIENT2.address);

				const proposalsCount = await categoryVotingContract.getCompetingCurrentRoundProposalsCount(category.id);
				assert(proposalsCount.eq(0), "The voter has not voted with sqrt of his 10 tokens");
				assert(proposerDAIBalanceAfter.eq(proposerDAIBalanceBefore.add(ONE_TOKEN)));

				const winningProposal = await categoryVotingContract.categoryRoundWinners(category.id, 1);

				assert.strictEqual(winningProposal.recepient, RECEPIENT2.address, "The winning proposal recepient was not the same");
			})

			it('should not finalize the proposal before the end of the period', async () => {
				await assert.revert(categoryVotingContract.from(FINALIZER).finalizeCompetingProposal(category.id));
			})

			it('should not finalize wrong category id', async () => {
				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(VOTING_PERIOD_LENGTH).toNumber()); // Get into the period
				await assert.revert(categoryVotingContract.from(FINALIZER).finalizeCompetingProposal(17));
			})

			it('Should fail when proposing in the wrong category', async () => {
				await deployTokenAndSQRTContracts();
				await deployAndInitializeVotingContract();
				await mintProposerTokens();
				await proposeCategory();

				categoryProposalId = await categoryVotingContract.lastCategoryProposalId();
				await voteYesOnProposal();

				await utils.timeTravel(deployer.provider, ONE_PERIOD.mul(12).toNumber());

				await categoryVotingContract.from(FINALIZER).finalizeCategoryVoting(categoryProposalId);

				category = await categoryVotingContract.categories(0);

				await coTokenContract.mint(PROPOSER.address, ONE_TOKEN);
				await coTokenContract.from(PROPOSER).approve(categoryVotingContract.contractAddress, ONE_TOKEN);
				await categoryVotingContract.from(PROPOSER).proposeNonCompeting(category.id, DETAILS, ONE_TOKEN, { gasLimit: 1500000 })
				await assert.revert(categoryVotingContract.from(FINALIZER).finalizeCompetingProposal(category.id));
			})

		});


	});

});
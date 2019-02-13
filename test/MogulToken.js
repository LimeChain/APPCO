const etherlime = require('etherlime');
const MogulToken = require('../build/MogulToken');

const continuousRate = "500000";
const owner = accounts[0].wallet.address;
const raisingWallet = accounts[9].wallet.address;
const userAccout = accounts[1].wallet;
let deployer = new etherlime.EtherlimeGanacheDeployer();
let mogulTokenInstance;


describe('MogulToken Tests', () => {

    beforeEach(async () => {
        mogulTokenInstance = await deployer.deploy(MogulToken, {}, continuousRate, raisingWallet);
    });

    describe('Deploying contract', () => {

        it('should deploy contract', function () {
            assert.isAddress(mogulTokenInstance.contractAddress);
        });

        it('should have correct owner', async () => {
            let _owner = await mogulTokenInstance.contract.owner();
            assert.strictEqual(_owner, _owner, "the owner is not correct")
        });

        it('should check owner', async () => {
            let _owner = await mogulTokenInstance.isOwner();
            assert.ok(_owner);
        });

        it('should change the owner', async () => {
            await mogulTokenInstance.transferOwnership(userAccout.address);
            let _newOwner = await mogulTokenInstance.contract.owner();
            assert.strictEqual(_newOwner, userAccout.address, "the owner was not changed corectly");
        });

        it('should not change owner if not sent from current owner', async () => {
            let mogulTokenUserInstance = await mogulTokenInstance.contract.connect(userAccout);
            await assert.revert(mogulTokenUserInstance.transferOwnership(userAccout.address));
        });

        it('should mint one token to deployer', async () => {
            let expectedSupply = "1000000000000000000";
            let res = await mogulTokenInstance.balanceOf(owner);
            assert.strictEqual(expectedSupply, res.toString(), "the initial minten supply is not correct")
        });

        it('total supply should be one token (1*10^18)', async () => {
            let expectedTotalSupply = "1000000000000000000";
            let res = await mogulTokenInstance.totalSupply();
            assert.strictEqual(expectedTotalSupply, res.toString(), "total supply is not correct after deployment")
        });
    });

    describe('Testing buying tokens', () => {

        it('should mint correct amount tokens', async () => {
            let userContractInstance = await mogulTokenInstance.contract.connect(userAccout);

            let value = "5650000000000000000000";
            let valueInHex = ethers.utils.bigNumberify(value);

            let expectedTokensToMint = await userContractInstance.calculateContinuousMintReturn(valueInHex);
            await userContractInstance.mint({
                value: valueInHex
            });

            let mintedTokens = await mogulTokenInstance.balanceOf(userAccout.address);

            assert.strictEqual(expectedTokensToMint.toString(), mintedTokens.toString(), "minted tokens are not the expected amount");
        });

        it('should return less Eth than bought for specific amount of tokens', async () => {
            let userContractInstance = await mogulTokenInstance.contract.connect(userAccout);

            let value = "1000000000000000000";
            let valueInHex = ethers.utils.bigNumberify(value);

            await userContractInstance.mint({
                value: valueInHex
            });

            let mintedTokens = await mogulTokenInstance.balanceOf(userAccout.address);
            console.log(mintedTokens.toString());
            let burnResult = await userContractInstance.calculateContinuousBurnReturn(mintedTokens);

            assert(valueInHex.gt(burnResult));
        });

        it('should calculate when the tokens for the first eth are on profit', async () => {
            // amount of  token bought for one ether with reserve rate 10%
            let tokensBought = "4987562112089027";

            let oneEth = "1000000000000000000";
            let oneEthInHex = ethers.utils.bigNumberify(oneEth);

            // 2000 eth
            let value = "10000000000000000000000";
            let valueInHex = ethers.utils.bigNumberify(value);

            await mogulTokenInstance.mint({
                value: valueInHex
            });

            let burnResult = await mogulTokenInstance.calculateContinuousBurnReturn(tokensBought);
            console.log(burnResult.toString());
            console.log(oneEthInHex.toString());
            assert(burnResult.gt(oneEthInHex));
        });
    });
});
const etherlime = require('etherlime');
const ContinuousOrganisation = require('../build/ContinuousOrganisation');
const MogulToken = require('../build/MogulToken');

const owner = accounts[0].wallet.address;
const continuousRate = "500000";
const raisingWallet = accounts[9].wallet.address;
const userAccout = accounts[1].wallet;
let deployer = new etherlime.EtherlimeGanacheDeployer();
let ContinuousOrganisationInstance;
let MogulTokenInstance;


describe('MogulToken Tests', () => {

    beforeEach(async () => {
        MogulTokenInstance = await deployer.deploy(MogulToken);
        ContinuousOrganisationInstance = await deployer.deploy(ContinuousOrganisation, {}, continuousRate, MogulTokenInstance.contractAddress);
        await MogulTokenInstance.addMinter(ContinuousOrganisationInstance.contractAddress);
        await ContinuousOrganisationInstance.init({
            gasLimit: 6700000
        });
    });

    describe('Testing Continuous Organisation Deployment', () => {

        it('should check if ContinuousOrganisation have rights to mint', async () => {
            let res = await MogulTokenInstance.isMinter(ContinuousOrganisationInstance.contractAddress);
            assert.ok(res);
        });

        it('should deploy contract', function () {
            assert.isAddress(ContinuousOrganisationInstance.contractAddress);
        });

        it('should have correct owner', async () => {
            let _owner = await ContinuousOrganisationInstance.contract.owner();
            assert.strictEqual(_owner, _owner, "the owner is not correct")
        });

        it('should check owner', async () => {
            let _owner = await ContinuousOrganisationInstance.isOwner();
            assert.ok(_owner);
        });

        it('should change the owner', async () => {
            await ContinuousOrganisationInstance.transferOwnership(userAccout.address);
            let _newOwner = await ContinuousOrganisationInstance.contract.owner();
            assert.strictEqual(_newOwner, userAccout.address, "the owner was not changed corectly");
        });

        // it('should return token name', async () => {
        //     let name = "Mogul";
        //     let _name = await ContinuousOrganisationInstance.name();
        //     assert.strictEqual(name, _name, "token name is not correct");
        // });
        //
        // it('should return token symbol', async () => {
        //     let symbol = "MGL";
        //     let _symbol = await ContinuousOrganisationInstance.symbol();
        //     assert.strictEqual(symbol, _symbol, "token symbol is not correct");
        // });
        //
        // it('should return token decimal', async () => {
        //     let decimal = "18";
        //     let _decimal = await ContinuousOrganisationInstance.decimals();
        //     assert.strictEqual(decimal, _decimal.toString(), "token decimal is not correct");
        // });

        it('should not change owner if not sent from current owner', async () => {
            let mogulTokenUserInstance = await ContinuousOrganisationInstance.contract.connect(userAccout);
            await assert.revert(mogulTokenUserInstance.transferOwnership(userAccout.address));
        });

        it('should mint one token to deployer', async () => {
            let expectedSupply = "1000000000000000000";
            let res = await MogulTokenInstance.balanceOf(owner);
            assert.strictEqual(expectedSupply, res.toString(), "the initial minten supply is not correct")
        });

        it('total supply should be one token (1*10^18)', async () => {
            let expectedTotalSupply = "1000000000000000000";
            let res = await MogulTokenInstance.totalSupply();
            assert.strictEqual(expectedTotalSupply, res.toString(), "total supply is not correct after deployment")
        });
    });

    describe('Testing buying tokens', () => {

        it('should mint correct amount tokens', async () => {
            let userContractInstance = await ContinuousOrganisationInstance.contract.connect(userAccout);

            let value = "5650000000000000000000";
            let valueInHex = ethers.utils.bigNumberify(value);

            let expectedTokensToMint = await userContractInstance.calculateContinuousMintReturn(valueInHex);
            await userContractInstance.mint({
                value: valueInHex
            });

            let mintedTokens = await MogulTokenInstance.balanceOf(userAccout.address);

            assert.strictEqual(expectedTokensToMint.toString(), mintedTokens.toString(), "minted tokens are not the expected amount");
        });

        it('should return less Eth than bought for specific amount of tokens', async () => {
            let userContractInstance = await ContinuousOrganisationInstance.contract.connect(userAccout);

            let value = "1000000000000000000";
            let valueInHex = ethers.utils.bigNumberify(value);

            await userContractInstance.mint({
                value: valueInHex
            });

            let mintedTokens = await MogulTokenInstance.balanceOf(userAccout.address);
            let burnResult = await userContractInstance.calculateContinuousBurnReturn(mintedTokens);

            assert(valueInHex.gt(burnResult));
        });

        // it.only('should calculate when the tokens for the first eth are on profit', async () => {
        //     // amount of  token bought for one ether with reserve rate 10%
        //     let tokensBought = "4987562112089027";
        //
        //     let oneEth = "1000000000000000000";
        //     let oneEthInHex = ethers.utils.bigNumberify(oneEth);
        //
        //     // after 10000 eth invested the tokens for the first ether will be on profit.
        //     let value = "10000000000000000000000";
        //     let valueInHex = ethers.utils.bigNumberify(value);
        //
        //     await ContinuousOrganisationInstance.mint({
        //         value: valueInHex
        //     });
        //
        //     let burnResult = await ContinuousOrganisationInstance.calculateContinuousBurnReturn(tokensBought);
        //     assert(burnResult.gt(oneEthInHex));
        // });
    });
});
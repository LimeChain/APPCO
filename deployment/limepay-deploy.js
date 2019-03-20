const etherlime = require('etherlime');

const MogulDAI = require('./../build/MogulDAI');

const ECTools = require('./../build/ECTools.json');
const EscrowLimePay = require('./../build/Escrow_V2');

/* 
	Ropsten:
		DAI Token - 0xe0B206A30c778f8809c753844210c73D23001a96
		LimePay Escrow - 0x742bB812c21FA81068d2B6b1F601e9A78E289689
*/

const deploy = async (network, secret) => {
	// Mogul wallet
	const dAppAdmin = '0x53E63Ee92e1268919CF4757A9b1d48048C501A50';

	const deployer = new etherlime.InfuraPrivateKeyDeployer(secret, 'ropsten', "");
	deployer.defaultOverrides = { gasLimit: 4700000, gasPrice: 9000000000 };

	const tokenContractDeployed = await deployer.deploy(MogulDAI, {});

	const ecToolContract = await deployer.deploy(ECTools);
	const escrowLimePay = await deployer.deploy(EscrowLimePay, {
		ECTools: ecToolContract.contractAddress
	}, tokenContractDeployed.contractAddress, dAppAdmin);

	// Add signer in order to process funding
	await escrowLimePay.editSigner(dAppAdmin, true);



};

module.exports = { deploy };
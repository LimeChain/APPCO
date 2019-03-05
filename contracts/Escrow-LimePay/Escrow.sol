pragma solidity ^0.5.3;

import "./ECTools.sol";
import "./../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract Escrow_V2 {
    using SafeMath for uint256;

    ERC20 public tokenContract;

    mapping (address => bool) public signers;
    mapping (uint256 => bool) public usedNonces;

    address payable public dAppAdmin;
    uint256 constant public REFUNDING_LOGIC_GAS_COST = 7901; // gas used for single refund 

    uint256 constant public FIAT_PAYMENT_FUND_FUNCTION_CALL_GAS_USED = 32231; // gas used for calling fundForFiatPayment
    uint256 constant public RELAYED_PAYMENT_FUND_FUNCTION_CALL_GAS_USED = 31564; // gas used for calling fundForRelayedPayment

    modifier onlyDAppAdmin() {
        require(msg.sender == dAppAdmin, "Unauthorized access"); 
        _;
    }

    modifier preValidateFund(uint256 nonce) {
        require(!usedNonces[nonce], "Nonce already used");
        _;
    }

    constructor(address tokenAddress, address payable _dAppAdmin) public {
        dAppAdmin = _dAppAdmin;   
        tokenContract = ERC20(tokenAddress); 
    }
   
    function fundForRelayedPayment(uint256 nonce, address payable addressToFund, uint256 weiAmount, bytes memory authorizationSignature) public
    preValidateFund(nonce)
    {
        uint256 gasLimit = gasleft().add(RELAYED_PAYMENT_FUND_FUNCTION_CALL_GAS_USED);
        
        bytes32 hashedParameters = keccak256(abi.encodePacked(nonce, address(this), addressToFund, weiAmount));
        _preFund(hashedParameters, authorizationSignature, nonce);

        addressToFund.transfer(weiAmount);

        _refundMsgSender(gasLimit);
    }

    function fundForFiatPayment(uint256 nonce, address payable addressToFund, uint256 tokenAmount, uint256 weiAmount, bytes memory authorizationSignature) public
    preValidateFund(nonce)
    {
        uint256 gasLimit = gasleft().add(FIAT_PAYMENT_FUND_FUNCTION_CALL_GAS_USED);

        bytes32 hashedParameters = keccak256(abi.encodePacked(nonce, address(this), addressToFund, tokenAmount, weiAmount));
        _preFund(hashedParameters, authorizationSignature, nonce);

        tokenContract.transfer(addressToFund, tokenAmount);
        addressToFund.transfer(weiAmount);

        _refundMsgSender(gasLimit);
    }

    function _preFund(bytes32 hashedParameters, bytes memory authorizationSignature, uint256 nonce) internal {
        address signer = getSigner(hashedParameters, authorizationSignature);
        require(signers[signer], "Invalid authorization signature or signer");
        
        usedNonces[nonce] = true;
    }

    function getSigner(bytes32 raw, bytes memory sig) public pure returns(address signer) {
        return ECTools.prefixedRecover(raw, sig);
    }

    function _refundMsgSender(uint256 gasLimit) internal {
        uint256 refundAmount = gasLimit.sub(gasleft()).add(REFUNDING_LOGIC_GAS_COST).mul(tx.gasprice);
        msg.sender.transfer(refundAmount);
    }

    function withdrawEthers(uint256 ethersAmount) public onlyDAppAdmin {
        dAppAdmin.transfer(ethersAmount);
    }

    function withdrawTokens(uint256 tokensAmount) public onlyDAppAdmin {
        tokenContract.transfer(dAppAdmin, tokensAmount);
    }

    function editSigner(address _newSigner, bool add) public onlyDAppAdmin {
        signers[_newSigner] = add;
    }

    function editDappAdmin (address payable _dAppAdmin) public onlyDAppAdmin {
        dAppAdmin = _dAppAdmin;
    }

    function() external payable {}
}
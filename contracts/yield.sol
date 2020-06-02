pragma solidity >=0.4.21 <0.6.0;
//import "./ERC20.sol";

interface  yield {
    /*
        It is important to note the difference between the definitions of yield and dividend used in this contract
        Dividend is defined as the proceeds that one recieves in the form of another asset when one calls the claimPublic function
        Yield is defined as the portion of the total dividends rewarded by this contract that a certain user is entitled to.
        Yield can be thought of as the ability to claim dividends
        Ownership of one token sub unit gives the owner of the token a yield of (1/totalSupply)*totalContractDividend 
        Owners of tokens may give their yield to other accounts
    */
	//(owner of tokens) => (cowner of yield) => (amount of tokens from which to collect yield)
	function yieldDistribution(address _tokenOwner, address _yieldOwner) external view returns (uint256 allowed);
	function totalYield(address _addr) external view returns (uint256 value);
	function claimYieldPublic(address _yieldOwner, uint256 _value) external returns (bool success);
	function sendYield(address _to, uint256 _value) external returns (bool success);
	function specificAllowance(address, address, address) external view returns (uint256);
	function lastClaim(address) external view returns (uint256);
	function autoClaim(address) external view returns (bool);
	function transferTokenOwner(address _to, uint256 _value, address _yieldOwner) external returns (bool success);
	function approveYieldOwner(address _spender, uint256 _value, address _yieldOwner) external returns (bool success);
	function transferFromTokenOwner(address _from, address _to, uint256 _value, address _yieldOwner) external returns (bool success);
	function contractClaimDividend() external;
	function claimDividendPublic() external;

}
pragma solidity ^0.5.12;
import "./yield.sol";
import "./ERC20.sol";

contract token is ERC20, yield {
    /*
        It is important to note the difference between the definitions of yield and dividend used in this contract
        Dividend is defined as the proceeds that one recieves in the form of another asset when one calls the claimPublic function
        Yield is defined as the portion of the total dividends rewarded by this contract that a certain user is entitled to.
        Yield can be thought of as the ability to claim dividends
        Ownership of one token sub unit gives the owner of the token a yield of (1/totalSupply)*totalContractDividend 
        Owners of tokens may give their yield to other accounts
    */
    //same as Transfer in ERC20 except it adds yield owner of the funds transfered
    event Transfer(
        address indexed _from,
        address indexed _to,
        uint256 _value,
        address indexed _yieldOwner
    );

    //same as Approval in ERC20 except it adds yield owner of the funds approved
    event Approval(
        address indexed _owner,
        address indexed _spender,
        uint256 _value,
        address indexed _yieldOwner
    );

	constructor (uint256 _totalCoins, uint8 _decimals) public {
		if (_totalCoins == 0) _totalCoins = 1000000;
		if (_decimals == 0) _decimals = 6;
        decimals = _decimals;
		totalSupply = _totalCoins * (uint(10) ** decimals);
		balanceOf[msg.sender] = totalSupply;
		yieldDistribution[msg.sender][msg.sender] = totalSupply;
		totalYield[msg.sender] = totalSupply;
        contractOtherAsset.push(0);
	}

    //-----------ERC20 Implementation-----------
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function transfer(address _to, uint256 _value) public returns (bool success) {
        return transferTokenOwner(_to, _value, msg.sender);
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        return transferTokenOwnerFrom(_from, _to, _value, _from);
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        return approveYieldOwner(_spender, _value, msg.sender);
    }

    //--------------Yield Implementation--------------------
    mapping(address => mapping(address => mapping(address => uint256))) public specificAllowance;
    mapping(address => mapping(address => uint256)) public yieldDistribution;
    mapping(address => uint256) public totalYield;
    mapping(address => bool) public autoClaimYieldDisabled;

    function transferTokenOwner(address _to, uint256 _value, address _yieldOwner) public returns (bool success) {
    	require(yieldDistribution[msg.sender][_yieldOwner] >= _value);
    	yieldDistribution[msg.sender][_yieldOwner] -= _value;
		balanceOf[msg.sender] -= _value;
		
		yieldDistribution[_to][_yieldOwner] += _value;
		balanceOf[_to] += _value;

        if (!autoClaimYieldDisabled[_to]) claimYeildInternal(_to, _yieldOwner, _value);

		emit Transfer(msg.sender, _to, _value, _yieldOwner);

		return true;
    }

    function approveYieldOwner(address _spender, uint256 _value, address _yieldOwner) public returns (bool success) {
    	allowance[msg.sender][_spender] -= specificAllowance[msg.sender][_spender][_yieldOwner];
    	specificAllowance[msg.sender][_spender][_yieldOwner] = _value;
    	allowance[msg.sender][_spender] += _value;

    	emit Approval(msg.sender, _spender, _value, _yieldOwner);

    	return true;
    }

    function transferTokenOwnerFrom(address _from, address _to, uint256 _value, address _yieldOwner) public returns (bool success) {
    	require(yieldDistribution[_from][_yieldOwner] >= _value);
    	require(specificAllowance[_from][msg.sender][_yieldOwner] >= _value);
    	yieldDistribution[_from][_yieldOwner] -= _value;
		balanceOf[_from] -= _value;

        specificAllowance[_from][msg.sender][_yieldOwner] -= _value;
		allowance[_from][msg.sender] -= _value;

		yieldDistribution[_to][_yieldOwner] += _value;
		balanceOf[_to] += _value;

        if (!autoClaimYieldDisabled[_to]) claimYeildInternal(_to, _yieldOwner, _value);

		emit Transfer(_from, _to, _value, _yieldOwner);

		return true;
    }

    function claimYield(address _yieldOwner, uint256 _value) public returns (bool success) {
        claimYeildInternal(msg.sender, _yieldOwner, _value);

    	return true;
    }

    function sendYield(address _to, uint256 _value) public returns (bool success) {
    	require(yieldDistribution[msg.sender][msg.sender] >= _value);
        claimDividendInternal(msg.sender);
        claimDividendInternal(_to);
    	yieldDistribution[msg.sender][msg.sender] -= _value;
    	totalYield[msg.sender] -= _value;
    	yieldDistribution[msg.sender][_to] += _value;
    	totalYield[_to] += _value;
    	emit SendYield(msg.sender, _to, _value);

    	return true;
    }

    function claimDividend() public {
        claimDividendInternal(msg.sender);
    }

    function setAutoClaimYield() public {
        autoClaimYieldDisabled[msg.sender] = !autoClaimYieldDisabled[msg.sender];
    }

    //------------this contract specific---------------
    /*
        Every time contractClaimDividend is called another index is added
            the value of each index is (previousIndex)+(total amound of dividends created since last call to contractClaimDividend)
        Thus this is the sum of all inflows of Other Asset into this contract
    */
    uint256[] public contractOtherAsset;
    /*
        It should be noted that balanceOtherAsset does not resemble a claim on any asset,
        for the purpose of this implementation we use balaneOtherAsset as a dummy claim on another asset,
        in an actual implementation balanceOtherAsset would be replaced with balanceOf{Insert Asset Name Here}
    */
    mapping(address => uint256) public balanceOtherAsset;

    //lastClaim represents the last index of the contractOtherAsset array for each address at the most recent time that claim(said address) was called
    mapping(address => uint256) public lastClaim;

    /*
        @Description: moves yield to the token owner in yieldDistribution, the mapping yieldDistribution moves yield from
            yieldDistribution[_tokenOwner][_yieldOwner] to
            yieldDistribution[_tokenOwner][_tokenOwner]
            Thus allowing token owners to recieve dividends on the tokens that they own

        @param address _tokenOwner: the address that owns the tokens and will recieve the yield
        @param address _yieldOwner: the address from which to transfer the yield
        @param uint256 _value: the amount of yield to transfer

        @return bool success: if an error occurs returns false if no error return true
    */
    function claimYeildInternal(address _tokenOwner, address _yieldOwner, uint256 _value) internal {
        require(yieldDistribution[_tokenOwner][_yieldOwner] >= _value);
        claimDividendInternal(_tokenOwner);
        claimDividendInternal(_yieldOwner);
        yieldDistribution[_tokenOwner][_yieldOwner] -= _value;
        totalYield[_yieldOwner] -= _value;
        yieldDistribution[_tokenOwner][_tokenOwner] += _value;
        totalYield[_tokenOwner] += _value;
        emit ClaimYield(_tokenOwner, _yieldOwner, _value);

    }

    /*
        @Description: users may call this function to force this contract to make avaliable dividends that have been produced since the last call of this function
    */
    function contractClaimDividend() public {
        //usually there would be a require statement that ensures calls to this function are seperated by a minimum amount of time
        //dummy function spoofs an increace in contract balance of some non exixtent asset
        uint amount = 1000000;
        contractOtherAsset.push(contractOtherAsset[contractOtherAsset.length -1] + amount);
    }

    /*
        @Description: disributes to addresses their share of the total dividends based on their balance in totalYield compared to the total supply
    */
    function claimDividendInternal(address _addr) internal {
        uint mostRecent = lastClaim[_addr];
        lastClaim[_addr] = contractOtherAsset.length-1;
        uint totalIncreace = contractOtherAsset[contractOtherAsset.length-1] - contractOtherAsset[mostRecent];
        balanceOtherAsset[_addr] += totalIncreace * totalYield[_addr] / totalSupply;
    }

}
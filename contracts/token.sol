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
    uint8 public decimals;
    uint256 public totalSupply;

    event Transfer(
        address indexed _from,
        address indexed _to,
        uint256 _value,
        address indexed _yieldOwner
    );

    event Approval(
        address indexed _owner,
        address indexed _spender,
        uint256 _value,
        address indexed _yieldOwner
    );

    event Claim(
    	address indexed _tokenOwner,
    	address indexed _yieldOwner,
    	uint256 _value
    );

    event SendYield(
    	address indexed _tokenOwner,
    	address indexed _yieldOwner,
    	uint256 _value
    );

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => mapping(address => mapping(address => uint256))) public specificAllowance;
    //tokenOwner => spender => yieldOwner
    mapping(address => mapping(address => uint256)) public yieldDistribution;
    mapping(address => uint256) public totalYield;

    uint256[] public contractOtherAsset;

    mapping(address => uint256) public balanceOtherAsset;
    mapping(address => uint256) public lastClaim;
    mapping(address => bool) public autoClaim;

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


    function transfer(address _to, uint256 _value) public returns (bool success) {
        return transferTokenOwner(_to, _value, msg.sender);
    }

    function transferTokenOwner(address _to, uint256 _value, address _yieldOwner) public returns (bool success) {
    	require(yieldDistribution[msg.sender][_yieldOwner] >= _value);
    	yieldDistribution[msg.sender][_yieldOwner] -= _value;
		balanceOf[msg.sender] -= _value;
		
		yieldDistribution[_to][_yieldOwner] += _value;
		balanceOf[_to] += _value;

        if (autoClaim[_to]) claimYield(_to, _yieldOwner, _value);

		emit Transfer(msg.sender, _to, _value, _yieldOwner);

		return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        return approveYieldOwner(_spender, _value, msg.sender);
    }

    function approveYieldOwner(address _spender, uint256 _value, address _yieldOwner) public returns (bool success) {
    	allowance[msg.sender][_spender] -= specificAllowance[msg.sender][_spender][_yieldOwner];
    	specificAllowance[msg.sender][_spender][_yieldOwner] = _value;
    	allowance[msg.sender][_spender] += _value;

    	emit Approval(msg.sender, _spender, _value, _yieldOwner);

    	return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        return transferFromTokenOwner(_from, _to, _value, _from);
    }

    function transferFromTokenOwner(address _from, address _to, uint256 _value, address _yieldOwner) public returns (bool success) {
    	require(yieldDistribution[_from][_yieldOwner] >= _value);
    	require(specificAllowance[_from][msg.sender][_yieldOwner] >= _value);
    	yieldDistribution[_from][_yieldOwner] -= _value;
		balanceOf[_from] -= _value;

        specificAllowance[_from][msg.sender][_yieldOwner] -= _value;
		allowance[_from][msg.sender] -= _value;

		yieldDistribution[_to][_yieldOwner] += _value;
		balanceOf[_to] += _value;

        if (autoClaim[_to]) claimYield(_to, _yieldOwner, _value);

		emit Transfer(_from, _to, _value, _yieldOwner);

		return true;
    }

    function claimYield(address _tokenOwner, address _yieldOwner, uint256 _value) internal {
        require(yieldDistribution[_tokenOwner][_yieldOwner] >= _value);
        claimDividend(_tokenOwner);
        claimDividend(_yieldOwner);
        yieldDistribution[_tokenOwner][_yieldOwner] -= _value;
        totalYield[_yieldOwner] -= _value;
        yieldDistribution[_tokenOwner][_tokenOwner] += _value;
        totalYield[_tokenOwner] += _value;
        emit Claim(_tokenOwner, _yieldOwner, _value);

    }

    function claimYieldPublic(address _yieldOwner, uint256 _value) public returns (bool success) {
        claimYield(msg.sender, _yieldOwner, _value);

    	return true;
    }

    function sendYield(address _to, uint256 _value) public returns (bool success) {
    	require(yieldDistribution[msg.sender][msg.sender] >= _value);
        claimDividend(msg.sender);
        claimDividend(_to);
    	yieldDistribution[msg.sender][msg.sender] -= _value;
    	totalYield[msg.sender] -= _value;
    	yieldDistribution[msg.sender][_to] += _value;
    	totalYield[_to] += _value;
    	emit SendYield(msg.sender, _to, _value);

    	return true;
    }

    function contractClaimDividend() public {
        //usually there would be a require statement that ensures calls to this function are seperated by a minimum amount of time
        //dummy function spoofs an increace in contract balance of some non exixtent asset
        uint amount = 1000000;
        contractOtherAsset.push(contractOtherAsset[contractOtherAsset.length -1] + amount);
    }

    function claimDividend(address _addr) internal {
        uint mostRecent = lastClaim[_addr];
        lastClaim[_addr] = contractOtherAsset.length-1;
        uint totalIncreace = contractOtherAsset[contractOtherAsset.length-1] - contractOtherAsset[mostRecent];
        balanceOtherAsset[_addr] += totalIncreace * totalYield[_addr] / totalSupply;
    }

    function claimDividendPublic() public {
        claimDividend(msg.sender);
    }

    function setAutoClaimYield() public {
        autoClaim[msg.sender] = !autoClaim[msg.sender];
    }
}
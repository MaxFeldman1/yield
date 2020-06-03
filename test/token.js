const token = artifacts.require("./token.sol");

contract('token', function(accounts){
	var deployerAccount = accounts[0];

	it('before each', async() => {
		return token.new(0, 0).then((i) => {
			tokenInstance = i;
		});
	});

	it('implements erc20', () => {
		//allows token transfer
		return tokenInstance.decimals().then((res) => {
			assert.equal(res.toNumber(), 6, "correct default decimal value");
			subUnits = Math.pow(10, res.toNumber());
			return tokenInstance.totalSupply();
		}).then((res) => {
			assert.equal(res.toNumber(), 1000000*subUnits, "correct default total supply");
			totalSupply = res.toNumber();
			totalCoins = totalSupply/subUnits;
			return tokenInstance.balanceOf(deployerAccount);
		}).then((res) => {
			assert.equal(res.toNumber(), totalSupply, "deployerAccount initially holds all coins");
			transferAmount = 10 * subUnits;
			return tokenInstance.transfer(accounts[1], transferAmount, {from: deployerAccount});
		}).then(() => {
			return tokenInstance.balanceOf(deployerAccount);
		}).then((res) => {
			assert.equal(res.toNumber(), totalSupply-transferAmount, "sender balance reduced on transfer");
			return tokenInstance.balanceOf(accounts[1]);
		}).then((res) => {
			assert.equal(res.toNumber(), transferAmount, "receiver balance credited on transfer");
			//test approval
			return tokenInstance.approve(accounts[1], transferAmount, {from: deployerAccount});
		}).then(() => {
			return tokenInstance.allowance(deployerAccount, accounts[1]);
		}).then((res) => {
			assert.equal(res.toNumber(), transferAmount, "allowance set to expected value");
			return tokenInstance.transferFrom(deployerAccount, accounts[2], transferAmount, {from: accounts[1]});
		}).then(() => {
			return tokenInstance.allowance(deployerAccount, accounts[1]);
		}).then((res) => {
			assert.equal(res.toNumber(), 0, "allowance decreaced");
			return tokenInstance.balanceOf(deployerAccount);
		}).then((res) => {
			assert.equal(res.toNumber(), totalSupply-2*transferAmount, "from account balance reduced by expected amount");
			return tokenInstance.balanceOf(accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), transferAmount, "to account balane credited correct amount");
		});
	});

	it('uses specific allowances and transferTokenOwnerFrom, autoClaim on', () => {
		amount = 10 * subUnits;
		return tokenInstance.sendYield(accounts[2], amount, {from: deployerAccount}).then(() => {
			return tokenInstance.totalYield(accounts[2]);
		}).then((res) => {
			initialYieldSecond = res.toNumber();
			return tokenInstance.yieldDistribution(deployerAccount, accounts[2]);
		}).then((res) => {
			initialDeployerSecondYield = res.toNumber()
			return tokenInstance.yieldDistribution(accounts[1], accounts[1]);
		}).then((res) => {
			initialFirstFirstYield = res.toNumber();
			return tokenInstance.yieldDistribution(accounts[1], accounts[2]);
		}).then((res) => {
			initialFirstSecondYield = res.toNumber();
			return tokenInstance.approveYieldOwner(accounts[1], amount, accounts[2], {from: deployerAccount});
		}).then(() => {
			return tokenInstance.specificAllowance(deployerAccount, accounts[1], accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), amount, "specific allowance is correct");
			return tokenInstance.balanceOf(accounts[1]);
		}).then((res) => {
			initalBalanceFirstAct = res.toNumber();
			return tokenInstance.balanceOf(deployerAccount);
		}).then((res) => {
			initalBalanceDeployer = res.toNumber();
			return tokenInstance.transferTokenOwnerFrom(deployerAccount, accounts[1], amount, accounts[2], {from: accounts[1]});
		}).then(() => {
			return tokenInstance.balanceOf(deployerAccount);
		}).then((res) => {
			assert.equal(res.toNumber(), initalBalanceDeployer-amount, "correct token balance for the sender");
			return tokenInstance.balanceOf(accounts[1]);
		}).then((res) => {
			assert.equal(res.toNumber(), initalBalanceFirstAct+amount, "correct token balance for the receiver");
			return tokenInstance.specificAllowance(deployerAccount, accounts[1], accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), 0, "specific allowance reduced correctly");
			return tokenInstance.totalYield(accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialYieldSecond-amount, "totalYield decreaced for second account");
			return tokenInstance.yieldDistribution(deployerAccount, accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialDeployerSecondYield-amount, "yieldDistribution[deployer][second account] decreaced by amount");
			return tokenInstance.yieldDistribution(accounts[1], accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialFirstSecondYield, "yieldDistribution[token recipient][yield owner] remains the same");
			return tokenInstance.yieldDistribution(accounts[1], accounts[1]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialFirstFirstYield+amount, "yieldDistribution[first account][first account] increaced by correct amount");
		});
	});

	it('uses transferTokenOwner, autoClaim on', () => {
		amount = 10 * subUnits;
		return tokenInstance.sendYield(accounts[2], amount, {from: deployerAccount}).then(() => {
			return tokenInstance.totalYield(accounts[2]);
		}).then((res) => {
			initialYieldSecond = res.toNumber();
			return tokenInstance.yieldDistribution(deployerAccount, accounts[2]);
		}).then((res) => {
			initialDeployerSecondYield = res.toNumber();
			return tokenInstance.yieldDistribution(accounts[1], accounts[2]);
		}).then((res) => {
			initialFirstSecondYield = res.toNumber();
			return tokenInstance.yieldDistribution(accounts[1], accounts[1]);
		}).then((res) => {
			initialFirstFirstYield = res.toNumber();
			return tokenInstance.balanceOf(accounts[1]);
		}).then((res) => {
			initalBalanceFirstAct = res.toNumber();
			return tokenInstance.balanceOf(deployerAccount);
		}).then((res) => {
			initalBalanceDeployer = res.toNumber();
			return tokenInstance.transferTokenOwner(accounts[1], amount, accounts[2], {from: deployerAccount});
		}).then(() => {
			return tokenInstance.balanceOf(deployerAccount);
		}).then((res) => {
			assert.equal(res.toNumber(), initalBalanceDeployer-amount, "correct token balance for deployer account");
			return tokenInstance.balanceOf(accounts[1]);
		}).then((res) => {
			assert.equal(res.toNumber(), initalBalanceFirstAct+amount, "correct token balance for the first account");
			return tokenInstance.totalYield(accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialYieldSecond-amount, "totalYield correct for second account");
			return tokenInstance.yieldDistribution(deployerAccount, accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialDeployerSecondYield-amount, "yieldDistribution[deployer][second account] decreaced by amount");
			return tokenInstance.yieldDistribution(accounts[1], accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialFirstSecondYield, "yieldDistribution[token recipient][yield owner] remained the same");
			return tokenInstance.yieldDistribution(accounts[1], accounts[1]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialFirstFirstYield+amount, "yieldDistribution[first account][first account] increaced by amount");
		});
	});

	it('sends and claims yield', () => {
		amount = 10 * subUnits;
		return tokenInstance.totalYield(accounts[2]).then((res) => {
			initialYieldSecond = res.toNumber();
			return tokenInstance.totalYield(deployerAccount);
		}).then((res) => {
			initialYieldDeployer = res.toNumber();
			return tokenInstance.yieldDistribution(deployerAccount, deployerAccount);
		}).then((res) => {
			initialDeployerDepoyer = res.toNumber();
			return tokenInstance.yieldDistribution(deployerAccount, accounts[2]);
		}).then((res) => {
			initialDeployerSecond = res.toNumber();
			return tokenInstance.sendYield(accounts[2], amount, {from: deployerAccount});
		}).then(() => {
			return tokenInstance.totalYield(accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialYieldSecond+amount, "correct total yield for second account");
			return tokenInstance.totalYield(deployerAccount);
		}).then((res) => {
			assert.equal(res.toNumber(), initialYieldDeployer-amount, "correct total yield for deployer account");
			return tokenInstance.yieldDistribution(deployerAccount, deployerAccount);
		}).then((res) => {
			assert.equal(res.toNumber(), initialDeployerDepoyer-amount, "correct value of yieldDistribution[deployer][deployer]");
			return tokenInstance.yieldDistribution(deployerAccount, accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialDeployerSecond+amount, "correct value of yieldDistribution[deployer][second account] first pass");
			return tokenInstance.claimYield(accounts[2], amount, {from: deployerAccount});
		}).then(() => {
			return tokenInstance.totalYield(accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialYieldSecond, "correct total yield for second account");
			return tokenInstance.totalYield(deployerAccount);
		}).then((res) => {
			assert.equal(res.toNumber(), initialYieldDeployer, "correct total yield for deployer account");
			return tokenInstance.yieldDistribution(deployerAccount, deployerAccount);
		}).then((res) => {
			assert.equal(res.toNumber(), initialDeployerDepoyer, "correct value of yieldDistribution[deployer][deployer]");
			return tokenInstance.yieldDistribution(deployerAccount, accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialDeployerSecond, "correct value of yieldDistribution[deployer][second account] second pass");
		});
	});

	it('sets auto claim', () => {
		amount = 10 * subUnits;
		return tokenInstance.autoClaimYieldDisabled(deployerAccount).then((res) => {
			assert.equal(res, false, "autoClaimYieldDisabled deployer is false by default");
			return tokenInstance.autoClaimYieldDisabled(accounts[1]);
		}).then((res) => {
			assert.equal(res, false, "autoClaimYieldDisabled firstAccount is false by default");
			tokenInstance.setAutoClaimYield({from: deployerAccount});
			return tokenInstance.setAutoClaimYield({from: accounts[1]});
		}).then(() => {
			return tokenInstance.autoClaimYieldDisabled(deployerAccount);
		}).then((res) => {
			assert.equal(res, true, "autoClaimYieldDisabled deployer set to true");
			return tokenInstance.autoClaimYieldDisabled(accounts[1]);
		}).then((res) => {
			assert.equal(res, true, "autoClaimYieldDisabled first account set to true");
		});
	});

	it('uses transferTokenOwner, autoClaim off', () => {
		amount = 10 * subUnits;
		return tokenInstance.autoClaimYieldDisabled(accounts[1]).then((res) => {
			if (res) return (new Promise((resolve, reject) => {resolve();}));
			else return tokenInstance.setAutoClaimYield({from: accounts[1]});
		}).then(() => {
			return tokenInstance.sendYield(accounts[2], amount, {from: deployerAccount});
		}).then(() => {
			return tokenInstance.totalYield(accounts[2]);
		}).then((res) => {
			initialYieldSecond = res.toNumber();
			return tokenInstance.totalYield(accounts[1]);
		}).then((res) => {
			initialYieldFirst = res.toNumber();
			return tokenInstance.yieldDistribution(deployerAccount, accounts[2]);
		}).then((res) => {
			initialDeployerSecondYield = res.toNumber();
			return tokenInstance.yieldDistribution(accounts[1], accounts[2]);
		}).then((res) => {
			initialFirstSecondYield = res.toNumber();
			return tokenInstance.yieldDistribution(accounts[1], accounts[1]);
		}).then((res) => {
			initialFirstFirstYield = res.toNumber();
			return tokenInstance.balanceOf(accounts[1]);
		}).then((res) => {
			initalBalanceFirstAct = res.toNumber();
			return tokenInstance.balanceOf(deployerAccount);
		}).then((res) => {
			initalBalanceDeployer = res.toNumber();
			return tokenInstance.transferTokenOwner(accounts[1], amount, accounts[2], {from: deployerAccount});
		}).then(() => {
			return tokenInstance.balanceOf(deployerAccount);
		}).then((res) => {
			assert.equal(res.toNumber(), initalBalanceDeployer-amount, "correct token balance for the sender");
			return tokenInstance.balanceOf(accounts[1]);
		}).then((res) => {
			assert.equal(res.toNumber(), initalBalanceFirstAct+amount, "correct token balance for the receiver");
			return tokenInstance.totalYield(accounts[1]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialYieldFirst, "totalYield[first account] remained the same");
			return tokenInstance.totalYield(accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialYieldSecond, "totalYield[second account] remained the same");
			return tokenInstance.yieldDistribution(deployerAccount, accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialDeployerSecondYield-amount, "yieldDistribution[deployer][second account] decreaced by amount");
			return tokenInstance.yieldDistribution(accounts[1], accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialFirstSecondYield+amount, "yieldDistribution[token recipient][yield owner] increaced by amount");
			return tokenInstance.yieldDistribution(accounts[1], accounts[1]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialFirstFirstYield, "yieldDistribution[first account][first account] remains the same");
		});
	});

	it('uses specific allowances and transferTokenOwnerFrom, autoClaim off', () => {
		amount = 10 * subUnits;
		return tokenInstance.autoClaimYieldDisabled(accounts[1]).then((res) => {
			if (res) return (new Promise((resolve, reject) => {resolve();}));
			else return tokenInstance.setAutoClaimYield({from: accounts[1]});
		}).then(() => {
			return tokenInstance.sendYield(accounts[2], amount, {from: deployerAccount});
		}).then(() => {
			return tokenInstance.totalYield(accounts[1]);
		}).then((res) => {
			initialYieldFirst = res.toNumber();
			return tokenInstance.totalYield(accounts[2]);
		}).then((res) => {
			initialYieldSecond = res.toNumber();
			return tokenInstance.totalYield(deployerAccount);
		}).then((res) => {
			initialDeployerYield = res.toNumber();
			return tokenInstance.yieldDistribution(deployerAccount, accounts[2]);
		}).then((res) => {
			initialDeployerSecondYield = res.toNumber();
			return tokenInstance.yieldDistribution(accounts[1], accounts[1]);
		}).then((res) => {
			initialFirstFirstYield = res.toNumber();
			return tokenInstance.yieldDistribution(accounts[1], accounts[2]);
		}).then((res) => {
			initialFirstSecondYield = res.toNumber();
			return tokenInstance.approveYieldOwner(accounts[1], amount, accounts[2], {from: deployerAccount});
		}).then(() => {
			return tokenInstance.specificAllowance(deployerAccount, accounts[1], accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), amount, "specific allowance is correct");
			return tokenInstance.balanceOf(accounts[1]);
		}).then((res) => {
			initalBalanceFirstAct = res.toNumber();
			return tokenInstance.balanceOf(deployerAccount);
		}).then((res) => {
			initalBalanceDeployer = res.toNumber();
			return tokenInstance.transferTokenOwnerFrom(deployerAccount, accounts[1], amount, accounts[2], {from: accounts[1]});
		}).then(() => {
			return tokenInstance.balanceOf(deployerAccount);
		}).then((res) => {
			assert.equal(res.toNumber(), initalBalanceDeployer-amount, "correct token balance for the sender");
			return tokenInstance.balanceOf(accounts[1]);
		}).then((res) => {
			assert.equal(res.toNumber(), initalBalanceFirstAct+amount, "correct token balance for the receiver");
			return tokenInstance.specificAllowance(deployerAccount, accounts[1], accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), 0, "specific allowance reduced correctly");
			return tokenInstance.totalYield(accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialYieldSecond, "totalYield constant for second account");
			return tokenInstance.totalYield(accounts[1]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialYieldFirst, "totalYield constant for first account");
			return tokenInstance.yieldDistribution(deployerAccount, accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialDeployerSecondYield-amount, "yieldDistribution[deployer][second account] decreaced by amount");
			return tokenInstance.yieldDistribution(accounts[1], accounts[2]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialFirstSecondYield+amount, "yieldDistribution[token recipient][yield owner] increaced by amount");
			return tokenInstance.yieldDistribution(accounts[1], accounts[1]);
		}).then((res) => {
			assert.equal(res.toNumber(), initialFirstFirstYield, "yieldDistribution[first account][first account] remains the same");
		});
	});
});
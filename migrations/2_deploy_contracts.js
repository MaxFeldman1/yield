const token = artifacts.require("token");


module.exports = function(deployer) {
  deployer.deploy(token, 0, 0).then((res) => {
    tokenInstance = res;
  });
}

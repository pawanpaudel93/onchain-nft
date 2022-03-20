import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy, log } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  const chainId = await hre.getChainId();

  if (chainId === "31337") {
    log("Local network detected, deploying mocks...");
    const BASE_FEE = ethers.utils.parseEther("0.1");
    const GAS_PRICE_LINK = 10 ** 9;
    await deploy("LinkToken", { from: deployer, log: true });
    const VRFCoordinatorMockV2 = await deploy("VRFCoordinatorMockV2", {
      from: deployer,
      log: true,
      args: [BASE_FEE, GAS_PRICE_LINK],
    });
    log(
      "You have deployed the VRFCoordinatorMockV2 contract to:",
      VRFCoordinatorMockV2.address
    );
  }
};
export default func;
func.tags = ["all", "mocks", "rsvg", "svg", "main"];

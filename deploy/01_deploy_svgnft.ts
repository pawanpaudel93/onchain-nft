import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import fs from "fs";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy, log } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  log("----------------------------------------");
  const SVGNFT = await deploy("SVGNFT", {
    from: deployer,
    log: true,
  });
  log("You have deployed the SVGNFT contract to:", SVGNFT.address);
  const svg = fs.readFileSync("./img/polygon.svg", "utf8");

  const svgNFTContract = await hre.ethers.getContractFactory("SVGNFT");
  const accounts = await hre.ethers.getSigners();
  const signer = accounts[0];
  const svgNFT = new hre.ethers.Contract(
    SVGNFT.address,
    svgNFTContract.interface,
    signer
  );
  const networkName = hre.network.name;
  log(
    `Verify with: \n npx hardhat verify --network ${networkName} ${svgNFT.address}`
  );

  const transactionResponse = await svgNFT.create(svg);
  await transactionResponse.wait(1);
  log("You have made an NFT!");
  log("You can view tokenURI here with:", await svgNFT.tokenURI(0));
};
export default func;

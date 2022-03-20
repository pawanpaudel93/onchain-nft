import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";
import { networkConfig, developmentChains } from "../helper-hardhat-config";
import { Contract } from "ethers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy, log, get } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  const chainId = await hre.getChainId();
  const networkName = networkConfig[chainId].name;

  let vrfCoordinatorAddress: string;
  let vrfCoordinatorV2Mock: Contract;
  let linkTokenAddress: string;
  let subscriptionId: string = "";

  const signers = await hre.ethers.getSigners();
  const signer = signers[0];

  if (developmentChains.includes(network.name)) {
    const VRFCoordinatorMockV2 = await get("VRFCoordinatorMockV2");
    const LinkToken = await get("LinkToken");
    const VRFCoordinatorMockV2Contract = await ethers.getContractFactory(
      "VRFCoordinatorMockV2"
    );
    vrfCoordinatorV2Mock = new ethers.Contract(
      VRFCoordinatorMockV2.address,
      VRFCoordinatorMockV2Contract.interface,
      signer
    );
    vrfCoordinatorV2Mock.on("SubscriptionCreated", (subId, owner, event) => {
      log(`SubscriptionCreated: ${subId}`);
      subscriptionId = subId;
    });
    vrfCoordinatorAddress = VRFCoordinatorMockV2.address;
    linkTokenAddress = LinkToken.address;
  } else {
    vrfCoordinatorAddress = networkConfig[chainId].vrfCoordinator!;
    linkTokenAddress = networkConfig[chainId].linkToken!;
  }

  const keyHash = networkConfig[chainId].keyHash;
  const args = [vrfCoordinatorAddress, linkTokenAddress, keyHash];
  log("------------------------------------------------------");
  const RandomSVG = await deploy("RandomSVG", {
    from: deployer,
    log: true,
    args,
  });
  log("You have deployed the RandomSVG contract");
  log(
    `Verify with: \n npx hardhat verify --network ${networkName} ${RandomSVG.address
    } ${args.join(" ")}`
  );

  // Funding contract with Link tokens
  log("Funding RandomSVG with Link tokens...");
  const linkTokenContract = await ethers.getContractFactory("LinkToken");
  const linkToken = new ethers.Contract(
    linkTokenAddress,
    linkTokenContract.interface,
    signer
  );
  const transferBalance = networkConfig[chainId].fundAmount;
  const transferTx = await linkToken.transfer(
    RandomSVG.address,
    transferBalance,
    {
      from: deployer,
      gasLimit: 200000,
    }
  );
  await transferTx.wait();

  // Create an NFT By calling a random number
  const RandomSVGContract = await ethers.getContractFactory("RandomSVG");
  const randomSVG = new ethers.Contract(
    RandomSVG.address,
    RandomSVGContract.interface,
    signer
  );

  // Funding subscription with LINK tokens
  if (developmentChains.includes(network.name)) {
    while (subscriptionId === "") {
      log("Waiting for subscription to be created...", subscriptionId);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    const fundTx = await vrfCoordinatorV2Mock!.fundSubscription(
      subscriptionId,
      ethers.utils.parseEther("10")
    );
    await fundTx.wait();
  } else {
    const fundTransaction = await randomSVG.fundSubscription(
      ethers.utils.parseEther("10"),
      {
        gasLimit: 200000,
      }
    );
    await fundTransaction.wait(1);
  }

  const transactionResponse = await randomSVG.create({
    gasLimit: 300000,
    value: ethers.utils.parseEther("0.1"),
  });
  const receipt = await transactionResponse.wait(1);
  const RequestedSVGNFTEvent = receipt.events!.find(
    (e: any) => e.event === "RequestedSVGNFT"
  )!;
  const { requestId, tokenId } = RequestedSVGNFTEvent.args! as unknown as {
    requestId: string;
    tokenId: string;
  };
  log("You've created a new NFT with id:", tokenId.toString());
  log("Let's wait for the Chainlink node to respond..");
  if (chainId !== "31337") {
    const timeout = new Promise((resolve) => setTimeout(resolve, 3000000));
    const listenForEvent = new Promise<void>((resolve) => {
      randomSVG.once("CreatedUnfinishedRandomSVG", async () => {
        const tx = await randomSVG.finishMint(tokenId, { gasLimit: 2000000 });
        await tx.wait(1);
        log(`You can view the tokenURI here ${await randomSVG.tokenURI(0)}`);
        resolve();
      });
    });
    await Promise.race([timeout, listenForEvent]);
  } else {
    const vrfTx = await vrfCoordinatorV2Mock!.fulfillRandomWords(
      requestId,
      randomSVG.address
    );
    await vrfTx.wait(1);
    const finishMint = await randomSVG.finishMint(tokenId, {
      gasLimit: 2000000,
    });
    await finishMint.wait(1);
    log("You can view the tokenURI here: ", await randomSVG.tokenURI(tokenId));
  }
};
export default func;
func.tags = ["all", "rsvg"];

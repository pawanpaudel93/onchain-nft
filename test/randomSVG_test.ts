import { expect } from "chai";
import { ethers, network, deployments, getNamedAccounts } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { developmentChains } from "../helper-hardhat-config";
import { Contract } from "ethers";
const skip = require("mocha-skip-if");

skip
  .if(!developmentChains.includes(network.name))
  .describe("RandomNFT", function () {
    let randomNFT: Contract;
    beforeEach(async () => {
      await deployments.fixture(["mocks", "rsvg"]);
      const RandomSVG = await deployments.get("RandomSVG");
      randomNFT = await ethers.getContractAt("RandomSVG", RandomSVG.address);
    });
    it("Should sucessfully mint a NFT", async function () {
      const { deployer } = await getNamedAccounts();
      expect(await randomNFT.ownerOf(0)).to.equal(deployer);
      expect(await randomNFT.tokenURI(0)).not.equal("");
    });
  });

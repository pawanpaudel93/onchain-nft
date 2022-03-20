import { expect } from "chai";
import { ethers, network, deployments, getNamedAccounts } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { developmentChains } from "../helper-hardhat-config";

import fs from "fs";
import { Contract } from "ethers";
const skip = require("mocha-skip-if");

skip
  .if(!developmentChains.includes(network.name))
  .describe("SVGNFT", function () {
    let svgNFT: Contract;
    beforeEach(async function () {
      await deployments.fixture(["mocks", "svg"]);
      const SVGNFT = await deployments.get("SVGNFT");
      svgNFT = await ethers.getContractAt("SVGNFT", SVGNFT.address);
    });
    it("Should sucessfully mint a NFT", async function () {
      const { deployer } = await getNamedAccounts();
      expect(await svgNFT.ownerOf(0)).to.equal(deployer);
      expect(await svgNFT.tokenURI(0)).not.equal("");
    });
  });

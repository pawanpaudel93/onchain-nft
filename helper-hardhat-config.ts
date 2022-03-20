export const networkConfig: {
  [chainId: string]: {
    name: string;
    vrfCoordinator?: string;
    keyHash: string;
    linkToken?: string;
    fundAmount: string;
  };
} = {
  default: {
    name: "hardhat",
    keyHash:
      "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4",
    fundAmount: (10 * 10 ** 18).toString(),
  },
  31337: {
    name: "localhost",
    keyHash:
      "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4",
    fundAmount: (10 * 10 ** 18).toString(),
  },
  4: {
    name: "rinkeby",
    keyHash:
      "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
    vrfCoordinator: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
    linkToken: "0x01BE23585060835E02B77ef475b0Cc51aA1e0709",
    fundAmount: (10 * 10 ** 18).toString(),
  },
  1: {
    name: "mainnet",
    vrfCoordinator: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
    keyHash:
      "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef",
    linkToken: "	0x514910771af9ca656af840dff83e8264ecf986ca",
    fundAmount: (10 * 10 ** 18).toString(),
  },
};

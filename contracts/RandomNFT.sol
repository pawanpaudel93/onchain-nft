// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "base64-sol/base64.sol";

contract RandomSVG is ERC721URIStorage, VRFConsumerBaseV2, Ownable {
    uint256 public tokenCounter;

    // Chainlink VRF
    VRFCoordinatorV2Interface internal COORDINATOR;
    LinkTokenInterface internal LINKTOKEN;
    uint64 internal subscriptionId;
    bytes32 internal keyHash;
    uint32 internal callbackGasLimit = 100000;
    uint16 internal requestConfirmations = 3;
    uint32 internal numWords = 1;

    // RandomSVG parameters
    uint256 public maxNumberOfPaths;
    uint256 public maxNumberOfPathCommands;
    uint256 public size;
    uint256 public price;
    string[] public pathCommands;
    string[] public colors;

    mapping(uint256 => address) public requestIdToSender;
    mapping(uint256 => uint256) public requestIdToTokenId;
    mapping(uint256 => uint256) public tokenIdToRandomNumber;

    event CreatedRandomSVG(uint256 indexed tokenId, string tokenURI);
    event RequestedSVGNFT(uint256 indexed requestId, uint256 indexed tokenId);
    event CreatedUnfinishedRandomSVG(
        uint256 indexed tokenId,
        uint256 randomNumber
    );

    constructor(
        address _vrfCoordinator,
        address _linkTokenAddress,
        bytes32 _keyHash
    ) VRFConsumerBaseV2(_vrfCoordinator) ERC721("RandomSVG", "rsSVG") {
        tokenCounter = 0;
        keyHash = _keyHash;
        size = 500;
        maxNumberOfPaths = 10;
        maxNumberOfPathCommands = 5;
        pathCommands = ["M", "L"];
        price = 0.1 ether;
        colors = ["red", "green", "blue", "yellow", "purple", "white", "black"];
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        LINKTOKEN = LinkTokenInterface(_linkTokenAddress);
        subscriptionId = COORDINATOR.createSubscription();
        COORDINATOR.addConsumer(subscriptionId, address(this));
    }

    function withdraw() public payable onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function cancelSubscription() external onlyOwner {
        COORDINATOR.cancelSubscription(subscriptionId, msg.sender);
    }

    function fundSubscription(uint256 _amount) external onlyOwner {
        LINKTOKEN.transferAndCall(
            address(COORDINATOR),
            _amount,
            abi.encode(subscriptionId)
        );
    }

    function create() external payable returns (uint256 requestId) {
        require(msg.value >= price, "Need to send more ETH");
        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        uint256 tokenId = tokenCounter;
        requestIdToSender[requestId] = msg.sender;
        requestIdToTokenId[requestId] = tokenId;
        tokenCounter++;
        emit RequestedSVGNFT(requestId, tokenId);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        address nftOwner = requestIdToSender[requestId];
        uint256 tokenId = requestIdToTokenId[requestId];
        uint256 randomNumber = randomWords[0];
        _safeMint(nftOwner, tokenId);
        tokenIdToRandomNumber[tokenId] = randomNumber;
        delete requestIdToSender[requestId];
        delete requestIdToTokenId[requestId];
        emit CreatedUnfinishedRandomSVG(tokenId, randomNumber);
    }

    function finishMint(uint256 _tokenId) external {
        require(
            bytes(tokenURI(_tokenId)).length <= 0,
            "Token URI is already set"
        );
        require(tokenCounter > _tokenId, "TokenId has not been minted yet!");
        require(
            tokenIdToRandomNumber[_tokenId] > 0,
            "Need to wait for Chainlink VRF"
        );
        uint256 randomNumber = tokenIdToRandomNumber[_tokenId];
        string memory svg = generateSVG(randomNumber);
        string memory imageURI = svgToImageURI(svg);
        string memory tokenURI = formatTokenURI(imageURI);
        _setTokenURI(_tokenId, tokenURI);
        emit CreatedRandomSVG(_tokenId, tokenURI);
    }

    function generateSVG(uint256 _randomNumber)
        internal
        view
        returns (string memory finalSvg)
    {
        uint256 numberOfPaths = (_randomNumber % maxNumberOfPaths) + 1;
        finalSvg = string(
            abi.encodePacked(
                "<svg xmlns='http://www.w3.org/2000/svg' height='",
                Strings.toString(size),
                "' width='",
                Strings.toString(size),
                "'>"
            )
        );
        for (uint256 i = 0; i < numberOfPaths; i++) {
            uint256 newRNG = uint256(keccak256(abi.encode(_randomNumber, i)));
            string memory pathSvg = generatePath(newRNG);
            finalSvg = string(abi.encodePacked(finalSvg, pathSvg));
        }
        finalSvg = string(abi.encodePacked(finalSvg, "</svg>"));
    }

    function generatePath(uint256 _randomNumber)
        internal
        view
        returns (string memory pathSvg)
    {
        uint256 numberOfPathCommands = (_randomNumber %
            maxNumberOfPathCommands) + 1;
        pathSvg = "<path d='";
        for (uint256 i = 0; i < numberOfPathCommands; i++) {
            uint256 newRNG = uint256(
                keccak256(abi.encode(_randomNumber, size + i))
            );
            string memory pathCommand = generatePathCommand(newRNG);
            pathSvg = string(abi.encodePacked(pathSvg, pathCommand));
        }
        string memory color = colors[(_randomNumber % colors.length)];
        pathSvg = string(
            abi.encodePacked(
                pathSvg,
                "' fill='transparent' stroke='",
                color,
                "'/>"
            )
        );
    }

    function generatePathCommand(uint256 _randomNumber)
        internal
        view
        returns (string memory pathCommand)
    {
        pathCommand = pathCommands[(_randomNumber % pathCommands.length)];
        string memory parameterOne = Strings.toString(
            uint256(keccak256(abi.encode(_randomNumber, size * 2))) % size
        );
        string memory parameterTwo = Strings.toString(
            uint256(keccak256(abi.encode(_randomNumber, size * 3))) % size
        );
        pathCommand = string(
            abi.encodePacked(pathCommand, parameterOne, " ", parameterTwo, " ")
        );
    }

    function svgToImageURI(string memory _svg)
        internal
        pure
        returns (string memory)
    {
        string memory baseURL = "data:image/svg+xml;base64,";
        string memory svgBase64Encoded = Base64.encode(
            bytes(abi.encodePacked(_svg))
        );
        string memory imageURI = string(
            abi.encodePacked(baseURL, svgBase64Encoded)
        );
        return imageURI;
    }

    function formatTokenURI(string memory _imageURI)
        internal
        pure
        returns (string memory)
    {
        string memory baseURL = "data:application/json;base64,";
        return
            string(
                abi.encodePacked(
                    baseURL,
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"SVG NFT", "description":"An NFT based on SVG!", "attributes":"", "image":"',
                                _imageURI,
                                '"}'
                            )
                        )
                    )
                )
            );
    }
}

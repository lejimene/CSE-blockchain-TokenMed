// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721URIStorage, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract EHR_NFT is ERC721URIStorage, Ownable {
    uint256 public tokenCounter;
    mapping(address => bool) public hasMinted;

    event NFTMinted(address indexed recipient, uint256 tokenId, string tokenURI);

    constructor() ERC721("EHR_NFT", "EHR") Ownable(msg.sender) {
        tokenCounter = 0;
    }

    /**
     * @notice Public mint function (1 per address)
     * @param tokenURI Should point to encrypted EHR data stored on IPFS
     */
    function mint(string memory tokenURI) public returns (uint256) {
        require(!hasMinted[msg.sender], "Already minted");

        uint256 newItemId = tokenCounter;
        _safeMint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);
        hasMinted[msg.sender] = true;
        tokenCounter++;

        emit NFTMinted(msg.sender, newItemId, tokenURI);
        return newItemId;
    }

    /**
     * @notice Owner-only admin mint function
     * @param recipient The address to receive the NFT
     * @param tokenURI Encrypted data or metadata location (IPFS)
     */
    function adminMint(address recipient, string memory tokenURI) public onlyOwner returns (uint256) {
        require(!hasMinted[recipient], "Already minted");

        uint256 newItemId = tokenCounter;
        _safeMint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);
        hasMinted[recipient] = true;
        tokenCounter++;

        emit NFTMinted(recipient, newItemId, tokenURI);
        return newItemId;
    }

    /**
     * @notice Dev/test function to allow re-minting
     */
    function resetMintStatus(address user) public onlyOwner {
        hasMinted[user] = false;
    }

    /**
     * @notice (Optional) Store encrypted hash or reference
     * Could be extended for on-chain access logging or IPFS reference tracking
     */
    // function storeEncryptedHash(uint256 tokenId, string memory encryptedHash) public {
    //     require(ownerOf(tokenId) == msg.sender, "Only token owner can update");
    //     emit EncryptedDataStored(tokenId, encryptedHash);
    // }

    // event EncryptedDataStored(uint256 tokenId, string encryptedHash);
}

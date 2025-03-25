// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EHRNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    mapping(uint256 => string) private _tokenURIs;

    constructor(address initialOwner) ERC721("EHRNFT", "EHR") Ownable(initialOwner) {}

    function mintNFT(address to, string memory uri) public onlyOwner {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;
    }

    function updateTokenURI(uint256 tokenId, string memory newTokenURI) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        _tokenURIs[tokenId] = newTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return _tokenURIs[tokenId];
    }
}
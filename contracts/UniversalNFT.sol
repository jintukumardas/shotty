// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UniversalNFT
 * @dev NFT contract for Push Chain with enumeration and URI storage
 * Allows users to mint, transfer, and query NFTs through the AI Butler
 */
contract UniversalNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    uint256 private _tokenIdCounter;

    // Mapping from token ID to creator address
    mapping(uint256 => address) public tokenCreator;

    // Mapping from owner to their created token IDs
    mapping(address => uint256[]) private _createdTokens;

    event NFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed owner,
        string tokenURI,
        uint256 timestamp
    );

    event NFTTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    constructor() ERC721("Universal NFT", "UNFT") Ownable(msg.sender) {
        _tokenIdCounter = 1; // Start from 1
    }

    /**
     * @dev Mint a new NFT
     * @param to Address to receive the NFT
     * @param uri Metadata URI for the NFT
     * @return tokenId The ID of the newly minted token
     */
    function mintNFT(address to, string memory uri) public returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        tokenCreator[tokenId] = msg.sender;
        _createdTokens[msg.sender].push(tokenId);

        emit NFTMinted(tokenId, msg.sender, to, uri, block.timestamp);

        return tokenId;
    }

    /**
     * @dev Batch mint multiple NFTs
     * @param to Address to receive the NFTs
     * @param uris Array of metadata URIs
     * @return tokenIds Array of newly minted token IDs
     */
    function batchMintNFT(address to, string[] memory uris) public returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](uris.length);

        for (uint256 i = 0; i < uris.length; i++) {
            tokenIds[i] = mintNFT(to, uris[i]);
        }

        return tokenIds;
    }

    /**
     * @dev Transfer NFT with event tracking
     * @param from Current owner
     * @param to New owner
     * @param tokenId Token ID to transfer
     */
    function transferNFT(address from, address to, uint256 tokenId) public {
        require(ownerOf(tokenId) == from, "Not the owner");
        require(
            msg.sender == from ||
            msg.sender == getApproved(tokenId) ||
            isApprovedForAll(from, msg.sender),
            "Not authorized"
        );

        safeTransferFrom(from, to, tokenId);

        emit NFTTransferred(tokenId, from, to, block.timestamp);
    }

    /**
     * @dev Get all NFTs owned by an address
     * @param owner Address to query
     * @return tokenIds Array of token IDs owned
     */
    function getOwnedNFTs(address owner) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    /**
     * @dev Get all NFTs created by an address
     * @param creator Address to query
     * @return tokenIds Array of token IDs created
     */
    function getCreatedNFTs(address creator) public view returns (uint256[] memory) {
        return _createdTokens[creator];
    }

    /**
     * @dev Get NFT details
     * @param tokenId Token ID to query
     * @return owner Owner address
     * @return creator Creator address
     * @return uri Metadata URI
     */
    function getNFTDetails(uint256 tokenId) public view returns (
        address owner,
        address creator,
        string memory uri
    ) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        owner = ownerOf(tokenId);
        creator = tokenCreator[tokenId];
        uri = tokenURI(tokenId);
    }

    /**
     * @dev Get total number of NFTs minted
     */
    function totalMinted() public view returns (uint256) {
        return _tokenIdCounter - 1;
    }

    // Required overrides for multiple inheritance
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

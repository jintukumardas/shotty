import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { UniversalNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("UniversalNFT", function () {
  let nftContract: UniversalNFT;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const TOKEN_URI = "ipfs://QmTest123/metadata.json";
  const TOKEN_URI_2 = "ipfs://QmTest456/metadata.json";

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy contract
    const UniversalNFTFactory = await ethers.getContractFactory("UniversalNFT");
    nftContract = await UniversalNFTFactory.deploy();
    await nftContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await nftContract.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await nftContract.name()).to.equal("Universal NFT");
      expect(await nftContract.symbol()).to.equal("UNFT");
    });

    it("Should start with zero total minted", async function () {
      expect(await nftContract.totalMinted()).to.equal(0);
    });
  });

  describe("NFT Minting", function () {
    it("Should mint a new NFT successfully", async function () {
      await expect(
        nftContract.connect(user1).mintNFT(user1.address, TOKEN_URI)
      ).to.emit(nftContract, "NFTMinted");

      const totalMinted = await nftContract.totalMinted();
      expect(totalMinted).to.equal(1);
    });

    it("Should set correct token URI", async function () {
      await nftContract.connect(user1).mintNFT(user1.address, TOKEN_URI);
      const tokenId = 1;
      expect(await nftContract.tokenURI(tokenId)).to.equal(TOKEN_URI);
    });

    it("Should set correct owner after minting", async function () {
      await nftContract.connect(user1).mintNFT(user2.address, TOKEN_URI);
      const tokenId = 1;
      expect(await nftContract.ownerOf(tokenId)).to.equal(user2.address);
    });

    it("Should track creator correctly", async function () {
      await nftContract.connect(user1).mintNFT(user2.address, TOKEN_URI);
      const tokenId = 1;

      const [owner, creator, uri] = await nftContract.getNFTDetails(tokenId);
      expect(creator).to.equal(user1.address);
      expect(owner).to.equal(user2.address);
    });

    it("Should increment token IDs correctly", async function () {
      await nftContract.connect(user1).mintNFT(user1.address, TOKEN_URI);
      await nftContract.connect(user1).mintNFT(user1.address, TOKEN_URI_2);

      expect(await nftContract.totalMinted()).to.equal(2);
      expect(await nftContract.ownerOf(1)).to.equal(user1.address);
      expect(await nftContract.ownerOf(2)).to.equal(user1.address);
    });
  });

  describe("Batch Minting", function () {
    it("Should batch mint multiple NFTs", async function () {
      const uris = [TOKEN_URI, TOKEN_URI_2, "ipfs://test3"];

      await nftContract.connect(user1).batchMintNFT(user1.address, uris);

      expect(await nftContract.totalMinted()).to.equal(3);
      expect(await nftContract.balanceOf(user1.address)).to.equal(3);
    });

    it("Should set correct URIs for batch minted NFTs", async function () {
      const uris = [TOKEN_URI, TOKEN_URI_2, "ipfs://test3"];

      await nftContract.connect(user1).batchMintNFT(user1.address, uris);

      expect(await nftContract.tokenURI(1)).to.equal(TOKEN_URI);
      expect(await nftContract.tokenURI(2)).to.equal(TOKEN_URI_2);
      expect(await nftContract.tokenURI(3)).to.equal("ipfs://test3");
    });
  });

  describe("NFT Transfer", function () {
    beforeEach(async function () {
      await nftContract.connect(user1).mintNFT(user1.address, TOKEN_URI);
    });

    it("Should transfer NFT successfully", async function () {
      const tokenId = 1;

      await expect(
        nftContract.connect(user1).transferNFT(user1.address, user2.address, tokenId)
      ).to.emit(nftContract, "NFTTransferred");

      expect(await nftContract.ownerOf(tokenId)).to.equal(user2.address);
    });

    it("Should fail to transfer if not owner", async function () {
      const tokenId = 1;

      await expect(
        nftContract.connect(user2).transferNFT(user1.address, user2.address, tokenId)
      ).to.be.revertedWith("Not authorized");
    });

    it("Should fail to transfer from wrong address", async function () {
      const tokenId = 1;

      await expect(
        nftContract.connect(user1).transferNFT(user2.address, user2.address, tokenId)
      ).to.be.revertedWith("Not the owner");
    });

    it("Should allow approved address to transfer", async function () {
      const tokenId = 1;

      // Approve user2
      await nftContract.connect(user1).approve(user2.address, tokenId);

      // User2 can now transfer
      await nftContract.connect(user2).transferNFT(user1.address, user2.address, tokenId);
      expect(await nftContract.ownerOf(tokenId)).to.equal(user2.address);
    });
  });

  describe("NFT Queries", function () {
    beforeEach(async function () {
      // Mint 3 NFTs to user1
      await nftContract.connect(user1).mintNFT(user1.address, TOKEN_URI);
      await nftContract.connect(user1).mintNFT(user1.address, TOKEN_URI_2);
      await nftContract.connect(user1).mintNFT(user1.address, "ipfs://test3");

      // Mint 1 NFT to user2
      await nftContract.connect(user2).mintNFT(user2.address, "ipfs://test4");
    });

    it("Should return correct balance", async function () {
      expect(await nftContract.balanceOf(user1.address)).to.equal(3);
      expect(await nftContract.balanceOf(user2.address)).to.equal(1);
    });

    it("Should get owned NFTs correctly", async function () {
      const ownedByUser1 = await nftContract.getOwnedNFTs(user1.address);
      expect(ownedByUser1.length).to.equal(3);
      expect(ownedByUser1[0]).to.equal(1);
      expect(ownedByUser1[1]).to.equal(2);
      expect(ownedByUser1[2]).to.equal(3);
    });

    it("Should get created NFTs correctly", async function () {
      const createdByUser1 = await nftContract.getCreatedNFTs(user1.address);
      expect(createdByUser1.length).to.equal(3);

      const createdByUser2 = await nftContract.getCreatedNFTs(user2.address);
      expect(createdByUser2.length).to.equal(1);
    });

    it("Should return correct NFT details", async function () {
      const [nftOwner, creator, uri] = await nftContract.getNFTDetails(1);

      expect(nftOwner).to.equal(user1.address);
      expect(creator).to.equal(user1.address);
      expect(uri).to.equal(TOKEN_URI);
    });

    it("Should fail to get details of non-existent token", async function () {
      await expect(
        nftContract.getNFTDetails(999)
      ).to.be.revertedWith("Token does not exist");
    });

    it("Should return correct total supply", async function () {
      expect(await nftContract.totalSupply()).to.equal(4);
    });
  });

  describe("Creator Tracking", function () {
    it("Should track creator even after transfer", async function () {
      await nftContract.connect(user1).mintNFT(user1.address, TOKEN_URI);
      const tokenId = 1;

      // Transfer to user2
      await nftContract.connect(user1).transferNFT(user1.address, user2.address, tokenId);

      // Creator should still be user1
      const [nftOwner, creator, uri] = await nftContract.getNFTDetails(tokenId);
      expect(creator).to.equal(user1.address);
      expect(nftOwner).to.equal(user2.address);
    });

    it("Should maintain created NFTs list", async function () {
      // User1 creates and gives to user2
      await nftContract.connect(user1).mintNFT(user2.address, TOKEN_URI);

      const createdByUser1 = await nftContract.getCreatedNFTs(user1.address);
      expect(createdByUser1.length).to.equal(1);

      // User1 should be in created list even though they don't own it
      expect(await nftContract.ownerOf(1)).to.equal(user2.address);
    });
  });

  describe("Enumeration", function () {
    beforeEach(async function () {
      // Mint 5 NFTs
      for (let i = 0; i < 5; i++) {
        await nftContract.connect(user1).mintNFT(user1.address, `ipfs://test${i}`);
      }
    });

    it("Should enumerate tokens by index", async function () {
      const tokenId = await nftContract.tokenOfOwnerByIndex(user1.address, 0);
      expect(tokenId).to.equal(1);
    });

    it("Should enumerate all tokens", async function () {
      expect(await nftContract.totalSupply()).to.equal(5);

      const allTokens = [];
      for (let i = 0; i < 5; i++) {
        const tokenId = await nftContract.tokenByIndex(i);
        allTokens.push(tokenId);
      }

      expect(allTokens).to.deep.equal([1n, 2n, 3n, 4n, 5n]);
    });

    it("Should update enumeration after transfer", async function () {
      // Transfer token 1 from user1 to user2
      await nftContract.connect(user1).transferNFT(user1.address, user2.address, 1);

      expect(await nftContract.balanceOf(user1.address)).to.equal(4);
      expect(await nftContract.balanceOf(user2.address)).to.equal(1);

      expect(await nftContract.ownerOf(1)).to.equal(user2.address);
    });
  });

  describe("ERC721 Standard Functions", function () {
    beforeEach(async function () {
      await nftContract.connect(user1).mintNFT(user1.address, TOKEN_URI);
    });

    it("Should support ERC721 interface", async function () {
      const ERC721_INTERFACE_ID = "0x80ac58cd";
      expect(await nftContract.supportsInterface(ERC721_INTERFACE_ID)).to.be.true;
    });

    it("Should approve and get approved", async function () {
      const tokenId = 1;

      await nftContract.connect(user1).approve(user2.address, tokenId);
      expect(await nftContract.getApproved(tokenId)).to.equal(user2.address);
    });

    it("Should set approval for all", async function () {
      await nftContract.connect(user1).setApprovalForAll(user2.address, true);
      expect(await nftContract.isApprovedForAll(user1.address, user2.address)).to.be.true;
    });

    it("Should use safeTransferFrom", async function () {
      const tokenId = 1;

      await nftContract.connect(user1)["safeTransferFrom(address,address,uint256)"](
        user1.address,
        user2.address,
        tokenId
      );

      expect(await nftContract.ownerOf(tokenId)).to.equal(user2.address);
    });
  });

  describe("Gas Usage", function () {
    it("Should track gas for single mint", async function () {
      const tx = await nftContract.connect(user1).mintNFT(user1.address, TOKEN_URI);
      const receipt = await tx.wait();

      console.log(`      Gas used for single mint: ${receipt?.gasUsed.toString()}`);
      expect(receipt?.gasUsed).to.be.lessThan(300000n);
    });

    it("Should track gas for batch mint (3 NFTs)", async function () {
      const uris = [TOKEN_URI, TOKEN_URI_2, "ipfs://test3"];
      const tx = await nftContract.connect(user1).batchMintNFT(user1.address, uris);
      const receipt = await tx.wait();

      console.log(`      Gas used for batch mint (3 NFTs): ${receipt?.gasUsed.toString()}`);
    });
  });
});

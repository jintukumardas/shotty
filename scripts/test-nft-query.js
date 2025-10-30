const hre = require("hardhat");

async function main() {
  const { ethers } = hre;

  const nftContractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;

  if (!nftContractAddress) {
    console.error("❌ NFT contract address not found in .env.local");
    process.exit(1);
  }

  console.log("🔍 Testing NFT contract queries...");
  console.log("📍 NFT Contract:", nftContractAddress);

  // Get the contract artifact
  const UniversalNFT = await ethers.getContractFactory("UniversalNFT");

  // Connect to the deployed contract (read-only, no signer needed)
  const provider = ethers.provider;
  const nftContract = UniversalNFT.attach(nftContractAddress).connect(provider);

  // Test 1: Get total minted
  try {
    const totalMinted = await nftContract.totalMinted();
    console.log("✅ Total NFTs minted:", totalMinted.toString());
  } catch (error) {
    console.error("❌ Error getting total minted:", error.message);
  }

  // Test 2: Query NFTs for a test address
  const [testAccount] = await ethers.getSigners();
  const testAddress = testAccount.address;

  console.log("\n🔍 Querying NFTs for address:", testAddress);

  try {
    const ownedNFTs = await nftContract.getOwnedNFTs(testAddress);
    console.log("✅ Owned NFTs:", ownedNFTs.length);

    if (ownedNFTs.length > 0) {
      console.log("   Token IDs:", ownedNFTs.map(id => id.toString()).join(", "));

      // Get details for first NFT
      const firstTokenId = ownedNFTs[0];
      const [owner, creator, uri] = await nftContract.getNFTDetails(firstTokenId);
      console.log("\n📝 First NFT details:");
      console.log("   Token ID:", firstTokenId.toString());
      console.log("   Owner:", owner);
      console.log("   Creator:", creator);
      console.log("   URI:", uri);
    }
  } catch (error) {
    console.error("❌ Error querying NFTs:", error.message);
  }

  console.log("\n✅ Query test complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

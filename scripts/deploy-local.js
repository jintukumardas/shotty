const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const { ethers } = hre;

  console.log("🚀 Deploying contracts to local Hardhat network...\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy DomainRegistry
  console.log("📦 Deploying DomainRegistry...");
  const DomainRegistry = await ethers.getContractFactory("DomainRegistry");
  const domainRegistry = await DomainRegistry.deploy();
  await domainRegistry.waitForDeployment();
  const domainRegistryAddress = await domainRegistry.getAddress();
  console.log("✅ DomainRegistry deployed to:", domainRegistryAddress);

  // Get initial values
  const registrationFee = await domainRegistry.registrationFee();
  const expirationPeriod = await domainRegistry.expirationPeriod();
  console.log("   - Registration Fee:", ethers.formatEther(registrationFee), "ETH");
  console.log("   - Expiration Period:", expirationPeriod.toString(), "seconds (", Number(expirationPeriod) / (24 * 60 * 60), "days)\n");

  // Deploy UniversalNFT
  console.log("📦 Deploying UniversalNFT...");
  const UniversalNFT = await ethers.getContractFactory("UniversalNFT");
  const universalNFT = await UniversalNFT.deploy();
  await universalNFT.waitForDeployment();
  const universalNFTAddress = await universalNFT.getAddress();
  console.log("✅ UniversalNFT deployed to:", universalNFTAddress);

  // Get NFT details
  const nftName = await universalNFT.name();
  const nftSymbol = await universalNFT.symbol();
  console.log("   - Name:", nftName);
  console.log("   - Symbol:", nftSymbol);
  console.log("   - Total Minted:", (await universalNFT.totalMinted()).toString(), "\n");

  // Summary
  console.log("=".repeat(72));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(72));
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("\nDeployed Contracts:");
  console.log("  DomainRegistry:", domainRegistryAddress);
  console.log("  UniversalNFT:   ", universalNFTAddress);
  console.log("\nDeployer:", deployer.address);
  console.log("=".repeat(72) + "\n");

  // Save deployment info to file
  const deploymentInfo = {
    network: "localhost",
    chainId: 31337,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      DomainRegistry: {
        address: domainRegistryAddress,
        registrationFee: registrationFee.toString(),
        expirationPeriod: expirationPeriod.toString(),
      },
      UniversalNFT: {
        address: universalNFTAddress,
        name: nftName,
        symbol: nftSymbol,
      },
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentFile = path.join(deploymentsDir, "localhost.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to:", deploymentFile, "\n");

  // Test transactions
  console.log("🧪 Running test transactions...\n");

  // Test DomainRegistry
  console.log("1. Testing DomainRegistry - Register a domain");
  const domainName = "test.local";
  const chainId = 31337;
  const metadata = JSON.stringify({ description: "Test domain", avatar: "ipfs://test" });

  const registerTx = await domainRegistry.registerDomain(
    domainName,
    chainId,
    deployer.address,
    metadata,
    { value: registrationFee }
  );
  await registerTx.wait();
  console.log("   ✅ Domain registered:", domainName);

  const domainDetails = await domainRegistry.getDomainDetails(domainName);
  console.log("   - Owner:", domainDetails.owner);
  console.log("   - Chain ID:", domainDetails.chainId.toString());
  console.log("   - Resolved Address:", domainDetails.resolvedAddress, "\n");

  // Test UniversalNFT
  console.log("2. Testing UniversalNFT - Mint an NFT");
  const tokenURI = "ipfs://QmTest123/metadata.json";

  const mintTx = await universalNFT.mintNFT(deployer.address, tokenURI);
  await mintTx.wait();
  console.log("   ✅ NFT minted successfully");

  const tokenId = 1;
  const nftOwner = await universalNFT.ownerOf(tokenId);
  const uri = await universalNFT.tokenURI(tokenId);
  console.log("   - Token ID:", tokenId);
  console.log("   - Owner:", nftOwner);
  console.log("   - URI:", uri);
  console.log("   - Total Minted:", (await universalNFT.totalMinted()).toString(), "\n");

  console.log("🎉 All tests passed! Contracts are working correctly.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

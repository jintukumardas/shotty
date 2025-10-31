const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Helper function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Deploy with retry logic
async function deployWithRetry(contractName, maxRetries = 3, delayMs = 5000) {
  const { ethers } = hre;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📦 Deploying ${contractName}... (Attempt ${attempt}/${maxRetries})`);

      const ContractFactory = await ethers.getContractFactory(contractName);
      const contract = await ContractFactory.deploy();

      console.log(`⏳ Waiting for deployment confirmation...`);
      await contract.waitForDeployment();

      const address = await contract.getAddress();
      console.log(`✅ ${contractName} deployed to: ${address}\n`);

      // Add delay before next deployment
      if (delayMs > 0) {
        console.log(`⏸️  Waiting ${delayMs/1000}s before next deployment...\n`);
        await delay(delayMs);
      }

      return { address, contract };
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        console.log(`🔄 Retrying in ${delayMs/1000} seconds...\n`);
        await delay(delayMs);
      } else {
        console.error(`❌ Failed to deploy ${contractName} after ${maxRetries} attempts\n`);
        throw error;
      }
    }
  }
}

async function main() {
  const { ethers } = hre;

  console.log("🚀 Starting deployment to Flow EVM Testnet...\n");

  // Check if private key is configured
  const signers = await ethers.getSigners();

  if (signers.length === 0) {
    console.error("❌ ERROR: No deployer account found!");
    console.error("📝 Please set FLOW_PRIVATE_KEY in your .env.local file");
    console.error("\nTo fix this:");
    console.error("1. Create or import a wallet in MetaMask");
    console.error("2. Export the private key (Account Details > Export Private Key)");
    console.error("3. Add it to .env.local: FLOW_PRIVATE_KEY=your_private_key_here");
    console.error("4. Get testnet FLOW from: https://faucet.flow.com/fund-account\n");
    process.exit(1);
  }

  const deployer = signers[0];
  const network = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("📋 Deployment Details:");
  console.log("  Deployer:", deployer.address);
  console.log("  Network:", network.name);
  console.log("  Chain ID:", network.chainId.toString());
  console.log("  Balance:", ethers.formatEther(balance), "FLOW\n");

  // Check if deployer has sufficient balance
  if (balance === 0n) {
    console.error("⚠️  WARNING: Deployer balance is 0 FLOW!");
    console.error("📝 You need testnet FLOW to deploy contracts");
    console.error("🚰 Get testnet FLOW from: https://faucet.flow.com/fund-account");
    console.error("   Use address:", deployer.address, "\n");
    process.exit(1);
  }

  const deployedContracts = {
    network: network.name,
    chainId: Number(network.chainId),
    timestamp: new Date().toISOString(),
    contracts: {},
  };

  // Deploy contracts with retry logic and delays
  try {
    const redeemResult = await deployWithRetry("RedeemLinksEscrow", 3, 5000);
    deployedContracts.contracts.RedeemLinksEscrow = redeemResult.address;
  } catch (error) {
    console.error("⚠️  Continuing despite RedeemLinksEscrow deployment failure");
  }

  try {
    const nftResult = await deployWithRetry("UniversalNFT", 3, 5000);
    deployedContracts.contracts.UniversalNFT = nftResult.address;
  } catch (error) {
    console.error("⚠️  Continuing despite UniversalNFT deployment failure");
  }

  try {
    const domainResult = await deployWithRetry("DomainRegistry", 3, 5000);
    deployedContracts.contracts.DomainRegistry = domainResult.address;
  } catch (error) {
    console.error("⚠️  Continuing despite DomainRegistry deployment failure");
  }

  try {
    const addressBookResult = await deployWithRetry("AddressBook", 3, 5000);
    deployedContracts.contracts.AddressBook = addressBookResult.address;
  } catch (error) {
    console.error("⚠️  Continuing despite AddressBook deployment failure");
  }

  try {
    const secureStorageResult = await deployWithRetry("SecureStorage", 3, 5000);
    deployedContracts.contracts.SecureStorage = secureStorageResult.address;
  } catch (error) {
    console.error("⚠️  Continuing despite SecureStorage deployment failure");
  }

  try {
    const tokenFactoryResult = await deployWithRetry("ERC20TokenFactory", 3, 5000);
    deployedContracts.contracts.ERC20TokenFactory = tokenFactoryResult.address;
  } catch (error) {
    console.error("⚠️  Continuing despite ERC20TokenFactory deployment failure");
  }

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `deployment-${network.name}-${Date.now()}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deployedContracts, null, 2));

  // Update .env.local with deployed addresses
  const envPath = path.join(__dirname, "../.env.local");
  let envContent = "";

  try {
    envContent = fs.readFileSync(envPath, "utf8");
  } catch (error) {
    console.log("⚠️  .env.local not found, creating new one");
    envContent = "";
  }

  // Update or add contract addresses
  const updateEnvVar = (key, value) => {
    const pattern = new RegExp(`${key}=.*`, "g");
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(pattern, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  };

  if (deployedContracts.contracts.RedeemLinksEscrow) {
    updateEnvVar("NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS", deployedContracts.contracts.RedeemLinksEscrow);
  }

  if (deployedContracts.contracts.UniversalNFT) {
    updateEnvVar("NEXT_PUBLIC_NFT_CONTRACT_ADDRESS", deployedContracts.contracts.UniversalNFT);
  }

  if (deployedContracts.contracts.DomainRegistry) {
    updateEnvVar("NEXT_PUBLIC_DOMAIN_CONTRACT_ADDRESS", deployedContracts.contracts.DomainRegistry);
  }

  if (deployedContracts.contracts.AddressBook) {
    updateEnvVar("NEXT_PUBLIC_ADDRESSBOOK_CONTRACT_ADDRESS", deployedContracts.contracts.AddressBook);
  }

  if (deployedContracts.contracts.SecureStorage) {
    updateEnvVar("NEXT_PUBLIC_SECURESTORAGE_CONTRACT_ADDRESS", deployedContracts.contracts.SecureStorage);
  }

  if (deployedContracts.contracts.ERC20TokenFactory) {
    updateEnvVar("NEXT_PUBLIC_TOKEN_FACTORY_CONTRACT_ADDRESS", deployedContracts.contracts.ERC20TokenFactory);
  }

  fs.writeFileSync(envPath, envContent.trim() + "\n");
  console.log("✅ Updated .env.local with contract addresses\n");

  console.log("🎉 Deployment complete!");
  console.log("📄 Deployment details saved to:", deploymentFile);
  console.log("\n📋 Deployed Contracts Summary:");
  console.log(JSON.stringify(deployedContracts.contracts, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

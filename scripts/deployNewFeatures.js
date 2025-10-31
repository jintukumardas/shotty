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

  console.log("🚀 Deploying New Features to Flow EVM Testnet...\n");

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const network = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("📋 Deployment Details:");
  console.log("  Deployer:", deployer.address);
  console.log("  Network:", network.name);
  console.log("  Chain ID:", network.chainId.toString());
  console.log("  Balance:", ethers.formatEther(balance), "FLOW\n");

  if (balance === 0n) {
    console.error("⚠️  WARNING: Deployer balance is 0 FLOW!");
    console.error("🚰 Get testnet FLOW from: https://faucet.flow.com/fund-account\n");
    process.exit(1);
  }

  const deployedContracts = {
    network: network.name,
    chainId: Number(network.chainId),
    timestamp: new Date().toISOString(),
    contracts: {},
  };

  // Deploy new feature contracts
  console.log("🔥 Deploying New Feature Contracts...\n");

  try {
    const batchResult = await deployWithRetry("BatchTransactions", 3, 5000);
    deployedContracts.contracts.BatchTransactions = batchResult.address;
  } catch (error) {
    console.error("⚠️  BatchTransactions deployment failed");
  }

  try {
    const scheduledResult = await deployWithRetry("ScheduledTransactions", 3, 5000);
    deployedContracts.contracts.ScheduledTransactions = scheduledResult.address;
  } catch (error) {
    console.error("⚠️  ScheduledTransactions deployment failed");
  }

  try {
    const flowActionsResult = await deployWithRetry("FlowActions", 3, 5000);
    deployedContracts.contracts.FlowActions = flowActionsResult.address;
  } catch (error) {
    console.error("⚠️  FlowActions deployment failed");
  }

  try {
    const lendingResult = await deployWithRetry("LendingProtocol", 3, 5000);
    deployedContracts.contracts.LendingProtocol = lendingResult.address;
  } catch (error) {
    console.error("⚠️  LendingProtocol deployment failed");
  }

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `new-features-${network.name}-${Date.now()}.json`
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

  if (deployedContracts.contracts.BatchTransactions) {
    updateEnvVar("NEXT_PUBLIC_BATCH_CONTRACT_ADDRESS", deployedContracts.contracts.BatchTransactions);
  }

  if (deployedContracts.contracts.ScheduledTransactions) {
    updateEnvVar("NEXT_PUBLIC_SCHEDULED_CONTRACT_ADDRESS", deployedContracts.contracts.ScheduledTransactions);
  }

  if (deployedContracts.contracts.FlowActions) {
    updateEnvVar("NEXT_PUBLIC_FLOW_ACTIONS_CONTRACT_ADDRESS", deployedContracts.contracts.FlowActions);
  }

  if (deployedContracts.contracts.LendingProtocol) {
    updateEnvVar("NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS", deployedContracts.contracts.LendingProtocol);
  }

  fs.writeFileSync(envPath, envContent.trim() + "\n");
  console.log("✅ Updated .env.local with contract addresses\n");

  console.log("🎉 New Features Deployment Complete!");
  console.log("📄 Deployment details saved to:", deploymentFile);
  console.log("\n📋 Deployed Contracts Summary:");
  console.log(JSON.stringify(deployedContracts.contracts, null, 2));

  console.log("\n💡 Next Steps:");
  console.log("  1. Verify contracts on FlowScan (if needed)");
  console.log("  2. Test the contracts with the test scripts");
  console.log("  3. Integrate with the frontend services");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

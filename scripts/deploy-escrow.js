const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying RedeemLinksEscrow contract to Push Chain Testnet...\n");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "FLOW\n");

  if (balance.toString() === "0") {
    console.error("❌ Error: Deployer account has no balance!");
    console.log("💡 Get testnet tokens from: https://faucet.push.org");
    process.exit(1);
  }

  // Deploy the contract
  console.log("📦 Deploying contract...");
  const RedeemLinksEscrow = await hre.ethers.getContractFactory("RedeemLinksEscrow");
  const escrow = await RedeemLinksEscrow.deploy();

  await escrow.waitForDeployment();
  const address = await escrow.getAddress();

  console.log("\n✅ Contract deployed successfully!");
  console.log("📍 Contract address:", address);
  console.log("\n📋 Next steps:");
  console.log("1. Add this to your .env.local file:");
  console.log(`   NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=${address}`);
  console.log("\n2. Verify on Push Chain Explorer:");
  console.log(`   https://donut.push.network/address/${address}`);
  console.log("\n3. Restart your development server");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

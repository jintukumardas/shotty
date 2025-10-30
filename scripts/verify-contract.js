const hre = require("hardhat");
require('dotenv').config({ path: '.env.local' });

async function main() {
  const contractAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error("❌ No contract address found in .env.local");
    process.exit(1);
  }

  console.log("🔍 Verifying contract at:", contractAddress);

  // Get contract instance
  const RedeemLinksEscrow = await hre.ethers.getContractFactory("RedeemLinksEscrow");
  const escrow = RedeemLinksEscrow.attach(contractAddress);

  // Check if contract exists
  try {
    const balance = await hre.ethers.provider.getBalance(contractAddress);
    console.log("✅ Contract exists");
    console.log("💰 Contract balance:", hre.ethers.formatEther(balance), "ETH");

    // Try to get contract code
    const code = await hre.ethers.provider.getCode(contractAddress);

    // Check if it has the redeemTokensTo function
    // This is a simple check - we look for the function selector
    const redeemTokensToSelector = "0x" + hre.ethers.id("redeemTokensTo(bytes32,string,address)").slice(0, 10);
    const hasRedeemTokensTo = code.includes(redeemTokensToSelector.slice(2));

    console.log("🔧 Has redeemTokensTo function:", hasRedeemTokensTo ? "✅ YES" : "❌ NO");

    if (!hasRedeemTokensTo) {
      console.log("\n⚠️  WARNING: Contract does not have redeemTokensTo function!");
      console.log("You need to redeploy the contract with the updated code.");
    }

  } catch (error) {
    console.error("❌ Error checking contract:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

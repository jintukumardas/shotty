const hre = require("hardhat");
require('dotenv').config({ path: '.env.local' });

async function main() {
  const contractAddress = "0x17f17b51268DB500C2B7B8D7c4517d3116682e46";

  console.log("🧪 Testing contract at:", contractAddress);

  // Get contract instance with the new ABI
  const RedeemLinksEscrow = await hre.ethers.getContractFactory("RedeemLinksEscrow");
  const escrow = RedeemLinksEscrow.attach(contractAddress);

  try {
    // Check contract balance
    const balance = await hre.ethers.provider.getBalance(contractAddress);
    console.log("💰 Contract balance:", hre.ethers.formatEther(balance), "ETH");

    // Get the contract's interface
    const fragment = escrow.interface.getFunction("redeemTokensTo");

    if (fragment) {
      console.log("✅ redeemTokensTo function EXISTS in ABI");
      console.log("Function signature:", fragment.format());
    } else {
      console.log("❌ redeemTokensTo function NOT FOUND in ABI");
    }

    // Also check for the old function
    const oldFragment = escrow.interface.getFunction("redeemTokens");
    if (oldFragment) {
      console.log("✅ redeemTokens (old) function exists");
      console.log("Function signature:", oldFragment.format());
    }

  } catch (error) {
    console.error("❌ Error:", error.message);

    // List all functions in the contract
    console.log("\n📋 Available functions in compiled ABI:");
    const functions = escrow.interface.fragments.filter(f => f.type === 'function');
    functions.forEach(f => {
      console.log(`  - ${f.format()}`);
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

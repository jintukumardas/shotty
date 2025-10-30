const hre = require("hardhat");
require('dotenv').config({ path: '.env.local' });

async function main() {
  // Check on Sepolia (origin chain)
  const sepoliaProvider = new hre.ethers.JsonRpcProvider("https://eth-sepolia.public.blastapi.io");

  const txHash = "0xce6b067b50816a7e0788399731B4d298269010565b83a735a27984c78f14af6ef";
  const recipientAddress = "0x60219B697B76A92f0D8Df72Ddb4E6B7CcF4b3382";

  console.log("🔍 Checking redemption transaction...\n");
  console.log("Transaction:", txHash);
  console.log("Expected recipient:", recipientAddress);

  try {
    const receipt = await sepoliaProvider.getTransactionReceipt(txHash);

    if (receipt) {
      console.log("\n✅ Transaction found on Sepolia!");
      console.log("Status:", receipt.status === 1 ? "✅ SUCCESS" : "❌ FAILED");
      console.log("Block:", receipt.blockNumber);
      console.log("From:", receipt.from);
      console.log("To:", receipt.to);

      // Check recipient balance
      const balance = await sepoliaProvider.getBalance(recipientAddress);
      console.log("\n💰 Recipient balance:", hre.ethers.formatEther(balance), "ETH");

      console.log("\n🔗 View on Etherscan:");
      console.log(`https://sepolia.etherscan.io/tx/${txHash}`);
      console.log(`https://sepolia.etherscan.io/address/${recipientAddress}`);
    } else {
      console.log("❌ Transaction not found on Sepolia");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

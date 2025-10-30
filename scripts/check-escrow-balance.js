const hre = require("hardhat");
require('dotenv').config({ path: '.env.local' });

async function main() {
  const contractAddress = "0x17f17b51268DB500C2B7B8D7c4517d3116682e46";

  console.log("🔍 Checking escrow contract balance on Push Chain...\n");

  // Check on Push Chain
  const pushChainProvider = new hre.ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_PUSH_CHAIN_RPC || "https://evm.rpc-testnet-donut-node2.push.org/"
  );

  const balance = await pushChainProvider.getBalance(contractAddress);
  console.log("💰 Escrow contract balance on Push Chain:", hre.ethers.formatEther(balance), "ETH");

  // Also check on Sepolia
  const sepoliaProvider = new hre.ethers.JsonRpcProvider("https://eth-sepolia.public.blastapi.io");
  const sepoliaBalance = await sepoliaProvider.getBalance(contractAddress);
  console.log("💰 Escrow contract balance on Sepolia:", hre.ethers.formatEther(sepoliaBalance), "ETH");

  console.log("\n🔗 Links:");
  console.log("Push Chain Explorer:", `https://donut.push.network/address/${contractAddress}`);
  console.log("Sepolia Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

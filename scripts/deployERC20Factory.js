const hre = require("hardhat");

async function main() {
  console.log("Deploying ERC20TokenFactory...");

  const ERC20TokenFactory = await hre.ethers.getContractFactory("ERC20TokenFactory");
  const factory = await ERC20TokenFactory.deploy();

  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("ERC20TokenFactory deployed to:", factoryAddress);

  // Save the address
  console.log("\nAdd this to your .env.local file:");
  console.log(`NEXT_PUBLIC_ERC20_FACTORY_ADDRESS=${factoryAddress}`);

  // Verify on block explorer (optional)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await factory.deploymentTransaction().wait(6);

    console.log("\nVerifying contract...");
    try {
      await hre.run("verify:verify", {
        address: factoryAddress,
        constructorArguments: [],
      });
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
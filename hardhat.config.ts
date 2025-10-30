import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    flowEvmTestnet: {
      url: process.env.NEXT_PUBLIC_FLOW_CHAIN_RPC || "https://testnet.evm.nodes.onflow.org",
      chainId: parseInt(process.env.NEXT_PUBLIC_FLOW_CHAIN_ID || "545"),
      accounts: process.env.FLOW_PRIVATE_KEY ? [process.env.FLOW_PRIVATE_KEY] : [],
      timeout: 120000, // 2 minutes
      gasPrice: "auto",
    },
    flowEvmMainnet: {
      url: "https://mainnet.evm.nodes.onflow.org",
      chainId: 747,
      accounts: process.env.FLOW_PRIVATE_KEY ? [process.env.FLOW_PRIVATE_KEY] : [],
      timeout: 120000, // 2 minutes
      gasPrice: "auto",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

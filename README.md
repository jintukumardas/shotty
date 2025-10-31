# Shotty - Your AI Butler for Flow Network

<div align="center">

<img src="./public/shotty_icon.jpg" alt="Shotty Logo" width="300" />

![Flow Network](https://img.shields.io/badge/Flow%20Network-EVM%20Testnet-00EF8B)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

### 🌟 **Chat Your Way Through Web3** 🌟

*Transform complex blockchain operations into simple conversations*

[🎮 Try It Now](https://shotty-beta.vercel.app/dashboard)

</div>

---

## 💫 What is Shotty?

**Shotty** is an intelligent AI butler that brings conversational simplicity to Flow Network. No more complex forms, confusing interfaces, or wallet addresses to copy-paste. Just chat naturally with Shotty to:

- 💸 **Send tokens** across chains
- 🎨 **Mint NFTs** with IPFS storage
- 🌐 **Register .flow domains**
- 👤 **Manage contacts** on-chain
- 🔗 **Create payment links** anyone can redeem
- 📊 **Track transactions** and view history
- 📱 **Generate QR codes** for wallet addresses
- 🪙 **Create ERC20 tokens** with custom parameters
- 🌉 **Bridge tokens** across multiple blockchain networks
- ⚡ **Batch EVM transactions** for efficient multi-operation execution
- ⏰ **Schedule transactions** for future execution with time-locks
- 🔄 **Flow Actions** for composable transaction workflows
- 💰 **Lending & Borrowing** with DeFi protocols integration

**Powered by:** AI + Flow Network EVM + DeFi Protocols

---

## ✨ Features & Capabilities

### 🎯 Complete Feature Matrix

| Feature | Description | Smart Contract | Status |
|---------|-------------|----------------|--------|
| **💸 Token Transfers** | Send tokens cross-chain with natural language | Native Flow Network | ✅ Live |
| **🔗 Payment Links** | Create shareable, redeemable token links | [`0x5d72...8e75`](https://evm-testnet.flowscan.io/address/0x5d726C51a99a0F78a05b5ab1591340B321778e75) | ✅ Live |
| **🎨 NFT Minting** | Mint NFTs with IPFS storage via Pinata | [`0x332e...FF0A`](https://evm-testnet.flowscan.io/address/0x332ee5D730cBFD516Bac7D1e0CFf763d235dFF0A) | ✅ Live |
| **🖼️ NFT Gallery** | View and manage your NFT collection | Same as NFT Minting | ✅ Live |
| **🌐 Domain Registration** | Register .flow domains on Flow Network | [`0x5542...70f3`](https://evm-testnet.flowscan.io/address/0x55422db56C11a62AfB285e70c6a541A9E80B70f3) | ✅ Live |
| **👤 Contact Manager** | On-chain address book with friendly names | [`0x4354...C218`](https://evm-testnet.flowscan.io/address/0x4354BE4A734E3DC61182F0e09Bc5B0cc264CC218) | ✅ Live |
| **📄 Document Storage** | Secure IPFS document storage with on-chain refs | [`0x42D2...525B`](https://evm-testnet.flowscan.io/address/0x42D2e14cb7d931216F0154625db3dA4F3e90525B) | ✅ Live |
| **💰 Balance Checker** | Real-time wallet balance queries | Native Flow Network | ✅ Live |
| **📊 Transaction History** | View recent blockchain transactions | Block Explorer API | ✅ Live |
| **📱 QR Code Generator** | Generate scannable QR codes for wallet addresses | Client-side Generation | ✅ Live |
| **🪙 ERC20 Token Factory** | Create custom ERC20 tokens with your parameters | [`0xE49c...33f5`](https://evm-testnet.flowscan.io/address/0xE49c80345b9B043dAefc3CD2e5FE6b31995c33f5) | ✅ Live |
| **🔄 Token Ownership Transfer** | Transfer ownership of created ERC20 tokens | Same as Token Factory | ✅ Live |
| **📋 Token Portfolio** | View all ERC20 tokens you've created | Same as Token Factory | ✅ Live |
| **🌉 Cross-Chain Bridge** | Bridge tokens across 20+ blockchain networks | DeFi Aggregator (Mainnet Only) | ✅ Live |
| **⚡ Batch EVM Transactions** | Execute multiple EVM operations in a single transaction | [`0xC3d8...DBa3`](https://evm-testnet.flowscan.io/address/0xC3d8AfB3462f726Db9d793DefdCFC67D7E12DBa3) | ✅ Live |
| **⏰ Scheduled Transactions** | Schedule transactions with time-locks and future execution | [`0xfF0e...53a7`](https://evm-testnet.flowscan.io/address/0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7) | ✅ Live |
| **🔄 Flow Actions** | Composable transaction workflows with connectors | [`0xe4ab...bA0d`](https://evm-testnet.flowscan.io/address/0xe4ab654a03826E15039913D0D0E1E4Af2117bA0d) | ✅ Live |
| **💰 Lending & Borrowing** | Lend assets to earn interest or borrow against collateral | [`0x3b4c...bF6b`](https://evm-testnet.flowscan.io/address/0x3b4cAE62020487263Fc079312f9199a1b014BF6b) | ✅ Live |

---

## 🎪 Command Examples

### 📝 Natural Language Commands

| Category | Example Command | What It Does |
|----------|----------------|--------------|
| **💸 Sending** | `"Send 1 FLOW to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"` | Transfers 1 FLOW token to the address |
| | `"Send 0.5 ETH to Alice"` | Sends to saved contact "Alice" |
| **🔗 Payment Links** | `"Create a payment link for 10 FLOW"` | Generates shareable redemption link |
| | `"Create a link for 5 FLOW"` | Creates 5 FLOW redeemable link |
| **🎨 NFTs** | `"Mint an NFT"` | Opens guided NFT minting flow |
| | `"Show my NFTs"` | Displays your NFT collection |
| | `"Transfer NFT #42 to 0x123..."` | Transfers NFT token #42 |
| **🌐 Domains** | `"Register domain myname.flow"` | Registers myname.flow domain |
| | `"Resolve domain alice.flow"` | Looks up domain owner address |
| | `"Transfer domain alice.flow to 0x456..."` | Transfers domain ownership |
| | `"Update alice.flow to point to 0x789..."` | Updates domain resolution |
| | `"Show my domains"` | Lists all domains you own |
| | `"Is bitcoin.flow available?"` | Checks domain availability |
| | `"Renew domain alice.flow"` | Extends domain expiration |
| **👤 Contacts** | `"Add contact Alice at 0x123..."` | Saves Alice to address book |
| | `"Show my contacts"` | Lists all saved contacts |
| | `"Find contact Bob"` | Searches for contact Bob |
| | `"Update contact Alice to 0x456..."` | Updates Alice's address |
| | `"Remove contact Bob"` | Deletes Bob from contacts |
| **💰 Balance** | `"What's my balance?"` | Shows your wallet balance |
| | `"Check my balance"` | Same as above |
| **📊 History** | `"Show my recent transactions"` | Displays last 10 transactions |
| | `"View my last 5 transactions"` | Shows last 5 transactions |
| **📱 QR Codes** | `"Generate QR code"` | Creates QR for your wallet |
| | `"Create QR for 0x123..."` | Generates QR for specific address |
| **🪙 ERC20 Tokens** | `"Create a token called MyToken with symbol MTK and 1000000 supply"` | Deploys new ERC20 token |
| | `"Transfer ownership of 0x123... to 0x456..."` | Transfers token ownership |
| | `"Show my tokens"` | Lists all created ERC20 tokens |
| **🌉 Cross-Chain Bridge** | `"Bridge tokens between networks"` | Opens bridge modal to transfer tokens across chains |
| | `"Bridge 10 FLOW to Ethereum"` | Opens modal with Flow to Ethereum pre-configured |
| | `"Swap tokens across chains"` | Opens cross-chain bridge interface |
| **⚡ Batch Transactions** | `"Batch send 1 FLOW to Alice, 2 FLOW to Bob, and mint NFT"` | Executes multiple operations in single transaction |
| | `"Batch approve token and swap for USDC"` | Approves and swaps in one transaction |
| **⏰ Scheduled Transactions** | `"Schedule sending 5 FLOW to Alice tomorrow at 2pm"` | Creates time-locked transaction for future |
| | `"Schedule token transfer for next Monday"` | Schedules transaction with specific date |
| | `"Cancel scheduled transaction #42"` | Cancels pending scheduled transaction |
| **🔄 Flow Actions** | `"Create workflow: swap tokens and stake result"` | Builds composable transaction workflow |
| | `"Execute action: borrow, swap, and lend"` | Runs complex DeFi action sequence |
| **💰 Lending & Borrowing** | `"Lend 100 FLOW to earn interest"` | Deposits assets into lending pool |
| | `"Borrow 50 USDC using my FLOW as collateral"` | Takes loan against deposited collateral |
| | `"What's my lending position?"` | Shows current loans and deposits |
| | `"Repay my USDC loan"` | Repays borrowed amount with interest |

---

## 🏗️ Architecture & Technology

### 🛠️ Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                       │
│  Next.js 15 • React 19 • TypeScript • Tailwind CSS      │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      AI Layer                           │
│        OpenAI • Intent Parser • NLP                     │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  Blockchain Layer                       │
│      Flow Network EVM • Ethers.js • Viem  • DiFi        │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   Storage Layer                         │
│         Pinata (IPFS) • On-Chain Metadata               │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **MetaMask** or any Web3 wallet
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))
- **Pinata Account** ([Sign up](https://pinata.cloud/)) for IPFS

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jintukumardas/shotty
   cd shotty
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure `.env.local`**
   ```bash
   # Flow Network Configuration
   NEXT_PUBLIC_FLOW_CHAIN_RPC=https://testnet.evm.nodes.onflow.org
   NEXT_PUBLIC_FLOW_CHAIN_ID=545
   NEXT_PUBLIC_FLOW_NETWORK=testnet

   # OpenAI
   OPENAI_API_KEY=sk-proj-your-key-here

   # Pinata (IPFS)
   NEXT_PUBLIC_PINATA_JWT=your-pinata-jwt
   NEXT_PUBLIC_PINATA_GATEWAY=your-gateway.mypinata.cloud

   # Deployed Contracts (Flow EVM Testnet)
   NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=0x5d726C51a99a0F78a05b5ab1591340B321778e75
   NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x332ee5D730cBFD516Bac7D1e0CFf763d235dFF0A
   NEXT_PUBLIC_DOMAIN_CONTRACT_ADDRESS=0x55422db56C11a62AfB285e70c6a541A9E80B70f3
   NEXT_PUBLIC_ADDRESSBOOK_CONTRACT_ADDRESS=0x4354BE4A734E3DC61182F0e09Bc5B0cc264CC218
   NEXT_PUBLIC_SECURESTORAGE_CONTRACT_ADDRESS=0x42D2e14cb7d931216F0154625db3dA4F3e90525B
   NEXT_PUBLIC_ERC20_FACTORY_ADDRESS=0xE49c80345b9B043dAefc3CD2e5FE6b31995c33f5
   NEXT_PUBLIC_BATCH_CONTRACT_ADDRESS=0xC3d8AfB3462f726Db9d793DefdCFC67D7E12DBa3
   NEXT_PUBLIC_SCHEDULED_CONTRACT_ADDRESS=0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7
   NEXT_PUBLIC_FLOW_ACTIONS_CONTRACT_ADDRESS=0xe4ab654a03826E15039913D0D0E1E4Af2117bA0d
   NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS=0x3b4cAE62020487263Fc079312f9199a1b014BF6b
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

7. **Get testnet tokens**
   - Visit [Flow Testnet Faucet](https://testnet-faucet.onflow.org)
   - Connect your wallet
   - Request test FLOW tokens

---

## 🎮 Usage Guide

### First Time Setup

1. **Connect Wallet** - Click the wallet button in the top right
2. **Get Test Tokens** - Use the faucet link in the dashboard
3. **Start Chatting** - Type natural language commands in the chat

### Example Workflow

```
You: "What's my balance?"
Shotty: You have 10.5 FLOW on Flow EVM Testnet

You: "Send 1 FLOW to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
Shotty: I'll send 1 FLOW to 0x742d... Please confirm.
     [Confirm] [Cancel]

You: [Confirm]
Shotty: ✅ Transaction sent! Hash: 0xabc...def
     View on explorer →

You: "Mint an NFT"
Shotty: Let me help you mint an NFT! Please provide:
     - Name
     - Description
     - Image upload
     [Opens NFT minting modal]
```

---

## 🌐 Deployed Contracts

| Contract | Address | Explorer | Purpose |
|----------|---------|----------|---------|
| **Payment Links Escrow** | `0x5d726C51a99a0F78a05b5ab1591340B321778e75` | [View →](https://evm-testnet.flowscan.io/address/0x5d726C51a99a0F78a05b5ab1591340B321778e75) | Token redemption links |
| **Universal NFT** | `0x332ee5D730cBFD516Bac7D1e0CFf763d235dFF0A` | [View →](https://evm-testnet.flowscan.io/address/0x332ee5D730cBFD516Bac7D1e0CFf763d235dFF0A) | NFT minting & transfers |
| **Domain Registry** | `0x55422db56C11a62AfB285e70c6a541A9E80B70f3` | [View →](https://evm-testnet.flowscan.io/address/0x55422db56C11a62AfB285e70c6a541A9E80B70f3) | .flow domain registration |
| **Address Book** | `0x4354BE4A734E3DC61182F0e09Bc5B0cc264CC218` | [View →](https://evm-testnet.flowscan.io/address/0x4354BE4A734E3DC61182F0e09Bc5B0cc264CC218) | On-chain contact manager |
| **Secure Storage** | `0x42D2e14cb7d931216F0154625db3dA4F3e90525B` | [View →](https://evm-testnet.flowscan.io/address/0x42D2e14cb7d931216F0154625db3dA4F3e90525B) | IPFS document storage |
| **ERC20 Token Factory** | `0xE49c80345b9B043dAefc3CD2e5FE6b31995c33f5` | [View →](https://evm-testnet.flowscan.io/address/0xE49c80345b9B043dAefc3CD2e5FE6b31995c33f5) | Custom ERC20 token deployment |
| **Batch Transactions** | `0xC3d8AfB3462f726Db9d793DefdCFC67D7E12DBa3` | [View →](https://evm-testnet.flowscan.io/address/0xC3d8AfB3462f726Db9d793DefdCFC67D7E12DBa3) | Multi-operation batch execution |
| **Scheduled Transactions** | `0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7` | [View →](https://evm-testnet.flowscan.io/address/0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7) | Time-locked transaction scheduling |
| **Flow Actions** | `0xe4ab654a03826E15039913D0D0E1E4Af2117bA0d` | [View →](https://evm-testnet.flowscan.io/address/0xe4ab654a03826E15039913D0D0E1E4Af2117bA0d) | Composable workflow engine |
| **Lending Protocol** | `0x3b4cAE62020487263Fc079312f9199a1b014BF6b` | [View →](https://evm-testnet.flowscan.io/address/0x3b4cAE62020487263Fc079312f9199a1b014BF6b) | DeFi lending & borrowing |

---

## 📚 Resources

### Official Links

- 🌐 **Flow Network**: [flow.com](https://flow.com)
- 📖 **Documentation**: [Flow Developers](https://developers.flow.com)
- 🔍 **Block Explorer**: [Flow EVM Testnet Explorer](https://evm-testnet.flowscan.io)
- 💧 **Testnet Faucet**: [Flow Testnet Faucet](https://testnet-faucet.onflow.org)
- 🚀 **Flow Actions & Workflows**: [Forte Upgrade Overview](https://flow.com/forte)

### 📖 Developer Tutorials & Guides

#### Cross-VM & Advanced Features
- ⚡ **Batched EVM Transactions**: [Tutorial](https://developers.flow.com/blockchain-development-tutorials/cross-vm-apps/batched-evm-transactions)
- ⏰ **Scheduled Transactions**: [Introduction](https://developers.flow.com/blockchain-development-tutorials/forte/scheduled-transactions/scheduled-transactions-introduction)

#### Flow Actions & Composability
- 🔄 **Flow Actions Introduction**: [Getting Started](https://developers.flow.com/blockchain-development-tutorials/forte/flow-actions/intro-to-flow-actions)
- 🔌 **Flow Actions Connectors**: [Documentation](https://developers.flow.com/blockchain-development-tutorials/forte/flow-actions/connectors)
- 🧩 **Basic Combinations**: [Composing Actions](https://developers.flow.com/blockchain-development-tutorials/forte/flow-actions/basic-combinations)
- 📝 **Flow Actions Transactions**: [Transaction Guide](https://developers.flow.com/blockchain-development-tutorials/forte/flow-actions/flow-actions-transaction)

#### Cadence Smart Contracts
- 🏗️ **Building Frontend Apps**: [Frontend Integration](https://developers.flow.com/blockchain-development-tutorials/cadence/getting-started/building-a-frontend-app)
- 🔗 **Smart Contract Interaction**: [Interaction Guide](https://developers.flow.com/blockchain-development-tutorials/cadence/getting-started/smart-contract-interaction)
- 🎼 **Compose with Transactions**: [Transaction Composition](https://developers.flow.com/blockchain-development-tutorials/cadence/cadence-advantages/compose-with-cadence-transactions)
- 📊 **Native Data Availability**: [Scripts Guide](https://developers.flow.com/blockchain-development-tutorials/cadence/cadence-advantages/native-data-availibility-with-cadence-scripts)

#### Advanced Topics
- 🔢 **Fixed Point Math (128-bit)**: [Math Library](https://developers.flow.com/blockchain-development-tutorials/forte/fixed-point-128-bit-math)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- 💜 **Flow Foundation** - For creating the Flow Network and EVM compatibility
- 🌟 **Flow Community** - For continuous support and feedback
- 🤖 **OpenAI** - For GPT powering the AI butler
- 📌 **Pinata** - For reliable IPFS infrastructure

---

## 📞 Support & Contact

- 🐛 **Report Issues**: [GitHub Issues](https://github.com/jintukumardas/shotty/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/jintukumardas/shotty/discussions)
- 📧 **Email**: jintudas098@gmail.com
- 🐦 **Twitter**: [@jintuisbusy](https://x.com/jintuisbusy)

---

<div align="center">

### 🌟 Built with ❤️ for Flow Network 🌟

**If you find Shotty helpful, please give it a ⭐ on GitHub!**

[⬆ Back to Top](#-shotty---your-ai-butler-for-flow-network)

</div>

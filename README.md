# 🤖 Shotty - Your AI Butler for Flow Network

<div align="center">

![Flow Network](https://img.shields.io/badge/Flow%20Network-EVM%20Testnet-00EF8B)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

### 🌟 **Chat Your Way Through Web3** 🌟

*Transform complex blockchain operations into simple conversations*

[🎮 Try It Now](https://shotty.vercel.app/dashboard)

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

**Powered by:** AI + Flow Network EVM

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
| **🪙 ERC20 Token Factory** | Create custom ERC20 tokens with your parameters | [`0xbb3E...26a0`](https://evm-testnet.flowscan.io/address/0xbb3E64F2D72ac754c7C98eC43b549F0F78bd26a0) | ✅ Live |
| **🔄 Token Ownership Transfer** | Transfer ownership of created ERC20 tokens | Same as Token Factory | ✅ Live |
| **📋 Token Portfolio** | View all ERC20 tokens you've created | Same as Token Factory | ✅ Live |

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
│        OpenAI • Intent Parser • NLP               │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  Blockchain Layer                       │
│      Flow Network EVM • Ethers.js • Viem                │
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
   NEXT_PUBLIC_TOKEN_FACTORY_CONTRACT_ADDRESS=0xbb3E64F2D72ac754c7C98eC43b549F0F78bd26a0
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
| **ERC20 Token Factory** | `0xbb3E64F2D72ac754c7C98eC43b549F0F78bd26a0` | [View →](https://evm-testnet.flowscan.io/address/0xbb3E64F2D72ac754c7C98eC43b549F0F78bd26a0) | Custom ERC20 token deployment |

---

## 📚 Resources

### Official Links

- 🌐 **Flow Network**: [flow.com](https://flow.com)
- 📖 **Documentation**: [Flow Developers](https://developers.flow.com)
- 🔍 **Block Explorer**: [Flow EVM Testnet Explorer](https://evm-testnet.flowscan.io)
- 💧 **Testnet Faucet**: [Flow Testnet Faucet](https://testnet-faucet.onflow.org)
- 🚀 **Flow Actions & Workflows**: [Forte Upgrade Overview](https://flow.com/forte)
  
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
- 🐦 **Twitter**: [@jintukumardas](https://x.com/jintuisbusy)

---

<div align="center">

### 🌟 Built with ❤️ for Flow Network 🌟

**If you find Shotty helpful, please give it a ⭐ on GitHub!**

[⬆ Back to Top](#-shotty---your-ai-butler-for-flow-network)

</div>

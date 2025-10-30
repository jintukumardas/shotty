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

**Powered by:** OpenAI GPT-4 + Flow Network EVM

---

## ✨ Features & Capabilities

### 🎯 Complete Feature Matrix

| Feature | Description | Smart Contract | Status |
|---------|-------------|----------------|--------|
| **💸 Token Transfers** | Send tokens cross-chain with natural language | Native Flow Network | ✅ Live |
| **🔗 Payment Links** | Create shareable, redeemable token links | [`0x0156...8Cd3`](https://evm-testnet.flowscan.io/address/0x015655A8bBaCA2a2be4b8F564f0EAC4EdcCa8Cd3) | ✅ Live |
| **🎨 NFT Minting** | Mint NFTs with IPFS storage via Pinata | [`0x26E8...b0f9`](https://evm-testnet.flowscan.io/address/0x26E82B153ba980492DB3c7D8D898C48248E5b0f9) | ✅ Live |
| **🖼️ NFT Gallery** | View and manage your NFT collection | Same as NFT Minting | ✅ Live |
| **🌐 Domain Registration** | Register .flow domains on Flow Network | [`0x84c4...Fc49`](https://evm-testnet.flowscan.io/address/0x84c48f4995Db90e9feD4c46d27e6468A5172Fc49) | ✅ Live |
| **👤 Contact Manager** | On-chain address book with friendly names | [`0x369f...3796`](https://evm-testnet.flowscan.io/address/0x369fB3ED4FD33B365354E116cB0E556b541A3796) | ✅ Live |
| **📄 Document Storage** | Secure IPFS document storage with on-chain refs | [`0x51cd...29a2`](https://evm-testnet.flowscan.io/address/0x51cda9f73020429854c43Ddc51f6cA0a394629a2) | ✅ Live |
| **💰 Balance Checker** | Real-time wallet balance queries | Native Flow Network | ✅ Live |
| **📊 Transaction History** | View recent blockchain transactions | Block Explorer API | ✅ Live |
| **📱 QR Code Generator** | Generate scannable QR codes for wallet addresses | Client-side Generation | ✅ Live |
| **🪙 ERC20 Token Factory** | Create custom ERC20 tokens with your parameters | [`0x9f7d...6dE3`](https://evm-testnet.flowscan.io/address/0x9f7d31806eE63fC00d63cf00Be5f5D82c9486dE3) | ✅ Live |
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
│        OpenAI GPT-4 • Intent Parser • NLP               │
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

### 🎨 UI Components

- **Flow Network Design System** - Clean and sharp UI components
- **Lucide React** - Beautiful icon system
- **Custom Glowing Scrollbar** - Branded scrollbar with gradient effects
- **Responsive Design** - Mobile-first approach

---

## 📁 Project Structure

```
shotty/
├── 📱 app/                           # Next.js App Router
│   ├── 🏠 page.tsx                   # Landing page
│   ├── 📊 dashboard/                 # Main dashboard
│   │   └── page.tsx                  # Dashboard UI
│   ├── 💬 chat/                      # Chat interface
│   │   └── page.tsx                  # Standalone chat page
│   ├── 🎁 redeem/[linkId]/          # Payment link redemption
│   │   └── page.tsx                  # Redeem page
│   ├── 🎨 globals.css                # Global styles & scrollbar
│   └── 🔌 api/                       # API routes
│       ├── chat/transaction/         # AI chat endpoint
│       ├── redeem/                   # Redeem link APIs
│       ├── dashboard/stats/          # Dashboard data
│       └── portfolio/                # Portfolio data
│
├── 🧩 components/                    # React Components
│   ├── ChatTransactionInterface.tsx  # Main AI chat UI
│   ├── MintNFTModal.tsx             # NFT minting modal
│   ├── QRCodeModal.tsx              # QR code display modal
│   ├── CreateTokenModal.tsx         # ERC20 token creation
│   ├── nft/                          # NFT components
│   ├── domains/                      # Domain components
│   └── contacts/                     # Contact components
│
├── ⚙️ services/                      # Business Logic
│   ├── 🤖 ai/                        # AI & NLP
│   │   └── intentParser.ts           # Intent recognition
│   ├── ⛓️ pushchain/                 # Push Chain integration
│   │   ├── useWallet.ts              # Wallet hook
│   │   └── universalTransaction.ts   # Universal TX logic
│   ├── 🎨 nft/                       # NFT services
│   │   └── nftService.ts             # NFT operations
│   ├── 🌐 domains/                   # Domain services
│   │   └── domainService.ts          # Domain operations
│   ├── 🪙 erc20/                     # ERC20 token services
│   │   └── erc20Service.ts           # Token factory operations
│   ├── 👤 addressBook/               # Contact services
│   ├── 📄 storage/                   # Document storage
│   ├── 🔗 escrow/                    # Payment links
│   │   └── redeemLinks.ts            # Escrow logic
│   ├── 📡 ipfs/                      # IPFS integration
│   │   └── pinataService.ts          # Pinata SDK wrapper
│   ├── 💬 chat/                      # Chat handlers
│   │   └── actionHandlers.ts         # Action execution
│   └── 📊 transactions/              # TX services
│       └── transactionService.ts     # TX tracking
│
├── 📜 contracts/                     # Smart Contracts
│   ├── RedeemLinksEscrow.sol         # Payment link escrow ✅ Deployed
│   ├── UniversalNFT.sol              # NFT minting ✅ Deployed
│   ├── DomainRegistry.sol            # .push domains ✅ Deployed
│   ├── AddressBook.sol               # Contacts ✅ Deployed
│   ├── SecureStorage.sol             # Documents ✅ Deployed
│   └── ERC20TokenFactory.sol         # ERC20 token factory ✅ Deployed
│
├── 🎭 types/                         # TypeScript types
└── 📦 public/                        # Static assets
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

   # OpenAI
   OPENAI_API_KEY=sk-proj-your-key-here

   # Pinata (IPFS)
   NEXT_PUBLIC_PINATA_JWT=your-pinata-jwt
   NEXT_PUBLIC_PINATA_GATEWAY=your-gateway.mypinata.cloud

   # Deployed Contracts (to be redeployed on Flow Network)
   NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS=
   NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=
   NEXT_PUBLIC_DOMAIN_CONTRACT_ADDRESS=
   NEXT_PUBLIC_ADDRESSBOOK_CONTRACT_ADDRESS=
   NEXT_PUBLIC_SECURESTORAGE_CONTRACT_ADDRESS=
   NEXT_PUBLIC_ERC20_FACTORY_ADDRESS=
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

## 🔒 Security

- ✅ **Client-side wallet management** - Keys never leave your browser
- ✅ **Transaction confirmation** - All transactions require user approval
- ✅ **Smart contract audits** - Contracts deployed on testnet. Not yet audited - only for demonstration purpose
- ✅ **IPFS for storage** - Decentralized file storage via Pinata
- ✅ **Environment variables** - Sensitive data in `.env.local`

---

## 🌐 Deployed Contracts

| Contract | Address | Explorer Link | Purpose |
|----------|---------|---------------|---------|
| **Payment Links Escrow** | `0x015655A8bBaCA2a2be4b8F564f0EAC4EdcCa8Cd3` | [View](https://evm-testnet.flowscan.io/address/0x015655A8bBaCA2a2be4b8F564f0EAC4EdcCa8Cd3) | Token redemption links |
| **Universal NFT** | `0x26E82B153ba980492DB3c7D8D898C48248E5b0f9` | [View](https://evm-testnet.flowscan.io/address/0x26E82B153ba980492DB3c7D8D898C48248E5b0f9) | NFT minting & transfers |
| **Domain Registry** | `0x84c48f4995Db90e9feD4c46d27e6468A5172Fc49` | [View](https://evm-testnet.flowscan.io/address/0x84c48f4995Db90e9feD4c46d27e6468A5172Fc49) | .flow domain registration |
| **Address Book** | `0x369fB3ED4FD33B365354E116cB0E556b541A3796` | [View](https://evm-testnet.flowscan.io/address/0x369fB3ED4FD33B365354E116cB0E556b541A3796) | On-chain contact manager |
| **Secure Storage** | `0x51cda9f73020429854c43Ddc51f6cA0a394629a2` | [View](https://evm-testnet.flowscan.io/address/0x51cda9f73020429854c43Ddc51f6cA0a394629a2) | IPFS document storage |
| **ERC20 Token Factory** | `0x9f7d31806eE63fC00d63cf00Be5f5D82c9486dE3` | [View](https://evm-testnet.flowscan.io/address/0x9f7d31806eE63fC00d63cf00Be5f5D82c9486dE3) | Custom ERC20 token deployment |

---

## 🏆 Key Features Explained

### 💸 Cross-Chain Transactions
Execute transactions seamlessly on Flow Network EVM with native FLOW token support.

### 🤖 AI-Powered Intent Recognition
Natural language processing understands your intent and executes the right blockchain operation.

### ⚡ Fast Finality
Transactions confirm quickly thanks to Flow Network's high-performance blockchain.

### 🎨 IPFS Integration
All NFT images and metadata stored on decentralized IPFS via Pinata.

### 🔗 Shareable Payment Links
Create magic links that anyone can use to claim tokens - perfect for airdrops and gifts!

### 📱 QR Code Generation
Generate scannable QR codes for any wallet address. Share with users to receive payments easily.

### 🪙 Custom ERC20 Token Creation
Deploy your own ERC20 tokens with custom names, symbols, and supply. Full ownership control with mint and burn capabilities.

---

## 🆕 Latest Features (January 2025)

### 📱 QR Code Generator

**Generate scannable QR codes for any wallet address with a single chat command.**

**Features:**
- 📸 **High-Quality QR Codes** - Generated client-side using `qrcode.react`
- 💾 **Download as PNG** - Save QR codes for offline sharing
- 📋 **Copy Address** - One-click address copying with confirmation
- 🎨 **Beautiful UI** - Matches Shotty's design language with glassmorphism effects
- ⚡ **Instant Generation** - No server roundtrips, instant QR display

**How to Use:**
```
You: "Generate QR code"
Shotty: I'll generate a QR code for your wallet address.
     [Opens QR modal with scannable code]

You: "Create QR for 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
Shotty: I'll generate a QR code for address 0x742d...
     [Opens QR modal for specified address]
```

**Use Cases:**
- 💰 Accept payments in person - customers scan to send tokens
- 🎁 Share your address visually at events
- 📱 Easy mobile wallet integration
- 🖨️ Print QR codes for physical displays

---

### 🪙 ERC20 Token Factory

**Create and manage custom ERC20 tokens through natural language chat.**

**Smart Contract Features:**
- ✅ **Standard ERC20** - Full compliance with ERC20 specification
- 👑 **Ownable** - Transfer ownership to other addresses
- ➕ **Mintable** - Owner can mint additional tokens after deployment
- 🔥 **Burnable** - Owner can burn their own tokens
- 🎛️ **Configurable Decimals** - Choose 0-18 decimals (default: 18)
- 📊 **Factory Pattern** - Efficient deployment of multiple tokens
- 📝 **Event Emission** - Track all token creations on-chain

**Token Management:**
- 📋 **View Created Tokens** - See all tokens you've deployed
- 🔄 **Transfer Ownership** - Hand over control to another address
- 💰 **Query Balances** - Check token holdings
- 📈 **Track Token Info** - View name, symbol, supply, and decimals

**How to Use:**

**Creating a Token:**
```
You: "Create a token called MyToken with symbol MTK and 1000000 supply"
Shotty: Ready to create ERC20 token "MyToken" (MTK) with supply of 1000000
     [Opens token creation modal with details]

You: [Review and confirm in modal]
Shotty: ✅ Successfully created ERC20 token "MyToken" (MTK)!
     Token Address: 0xabc...def

     You can now:
     • Transfer tokens to others
     • Transfer ownership
     • View token details
```

**Transferring Ownership:**
```
You: "Transfer ownership of 0xabc...def to 0x123...456"
Shotty: Ready to transfer ownership of token 0xabc...def to 0x123...456
     [Confirm transaction]

You: [Confirm]
Shotty: ✅ Ownership transferred successfully!
```

**Viewing Your Tokens:**
```
You: "Show my tokens"
Shotty: Fetching your ERC20 tokens...

     You have created 3 tokens:
     1. MyToken (MTK) - 1,000,000 supply
     2. TestCoin (TST) - 500,000 supply
     3. DemoToken (DMO) - 10,000,000 supply
```

**Use Cases:**
- 🏢 **Project Tokens** - Create tokens for your DApp or project
- 🎮 **Gaming Currencies** - In-game tokens for web3 games
- 🎓 **Community Tokens** - Reward systems for communities
- 🔬 **Experimentation** - Test token economics on testnet
- 💼 **Corporate Tokens** - Internal company reward systems
- 🎉 **Event Tokens** - Temporary tokens for hackathons or events

**Technical Details:**
- **Contract**: `ERC20TokenFactory.sol` deployed at `0x9f7d31806eE63fC00d63cf00Be5f5D82c9486dE3`
- **Service**: `erc20Service.ts` handles all token operations
- **UI**: `CreateTokenModal.tsx` provides intuitive token creation interface
- **Integration**: Fully integrated with AI intent parser for natural language commands

---

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

### Environment Variables on Vercel

Make sure to add all variables from `.env.local` to your Vercel project settings.

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. 🍴 **Fork** the repository
2. 🌿 **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. 📤 **Push** to the branch (`git push origin feature/amazing-feature`)
5. 🔀 **Open** a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly

---

## 📚 Resources

### Official Links

- 🌐 **Flow Network**: [flow.com](https://flow.com)
- 📖 **Documentation**: [Flow Developers](https://developers.flow.com)
- 🔍 **Block Explorer**: [Flow EVM Testnet Explorer](https://evm-testnet.flowscan.io)
- 💧 **Testnet Faucet**: [Flow Testnet Faucet](https://testnet-faucet.onflow.org)
- 🚀 **Flow Actions & Workflows**: [Forte Upgrade Overview](https://flow.com/forte)
  
---

## 🐛 Troubleshooting

### Common Issues

**Q: Build fails with TypeScript errors**
```bash
npm run build --turbopack
```

**Q: Wallet won't connect**
- Make sure you're on Flow EVM Testnet (Chain ID: 545)
- Add network manually in MetaMask using [Chainlist](https://chainlist.org/chain/545)

**Q: Transactions failing**
- Check you have sufficient testnet tokens
- Visit [Flow Testnet Faucet](https://testnet-faucet.onflow.org) for more

**Q: NFT images not loading**
- Verify `NEXT_PUBLIC_PINATA_GATEWAY` is set
- Check Pinata JWT is valid

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- 💜 **Flow Foundation** - For creating the Flow Network and EVM compatibility
- 🌟 **Flow Community** - For continuous support and feedback
- 🤖 **OpenAI** - For GPT-4 powering the AI butler
- 📌 **Pinata** - For reliable IPFS infrastructure

---

## 📞 Support & Contact

- 🐛 **Report Issues**: [GitHub Issues](https://github.com/jintukumardas/shotty/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/jintukumardas/shotty/discussions)
- 📧 **Email**: jintudas098@gmail.com
- 🐦 **Twitter**: [@jintukumardas](https://twitter.com/jintukumardas)

---

<div align="center">

### 🌟 Built with ❤️ for Flow Network 🌟

**If you find Shotty helpful, please give it a ⭐ on GitHub!**

[⬆ Back to Top](#-shotty---your-ai-butler-for-flow-network)

</div>

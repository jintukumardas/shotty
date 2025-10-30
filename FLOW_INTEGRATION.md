# Flow Blockchain Integration Guide

## Overview

Shotty AI Butler is now fully integrated with **Flow Blockchain**, supporting both Flow EVM and native Flow wallets.

## Features

### ✅ Dual Wallet Support
1. **EVM Wallets** (MetaMask, Coinbase, WalletConnect)
   - Connect to Flow EVM Testnet (Chain ID: 545)
   - Connect to Flow EVM Mainnet (Chain ID: 747)
   - Full EVM compatibility via ethers.js

2. **Flow Wallets** (Blocto, Lilico, Flow Reference)
   - Native Flow wallet support via FCL (Flow Client Library)
   - Access to Flow Cadence smart contracts
   - Seamless Flow ecosystem integration

### 🎨 Flow UI Theme
- **Primary Color**: `#00EF8B` (Flow Green)
- **Secondary Color**: `#00D9FF` (Flow Cyan)
- Custom Flow-branded components throughout the app

### 🔧 Technical Stack
- **@onflow/fcl** - Flow Client Library for wallet authentication
- **@onflow/types** - Type definitions for Flow
- **ethers.js** - EVM transaction handling
- **wagmi + RainbowKit** - Enhanced EVM wallet connection

## Configuration

### Environment Variables

Add to your `.env.local`:

```bash
# Flow EVM Configuration
NEXT_PUBLIC_FLOW_CHAIN_RPC=https://testnet.evm.nodes.onflow.org
NEXT_PUBLIC_FLOW_CHAIN_ID=545
NEXT_PUBLIC_FLOW_CHAIN_NAME=Flow EVM Testnet
NEXT_PUBLIC_FLOW_NETWORK=testnet

# Flow SDK
NEXT_PUBLIC_FLOW_ACCESS_NODE=https://rest-testnet.onflow.org
FLOW_PRIVATE_KEY=your_private_key_here

# WalletConnect (for enhanced wallet support)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### Network Configuration

**Flow EVM Testnet:**
- Chain ID: `545` (0x221)
- RPC: `https://testnet.evm.nodes.onflow.org`
- Explorer: `https://evm-testnet.flowscan.io`
- Native Token: `FLOW`

**Flow EVM Mainnet:**
- Chain ID: `747` (0x2eb)
- RPC: `https://mainnet.evm.nodes.onflow.org`
- Explorer: `https://evm.flowscan.io`
- Native Token: `FLOW`

## Usage

### Connecting Wallets

#### Option 1: EVM Wallet (MetaMask)

```typescript
import { useFlowWallet } from '@/services/blockchain/flowWallet';

function MyComponent() {
  const { connectEVMWallet, address, isConnected } = useFlowWallet();

  return (
    <button onClick={connectEVMWallet}>
      {isConnected ? `Connected: ${address}` : 'Connect MetaMask'}
    </button>
  );
}
```

#### Option 2: Flow Wallet (Blocto/Lilico)

```typescript
import { useFlowWallet } from '@/services/blockchain/flowWallet';

function MyComponent() {
  const { connectFlowWallet, address, isConnected, walletType } = useFlowWallet();

  return (
    <button onClick={connectFlowWallet}>
      {isConnected ? `Connected via ${walletType}` : 'Connect Flow Wallet'}
    </button>
  );
}
```

#### Option 3: Auto-detect (Smart Connect)

```typescript
import { useFlowWallet } from '@/services/blockchain/flowWallet';

function MyComponent() {
  const { connectWallet } = useFlowWallet();

  // Automatically tries EVM first, falls back to Flow FCL
  return <button onClick={connectWallet}>Connect Wallet</button>;
}
```

### Using the Connect Wallet Button

Pre-built component with Flow theming:

```typescript
import { ConnectWalletButton } from '@/components/ConnectWalletButton';

function App() {
  return <ConnectWalletButton />;
}
```

This component:
- Shows wallet selection modal
- Supports both EVM and Flow wallets
- Displays wallet info and balance
- Flow-themed UI (green/cyan gradient)

### Sending Transactions

```typescript
import { useFlowWallet } from '@/services/blockchain/flowWallet';

function SendTokens() {
  const { flowEvmClient, address } = useFlowWallet();

  const sendTransaction = async () => {
    if (!flowEvmClient) return;

    const txHash = await flowEvmClient.executeTransaction({
      to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      value: ethers.parseEther('1.0'), // 1 FLOW
    });

    console.log('Transaction sent:', txHash);
  };

  return <button onClick={sendTransaction}>Send 1 FLOW</button>;
}
```

## Architecture

### Core Files

1. **`/lib/flow-config.ts`**
   - FCL initialization
   - Network configuration
   - Flow access node setup

2. **`/services/blockchain/flowWallet.ts`**
   - Enhanced wallet hook with dual support
   - EVM + Flow wallet management
   - Balance tracking
   - Network switching

3. **`/services/blockchain/client.ts`**
   - Flow EVM client
   - Transaction execution
   - Contract interaction

4. **`/components/FlowProvider.tsx`**
   - React context for Flow
   - FCL initialization wrapper

5. **`/components/ConnectWalletButton.tsx`**
   - Pre-built wallet connection UI
   - Modal with wallet selection
   - Flow-themed design

### Data Flow

```
User Action
    ↓
FlowProvider (FCL Init)
    ↓
useFlowWallet Hook
    ↓
┌─────────────┬──────────────┐
│  EVM Wallet │  Flow Wallet │
│  (MetaMask) │  (Blocto)    │
└─────────────┴──────────────┘
    ↓               ↓
FlowEvmClient   FCL Methods
    ↓               ↓
Flow EVM Blockchain
```

## AI Assistant Integration

The AI system prompt has been updated to:
- Default to `FLOW` token instead of `FLOW`
- Use Flow EVM chain ID `545` (testnet) / `747` (mainnet)
- Remove all cross-chain bridging references
- Support Flow-specific features

Example AI responses:
- "I'll send 1 FLOW on Flow EVM to 0x..."
- "Creating redeem link for 5 FLOW..."
- "Registering domain myname.flow..."

## Migration from Push Chain

All Push Chain references have been removed:
- ❌ Push Chain SDK (`@pushchain/core`, `@pushchain/ui-kit`)
- ❌ Chain ID `42101`
- ❌ Native token `FLOW`
- ❌ Universal Transactions

Replaced with:
- ✅ Flow FCL (`@onflow/fcl`)
- ✅ Chain ID `545` (testnet) / `747` (mainnet)
- ✅ Native token `FLOW`
- ✅ Direct Flow EVM transactions

## Testing

### Manual Testing Checklist

- [ ] Connect MetaMask wallet
- [ ] Connect Flow wallet (Blocto/Lilico)
- [ ] Switch between networks
- [ ] Send FLOW tokens
- [ ] Check balance display
- [ ] View wallet info modal
- [ ] Disconnect wallet
- [ ] Reconnect on page reload

### Test Networks

Get testnet FLOW tokens:
- **Flow EVM Testnet Faucet**: https://testnet-faucet.onflow.org/

## Troubleshooting

### Issue: "Chain not added to wallet"
**Solution**: Click "Add Network" when prompted, or manually add Flow EVM network in your wallet settings.

### Issue: "FCL not initialized"
**Solution**: Ensure `FlowProvider` wraps your app in `app/providers.tsx`

### Issue: "Cannot read properties of undefined"
**Solution**: Check that wallet is connected before accessing `flowEvmClient` or `address`

### Issue: Flow wallet not connecting
**Solution**:
1. Check browser console for errors
2. Ensure FCL discovery URL is correct
3. Try a different Flow wallet (Blocto, Lilico, etc.)

## Resources

### Official Documentation
- **Flow Docs**: https://developers.flow.com/
- **Flow EVM**: https://developers.flow.com/evm/using
- **FCL-JS**: https://developers.flow.com/build/tools/clients/fcl-js
- **Flow Explorer**: https://evm-testnet.flowscan.io

### Wallet Downloads
- **MetaMask**: https://metamask.io/
- **Blocto**: https://blocto.io/
- **Lilico**: https://lilico.app/

### Community
- **Discord**: https://discord.gg/flow
- **Forum**: https://forum.flow.com/
- **Twitter**: https://twitter.com/flow_blockchain

## Contributing

To add more Flow features:

1. **Add Cadence Contracts**: Use FCL to interact with Flow Cadence smart contracts
2. **Flow NFTs**: Integrate with Flow's native NFT standards
3. **FUSD/USDC**: Add stablecoin support on Flow
4. **Flow Marketplace**: Connect to Flow NFT marketplaces

## License

This integration follows the same license as the main Shotty project.

---

Built with ❤️ for Flow Blockchain

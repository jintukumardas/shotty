# Smart Contract Tests

This directory contains comprehensive test suites for the Shotty Trading Butler smart contracts.

## Test Files

- **DomainRegistry.test.ts**: Tests for the Domain Name Registry contract
- **UniversalNFT.test.ts**: Tests for the Universal NFT contract

## Running Tests

### Run all tests

```bash
npx hardhat test
```

### Run specific test file

```bash
npx hardhat test test/DomainRegistry.test.ts
npx hardhat test test/UniversalNFT.test.ts
```

### Run tests with gas reporting

```bash
REPORT_GAS=true npx hardhat test
```

### Run tests with coverage

```bash
npx hardhat coverage
```

## Test Coverage

### DomainRegistry Tests

The DomainRegistry test suite covers:

- ✅ Contract deployment and initialization
- ✅ Domain registration (single and batch)
- ✅ Domain resolution
- ✅ Domain transfer
- ✅ Domain renewal
- ✅ Metadata updates
- ✅ Domain availability checks
- ✅ Owner queries
- ✅ Admin functions (fees, expiration periods)
- ✅ Edge cases and error handling

### UniversalNFT Tests

The UniversalNFT test suite covers:

- ✅ Contract deployment and initialization
- ✅ NFT minting (single and batch)
- ✅ NFT transfers
- ✅ Creator tracking
- ✅ Token enumeration
- ✅ Approval mechanisms
- ✅ ERC721 standard compliance
- ✅ Gas usage optimization
- ✅ Edge cases and error handling

## Deploy to Local Hardhat Network

### 1. Start local Hardhat node

Open a terminal and run:

```bash
npx hardhat node
```

This will start a local Ethereum network on http://127.0.0.1:8545

### 2. Deploy contracts (in a new terminal)

```bash
npx hardhat run scripts/deploy-local.ts --network localhost
```

This will:
- Deploy both contracts to the local network
- Run test transactions
- Save deployment info to `deployments/localhost.json`

### 3. Interact with deployed contracts

The deployment script saves the contract addresses. You can use them to interact with the contracts:

```typescript
import { ethers } from "hardhat";

const domainRegistryAddress = "0x..."; // From deployments/localhost.json
const DomainRegistry = await ethers.getContractAt("DomainRegistry", domainRegistryAddress);

// Register a domain
await DomainRegistry.registerDomain(
  "myname.local",
  31337,
  "0x...",
  "{}",
  { value: ethers.parseEther("0.01") }
);
```

## Test Accounts

When running on Hardhat network, you get 20 test accounts with 10,000 ETH each:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (10000 ETH)
...
```

## Debugging Tests

### Add console.log in contracts

```solidity
import "hardhat/console.sol";

function registerDomain(...) public {
    console.log("Registering domain:", domainName);
    // ...
}
```

### Run with verbose output

```bash
npx hardhat test --verbose
```

### Run single test

```bash
npx hardhat test --grep "Should register a new domain"
```

## Common Issues

### Issue: "HH8: There's one or more errors in your config file"

**Solution**: Check that all dependencies are installed:
```bash
npm install
```

### Issue: "Error: could not detect network"

**Solution**: Make sure Hardhat node is running:
```bash
npx hardhat node
```

### Issue: Tests fail with "InvalidInputError"

**Solution**: Clear cache and recompile:
```bash
npx hardhat clean
npx hardhat compile
```

## Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Chai Matchers](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html)
- [ethers.js Documentation](https://docs.ethers.org/v6/)

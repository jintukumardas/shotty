// Test script to verify Push Chain RPC connection
const { ethers } = require('ethers');

async function testConnection() {
  const rpcUrl = 'https://evm.rpc-testnet-donut-node2.push.org/';

  try {
    console.log('Testing connection to:', rpcUrl);

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Test 1: Get network info
    const network = await provider.getNetwork();
    console.log('✅ Network connected!');
    console.log('Chain ID:', network.chainId.toString());
    console.log('Network Name:', network.name);

    // Test 2: Get latest block
    const blockNumber = await provider.getBlockNumber();
    console.log('Latest block number:', blockNumber);

    // Test 3: Get chain ID (alternative method)
    const chainId = await provider.send('eth_chainId', []);
    console.log('Chain ID (hex):', chainId);
    console.log('Chain ID (decimal):', parseInt(chainId, 16));

    console.log('\n🎉 All tests passed! Push Chain RPC is working correctly.');

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Error details:', error);
  }
}

testConnection();
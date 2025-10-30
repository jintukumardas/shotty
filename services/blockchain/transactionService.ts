// Flow EVM Transaction Service
import { ethers } from 'ethers';
import { getFlowEvmClient } from './client';

export interface TransactionParams {
  to: string;
  value?: string | bigint; // Amount in ETH/FLOW or wei
  data?: string; // Contract call data
  gasLimit?: bigint;
}

export interface TransactionResult {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber?: number;
  status?: number;
}

/**
 * Execute a transaction on Flow EVM
 */
export async function executeTransaction(params: TransactionParams): Promise<TransactionResult> {
  const client = getFlowEvmClient();

  if (!client.hasWallet()) {
    throw new Error('Wallet not connected. Please connect your wallet first.');
  }

  try {
    // Validate recipient address
    if (!ethers.isAddress(params.to)) {
      throw new Error(`Invalid recipient address: ${params.to}`);
    }

    // Convert value to bigint if it's a string
    let valueInWei: bigint;
    if (typeof params.value === 'string') {
      // Assume it's in FLOW (ether) and convert to wei
      valueInWei = ethers.parseEther(params.value);
    } else if (typeof params.value === 'bigint') {
      valueInWei = params.value;
    } else {
      valueInWei = BigInt(0);
    }

    console.log('📤 Executing transaction:', {
      to: params.to,
      value: ethers.formatEther(valueInWei),
      hasData: !!params.data,
    });

    // Execute transaction using the client
    const txHash = await client.executeTransaction({
      to: params.to,
      value: valueInWei,
      data: params.data,
    });

    // Get transaction receipt
    const signer = client.getSigner();
    if (!signer || !signer.provider) {
      throw new Error('No provider available');
    }

    const receipt = await signer.provider.getTransactionReceipt(txHash);

    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }

    return {
      hash: txHash,
      from: receipt.from,
      to: receipt.to || params.to,
      value: ethers.formatEther(valueInWei),
      blockNumber: receipt.blockNumber,
      status: receipt.status || 0,
    };
  } catch (error: any) {
    console.error('❌ Transaction failed:', error);

    // Provide user-friendly error messages
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient FLOW balance to complete this transaction');
    } else if (error.code === 'ACTION_REJECTED') {
      throw new Error('Transaction rejected by user');
    } else if (error.message?.includes('nonce')) {
      throw new Error('Transaction nonce error. Please try again.');
    }

    throw error;
  }
}

/**
 * Send FLOW tokens to an address
 */
export async function sendFlowTokens(
  recipient: string,
  amount: string
): Promise<TransactionResult> {
  return executeTransaction({
    to: recipient,
    value: amount,
  });
}

/**
 * Call a smart contract function (read-only)
 */
export async function callContract(
  contractAddress: string,
  abi: any[],
  functionName: string,
  args: any[] = []
): Promise<any> {
  const client = getFlowEvmClient();
  const contract = await client.getContract(contractAddress, abi);

  try {
    const result = await contract[functionName](...args);
    return result;
  } catch (error) {
    console.error(`Failed to call ${functionName}:`, error);
    throw error;
  }
}

/**
 * Execute a smart contract function (write)
 */
export async function executeContractFunction(
  contractAddress: string,
  abi: any[],
  functionName: string,
  args: any[] = [],
  value?: string
): Promise<TransactionResult> {
  const client = getFlowEvmClient();

  if (!client.hasWallet()) {
    throw new Error('Wallet not connected');
  }

  const contract = await client.getContract(contractAddress, abi);

  try {
    const tx = await contract[functionName](...args, {
      value: value ? ethers.parseEther(value) : undefined,
    });

    console.log('📤 Contract function transaction sent:', tx.hash);
    const receipt = await tx.wait();

    return {
      hash: receipt.hash,
      from: receipt.from,
      to: receipt.to,
      value: value || '0',
      blockNumber: receipt.blockNumber,
      status: receipt.status,
    };
  } catch (error) {
    console.error(`Failed to execute ${functionName}:`, error);
    throw error;
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(txHash: string): Promise<{
  status: 'pending' | 'success' | 'failed';
  confirmations: number;
}> {
  const client = getFlowEvmClient();
  const provider = client.getProvider();

  try {
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return {
        status: 'pending',
        confirmations: 0,
      };
    }

    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;

    return {
      status: receipt.status === 1 ? 'success' : 'failed',
      confirmations,
    };
  } catch (error) {
    console.error('Failed to get transaction status:', error);
    throw error;
  }
}

/**
 * Estimate gas for a transaction
 */
export async function estimateGas(params: TransactionParams): Promise<bigint> {
  const client = getFlowEvmClient();
  const provider = client.getProvider();

  try {
    const gasEstimate = await provider.estimateGas({
      to: params.to,
      value: params.value ? ethers.parseEther(params.value.toString()) : undefined,
      data: params.data,
    });

    return gasEstimate;
  } catch (error) {
    console.error('Failed to estimate gas:', error);
    throw error;
  }
}

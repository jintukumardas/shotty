/**
 * Parse blockchain/transaction errors into user-friendly messages
 */

interface ParsedError {
  title: string;
  message: string;
  suggestions: string[];
}

export function parseBlockchainError(error: any): ParsedError {
  const errorString = JSON.stringify(error).toLowerCase();
  const errorMessage = error?.message?.toLowerCase() || '';

  // Insufficient funds
  if (
    errorString.includes('insufficient funds') ||
    errorString.includes('insufficient balance') ||
    errorMessage.includes('insufficient funds')
  ) {
    return {
      title: '💸 Insufficient Funds',
      message: 'You don\'t have enough balance to complete this transaction.',
      suggestions: [
        'Check your wallet balance',
        'Try a smaller amount',
        'Make sure you have enough for gas fees',
      ],
    };
  }

  // Gas estimation failed
  if (
    errorString.includes('gas required exceeds allowance') ||
    errorString.includes('out of gas') ||
    errorString.includes('gas estimation failed')
  ) {
    return {
      title: '⛽ Gas Estimation Failed',
      message: 'Unable to estimate gas for this transaction.',
      suggestions: [
        'The transaction may fail - check if you have enough balance',
        'Try a smaller amount',
        'The receiving contract may have restrictions',
      ],
    };
  }

  // Transaction would revert
  if (
    errorString.includes('execution reverted') ||
    errorString.includes('transaction would fail') ||
    errorMessage.includes('revert')
  ) {
    return {
      title: '⚠️ Transaction Would Fail',
      message: 'This transaction cannot be completed with the current parameters.',
      suggestions: [
        'The smart contract rejected the transaction',
        'Check if you have necessary approvals',
        'Verify the amount and recipient address',
        'The token may have transfer restrictions',
      ],
    };
  }

  // User rejected transaction
  if (
    errorString.includes('user rejected') ||
    errorString.includes('user denied') ||
    errorString.includes('cancelled')
  ) {
    return {
      title: '🚫 Transaction Cancelled',
      message: 'You cancelled the transaction in your wallet.',
      suggestions: ['No action needed - transaction was not sent'],
    };
  }

  // Network/RPC errors
  if (
    errorString.includes('network error') ||
    errorString.includes('could not coalesce') ||
    errorString.includes('internal json-rpc error') ||
    errorString.includes('connection timeout') ||
    errorString.includes('fetch failed')
  ) {
    return {
      title: '🌐 Network Error',
      message: 'Unable to connect to the blockchain network.',
      suggestions: [
        'Check your internet connection',
        'Try refreshing the page',
        'The network may be experiencing high traffic',
        'Switch to a different RPC endpoint if possible',
      ],
    };
  }

  // Nonce errors
  if (
    errorString.includes('nonce too low') ||
    errorString.includes('nonce too high') ||
    errorString.includes('incorrect nonce')
  ) {
    return {
      title: '🔢 Transaction Nonce Error',
      message: 'Transaction ordering issue detected.',
      suggestions: [
        'Try resetting your wallet\'s transaction history',
        'Wait a few moments and try again',
        'Cancel any pending transactions in your wallet',
      ],
    };
  }

  // Token approval needed
  if (
    errorString.includes('erc20: insufficient allowance') ||
    errorString.includes('transfer amount exceeds allowance')
  ) {
    return {
      title: '🔐 Approval Required',
      message: 'You need to approve the token before transferring.',
      suggestions: [
        'Approve the token spending first',
        'Then try the transaction again',
      ],
    };
  }

  // Contract not found / invalid address
  if (
    errorString.includes('contract not found') ||
    errorString.includes('invalid address') ||
    errorString.includes('ens name not configured')
  ) {
    return {
      title: '📍 Invalid Address',
      message: 'The contract or recipient address is invalid.',
      suggestions: [
        'Double-check the recipient address',
        'Make sure you\'re on the correct network',
        'Verify the contract is deployed',
      ],
    };
  }

  // Slippage errors
  if (
    errorString.includes('slippage') ||
    errorString.includes('price impact too high')
  ) {
    return {
      title: '📊 Price Impact Too High',
      message: 'The price changed too much during the transaction.',
      suggestions: [
        'Try a smaller amount',
        'Increase slippage tolerance',
        'Wait for more liquidity',
      ],
    };
  }

  // Default fallback for unknown errors
  return {
    title: '❌ Transaction Failed',
    message: 'An unexpected error occurred.',
    suggestions: [
      'Try the transaction again',
      'Check your wallet connection',
      'Contact support if the issue persists',
    ],
  };
}

/**
 * Format the parsed error into a user-friendly string
 */
export function formatErrorMessage(error: any): string {
  const parsed = parseBlockchainError(error);

  let message = `**${parsed.title}**\n\n${parsed.message}`;

  if (parsed.suggestions.length > 0) {
    message += '\n\n**💡 Suggestions:**';
    parsed.suggestions.forEach(suggestion => {
      message += `\n• ${suggestion}`;
    });
  }

  return message;
}

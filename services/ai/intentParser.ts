// AI Intent Parser for Transaction Commands

export interface TransactionIntent {
  action:
    | 'send'
    | 'create_redeem_link'
    | 'redeem'
    | 'check_balance'
    | 'mint_nft'
    | 'transfer_nft'
    | 'query_nfts'
    | 'register_domain'
    | 'resolve_domain'
    | 'transfer_domain'
    | 'update_domain'
    | 'renew_domain'
    | 'check_domain_availability'
    | 'query_domains'
    | 'query_transactions'
    | 'add_contact'
    | 'view_contacts'
    | 'find_contact'
    | 'update_contact'
    | 'remove_contact'
    | 'generate_qr'
    | 'create_erc20'
    | 'transfer_erc20'
    | 'transfer_erc20_ownership'
    | 'query_erc20_tokens'
    | 'get_token_info'
    | 'batch_transactions'
    | 'view_batch_stats'
    | 'execute_batch_send'
    | 'schedule_transaction'
    | 'view_scheduled_transactions'
    | 'cancel_scheduled_transaction'
    | 'execute_scheduled_transaction'
    | 'create_workflow'
    | 'execute_workflow'
    | 'view_workflows'
    | 'lend_tokens'
    | 'borrow_tokens'
    | 'repay_loan'
    | 'withdraw_deposit'
    | 'view_lending_position'
    | 'other';
  amount: number | null;
  token: string | null;
  recipient: string | null;
  redeemLink: string | null;
  chain: string | null;
  requiresConfirmation: boolean;
  // NFT specific fields
  nftData?: {
    tokenId?: number;
    uri?: string;
    name?: string;
    description?: string;
    image?: string;
  };
  // Domain specific fields
  domainData?: {
    domainName?: string;
    resolvedAddress?: string;
    chainId?: number;
  };
  // Transaction query fields
  transactionData?: {
    limit?: number;
  };
  // Contact specific fields
  contactData?: {
    name?: string;
    address?: string;
    notes?: string;
  };
  // QR Code specific fields
  qrData?: {
    address?: string;
    label?: string;
  };
  // ERC20 specific fields
  erc20Data?: {
    tokenName?: string;
    tokenSymbol?: string;
    totalSupply?: number;
    decimals?: number;
    contractAddress?: string;
    newOwner?: string;
    amount?: number | null;
  };
  // Batch transaction specific fields
  batchData?: {
    type?: string;
    operations?: Array<{
      target: string;
      value: string;
      data: string;
      description?: string;
    }>;
    recipients?: string[];
    amountPerRecipient?: number;
    token?: string;
    [key: string]: any;
  };
  // Scheduled transaction specific fields
  scheduledData?: {
    scheduleId?: number;
    executeAfter?: number;
    executeWindow?: number;
    description?: string;
  };
  // Workflow specific fields
  workflowData?: {
    workflowId?: number;
    name?: string;
    actions?: Array<{
      actionType: number;
      target: string;
      data: string;
      value: string;
      description: string;
    }>;
  };
  // Lending specific fields
  lendingData?: {
    depositAmount?: number;
    borrowAmount?: number;
    collateralAmount?: number;
    tokenAddress?: string;
  };
}

export interface ParsedIntent {
  response: string;
  intent: TransactionIntent;
}

/**
 * Parse transaction intent from user message
 * This is a fallback parser in case OpenAI is not available
 */
export function parseTransactionIntent(message: string, userAddress: string): ParsedIntent {
  const lowerMessage = message.toLowerCase();

  // Send tokens pattern
  const sendPattern = /send\s+(\d+\.?\d*)\s+(\w+)\s+to\s+(0x[a-fA-F0-9]{40})/i;
  const sendMatch = message.match(sendPattern);

  if (sendMatch) {
    return {
      response: `I'll send ${sendMatch[1]} ${sendMatch[2]} to ${sendMatch[3]}. Please confirm this transaction.`,
      intent: {
        action: 'send',
        amount: parseFloat(sendMatch[1]),
        token: sendMatch[2].toUpperCase(),
        recipient: sendMatch[3],
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
      },
    };
  }

  // Create redeem link pattern
  const redeemLinkPattern = /create\s+.*?redeem\s+link\s+.*?(\d+\.?\d*)\s+(\w+)/i;
  const redeemLinkMatch = message.match(redeemLinkPattern);

  if (redeemLinkMatch || lowerMessage.includes('create') && lowerMessage.includes('redeem')) {
    const amount = redeemLinkMatch ? parseFloat(redeemLinkMatch[1]) : null;
    const token = redeemLinkMatch ? redeemLinkMatch[2].toUpperCase() : null;

    if (amount && token) {
      return {
        response: `I'll create a redeem link for ${amount} ${token}. This will lock the tokens in an escrow contract that can be redeemed by anyone with the link.`,
        intent: {
          action: 'create_redeem_link',
          amount,
          token,
          recipient: null,
          redeemLink: null,
          chain: null,
          requiresConfirmation: true,
        },
      };
    }
  }

  // Redeem tokens pattern
  if (lowerMessage.includes('redeem')) {
    const urlPattern = /(https?:\/\/[^\s]+)/;
    const urlMatch = message.match(urlPattern);

    if (urlMatch) {
      return {
        response: `I'll redeem the tokens from this link for you.`,
        intent: {
          action: 'redeem',
          amount: null,
          token: null,
          recipient: null,
          redeemLink: urlMatch[1],
          chain: null,
          requiresConfirmation: true,
        },
      };
    }
  }

  // Check balance
  if (lowerMessage.includes('balance') || lowerMessage.includes('how much')) {
    return {
      response: `I'll check your balance for you.`,
      intent: {
        action: 'check_balance',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
      },
    };
  }

  // Mint NFT pattern
  const mintNFTPattern = /(?:mint|create)\s+(?:an?\s+)?nft/i;
  if (mintNFTPattern.test(message)) {
    return {
      response: `I'll help you mint an NFT. Please provide the details like name, description, and image URL.`,
      intent: {
        action: 'mint_nft',
        amount: null,
        token: null,
        recipient: userAddress,
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
        nftData: {},
      },
    };
  }

  // Transfer NFT pattern - matches variations like:
  // "transfer NFT #6 to 0x..."
  // "transfer my NFT #6 to 0x..."
  // "I would like to transfer my NFT #6 to 0x..."
  const transferNFTPattern = /(?:transfer|send).*?(?:my\s+)?nft.*?(?:#)?(\d+).*?to\s+(0x[a-fA-F0-9]{40})/i;
  const transferNFTMatch = message.match(transferNFTPattern);
  if (transferNFTMatch) {
    return {
      response: `I'll transfer NFT #${transferNFTMatch[1]} to ${transferNFTMatch[2]}.`,
      intent: {
        action: 'transfer_nft',
        amount: null,
        token: null,
        recipient: transferNFTMatch[2],
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
        nftData: {
          tokenId: parseInt(transferNFTMatch[1]),
        },
      },
    };
  }

  // Query NFTs pattern
  const queryNFTPattern = /(?:show|list|get|view)\s+(?:my\s+)?nfts?/i;
  if (queryNFTPattern.test(message)) {
    return {
      response: `I'll fetch your NFTs.`,
      intent: {
        action: 'query_nfts',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
      },
    };
  }

  // Register domain pattern
  const registerDomainPattern = /(?:register|create|reserve)\s+domain\s+(?:name\s+)?([a-zA-Z0-9-_.]+)/i;
  const registerDomainMatch = message.match(registerDomainPattern);
  if (registerDomainMatch) {
    return {
      response: `I'll help you register the domain "${registerDomainMatch[1]}" on Flow EVM.`,
      intent: {
        action: 'register_domain',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
        domainData: {
          domainName: registerDomainMatch[1],
          resolvedAddress: userAddress,
          chainId: 545, // Default to Flow EVM
        },
      },
    };
  }

  // Resolve domain pattern
  const resolveDomainPattern = /(?:resolve|lookup|find)\s+domain\s+([a-zA-Z0-9-_.]+)/i;
  const resolveDomainMatch = message.match(resolveDomainPattern);
  if (resolveDomainMatch) {
    return {
      response: `I'll resolve the domain "${resolveDomainMatch[1]}" for you.`,
      intent: {
        action: 'resolve_domain',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        domainData: {
          domainName: resolveDomainMatch[1],
        },
      },
    };
  }

  // Transfer domain pattern
  const transferDomainPattern = /transfer\s+domain\s+([a-zA-Z0-9-_.]+)\s+to\s+(0x[a-fA-F0-9]{40})/i;
  const transferDomainMatch = message.match(transferDomainPattern);
  if (transferDomainMatch) {
    return {
      response: `I'll transfer the domain "${transferDomainMatch[1]}" to ${transferDomainMatch[2]}.`,
      intent: {
        action: 'transfer_domain',
        amount: null,
        token: null,
        recipient: transferDomainMatch[2],
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
        domainData: {
          domainName: transferDomainMatch[1],
        },
      },
    };
  }

  // Update domain resolution pattern
  const updateDomainPattern = /(?:update|change|modify)\s+(?:domain\s+)?([a-zA-Z0-9-_.]+)\s+(?:to\s+)?(?:point\s+to|resolve\s+to|to)\s+(0x[a-fA-F0-9]{40})/i;
  const updateDomainMatch = message.match(updateDomainPattern);
  if (updateDomainMatch) {
    return {
      response: `I'll update the domain "${updateDomainMatch[1]}" to point to ${updateDomainMatch[2]}.`,
      intent: {
        action: 'update_domain',
        amount: null,
        token: null,
        recipient: updateDomainMatch[2],
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
        domainData: {
          domainName: updateDomainMatch[1],
          resolvedAddress: updateDomainMatch[2],
        },
      },
    };
  }

  // Check domain availability pattern
  const checkDomainPattern = /(?:is|check)\s+([a-zA-Z0-9-_.]+)\s+(?:available|taken|registered)/i;
  const checkDomainMatch = message.match(checkDomainPattern);
  if (checkDomainMatch) {
    return {
      response: `I'll check if "${checkDomainMatch[1]}" is available.`,
      intent: {
        action: 'check_domain_availability',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        domainData: {
          domainName: checkDomainMatch[1],
        },
      },
    };
  }

  // Show my domains pattern
  const myDomainsPattern = /(?:show|list|get|view|display)\s+(?:my\s+)?domains?/i;
  if (myDomainsPattern.test(message)) {
    return {
      response: `I'll show you all domains you own.`,
      intent: {
        action: 'query_domains',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
      },
    };
  }

  // Renew domain pattern
  const renewDomainPattern = /(?:renew|extend|refresh)\s+domain\s+([a-zA-Z0-9-_.]+)/i;
  const renewDomainMatch = message.match(renewDomainPattern);
  if (renewDomainMatch) {
    return {
      response: `I'll renew the domain "${renewDomainMatch[1]}" for another year.`,
      intent: {
        action: 'renew_domain',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
        domainData: {
          domainName: renewDomainMatch[1],
        },
      },
    };
  }

  // Query transactions pattern
  const queryTransactionsPattern = /(?:show|list|get|view|display)\s+(?:my\s+)?(?:recent\s+)?(?:transaction|tx)s?/i;
  if (queryTransactionsPattern.test(message)) {
    // Try to extract limit from message
    const limitMatch = message.match(/(?:last|recent)\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 10;

    return {
      response: `I'll fetch your recent transactions.`,
      intent: {
        action: 'query_transactions',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        transactionData: {
          limit: Math.min(limit, 20), // Cap at 20 for performance
        },
      },
    };
  }

  // Add contact pattern
  const addContactPattern = /(?:add|save|create)\s+contact\s+(.+?)\s+(?:at\s+)?(0x[a-fA-F0-9]{40})/i;
  const addContactMatch = message.match(addContactPattern);
  if (addContactMatch) {
    const contactName = addContactMatch[1].trim();
    return {
      response: `I'll save ${contactName} (${addContactMatch[2]}) to your contacts.`,
      intent: {
        action: 'add_contact',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
        contactData: {
          name: contactName,
          address: addContactMatch[2],
          notes: '',
        },
      },
    };
  }

  // View contacts pattern
  const viewContactsPattern = /(?:show|list|get|view|display)\s+(?:my\s+)?contacts?/i;
  if (viewContactsPattern.test(message)) {
    return {
      response: `I'll fetch your saved contacts.`,
      intent: {
        action: 'view_contacts',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        contactData: {},
      },
    };
  }

  // Find contact pattern - supports multiple formats
  // "find contact alice" or "search alice in my contacts" or "lookup alice"
  let findContactMatch = message.match(/(?:find|search|lookup|get)\s+contact\s+(.+?)(?:\s+in|\s+from|\s*$)/i);
  if (!findContactMatch) {
    // Try pattern: "search alice in my contacts" or "find alice from my contacts"
    findContactMatch = message.match(/(?:find|search|lookup|get)\s+([a-zA-Z0-9_-]+)\s+(?:in|from)\s+(?:my\s+)?contacts?/i);
  }
  if (!findContactMatch) {
    // Try simple pattern: "find alice"
    findContactMatch = message.match(/(?:find|search|lookup)\s+(?:for\s+)?([a-zA-Z0-9_-]+)(?:\s*$)/i);
  }

  if (findContactMatch) {
    const contactName = findContactMatch[1].trim();
    return {
      response: `I'll search for contact "${contactName}".`,
      intent: {
        action: 'find_contact',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        contactData: {
          name: contactName,
        },
      },
    };
  }

  // Update contact pattern
  const updateContactPattern = /(?:update|change|edit)\s+contact\s+(.+?)\s+(?:to\s+)?(0x[a-fA-F0-9]{40})/i;
  const updateContactMatch = message.match(updateContactPattern);
  if (updateContactMatch) {
    const contactName = updateContactMatch[1].trim();
    return {
      response: `I'll update contact ${contactName} with address ${updateContactMatch[2]}.`,
      intent: {
        action: 'update_contact',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
        contactData: {
          name: contactName,
          address: updateContactMatch[2],
        },
      },
    };
  }

  // Remove contact pattern
  const removeContactPattern = /(?:remove|delete)\s+contact\s+(.+?)(?:\s*$)/i;
  const removeContactMatch = message.match(removeContactPattern);
  if (removeContactMatch) {
    const contactName = removeContactMatch[1].trim();
    return {
      response: `I'll remove contact "${contactName}" from your address book.`,
      intent: {
        action: 'remove_contact',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
        contactData: {
          name: contactName,
        },
      },
    };
  }

  // Generate QR Code pattern
  const generateQRPattern = /(?:generate|create|show|make)\s+(?:a\s+)?qr\s*(?:code)?/i;
  if (generateQRPattern.test(message)) {
    // Check if a specific address is mentioned
    const addressMatch = message.match(/(0x[a-fA-F0-9]{40})/);
    const targetAddress = addressMatch ? addressMatch[1] : userAddress;

    return {
      response: targetAddress === userAddress
        ? `I'll generate a QR code for your wallet address.`
        : `I'll generate a QR code for address ${targetAddress}.`,
      intent: {
        action: 'generate_qr',
        amount: null,
        token: null,
        recipient: targetAddress,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        qrData: {
          address: targetAddress,
          label: targetAddress === userAddress ? 'My Wallet' : undefined,
        },
      },
    };
  }

  // Create ERC20 Token pattern
  const createERC20Pattern = /(?:create|deploy|make|launch)\s+(?:an?\s+)?(?:erc20\s+)?token/i;
  if (createERC20Pattern.test(message)) {
    // Try to extract token details from the message
    const nameMatch = message.match(/(?:named?|called?)\s+([A-Za-z0-9\s]+?)(?:\s+with|\s+symbol|\s*$)/i);
    const symbolMatch = message.match(/symbol\s+([A-Z0-9]+)/i);
    const supplyMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:million|mil|m)?\s*(?:supply|tokens?)?/i);

    const tokenName = nameMatch ? nameMatch[1].trim() : undefined;
    const tokenSymbol = symbolMatch ? symbolMatch[1].toUpperCase() : undefined;
    const totalSupply = supplyMatch ? parseFloat(supplyMatch[1]) : undefined;

    return {
      response: tokenName
        ? `I'll help you create an ERC20 token called "${tokenName}" with symbol ${tokenSymbol || 'TBD'} and supply of ${totalSupply || 'TBD'}.`
        : `I'll help you create an ERC20 token. Please provide the token name, symbol, and total supply.`,
      intent: {
        action: 'create_erc20',
        amount: totalSupply || null,
        token: tokenSymbol || null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
        erc20Data: {
          tokenName,
          tokenSymbol,
          totalSupply,
          decimals: 18, // Default to 18 decimals
        },
      },
    };
  }

  // Transfer ERC20 Tokens pattern (must come before ownership transfer)
  // Pattern 1: With amount at the beginning - "Transfer 100 token 0x... to 0x..." or "Transfer 100 ERC20 token 0x... to 0x..."
  const transferERC20WithAmountPattern = /(?:transfer|send)\s+(\d+(?:\.\d+)?)\s+(?:erc20\s+)?token\s+(0x[a-fA-F0-9]{40})\s+(?:to\s+)(0x[a-fA-F0-9]{40})/i;
  const transferERC20WithAmountMatch = message.match(transferERC20WithAmountPattern);

  if (transferERC20WithAmountMatch) {
    const amount = parseFloat(transferERC20WithAmountMatch[1]);
    const contractAddress = transferERC20WithAmountMatch[2];
    const recipient = transferERC20WithAmountMatch[3];

    return {
      response: `I'll transfer ${amount} tokens from ${contractAddress} to ${recipient}.`,
      intent: {
        action: 'transfer_erc20',
        amount: amount,
        token: null,
        recipient: recipient,
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
        erc20Data: {
          contractAddress: contractAddress,
          amount: amount,
        },
      },
    };
  }

  // Pattern 2: Without amount specified - "Transfer token 0x... to 0x..." or "Transfer ERC20 token 0x... to 0x..."
  const transferERC20Pattern = /(?:transfer|send)\s+(?:erc20\s+)?token\s+(0x[a-fA-F0-9]{40})\s+(?:to\s+)(0x[a-fA-F0-9]{40})/i;
  const transferERC20Match = message.match(transferERC20Pattern);

  if (transferERC20Match) {
    const contractAddress = transferERC20Match[1];
    const recipient = transferERC20Match[2];

    return {
      response: `I'll transfer tokens from ${contractAddress} to ${recipient}.`,
      intent: {
        action: 'transfer_erc20',
        amount: null,
        token: null,
        recipient: recipient,
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
        erc20Data: {
          contractAddress: contractAddress,
          amount: null,
        },
      },
    };
  }

  // Transfer ERC20 Ownership pattern
  const transferERC20OwnershipPattern = /(?:transfer|change)\s+(?:token\s+)?ownership\s+(?:of\s+)?(0x[a-fA-F0-9]{40})\s+(?:to\s+)?(0x[a-fA-F0-9]{40})/i;
  const transferERC20OwnershipMatch = message.match(transferERC20OwnershipPattern);
  if (transferERC20OwnershipMatch) {
    return {
      response: `I'll transfer ownership of token contract ${transferERC20OwnershipMatch[1]} to ${transferERC20OwnershipMatch[2]}.`,
      intent: {
        action: 'transfer_erc20_ownership',
        amount: null,
        token: null,
        recipient: transferERC20OwnershipMatch[2],
        redeemLink: null,
        chain: null,
        requiresConfirmation: true,
        erc20Data: {
          contractAddress: transferERC20OwnershipMatch[1],
          newOwner: transferERC20OwnershipMatch[2],
        },
      },
    };
  }

  // Get token info pattern - for specific token address (must come before query pattern)
  const getTokenInfoPattern = /(?:show|get|view|display)\s+(?:token\s+)?(?:details|info|information)\s+(?:of|for|at)?\s*(0x[a-fA-F0-9]{40})/i;
  const getTokenInfoMatch = message.match(getTokenInfoPattern);
  if (getTokenInfoMatch) {
    const tokenAddress = getTokenInfoMatch[1];
    return {
      response: `I'll show you the details of the token at address ${tokenAddress}.`,
      intent: {
        action: 'get_token_info',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        erc20Data: {
          contractAddress: tokenAddress,
        },
      },
    };
  }

  // Query ERC20 Tokens pattern
  const queryERC20Pattern = /(?:show|list|get|view|display)\s+(?:my\s+)?(?:erc20\s+)?tokens?/i;
  if (queryERC20Pattern.test(message)) {
    return {
      response: `I'll fetch your ERC20 tokens.`,
      intent: {
        action: 'query_erc20_tokens',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        erc20Data: {},
      },
    };
  }

  // Batch Transactions pattern
  const batchTransactionsPattern = /(?:batch|execute\s+batch|batch\s+transactions?)/i;
  if (batchTransactionsPattern.test(message)) {
    // Check if viewing batch stats
    if (/(?:show|view|get|display)\s+(?:my\s+)?batch\s+stats?/i.test(message)) {
      return {
        response: `I'll show you your batch transaction statistics.`,
        intent: {
          action: 'view_batch_stats',
          amount: null,
          token: null,
          recipient: null,
          redeemLink: null,
          chain: null,
          requiresConfirmation: false,
          batchData: {},
        },
      };
    }

    // Check for batch send with addresses
    const batchSendPattern = /batch\s+send\s+([\d.]+)\s+(\w+)\s+to\s+\[([^\]]+)\]/i;
    const batchSendMatch = message.match(batchSendPattern);

    if (batchSendMatch) {
      const amount = parseFloat(batchSendMatch[1]);
      const token = batchSendMatch[2];
      const addressesString = batchSendMatch[3];

      // Extract addresses from the array string
      const addresses = addressesString
        .split(',')
        .map(addr => addr.trim())
        .filter(addr => addr.startsWith('0x'));

      if (addresses.length > 0) {
        return {
          response: `I'll execute a batch transaction to send ${amount} ${token} to ${addresses.length} addresses.`,
          intent: {
            action: 'execute_batch_send',
            amount,
            token,
            recipient: null,
            redeemLink: null,
            chain: null,
            requiresConfirmation: true,
            batchData: {
              type: 'multi_send',
              recipients: addresses,
              amountPerRecipient: amount,
              token
            },
          },
        };
      }
    }

    return {
      response: `I'll help you with batch transactions.`,
      intent: {
        action: 'batch_transactions',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        batchData: {},
      },
    };
  }

  // Schedule Transaction pattern
  const scheduleTransactionPattern = /(?:schedule|scheduled?\s+transaction)/i;
  if (scheduleTransactionPattern.test(message)) {
    // Check if viewing scheduled transactions
    if (/(?:show|view|list|get|display)\s+(?:my\s+)?(?:scheduled?\s+)?(?:transaction|tx)s?/i.test(message)) {
      return {
        response: `I'll show you your scheduled transactions.`,
        intent: {
          action: 'view_scheduled_transactions',
          amount: null,
          token: null,
          recipient: null,
          redeemLink: null,
          chain: null,
          requiresConfirmation: false,
          scheduledData: {},
        },
      };
    }

    return {
      response: `I'll help you schedule a transaction.`,
      intent: {
        action: 'schedule_transaction',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        scheduledData: {},
      },
    };
  }

  // Workflow pattern
  const workflowPattern = /(?:workflow|flow\s+action)/i;
  if (workflowPattern.test(message)) {
    // Check if viewing workflows
    if (/(?:show|view|list|get|display)\s+(?:my\s+)?workflows?/i.test(message)) {
      return {
        response: `I'll show you your workflows.`,
        intent: {
          action: 'view_workflows',
          amount: null,
          token: null,
          recipient: null,
          redeemLink: null,
          chain: null,
          requiresConfirmation: false,
          workflowData: {},
        },
      };
    }

    // Check if executing workflow
    if (/(?:execute|run)/i.test(message)) {
      return {
        response: `I'll help you execute a workflow.`,
        intent: {
          action: 'execute_workflow',
          amount: null,
          token: null,
          recipient: null,
          redeemLink: null,
          chain: null,
          requiresConfirmation: false,
          workflowData: {},
        },
      };
    }

    return {
      response: `I'll help you create a workflow.`,
      intent: {
        action: 'create_workflow',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        workflowData: {},
      },
    };
  }

  // Lending pattern - Lend
  const lendPattern = /(?:lend|deposit|supply)\s+(?:token|asset)/i;
  if (lendPattern.test(message)) {
    return {
      response: `I'll help you lend tokens to earn interest.`,
      intent: {
        action: 'lend_tokens',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        lendingData: {},
      },
    };
  }

  // Lending pattern - Borrow
  const borrowPattern = /(?:borrow)\s+(?:token|asset)/i;
  if (borrowPattern.test(message)) {
    return {
      response: `I'll help you borrow tokens.`,
      intent: {
        action: 'borrow_tokens',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        lendingData: {},
      },
    };
  }

  // Lending pattern - View position
  const lendingPositionPattern = /(?:lending|loan)\s+(?:position|status)/i;
  if (lendingPositionPattern.test(message)) {
    return {
      response: `I'll show you your lending position.`,
      intent: {
        action: 'view_lending_position',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        lendingData: {},
      },
    };
  }

  // View lending position - alternative patterns
  const viewLendingPattern = /(?:show|view|get|display)\s+(?:my\s+)?lending\s+(?:position|status|data)/i;
  if (viewLendingPattern.test(message)) {
    return {
      response: `I'll show you your lending position.`,
      intent: {
        action: 'view_lending_position',
        amount: null,
        token: null,
        recipient: null,
        redeemLink: null,
        chain: null,
        requiresConfirmation: false,
        lendingData: {},
      },
    };
  }

  // Default response
  return {
    response: `I understand you want to perform a blockchain operation. Could you please be more specific? For example:

**Tokens:**
• "Send 1 FLOW to 0x123..."
• "Create a redeem link for 10 FLOW"
• "Redeem tokens from <link>"
• "Check my balance"

**NFTs:**
• "Mint an NFT"
• "Show my NFTs"
• "Transfer NFT #123 to 0x..."

**Domains:**
• "Register domain myname.flow"
• "Resolve domain myname.flow"
• "Transfer domain myname.flow to 0x..."
• "Update myname.flow to point to 0x..."
• "Renew domain myname.flow"
• "Is bitcoin.flow available?"
• "Show my domains"

**Contacts:**
• "Add contact Alice at 0x123..."
• "Show my contacts"
• "Find contact Bob"
• "Update contact Alice to 0x456..."
• "Remove contact Bob"

**QR Codes:**
• "Generate QR code"
• "Create QR for 0x123..."

**ERC20 Tokens:**
• "Create a token called MyToken with symbol MTK and 1000000 supply"
• "Transfer ownership of 0x123... to 0x456..."
• "Show my tokens"

**Transactions:**
• "Show my recent transactions"
• "View my last 5 transactions"`,
    intent: {
      action: 'other',
      amount: null,
      token: null,
      recipient: null,
      redeemLink: null,
      chain: null,
      requiresConfirmation: false,
    },
  };
}

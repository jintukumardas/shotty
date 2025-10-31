/**
 * Chat Action Handlers
 * Handles execution of NFT and Domain actions from chat interface
 */

import { ethers } from 'ethers';
import { getNFTService, uploadMetadata, createNFTMetadata } from '../nft/nftService';
import { getDomainService, isValidDomainName, validateDomainName, getChainName } from '../domains/domainService';
import { getTransactionService } from '../transactions/transactionService';
import { getAddressBookService } from '../addressBook/addressBookService';

export interface ActionResult {
  success: boolean;
  message: string;
  txHash?: string;
  data?: any;
  error?: string;
}

// Reusable message templates
const FEATURE_NOT_SUPPORTED_MESSAGE =
  "This feature is not currently supported. It will be available in a future update. Thank you for your patience!";

/**
 * Handle NFT minting action
 */
export async function handleMintNFT(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  try {
    const nftService = getNFTService();
    const { nftData } = intent;

    // Check if URI is already provided (from modal)
    let uri: string;

    if (nftData?.uri) {
      // URI already uploaded, use it directly
      uri = nftData.uri;
    } else {
      // Check if we have the required data to create metadata
      if (!nftData?.name || !nftData?.description) {
        // Return helpful message prompting for details
        const missingFields = [];
        if (!nftData?.name) missingFields.push('name');
        if (!nftData?.description) missingFields.push('description');

        return {
          success: false,
          message: `To mint an NFT, I need the following details:\n\n${!nftData?.name ? '• Name: A title for your NFT\n' : ''}${!nftData?.description ? '• Description: What your NFT represents\n' : ''}${!nftData?.image ? '• Image URL (optional): A link to the NFT image\n' : ''}\nExample: "Mint an NFT called 'My First NFT' with description 'A special digital collectible'"`,
          error: 'Missing required NFT data',
        };
      }

      // Create metadata
      const metadata = createNFTMetadata(
        nftData.name,
        nftData.description,
        nftData.image || 'https://via.placeholder.com/400',
        nftData.attributes
      );

      // Upload metadata
      uri = await uploadMetadata(metadata);
    }

    // Mint NFT
    const result = await nftService.mintNFT({
      to: userAddress,
      uri,
    });

    return {
      success: true,
      message: `NFT #${result.tokenId} "${nftData.name}" minted successfully!`,
      txHash: result.txHash,
      data: {
        tokenId: result.tokenId,
        name: nftData.name,
        uri,
      },
    };
  } catch (error) {
    console.error('Error minting NFT:', error);
    return {
      success: false,
      message: 'Failed to mint NFT',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle NFT transfer action
 */
export async function handleTransferNFT(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  try {
    const nftService = getNFTService();
    const { nftData, recipient } = intent;

    if (!nftData?.tokenId || !recipient) {
      return {
        success: false,
        message: 'Please provide NFT token ID and recipient address',
        error: 'Missing required data',
      };
    }

    // Resolve recipient if it's a domain name
    let recipientAddress = recipient.trim();

    if (recipientAddress.endsWith('.flow')) {
      console.log('🔍 Resolving domain for NFT transfer:', recipientAddress);
      try {
        const domainService = getDomainService();
        const resolved = await domainService.resolveDomain(recipientAddress);

        if (!resolved.resolvedAddress || resolved.resolvedAddress === ethers.ZeroAddress) {
          return {
            success: false,
            message: `Domain "${recipientAddress}" is not registered or has no resolved address`,
            error: 'Domain resolution failed',
          };
        }

        console.log('✅ Domain resolved to:', resolved.resolvedAddress);
        recipientAddress = resolved.resolvedAddress;
      } catch (error) {
        console.error('❌ Domain resolution failed:', error);
        return {
          success: false,
          message: `Failed to resolve domain "${recipientAddress}"`,
          error: error instanceof Error ? error.message : 'Domain resolution failed',
        };
      }
    }

    // Transfer NFT
    const result = await nftService.transferNFT({
      from: userAddress,
      to: recipientAddress,
      tokenId: nftData.tokenId,
    });

    return {
      success: true,
      message: `NFT #${nftData.tokenId} transferred to ${recipient}`,
      txHash: result.txHash,
      data: {
        tokenId: nftData.tokenId,
        recipient: recipientAddress,
      },
    };
  } catch (error) {
    console.error('Error transferring NFT:', error);
    return {
      success: false,
      message: 'Failed to transfer NFT',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle query NFTs action
 */
export async function handleQueryNFTs(
  userAddress: string
): Promise<ActionResult> {
  try {
    const nftService = getNFTService();

    // Get owned NFTs
    const ownedNFTs = await nftService.getOwnedNFTs(userAddress);

    if (ownedNFTs.length === 0) {
      return {
        success: true,
        message: "You don't own any NFTs yet. Try minting one!",
        data: { nfts: [] },
      };
    }

    // Format NFT list
    const nftList = ownedNFTs
      .map((nft) => {
        const name = nft.metadata?.name || `NFT #${nft.tokenId}`;
        return `• #${nft.tokenId}: ${name}`;
      })
      .join('\n');

    return {
      success: true,
      message: `You own ${ownedNFTs.length} NFT${
        ownedNFTs.length > 1 ? 's' : ''
      }:\n\n${nftList}`,
      data: { nfts: ownedNFTs },
    };
  } catch (error) {
    console.error('Error querying NFTs:', error);
    return {
      success: false,
      message: 'Failed to fetch your NFTs',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle domain registration action
 */
export async function handleRegisterDomain(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  try {
    const domainService = getDomainService();
    const { domainData } = intent;

    if (!domainData?.domainName) {
      return {
        success: false,
        message: 'Please provide a domain name to register. For example: "Register domain myname.flow"',
        error: 'Missing domain name',
      };
    }

    // Trim the domain name but don't lowercase yet (need to validate case first)
    const trimmedDomain = domainData.domainName.trim();

    // Validate domain name format with detailed error messages (checks for lowercase)
    const validation = validateDomainName(trimmedDomain);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error || 'Invalid domain name format',
        error: 'Invalid domain name',
      };
    }

    // After validation passes, we know it's already lowercase, so just use trimmed version
    const normalizedDomain = trimmedDomain.toLowerCase();

    // Check if domain is available
    const available = await domainService.isDomainAvailable(
      normalizedDomain
    );

    if (!available) {
      return {
        success: false,
        message: `Domain "${normalizedDomain}" is already registered`,
        error: 'Domain not available',
      };
    }

    // Get registration fee
    const fee = await domainService.getRegistrationFee();

    // Register domain
    const result = await domainService.registerDomain({
      domainName: normalizedDomain,
      chainId: domainData.chainId || 42101,
      resolvedAddress: domainData.resolvedAddress || userAddress,
    });

    const chainName = getChainName(domainData.chainId || 42101);

    return {
      success: true,
      message: `Domain "${normalizedDomain}" registered successfully! Points to ${
        domainData.resolvedAddress || userAddress
      } on ${chainName}. Registration fee: ${fee} FLOW`,
      txHash: result.txHash,
      data: {
        domainName: domainData.domainName,
        domainHash: result.domainHash,
        chainId: domainData.chainId || 42101,
      },
    };
  } catch (error) {
    console.error('Error registering domain:', error);
    return {
      success: false,
      message: 'Failed to register domain',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle domain resolution action
 */
export async function handleResolveDomain(
  intent: any
): Promise<ActionResult> {
  try {
    const domainService = getDomainService();
    const { domainData } = intent;

    if (!domainData?.domainName) {
      return {
        success: false,
        message: 'Please provide a domain name',
        error: 'Missing domain name',
      };
    }

    // Check if domain exists
    const exists = await domainService.domainExists(domainData.domainName);

    if (!exists) {
      return {
        success: false,
        message: `Domain "${domainData.domainName}" not found`,
        error: 'Domain does not exist',
      };
    }

    // Get full domain details including expiration
    const domainDetails = await domainService.getDomainDetails(domainData.domainName);
    const chainName = getChainName(domainDetails.chainId);

    // Calculate days until expiry
    const now = Math.floor(Date.now() / 1000);
    const daysUntilExpiry = Math.floor((domainDetails.expiresAt - now) / 86400);
    const expiryDate = new Date(domainDetails.expiresAt * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // Determine expiry status
    let expiryStatus = '';
    if (daysUntilExpiry < 0) {
      expiryStatus = `⚠️ Expired ${Math.abs(daysUntilExpiry)} days ago`;
    } else if (daysUntilExpiry < 30) {
      expiryStatus = `⏰ Expires in ${daysUntilExpiry} days (${expiryDate})`;
    } else {
      expiryStatus = `✅ Expires on ${expiryDate} (${daysUntilExpiry} days)`;
    }

    return {
      success: true,
      message: `Domain "${domainData.domainName}" resolves to:\n${domainDetails.resolvedAddress}\non ${chainName}\n\n${expiryStatus}`,
      data: {
        domainName: domainData.domainName,
        chainId: domainDetails.chainId,
        resolvedAddress: domainDetails.resolvedAddress,
        expiresAt: domainDetails.expiresAt,
        expiryDate,
        daysUntilExpiry,
      },
    };
  } catch (error) {
    console.error('Error resolving domain:', error);
    return {
      success: false,
      message: 'Failed to resolve domain',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle domain transfer action
 */
export async function handleTransferDomain(
  intent: any
): Promise<ActionResult> {
  try {
    const domainService = getDomainService();
    const { domainData, recipient } = intent;

    if (!domainData?.domainName || !recipient) {
      return {
        success: false,
        message: 'Please provide domain name and recipient address',
        error: 'Missing required data',
      };
    }

    // Transfer domain
    const result = await domainService.transferDomain(
      domainData.domainName,
      recipient
    );

    return {
      success: true,
      message: `Domain "${domainData.domainName}" transferred to ${recipient}`,
      txHash: result.txHash,
      data: {
        domainName: domainData.domainName,
        newOwner: recipient,
      },
    };
  } catch (error) {
    console.error('Error transferring domain:', error);
    return {
      success: false,
      message: 'Failed to transfer domain',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle update domain resolution action
 */
export async function handleUpdateDomain(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  try {
    const domainService = getDomainService();
    const { domainData } = intent;

    if (!domainData?.domainName) {
      return {
        success: false,
        message: 'Please provide a domain name to update. Example: "Update alice.flow to point to 0x123..."',
        error: 'Missing domain name',
      };
    }

    // Normalize domain name
    const normalizedDomain = domainData.domainName.toLowerCase().trim();

    // Determine new address (either from domainData.resolvedAddress or recipient)
    const newAddress = domainData.resolvedAddress || intent.recipient || userAddress;

    if (!newAddress || !ethers.isAddress(newAddress)) {
      return {
        success: false,
        message: 'Please provide a valid address to point the domain to',
        error: 'Invalid address',
      };
    }

    // Check if domain exists
    const exists = await domainService.domainExists(normalizedDomain);
    if (!exists) {
      return {
        success: false,
        message: `Domain "${normalizedDomain}" does not exist`,
        error: 'Domain not found',
      };
    }

    // Get current domain details to check ownership
    const currentDetails = await domainService.getDomainDetails(normalizedDomain);
    if (currentDetails.owner.toLowerCase() !== userAddress.toLowerCase()) {
      return {
        success: false,
        message: `You don't own the domain "${normalizedDomain}". Only the owner can update it.`,
        error: 'Not domain owner',
      };
    }

    // Update domain resolution
    const chainId = domainData.chainId || 545; // Default to Flow EVM
    const result = await domainService.updateDomainResolution({
      domainName: normalizedDomain,
      newChainId: chainId,
      newAddress,
    });

    const chainName = getChainName(chainId);

    return {
      success: true,
      message: `Domain "${normalizedDomain}" updated successfully! Now points to ${newAddress} on ${chainName}`,
      txHash: result.txHash,
      data: {
        domainName: normalizedDomain,
        resolvedAddress: newAddress,
        chainId,
      },
    };
  } catch (error) {
    console.error('Error updating domain:', error);
    return {
      success: false,
      message: 'Failed to update domain resolution',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle domain renewal action
 */
export async function handleRenewDomain(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  try {
    const domainService = getDomainService();
    const { domainData } = intent;

    if (!domainData?.domainName) {
      return {
        success: false,
        message: 'Please provide a domain name to renew. Example: "Renew domain alice.flow"',
        error: 'Missing domain name',
      };
    }

    // Normalize domain name
    const normalizedDomain = domainData.domainName.toLowerCase().trim();

    // Check if domain exists
    const exists = await domainService.domainExists(normalizedDomain);
    if (!exists) {
      return {
        success: false,
        message: `Domain "${normalizedDomain}" does not exist`,
        error: 'Domain not found',
      };
    }

    // Get current domain details to check ownership and expiration
    const currentDetails = await domainService.getDomainDetails(normalizedDomain);
    if (currentDetails.owner.toLowerCase() !== userAddress.toLowerCase()) {
      return {
        success: false,
        message: `You don't own the domain "${normalizedDomain}". Only the owner can renew it.`,
        error: 'Not domain owner',
      };
    }

    // Get renewal fee
    const fee = await domainService.getRegistrationFee();

    // Calculate current expiry info
    const now = Math.floor(Date.now() / 1000);
    const daysUntilExpiry = Math.floor((currentDetails.expiresAt - now) / 86400);
    const currentExpiryDate = new Date(currentDetails.expiresAt * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // Renew domain
    const result = await domainService.renewDomain(normalizedDomain);

    // Calculate new expiry (365 days from current expiry)
    const newExpiresAt = currentDetails.expiresAt + (365 * 24 * 60 * 60);
    const newExpiryDate = new Date(newExpiresAt * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    return {
      success: true,
      message: `Domain "${normalizedDomain}" renewed successfully!\n\nPrevious expiry: ${currentExpiryDate} (${daysUntilExpiry} days)\nNew expiry: ${newExpiryDate}\n\nRenewal fee: ${fee} FLOW`,
      txHash: result.txHash,
      data: {
        domainName: normalizedDomain,
        previousExpiresAt: currentDetails.expiresAt,
        newExpiresAt,
        renewalFee: fee,
      },
    };
  } catch (error) {
    console.error('Error renewing domain:', error);
    return {
      success: false,
      message: 'Failed to renew domain',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle check domain availability action
 */
export async function handleCheckDomainAvailability(
  intent: any
): Promise<ActionResult> {
  try {
    const domainService = getDomainService();
    const { domainData } = intent;

    if (!domainData?.domainName) {
      return {
        success: false,
        message: 'Please provide a domain name to check',
        error: 'Missing domain name',
      };
    }

    const normalizedDomain = domainData.domainName.toLowerCase().trim();
    const available = await domainService.isDomainAvailable(normalizedDomain);

    if (available) {
      return {
        success: true,
        message: `✅ Domain "${normalizedDomain}" is available! You can register it now.`,
        data: { domainName: normalizedDomain, available: true },
      };
    } else {
      return {
        success: true,
        message: `❌ Domain "${normalizedDomain}" is already registered and not available.`,
        data: { domainName: normalizedDomain, available: false },
      };
    }
  } catch (error) {
    console.error('Error checking domain availability:', error);
    return {
      success: false,
      message: 'Failed to check domain availability',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle query owned domains action
 */
export async function handleQueryDomains(
  userAddress: string
): Promise<ActionResult> {
  try {
    const domainService = getDomainService();

    // Get owned domains
    const ownedDomains = await domainService.getOwnedDomains(userAddress);

    if (ownedDomains.length === 0) {
      return {
        success: true,
        message: "You don't own any domains yet. Try registering one with 'Register domain myname.flow'",
        data: { domains: [] },
      };
    }

    // Calculate current time for expiry calculations
    const now = Math.floor(Date.now() / 1000);

    // Format domain list with expiration info
    const domainList = ownedDomains
      .map((domain) => {
        const chainName = getChainName(domain.chainId);
        const registeredDate = new Date(domain.registeredAt * 1000).toLocaleDateString();

        // Calculate days until expiry
        const daysUntilExpiry = Math.floor((domain.expiresAt - now) / 86400);
        const expiryDate = new Date(domain.expiresAt * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });

        // Determine expiry status with emoji
        let expiryInfo = '';
        if (daysUntilExpiry < 0) {
          expiryInfo = `⚠️ Expired ${Math.abs(daysUntilExpiry)} days ago`;
        } else if (daysUntilExpiry < 30) {
          expiryInfo = `⏰ Expires in ${daysUntilExpiry} days (${expiryDate})`;
        } else {
          expiryInfo = `✅ Expires ${expiryDate} (${daysUntilExpiry} days)`;
        }

        return `• ${domain.name}\n  Points to: ${domain.resolvedAddress}\n  Chain: ${chainName}\n  Registered: ${registeredDate}\n  ${expiryInfo}`;
      })
      .join('\n\n');

    return {
      success: true,
      message: `You own ${ownedDomains.length} domain${
        ownedDomains.length > 1 ? 's' : ''
      }:\n\n${domainList}`,
      data: { domains: ownedDomains },
    };
  } catch (error) {
    console.error('Error querying domains:', error);
    return {
      success: false,
      message: 'Failed to fetch your domains',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle query transactions action
 */
export async function handleQueryTransactions(
  userAddress: string,
  limit: number = 10
): Promise<ActionResult> {
  try {
    const transactionService = getTransactionService();

    // Get recent transactions
    const transactions = await transactionService.getRecentTransactions(
      userAddress,
      { limit }
    );

    if (transactions.length === 0) {
      return {
        success: true,
        message: "You don't have any recent transactions yet.",
        data: { transactions: [] },
      };
    }

    // Format transaction list
    const txList = transactions
      .map((tx, index) => {
        const formatted = transactionService.formatTransactionForDisplay(tx, userAddress);
        const explorerLink = transactionService.getTransactionUrl(tx.hash);
        return `${index + 1}. ${formatted}\n   View: ${explorerLink}`;
      })
      .join('\n\n');

    return {
      success: true,
      message: `Your ${transactions.length} most recent transaction${
        transactions.length > 1 ? 's' : ''
      }:\n\n${txList}`,
      data: { transactions },
    };
  } catch (error) {
    console.error('Error querying transactions:', error);
    return {
      success: false,
      message: 'Failed to fetch your transactions. Please try again later.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle add contact action
 */
export async function handleAddContact(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  try {
    const addressBookService = await getAddressBookService();
    const { contactData } = intent;

    if (!contactData?.name || !contactData?.address) {
      return {
        success: false,
        message: 'Please provide both contact name and address',
        error: 'Missing required data',
      };
    }

    // Check if contact already exists
    const exists = await addressBookService.contactExists(contactData.name);
    if (exists) {
      return {
        success: false,
        message: `Contact "${contactData.name}" already exists. Use update command to modify it.`,
        error: 'Contact already exists',
      };
    }

    // Add contact
    const result = await addressBookService.addContact({
      name: contactData.name,
      wallet: contactData.address,
      notes: contactData.notes || '',
    });

    return {
      success: true,
      message: `Contact "${contactData.name}" (${contactData.address}) saved successfully!`,
      txHash: result.txHash,
      data: {
        name: contactData.name,
        address: contactData.address,
      },
    };
  } catch (error) {
    console.error('Error adding contact:', error);
    return {
      success: false,
      message: 'Failed to add contact',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle view contacts action
 */
export async function handleViewContacts(
  userAddress: string
): Promise<ActionResult> {
  try {
    const addressBookService = await getAddressBookService();

    // Get all contacts
    const contacts = await addressBookService.getAllContacts();

    if (contacts.length === 0) {
      return {
        success: true,
        message: "You don't have any contacts yet. Try adding one with 'Add contact [Name] at [Address]'",
        data: { contacts: [] },
      };
    }

    // Format contact list
    const contactList = contacts
      .map((contact, index) => {
        const notes = contact.notes ? ` - ${contact.notes}` : '';
        return `${index + 1}. ${contact.name}: ${contact.wallet}${notes}`;
      })
      .join('\n');

    return {
      success: true,
      message: `You have ${contacts.length} contact${
        contacts.length > 1 ? 's' : ''
      }:\n\n${contactList}`,
      data: { contacts },
    };
  } catch (error) {
    console.error('Error viewing contacts:', error);
    return {
      success: false,
      message: 'Failed to fetch your contacts',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle find contact action
 */
export async function handleFindContact(
  intent: any
): Promise<ActionResult> {
  try {
    const addressBookService = await getAddressBookService();
    const { contactData } = intent;

    if (!contactData?.name) {
      return {
        success: false,
        message: 'Please provide a contact name to search for',
        error: 'Missing contact name',
      };
    }

    // Try exact match first
    const exactMatch = await addressBookService.getContact(contactData.name);
    if (exactMatch) {
      const notes = exactMatch.notes ? `\nNotes: ${exactMatch.notes}` : '';
      return {
        success: true,
        message: `Found contact:\n\nName: ${exactMatch.name}\nAddress: ${exactMatch.wallet}${notes}`,
        data: { contact: exactMatch },
      };
    }

    // Try search
    const matches = await addressBookService.searchContacts(contactData.name);
    if (matches.length === 0) {
      return {
        success: true, // Return success to avoid error formatting
        message: `No contacts found matching "${contactData.name}". Try adding them with "Add contact [Name] at [Address]"`,
        data: { contacts: [] },
      };
    }

    // Format search results
    const resultList = matches
      .map((contact) => {
        const notes = contact.notes ? ` - ${contact.notes}` : '';
        return `• ${contact.name}: ${contact.wallet}${notes}`;
      })
      .join('\n');

    return {
      success: true,
      message: `Found ${matches.length} contact${
        matches.length > 1 ? 's' : ''
      } matching "${contactData.name}":\n\n${resultList}`,
      data: { contacts: matches },
    };
  } catch (error) {
    console.error('Error finding contact:', error);
    return {
      success: false,
      message: 'Failed to search contacts',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle update contact action
 */
export async function handleUpdateContact(
  intent: any
): Promise<ActionResult> {
  // Feature not currently supported
  return {
    success: false,
    message: FEATURE_NOT_SUPPORTED_MESSAGE,
    error: 'Feature not supported',
  };
}

/**
 * Handle remove contact action
 */
export async function handleRemoveContact(
  intent: any
): Promise<ActionResult> {
  // Feature not currently supported
  return {
    success: false,
    message: FEATURE_NOT_SUPPORTED_MESSAGE,
    error: 'Feature not supported',
  };
}

/**
 * Handle generate QR code action
 */
export async function handleGenerateQR(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  try {
    const { qrData } = intent;
    const address = qrData?.address || intent.recipient || userAddress;

    if (!ethers.isAddress(address)) {
      return {
        success: false,
        message: 'Invalid Ethereum address provided',
        error: 'Invalid address',
      };
    }

    return {
      success: true,
      message: `QR code generated for address: ${address}`,
      data: {
        address,
        label: qrData?.label || (address === userAddress ? 'My Wallet' : undefined),
        showQR: true,
      },
    };
  } catch (error) {
    console.error('Error generating QR code:', error);
    return {
      success: false,
      message: 'Failed to generate QR code',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle create ERC20 token action
 */
export async function handleCreateERC20(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  try {
    const { erc20Data } = intent;

    // Validate required fields
    if (!erc20Data?.tokenName || !erc20Data?.tokenSymbol || !erc20Data?.totalSupply) {
      return {
        success: false,
        message: `To create an ERC20 token, I need the following details:\n\n${!erc20Data?.tokenName ? '• Token Name: The full name of your token\n' : ''}${!erc20Data?.tokenSymbol ? '• Token Symbol: A short ticker (e.g., MTK)\n' : ''}${!erc20Data?.totalSupply ? '• Total Supply: The total number of tokens to create\n' : ''}\nExample: "Create a token called MyToken with symbol MTK and 1000000 supply"`,
        error: 'Missing required token data',
      };
    }

    return {
      success: true,
      message: `Ready to create ERC20 token "${erc20Data.tokenName}" (${erc20Data.tokenSymbol}) with supply of ${erc20Data.totalSupply}`,
      data: {
        ...erc20Data,
        showTokenModal: true,
      },
    };
  } catch (error) {
    console.error('Error creating ERC20 token:', error);
    return {
      success: false,
      message: 'Failed to create ERC20 token',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle transfer ERC20 tokens action
 */
export async function handleTransferERC20(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  try {
    const { erc20Data, recipient } = intent;

    if (!erc20Data?.contractAddress || !recipient) {
      return {
        success: false,
        message: 'Please provide both the token contract address and recipient address',
        error: 'Missing required data',
      };
    }

    if (!ethers.isAddress(erc20Data.contractAddress) || !ethers.isAddress(recipient)) {
      return {
        success: false,
        message: 'Invalid Ethereum address provided',
        error: 'Invalid address',
      };
    }

    // Import the ERC20 service dynamically
    const { getERC20Service } = await import('../erc20/erc20Service');
    const { ERC20Service } = await import('../erc20/erc20Service');

    if (!ERC20Service.isConfigured()) {
      return {
        success: false,
        message: 'ERC20 token factory is not configured. Please deploy the factory contract first.',
        error: 'Factory not configured',
      };
    }

    const erc20Service = getERC20Service();

    // Get token info to display in confirmation
    const tokenInfo = await erc20Service.getTokenInfo(erc20Data.contractAddress);

    // Get user's balance
    const balance = await erc20Service.getTokenBalance(erc20Data.contractAddress, userAddress);

    // If no amount specified, ask for it
    if (!erc20Data.amount && erc20Data.amount !== 0) {
      return {
        success: false,
        message: `How many ${tokenInfo.symbol} tokens would you like to transfer to ${recipient}?\n\nYour balance: ${balance.balance} ${tokenInfo.symbol}\n\nPlease reply with: "Transfer [amount] ${tokenInfo.symbol}" or just the amount.`,
        error: 'Amount required',
        data: {
          needsAmount: true,
          contractAddress: erc20Data.contractAddress,
          recipient,
          tokenSymbol: tokenInfo.symbol,
          balance: balance.balance,
        },
      };
    }

    // Validate amount
    if (parseFloat(erc20Data.amount) <= 0) {
      return {
        success: false,
        message: 'Transfer amount must be greater than 0',
        error: 'Invalid amount',
      };
    }

    if (parseFloat(erc20Data.amount) > parseFloat(balance.balance)) {
      return {
        success: false,
        message: `Insufficient balance. You have ${balance.balance} ${tokenInfo.symbol} but trying to transfer ${erc20Data.amount}`,
        error: 'Insufficient balance',
      };
    }

    // Perform the transfer
    const result = await erc20Service.transferTokens(
      erc20Data.contractAddress,
      recipient,
      erc20Data.amount.toString()
    );

    return {
      success: true,
      message: `Successfully transferred ${erc20Data.amount} ${tokenInfo.symbol} to ${recipient}`,
      txHash: result.txHash,
      data: {
        contractAddress: erc20Data.contractAddress,
        amount: erc20Data.amount,
        recipient,
        tokenSymbol: tokenInfo.symbol,
      },
    };
  } catch (error) {
    console.error('Error transferring ERC20 tokens:', error);
    return {
      success: false,
      message: 'Failed to transfer tokens',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle transfer ERC20 ownership action
 */
export async function handleTransferERC20Ownership(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  try {
    const { erc20Data } = intent;

    if (!erc20Data?.contractAddress || !erc20Data?.newOwner) {
      return {
        success: false,
        message: 'Please provide both the token contract address and the new owner address',
        error: 'Missing required data',
      };
    }

    if (!ethers.isAddress(erc20Data.contractAddress) || !ethers.isAddress(erc20Data.newOwner)) {
      return {
        success: false,
        message: 'Invalid Ethereum address provided',
        error: 'Invalid address',
      };
    }

    return {
      success: true,
      message: `Ready to transfer ownership of token ${erc20Data.contractAddress} to ${erc20Data.newOwner}`,
      data: {
        ...erc20Data,
        showOwnershipTransfer: true,
      },
    };
  } catch (error) {
    console.error('Error transferring ERC20 ownership:', error);
    return {
      success: false,
      message: 'Failed to transfer token ownership',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle query ERC20 tokens action
 */
export async function handleQueryERC20Tokens(
  userAddress: string
): Promise<ActionResult> {
  try {
    // Import the ERC20 service dynamically to avoid circular dependencies
    const { getERC20Service } = await import('../erc20/erc20Service');

    // Check if ERC20 factory is configured
    const { ERC20Service } = await import('../erc20/erc20Service');
    if (!ERC20Service.isConfigured()) {
      return {
        success: false,
        message: 'ERC20 token factory is not configured. Please deploy the factory contract first.',
        error: 'Factory not configured',
      };
    }

    const erc20Service = getERC20Service();

    // Fetch tokens created by this address
    const tokens = await erc20Service.getCreatorTokens(userAddress);

    if (tokens.length === 0) {
      return {
        success: true,
        message: `You haven't created any ERC20 tokens yet.\n\nTo create a token, try: "Create a token called MyToken with symbol MTK and 1000000 supply"`,
        data: {
          tokens: [],
        },
      };
    }

    // Format the token list
    const tokenList = tokens.map((token, index) =>
      `${index + 1}. **${token.name}** (${token.symbol})\n   • Address: ${token.tokenAddress}\n   • Supply: ${token.totalSupply}\n   • Decimals: ${token.decimals}`
    ).join('\n\n');

    return {
      success: true,
      message: `You have created ${tokens.length} ERC20 token${tokens.length > 1 ? 's' : ''}:\n\n${tokenList}`,
      data: {
        tokens,
      },
    };
  } catch (error) {
    console.error('Error querying ERC20 tokens:', error);
    return {
      success: false,
      message: 'Failed to fetch ERC20 tokens. Make sure you are connected to the correct network.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle get token info action
 */
export async function handleGetTokenInfo(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  try {
    const { erc20Data } = intent;

    if (!erc20Data?.contractAddress) {
      return {
        success: false,
        message: 'Please provide a token contract address',
        error: 'Missing contract address',
      };
    }

    if (!ethers.isAddress(erc20Data.contractAddress)) {
      return {
        success: false,
        message: 'Invalid token contract address',
        error: 'Invalid address',
      };
    }

    // Import the ERC20 service dynamically
    const { getERC20Service } = await import('../erc20/erc20Service');
    const { ERC20Service } = await import('../erc20/erc20Service');

    if (!ERC20Service.isConfigured()) {
      return {
        success: false,
        message: 'ERC20 token factory is not configured. Please deploy the factory contract first.',
        error: 'Factory not configured',
      };
    }

    const erc20Service = getERC20Service();

    // Fetch token info
    const tokenInfo = await erc20Service.getTokenInfo(erc20Data.contractAddress);

    // Check if the user is the owner
    let ownershipInfo = '';
    try {
      const owner = await erc20Service.getTokenOwner(erc20Data.contractAddress);
      const isOwner = owner.toLowerCase() === userAddress.toLowerCase();
      ownershipInfo = `\n• **Owner**: ${owner}${isOwner ? ' (You)' : ''}`;
    } catch (error) {
      // Token might not have owner() function
      ownershipInfo = '';
    }

    // Get user's balance
    let balanceInfo = '';
    try {
      const balance = await erc20Service.getTokenBalance(erc20Data.contractAddress, userAddress);
      balanceInfo = `\n• **Your Balance**: ${balance.balance} ${balance.symbol}`;
    } catch (error) {
      console.error('Error fetching balance:', error);
    }

    const message = `**Token Details**\n\n• **Name**: ${tokenInfo.name}\n• **Symbol**: ${tokenInfo.symbol}\n• **Address**: ${tokenInfo.tokenAddress}\n• **Total Supply**: ${tokenInfo.totalSupply}\n• **Decimals**: ${tokenInfo.decimals}\n• **Creator**: ${tokenInfo.creator}${ownershipInfo}${balanceInfo}`;

    return {
      success: true,
      message,
      data: tokenInfo,
    };
  } catch (error) {
    console.error('Error fetching token info:', error);
    return {
      success: false,
      message: 'Failed to fetch token information. Make sure the address is a valid ERC20 token contract.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main action handler dispatcher
 */
export async function handleChatAction(
  action: string,
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  switch (action) {
    case 'mint_nft':
      return handleMintNFT(intent, userAddress);

    case 'transfer_nft':
      return handleTransferNFT(intent, userAddress);

    case 'query_nfts':
      return handleQueryNFTs(userAddress);

    case 'register_domain':
      return handleRegisterDomain(intent, userAddress);

    case 'resolve_domain':
      return handleResolveDomain(intent);

    case 'transfer_domain':
      return handleTransferDomain(intent);

    case 'update_domain':
      return handleUpdateDomain(intent, userAddress);

    case 'renew_domain':
      return handleRenewDomain(intent, userAddress);

    case 'check_domain_availability':
      return handleCheckDomainAvailability(intent);

    case 'query_domains':
      return handleQueryDomains(userAddress);

    case 'query_transactions':
      return handleQueryTransactions(userAddress, intent.transactionData?.limit || 10);

    case 'add_contact':
      return handleAddContact(intent, userAddress);

    case 'view_contacts':
      return handleViewContacts(userAddress);

    case 'find_contact':
      return handleFindContact(intent);

    case 'update_contact':
      return handleUpdateContact(intent);

    case 'remove_contact':
      return handleRemoveContact(intent);

    case 'generate_qr':
      return handleGenerateQR(intent, userAddress);

    case 'create_erc20':
      return handleCreateERC20(intent, userAddress);

    case 'transfer_erc20':
      return handleTransferERC20(intent, userAddress);

    case 'transfer_erc20_ownership':
      return handleTransferERC20Ownership(intent, userAddress);

    case 'query_erc20_tokens':
      return handleQueryERC20Tokens(userAddress);

    case 'get_token_info':
      return handleGetTokenInfo(intent, userAddress);

    default:
      return {
        success: false,
        message: `Unknown action: ${action}`,
        error: 'Action not supported',
      };
  }
}

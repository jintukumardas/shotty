/**
 * Chat Action Handlers
 * Handles execution of NFT and Domain actions from chat interface
 */

import { ethers } from 'ethers';
import { getNFTService, uploadMetadata, createNFTMetadata } from '../nft/nftService';
import { getDomainService, isValidDomainName, validateDomainName, getChainName } from '../domains/domainService';
import { getTransactionService } from '../transactions/transactionService';
import { getAddressBookService } from '../addressBook/addressBookService';
import { getLiFiService, getChainId } from '../lifi/lifiService';

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
 * Handle get swap quote action - DeFi cross-chain bridge
 */
export async function handleGetSwapQuote(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  try {
    const lifiService = getLiFiService();
    const { swapData } = intent;

    if (!swapData?.fromChain || !swapData?.toChain || !swapData?.fromToken || !swapData?.toToken || !swapData?.amount) {
      return {
        success: false,
        message: 'Please provide all swap details:\n• Source chain (e.g., "ethereum", "polygon")\n• Destination chain\n• Source token address\n• Destination token address\n• Amount to swap\n\nExample: "Swap 1 USDC from Ethereum to Polygon"',
        error: 'Missing swap parameters',
      };
    }

    // Convert chain names to chain IDs
    const fromChainId = getChainId(swapData.fromChain);
    const toChainId = getChainId(swapData.toChain);

    // Get quote from LiFi
    const quote = await lifiService.getQuote({
      fromChain: fromChainId,
      toChain: toChainId,
      fromToken: swapData.fromToken,
      toToken: swapData.toToken,
      fromAmount: swapData.amount,
      fromAddress: userAddress,
    });

    // Format the quote information
    const fromAmount = ethers.formatUnits(quote.estimate.fromAmount, 18);
    const toAmount = ethers.formatUnits(quote.estimate.toAmount, 18);
    const toAmountMin = ethers.formatUnits(quote.estimate.toAmountMin, 18);
    const executionTime = Math.ceil(quote.estimate.executionDuration / 60); // Convert to minutes

    return {
      success: true,
      message: `✨ **Swap Quote**\n\n**Route**: ${swapData.fromChain} → ${swapData.toChain}\n**You send**: ${fromAmount} ${swapData.fromToken}\n**You receive**: ~${toAmount} ${swapData.toToken}\n**Minimum received**: ${toAmountMin} ${swapData.toToken}\n**Bridge**: ${quote.tool}\n**Est. time**: ~${executionTime} min\n\nReady to proceed?`,
      data: {
        quote,
        fromChain: swapData.fromChain,
        toChain: swapData.toChain,
        fromAmount,
        toAmount,
        toAmountMin,
        executionTime,
        tool: quote.tool,
      },
    };
  } catch (error) {
    console.error('Error getting swap quote:', error);
    return {
      success: false,
      message: 'Failed to get swap quote. Please check your parameters and try again.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle execute swap action - DeFi cross-chain bridge
 */
export async function handleExecuteSwap(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  try {
    const { swapData } = intent;

    if (!swapData?.quote) {
      return {
        success: false,
        message: 'No quote found. Please get a quote first before executing the bridge.',
        error: 'Missing quote',
      };
    }

    // Note: The actual execution would require wallet interaction on the client side
    // This handler prepares the transaction data
    return {
      success: true,
      message: 'Preparing bridge transaction...',
      data: {
        quote: swapData.quote,
        requiresWalletSignature: true,
      },
    };
  } catch (error) {
    console.error('Error executing swap:', error);
    return {
      success: false,
      message: 'Failed to execute bridge',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle get swap status action - DeFi cross-chain bridge
 */
export async function handleGetSwapStatus(
  intent: any
): Promise<ActionResult> {
  try {
    const lifiService = getLiFiService();
    const { swapData } = intent;

    if (!swapData?.txHash || !swapData?.bridge || !swapData?.fromChain || !swapData?.toChain) {
      return {
        success: false,
        message: 'Please provide transaction hash, bridge name, source chain, and destination chain',
        error: 'Missing status parameters',
      };
    }

    const status = await lifiService.getStatus({
      txHash: swapData.txHash,
      bridge: swapData.bridge,
      fromChain: swapData.fromChain,
      toChain: swapData.toChain,
    });

    // Format status message
    let statusMessage = '';
    switch (status.status) {
      case 'DONE':
        statusMessage = '✅ **Swap Completed**\n\nYour tokens have been successfully bridged!';
        break;
      case 'PENDING':
        statusMessage = '⏳ **Swap In Progress**\n\nYour transaction is being processed...';
        break;
      case 'FAILED':
        statusMessage = '❌ **Swap Failed**\n\nThe transaction could not be completed.';
        break;
      default:
        statusMessage = `📊 **Status**: ${status.status}`;
    }

    return {
      success: true,
      message: statusMessage,
      data: status,
    };
  } catch (error) {
    console.error('Error getting swap status:', error);
    return {
      success: false,
      message: 'Failed to get swap status',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle get supported chains action - DeFi networks
 */
export async function handleGetSupportedChains(): Promise<ActionResult> {
  return {
    success: true,
    message: `🌐 **DeFi Cross-Chain Bridge**\n\nTo view available networks and bridge tokens:\n\n1. Ensure you're on **Flow EVM Mainnet** (Chain ID: 747)\n2. Say "Bridge tokens" to open the bridge interface\n3. Select networks and tokens from the dropdown menus\n\n💡 **Note**: DeFi bridging is only available on mainnet networks.`,
    data: { requiresMainnet: true },
  };
}

/**
 * Handle get chain tokens action - DeFi token list
 */
export async function handleGetChainTokens(
  intent: any
): Promise<ActionResult> {
  return {
    success: true,
    message: `💰 **Available Tokens**\n\nTo view and select tokens for bridging:\n\n1. Ensure you're on **Flow EVM Mainnet** (Chain ID: 747)\n2. Say "Bridge tokens" to open the bridge interface\n3. Select your desired network to see available tokens\n\n💡 **Note**: All popular tokens (USDC, ETH, DAI, etc.) are available in the bridge interface with live pricing.`,
    data: { requiresMainnet: true },
  };
}

/**
 * Handle batch transactions action
 */
export async function handleBatchTransactions(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  const contractAddress = process.env.NEXT_PUBLIC_BATCH_CONTRACT_ADDRESS;

  try {
    // Get user's batch stats
    const { batchService } = await import('@/services/batch/batchService');
    const stats = await batchService.getUserStats(userAddress);
    const totalBatches = await batchService.getTotalBatchesExecuted();

    return {
      success: true,
      message: `🚀 **Batch Transactions - Execute Multiple Operations!**\n\n**Your Stats:**\n• Batches executed: ${stats}\n• Network total: ${totalBatches}\n\n**Try these commands:**\n\n📊 **View Statistics**\n   \`Show my batch stats\`\n\n💡 **Example Workflows:**\n\n1️⃣ **Multi-Send ETH**\n   Send to 3 addresses in one transaction:\n   \`Batch send 0.1 FLOW to [0x123..., 0x456..., 0x789...]\`\n\n2️⃣ **Approve & Transfer**\n   Approve and transfer tokens in one TX:\n   \`Batch approve and send 100 tokens\`\n\n3️⃣ **Multi-Action**\n   Execute multiple contract calls:\n   \`Execute batch: transfer, approve, stake\`\n\n**Features:**\n• Bundle up to 50 operations\n• Atomic execution (all or nothing)\n• Gas-efficient batching\n• Flexible failure handling\n\n**Contract:** ${contractAddress}\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})\n\n_Interactive UI builder coming in next update!_`,
      data: {
        userStats: stats,
        totalBatches,
        contractAddress,
      },
    };
  } catch (error: any) {
    return {
      success: true,
      message: `🚀 **Batch Transactions - Execute Multiple Operations!**\n\n**Quick Start:**\n\n📊 **Check Your Stats**\n   \`Show my batch stats\`\n\n💡 **Example Commands:**\n\n1️⃣ Send to multiple addresses:\n   \`Batch send 0.1 FLOW to [0x123..., 0x456...]\`\n\n2️⃣ Approve and transfer:\n   \`Batch approve and send tokens\`\n\n3️⃣ Execute multiple actions:\n   \`Create batch transaction\`\n\n**Features:**\n• Bundle up to 50 operations\n• Gas-efficient execution\n• Flexible error handling\n\n**Contract:** ${contractAddress}\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
      data: { contractAddress },
    };
  }
}

/**
 * Handle schedule transaction action
 */
export async function handleScheduleTransaction(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  const contractAddress = process.env.NEXT_PUBLIC_SCHEDULED_CONTRACT_ADDRESS;

  try {
    const { scheduledService } = await import('@/services/scheduled/scheduledService');
    const pendingCount = await scheduledService.getPendingSchedulesCount(userAddress);
    const config = await scheduledService.getConfig();

    return {
      success: true,
      message: `⏰ **Schedule Transactions - Time-Locked Execution!**\n\n**Your Account:**\n• Pending schedules: ${pendingCount}\n\n**Configuration:**\n• Min delay: ${Math.floor(config.minDelay / 60)} minutes\n• Max delay: ${Math.floor(config.maxDelay / 86400)} days\n• Default window: ${Math.floor(config.defaultWindow / 86400)} days\n\n**Try these commands:**\n\n📋 **View Your Schedules**\n   \`Show my scheduled transactions\`\n\n💡 **Schedule Examples:**\n\n1️⃣ **Schedule a Transfer (1 hour)**\n   \`Schedule send 1 FLOW to 0x123... in 1 hour\`\n\n2️⃣ **Schedule for Tomorrow**\n   \`Schedule 0.5 FLOW transfer to Alice in 24 hours\`\n\n3️⃣ **Schedule Payment (1 week)**\n   \`Schedule payment of 10 FLOW in 7 days\`\n\n4️⃣ **Cancel a Schedule**\n   \`Cancel scheduled transaction #5\`\n\n**Features:**\n• Time-locked transfers\n• Flexible execution windows\n• Cancel anytime before execution\n• Anyone can execute (permissionless)\n• Automatic refunds on cancellation\n\n**Contract:** ${contractAddress}\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})\n\n_Interactive scheduler coming soon!_`,
      data: {
        pendingCount,
        config,
        contractAddress,
      },
    };
  } catch (error: any) {
    return {
      success: true,
      message: `⏰ **Schedule Transactions - Time-Locked Execution!**\n\n**Quick Start:**\n\n📋 **View Your Schedules**\n   \`Show my scheduled transactions\`\n\n💡 **Example Commands:**\n\n1️⃣ Schedule in 1 hour:\n   \`Schedule send 1 FLOW to 0x123... in 1 hour\`\n\n2️⃣ Schedule for tomorrow:\n   \`Schedule transfer in 24 hours\`\n\n3️⃣ Cancel a schedule:\n   \`Cancel schedule #5\`\n\n**Features:**\n• Time-locked transfers\n• Flexible windows\n• Permissionless execution\n\n**Contract:** ${contractAddress}\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
      data: { contractAddress },
    };
  }
}

/**
 * Handle view scheduled transactions action
 */
export async function handleViewScheduledTransactions(
  userAddress: string
): Promise<ActionResult> {
  const contractAddress = process.env.NEXT_PUBLIC_SCHEDULED_CONTRACT_ADDRESS;

  return {
    success: true,
    message: `📋 **Your Scheduled Transactions**\n\nView and manage your scheduled transactions!\n\n**Contract:** \`${contractAddress}\`\n\n**What you can check:**\n• Pending scheduled transactions\n• Execution windows\n• Transaction status (Pending/Executed/Cancelled/Failed)\n• Time remaining until execution\n\n**Dashboard UI coming soon!**\n\nYou can query your schedules using the contract directly.\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
  };
}

/**
 * Handle cancel scheduled transaction action
 */
export async function handleCancelScheduledTransaction(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  const contractAddress = process.env.NEXT_PUBLIC_SCHEDULED_CONTRACT_ADDRESS;

  return {
    success: true,
    message: `❌ **Cancel Scheduled Transaction**\n\nCancel your pending scheduled transactions!\n\n**Contract:** \`${contractAddress}\`\n\n**How it works:**\n• Only the creator can cancel\n• Must be in Pending status\n• Funds are refunded automatically\n\n**UI for cancellation coming soon!**\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
  };
}

/**
 * Handle execute scheduled transaction action
 */
export async function handleExecuteScheduledTransaction(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  const contractAddress = process.env.NEXT_PUBLIC_SCHEDULED_CONTRACT_ADDRESS;

  return {
    success: true,
    message: `▶️ **Execute Scheduled Transaction**\n\nManually trigger scheduled transactions that are ready!\n\n**Contract:** \`${contractAddress}\`\n\n**Requirements:**\n• Transaction must be in Pending status\n• Current time >= executeAfter timestamp\n• Within execution window\n• Anyone can execute (permissionless)\n\n**Execution UI coming soon!**\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
  };
}

/**
 * Handle create workflow action
 */
export async function handleCreateWorkflow(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  const contractAddress = process.env.NEXT_PUBLIC_FLOW_ACTIONS_CONTRACT_ADDRESS;

  try {
    const { flowActionsService } = await import('@/services/flowActions/flowActionsService');
    const workflows = await flowActionsService.getUserWorkflows(userAddress);

    return {
      success: true,
      message: `🔗 **Flow Actions - Composable Workflows!**\n\n**Your Workflows:**\n• Total created: ${workflows.length}\n\n**Try these commands:**\n\n📂 **View Your Workflows**\n   \`Show my workflows\`\n\n💡 **Workflow Examples:**\n\n1️⃣ **Swap & Stake**\n   \`Create workflow: swap ETH for token, then stake\`\n\n2️⃣ **Multi-Transfer**\n   \`Workflow: send to Alice, Bob, and Charlie\`\n\n3️⃣ **DeFi Strategy**\n   \`Workflow: swap, lend, borrow\`\n\n4️⃣ **Execute Existing**\n   \`Execute workflow #2\`\n\n**Action Types Available:**\n• 💸 Transfer - Send tokens/ETH\n• 🔄 Swap - Exchange tokens\n• 🔒 Stake - Lock tokens\n• 💰 Lend - Deposit to earn\n• 🏦 Borrow - Take loans\n• ⚙️ Custom - Any contract call\n\n**Features:**\n• Up to 20 actions per workflow\n• Atomic execution (all or nothing)\n• Partial failure handling option\n• Create & execute in one TX\n• Reusable workflows\n• Gas-efficient batching\n\n**Contract:** ${contractAddress}\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})\n\n_Visual workflow builder coming in next update!_`,
      data: {
        workflowCount: workflows.length,
        contractAddress,
      },
    };
  } catch (error: any) {
    return {
      success: true,
      message: `🔗 **Flow Actions - Composable Workflows!**\n\n**Quick Start:**\n\n📂 **View Your Workflows**\n   \`Show my workflows\`\n\n💡 **Example Commands:**\n\n1️⃣ Swap & Stake:\n   \`Create workflow: swap then stake\`\n\n2️⃣ Multi-transfer:\n   \`Workflow: send to multiple addresses\`\n\n3️⃣ Execute workflow:\n   \`Execute workflow #2\`\n\n**Action Types:**\n• Transfer, Swap, Stake\n• Lend, Borrow, Custom\n\n**Features:**\n• Up to 20 actions\n• Atomic execution\n• Reusable workflows\n\n**Contract:** ${contractAddress}\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
      data: { contractAddress },
    };
  }
}

/**
 * Handle execute workflow action
 */
export async function handleExecuteWorkflow(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  const contractAddress = process.env.NEXT_PUBLIC_FLOW_ACTIONS_CONTRACT_ADDRESS;

  return {
    success: true,
    message: `▶️ **Execute Workflow - Live!**\n\nRun your saved workflows!\n\n**Contract:** \`${contractAddress}\`\n\n**How it works:**\n• Execute saved workflows by ID\n• All actions run sequentially\n• Results returned for each action\n• Only workflow creator can execute\n• Send required ETH for actions\n\n**Execution dashboard coming soon!**\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
  };
}

/**
 * Handle view workflows action
 */
export async function handleViewWorkflows(
  userAddress: string
): Promise<ActionResult> {
  const contractAddress = process.env.NEXT_PUBLIC_FLOW_ACTIONS_CONTRACT_ADDRESS;

  return {
    success: true,
    message: `📂 **Your Workflows - Live!**\n\nView and manage your saved workflows!\n\n**Contract:** \`${contractAddress}\`\n\n**What you can see:**\n• All your created workflows\n• Workflow status (Pending/Executing/Completed/Failed/Cancelled)\n• Number of actions in each workflow\n• Workflow names and IDs\n• Action details for each workflow\n\n**Management dashboard coming soon!**\n\nQuery your workflows using the contract.\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
  };
}

/**
 * Handle lend tokens action
 */
export async function handleLendTokens(
  intent: any,
  userAddress: string
): Promise<ActionResult> {
  const contractAddress = process.env.NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS;

  try {
    const { lendingService } = await import('@/services/lending/lendingService');
    const position = await lendingService.getUserTotalPosition(userAddress);
    const supportedTokens = await lendingService.getSupportedTokens();

    const totalDeposits = position.deposits.length;
    const totalLoans = position.loans.length;

    return {
      success: true,
      message: `💰 **Lending Protocol - Earn & Borrow!**\n\n**Your Position:**\n• Active deposits: ${totalDeposits}\n• Active loans: ${totalLoans}\n• Supported tokens: ${supportedTokens.length}\n\n**Try these commands:**\n\n📊 **View Your Position**\n   \`Show my lending position\`\n\n💡 **Lending Examples:**\n\n1️⃣ **Deposit to Earn**\n   \`Lend 100 USDC to earn interest\`\n   \`Deposit 50 FLOW tokens\`\n\n2️⃣ **Borrow with Collateral**\n   \`Borrow 50 USDC with 1 ETH collateral\`\n   \`Borrow tokens against my ETH\`\n\n3️⃣ **Withdraw Earnings**\n   \`Withdraw my USDC deposit\`\n   \`Withdraw all deposits\`\n\n4️⃣ **Repay Loan**\n   \`Repay my USDC loan\`\n   \`Repay 25 tokens\`\n\n**Interest Rates:**\n• 📈 **Deposit APY:** 5% base rate\n• 📊 **Borrow APR:** Variable based on utilization\n• 💵 **Collateral Ratio:** 150% required\n• ⚠️ **Liquidation:** At 80% LTV\n\n**Features:**\n• Earn interest on deposits\n• Withdraw anytime (if liquidity available)\n• Borrow against ETH collateral\n• Automatic interest accrual\n• No lock-up periods\n• Permissionless liquidations\n\n**Contract:** ${contractAddress}\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})\n\n_Interactive lending dashboard coming soon!_`,
      data: {
        deposits: totalDeposits,
        loans: totalLoans,
        supportedTokens: supportedTokens.length,
        contractAddress,
      },
    };
  } catch (error: any) {
    return {
      success: true,
      message: `💰 **Lending Protocol - Earn & Borrow!**\n\n**Quick Start:**\n\n📊 **View Your Position**\n   \`Show my lending position\`\n\n💡 **Example Commands:**\n\n1️⃣ Deposit to earn:\n   \`Lend 100 USDC\`\n\n2️⃣ Borrow tokens:\n   \`Borrow 50 USDC with ETH\`\n\n3️⃣ Withdraw:\n   \`Withdraw my deposit\`\n\n4️⃣ Repay:\n   \`Repay my loan\`\n\n**Features:**\n• 5% base APY\n• Withdraw anytime\n• 150% collateralization\n• Auto interest accrual\n\n**Contract:** ${contractAddress}\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
      data: { contractAddress },
    };
  }
}

/**
 * Handle borrow tokens action
 */
export async function handleBorrowTokens(
  _intent: any,
  _userAddress: string
): Promise<ActionResult> {
  const contractAddress = process.env.NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS;

  return {
    success: true,
    message: `🏦 **Borrow Tokens - Live!**\n\nBorrow tokens using ETH as collateral!\n\n**Contract:** \`${contractAddress}\`\n\n**Features:**\n• 150% collateralization ratio required\n• Borrow supported ERC20 tokens\n• Provide ETH as collateral\n• Interest accrues on borrowed amount\n• Liquidation threshold: 80% LTV\n• Liquidation penalty: 10%\n\n**Borrowing dashboard coming soon!**\n\nContract is live and ready.\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
  };
}

/**
 * Handle repay loan action
 */
export async function handleRepayLoan(
  _intent: any,
  _userAddress: string
): Promise<ActionResult> {
  const contractAddress = process.env.NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS;

  return {
    success: true,
    message: `💸 **Repay Loan - Live!**\n\nRepay your loans and reclaim collateral!\n\n**Contract:** \`${contractAddress}\`\n\n**How it works:**\n• Repay borrowed amount + accrued interest\n• Proportional collateral returned\n• Can repay partial amounts\n• Full repayment releases all collateral\n• Token approval required\n\n**Repayment dashboard coming soon!**\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
  };
}

/**
 * Handle withdraw deposit action
 */
export async function handleWithdrawDeposit(
  _intent: any,
  _userAddress: string
): Promise<ActionResult> {
  const contractAddress = process.env.NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS;

  return {
    success: true,
    message: `🏧 **Withdraw Deposit - Live!**\n\nWithdraw your deposits plus earned interest!\n\n**Contract:** \`${contractAddress}\`\n\n**Features:**\n• Withdraw deposited tokens\n• Claim earned interest\n• Partial or full withdrawals\n• Check liquidity before withdrawing\n• Interest calculated up to withdrawal\n\n**Withdrawal dashboard coming soon!**\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
  };
}

/**
 * Handle view lending position action
 */
export async function handleViewLendingPosition(
  _userAddress: string
): Promise<ActionResult> {
  const contractAddress = process.env.NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS;

  return {
    success: true,
    message: `📊 **Your Lending Position - Live!**\n\nView your deposits, loans, and health factor!\n\n**Contract:** \`${contractAddress}\`\n\n**What you can see:**\n• All deposits across supported tokens\n• Earned interest on deposits\n• Active loans with borrowed amounts\n• Collateral amounts\n• Accrued interest on loans\n• Health factor (collateral/debt ratio)\n• Pool utilization rates\n\n**Position dashboard coming soon!**\n\nQuery your position using the contract.\n\n💡 [View on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
  };
}

/**
 * Handle view batch stats action
 */
export async function handleViewBatchStats(
  userAddress: string
): Promise<ActionResult> {
  try {
    const { batchService } = await import('@/services/batch/batchService');
    const stats = await batchService.getUserStats(userAddress);
    const totalBatches = await batchService.getTotalBatchesExecuted();
    const contractAddress = process.env.NEXT_PUBLIC_BATCH_CONTRACT_ADDRESS;

    return {
      success: true,
      message: `📊 **Your Batch Transaction Statistics**\n\n**Your Stats:**\n• Batches executed: ${stats}\n\n**Global Stats:**\n• Total batches on network: ${totalBatches}\n\n**Contract:** \`${contractAddress}\`\n\n${stats > 0 ? '✅ You\'ve used batch transactions before!' : '💡 You haven\'t executed any batch transactions yet. Try creating one!'}\n\n[View Contract on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `❌ **Error fetching batch stats**\n\n${error.message}\n\nMake sure you're connected to Flow EVM Testnet.`,
      error: error.message,
    };
  }
}

/**
 * Handle execute batch send action
 */
export async function handleExecuteBatchSend(
  intent: any,
  _userAddress: string
): Promise<ActionResult> {
  try {
    const { batchService } = await import('@/services/batch/batchService');
    const { ethers } = await import('ethers');
    const contractAddress = process.env.NEXT_PUBLIC_BATCH_CONTRACT_ADDRESS;

    if (!intent.batchData?.recipients || intent.batchData.recipients.length === 0) {
      return {
        success: false,
        message: '❌ No recipients provided',
        error: 'No recipients',
      };
    }

    const recipients = intent.batchData.recipients;
    const amount = intent.batchData.amountPerRecipient || intent.amount || 0;
    const token = intent.batchData.token || intent.token || 'FLOW';

    // Create batch operations for ETH/FLOW transfers
    const batchOperations = recipients.map((recipient: string) =>
      batchService.createETHTransferOperation(
        recipient,
        ethers.parseEther(amount.toString()).toString()
      )
    );

    // Calculate total value
    const totalValue = ethers.parseEther((amount * recipients.length).toString()).toString();

    // Execute the batch transaction
    const result = await batchService.executeBatch(batchOperations, true, totalValue);

    return {
      success: true,
      message: `✅ **Batch Transaction Executed!**\n\n**Summary:**\n• Sent ${amount} ${token} to ${recipients.length} addresses\n• Transaction hash: \`${result.txHash}\`\n\n**Recipients:**\n${recipients.map((addr: string, i: number) => `${i + 1}. ${addr} - ${amount} ${token}`).join('\n')}\n\n**Contract:** ${contractAddress}\n\n[View Transaction](https://evm-testnet.flowscan.io/tx/${result.txHash})`,
      txHash: result.txHash,
      data: {
        operations: batchOperations.length,
        totalValue,
        recipients,
      },
    };
  } catch (error: any) {
    console.error('Execute batch send error:', error);
    return {
      success: false,
      message: `❌ **Batch Transaction Failed**\n\n${error.message}\n\nPlease make sure:\n• You're connected to Flow EVM Testnet\n• You have sufficient balance\n• All addresses are valid`,
      error: error.message,
    };
  }
}

/**
 * Handle view scheduled transactions action (with real data)
 */
export async function handleViewScheduledTransactionsData(
  userAddress: string
): Promise<ActionResult> {
  try {
    const { scheduledService } = await import('@/services/scheduled/scheduledService');
    const schedules = await scheduledService.getUserSchedulesWithDetails(userAddress);
    const pendingCount = await scheduledService.getPendingSchedulesCount(userAddress);
    const contractAddress = process.env.NEXT_PUBLIC_SCHEDULED_CONTRACT_ADDRESS;

    if (schedules.length === 0) {
      return {
        success: true,
        message: `📋 **Your Scheduled Transactions**\n\n**Contract:** \`${contractAddress}\`\n\nYou don't have any scheduled transactions yet.\n\n💡 **Want to create one?** Type: "How do I schedule a transaction?"\n\n[View Contract on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
      };
    }

    let message = `📋 **Your Scheduled Transactions**\n\n**Contract:** \`${contractAddress}\`\n\n**Summary:**\n• Total schedules: ${schedules.length}\n• Pending: ${pendingCount}\n\n**Your Schedules:**\n\n`;

    schedules.forEach((schedule, index) => {
      const status = ['Pending', 'Executed', 'Cancelled', 'Failed'][schedule.status];
      const time = new Date(schedule.executeAfter * 1000).toLocaleString();
      message += `${index + 1}. **Schedule #${schedule.id}** - ${status}\n`;
      message += `   Execute after: ${time}\n`;
      message += `   Description: ${schedule.description}\n\n`;
    });

    message += `\n[View Contract on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`;

    return {
      success: true,
      message,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `❌ **Error fetching scheduled transactions**\n\n${error.message}\n\nMake sure you're connected to Flow EVM Testnet.`,
      error: error.message,
    };
  }
}

/**
 * Handle view workflows action (with real data)
 */
export async function handleViewWorkflowsData(
  userAddress: string
): Promise<ActionResult> {
  try {
    const { flowActionsService } = await import('@/services/flowActions/flowActionsService');
    const workflows = await flowActionsService.getUserWorkflowsWithDetails(userAddress);
    const contractAddress = process.env.NEXT_PUBLIC_FLOW_ACTIONS_CONTRACT_ADDRESS;

    if (workflows.length === 0) {
      return {
        success: true,
        message: `📂 **Your Workflows**\n\n**Contract:** \`${contractAddress}\`\n\nYou don't have any workflows yet.\n\n💡 **Want to create one?** Type: "How do I create a workflow?"\n\n[View Contract on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
      };
    }

    let message = `📂 **Your Workflows**\n\n**Contract:** \`${contractAddress}\`\n\n**Total workflows:** ${workflows.length}\n\n`;

    workflows.forEach((workflow, index) => {
      const status = ['Pending', 'Executing', 'Completed', 'Failed', 'Cancelled'][workflow.status];
      message += `${index + 1}. **${workflow.name}** (ID: ${workflow.id})\n`;
      message += `   Status: ${status}\n`;
      message += `   Actions: ${workflow.actionsCount}\n\n`;
    });

    message += `\n[View Contract on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`;

    return {
      success: true,
      message,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `❌ **Error fetching workflows**\n\n${error.message}\n\nMake sure you're connected to Flow EVM Testnet.`,
      error: error.message,
    };
  }
}

/**
 * Handle view lending position action (with real data)
 */
export async function handleViewLendingPositionData(
  userAddress: string
): Promise<ActionResult> {
  try {
    const { lendingService } = await import('@/services/lending/lendingService');
    const position = await lendingService.getUserTotalPosition(userAddress);
    const contractAddress = process.env.NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS;

    if (position.deposits.length === 0 && position.loans.length === 0) {
      return {
        success: true,
        message: `📊 **Your Lending Position**\n\n**Contract:** \`${contractAddress}\`\n\nYou don't have any deposits or loans yet.\n\n💡 **Want to start?**\n• Type: "How do I lend tokens?"\n• Type: "How do I borrow tokens?"\n\n[View Contract on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`,
      };
    }

    let message = `📊 **Your Lending Position**\n\n**Contract:** \`${contractAddress}\`\n\n`;

    if (position.deposits.length > 0) {
      message += `**💰 Deposits:**\n`;
      position.deposits.forEach((deposit, index) => {
        message += `${index + 1}. Token: ${deposit.token.slice(0, 10)}...\n`;
        message += `   Amount: ${deposit.amount}\n`;
        message += `   Interest earned: ${deposit.interest}\n\n`;
      });
    }

    if (position.loans.length > 0) {
      message += `\n**🏦 Loans:**\n`;
      position.loans.forEach((loan, index) => {
        const healthFactor = lendingService.calculateHealthFactor(
          loan.collateral,
          loan.borrowed,
          loan.interest
        );
        message += `${index + 1}. Token: ${loan.token.slice(0, 10)}...\n`;
        message += `   Borrowed: ${loan.borrowed}\n`;
        message += `   Collateral: ${loan.collateral}\n`;
        message += `   Interest: ${loan.interest}\n`;
        message += `   Health Factor: ${healthFactor}%\n\n`;
      });
    }

    message += `\n[View Contract on FlowScan](https://evm-testnet.flowscan.io/address/${contractAddress})`;

    return {
      success: true,
      message,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `❌ **Error fetching lending position**\n\n${error.message}\n\nMake sure you're connected to Flow EVM Testnet.`,
      error: error.message,
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

    case 'get_swap_quote':
      return handleGetSwapQuote(intent, userAddress);

    case 'execute_swap':
      return handleExecuteSwap(intent, userAddress);

    case 'get_swap_status':
      return handleGetSwapStatus(intent);

    case 'get_supported_chains':
      return handleGetSupportedChains();

    case 'get_chain_tokens':
      return handleGetChainTokens(intent);

    // New features - Batch Transactions
    case 'batch_transactions':
      return handleBatchTransactions(intent, userAddress);

    case 'view_batch_stats':
      return handleViewBatchStats(userAddress);

    case 'execute_batch_send':
      return handleExecuteBatchSend(intent, userAddress);

    // New features - Scheduled Transactions
    case 'schedule_transaction':
      return handleScheduleTransaction(intent, userAddress);

    case 'view_scheduled_transactions':
      return handleViewScheduledTransactionsData(userAddress);

    case 'cancel_scheduled_transaction':
      return handleCancelScheduledTransaction(intent, userAddress);

    case 'execute_scheduled_transaction':
      return handleExecuteScheduledTransaction(intent, userAddress);

    // New features - Workflows
    case 'create_workflow':
      return handleCreateWorkflow(intent, userAddress);

    case 'execute_workflow':
      return handleExecuteWorkflow(intent, userAddress);

    case 'view_workflows':
      return handleViewWorkflowsData(userAddress);

    // New features - Lending Protocol
    case 'lend_tokens':
      return handleLendTokens(intent, userAddress);

    case 'borrow_tokens':
      return handleBorrowTokens(intent, userAddress);

    case 'repay_loan':
      return handleRepayLoan(intent, userAddress);

    case 'withdraw_deposit':
      return handleWithdrawDeposit(intent, userAddress);

    case 'view_lending_position':
      return handleViewLendingPositionData(userAddress);

    default:
      return {
        success: false,
        message: `Unknown action: ${action}`,
        error: 'Action not supported',
      };
  }
}

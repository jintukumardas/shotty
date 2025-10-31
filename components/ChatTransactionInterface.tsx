'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Loader2, CheckCircle, XCircle, Link as LinkIcon, Copy, ExternalLink, Bot, User, Sparkles, Wallet, DollarSign, Gift, ArrowRight, QrCode, Coins, Share2, MessageCircle, Mail } from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '@/services/blockchain/useWallet';
import { executeTransaction } from '@/services/blockchain/transactionService';
import { createRedeemLink, redeemTokens } from '@/services/escrow/redeemLinks';
import { handleChatAction } from '@/services/chat/actionHandlers';
import MintNFTModal from './MintNFTModal';
import QRCodeModal from './QRCodeModal';
import CreateTokenModal from './CreateTokenModal';
import SwapModal from './SwapModal';
import FlowIcon from './FlowIcon';
import { uploadNFTWithImage, createNFTMetadata, uploadMetadata } from '@/services/nft/nftService';
import { getDomainService } from '@/services/domains/domainService';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  transaction?: {
    hash?: string;
    status: 'pending' | 'success' | 'failed';
    details?: any;
  };
  redeemLink?: {
    url: string;
    amount: string;
    token: string;
    txHash?: string;
  };
  nftData?: {
    nfts: Array<{
      tokenId: number;
      owner: string;
      creator: string;
      uri: string;
      metadata?: {
        name: string;
        description: string;
        image: string;
        attributes?: Array<{ trait_type: string; value: string | number }>;
      };
    }>;
  };
  qrData?: {
    address: string;
    label?: string;
  };
  tokenData?: {
    tokenAddress: string;
    txHash: string;
    name: string;
    symbol: string;
  };
  showSuggestions?: boolean;
}

interface TransactionConfirmation {
  intent: any;
  details: string;
}

interface SuggestionCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  example: string;
  gradient: string;
}

const ChatTransactionInterface = forwardRef<{ setInput: (text: string) => void }, {}>(function ChatTransactionInterface(props, ref) {
  const { address, isConnected, chainId, flowEvmClient, connectWallet: connectWalletHook } = useWallet();

  // Generate a random user avatar based on address
  const getUserAvatar = (address: string | null): string => {
    if (!address) {
      // Generate random avatar for non-connected users
      const randomSeed = Math.random().toString(36).substring(7);
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;
    }
    // Use address as seed for consistent avatar per user
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`;
  };

  // Helper to get chain name from chainId
  const getChainName = (chainId: number | null): string => {
    if (!chainId) return 'Unknown';
    const chains: Record<number, string> = {
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia Testnet',
      545: 'Flow EVM Testnet',
      747: 'Flow EVM Mainnet',
      137: 'Polygon',
      42161: 'Arbitrum',
      10: 'Optimism',
      8453: 'Base',
    };
    return chains[chainId] || `Chain ${chainId}`;
  };

  // Helper to get explorer URL for a transaction
  const getExplorerUrl = (txHash: string, chainId: number | null): string => {
    if (!chainId) return '#';
    const explorers: Record<number, string> = {
      1: `https://etherscan.io/tx/${txHash}`,
      11155111: `https://sepolia.etherscan.io/tx/${txHash}`,
      545: `https://evm-testnet.flowscan.io/tx/${txHash}`,
      747: `https://evm.flowscan.io/tx/${txHash}`,
      137: `https://polygonscan.com/tx/${txHash}`,
      42161: `https://arbiscan.io/tx/${txHash}`,
      10: `https://optimistic.etherscan.io/tx/${txHash}`,
      8453: `https://basescan.org/tx/${txHash}`,
    };
    return explorers[chainId] || `https://evm-testnet.flowscan.io/tx/${txHash}`;
  };

  const suggestions: SuggestionCard[] = [
    {
      icon: <Send className="w-5 h-5" />,
      title: 'Send Tokens',
      description: 'Send tokens on Flow EVM',
      example: 'Send 1 FLOW to 0x...',
      gradient: 'from-[#00EF8B] to-[#00D9FF]'
    },
    {
      icon: <LinkIcon className="w-5 h-5" />,
      title: 'Create Payment Link',
      description: 'Share redeemable token links',
      example: 'Create a link for 5 FLOW',
      gradient: 'from-[#00EF8B] to-[#00D9FF]'
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: 'Mint NFT',
      description: 'Create your digital collectible',
      example: 'Mint an NFT',
      gradient: 'from-orange-500 to-pink-500'
    },
    {
      icon: <DollarSign className="w-5 h-5" />,
      title: 'Register Domain',
      description: 'Reserve a custom domain',
      example: 'Register domain myname.flow',
      gradient: 'from-cyan-500 to-emerald-500'
    },
    {
      icon: <Wallet className="w-5 h-5" />,
      title: 'View NFTs',
      description: 'See your NFT collection',
      example: 'Show my NFTs',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <User className="w-5 h-5" />,
      title: 'Add Contact',
      description: 'Save address to contacts',
      example: 'Add contact Alice at 0x...',
      gradient: 'from-cyan-500 to-blue-500'
    },
    {
      icon: <User className="w-5 h-5" />,
      title: 'View Contacts',
      description: 'See your saved contacts',
      example: 'Show my contacts',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Gift className="w-5 h-5" />,
      title: 'Check Balance',
      description: 'View your wallet balance',
      example: 'What\'s my balance?',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: <ArrowRight className="w-5 h-5" />,
      title: 'Recent Transactions',
      description: 'View transaction history',
      example: 'Show my recent transactions',
      gradient: 'from-indigo-500 to-purple-500'
    },
    {
      icon: <QrCode className="w-5 h-5" />,
      title: 'Generate QR Code',
      description: 'Create QR for wallet address',
      example: 'Generate QR code',
      gradient: 'from-teal-500 to-green-500'
    },
    {
      icon: <Coins className="w-5 h-5" />,
      title: 'Create ERC20 Token',
      description: 'Deploy your own token',
      example: 'Create a token called MyToken with symbol MTK and 1000000 supply',
      gradient: 'from-pink-500 to-rose-500'
    },
    {
      icon: <ArrowRight className="w-5 h-5" />,
      title: 'Cross-Chain Bridge',
      description: 'Bridge tokens across chains',
      example: 'Bridge tokens between networks',
      gradient: 'from-purple-500 to-blue-500'
    }
  ];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 Welcome! I\'m Shotty, your Universal AI Butler\n\nI can help you with blockchain transactions and other capabilities on Flow Network. Click any capability on the left or just tell me what you need!',
      timestamp: new Date(),
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Please use Flow Testnet for testing except swap and cross chain transfers (only mainnet is supported)!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<TransactionConfirmation | null>(null);
  const [showMintModal, setShowMintModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrAddress, setQrAddress] = useState('');
  const [qrLabel, setQrLabel] = useState('');
  const [showCreateTokenModal, setShowCreateTokenModal] = useState(false);
  const [tokenModalData, setTokenModalData] = useState<any>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Expose setInput method to parent components
  useImperativeHandle(ref, () => ({
    setInput: (text: string) => {
      setInput(text);
      // Auto-focus the input
      const inputElement = document.querySelector('textarea');
      if (inputElement) {
        inputElement.focus();
      }
    }
  }));

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSuggestionClick = (example: string) => {
    setInput(example);
    // Auto-focus the input
    const inputElement = document.querySelector('textarea');
    if (inputElement) {
      inputElement.focus();
    }
  };

  /**
   * Resolve domain names in intent before showing confirmation
   * This ensures the confirmation modal shows the actual address
   */
  const resolveDomainsInIntent = async (intent: any): Promise<any> => {
    try {
      // Check if recipient is a domain name
      if (intent.recipient && typeof intent.recipient === 'string' && intent.recipient.endsWith('.flow')) {
        console.log('🔍 Resolving domain in intent:', intent.recipient);
        const domainService = getDomainService();
        const resolved = await domainService.resolveDomain(intent.recipient);

        if (!resolved.resolvedAddress || resolved.resolvedAddress === ethers.ZeroAddress) {
          throw new Error(`Domain "${intent.recipient}" is not registered or has no resolved address`);
        }

        console.log('✅ Domain resolved to:', resolved.resolvedAddress);

        // Store both the original domain and resolved address
        return {
          ...intent,
          recipientDomain: intent.recipient, // Keep original domain for display
          recipient: resolved.resolvedAddress, // Update to resolved address
        };
      }

      return intent;
    } catch (error) {
      console.error('❌ Failed to resolve domain:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      console.log('📤 Sending request to API:', { message: input, address });

      // Call API to parse intent with OpenAI
      const response = await fetch('/api/chat/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          address,
          conversationHistory: messages.slice(-5),
        }),
      });

      console.log('📥 API response status:', response.status);

      const data = await response.json();

      console.log('📥 API response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process message');
      }

      // Add AI response
      const assistantMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Debug log to see what we got from the API
      console.log('🔍 Received intent from API:', data.intent);

      // Handle mint_nft with special modal
      if (data.intent && data.intent.action === 'mint_nft') {
        console.log('🎨 Showing NFT minting modal');
        setShowMintModal(true);
      }
      // Handle generate_qr action
      else if (data.intent && data.intent.action === 'generate_qr') {
        console.log('📱 Showing QR code modal');
        const qrAddr = data.intent.qrData?.address || data.intent.recipient || address;
        const label = data.intent.qrData?.label || '';
        setQrAddress(qrAddr);
        setQrLabel(label);
        setShowQRModal(true);
      }
      // Handle create_erc20 action
      else if (data.intent && data.intent.action === 'create_erc20') {
        console.log('💰 Showing token creation modal');
        console.log('💰 Token data from intent:', JSON.stringify(data.intent.erc20Data, null, 2));
        setTokenModalData(data.intent.erc20Data);
        setShowCreateTokenModal(true);
      }
      // Handle swap actions with modal
      else if (data.intent && (data.intent.action === 'get_swap_quote' || data.intent.action === 'execute_swap')) {
        console.log('🔄 Showing cross-chain bridge modal');
        setShowSwapModal(true);
      }
      // Show confirmation modal if transaction requires confirmation
      else if (data.intent && data.intent.requiresConfirmation) {
        console.log('✅ Checking if ready for confirmation');
        console.log('Intent data:', JSON.stringify(data.intent, null, 2));

        // For transfer_erc20, if amount is missing, execute immediately to get the prompt
        if (data.intent.action === 'transfer_erc20' && !data.intent.erc20Data?.amount) {
          console.log('⚠️ ERC20 transfer missing amount, executing to prompt user');
          await executeIntent(data.intent);
        } else {
          console.log('✅ Showing confirmation modal');

          // Resolve domain names before showing confirmation
          let resolvedIntent = data.intent;
          try {
            resolvedIntent = await resolveDomainsInIntent(data.intent);
          } catch (error) {
            // If domain resolution fails, show error message
            const errorMsg: Message = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role: 'system',
              content: `Error: ${error instanceof Error ? error.message : 'Failed to resolve domain'}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
            setIsProcessing(false);
            return;
          }

          setPendingConfirmation({
            intent: resolvedIntent,
            details: formatTransactionDetails(resolvedIntent),
          });
        }
      } else if (data.intent && data.intent.action && data.intent.action !== 'other') {
        // Execute immediately if no confirmation required (like check_balance, query_nfts, resolve_domain, query_transactions, view_contacts, find_contact, query_erc20_tokens, get_token_info, get_swap_quote, get_swap_status, get_supported_chains, get_chain_tokens)
        const noConfirmActions = ['check_balance', 'query_nfts', 'resolve_domain', 'check_domain_availability', 'query_domains', 'query_transactions', 'view_contacts', 'find_contact', 'query_erc20_tokens', 'get_token_info', 'get_swap_quote', 'get_swap_status', 'get_supported_chains', 'get_chain_tokens', 'batch_transactions', 'view_batch_stats', 'schedule_transaction', 'view_scheduled_transactions', 'cancel_scheduled_transaction', 'execute_scheduled_transaction', 'create_workflow', 'execute_workflow', 'view_workflows', 'lend_tokens', 'borrow_tokens', 'repay_loan', 'withdraw_deposit', 'view_lending_position'];
        if (noConfirmActions.includes(data.intent.action)) {
          console.log('⚡ Executing immediately without confirmation');
          await executeIntent(data.intent);
        } else {
          console.log('⚠️ Intent requires confirmation but flag not set, showing anyway');

          // Resolve domain names before showing confirmation
          let resolvedIntent = data.intent;
          try {
            resolvedIntent = await resolveDomainsInIntent(data.intent);
          } catch (error) {
            // If domain resolution fails, show error message
            const errorMsg: Message = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role: 'system',
              content: `Error: ${error instanceof Error ? error.message : 'Failed to resolve domain'}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
            setIsProcessing(false);
            return;
          }

          setPendingConfirmation({
            intent: resolvedIntent,
            details: formatTransactionDetails(resolvedIntent),
          });
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to process your request'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeIntent = async (intent: any) => {
    let transaction = null;
    let redeemLink = null;
    let statusMessage = '';

    try {
      switch (intent.action) {
        case 'send':
          // Validate all required fields are present
          if (!intent.recipient || !intent.amount || !intent.token) {
            const missingFields = [];
            if (!intent.recipient) missingFields.push('recipient address');
            if (!intent.amount) missingFields.push('amount');
            if (!intent.token) missingFields.push('token type');

            throw new Error(
              `Missing required information: ${missingFields.join(', ')}. Please specify the ${missingFields.join(' and ')} (e.g., "Send 1 FLOW to 0x123...")`
            );
          }

          statusMessage = `Sending ${intent.amount} ${intent.token} to ${intent.recipient}...`;
          addStatusMessage(statusMessage, 'pending');

          console.log('🚀 Calling executeTransaction with intent:', {
            from: address,
            to: intent.recipient,
            amount: intent.amount,
            token: intent.token,
          });

          const txResult = await executeTransaction({
            to: intent.recipient,
            value: intent.amount.toString(),
          });

          transaction = {
            hash: txResult.hash,
            status: 'success' as const,
            details: {
              to: intent.recipient,
              amount: intent.amount,
              token: intent.token,
            },
          };

          addTransactionMessage(
            `✅ Successfully sent ${intent.amount} ${intent.token}!`,
            transaction
          );
          break;

        case 'create_redeem_link':
          if (intent.amount && intent.token) {
            statusMessage = `Creating redeem link for ${intent.amount} ${intent.token}...`;
            addStatusMessage(statusMessage, 'pending');

            const linkData = await createRedeemLink({
              creator: address!,
              amount: intent.amount.toString(),
              token: intent.token,
            });

            redeemLink = {
              url: linkData.url,
              amount: intent.amount.toString(),
              token: intent.token,
              txHash: linkData.txHash,
            };

            addRedeemLinkMessage(
              `✅ Redeem link created successfully!`,
              redeemLink
            );
          }
          break;

        case 'redeem':
          if (intent.redeemLink) {
            statusMessage = 'Redeeming tokens...';
            addStatusMessage(statusMessage, 'pending');

            // Parse the redeem link to extract linkId and secret
            // Expected format: /redeem/{linkId}?secret={secret} or full URL
            let linkId = intent.redeemLink;
            let secret = '';

            try {
              // Try to parse as URL
              const urlMatch = intent.redeemLink.match(/\/redeem\/([^?]+)\?secret=([^&]+)/);
              if (urlMatch) {
                linkId = urlMatch[1];
                secret = urlMatch[2];
              } else {
                // If not a URL, assume format is "linkId secret" or just linkId
                const parts = intent.redeemLink.split(' ');
                if (parts.length >= 2) {
                  linkId = parts[0];
                  secret = parts[1];
                } else {
                  throw new Error('Invalid redeem link format. Please provide the full redeem URL with secret.');
                }
              }

              const txHash = await redeemTokens({
                redeemer: address!,
                linkId: linkId,
                secret: secret,
              });

              transaction = {
                hash: txHash,
                status: 'success' as const,
                details: { action: 'redeem' },
              };

              addTransactionMessage('✅ Tokens redeemed successfully!', transaction);
            } catch (parseError) {
              throw new Error(
                parseError instanceof Error
                  ? parseError.message
                  : 'Please provide a valid redeem link with secret (e.g., the full URL from the payment link)'
              );
            }
          }
          break;

        case 'check_balance':
          // Check wallet balance
          statusMessage = 'Checking balance...';
          addStatusMessage(statusMessage, 'pending');

          try {
            // Use browser provider to get balance
            if (typeof window !== 'undefined' && window.ethereum) {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const balance = await provider.getBalance(address!);
              const formattedBalance = ethers.formatEther(balance);
              const chainName = getChainName(chainId);
              addStatusMessage(`💰 Your balance on ${chainName}: ${formattedBalance} tokens`, 'success');
            } else {
              throw new Error('Wallet not available');
            }
          } catch (error) {
            console.error('Error checking balance:', error);
            throw new Error('Failed to check balance');
          }
          break;

        case 'mint_nft':
        case 'transfer_nft':
        case 'query_nfts':
        case 'register_domain':
        case 'resolve_domain':
        case 'transfer_domain':
        case 'update_domain':
        case 'renew_domain':
        case 'check_domain_availability':
        case 'query_domains':
        case 'query_transactions':
        case 'add_contact':
        case 'view_contacts':
        case 'find_contact':
        case 'update_contact':
        case 'remove_contact':
        case 'transfer_erc20':
        case 'transfer_erc20_ownership':
        case 'query_erc20_tokens':
        case 'get_token_info':
        case 'get_swap_quote':
        case 'execute_swap':
        case 'get_swap_status':
        case 'get_supported_chains':
        case 'get_chain_tokens':
        case 'batch_transactions':
        case 'view_batch_stats':
        case 'execute_batch_send':
        case 'schedule_transaction':
        case 'view_scheduled_transactions':
        case 'cancel_scheduled_transaction':
        case 'execute_scheduled_transaction':
        case 'create_workflow':
        case 'execute_workflow':
        case 'view_workflows':
        case 'lend_tokens':
        case 'borrow_tokens':
        case 'repay_loan':
        case 'withdraw_deposit':
        case 'view_lending_position':
          // Handle NFT, domain, transaction query, contact, ERC20, LiFi swap, and new feature actions
          statusMessage = `Processing ${intent.action.replace(/_/g, ' ')}...`;
          addStatusMessage(statusMessage, 'pending');

          const result = await handleChatAction(intent.action, intent, address!);

          if (result.success) {
            if (result.txHash) {
              transaction = {
                hash: result.txHash,
                status: 'success' as const,
                details: result.data,
              };
              addTransactionMessage(result.message, transaction);
            } else {
              // For query actions without transaction
              if (intent.action === 'query_nfts' && result.data?.nfts) {
                // Add NFT data to message
                addNFTMessage(result.message, result.data.nfts);
              } else {
                addStatusMessage(result.message, 'success');
              }
            }
          } else {
            // Use the detailed message first, fallback to error code
            throw new Error(result.message || result.error || 'Action failed');
          }
          break;
      }
    } catch (error) {
      console.error('Failed to execute intent:', error);

      // Check if user rejected the transaction
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
      const isUserRejection = errorMessage.includes('user rejected') ||
                              errorMessage.includes('User denied') ||
                              errorMessage.includes('ACTION_REJECTED') ||
                              errorMessage.includes('user denied');

      if (isUserRejection) {
        addStatusMessage(
          '❌ Transaction cancelled. You rejected the transaction in your wallet.',
          'error'
        );
      } else {
        addStatusMessage(
          `❌ Failed: ${errorMessage}`,
          'error'
        );
      }
    }
  };

  const addStatusMessage = (content: string, type: 'pending' | 'error' | 'success') => {
    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      transaction: type === 'pending' ? { status: 'pending' } : undefined,
    };
    setMessages((prev) => {
      // If this is an error or success message, remove any pending transaction messages
      if (type === 'error' || type === 'success') {
        const filtered = prev.filter(
          (msg) => !(msg.transaction && msg.transaction.status === 'pending')
        );
        return [...filtered, message];
      }
      return [...prev, message];
    });
  };

  const addTransactionMessage = (content: string, transaction: any) => {
    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      transaction,
    };
    // Remove any pending transaction messages before adding the final result
    setMessages((prev) => {
      const filtered = prev.filter(
        (msg) => !(msg.transaction && msg.transaction.status === 'pending')
      );
      return [...filtered, message];
    });
  };

  const addRedeemLinkMessage = (content: string, redeemLink: any) => {
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message: Message = {
      id: messageId,
      role: 'assistant',
      content,
      timestamp: new Date(),
      redeemLink,
    };
    // Remove any pending transaction messages before adding the final result
    setMessages((prev) => {
      const filtered = prev.filter(
        (msg) => !(msg.transaction && msg.transaction.status === 'pending')
      );
      return [...filtered, message];
    });
  };

  const addNFTMessage = (content: string, nfts: any[]) => {
    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      nftData: { nfts },
    };
    // Remove any pending transaction messages before adding the final result
    setMessages((prev) => {
      const filtered = prev.filter(
        (msg) => !(msg.transaction && msg.transaction.status === 'pending')
      );
      return [...filtered, message];
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Share functions for different platforms
  const shareToWhatsApp = (url: string, amount: string, token: string) => {
    const message = `🎁 I've created a payment link for ${amount} ${token} on Flow Network!\n\nRedeem here: ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareToTwitter = (url: string, amount: string, token: string) => {
    const message = `🎁 Claim ${amount} ${token} on @flow_blockchain!\n\nRedeem here: ${url}\n\n#FlowNetwork #Web3 #Crypto`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareToTelegram = (url: string, amount: string, token: string) => {
    const message = `🎁 I've created a payment link for ${amount} ${token} on Flow Network!\n\nRedeem here: ${url}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`;
    window.open(telegramUrl, '_blank');
  };

  const shareViaEmail = (url: string, amount: string, token: string) => {
    const subject = `Payment Link: ${amount} ${token} on Flow Network`;
    const body = `Hi!\n\nI've created a payment link for you.\n\nAmount: ${amount} ${token}\nRedeem URL: ${url}\n\nClick the link to claim your tokens on Flow Network.\n\nBest regards`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const formatTransactionDetails = (intent: any): string => {
    // Helper to format recipient display (show domain if available, otherwise address)
    const formatRecipient = (recipient: string, domain?: string) => {
      if (domain) {
        return `${domain} (${recipient.slice(0, 6)}...${recipient.slice(-4)})`;
      }
      return recipient;
    };

    switch (intent.action) {
      case 'send':
        return `Send ${intent.amount} ${intent.token} to ${formatRecipient(intent.recipient, intent.recipientDomain)}`;
      case 'create_redeem_link':
        return `Create redeem link for ${intent.amount} ${intent.token}`;
      case 'redeem':
        return `Redeem tokens from link`;
      case 'mint_nft':
        return `Mint NFT: ${intent.nftData?.name || 'New NFT'}`;
      case 'transfer_nft':
        return `Transfer NFT #${intent.nftData?.tokenId} to ${formatRecipient(intent.recipient, intent.recipientDomain)}`;
      case 'register_domain':
        return `Register domain: ${intent.domainData?.domainName}`;
      case 'transfer_domain':
        return `Transfer domain "${intent.domainData?.domainName}" to ${formatRecipient(intent.recipient, intent.recipientDomain)}`;
      case 'update_domain':
        return `Update domain "${intent.domainData?.domainName}" to point to ${intent.domainData?.resolvedAddress || intent.recipient}`;
      case 'renew_domain':
        return `Renew domain "${intent.domainData?.domainName}" for 1 year`;
      case 'add_contact':
        return `Add contact "${intent.contactData?.name}" at ${intent.contactData?.address}`;
      case 'update_contact':
        return `Update contact "${intent.contactData?.name}" to ${intent.contactData?.address}`;
      case 'remove_contact':
        return `Remove contact "${intent.contactData?.name}"`;
      case 'transfer_erc20':
        const tokenAddr = intent.erc20Data?.contractAddress;
        const shortAddr = tokenAddr ? `${tokenAddr.slice(0, 6)}...${tokenAddr.slice(-4)}` : 'token';
        if (intent.erc20Data?.amount) {
          return `Transfer ${intent.erc20Data.amount} tokens from ${shortAddr} to ${formatRecipient(intent.recipient, intent.recipientDomain)}`;
        }
        return `Transfer tokens from ${shortAddr} to ${formatRecipient(intent.recipient, intent.recipientDomain)}`;
      case 'transfer_erc20_ownership':
        const ownershipTokenAddr = intent.erc20Data?.contractAddress;
        const shortOwnershipAddr = ownershipTokenAddr ? `${ownershipTokenAddr.slice(0, 6)}...${ownershipTokenAddr.slice(-4)}` : 'token';
        return `Transfer ownership of ${shortOwnershipAddr} to ${intent.erc20Data?.newOwner}`;
      case 'execute_swap':
        return `Bridge ${intent.swapData?.amount} ${intent.swapData?.fromToken} from ${intent.swapData?.fromChain} to ${intent.swapData?.toChain}`;
      default:
        return 'Execute transaction';
    }
  };

  const handleMintNFT = async (data: {
    name: string;
    description: string;
    imageFile: File | null;
    attributes: Array<{ trait_type: string; value: string }>;
  }) => {
    try {
      addStatusMessage('Uploading NFT to IPFS...', 'pending');

      let metadataUri: string;

      if (data.imageFile) {
        // Upload image and metadata to IPFS
        const result = await uploadNFTWithImage(
          data.imageFile,
          data.name,
          data.description,
          data.attributes
        );
        metadataUri = result.metadataUri;

        addStatusMessage('NFT uploaded to IPFS successfully!', 'success');
      } else {
        // No image, just upload metadata with placeholder
        const metadata = createNFTMetadata(
          data.name,
          data.description,
          'https://via.placeholder.com/400',
          data.attributes
        );
        metadataUri = await uploadMetadata(metadata);
      }

      // Now mint the NFT
      addStatusMessage('Minting NFT...', 'pending');

      const intent = {
        action: 'mint_nft',
        nftData: {
          name: data.name,
          description: data.description,
          uri: metadataUri,
        },
      };

      const result = await handleChatAction(intent.action, intent, address!);

      if (result.success) {
        if (result.txHash) {
          const transaction = {
            hash: result.txHash,
            status: 'success' as const,
            details: result.data,
          };
          addTransactionMessage(result.message, transaction);
        } else {
          addStatusMessage(result.message, 'success');
        }
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (error) {
      console.error('Failed to mint NFT:', error);
      addStatusMessage(
        `❌ Failed to mint NFT: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
      throw error;
    }
  };

  const handleSwap = async (swapData: {
    fromChain: string;
    toChain: string;
    fromToken: string;
    toToken: string;
    amount: string;
    quote: any;
  }) => {
    if (!window.ethereum) {
      addStatusMessage('❌ No wallet found. Please install MetaMask.', 'error');
      throw new Error('No wallet found');
    }

    try {
      addStatusMessage('Preparing cross-chain bridge...', 'pending');

      const { quote } = swapData;

      // Check if we have transaction request data
      if (!quote.transactionRequest) {
        throw new Error('Invalid quote: missing transaction request');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Check if approval is needed (for ERC20 tokens)
      const isNativeToken = quote.action?.fromToken?.address === '0x0000000000000000000000000000000000000000';

      if (!isNativeToken && quote.estimate?.approvalAddress) {
        addStatusMessage('Checking token approval...', 'pending');

        const tokenContract = new ethers.Contract(
          quote.action.fromToken.address,
          ['function allowance(address owner, address spender) view returns (uint256)', 'function approve(address spender, uint256 amount) returns (bool)'],
          signer
        );

        const allowance = await tokenContract.allowance(address, quote.estimate.approvalAddress);
        const requiredAmount = BigInt(quote.estimate.fromAmount);

        if (allowance < requiredAmount) {
          addStatusMessage('Approving tokens...', 'pending');

          const approveTx = await tokenContract.approve(
            quote.estimate.approvalAddress,
            requiredAmount
          );

          addStatusMessage('Waiting for approval confirmation...', 'pending');
          await approveTx.wait();
          addStatusMessage('✅ Tokens approved', 'success');
        }
      }

      // Execute the swap transaction
      addStatusMessage('Executing cross-chain bridge...', 'pending');

      const tx = await signer.sendTransaction({
        to: quote.transactionRequest.to,
        data: quote.transactionRequest.data,
        value: quote.transactionRequest.value || '0',
        gasLimit: quote.transactionRequest.gasLimit,
      });

      addStatusMessage('Waiting for transaction confirmation...', 'pending');
      const receipt = await tx.wait();

      const transaction = {
        hash: txHash || "0x",
        status: 'success' as const,
        details: {
          fromChain: swapData.fromChain,
          toChain: swapData.toChain,
          fromToken: swapData.fromToken,
          toToken: swapData.toToken,
          amount: swapData.amount,
          bridge: quote.tool,
        },
      };

      addTransactionMessage(
        `✅ Bridge transaction submitted!\n\nBridging ${swapData.amount} ${swapData.fromToken} from ${swapData.fromChain} to ${swapData.toChain}.\n\nBridge: ${quote.tool}\nEst. time: ~${Math.ceil(quote.estimate.executionDuration / 60)} minutes`,
        transaction
      );
    } catch (error: any) {
      console.error('Failed to execute swap:', error);

      let errorMessage = 'Failed to execute bridge';
      if (error.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message) {
        errorMessage = error.message;
      }

      addStatusMessage(`❌ ${errorMessage}`, 'error');
      throw error;
    }
  };

  const handleConfirmTransaction = async () => {
    if (!pendingConfirmation) return;

    setPendingConfirmation(null);
    setIsProcessing(true);

    try {
      await executeIntent(pendingConfirmation.intent);
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelTransaction = () => {
    setPendingConfirmation(null);

    const cancelMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'system',
      content: 'Transaction cancelled by user.',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, cancelMessage]);
  };

  // Render formatted message content
  const renderMessageContent = (message: Message) => {
    const content = message.content;

    // Check if we have NFT data with images
    if (message.nftData?.nfts) {
      return renderNFTGallery(message.nftData.nfts, content);
    }

    // Check if content contains transaction list (starts with "Your X most recent")
    if (content.includes('most recent transaction')) {
      return renderTransactionList(content);
    }

    // Check if content contains NFT list (legacy)
    if (content.includes('NFT') && content.includes('•')) {
      return renderNFTList(content);
    }

    // Check if content contains domain info
    if (content.includes('Domain:') && content.includes('Points to:')) {
      return renderDomainInfo(content);
    }

    // Default: simple text rendering
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
  };

  // Render transaction list with proper formatting
  const renderTransactionList = (content: string) => {
    const lines = content.split('\n');
    const header = lines[0];
    const transactions: string[] = [];
    let currentTx: string[] = [];

    // Parse transactions
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        if (currentTx.length > 0) {
          transactions.push(currentTx.join('\n'));
          currentTx = [];
        }
        continue;
      }
      if (/^\d+\./.test(line)) {
        if (currentTx.length > 0) {
          transactions.push(currentTx.join('\n'));
        }
        currentTx = [line];
      } else {
        currentTx.push(line);
      }
    }
    if (currentTx.length > 0) {
      transactions.push(currentTx.join('\n'));
    }

    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-300 mb-3">{header}</p>
        <div className="space-y-3">
          {transactions.map((tx, idx) => {
            const txLines = tx.split('\n');
            const firstLine = txLines[0];
            const match = firstLine.match(/(\d+)\.\s*(.+)/);

            if (!match) return null;

            const num = match[1];
            const statusAndAmount = match[2];

            // Extract other details
            const toFromLine = txLines.find(l => l.includes('To:') || l.includes('From:'));
            const functionLine = txLines.find(l => l.includes('•') && !l.includes('View'));
            const txHashLine = txLines.find(l => l.includes('Tx:'));
            const viewLine = txLines.find(l => l.includes('View:'));

            return (
              <div
                key={idx}
                className="bg-[#2A2A2A]/30 rounded-lg p-3 border border-[#3A3A3A]/50 hover:border-[#DD44B9]/30 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-white">{statusAndAmount}</span>
                  <span className="text-xs text-gray-500">#{num}</span>
                </div>

                {toFromLine && (
                  <p className="text-xs text-gray-400 mb-1">{toFromLine.trim()}</p>
                )}

                {functionLine && (
                  <p className="text-xs text-gray-500 mb-2">{functionLine.trim()}</p>
                )}

                {txHashLine && (
                  <p className="text-xs text-gray-500 font-mono mb-2">{txHashLine.trim()}</p>
                )}

                {viewLine && (
                  <a
                    href={viewLine.replace('View:', '').trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#DD44B9] hover:text-[#00D9FF] flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on Explorer
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render NFT gallery with images
  const renderNFTGallery = (nfts: any[], header: string) => {
    const getImageUrl = (nft: any) => {
      if (!nft.metadata?.image) return null;
      const imageUrl = nft.metadata.image;
      // Convert IPFS URLs to gateway URLs
      if (imageUrl.startsWith('ipfs://')) {
        const hash = imageUrl.replace('ipfs://', '');
        const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';
        return `https://${gateway}/ipfs/${hash}`;
      }
      return imageUrl;
    };

    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-gray-300">{header}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {nfts.map((nft, idx) => {
            const imageUrl = getImageUrl(nft);
            const name = nft.metadata?.name || `NFT #${nft.tokenId}`;
            const description = nft.metadata?.description;

            return (
              <div
                key={idx}
                className="group bg-[#2A2A2A]/30 rounded-xl border border-[#3A3A3A]/50 overflow-hidden hover:border-purple-500/50 transition-all hover:scale-105"
              >
                {/* Image */}
                {imageUrl ? (
                  <div className="aspect-square bg-[#1A1A1A] relative overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=NFT';
                      }}
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-purple-400/50" />
                  </div>
                )}

                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-white mb-1 truncate">{name}</h3>
                  <p className="text-xs text-gray-500">Token ID: #{nft.tokenId}</p>
                  {description && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2">{description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render NFT list with proper formatting (legacy fallback)
  const renderNFTList = (content: string) => {
    const lines = content.split('\n');
    const header = lines.find(l => l.includes('NFT')) || lines[0];
    const nftLines = lines.filter(l => l.startsWith('•'));

    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-300 mb-3">{header}</p>
        <div className="space-y-2">
          {nftLines.map((nft, idx) => (
            <div
              key={idx}
              className="bg-[#2A2A2A]/30 rounded-lg p-3 border border-[#3A3A3A]/50 hover:border-purple-500/30 transition-all"
            >
              <p className="text-sm text-gray-200">{nft.replace('•', '').trim()}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render domain info with proper formatting
  const renderDomainInfo = (content: string) => {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);

    return (
      <div className="bg-[#2A2A2A]/30 rounded-lg p-4 border border-[#3A3A3A]/50 space-y-2">
        {lines.map((line, idx) => {
          const [label, value] = line.split(':').map(s => s.trim());
          return (
            <div key={idx} className="flex justify-between items-start gap-3">
              <span className="text-xs text-gray-500 font-medium">{label}:</span>
              <span className="text-sm text-gray-200 font-mono text-right">{value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]/50 backdrop-blur-xl bg-[#1E1E1E]/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] rounded-lg blur-sm opacity-75"></div>
            <div className="relative w-10 h-10 bg-[#0D0D0D] rounded-lg flex items-center justify-center border border-[#00EF8B]/30">
              <FlowIcon size={24} />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              AI Butler
              <Sparkles className="w-4 h-4 text-[#DD44B9]" />
            </h2>
            <p className="text-xs text-gray-500">Universal Trading Assistant</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* Wallet Connect Button */}
          {!isConnected ? (
            <button
              onClick={connectWalletHook}
              className="px-4 py-2 bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] hover:from-[#00D97F] hover:to-[#00C4EA] text-white font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          ) : (
            <div className="flex flex-col items-end gap-2">
              <div className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg">
                <div className="text-xs text-gray-400">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">{getChainName(chainId)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-[#2A2A2A] scrollbar-track-transparent" style={{ minHeight: '500px' }}>
        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-[#DD44B9] to-[#00D9FF]'
                  : message.role === 'system'
                  ? 'bg-red-500/20 border border-red-500/30'
                  : 'bg-[#0D0D0D] border border-[#00EF8B]/30'
              }`}>
                {message.role === 'user' ? (
                  <img
                    src={getUserAvatar(address)}
                    alt="User avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                      const userIcon = document.createElement('div');
                      userIcon.className = 'w-full h-full flex items-center justify-center';
                      userIcon.innerHTML = '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                      (e.target as HTMLImageElement).parentNode?.appendChild(userIcon);
                    }}
                  />
                ) : message.role === 'system' ? (
                  <XCircle className="w-4 h-4 text-red-400" />
                ) : (
                  <FlowIcon size={16} />
                )}
              </div>

              {/* Message Content */}
              <div className={`flex-1 max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div
                  className={`rounded-2xl px-5 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-[#DD44B9] to-[#00D9FF] text-white'
                      : message.role === 'system'
                      ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                      : 'bg-[#1E1E1E]/80 backdrop-blur-sm border border-[#2A2A2A]/50 text-gray-200'
                  }`}
                >
                  {/* Render formatted message content */}
                  {renderMessageContent(message)}

                  {/* Transaction Status */}
                  {message.transaction && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2 mb-3">
                        {message.transaction.status === 'pending' && (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                            <span className="text-xs font-medium text-yellow-400">Processing...</span>
                          </>
                        )}
                        {message.transaction.status === 'success' && (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-xs font-medium text-green-400">Success</span>
                          </>
                        )}
                        {message.transaction.status === 'failed' && (
                          <>
                            <XCircle className="w-4 h-4 text-red-400" />
                            <span className="text-xs font-medium text-red-400">Failed</span>
                          </>
                        )}
                      </div>
                      {message.transaction.hash && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">Tx Hash:</span>
                            <code className="font-mono text-gray-400 bg-black/20 px-2 py-1 rounded">
                              {message.transaction.hash.slice(0, 8)}...{message.transaction.hash.slice(-6)}
                            </code>
                            <button
                              onClick={() => copyToClipboard(message.transaction!.hash!)}
                              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                              title="Copy hash"
                            >
                              <Copy className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                          <a
                            href={getExplorerUrl(message.transaction.hash, chainId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#DD44B9] hover:text-[#00D9FF] transition-colors font-medium"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View on Explorer</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Redeem Link */}
                  {message.redeemLink && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2 mb-3">
                        <LinkIcon className="w-4 h-4 text-[#DD44B9]" />
                        <span className="text-xs font-medium text-[#DD44B9]">Payment Link</span>
                      </div>
                      <div className="bg-black/30 rounded-xl p-3 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Amount:</span>
                          <span className="font-semibold text-white">
                            {message.redeemLink.amount} {message.redeemLink.token}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={message.redeemLink.url}
                            readOnly
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono"
                          />
                          <button
                            onClick={() => copyToClipboard(message.redeemLink!.url)}
                            className="px-4 py-2 bg-[#DD44B9] hover:bg-[#DD44B9]/80 rounded-lg text-xs text-white font-medium transition-colors"
                          >
                            Copy
                          </button>
                        </div>

                        {/* Transaction Hash Link */}
                        {message.redeemLink.txHash && (
                          <div className="pt-2 border-t border-white/5">
                            <p className="text-xs text-gray-500 mb-2">Creation Transaction</p>
                            <a
                              href={getExplorerUrl(message.redeemLink.txHash, chainId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-[#00EF8B] hover:text-[#00D9FF] transition-colors"
                            >
                              <span className="font-mono">{message.redeemLink.txHash.slice(0, 10)}...{message.redeemLink.txHash.slice(-8)}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {/* Share Options - Always visible */}
                        <div className="pt-3 border-t border-white/5">
                          <div className="flex items-center gap-2 mb-2">
                            <Share2 className="w-3.5 h-3.5 text-[#00EF8B]" />
                            <span className="text-xs font-medium text-[#00EF8B]">Share Link</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {/* WhatsApp */}
                            <button
                              onClick={() => shareToWhatsApp(message.redeemLink!.url, message.redeemLink!.amount, message.redeemLink!.token)}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 hover:border-[#25D366]/50 rounded-lg transition-all group"
                            >
                              <MessageCircle className="w-4 h-4 text-[#25D366]" />
                              <span className="text-xs text-[#25D366] font-medium">WhatsApp</span>
                            </button>

                            {/* X (Twitter) */}
                            <button
                              onClick={() => shareToTwitter(message.redeemLink!.url, message.redeemLink!.amount, message.redeemLink!.token)}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg transition-all group"
                            >
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                              </svg>
                              <span className="text-xs text-white font-medium">X</span>
                            </button>

                            {/* Telegram */}
                            <button
                              onClick={() => shareToTelegram(message.redeemLink!.url, message.redeemLink!.amount, message.redeemLink!.token)}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 hover:border-[#0088cc]/50 rounded-lg transition-all group"
                            >
                              <svg className="w-4 h-4 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                              </svg>
                              <span className="text-xs text-[#0088cc] font-medium">Telegram</span>
                            </button>

                            {/* Email */}
                            <button
                              onClick={() => shareViaEmail(message.redeemLink!.url, message.redeemLink!.amount, message.redeemLink!.token)}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/30 hover:border-gray-500/50 rounded-lg transition-all group"
                            >
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-400 font-medium">Email</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-gray-600 px-2">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Suggestion Cards - Hidden, moved to sidebar */}
          </div>
        ))}

        {isProcessing && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#3A3A3A] flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#DD44B9]" />
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-sm border border-[#2A2A2A]/50 rounded-2xl px-5 py-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#DD44B9]" />
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#2A2A2A]/50 backdrop-blur-xl bg-[#1E1E1E]/60">
        {!isConnected ? (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-center">
            <p className="text-sm text-yellow-400 font-medium">
              Connect your wallet above to start
            </p>
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your request... (e.g., 'Send 0.1 ETH to 0x123...')"
                rows={1}
                className="w-full bg-[#161616]/80 border border-[#2A2A2A] rounded-2xl px-5 py-4 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-[#DD44B9] focus:ring-2 focus:ring-[#DD44B9]/20 transition-all resize-none"
                style={{ minHeight: '56px', maxHeight: '120px' }}
                disabled={isProcessing}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isProcessing}
              className={`relative p-4 rounded-2xl transition-all flex-shrink-0 ${
                !input.trim() || isProcessing
                  ? 'bg-[#2A2A2A] text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#DD44B9] to-[#00D9FF] text-white hover:shadow-lg hover:shadow-[#DD44B9]/25 hover:scale-105'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {pendingConfirmation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] rounded-3xl border border-[#2A2A2A] p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-[#00EF8B] to-[#00D9FF] rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Confirm Transaction</h3>
                <p className="text-xs text-gray-500">Review details before proceeding</p>
              </div>
            </div>

            <div className="bg-[#161616]/80 rounded-2xl p-5 mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Action</span>
                <span className="text-sm text-white font-semibold">
                  {pendingConfirmation.intent.action === 'send' && '💸 Send Tokens'}
                  {pendingConfirmation.intent.action === 'create_redeem_link' && '🔗 Create Payment Link'}
                  {pendingConfirmation.intent.action === 'redeem' && '🎁 Redeem Tokens'}
                  {pendingConfirmation.intent.action === 'transfer_erc20' && '🪙 Transfer ERC20 Tokens'}
                  {pendingConfirmation.intent.action === 'transfer_erc20_ownership' && '👑 Transfer Token Ownership'}
                  {pendingConfirmation.intent.action === 'mint_nft' && '🎨 Mint NFT'}
                  {pendingConfirmation.intent.action === 'transfer_nft' && '🖼️ Transfer NFT'}
                  {pendingConfirmation.intent.action === 'register_domain' && '🌐 Register Domain'}
                  {pendingConfirmation.intent.action === 'transfer_domain' && '📋 Transfer Domain'}
                  {pendingConfirmation.intent.action === 'update_domain' && '✏️ Update Domain'}
                  {pendingConfirmation.intent.action === 'renew_domain' && '🔄 Renew Domain'}
                  {pendingConfirmation.intent.action === 'add_contact' && '➕ Add Contact'}
                  {pendingConfirmation.intent.action === 'update_contact' && '✏️ Update Contact'}
                  {pendingConfirmation.intent.action === 'remove_contact' && '➖ Remove Contact'}
                  {pendingConfirmation.intent.action === 'execute_swap' && '🔄 Execute Cross-Chain Bridge'}
                </span>
              </div>

              {(pendingConfirmation.intent.amount || pendingConfirmation.intent.erc20Data?.amount) && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Amount</span>
                  <span className="text-base text-white font-bold">
                    {pendingConfirmation.intent.amount || pendingConfirmation.intent.erc20Data?.amount}
                    {pendingConfirmation.intent.token && ` ${pendingConfirmation.intent.token}`}
                  </span>
                </div>
              )}

              {pendingConfirmation.intent.recipient && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Recipient</span>
                  <code className="text-sm text-white font-mono bg-black/30 px-3 py-1 rounded-lg">
                    {pendingConfirmation.intent.recipient.slice(0, 6)}...
                    {pendingConfirmation.intent.recipient.slice(-4)}
                  </code>
                </div>
              )}

              <div className="pt-3 border-t border-[#2A2A2A] space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">From</span>
                  <span className="text-blue-400 font-medium">{getChainName(chainId)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">To</span>
                  <span className="text-[#00EF8B] font-medium">Flow EVM Testnet</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <p className="text-xs text-emerald-400 leading-relaxed">
                  ⚡ Transaction will be executed on Flow EVM blockchain.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelTransaction}
                className="flex-1 px-6 py-3.5 bg-[#2A2A2A] hover:bg-[#333333] rounded-xl text-white font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransaction}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] hover:shadow-lg hover:shadow-[#00EF8B]/25 rounded-xl text-black font-semibold transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mint NFT Modal */}
      <MintNFTModal
        isOpen={showMintModal}
        onClose={() => setShowMintModal(false)}
        onMint={handleMintNFT}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        address={qrAddress}
        label={qrLabel}
      />

      {/* Create Token Modal */}
      <CreateTokenModal
        isOpen={showCreateTokenModal}
        onClose={() => setShowCreateTokenModal(false)}
        initialData={tokenModalData}
        onSuccess={(tokenAddress, txHash, tokenDetails) => {
          const successMessage: Message = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: 'assistant',
            content: `Successfully created ERC20 token "${tokenDetails.name}" (${tokenDetails.symbol})!\n\nToken Address: ${tokenAddress}\n\nYou can now:\n• Transfer tokens to others\n• Transfer ownership\n• View token details`,
            timestamp: new Date(),
            tokenData: {
              tokenAddress,
              txHash,
              name: tokenDetails.name,
              symbol: tokenDetails.symbol,
            },
          };
          setMessages((prev) => [...prev, successMessage]);
        }}
      />

      {/* Cross-Chain Swap Modal */}
      <SwapModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        onSwap={handleSwap}
        userAddress={address!}
      />
    </div>
  );
});

export default ChatTransactionInterface;

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parseTransactionIntent } from '@/services/ai/intentParser';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { message, address, conversationHistory } = await req.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet not connected' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message' },
        { status: 400 }
      );
    }

    // Build conversation context for OpenAI
    const systemPrompt = `You are a helpful blockchain transaction assistant for Flow EVM.

FLOW EVM BLOCKCHAIN:
- Network: Flow EVM Testnet (Chain ID: 545) or Flow EVM Mainnet (Chain ID: 747)
- Native Token: FLOW
- Users interact directly with Flow EVM blockchain for all transactions

HOW IT WORKS:
1. User connects wallet to Flow EVM Testnet
2. All transactions are executed directly on Flow EVM
3. No cross-chain bridging - pure Flow EVM operations

You help users with:
1. TOKENS: Send tokens, create redeem links, redeem tokens, check balances
2. NFTs: Mint NFTs, transfer NFTs, query NFTs
3. DOMAINS: Register domain names on any chain, resolve domains, transfer domains
4. TRANSACTIONS: View recent transaction history
5. CONTACTS: Add, view, find, update, and remove contacts from address book
6. ERC20 TOKENS: Create custom ERC20 tokens, transfer tokens, transfer ownership, query tokens

SUPPORTED ACTIONS:
- action: "send" | "create_redeem_link" | "redeem" | "check_balance" | "mint_nft" | "transfer_nft" | "query_nfts" | "register_domain" | "resolve_domain" | "transfer_domain" | "update_domain" | "renew_domain" | "check_domain_availability" | "query_domains" | "query_transactions" | "add_contact" | "view_contacts" | "find_contact" | "update_contact" | "remove_contact" | "generate_qr" | "create_erc20" | "transfer_erc20" | "transfer_erc20_ownership" | "query_erc20_tokens" | "get_token_info" | "other"

TOKEN ACTIONS:
- amount: number (if applicable)
- token: string - Extract the token symbol. If no token is specified, default to "FLOW" (Flow EVM native token)
- recipient: address string ON Flow EVM - MUST be a valid Ethereum address starting with 0x
- redeemLink: URL string (for redeem actions)

CRITICAL: DETECTING ERC20 TOKEN TRANSFERS vs NATIVE TOKEN SENDS
- If message contains "token 0x[address]" or "ERC20 0x[address]" → use "transfer_erc20" action
- If message contains "send FLOW" or "send ETH" or just "send [amount] to [address]" → use "send" action
- Pattern: "transfer token 0x..." or "send token 0x..." or "transfer ERC20 0x..." → ALWAYS "transfer_erc20"
- The 0x address after "token" is the CONTRACT ADDRESS, not the recipient
- Example: "Transfer token 0xABC... to 0x123..." means transfer FROM token contract 0xABC to recipient 0x123

NFT ACTIONS:
- mint_nft: Create new NFT with name, description, image
  - CRITICAL: ALWAYS set action to "mint_nft" when user wants to mint/create an NFT
  - This will open a modal for the user to provide details
  - Extract nftData.name and nftData.description ONLY if explicitly provided in message
  - Look for phrases like "called [name]", "named [name]", "with description [desc]"
  - Example: "Mint an NFT called 'Sunset' with description 'Beautiful sunset photo'"
  - If name or description missing, still set action to "mint_nft" (modal will handle it)
  - Extract: nftData.name (optional), nftData.description (optional), nftData.image (optional)
- transfer_nft: Transfer NFT to another address
  - Extract: nftData.tokenId (extract number after "NFT" or "#"), recipient (extract 0x address after "to")
  - Keywords: "transfer", "send", "give", followed by "NFT" or "nft"
  - Examples:
    * "Transfer NFT #6 to 0x123..." → tokenId=6, recipient="0x123..."
    * "I would like to transfer my NFT #6 to 0x123..." → tokenId=6, recipient="0x123..."
    * "Send NFT 10 to alice.flow" → tokenId=10, recipient="alice.flow"
  - CRITICAL: Look for ANY number near "NFT" or "#" as the tokenId
  - CRITICAL: Look for 0x address or .flow domain after "to" as the recipient
- query_nfts: Show user's NFTs (no extraction needed)

DOMAIN ACTIONS:
- register_domain: Reserve domain name on Flow EVM
  - Extract: domainData.domainName, domainData.chainId (default 545), domainData.resolvedAddress (default to user's address)
  - CRITICAL: Extract domain name EXACTLY as user typed it (preserve case) - do NOT lowercase it
  - Validation happens separately, just extract the exact text
- resolve_domain: Lookup domain to find address
  - Extract: domainData.domainName (preserve case)
- transfer_domain: Transfer domain ownership (changes who owns it, NOT what address it points to)
  - Extract: domainData.domainName (preserve case), recipient address
- update_domain: Update what address a domain points to (domain resolution)
  - Extract: domainData.domainName, domainData.resolvedAddress OR recipient (new address to point to)
  - Keywords: "update", "change", "point to", "resolve to"
  - Example: "Update alice.flow to point to 0x123..."
  - Requires confirmation
- renew_domain: Extend domain registration for another year (365 days)
  - Extract: domainData.domainName
  - Keywords: "renew", "extend", "refresh"
  - Example: "Renew domain alice.flow"
  - Requires confirmation (costs 0.01 FLOW registration fee)
- check_domain_availability: Check if a domain is available for registration
  - Extract: domainData.domainName
  - Keywords: "is available", "is taken", "check", "available"
  - Example: "Is bitcoin.flow available?"
  - No confirmation needed
- query_domains: Show all domains owned by the user
  - Keywords: "show my domains", "list my domains", "what domains do I own"
  - No extraction needed, no confirmation needed

TRANSACTION ACTIONS:
- query_transactions: Show user's recent transaction history
  - Extract: transactionData.limit (default 10, max 20) from phrases like "last 5 transactions"
  - No confirmation needed

CONTACT ACTIONS:
- add_contact: Save a contact to address book
  - Extract: contactData.name (REQUIRED), contactData.address (REQUIRED), contactData.notes (optional)
  - Example: "Add contact Alice at 0x123..."
  - Requires confirmation
- view_contacts: Show all saved contacts
  - No extraction needed, no confirmation needed
- find_contact: Search for a specific contact
  - Extract: contactData.name (REQUIRED - extract the name from the user's query)
  - Keywords: "find", "search", "look for", "show me", "get"
  - Examples:
    * "Find Sonali from my contacts" → name="Sonali"
    * "Search for Alice" → name="Alice"
    * "Show me Bob's contact" → name="Bob"
    * "Find contact named Charlie" → name="Charlie"
  - CRITICAL: Extract ANY name mentioned in the query as contactData.name
  - No confirmation needed
- update_contact: Update existing contact
  - Extract: contactData.name (REQUIRED), contactData.address (REQUIRED), contactData.notes (optional)
  - Requires confirmation
- remove_contact: Delete a contact
  - Extract: contactData.name (REQUIRED)
  - Requires confirmation

QR CODE ACTIONS:
- generate_qr: Generate QR code for an address
  - Extract: qrData.address (defaults to user's address if not provided), qrData.label (optional)
  - Keywords: "generate qr", "create qr", "show qr", "qr code"
  - Example: "Generate QR code" or "Generate QR code for 0x123..."
  - No confirmation needed (informational)

ERC20 TOKEN ACTIONS:
- create_erc20: Create a custom ERC20 token
  - Extract: erc20Data.tokenName (REQUIRED), erc20Data.tokenSymbol (REQUIRED), erc20Data.totalSupply (REQUIRED), erc20Data.decimals (optional, default 18)
  - Keywords: "create token", "deploy token", "make token", "launch token"
  - Example input: "Create a token called MyToken with symbol MTK and 1000000 supply"
  - Example extraction patterns:
    * Token name: Look for "called [NAME]", "named [NAME]", before "with symbol"
    * Token symbol: Look for "symbol [SYMBOL]", "ticker [SYMBOL]" - extract uppercase letters/numbers
    * Total supply: Look for numbers before "supply" or "tokens"
  - Example response for above: Extract tokenName="MyToken", tokenSymbol="MTK", totalSupply=1000000
  - Requires confirmation (this will deploy a smart contract)
  - CRITICAL: ALWAYS set action to "create_erc20" when user wants to create/deploy an ERC20 token
  - CRITICAL: Extract values EXACTLY as provided by the user, don't use default test values
- transfer_erc20: Transfer ERC20 tokens to another address
  - Extract: erc20Data.contractAddress (REQUIRED - token contract address), erc20Data.amount (optional), recipient (REQUIRED - destination address)
  - Keywords: "transfer token 0x", "send token 0x", "transfer erc20", "transfer ERC20 token"
  - Example inputs and extractions:
    * "Transfer 100 ERC20 token 0x45BD... to 0xa4bD..." → contractAddress="0x45BD...", recipient="0xa4bD...", amount=100
    * "Transfer ERC20 token 0x45BD... to 0xa4bD..." → contractAddress="0x45BD...", recipient="0xa4bD...", amount=null
    * "Send 100 token 0x123... to 0x456..." → contractAddress="0x123...", amount=100, recipient="0x456..."
    * "Transfer token 0xABC... to alice.flow" → contractAddress="0xABC...", recipient="alice.flow", amount=null
  - CRITICAL DETECTION RULES:
    * If message contains phrase "token 0x" or "ERC20 0x" or "ERC20 token 0x" → MUST use action "transfer_erc20"
    * The 0x address IMMEDIATELY after "token" or "ERC20" is the CONTRACT ADDRESS (goes in erc20Data.contractAddress)
    * The 0x address after "to" is the RECIPIENT ADDRESS (goes in recipient field)
    * DO NOT confuse with "send" action which is for native tokens (FLOW, ETH, MATIC)
  - If amount not specified, handler will prompt user for amount
  - Requires confirmation
- transfer_erc20_ownership: Transfer ownership of an ERC20 token contract
  - Extract: erc20Data.contractAddress (REQUIRED), erc20Data.newOwner (REQUIRED)
  - Example: "Transfer ownership of token 0x123... to 0x456..."
  - Requires confirmation
- query_erc20_tokens: Show user's created/owned ERC20 tokens
  - Keywords: "show my tokens", "list my tokens", "what tokens did I create"
  - No extraction needed, no confirmation needed
- get_token_info: Get details of a specific ERC20 token by address
  - Extract: erc20Data.contractAddress (REQUIRED - must be valid 0x address)
  - Keywords: "show token details", "token info", "token details of", "details for token"
  - Example: "Show token details of 0x123..." or "Get info for token 0x456..."
  - No confirmation needed (read-only query)

IMPORTANT FOR SEND ACTIONS:
- ALWAYS set requiresConfirmation=true for send actions
- All transactions execute directly on Flow EVM
- Example response: "I'll send [amount] [token] on Flow EVM to [recipient]."
- Extract the amount as a number

CRITICAL VALIDATION RULES:
- For "send" actions: recipient address is REQUIRED. If not provided in the message, set action to "other" and ask the user to provide it.
- For "create_redeem_link" actions: amount is REQUIRED. If token is not specified, default to "FLOW" (Flow EVM native token)
- For "redeem" actions: redeemLink is REQUIRED
- If required information is missing, set requiresConfirmation=false and ask the user for the missing information
- DEFAULT TOKEN: When no token is specified for any action, use "FLOW" as the default token symbol

RESPONSE STYLE:
- DO NOT ask for confirmation in your response. The UI will show a confirmation modal automatically.
- For mint_nft: Say "I'll open the NFT minting form for you" - a modal will appear with a form
- Acknowledge transactions on Flow EVM: "I'll send [amount] [token] on Flow EVM to [recipient]"
- CRITICAL: Always set requiresConfirmation=true for send, create_redeem_link, and redeem actions
- Only set requiresConfirmation=false for informational queries (check_balance, query_nfts, resolve_domain, check_domain_availability, query_domains, query_transactions, view_contacts, find_contact, other)
- The user will see all transaction details in a confirmation modal before execution

Current user address: ${address}

Format your response as JSON with:
{
  "response": "Brief acknowledgment (1-2 sentences, DO NOT ask for confirmation)",
  "intent": {
    "action": "send" | "create_redeem_link" | "redeem" | "check_balance" | "mint_nft" | "transfer_nft" | "query_nfts" | "register_domain" | "resolve_domain" | "transfer_domain" | "query_transactions" | "add_contact" | "view_contacts" | "find_contact" | "update_contact" | "remove_contact" | "generate_qr" | "create_erc20" | "transfer_erc20" | "transfer_erc20_ownership" | "query_erc20_tokens" | "get_token_info" | "other",
    "amount": number or null,
    "token": string or null,
    "recipient": string or null,
    "redeemLink": string or null,
    "chain": string or null,
    "requiresConfirmation": boolean (true for transactions, false for queries),
    "nftData": {
      "tokenId": number or null,
      "uri": string or null,
      "name": string or null,
      "description": string or null,
      "image": string or null
    } (only for NFT actions),
    "domainData": {
      "domainName": string or null,
      "resolvedAddress": string or null,
      "chainId": number or null
    } (only for domain actions),
    "transactionData": {
      "limit": number or null (default 10, max 20)
    } (only for query_transactions action),
    "contactData": {
      "name": string or null,
      "address": string or null,
      "notes": string or null
    } (only for contact actions),
    "qrData": {
      "address": string or null,
      "label": string or null
    } (only for generate_qr action),
    "erc20Data": {
      "tokenName": string or null,
      "tokenSymbol": string or null,
      "totalSupply": number or null,
      "decimals": number or null (default 18),
      "contractAddress": string or null,
      "amount": number or null,
      "newOwner": string or null
    } (only for ERC20 actions)
  }
}`;

    // Call OpenAI to parse intent
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map((msg: any) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
        { role: 'user', content: message },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');
    let { response: naturalResponse, intent } = aiResponse;

    console.log('🤖 OpenAI Response:', JSON.stringify({ intent, response: naturalResponse }, null, 2));

    // Fallback: If OpenAI missed domain name, try to extract it manually
    if (intent?.action === 'register_domain' && !intent.domainData?.domainName) {
      console.log('⚠️ Domain name missing, attempting fallback extraction from:', message);
      const domainMatch = message.match(/(?:register|create|reserve)\s+domain\s+(?:name\s+)?([a-zA-Z0-9-_.]+)/i);
      if (domainMatch) {
        console.log('✅ Fallback extracted domain:', domainMatch[1]);
        intent.domainData = {
          domainName: domainMatch[1],
          resolvedAddress: address,
          chainId: 42101,
        };
        naturalResponse = `I'll help you register the domain "${domainMatch[1]}" on Push Chain.`;
      } else {
        console.log('❌ Fallback regex did not match');
      }
    }

    // Fallback: If OpenAI missed contact name in find_contact, try to extract it manually
    if (intent?.action === 'find_contact' && !intent.contactData?.name) {
      console.log('⚠️ Contact name missing, attempting fallback extraction from:', message);

      // Try multiple patterns to extract contact name
      let contactMatch = message.match(/(?:find|search|lookup|get)\s+contact\s+(.+?)(?:\s+in|\s+from|\s*$)/i);
      if (!contactMatch) {
        contactMatch = message.match(/(?:find|search|lookup|get)\s+([a-zA-Z0-9_-]+)\s+(?:in|from)\s+(?:my\s+)?contacts?/i);
      }
      if (!contactMatch) {
        contactMatch = message.match(/(?:find|search|lookup)\s+(?:for\s+)?([a-zA-Z0-9_-]+)(?:\s*$)/i);
      }

      if (contactMatch) {
        const contactName = contactMatch[1].trim();
        console.log('✅ Fallback extracted contact name:', contactName);
        intent.contactData = {
          name: contactName,
          address: null,
          notes: null,
        };
        naturalResponse = `I'll search for contact "${contactName}".`;
      } else {
        console.log('❌ Fallback regex did not match');
      }
    }

    // Validate domain name early (before returning to client) to catch issues from AI parsing
    if (intent?.action === 'register_domain' && intent.domainData?.domainName) {
      const domainName = intent.domainData.domainName;

      // Check for uppercase letters
      if (/[A-Z]/.test(domainName)) {
        return NextResponse.json({
          response: '❌ Domain name must be all lowercase. Please use lowercase letters only (e.g., myname.flow not MyName.flow)',
          intent: {
            action: 'other',
            amount: null,
            token: null,
            recipient: null,
            redeemLink: null,
            requiresConfirmation: false,
          },
        });
      }

      // Check for .flow extension
      if (!domainName.endsWith('.flow')) {
        return NextResponse.json({
          response: '❌ Invalid domain name. Only .flow domains are allowed (e.g., myname.flow)',
          intent: {
            action: 'other',
            amount: null,
            token: null,
            recipient: null,
            redeemLink: null,
            requiresConfirmation: false,
          },
        });
      }
    }

    // Don't execute transactions server-side - return intent for client-side execution
    // Transactions require user's wallet signature which is only available client-side

    return NextResponse.json({
      response: naturalResponse,
      intent,
    });
  } catch (error) {
    console.error('Error processing chat transaction:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

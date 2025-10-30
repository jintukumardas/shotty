'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/services/blockchain/useWallet';
import ChatTransactionInterface from '@/components/ChatTransactionInterface';
import { Bot, Sparkles, Zap, ChevronDown, Wallet, ExternalLink, Activity, Link as LinkIcon, Send, Coins, QrCode, Users, Globe, Image, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const { isConnected, address, balance, chainId } = useWallet();
  const nativeTokenSymbol = chainId === 545 || chainId === 747 ? 'FLOW' : 'ETH';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #2A2A2A 1px, transparent 1px),
              linear-gradient(to bottom, #2A2A2A 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        />

        {/* Animated gradient orbs */}
        <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-[#00EF8B]/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute -bottom-20 right-0 w-[600px] h-[600px] bg-[#00D9FF]/20 rounded-full blur-[120px] animate-pulse-slow-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] animate-pulse-slowest" />

        {/* Scanning line effect */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#00EF8B]/30 to-transparent animate-scan" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen px-4 py-8">

        {/* Hero Section - Compact */}
        <div className="text-center mb-8 max-w-4xl mx-auto">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center gap-3 mb-4 group">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-[#00EF8B] to-[#00D9FF] rounded-2xl flex items-center justify-center rotate-3 group-hover:rotate-6 transition-transform">
                <Bot className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-[#00EF8B] via-[#00D9FF] to-[#00EF8B] bg-clip-text text-transparent animate-gradient-x">
                Shotty
              </h1>
              <div className="flex items-center gap-1.5 justify-center">
                <Sparkles className="w-3 h-3 text-[#00EF8B]" />
                <span className="text-xs font-medium text-gray-500 tracking-wider uppercase">AI Butler</span>
              </div>
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
            Your Universal Trading
            <span className="block bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] bg-clip-text text-transparent">
              AI Butler
            </span>
          </h2>

          <p className="text-gray-400 text-sm max-w-2xl mx-auto mb-4">
            Send, swap, and manage assets across supported network with natural language.
            <span className="block text-xs text-gray-600 mt-1">Powered by Flow EVM Blockchain</span>
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <div className="px-3 py-1.5 bg-[#1E1E1E]/60 backdrop-blur-xl border border-[#2A2A2A]/50 rounded-full flex items-center gap-2">
              <Zap className="w-3 h-3 text-[#00EF8B]" />
              <span className="text-xs text-gray-300">Cross-Chain</span>
            </div>
            <div className="px-3 py-1.5 bg-[#1E1E1E]/60 backdrop-blur-xl border border-[#2A2A2A]/50 rounded-full flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-[#00D9FF]" />
              <span className="text-xs text-gray-300">AI-Powered</span>
            </div>
            <div className="px-3 py-1.5 bg-[#1E1E1E]/60 backdrop-blur-xl border border-[#2A2A2A]/50 rounded-full flex items-center gap-2">
              <Bot className="w-3 h-3 text-cyan-400" />
              <span className="text-xs text-gray-300">Natural Language</span>
            </div>
          </div>

          {/* Scroll indicator */}
          {!isConnected && (
            <div className="flex flex-col items-center gap-2 text-gray-600 animate-bounce-subtle">
              <span className="text-xs uppercase tracking-wide">Connect to start</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Left Sidebar - Quick Stats & Actions */}
            <div className="lg:col-span-1 space-y-6">

              {/* Wallet Balance Card */}
              {isConnected && address && (
                <div className="bg-[#1E1E1E]/60 backdrop-blur-xl rounded-2xl p-6 border border-[#2A2A2A]/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-5 h-5 text-[#00EF8B]" />
                    <span className="text-sm text-gray-400">Balance</span>
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] bg-clip-text text-transparent">
                    {balance || '0.0000'}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{nativeTokenSymbol}</div>
                  <div className="mt-3 pt-3 border-t border-[#2A2A2A]/50">
                    <div className="text-xs text-gray-500">Address</div>
                    <div className="font-mono text-xs text-gray-400 mt-1">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Capabilities */}
              <div className="bg-[#1E1E1E]/60 backdrop-blur-xl rounded-2xl p-6 border border-[#2A2A2A]/50">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[#00EF8B]" />
                  <h3 className="text-sm font-semibold text-white">AI Capabilities</h3>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#2A2A2A] scrollbar-track-transparent">
                  {/* Token Operations */}
                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <Send className="w-4 h-4 text-[#00EF8B] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">Send Tokens</div>
                      <div className="text-xs text-gray-500">Cross-chain transfers</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <DollarSign className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">Check Balance</div>
                      <div className="text-xs text-gray-500">View wallet balance</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <LinkIcon className="w-4 h-4 text-[#00D9FF] mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">Payment Links</div>
                      <div className="text-xs text-gray-500">Create redeemable links</div>
                    </div>
                  </div>

                  {/* NFT Operations */}
                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <Sparkles className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">Mint NFTs</div>
                      <div className="text-xs text-gray-500">Create digital collectibles</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <Image className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">View NFTs</div>
                      <div className="text-xs text-gray-500">Browse your collection</div>
                    </div>
                  </div>

                  {/* Domain Operations */}
                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <Globe className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">Register Domains</div>
                      <div className="text-xs text-gray-500">Reserve .push domains</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <Globe className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">Resolve Domains</div>
                      <div className="text-xs text-gray-500">Lookup .push addresses</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <Globe className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">Update Domains</div>
                      <div className="text-xs text-gray-500">Change domain pointers</div>
                    </div>
                  </div>

                  {/* ERC20 Token Operations */}
                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <Coins className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">Create Tokens</div>
                      <div className="text-xs text-gray-500">Deploy ERC20 contracts</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <Coins className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">Token Details</div>
                      <div className="text-xs text-gray-500">Query token info</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <Coins className="w-4 h-4 text-pink-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">My Tokens</div>
                      <div className="text-xs text-gray-500">View created tokens</div>
                    </div>
                  </div>

                  {/* Contact Operations */}
                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <Users className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">Manage Contacts</div>
                      <div className="text-xs text-gray-500">Add, view, update contacts</div>
                    </div>
                  </div>

                  {/* Other Operations */}
                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <QrCode className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">Generate QR</div>
                      <div className="text-xs text-gray-500">QR codes for addresses</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#161616]/50 rounded-lg hover:bg-[#161616] transition-colors">
                    <Activity className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-white">Track TXs</div>
                      <div className="text-xs text-gray-500">Monitor transactions</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deployed Contracts */}
              <div className="bg-[#1E1E1E]/60 backdrop-blur-xl rounded-2xl p-6 border border-[#2A2A2A]/50">
                <h3 className="text-sm font-semibold text-white mb-4">Deployed Contracts</h3>
                <div className="space-y-2">
                  <a
                    href={`https://donut.push.network/address/${process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || '0x015655A8bBaCA2a2be4b8F564f0EAC4EdcCa8Cd3'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Escrow Contract</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href={`https://donut.push.network/address/${process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '0x26E82B153ba980492DB3c7D8D898C48248E5b0f9'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">NFT Contract</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href={`https://donut.push.network/address/${process.env.NEXT_PUBLIC_DOMAIN_CONTRACT_ADDRESS || '0x05153fcD5eA3c5515345B886b5D92E3bf7e30516'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Domain Contract</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href={`https://donut.push.network/address/${process.env.NEXT_PUBLIC_ADDRESSBOOK_CONTRACT_ADDRESS || '0x369fB3ED4FD33B365354E116cB0E556b541A3796'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Address Book</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href={`https://donut.push.network/address/${process.env.NEXT_PUBLIC_SECURESTORAGE_CONTRACT_ADDRESS || '0x51cda9f73020429854c43Ddc51f6cA0a394629a2'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Secure Storage</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-[#1E1E1E]/60 backdrop-blur-xl rounded-2xl p-6 border border-[#2A2A2A]/50">
                <h3 className="text-sm font-semibold text-white mb-4">Quick Links</h3>
                <div className="space-y-2">
                  <a
                    href="https://donut.push.network"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Block Explorer</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href="https://faucet.push.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Testnet Faucet</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href="https://push.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Push Chain Docs</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Side - AI Chat Interface */}
            <div className="lg:col-span-3">
              <div className="relative group">
                {/* Glow effect behind chat */}
                <div className="absolute -inset-4 bg-gradient-to-r from-[#00EF8B]/20 via-[#00D9FF]/20 to-emerald-600/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                {/* Chat container - increased height */}
                <div className="relative h-[700px] rounded-3xl overflow-hidden border border-[#2A2A2A]/50 backdrop-blur-xl bg-[#1E1E1E]/40 shadow-2xl">
                  <ChatTransactionInterface />
                </div>

                {/* Corner accents */}
                <div className="absolute -top-2 -left-2 w-20 h-20 border-l-2 border-t-2 border-[#00EF8B]/50 rounded-tl-3xl pointer-events-none" />
                <div className="absolute -bottom-2 -right-2 w-20 h-20 border-r-2 border-b-2 border-[#00D9FF]/50 rounded-br-3xl pointer-events-none" />
              </div>

              {/* Quick hints */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1E1E1E]/40 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/30">
                  <div className="text-xs text-[#00EF8B] font-semibold mb-1">💸 Send Tokens</div>
                  <code className="text-xs text-gray-500">"Send 1 ETH to 0x..."</code>
                </div>
                <div className="bg-[#1E1E1E]/40 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/30">
                  <div className="text-xs text-[#00D9FF] font-semibold mb-1">🎨 Mint NFT</div>
                  <code className="text-xs text-gray-500">"Mint an NFT"</code>
                </div>
                <div className="bg-[#1E1E1E]/40 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/30">
                  <div className="text-xs text-violet-400 font-semibold mb-1">🌐 Register Domain</div>
                  <code className="text-xs text-gray-500">"Register domain myname.push"</code>
                </div>
                <div className="bg-[#1E1E1E]/40 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/30">
                  <div className="text-xs text-orange-400 font-semibold mb-1">🔗 Payment Link</div>
                  <code className="text-xs text-gray-500">"Create a link for 5 FLOW"</code>
                </div>
                <div className="bg-[#1E1E1E]/40 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/30">
                  <div className="text-xs text-cyan-400 font-semibold mb-1">👤 View Contacts</div>
                  <code className="text-xs text-gray-500">"Show my contacts"</code>
                </div>
                <div className="bg-[#1E1E1E]/40 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/30">
                  <div className="text-xs text-green-400 font-semibold mb-1">📊 View History</div>
                  <code className="text-xs text-gray-500">"Show my recent transactions"</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Minimal */}
        <footer className="mt-16 text-center max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
            <a
              href="https://flow.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#00EF8B] transition-colors"
            >
              Built on Flow EVM Blockchain
            </a>
            <span className="text-gray-800">•</span>
            <a
              href="https://github.com/jintukumardas/shotty"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#00EF8B] transition-colors"
            >
              GitHub
            </a>
          </div>
        </footer>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-size: 200% 200%;
            background-position: left center;
          }
          50% {
            background-size: 200% 200%;
            background-position: right center;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(1.1);
          }
        }

        @keyframes pulse-slow-delayed {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(1.1);
          }
        }

        @keyframes pulse-slowest {
          0%, 100% {
            opacity: 0.1;
            transform: scale(1);
          }
          50% {
            opacity: 0.15;
            transform: scale(1.05);
          }
        }

        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100vh);
          }
        }

        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(5px);
          }
        }

        .animate-gradient-x {
          animation: gradient-x 4s ease infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }

        .animate-pulse-slow-delayed {
          animation: pulse-slow-delayed 8s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-pulse-slowest {
          animation: pulse-slowest 10s ease-in-out infinite;
          animation-delay: 1s;
        }

        .animate-scan {
          animation: scan 10s linear infinite;
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

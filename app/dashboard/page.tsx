'use client';

import { useEffect, useState, useRef } from 'react';
import { useWallet } from '@/services/blockchain/useWallet';
import ChatTransactionInterface from '@/components/ChatTransactionInterface';
import FlowIcon from '@/components/FlowIcon';
import { Bot, Sparkles, Zap, ChevronDown, ChevronLeft, ChevronRight, Wallet, ExternalLink, Activity, Link as LinkIcon, Send, Coins, QrCode, Users, Globe, Image, DollarSign, Clock, Layers, Workflow, TrendingUp } from 'lucide-react';
import { formatBalance } from '@/utils/formatNumber';

export default function Dashboard() {
  const { isConnected, address, balance, chainId } = useWallet();
  const nativeTokenSymbol = chainId === 545 || chainId === 747 ? 'FLOW' : 'ETH';
  const [mounted, setMounted] = useState(false);
  const chatInterfaceRef = useRef<{ setInput: (text: string) => void } | null>(null);

  // Carousel state
  const [currentCapabilityIndex, setCurrentCapabilityIndex] = useState(0);

  // Define capabilities for carousel
  const capabilities = [
    { icon: Send, title: 'Send Tokens', description: 'Cross-chain transfers', example: 'Send 1 FLOW to 0x...', color: 'text-[#00EF8B]', borderColor: 'border-[#00EF8B]/30' },
    { icon: DollarSign, title: 'Check Balance', description: 'View wallet balance', example: "What's my balance?", color: 'text-green-400', borderColor: 'border-green-400/30' },
    { icon: Image, title: 'Mint NFT', description: 'Create digital collectibles', example: 'Mint an NFT', color: 'text-pink-400', borderColor: 'border-pink-400/30' },
    { icon: Coins, title: 'View NFTs', description: 'See your collection', example: 'Show my NFTs', color: 'text-blue-400', borderColor: 'border-blue-400/30' },
    { icon: Globe, title: 'Register Domain', description: 'Reserve domain names', example: 'Register domain myname.flow', color: 'text-violet-400', borderColor: 'border-violet-400/30' },
    { icon: LinkIcon, title: 'Payment Links', description: 'Create redeem links', example: 'Create a link for 5 FLOW', color: 'text-cyan-400', borderColor: 'border-cyan-400/30' },
    { icon: Users, title: 'Manage Contacts', description: 'Save addresses', example: 'Show my contacts', color: 'text-indigo-400', borderColor: 'border-indigo-400/30' },
    { icon: Activity, title: 'Transaction History', description: 'View recent activity', example: 'Show my recent transactions', color: 'text-purple-400', borderColor: 'border-purple-400/30' },
    { icon: QrCode, title: 'Generate QR Code', description: 'Create wallet QR', example: 'Generate QR code', color: 'text-teal-400', borderColor: 'border-teal-400/30' },
    { icon: Coins, title: 'Create Token', description: 'Deploy ERC20 tokens', example: 'Create a token', color: 'text-rose-400', borderColor: 'border-rose-400/30' },
    { icon: TrendingUp, title: 'Cross-Chain Bridge', description: 'Bridge tokens across chains', example: 'Bridge tokens between networks', color: 'text-amber-400', borderColor: 'border-amber-400/30' },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-rotate carousel every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCapabilityIndex((prev) => (prev + 1) % capabilities.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [capabilities.length]);

  const handleCapabilityClick = (example: string) => {
    if (chatInterfaceRef.current) {
      chatInterfaceRef.current.setInput(example);
    }
  };

  const nextCapability = () => {
    setCurrentCapabilityIndex((prev) => (prev + 1) % capabilities.length);
  };

  const prevCapability = () => {
    setCurrentCapabilityIndex((prev) => (prev - 1 + capabilities.length) % capabilities.length);
  };

  const currentCapability = capabilities[currentCapabilityIndex];
  const CapabilityIcon = currentCapability.icon;

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
              <div className="relative w-12 h-12 bg-[#0D0D0D] rounded-2xl flex items-center justify-center rotate-3 group-hover:rotate-6 transition-transform border border-[#00EF8B]/20">
                <FlowIcon size={32} className="drop-shadow-lg" />
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
                    {formatBalance(balance || '0')}
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

              {/* AI Capabilities Carousel */}
              <div className="bg-[#1E1E1E]/60 backdrop-blur-xl rounded-2xl p-6 border border-[#2A2A2A]/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#00EF8B]" />
                    <h3 className="text-sm font-semibold text-white">AI Capabilities</h3>
                  </div>
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider">Click to use</span>
                </div>

                {/* Carousel Container */}
                <div className="relative overflow-hidden min-h-[140px]">
                  {/* Carousel Slide */}
                  <div className="transition-all duration-500 ease-in-out transform">
                    <button
                      onClick={() => handleCapabilityClick(currentCapability.example)}
                      className={`w-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#161616]/80 to-[#1E1E1E]/80 rounded-lg hover:from-[#161616] hover:to-[#1E1E1E] hover:${currentCapability.borderColor} border border-transparent transition-all cursor-pointer group`}
                    >
                      <div className={`${currentCapability.color} mb-3 transform group-hover:scale-110 transition-transform duration-200`}>
                        <CapabilityIcon className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <div className="text-base font-semibold text-white mb-1">{currentCapability.title}</div>
                        <div className="text-xs text-gray-400 mb-2">{currentCapability.description}</div>
                        <div className="text-[10px] text-gray-500 font-mono bg-[#0A0A0A]/50 px-2 py-1 rounded">
                          {currentCapability.example}
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={prevCapability}
                      className="p-2 bg-[#161616]/50 hover:bg-[#161616] rounded-lg border border-[#2A2A2A]/50 hover:border-[#00EF8B]/30 transition-all group"
                      aria-label="Previous capability"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-[#00EF8B]" />
                    </button>

                    {/* Dots Indicator */}
                    <div className="flex gap-1.5">
                      {capabilities.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentCapabilityIndex(index)}
                          className={`h-1.5 rounded-full transition-all ${
                            index === currentCapabilityIndex
                              ? 'w-6 bg-[#00EF8B]'
                              : 'w-1.5 bg-gray-600 hover:bg-gray-500'
                          }`}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={nextCapability}
                      className="p-2 bg-[#161616]/50 hover:bg-[#161616] rounded-lg border border-[#2A2A2A]/50 hover:border-[#00EF8B]/30 transition-all group"
                      aria-label="Next capability"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#00EF8B]" />
                    </button>
                  </div>
                </div>

                {/* Caption */}
                <div className="mt-4 pt-4 border-t border-[#2A2A2A]/50">
                  <p className="text-[10px] text-gray-600 text-center">💡 Click the card or use arrows to navigate • Auto-rotates every 4s</p>
                </div>
              </div>

              {/* In Development Features */}
              <div className="bg-[#1E1E1E]/60 backdrop-blur-xl rounded-2xl p-6 border border-[#2A2A2A]/50">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">In Development</h3>
                </div>
                <p className="text-[10px] text-amber-500/60 mb-4 leading-relaxed">
                  These features are still being tested. Use at your own risk.
                </p>
                <div className="space-y-2">
                  {/* Batch Transactions */}
                  <button
                    onClick={() => handleCapabilityClick('Execute batch transactions')}
                    className="w-full flex items-start gap-3 p-3 bg-[#161616]/30 rounded-lg hover:bg-[#161616] hover:border-purple-400/30 border border-amber-500/10 transition-all cursor-pointer opacity-75"
                  >
                    <Layers className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">Batch Transactions</div>
                      <div className="text-xs text-gray-500">Multi-operation execution</div>
                    </div>
                  </button>

                  {/* Scheduled Transactions */}
                  <button
                    onClick={() => handleCapabilityClick('Schedule a transaction')}
                    className="w-full flex items-start gap-3 p-3 bg-[#161616]/30 rounded-lg hover:bg-[#161616] hover:border-sky-400/30 border border-amber-500/10 transition-all cursor-pointer opacity-75"
                  >
                    <Clock className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">Schedule TXs</div>
                      <div className="text-xs text-gray-500">Time-locked transactions</div>
                    </div>
                  </button>

                  {/* Flow Actions / Workflows */}
                  <button
                    onClick={() => handleCapabilityClick('Create a workflow')}
                    className="w-full flex items-start gap-3 p-3 bg-[#161616]/30 rounded-lg hover:bg-[#161616] hover:border-fuchsia-400/30 border border-amber-500/10 transition-all cursor-pointer opacity-75"
                  >
                    <Workflow className="w-4 h-4 text-fuchsia-400 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">Workflows</div>
                      <div className="text-xs text-gray-500">Composable action chains</div>
                    </div>
                  </button>

                  {/* Lending Protocol */}
                  <button
                    onClick={() => handleCapabilityClick('Lend tokens')}
                    className="w-full flex items-start gap-3 p-3 bg-[#161616]/30 rounded-lg hover:bg-[#161616] hover:border-emerald-400/30 border border-amber-500/10 transition-all cursor-pointer opacity-75"
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">Lending</div>
                      <div className="text-xs text-gray-500">DeFi lending & borrowing</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Deployed Contracts */}
              <div className="bg-[#1E1E1E]/60 backdrop-blur-xl rounded-2xl p-6 border border-[#2A2A2A]/50">
                <h3 className="text-sm font-semibold text-white mb-4">Deployed Contracts</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#2A2A2A] scrollbar-track-transparent">
                  <a
                    href={`https://evm-testnet.flowscan.io/address/${process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || '0x5d726C51a99a0F78a05b5ab1591340B321778e75'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Escrow Contract</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href={`https://evm-testnet.flowscan.io/address/${process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '0x332ee5D730cBFD516Bac7D1e0CFf763d235dFF0A'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">NFT Contract</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href={`https://evm-testnet.flowscan.io/address/${process.env.NEXT_PUBLIC_DOMAIN_CONTRACT_ADDRESS || '0x55422db56C11a62AfB285e70c6a541A9E80B70f3'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Domain Contract</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href={`https://evm-testnet.flowscan.io/address/${process.env.NEXT_PUBLIC_ADDRESSBOOK_CONTRACT_ADDRESS || '0x4354BE4A734E3DC61182F0e09Bc5B0cc264CC218'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Address Book</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href={`https://evm-testnet.flowscan.io/address/${process.env.NEXT_PUBLIC_SECURESTORAGE_CONTRACT_ADDRESS || '0x42D2e14cb7d931216F0154625db3dA4F3e90525B'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Secure Storage</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href={`https://evm-testnet.flowscan.io/address/${process.env.NEXT_PUBLIC_BATCH_CONTRACT_ADDRESS || '0xC3d8AfB3462f726Db9d793DefdCFC67D7E12DBa3'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Batch Transactions</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href={`https://evm-testnet.flowscan.io/address/${process.env.NEXT_PUBLIC_SCHEDULED_CONTRACT_ADDRESS || '0xfF0e7F71a0e19E0BF037Bd90Ba30A2Ee409E53a7'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Scheduled Transactions</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href={`https://evm-testnet.flowscan.io/address/${process.env.NEXT_PUBLIC_FLOW_ACTIONS_CONTRACT_ADDRESS || '0xe4ab654a03826E15039913D0D0E1E4Af2117bA0d'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Flow Actions</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href={`https://evm-testnet.flowscan.io/address/${process.env.NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS || '0x3b4cAE62020487263Fc079312f9199a1b014BF6b'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Lending Protocol</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-[#1E1E1E]/60 backdrop-blur-xl rounded-2xl p-6 border border-[#2A2A2A]/50">
                <h3 className="text-sm font-semibold text-white mb-4">Quick Links</h3>
                <div className="space-y-2">
                  <a
                    href="https://evm-testnet.flowscan.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Block Explorer</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href="https://faucet.flow.com/fund-account"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Testnet Faucet</span>
                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-[#00EF8B]" />
                  </a>
                  <a
                    href="https://developers.flow.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 hover:bg-[#161616]/50 rounded-lg transition-colors group"
                  >
                    <span className="text-sm text-gray-400 group-hover:text-gray-300">Flow Docs</span>
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
                  <ChatTransactionInterface ref={chatInterfaceRef} />
                </div>

                {/* Corner accents */}
                <div className="absolute -top-2 -left-2 w-20 h-20 border-l-2 border-t-2 border-[#00EF8B]/50 rounded-tl-3xl pointer-events-none" />
                <div className="absolute -bottom-2 -right-2 w-20 h-20 border-r-2 border-b-2 border-[#00D9FF]/50 rounded-br-3xl pointer-events-none" />
              </div>

              {/* Quick hints */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1E1E1E]/40 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/30">
                  <div className="text-xs text-[#00EF8B] font-semibold mb-1">💸 Send Tokens</div>
                  <code className="text-xs text-gray-500">"Send 1 FLOW to 0x..."</code>
                </div>
                <div className="bg-[#1E1E1E]/40 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/30">
                  <div className="text-xs text-[#00D9FF] font-semibold mb-1">🎨 Mint NFT</div>
                  <code className="text-xs text-gray-500">"Mint an NFT"</code>
                </div>
                <div className="bg-[#1E1E1E]/40 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/30">
                  <div className="text-xs text-violet-400 font-semibold mb-1">🌐 Register Domain</div>
                  <code className="text-xs text-gray-500">"Register domain myname.flow"</code>
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

'use client';

import ChatTransactionInterface from '@/components/ChatTransactionInterface';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Background effects */}
      <div className="fixed inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-[#2A2A2A]/50 bg-[#161616]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#DD44B9] to-[#FC519F] bg-clip-text text-transparent">
              AI Transaction Assistant
            </h1>
            <div className="w-32"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-[calc(100vh-12rem)]">
          <ChatTransactionInterface />
        </div>

        {/* AI Capabilities Cards */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">✨ AI Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Token Operations */}
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">💸 Send Tokens</h3>
              <p className="text-xs text-gray-400">
                "Send 1 FLOW to 0x123..."
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">💰 Check Balance</h3>
              <p className="text-xs text-gray-400">
                "What's my balance?"
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">🔗 Payment Links</h3>
              <p className="text-xs text-gray-400">
                "Create a link for 10 FLOW"
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">🎟️ Redeem Tokens</h3>
              <p className="text-xs text-gray-400">
                "Redeem tokens from &lt;link&gt;"
              </p>
            </div>

            {/* NFT Operations */}
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">🎨 Mint NFTs</h3>
              <p className="text-xs text-gray-400">
                "Mint an NFT called Sunset"
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">🖼️ Transfer NFTs</h3>
              <p className="text-xs text-gray-400">
                "Transfer NFT #5 to 0x123..."
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">🔍 Query NFTs</h3>
              <p className="text-xs text-gray-400">
                "Show my NFTs"
              </p>
            </div>

            {/* Domain Operations */}
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">🌐 Register Domain</h3>
              <p className="text-xs text-gray-400">
                "Register domain myname.flow"
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">🔎 Resolve Domain</h3>
              <p className="text-xs text-gray-400">
                "Resolve domain alice.flow"
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">📝 Update Domain</h3>
              <p className="text-xs text-gray-400">
                "Update alice.flow to 0x123..."
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">🔄 Transfer Domain</h3>
              <p className="text-xs text-gray-400">
                "Transfer alice.flow to 0x456..."
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">♻️ Renew Domain</h3>
              <p className="text-xs text-gray-400">
                "Renew domain alice.flow"
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">✅ Check Domain</h3>
              <p className="text-xs text-gray-400">
                "Is bitcoin.flow available?"
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">📋 My Domains</h3>
              <p className="text-xs text-gray-400">
                "Show my domains"
              </p>
            </div>

            {/* ERC20 Token Operations */}
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">🪙 Create Token</h3>
              <p className="text-xs text-gray-400">
                "Create token MyToken (MTK)"
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">📊 Token Details</h3>
              <p className="text-xs text-gray-400">
                "Show token details of 0x123..."
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">💼 My Tokens</h3>
              <p className="text-xs text-gray-400">
                "Show my created tokens"
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">👑 Transfer Ownership</h3>
              <p className="text-xs text-gray-400">
                "Transfer token ownership"
              </p>
            </div>

            {/* Contact Operations */}
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">➕ Add Contact</h3>
              <p className="text-xs text-gray-400">
                "Add contact Alice at 0x123..."
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">👤 View Contacts</h3>
              <p className="text-xs text-gray-400">
                "Show my contacts"
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">🔍 Find Contact</h3>
              <p className="text-xs text-gray-400">
                "Find contact Bob"
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">✏️ Update Contact</h3>
              <p className="text-xs text-gray-400">
                "Update contact Alice"
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">🗑️ Remove Contact</h3>
              <p className="text-xs text-gray-400">
                "Remove contact Bob"
              </p>
            </div>

            {/* Other Operations */}
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">📱 Generate QR</h3>
              <p className="text-xs text-gray-400">
                "Generate QR code"
              </p>
            </div>
            <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-xl p-4 border border-[#2A2A2A]/50 hover:border-purple-500/50 transition-colors">
              <h3 className="text-sm font-semibold text-white mb-2">📜 View History</h3>
              <p className="text-xs text-gray-400">
                "Show my transactions"
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

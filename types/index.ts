// Core Types for Shotty Trading Butler Bot

export interface User {
  id: string;
  address: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Portfolio {
  id: string;
  userId: string;
  totalValue: number;
  tokens: TokenBalance[];
  chains: string[];
  updatedAt: Date;
}

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  valueUSD: number;
  chain: string;
  address: string;
  logoURI?: string;
}

export interface Trade {
  id: string;
  userId: string;
  type: 'BUY' | 'SELL' | 'SWAP';
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  chain: string;
  txHash?: string;
  gasUsed?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface Strategy {
  id: string;
  name: string;
  type: 'DCA' | 'GRID' | 'MOMENTUM' | 'CUSTOM';
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  userId: string;
  config: StrategyConfig;
  performance: StrategyPerformance;
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategyConfig {
  targetToken: string;
  sourceToken: string;
  amount: string;
  frequency?: string; // For DCA
  gridLevels?: number; // For Grid Trading
  stopLoss?: number;
  takeProfit?: number;
  maxGasPrice?: string;
}

export interface StrategyPerformance {
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  tradesExecuted: number;
  successRate: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  timestamp: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'TRADE' | 'ALERT' | 'STRATEGY' | 'SYSTEM';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
}
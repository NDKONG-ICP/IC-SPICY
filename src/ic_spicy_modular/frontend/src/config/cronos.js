// Cronos blockchain configuration
import { WALLET_ADDRESSES } from './walletAddresses';

export const CRONOS_CONFIG = {
  chainId: '0x19', // Cronos mainnet
  chainName: 'Cronos',
  nativeCurrency: {
    name: 'CRO',
    symbol: 'CRO',
    decimals: 18
  },
  rpcUrls: [
    'https://evm.cronos.org',
    'https://cronos-rpc.crypto.org'
  ],
  blockExplorerUrls: ['https://cronoscan.com'],
  
  // Payment settings - using centralized wallet addresses
  recipientAddress: WALLET_ADDRESSES.ETHEREUM.address, // Ethereum address for ERC20 tokens
  minPaymentAmount: 0.001, // Minimum payment amount in CRO
  maxPaymentAmount: 1000, // Maximum payment amount in CRO
  
  // API endpoints
  apiEndpoints: {
    transactions: 'https://cronos.org/api/v1/transactions',
    blocks: 'https://cronos.org/api/v1/blocks',
    accounts: 'https://cronos.org/api/v1/accounts'
  },
  
  // Supported tokens
  supportedTokens: {
    CRO: {
      symbol: 'CRO',
      name: 'Cronos',
      decimals: 18,
      icon: '🦅',
      color: 'from-purple-600 to-pink-600',
      description: 'Native Cronos token',
      contractAddress: null, // Native token
      enabled: true
    },
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '💵',
      color: 'from-blue-500 to-green-500',
      description: 'USD Coin on Cronos',
      contractAddress: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59',
      enabled: false // Coming soon
    },
    USDT: {
      symbol: 'USDT',
      name: 'Tether',
      decimals: 6,
      icon: '💱',
      color: 'from-green-500 to-blue-500',
      description: 'Tether on Cronos',
      contractAddress: '0x66e428c3f67a68878562e79A0234c1F83c208770',
      enabled: false // Coming soon
    }
  }
};

// Helper functions
export const formatCROAmount = (amount, decimals = 4) => {
  return parseFloat(amount).toFixed(decimals);
};

export const validateTransactionHash = (hash) => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

export const getCronosNetworkInfo = () => {
  return {
    name: CRONOS_CONFIG.chainName,
    chainId: CRONOS_CONFIG.chainId,
    rpcUrl: CRONOS_CONFIG.rpcUrls[0],
    explorer: CRONOS_CONFIG.blockExplorerUrls[0]
  };
};

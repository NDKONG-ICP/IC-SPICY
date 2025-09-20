// Centralized wallet addresses for all multichain transactions
// These addresses are supported through OISY wallet and used throughout the entire application

export const WALLET_ADDRESSES = {
  // Bitcoin wallet address for BTC transactions (supported by OISY)
  BITCOIN: {
    address: 'bc1qxf5fegu3x4uvynqz69q62jcglzg3m8jpzrsdej',
    network: 'mainnet',
    type: 'bech32',
    description: 'Bitcoin wallet for BTC payments (OISY supported)',
    oisySupported: true
  },

  // Ethereum wallet address for ERC20 tokens (supported by OISY)
  ETHEREUM: {
    address: '0x989847D46770e2322b017c79e2fAF253aA23687f',
    network: 'mainnet',
    type: 'ethereum',
    description: 'Ethereum wallet for ERC20 token payments (ETH, USDC, USDT, etc.) - OISY supported',
    oisySupported: true
  },

  // ICP Principal for ICRC-1 tokens (supported by OISY)
  ICP_PRINCIPAL: {
    principal: 'yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe',
    network: 'icp',
    type: 'principal',
    description: 'ICP Principal for receiving ICRC-1 tokens (ICP, ckBTC, ckETH, SNS tokens, etc.) - OISY supported',
    oisySupported: true
  },

  // ICP Account for exchanges
  ICP_ACCOUNT: {
    account: '82f47963aa786ed12c115f40027ef1e86e1a8010119afc5e8709589609bc2f8f',
    network: 'icp',
    type: 'account',
    description: 'ICP Account for exchange integrations',
    oisySupported: false
  },

  // Solana wallet address (supported by OISY)
  SOLANA: {
    address: '6NgxMDwKYfqdtBVpbkA3LmCHzXS5CZ8DvQX72KpDZ5A4',
    network: 'mainnet-beta',
    type: 'solana',
    description: 'Solana wallet for SOL and SPL token payments (OISY supported)',
    oisySupported: true
  }
};

// OISY wallet configuration for multi-chain support
export const OISY_WALLET_CONFIG = {
  supportedChains: ['ICP', 'ckBTC', 'ckETH', 'SOL', 'BTC', 'ETH'],
  defaultChain: 'ICP',
  // All addresses supported through OISY wallet
  addresses: {
    ICP: WALLET_ADDRESSES.ICP_PRINCIPAL.principal,
    ckBTC: WALLET_ADDRESSES.ICP_PRINCIPAL.principal, // Same principal for ckBTC
    ckETH: WALLET_ADDRESSES.ICP_PRINCIPAL.principal, // Same principal for ckETH
    SOL: WALLET_ADDRESSES.SOLANA.address,
    BTC: WALLET_ADDRESSES.BITCOIN.address,
    ETH: WALLET_ADDRESSES.ETHEREUM.address
  },
  // Chain-specific configurations
  chainConfigs: {
    ICP: {
      symbol: 'ICP',
      decimals: 8,
      network: 'icp',
      type: 'principal'
    },
    ckBTC: {
      symbol: 'ckBTC',
      decimals: 8,
      network: 'icp',
      type: 'principal',
      ledgerCanister: 'mxzaz-hqaaa-aaaar-qaada-cai'
    },
    ckETH: {
      symbol: 'ckETH',
      decimals: 18,
      network: 'icp',
      type: 'principal',
      ledgerCanister: 'ss2fx-dyaaa-aaaar-qacoq-cai'
    },
    SOL: {
      symbol: 'SOL',
      decimals: 9,
      network: 'solana',
      type: 'address'
    },
    BTC: {
      symbol: 'BTC',
      decimals: 8,
      network: 'bitcoin',
      type: 'address'
    },
    ETH: {
      symbol: 'ETH',
      decimals: 18,
      network: 'ethereum',
      type: 'address'
    }
  }
};

// Helper functions for wallet address management
export const getWalletAddress = (chain) => {
  switch (chain.toLowerCase()) {
    case 'bitcoin':
    case 'btc':
      return WALLET_ADDRESSES.BITCOIN.address;
    
    case 'ethereum':
    case 'eth':
    case 'erc20':
      return WALLET_ADDRESSES.ETHEREUM.address;
    
    case 'icp':
    case 'principal':
      return WALLET_ADDRESSES.ICP_PRINCIPAL.principal;
    
    case 'icp_account':
      return WALLET_ADDRESSES.ICP_ACCOUNT.account;
    
    case 'solana':
    case 'sol':
      return WALLET_ADDRESSES.SOLANA.address;
    
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
};

// OISY wallet helper functions
export const getOisyWalletAddress = (tokenSymbol) => {
  const symbol = tokenSymbol.toUpperCase();
  return OISY_WALLET_CONFIG.addresses[symbol] || null;
};

export const getOisyChainConfig = (tokenSymbol) => {
  const symbol = tokenSymbol.toUpperCase();
  return OISY_WALLET_CONFIG.chainConfigs[symbol] || null;
};

export const isOisySupported = (tokenSymbol) => {
  const symbol = tokenSymbol.toUpperCase();
  return OISY_WALLET_CONFIG.supportedChains.includes(symbol);
};

export const getOisySupportedTokens = () => {
  return OISY_WALLET_CONFIG.supportedChains.map(symbol => ({
    symbol,
    ...OISY_WALLET_CONFIG.chainConfigs[symbol],
    address: OISY_WALLET_CONFIG.addresses[symbol]
  }));
};

// Get wallet info for a specific chain
export const getWalletInfo = (chain) => {
  switch (chain.toLowerCase()) {
    case 'bitcoin':
    case 'btc':
      return WALLET_ADDRESSES.BITCOIN;
    
    case 'ethereum':
    case 'eth':
    case 'erc20':
      return WALLET_ADDRESSES.ETHEREUM;
    
    case 'icp':
    case 'principal':
      return WALLET_ADDRESSES.ICP_PRINCIPAL;
    
    case 'icp_account':
      return WALLET_ADDRESSES.ICP_ACCOUNT;
    
    case 'solana':
    case 'sol':
      return WALLET_ADDRESSES.SOLANA;
    
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
};

// Validate wallet address format
export const validateWalletAddress = (address, chain) => {
  const info = getWalletInfo(chain);
  
  switch (chain.toLowerCase()) {
    case 'bitcoin':
    case 'btc':
      return address === info.address && address.startsWith('bc1q');
    
    case 'ethereum':
    case 'eth':
    case 'erc20':
      return address === info.address && /^0x[a-fA-F0-9]{40}$/.test(address);
    
    case 'icp':
    case 'principal':
      return address === info.principal && address.includes('-');
    
    case 'icp_account':
      return address === info.account && /^[a-fA-F0-9]{64}$/.test(address);
    
    case 'solana':
    case 'sol':
      return address === info.address && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    
    default:
      return false;
  }
};

// Get all wallet addresses as a formatted list
export const getAllWalletAddresses = () => {
  return Object.entries(WALLET_ADDRESSES).map(([key, info]) => ({
    chain: key,
    address: info.address || info.principal || info.account,
    network: info.network,
    type: info.type,
    description: info.description
  }));
};

// Format wallet address for display
export const formatWalletAddress = (chain, short = false) => {
  const info = getWalletInfo(chain);
  const address = info.address || info.principal || info.account;
  
  if (short) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  
  return address;
};

export default WALLET_ADDRESSES;

// Internet Identity configuration
export const INTERNET_IDENTITY_CONFIG = {
  // Mainnet Internet Identity provider
  mainnet: {
    url: 'https://identity.ic0.app/#authorize',
    host: 'https://ic0.app'
  },
  
  // Local development Internet Identity provider
  local: {
    url: 'http://127.0.0.1:4943/?canisterId=rdmx6-jaaaa-aaaaa-qaadq-cai#authorize',
    host: 'http://127.0.0.1:4943'
  },
  
  // Testnet Internet Identity provider (if needed)
  testnet: {
    url: 'https://identity.internetcomputer.org/#authorize',
    host: 'https://ic0.app'
  }
};

// Helper function to get the appropriate configuration based on environment
export const getInternetIdentityConfig = () => {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('🌐 Using local Internet Identity configuration');
    return INTERNET_IDENTITY_CONFIG.local;
  }
  
  console.log('🌐 Using mainnet Internet Identity configuration');
  return INTERNET_IDENTITY_CONFIG.mainnet;
};

// Helper function to get the identity provider URL
export const getIdentityProviderUrl = () => {
  return getInternetIdentityConfig().url;
};

// Helper function to get the host
export const getHost = () => {
  return getInternetIdentityConfig().host;
};

// Debug function to log current configuration
export const logInternetIdentityConfig = () => {
  const config = getInternetIdentityConfig();
  console.log('🔧 Internet Identity Configuration:', {
    hostname: window.location.hostname,
    identityProviderUrl: config.url,
    host: config.host,
    environment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'local' : 'mainnet'
  });
};

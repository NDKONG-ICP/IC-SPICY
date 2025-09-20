/**
 * API Key Configuration for IC SPICY Logistics Integration
 * 
 * Secure handling of API credentials and environment-specific settings
 */

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// API Key configuration
export const API_CONFIG = {
  // Logistics API Configuration
  LOGISTICS: {
    apiKey: process.env.REACT_APP_LOGISTICS_API_KEY || (isDevelopment ? 'icspicy_1_demo_development' : 'icspicy_1_abc123def_1704067200'),
    baseUrl: process.env.REACT_APP_LOGISTICS_BASE_URL || 'https://icspicy-logistics-ynt.caffeine.xyz/api/v1',
    environment: process.env.REACT_APP_LOGISTICS_ENVIRONMENT || (isDevelopment ? 'development' : 'production'),
    syncEnabled: process.env.REACT_APP_ENABLE_LOGISTICS_SYNC === 'true',
    debugMode: process.env.REACT_APP_DEBUG_LOGISTICS === 'true',
  },

  // Request configuration
  REQUESTS: {
    timeout: isDevelopment ? 10000 : 30000, // 10s dev, 30s prod
    retries: isDevelopment ? 1 : 3,
    retryDelay: 1000,
  },

  // Feature flags
  FEATURES: {
    enableRealTimeSync: isProduction,
    enableDetailedLogging: isDevelopment,
    enableErrorReporting: isProduction,
    enableAnalytics: isProduction,
  }
};

// Validation function
export const validateAPIConfig = () => {
  const errors = [];

  // Check required API key in production
  if (isProduction && !API_CONFIG.LOGISTICS.apiKey) {
    errors.push('REACT_APP_LOGISTICS_API_KEY is required in production');
  }

  // Validate base URL format
  try {
    new URL(API_CONFIG.LOGISTICS.baseUrl);
  } catch (error) {
    errors.push('Invalid REACT_APP_LOGISTICS_BASE_URL format');
  }

  // Check environment setting
  const validEnvironments = ['development', 'staging', 'production'];
  if (!validEnvironments.includes(API_CONFIG.LOGISTICS.environment)) {
    errors.push('REACT_APP_LOGISTICS_ENVIRONMENT must be development, staging, or production');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: isProduction && API_CONFIG.LOGISTICS.debugMode ? ['Debug mode enabled in production'] : []
  };
};

// Helper function to get masked API key for logging
export const getMaskedAPIKey = () => {
  const key = API_CONFIG.LOGISTICS.apiKey;
  if (!key) return 'NOT_SET';
  if (key.length <= 8) return '****';
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
};

// Configuration status
export const getConfigStatus = () => {
  const validation = validateAPIConfig();
  
  return {
    environment: API_CONFIG.LOGISTICS.environment,
    apiKeySet: !!API_CONFIG.LOGISTICS.apiKey,
    apiKeyMasked: getMaskedAPIKey(),
    syncEnabled: API_CONFIG.LOGISTICS.syncEnabled,
    debugMode: API_CONFIG.LOGISTICS.debugMode,
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
    baseUrl: API_CONFIG.LOGISTICS.baseUrl
  };
};

// Development helper
export const logConfigStatus = () => {
  if (isDevelopment) {
    const status = getConfigStatus();
    console.group('🔧 IC SPICY Logistics API Configuration');
    console.log('Environment:', status.environment);
    console.log('API Key Set:', status.apiKeySet);
    console.log('API Key (Masked):', status.apiKeyMasked);
    console.log('Base URL:', status.baseUrl);
    console.log('Sync Enabled:', status.syncEnabled);
    console.log('Debug Mode:', status.debugMode);
    console.log('Config Valid:', status.isValid);
    
    if (status.errors.length > 0) {
      console.error('❌ Configuration Errors:', status.errors);
    }
    
    if (status.warnings.length > 0) {
      console.warn('⚠️ Configuration Warnings:', status.warnings);
    }
    
    console.groupEnd();
  }
};

// Initialize configuration logging
if (isDevelopment) {
  logConfigStatus();
}

export default API_CONFIG;


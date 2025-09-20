/**
 * IC SPICY Co-op Logistics API Configuration
 * 
 * Configuration for secure API communication with the logistics system
 */

export const LOGISTICS_CONFIG = {
  // API Base Configuration
  BASE_URL: 'https://icspicy-logistics-ynt.caffeine.xyz/api/v1',
  TIMEOUT: 30000, // 30 seconds
  
  // Authentication Configuration
  AUTH: {
    // API Key for service-to-service authentication
    API_KEY_HEADER: 'X-API-Key',
    
    // JWT Token for user authentication
    TOKEN_HEADER: 'Authorization',
    TOKEN_PREFIX: 'Bearer ',
    
    // Session configuration
    SESSION_TIMEOUT: 3600000, // 1 hour in milliseconds
    REFRESH_THRESHOLD: 300000, // 5 minutes before expiry
  },

  // Role-based access control
  ROLES: {
    GUEST: 'guest',
    USER: 'user',
    MANAGER: 'manager',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin'
  },

  // Permission levels for role hierarchy
  ROLE_LEVELS: {
    guest: 0,
    user: 1,
    manager: 2,
    admin: 3,
    superadmin: 4
  },

  // API Endpoints
  ENDPOINTS: {
    // Health and status
    HEALTH: '/health',
    STATUS: '/status',
    
    // Authentication
    AUTH: '/auth',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    
    // Orders
    ORDERS: '/orders',
    ORDER_BY_ID: '/orders/:id',
    ORDER_STATUS: '/orders/:id/status',
    ORDER_TRACKING: '/orders/:id/tracking',
    ORDER_ITEMS: '/orders/:id/items',
    
    // Transactions
    TRANSACTIONS: '/transactions',
    TRANSACTION_BY_ID: '/transactions/:id',
    TRANSACTION_REFUND: '/transactions/:id/refund',
    
    // Inventory
    INVENTORY: '/inventory',
    INVENTORY_BY_ID: '/inventory/:id',
    INVENTORY_BULK: '/inventory/bulk',
    INVENTORY_ALERT: '/inventory/alerts',
    
    // Users (Admin only)
    USERS: '/users',
    USER_BY_ID: '/users/:id',
    USER_ROLES: '/users/:id/roles',
    
    // Analytics and Reports
    ANALYTICS: '/analytics',
    DASHBOARD: '/analytics/dashboard',
    REPORTS: '/reports',
    SALES_REPORT: '/reports/sales',
    INVENTORY_REPORT: '/reports/inventory',
    USER_ACTIVITY: '/reports/user-activity',
    
    // Webhooks
    WEBHOOKS: '/webhooks',
    WEBHOOK_BY_ID: '/webhooks/:id'
  },

  // Default pagination settings
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    DEFAULT_SORT_ORDER: 'desc'
  },

  // Order statuses
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    PACKED: 'packed',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },

  // Transaction types
  TRANSACTION_TYPES: {
    PAYMENT: 'payment',
    REFUND: 'refund',
    ADJUSTMENT: 'adjustment',
    FEE: 'fee'
  },

  // Transaction statuses
  TRANSACTION_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  },

  // Inventory statuses
  INVENTORY_STATUS: {
    IN_STOCK: 'in_stock',
    LOW_STOCK: 'low_stock',
    OUT_OF_STOCK: 'out_of_stock',
    DISCONTINUED: 'discontinued'
  },

  // User statuses
  USER_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING: 'pending'
  },

  // HTTP Status codes for error handling
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  // Error messages
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
    UNAUTHORIZED: 'Authentication required. Please log in.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    NOT_FOUND: 'The requested resource was not found.',
    VALIDATION_ERROR: 'Invalid input data. Please check your request.',
    SERVER_ERROR: 'Server error occurred. Please try again later.',
    TIMEOUT: 'Request timed out. Please try again.',
    RATE_LIMIT: 'Too many requests. Please wait before trying again.'
  },

  // Request retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000, // 1 second
    BACKOFF_FACTOR: 2 // Exponential backoff
  },

  // Caching configuration
  CACHE: {
    ENABLED: true,
    TTL: 300000, // 5 minutes
    STORAGE_KEY: 'ic_spicy_logistics_cache'
  },

  // Validation rules
  VALIDATION: {
    ORDER_ID_PATTERN: /^ORD-[A-Z0-9]{8,}$/,
    TRANSACTION_ID_PATTERN: /^TXN-[A-Z0-9]{8,}$/,
    SKU_PATTERN: /^[A-Z0-9-]{3,20}$/,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_PATTERN: /^\+?[\d\s\-\(\)]{10,}$/
  },

  // Feature flags
  FEATURES: {
    REAL_TIME_UPDATES: true,
    BULK_OPERATIONS: true,
    ADVANCED_FILTERING: true,
    EXPORT_REPORTS: true,
    WEBHOOK_NOTIFICATIONS: true
  }
};

// Environment-specific overrides
const ENV = process.env.NODE_ENV || 'development';

if (ENV === 'development') {
  // Development environment settings
  LOGISTICS_CONFIG.BASE_URL = 'https://icspicy-logistics-ynt.caffeine.xyz/api/v1';
  LOGISTICS_CONFIG.CACHE.ENABLED = false;
  LOGISTICS_CONFIG.RETRY.MAX_ATTEMPTS = 1;
} else if (ENV === 'staging') {
  // Staging environment settings
  LOGISTICS_CONFIG.BASE_URL = 'https://staging-icspicy-logistics-ynt.caffeine.xyz/api/v1';
} else if (ENV === 'production') {
  // Production environment settings
  LOGISTICS_CONFIG.TIMEOUT = 60000; // Longer timeout for production
  LOGISTICS_CONFIG.RETRY.MAX_ATTEMPTS = 5;
}

export default LOGISTICS_CONFIG;


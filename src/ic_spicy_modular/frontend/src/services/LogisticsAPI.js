/**
 * IC SPICY Co-op Logistics API Integration
 * 
 * Secure API client for communicating with the logistics application
 * at https://icspicy-logistics-ynt.caffeine.xyz
 * 
 * Features:
 * - HTTPS-only communication
 * - JWT/API key authentication
 * - Role-based access control
 * - Input validation and sanitization
 * - Pagination and filtering support
 * - Standardized error handling
 * - Request/response logging
 */

class LogisticsAPI {
  constructor() {
    this.baseURL = 'https://icspicy-logistics-ynt.caffeine.xyz/api/v1';
    this.apiKey = null;
    this.authToken = null;
    this.userRole = null;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'IC-SPICY-Frontend/1.0'
    };
  }

  /**
   * Initialize API with authentication credentials
   * @param {Object} config - Configuration object
   * @param {string} config.apiKey - API key for authentication
   * @param {string} config.authToken - JWT token (optional)
   * @param {string} config.userRole - User role for access control
   */
  async initialize(config) {
    try {
      this.apiKey = config.apiKey;
      this.authToken = config.authToken;
      this.userRole = config.userRole;

      // Validate connection and authentication
      const healthCheck = await this.checkConnection();
      if (!healthCheck.success) {
        throw new Error('Failed to connect to logistics API');
      }

      console.log('✅ Logistics API initialized successfully');
      return { success: true, message: 'API initialized' };
    } catch (error) {
      console.error('❌ Failed to initialize Logistics API:', error);
      throw error;
    }
  }

  /**
   * Build authenticated headers for requests
   */
  getAuthHeaders() {
    const headers = { ...this.defaultHeaders };
    
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  /**
   * Make authenticated HTTP request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @param {Object} params - Query parameters
   */
  async makeRequest(method, endpoint, data = null, params = {}) {
    try {
      const url = new URL(`${this.baseURL}${endpoint}`);
      
      // Add query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          url.searchParams.append(key, params[key]);
        }
      });

      const config = {
        method: method.toUpperCase(),
        headers: this.getAuthHeaders(),
        mode: 'cors',
        credentials: 'include'
      };

      // Add request body for POST/PUT/PATCH
      if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.body = JSON.stringify(this.sanitizeInput(data));
      }

      console.log(`🌐 ${method.toUpperCase()} ${url.toString()}`);
      
      const response = await fetch(url.toString(), config);
      const responseData = await this.handleResponse(response);
      
      return responseData;
    } catch (error) {
      console.error(`❌ API Request failed: ${method} ${endpoint}`, error);
      throw this.formatError(error);
    }
  }

  /**
   * Handle API response and errors
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      throw {
        status: response.status,
        statusText: response.statusText,
        message: data.message || 'Request failed',
        details: data.details || null,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      data: data,
      status: response.status,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Sanitize input data to prevent injection attacks
   */
  sanitizeInput(data) {
    if (typeof data === 'string') {
      return data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Format error for consistent error handling
   */
  formatError(error) {
    return {
      success: false,
      error: {
        message: error.message || 'Unknown error occurred',
        status: error.status || 500,
        details: error.details || null,
        timestamp: error.timestamp || new Date().toISOString()
      }
    };
  }

  /**
   * Check role-based permissions
   */
  checkPermission(requiredRole) {
    const roleHierarchy = {
      'guest': 0,
      'user': 1,
      'manager': 2,
      'admin': 3,
      'superadmin': 4
    };

    const userLevel = roleHierarchy[this.userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      throw new Error(`Insufficient permissions. Required: ${requiredRole}, Current: ${this.userRole}`);
    }

    return true;
  }

  /**
   * Health check endpoint
   */
  async checkConnection() {
    try {
      return await this.makeRequest('GET', '/health');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // ORDER MANAGEMENT ENDPOINTS
  // ========================================

  /**
   * List orders with filtering and pagination
   * @param {Object} filters - Filter options
   * @param {number} filters.page - Page number (default: 1)
   * @param {number} filters.limit - Items per page (default: 20)
   * @param {string} filters.status - Order status filter
   * @param {string} filters.dateFrom - Start date filter (ISO string)
   * @param {string} filters.dateTo - End date filter (ISO string)
   * @param {string} filters.userId - User ID filter
   * @param {string} filters.search - Search query
   */
  async listOrders(filters = {}) {
    try {
      const params = {
        page: filters.page || 1,
        limit: Math.min(filters.limit || 20, 100), // Max 100 items per page
        status: filters.status || null,
        date_from: filters.dateFrom || null,
        date_to: filters.dateTo || null,
        user_id: filters.userId || null,
        search: filters.search || null,
        sort_by: filters.sortBy || 'created_at',
        sort_order: filters.sortOrder || 'desc'
      };

      return await this.makeRequest('GET', '/orders', null, params);
    } catch (error) {
      console.error('Failed to list orders:', error);
      throw error;
    }
  }

  /**
   * Get specific order details
   * @param {string} orderId - Order ID
   */
  async getOrder(orderId) {
    try {
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      return await this.makeRequest('GET', `/orders/${orderId}`);
    } catch (error) {
      console.error(`Failed to get order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new order
   * @param {Object} orderData - Order information
   */
  async createOrder(orderData) {
    try {
      // Validate required fields
      const requiredFields = ['items', 'customer', 'shipping', 'total'];
      for (const field of requiredFields) {
        if (!orderData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Add metadata
      const enrichedOrderData = {
        ...orderData,
        source: 'ic-spicy-frontend',
        created_at: new Date().toISOString(),
        status: 'pending'
      };

      return await this.makeRequest('POST', '/orders', enrichedOrderData);
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @param {string} notes - Optional notes
   */
  async updateOrderStatus(orderId, status, notes = null) {
    try {
      this.checkPermission('manager'); // Require manager role or higher

      const updateData = {
        status,
        notes,
        updated_at: new Date().toISOString(),
        updated_by: this.userRole
      };

      return await this.makeRequest('PATCH', `/orders/${orderId}/status`, updateData);
    } catch (error) {
      console.error(`Failed to update order ${orderId} status:`, error);
      throw error;
    }
  }

  // ========================================
  // TRANSACTION MANAGEMENT ENDPOINTS
  // ========================================

  /**
   * List transactions with filtering
   * @param {Object} filters - Filter options
   */
  async listTransactions(filters = {}) {
    try {
      const params = {
        page: filters.page || 1,
        limit: Math.min(filters.limit || 20, 100),
        type: filters.type || null, // payment, refund, adjustment
        status: filters.status || null,
        date_from: filters.dateFrom || null,
        date_to: filters.dateTo || null,
        order_id: filters.orderId || null,
        amount_min: filters.amountMin || null,
        amount_max: filters.amountMax || null
      };

      return await this.makeRequest('GET', '/transactions', null, params);
    } catch (error) {
      console.error('Failed to list transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction details
   * @param {string} transactionId - Transaction ID
   */
  async getTransaction(transactionId) {
    try {
      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }

      return await this.makeRequest('GET', `/transactions/${transactionId}`);
    } catch (error) {
      console.error(`Failed to get transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Create transaction record
   * @param {Object} transactionData - Transaction information
   */
  async createTransaction(transactionData) {
    try {
      this.checkPermission('manager'); // Require manager role or higher

      const requiredFields = ['order_id', 'amount', 'type', 'payment_method'];
      for (const field of requiredFields) {
        if (!transactionData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      const enrichedData = {
        ...transactionData,
        created_at: new Date().toISOString(),
        created_by: this.userRole,
        status: 'completed'
      };

      return await this.makeRequest('POST', '/transactions', enrichedData);
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  }

  // ========================================
  // INVENTORY MANAGEMENT ENDPOINTS
  // ========================================

  /**
   * List inventory items
   * @param {Object} filters - Filter options
   */
  async listInventory(filters = {}) {
    try {
      const params = {
        page: filters.page || 1,
        limit: Math.min(filters.limit || 50, 100),
        category: filters.category || null,
        status: filters.status || null, // in_stock, low_stock, out_of_stock
        search: filters.search || null,
        sort_by: filters.sortBy || 'name',
        sort_order: filters.sortOrder || 'asc'
      };

      return await this.makeRequest('GET', '/inventory', null, params);
    } catch (error) {
      console.error('Failed to list inventory:', error);
      throw error;
    }
  }

  /**
   * Get inventory item details
   * @param {string} itemId - Item ID or SKU
   */
  async getInventoryItem(itemId) {
    try {
      if (!itemId) {
        throw new Error('Item ID is required');
      }

      return await this.makeRequest('GET', `/inventory/${itemId}`);
    } catch (error) {
      console.error(`Failed to get inventory item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Update inventory levels
   * @param {string} itemId - Item ID
   * @param {number} quantity - New quantity
   * @param {string} reason - Reason for update
   */
  async updateInventory(itemId, quantity, reason = 'manual_update') {
    try {
      this.checkPermission('manager'); // Require manager role or higher

      const updateData = {
        quantity: parseInt(quantity),
        reason,
        updated_at: new Date().toISOString(),
        updated_by: this.userRole
      };

      return await this.makeRequest('PATCH', `/inventory/${itemId}`, updateData);
    } catch (error) {
      console.error(`Failed to update inventory ${itemId}:`, error);
      throw error;
    }
  }

  // ========================================
  // USER MANAGEMENT ENDPOINTS (Admin Only)
  // ========================================

  /**
   * List users (Admin only)
   * @param {Object} filters - Filter options
   */
  async listUsers(filters = {}) {
    try {
      this.checkPermission('admin'); // Admin only

      const params = {
        page: filters.page || 1,
        limit: Math.min(filters.limit || 20, 100),
        role: filters.role || null,
        status: filters.status || null,
        search: filters.search || null
      };

      return await this.makeRequest('GET', '/users', null, params);
    } catch (error) {
      console.error('Failed to list users:', error);
      throw error;
    }
  }

  /**
   * Get user details (Admin only)
   * @param {string} userId - User ID
   */
  async getUser(userId) {
    try {
      this.checkPermission('admin'); // Admin only

      if (!userId) {
        throw new Error('User ID is required');
      }

      return await this.makeRequest('GET', `/users/${userId}`);
    } catch (error) {
      console.error(`Failed to get user ${userId}:`, error);
      throw error;
    }
  }

  // ========================================
  // ANALYTICS AND REPORTING
  // ========================================

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(timeframe = '30d') {
    try {
      this.checkPermission('manager'); // Manager role or higher

      const params = { timeframe };
      return await this.makeRequest('GET', '/analytics/dashboard', null, params);
    } catch (error) {
      console.error('Failed to get dashboard analytics:', error);
      throw error;
    }
  }

  /**
   * Generate sales report
   * @param {Object} options - Report options
   */
  async generateSalesReport(options = {}) {
    try {
      this.checkPermission('manager'); // Manager role or higher

      const params = {
        date_from: options.dateFrom || null,
        date_to: options.dateTo || null,
        format: options.format || 'json', // json, csv, pdf
        group_by: options.groupBy || 'day' // day, week, month
      };

      return await this.makeRequest('GET', '/reports/sales', null, params);
    } catch (error) {
      console.error('Failed to generate sales report:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const logisticsAPI = new LogisticsAPI();
export default LogisticsAPI;


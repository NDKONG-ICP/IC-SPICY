/**
 * React Hook for IC SPICY Co-op Logistics API Integration
 * 
 * Provides React components with easy access to logistics API functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logisticsAPI } from '../services/LogisticsAPI.js';
import { logisticsAuth } from '../services/LogisticsAuth.js';
import { LOGISTICS_CONFIG } from '../config/logistics.js';

export const useLogistics = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const initRef = useRef(false);

  /**
   * Initialize logistics API with authentication
   */
  const initialize = useCallback(async (credentials) => {
    if (initRef.current) return;
    initRef.current = true;

    try {
      setLoading(true);
      setError(null);

      // Initialize authentication
      await logisticsAuth.initialize(credentials);
      
      // Initialize API with auth
      await logisticsAPI.initialize({
        apiKey: logisticsAuth.apiKey,
        authToken: logisticsAuth.authToken,
        userRole: logisticsAuth.userRole
      });

      setIsInitialized(true);
      setIsAuthenticated(logisticsAuth.isAuthenticated());
      setUserRole(logisticsAuth.getUserRole());

      console.log('✅ Logistics API initialized in React hook');
    } catch (error) {
      setError(error.message);
      console.error('❌ Failed to initialize logistics API:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout from logistics API
   */
  const logout = useCallback(async () => {
    try {
      await logisticsAuth.logout();
      setIsAuthenticated(false);
      setUserRole(null);
      setIsInitialized(false);
      initRef.current = false;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  /**
   * Check permissions for current user
   */
  const hasPermission = useCallback((requiredRole) => {
    return logisticsAuth.hasPermission(requiredRole);
  }, [userRole]);

  // Monitor authentication status
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(logisticsAuth.isAuthenticated());
      setUserRole(logisticsAuth.getUserRole());
    };

    checkAuth();
    const interval = setInterval(checkAuth, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return {
    isInitialized,
    isAuthenticated,
    userRole,
    loading,
    error,
    initialize,
    logout,
    hasPermission,
    setError // Allow components to clear errors
  };
};

/**
 * Hook for order management
 */
export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  /**
   * Load orders with filters
   */
  const loadOrders = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await logisticsAPI.listOrders(filters);
      
      if (response.success) {
        setOrders(response.data.orders || []);
        setPagination(response.data.pagination || pagination);
      }
    } catch (error) {
      setError(error.message);
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination]);

  /**
   * Load specific order details
   */
  const loadOrder = useCallback(async (orderId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await logisticsAPI.getOrder(orderId);
      
      if (response.success) {
        setSelectedOrder(response.data);
        return response.data;
      }
    } catch (error) {
      setError(error.message);
      console.error('Failed to load order:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new order
   */
  const createOrder = useCallback(async (orderData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await logisticsAPI.createOrder(orderData);
      
      if (response.success) {
        // Reload orders to include the new one
        await loadOrders();
        return response.data;
      }
    } catch (error) {
      setError(error.message);
      console.error('Failed to create order:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadOrders]);

  /**
   * Update order status
   */
  const updateOrderStatus = useCallback(async (orderId, status, notes) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await logisticsAPI.updateOrderStatus(orderId, status, notes);
      
      if (response.success) {
        // Update the order in local state
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status, notes } : order
        ));
        
        // Update selected order if it's the one being updated
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => ({ ...prev, status, notes }));
        }
        
        return response.data;
      }
    } catch (error) {
      setError(error.message);
      console.error('Failed to update order status:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedOrder]);

  return {
    orders,
    selectedOrder,
    loading,
    error,
    pagination,
    loadOrders,
    loadOrder,
    createOrder,
    updateOrderStatus,
    setSelectedOrder,
    setError
  };
};

/**
 * Hook for transaction management
 */
export const useTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  /**
   * Load transactions with filters
   */
  const loadTransactions = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await logisticsAPI.listTransactions(filters);
      
      if (response.success) {
        setTransactions(response.data.transactions || []);
        setPagination(response.data.pagination || pagination);
      }
    } catch (error) {
      setError(error.message);
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination]);

  /**
   * Load specific transaction details
   */
  const loadTransaction = useCallback(async (transactionId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await logisticsAPI.getTransaction(transactionId);
      
      if (response.success) {
        setSelectedTransaction(response.data);
        return response.data;
      }
    } catch (error) {
      setError(error.message);
      console.error('Failed to load transaction:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new transaction
   */
  const createTransaction = useCallback(async (transactionData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await logisticsAPI.createTransaction(transactionData);
      
      if (response.success) {
        await loadTransactions();
        return response.data;
      }
    } catch (error) {
      setError(error.message);
      console.error('Failed to create transaction:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadTransactions]);

  return {
    transactions,
    selectedTransaction,
    loading,
    error,
    pagination,
    loadTransactions,
    loadTransaction,
    createTransaction,
    setSelectedTransaction,
    setError
  };
};

/**
 * Hook for inventory management
 */
export const useInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  /**
   * Load inventory with filters
   */
  const loadInventory = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await logisticsAPI.listInventory(filters);
      
      if (response.success) {
        setInventory(response.data.items || []);
        setPagination(response.data.pagination || pagination);
      }
    } catch (error) {
      setError(error.message);
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination]);

  /**
   * Load specific inventory item
   */
  const loadInventoryItem = useCallback(async (itemId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await logisticsAPI.getInventoryItem(itemId);
      
      if (response.success) {
        setSelectedItem(response.data);
        return response.data;
      }
    } catch (error) {
      setError(error.message);
      console.error('Failed to load inventory item:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update inventory levels
   */
  const updateInventory = useCallback(async (itemId, quantity, reason) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await logisticsAPI.updateInventory(itemId, quantity, reason);
      
      if (response.success) {
        // Update local state
        setInventory(prev => prev.map(item => 
          item.id === itemId ? { ...item, quantity } : item
        ));
        
        if (selectedItem && selectedItem.id === itemId) {
          setSelectedItem(prev => ({ ...prev, quantity }));
        }
        
        return response.data;
      }
    } catch (error) {
      setError(error.message);
      console.error('Failed to update inventory:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedItem]);

  return {
    inventory,
    selectedItem,
    loading,
    error,
    pagination,
    loadInventory,
    loadInventoryItem,
    updateInventory,
    setSelectedItem,
    setError
  };
};

/**
 * Hook for analytics and reporting
 */
export const useLogisticsAnalytics = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load dashboard analytics
   */
  const loadDashboard = useCallback(async (timeframe = '30d') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await logisticsAPI.getDashboardAnalytics(timeframe);
      
      if (response.success) {
        setDashboardData(response.data);
        return response.data;
      }
    } catch (error) {
      setError(error.message);
      console.error('Failed to load dashboard analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate sales report
   */
  const generateSalesReport = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await logisticsAPI.generateSalesReport(options);
      
      if (response.success) {
        setReportData(response.data);
        return response.data;
      }
    } catch (error) {
      setError(error.message);
      console.error('Failed to generate sales report:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    dashboardData,
    reportData,
    loading,
    error,
    loadDashboard,
    generateSalesReport,
    setError
  };
};

export default useLogistics;


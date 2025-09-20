/**
 * React Hook for Real Data Integration
 * 
 * Connects to actual IC canisters and provides real transaction, inventory, and analytics data
 * Replaces demo/mock data with live blockchain data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '../WalletContext';
import { realDataService } from '../services/RealDataService';

export const useRealData = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const initRef = useRef(false);
  const { canisters, agent } = useWallet();

  /**
   * Initialize real data service with actual canisters
   */
  const initialize = useCallback(async () => {
    if (initRef.current || !canisters || !agent) return;
    initRef.current = true;

    try {
      setLoading(true);
      setError(null);

      const success = await realDataService.initialize(canisters, agent);
      setIsInitialized(success);

      if (success) {
        console.log('✅ Real Data Service initialized successfully');
      } else {
        throw new Error('Failed to initialize Real Data Service');
      }
    } catch (error) {
      setError(error.message);
      console.error('❌ Failed to initialize real data:', error);
    } finally {
      setLoading(false);
    }
  }, [canisters, agent]);

  // Auto-initialize when wallet is connected, or in POS-only mode
  useEffect(() => {
    if (canisters && agent && !isInitialized && !initRef.current) {
      initialize();
    } else if (!canisters && !isInitialized && !initRef.current) {
      // Initialize in POS-only mode for local transaction data
      initRef.current = true;
      try {
        setLoading(true);
        realDataService.initializePOSMode();
        setIsInitialized(true);
        console.log('✅ Real Data Service initialized in POS-only mode');
      } catch (error) {
        setError(error.message);
        console.error('❌ Failed to initialize POS-only mode:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [canisters, agent, isInitialized, initialize]);

  return {
    isInitialized,
    loading,
    error,
    initialize,
    setError
  };
};

/**
 * Hook for real transaction data
 */
export const useRealTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const { isInitialized } = useRealData();

  /**
   * Load real transactions from wallet canister
   */
  const loadTransactions = useCallback(async (filters = {}) => {
    if (!isInitialized) {
      console.warn('⚠️ Real Data Service not initialized, cannot load transactions');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await realDataService.getTransactions(filters);
      
      if (response.success) {
        setTransactions(response.data.transactions);
        setPagination(response.data.pagination);
      } else {
        throw new Error(response.error || 'Failed to load transactions');
      }
    } catch (error) {
      setError(error.message);
      console.error('❌ Failed to load real transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  // Auto-load transactions when initialized
  useEffect(() => {
    if (isInitialized) {
      loadTransactions();
    }
  }, [isInitialized, loadTransactions]);

  return {
    transactions,
    loading,
    error,
    pagination,
    loadTransactions,
    setError
  };
};

/**
 * Hook for real inventory data
 */
export const useRealInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const { isInitialized } = useRealData();

  /**
   * Load real inventory from shop canister
   */
  const loadInventory = useCallback(async (filters = {}) => {
    if (!isInitialized) {
      console.warn('⚠️ Real Data Service not initialized, cannot load inventory');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await realDataService.getInventory(filters);
      
      if (response.success) {
        setInventory(response.data.items);
        setPagination(response.data.pagination);
        setSummary(response.data.summary || {});
      } else {
        throw new Error(response.error || 'Failed to load inventory');
      }
    } catch (error) {
      setError(error.message);
      console.error('❌ Failed to load real inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  // Auto-load inventory when initialized
  useEffect(() => {
    if (isInitialized) {
      loadInventory();
    }
  }, [isInitialized, loadInventory]);

  return {
    inventory,
    summary,
    loading,
    error,
    pagination,
    loadInventory,
    setError
  };
};

/**
 * Hook for real analytics data
 */
export const useRealAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useRealData();

  /**
   * Load real analytics from multiple canisters
   */
  const loadAnalytics = useCallback(async (timeframe = '30d') => {
    if (!isInitialized) {
      console.warn('⚠️ Real Data Service not initialized, cannot load analytics');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await realDataService.getAnalytics(timeframe);
      
      if (response.success) {
        setAnalyticsData(response.data);
      } else {
        throw new Error(response.error || 'Failed to load analytics');
      }
    } catch (error) {
      setError(error.message);
      console.error('❌ Failed to load real analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  // Auto-load analytics when initialized
  useEffect(() => {
    if (isInitialized) {
      loadAnalytics();
    }
  }, [isInitialized, loadAnalytics]);

  return {
    analyticsData,
    loading,
    error,
    loadAnalytics,
    setError
  };
};

/**
 * Hook for real order management
 */
export const useRealOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isInitialized } = useRealData();

  /**
   * Create real order
   */
  const createOrder = useCallback(async (orderData) => {
    if (!isInitialized) {
      throw new Error('Real Data Service not initialized');
    }

    try {
      setLoading(true);
      setError(null);

      const response = await realDataService.createOrder(orderData);
      
      if (response.success) {
        setOrders(prev => [response.data, ...prev]);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create order');
      }
    } catch (error) {
      setError(error.message);
      console.error('❌ Failed to create real order:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  return {
    orders,
    loading,
    error,
    createOrder,
    setError
  };
};

export default useRealData;

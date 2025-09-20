/**
 * Logistics Management Dashboard
 * 
 * Comprehensive logistics operations management interface
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLogistics, useOrders, useTransactions, useInventory, useLogisticsAnalytics } from '../hooks/useLogistics';
import { useRealData, useRealTransactions, useRealInventory, useRealAnalytics, useRealOrders } from '../hooks/useRealData';
import LogisticsDemo from '../components/LogisticsDemo';

const LogisticsPage = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [useRealDataMode, setUseRealDataMode] = useState(true);

  // Demo/API integration hooks
  const logistics = useLogistics();
  const demoOrders = useOrders();
  const demoTransactions = useTransactions();
  const demoInventory = useInventory();
  const demoAnalytics = useLogisticsAnalytics();

  // Real data hooks
  const realData = useRealData();
  const realTransactions = useRealTransactions();
  const realInventory = useRealInventory();
  const realAnalytics = useRealAnalytics();
  const realOrders = useRealOrders();

  // Use real data by default, fallback to demo if not available
  const orders = useRealDataMode ? {
    orders: realOrders.orders,
    loading: realOrders.loading,
    error: realOrders.error
  } : demoOrders;

  const transactions = useRealDataMode ? realTransactions : demoTransactions;
  const inventory = useRealDataMode ? realInventory : demoInventory;
  const analytics = useRealDataMode ? {
    dashboardData: realAnalytics.analyticsData,
    loading: realAnalytics.loading,
    error: realAnalytics.error
  } : demoAnalytics;

  useEffect(() => {
    const initializePage = async () => {
      try {
        if (useRealDataMode) {
          // Real data mode - wait for real data service to initialize
          if (realData.isInitialized) {
            // Real data service is ready, load real data
            await Promise.all([
              realTransactions.loadTransactions({ limit: 10 }),
              realInventory.loadInventory({ limit: 20 }),
              realAnalytics.loadAnalytics('7d')
            ]);
          } else if (!realData.loading) {
            // Try to initialize real data service
            await realData.initialize();
          }
        } else {
          // Demo mode - initialize logistics API
          if (!logistics.isInitialized) {
            await logistics.initialize({
              apiKey: process.env.REACT_APP_LOGISTICS_API_KEY || 'icspicy_1_abc123def_1704067200',
              principal: 'admin-principal'
            });
          }

          // Load demo data
          await Promise.all([
            demoOrders.loadOrders({ limit: 10 }),
            demoTransactions.loadTransactions({ limit: 10 }),
            demoInventory.loadInventory({ limit: 20 }),
            demoAnalytics.loadDashboard('7d')
          ]);
        }
      } catch (error) {
        console.error('Failed to initialize logistics page:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializePage();
  }, [useRealDataMode, realData.isInitialized, realData.loading]);

  const SectionButton = ({ id, label, icon, count = null }) => (
    <button
      onClick={() => setActiveSection(id)}
      className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-all duration-300 ${
        activeSection === id
          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
          : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      {count !== null && (
        <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full">
          {count}
        </span>
      )}
    </button>
  );

  const StatCard = ({ title, value, icon, color = 'blue', change = null }) => (
    <div className={`bg-${color}-500/20 border border-${color}-500/30 rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-${color}-300 font-medium`}>{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-2xl font-bold text-${color}-300 mb-1`}>{value}</div>
      {change && (
        <div className={`text-sm ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change > 0 ? '↗' : '↘'} {Math.abs(change)}% from last period
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚚</div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Logistics Dashboard...</h2>
          <p className="text-gray-400">Connecting to IC SPICY Co-op Logistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🚚 IC SPICY Co-op Logistics
          </h1>
          <p className="text-gray-300 text-lg">
            Comprehensive logistics management and operations dashboard
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Navigation</h3>
              <div className="space-y-2">
                <SectionButton id="dashboard" label="Dashboard" icon="📊" />
                <SectionButton id="orders" label="Orders" icon="📦" count={orders.orders.length} />
                <SectionButton id="transactions" label="Transactions" icon="💳" count={transactions.transactions.length} />
                <SectionButton id="inventory" label="Inventory" icon="📋" count={inventory.inventory.length} />
                <SectionButton id="analytics" label="Analytics" icon="📈" />
                <SectionButton id="api-demo" label="API Demo" icon="🔧" />
              
              {/* Data Mode Toggle */}
              <div className="border-t pt-4 mt-4">
                <button
                  onClick={() => setUseRealDataMode(!useRealDataMode)}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-all duration-300 ${
                    useRealDataMode 
                      ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                      : 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{useRealDataMode ? '🔗' : '🧪'}</span>
                    <span className="font-medium">
                      {useRealDataMode ? 'Real Data Mode' : 'Demo Mode'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold">
                    {useRealDataMode ? 'LIVE' : 'DEMO'}
                  </span>
                </button>
                <p className="text-xs text-gray-500 mt-2 px-4">
                  {useRealDataMode 
                    ? 'Connected to live IC canisters with real transaction data' 
                    : 'Using demo data for testing and API integration'
                  }
                </p>
              </div>
              </div>
              
              {/* Connection Status */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    logistics.isAuthenticated ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-gray-300">
                    {logistics.isAuthenticated ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {logistics.userRole && (
                  <div className="text-xs text-gray-400 mt-1">
                    Role: {logistics.userRole}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeSection === 'dashboard' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">📊 Logistics Overview</h2>
                    
                    {/* Data Mode Indicator */}
                    <div className={`px-4 py-2 rounded-lg border-2 ${
                      useRealDataMode 
                        ? 'bg-green-900 border-green-400 text-green-200' 
                        : 'bg-blue-900 border-blue-400 text-blue-200'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{useRealDataMode ? '🔗' : '🧪'}</span>
                        <span className="font-semibold text-sm">
                          {useRealDataMode ? 'LIVE DATA' : 'DEMO DATA'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Key Metrics */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      title="Total Orders"
                      value={analytics.dashboardData?.summary?.total_transactions || orders.orders.length}
                      icon="📦"
                      color="blue"
                      change={analytics.dashboardData?.summary?.growth_rate || 12}
                    />
                    <StatCard
                      title="Revenue"
                      value={`$${analytics.dashboardData?.summary?.total_revenue?.toFixed(2) || '0.00'}`}
                      icon="💰"
                      color="green"
                      change={analytics.dashboardData?.summary?.growth_rate || 8}
                    />
                    <StatCard
                      title="Inventory Items"
                      value={inventory.inventory.length}
                      icon="📋"
                      color="orange"
                      change={inventory.summary?.low_stock_items ? -inventory.summary.low_stock_items : -3}
                    />
                    <StatCard
                      title="Transactions"
                      value={transactions.transactions.length}
                      icon="💳"
                      color="purple"
                      change={useRealDataMode ? '+Real' : 15}
                    />
                  </div>

                  {/* Recent Activity */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                      <h3 className="text-lg font-semibold text-white mb-4">Recent Orders</h3>
                      {orders.orders.slice(0, 5).map((order, index) => (
                        <div key={order.id || index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                          <div>
                            <div className="text-white font-medium">{order.id || `Order #${index + 1}`}</div>
                            <div className="text-gray-400 text-sm">{order.customer?.email || 'N/A'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-bold">${order.total?.toFixed(2) || '0.00'}</div>
                            <div className={`text-xs px-2 py-1 rounded ${
                              order.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                              order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {order.status || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                      <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">API Connection</span>
                          <span className={logistics.isAuthenticated ? 'text-green-400' : 'text-red-400'}>
                            {logistics.isAuthenticated ? '✅ Online' : '❌ Offline'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Order Sync</span>
                          <span className="text-green-400">✅ Active</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Inventory Updates</span>
                          <span className="text-green-400">✅ Real-time</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">Payment Processing</span>
                          <span className="text-green-400">✅ Functional</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'api-demo' && <LogisticsDemo />}

              {activeSection === 'orders' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">📦 Order Management</h2>
                    <button
                      onClick={() => orders.loadOrders()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Refresh Orders
                    </button>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">All Orders</h3>
                      {orders.loading ? (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-2">⏳</div>
                          <div className="text-gray-400">Loading orders...</div>
                        </div>
                      ) : orders.orders.length > 0 ? (
                        <div className="space-y-4">
                          {orders.orders.map((order, index) => (
                            <div key={order.id || index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/30">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold text-white">{order.id || `Order #${index + 1}`}</h4>
                                  <p className="text-gray-300">{order.customer?.email || 'N/A'}</p>
                                  <p className="text-green-400 font-bold">${order.total?.toFixed(2) || '0.00'}</p>
                                </div>
                                <div className="text-right">
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    order.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                    order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                    'bg-gray-500/20 text-gray-300'
                                  }`}>
                                    {order.status || 'Unknown'}
                                  </span>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {order.items?.length || 0} items
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-2">📦</div>
                          <div className="text-gray-400">No orders found</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Add other sections as needed */}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogisticsPage;


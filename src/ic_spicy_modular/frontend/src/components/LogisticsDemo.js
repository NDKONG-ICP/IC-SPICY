/**
 * Logistics API Demo Component
 * 
 * Demonstrates the integration with IC SPICY Co-op Logistics API
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLogistics, useOrders, useTransactions, useInventory } from '../hooks/useLogistics';
import { LOGISTICS_CONFIG } from '../config/logistics';

const LogisticsDemo = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [apiStatus, setApiStatus] = useState('disconnected');
  
  const logistics = useLogistics();
  const orders = useOrders();
  const transactions = useTransactions();
  const inventory = useInventory();

  // Monitor API status
  useEffect(() => {
    if (logistics.isInitialized && logistics.isAuthenticated) {
      setApiStatus('connected');
    } else if (logistics.isInitialized) {
      setApiStatus('initialized');
    } else {
      setApiStatus('disconnected');
    }
  }, [logistics.isInitialized, logistics.isAuthenticated]);

  const handleInitialize = async () => {
    try {
      await logistics.initialize({
        apiKey: 'demo-api-key-for-testing',
        principal: 'demo-principal'
      });
    } catch (error) {
      console.error('Failed to initialize logistics:', error);
    }
  };

  const handleLoadOrders = async () => {
    try {
      await orders.loadOrders({
        page: 1,
        limit: 10,
        status: 'confirmed'
      });
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const handleCreateTestOrder = async () => {
    try {
      const testOrder = {
        items: [
          {
            id: 'demo-item-1',
            variety: 'Carolina Reaper',
            size: 'Large',
            price: 45.00,
            quantity: 1,
            subtotal: 45.00,
            category: 'plants'
          }
        ],
        customer: {
          principal: 'demo-principal',
          email: 'demo@icspicy.com'
        },
        shipping: {
          firstName: 'Demo',
          lastName: 'User',
          email: 'demo@icspicy.com',
          address: '123 Demo Street',
          city: 'Demo City',
          state: 'CA',
          zipCode: '12345',
          country: 'United States'
        },
        billing: {
          sameAsShipping: true
        },
        total: 45.00
      };

      await orders.createOrder(testOrder);
    } catch (error) {
      console.error('Failed to create test order:', error);
    }
  };

  const StatusIndicator = ({ status }) => {
    const statusConfig = {
      connected: { color: 'green', text: 'Connected', icon: '✅' },
      initialized: { color: 'yellow', text: 'Initialized', icon: '🔄' },
      disconnected: { color: 'red', text: 'Disconnected', icon: '❌' }
    };

    const config = statusConfig[status] || statusConfig.disconnected;

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-${config.color}-500/20 border border-${config.color}-500/30`}>
        <span>{config.icon}</span>
        <span className={`text-${config.color}-300 text-sm font-medium`}>{config.text}</span>
      </div>
    );
  };

  const TabButton = ({ id, label, icon, active, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
        active 
          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
          : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-600/30">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">🚚 Logistics API Integration</h2>
          <p className="text-gray-300">
            Real-time connection to IC SPICY Co-op Logistics at{' '}
            <a 
              href="https://icspicy-logistics-ynt.caffeine.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              icspicy-logistics-ynt.caffeine.xyz
            </a>
          </p>
        </div>
        <StatusIndicator status={apiStatus} />
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton
          id="overview"
          label="Overview"
          icon="📊"
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        />
        <TabButton
          id="orders"
          label="Orders"
          icon="📦"
          active={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
        />
        <TabButton
          id="transactions"
          label="Transactions"
          icon="💳"
          active={activeTab === 'transactions'}
          onClick={() => setActiveTab('transactions')}
        />
        <TabButton
          id="inventory"
          label="Inventory"
          icon="📋"
          active={activeTab === 'inventory'}
          onClick={() => setActiveTab('inventory')}
        />
        <TabButton
          id="docs"
          label="API Docs"
          icon="📚"
          active={activeTab === 'docs'}
          onClick={() => setActiveTab('docs')}
        />
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-700/50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">🔌 Connection Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">API Initialized:</span>
                    <span className={logistics.isInitialized ? 'text-green-400' : 'text-red-400'}>
                      {logistics.isInitialized ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Authenticated:</span>
                    <span className={logistics.isAuthenticated ? 'text-green-400' : 'text-red-400'}>
                      {logistics.isAuthenticated ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">User Role:</span>
                    <span className="text-blue-400">{logistics.userRole || 'None'}</span>
                  </div>
                </div>
                
                {!logistics.isInitialized && (
                  <button
                    onClick={handleInitialize}
                    className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Initialize Connection
                  </button>
                )}
              </div>

              <div className="bg-gray-700/50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">⚡ API Features</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-300">Secure HTTPS Communication</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-300">JWT Authentication</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-300">Role-Based Access Control</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-300">Input Validation & Sanitization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-300">Pagination & Filtering</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-gray-300">Standardized Error Handling</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">🏗️ Architecture Overview</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
                  <h4 className="font-semibold text-blue-300 mb-2">Frontend (React)</h4>
                  <ul className="text-gray-300 space-y-1">
                    <li>• React Hooks Integration</li>
                    <li>• Authentication Manager</li>
                    <li>• API Service Layer</li>
                    <li>• Real-time Updates</li>
                  </ul>
                </div>
                <div className="bg-orange-500/20 rounded-lg p-4 border border-orange-500/30">
                  <h4 className="font-semibold text-orange-300 mb-2">API Layer</h4>
                  <ul className="text-gray-300 space-y-1">
                    <li>• RESTful Endpoints</li>
                    <li>• OpenAPI/Swagger Docs</li>
                    <li>• Rate Limiting</li>
                    <li>• Request Validation</li>
                  </ul>
                </div>
                <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                  <h4 className="font-semibold text-green-300 mb-2">Backend System</h4>
                  <ul className="text-gray-300 space-y-1">
                    <li>• Order Management</li>
                    <li>• Inventory Tracking</li>
                    <li>• Transaction Processing</li>
                    <li>• Analytics & Reporting</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">📦 Order Management</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleLoadOrders}
                  disabled={orders.loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {orders.loading ? 'Loading...' : 'Load Orders'}
                </button>
                <button
                  onClick={handleCreateTestOrder}
                  disabled={orders.loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Create Test Order
                </button>
              </div>
            </div>

            {orders.error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-300">Error: {orders.error}</p>
              </div>
            )}

            <div className="bg-gray-700/50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Recent Orders</h4>
              {orders.orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.orders.map((order, index) => (
                    <div key={order.id || index} className="bg-gray-600/50 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-white">{order.id || `Order #${index + 1}`}</p>
                          <p className="text-gray-300 text-sm">{order.customer?.email || 'N/A'}</p>
                          <p className="text-orange-400 font-bold">${order.total?.toFixed(2) || '0.00'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          order.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                          order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {order.status || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No orders loaded. Click "Load Orders" to fetch data.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">📚 API Documentation</h3>
            
            <div className="bg-gray-700/50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Available Endpoints</h4>
              <div className="space-y-4">
                {Object.entries(LOGISTICS_CONFIG.ENDPOINTS).map(([key, endpoint]) => (
                  <div key={key} className="flex items-center gap-4 p-3 bg-gray-600/50 rounded-lg">
                    <span className="text-blue-400 font-mono text-sm">{endpoint}</span>
                    <span className="text-gray-400 text-xs">{key.replace(/_/g, ' ').toLowerCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Authentication</h4>
              <div className="space-y-3 text-sm">
                <div className="bg-gray-600/50 rounded-lg p-3">
                  <p className="text-gray-300 mb-2">
                    <strong className="text-white">API Key:</strong> Include X-API-Key header for service authentication
                  </p>
                  <code className="text-blue-400 font-mono">X-API-Key: your-api-key-here</code>
                </div>
                <div className="bg-gray-600/50 rounded-lg p-3">
                  <p className="text-gray-300 mb-2">
                    <strong className="text-white">JWT Token:</strong> Include Authorization header for user authentication
                  </p>
                  <code className="text-blue-400 font-mono">Authorization: Bearer your-jwt-token-here</code>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-yellow-300 mb-4">⚠️ Development Note</h4>
              <p className="text-gray-300">
                This is a demonstration interface. In production, the logistics API at{' '}
                <a 
                  href="https://icspicy-logistics-ynt.caffeine.xyz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  icspicy-logistics-ynt.caffeine.xyz
                </a>{' '}
                would handle real order processing, inventory management, and shipping coordination.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LogisticsDemo;


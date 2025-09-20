/**
 * API Management Page
 * 
 * Interface for managing API keys and monitoring external integrations
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ApiKeyManager from '../components/ApiKeyManager';

const ApiPage = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);

  const SectionButton = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveSection(id)}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-300 ${
        activeSection === id
          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
          : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );

  const StatCard = ({ title, value, icon, color = 'blue' }) => (
    <div className={`bg-${color}-500/20 border border-${color}-500/30 rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-${color}-300 font-medium`}>{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-2xl font-bold text-${color}-300`}>{value}</div>
    </div>
  );

  if (showApiKeyManager) {
    return <ApiKeyManager onClose={() => setShowApiKeyManager(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🔌 API Management Center
          </h1>
          <p className="text-gray-300 text-lg">
            Manage API keys and external integrations for your dApp
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Navigation</h3>
              <div className="space-y-2">
                <SectionButton id="overview" label="Overview" icon="📊" />
                <SectionButton id="integrations" label="Integrations" icon="🔗" />
                <SectionButton id="analytics" label="Analytics" icon="📈" />
                <SectionButton id="settings" label="Settings" icon="⚙️" />
              </div>
              
              {/* Quick Actions */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Quick Actions</h4>
                <button
                  onClick={() => setShowApiKeyManager(true)}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                >
                  🔑 Manage API Keys
                </button>
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
              {activeSection === 'overview' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">📊 API Overview</h2>
                  
                  {/* Key Metrics */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                      title="Active API Keys"
                      value="3"
                      icon="🔑"
                      color="blue"
                    />
                    <StatCard
                      title="Total Requests Today"
                      value="1,247"
                      icon="📡"
                      color="green"
                    />
                    <StatCard
                      title="External Integrations"
                      value="2"
                      icon="🔗"
                      color="purple"
                    />
                  </div>

                  {/* Current Integrations */}
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">Current Integrations</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600/30">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">🚚</span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">IC SPICY Logistics</h4>
                            <p className="text-gray-400 text-sm">Transaction data synchronization</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-green-400 text-sm">Active</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600/30">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">📊</span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">Analytics Dashboard</h4>
                            <p className="text-gray-400 text-sm">Real-time reporting and insights</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-green-400 text-sm">Active</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowApiKeyManager(true)}
                      className="w-full mt-4 px-4 py-2 border border-orange-500/30 text-orange-300 rounded-lg hover:bg-orange-500/10 transition-colors"
                    >
                      + Add New Integration
                    </button>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent API Activity</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                        <div>
                          <div className="text-white font-medium">Transaction data requested</div>
                          <div className="text-gray-400 text-sm">IC SPICY Logistics - 2 minutes ago</div>
                        </div>
                        <div className="text-green-400 text-sm">✅ Success</div>
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                        <div>
                          <div className="text-white font-medium">Analytics data sync</div>
                          <div className="text-gray-400 text-sm">Analytics Dashboard - 15 minutes ago</div>
                        </div>
                        <div className="text-green-400 text-sm">✅ Success</div>
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                        <div>
                          <div className="text-white font-medium">User balance query</div>
                          <div className="text-gray-400 text-sm">IC SPICY Logistics - 1 hour ago</div>
                        </div>
                        <div className="text-green-400 text-sm">✅ Success</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'integrations' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">🔗 External Integrations</h2>
                    <button
                      onClick={() => setShowApiKeyManager(true)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      🔑 Manage API Keys
                    </button>
                  </div>

                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">Available Integration Points</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/30">
                        <h4 className="text-white font-medium mb-2">Transaction Data API</h4>
                        <p className="text-gray-300 text-sm mb-3">
                          Provides access to transaction history, payment data, and wallet balances
                        </p>
                        <div className="flex gap-2">
                          <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded">Active</span>
                          <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded">Real-time</span>
                        </div>
                      </div>

                      <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/30">
                        <h4 className="text-white font-medium mb-2">Analytics & Reporting</h4>
                        <p className="text-gray-300 text-sm mb-3">
                          Business intelligence data, user metrics, and performance analytics
                        </p>
                        <div className="flex gap-2">
                          <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded">Active</span>
                          <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded">Batch</span>
                        </div>
                      </div>

                      <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/30">
                        <h4 className="text-white font-medium mb-2">User & Membership Data</h4>
                        <p className="text-gray-300 text-sm mb-3">
                          User profiles, membership tiers, and authentication data
                        </p>
                        <div className="flex gap-2">
                          <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded">Available</span>
                          <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-1 rounded">Secured</span>
                        </div>
                      </div>

                      <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/30">
                        <h4 className="text-white font-medium mb-2">Inventory & Orders</h4>
                        <p className="text-gray-300 text-sm mb-3">
                          Product catalog, inventory levels, and order management data
                        </p>
                        <div className="flex gap-2">
                          <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded">Available</span>
                          <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded">REST API</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-blue-300 mb-4">🔐 Security & Authentication</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-green-400">✅</span>
                        <span className="text-blue-200">API key-based authentication</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-400">✅</span>
                        <span className="text-blue-200">Rate limiting and throttling</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-400">✅</span>
                        <span className="text-blue-200">Permission-based access control</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-400">✅</span>
                        <span className="text-blue-200">Request logging and monitoring</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-400">✅</span>
                        <span className="text-blue-200">Automatic key rotation support</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'analytics' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">📈 API Analytics</h2>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <StatCard
                      title="Requests Today"
                      value="1,247"
                      icon="📡"
                      color="green"
                    />
                    <StatCard
                      title="Success Rate"
                      value="99.8%"
                      icon="✅"
                      color="blue"
                    />
                    <StatCard
                      title="Avg Response Time"
                      value="142ms"
                      icon="⚡"
                      color="purple"
                    />
                  </div>

                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">API Usage by Integration</h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium">IC SPICY Logistics</div>
                          <div className="text-gray-400 text-sm">Transaction data sync</div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold">847 requests</div>
                          <div className="text-gray-400 text-sm">68% of total</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium">Analytics Dashboard</div>
                          <div className="text-gray-400 text-sm">Reporting and insights</div>
                        </div>
                        <div className="text-right">
                          <div className="text-blue-400 font-bold">400 requests</div>
                          <div className="text-gray-400 text-sm">32% of total</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'settings' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">⚙️ API Settings</h2>
                  
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">Global API Configuration</h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium">Default Rate Limit</div>
                          <div className="text-gray-400 text-sm">Maximum requests per minute for new API keys</div>
                        </div>
                        <div className="text-white">1000 req/min</div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium">API Logging</div>
                          <div className="text-gray-400 text-sm">Log all API requests for monitoring</div>
                        </div>
                        <div className="text-green-400">Enabled</div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium">Auto Key Expiration</div>
                          <div className="text-gray-400 text-sm">Default expiration for new API keys</div>
                        </div>
                        <div className="text-white">365 days</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowApiKeyManager(true)}
                      className="w-full mt-6 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Configure API Keys
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiPage;


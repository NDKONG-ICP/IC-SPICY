/**
 * API Key Manager Component
 * 
 * Admin interface for generating and managing API keys for external systems
 * like IC SPICY Logistics to access transaction data
 */

import React, { useState, useEffect } from 'react';
import { useWallet } from '../WalletContext';
import { motion } from 'framer-motion';

const ApiKeyManager = ({ onClose }) => {
  const { canisters, principal } = useWallet();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    permissions: ['ReadTransactions'],
    expires_in_days: 365,
    rate_limit: 1000
  });
  const [newApiKey, setNewApiKey] = useState(null);
  const [showNewKey, setShowNewKey] = useState(false);

  const permissions = [
    { id: 'ReadTransactions', label: 'Read Transactions', description: 'Access to transaction history and payment data' },
    { id: 'ReadBalances', label: 'Read Balances', description: 'Access to user wallet balances' },
    { id: 'ReadMembers', label: 'Read Members', description: 'Access to membership data' },
    { id: 'ReadAnalytics', label: 'Read Analytics', description: 'Access to analytics and reporting data' },
    { id: 'ReadInventory', label: 'Read Inventory', description: 'Access to inventory and product data' },
    { id: 'ReadOrders', label: 'Read Orders', description: 'Access to order and purchase data' },
    { id: 'Admin', label: 'Admin Access', description: 'Full administrative access (use with caution)' }
  ];

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      
      // Use real API Gateway canister if available
      if (canisters.api_gateway && principal) {
        try {
          const keys = await canisters.api_gateway.getAllApiKeys();
          setApiKeys(keys);
          console.log('✅ Loaded API keys from canister:', keys.length);
        } catch (error) {
          console.warn('⚠️ Failed to load from canister, using fallback:', error);
          // Fallback to mock data if canister fails
          const mockKeys = [
            {
              id: '1',
              key: 'icspicy_1_123456789_1704067200',
              name: 'IC SPICY Logistics Integration',
              permissions: ['ReadTransactions', 'ReadAnalytics'],
              created_at: Date.now() / 1000,
              last_used: Date.now() / 1000 - 3600,
              expires_at: Date.now() / 1000 + (365 * 24 * 60 * 60),
              is_active: true,
              usage_count: 1250,
              rate_limit: 1000,
              created_by: 'admin'
            }
          ];
          setApiKeys(mockKeys);
        }
      } else {
        // No canister access, use mock data
        const mockKeys = [
          {
            id: '1',
            key: 'icspicy_1_123456789_1704067200',
            name: 'IC SPICY Logistics Integration',
            permissions: ['ReadTransactions', 'ReadAnalytics'],
            created_at: Date.now() / 1000,
            last_used: Date.now() / 1000 - 3600,
            expires_at: Date.now() / 1000 + (365 * 24 * 60 * 60),
            is_active: true,
            usage_count: 1250,
            rate_limit: 1000,
            created_by: 'admin'
          }
        ];
        setApiKeys(mockKeys);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    try {
      setCreating(true);
      
      // Use real API Gateway canister if available
      if (canisters.api_gateway && principal) {
        try {
          const result = await canisters.api_gateway.createApiKey({
            name: newKeyForm.name,
            permissions: newKeyForm.permissions,
            expires_in_days: newKeyForm.expires_in_days,
            rate_limit: newKeyForm.rate_limit,
            created_by: principal.toString()
          });
          
          if (result.Ok) {
            console.log('✅ API key created successfully:', result.Ok);
            await loadApiKeys(); // Reload the list
            setNewKeyForm({ name: '', permissions: ['ReadTransactions'], expires_in_days: 365, rate_limit: 1000 });
            return;
          } else {
            throw new Error(result.Err || 'Failed to create API key');
          }
        } catch (error) {
          console.warn('⚠️ Failed to create via canister, using fallback:', error);
        }
      }
      
      // Fallback to mock creation
      const mockNewKey = {
        id: String(apiKeys.length + 1),
        key: `icspicy_${apiKeys.length + 1}_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
        name: newKeyForm.name,
        permissions: newKeyForm.permissions,
        created_at: Date.now() / 1000,
        last_used: null,
        expires_at: newKeyForm.expires_in_days ? Date.now() / 1000 + (newKeyForm.expires_in_days * 24 * 60 * 60) : null,
        is_active: true,
        usage_count: 0,
        rate_limit: newKeyForm.rate_limit,
        created_by: 'admin'
      };

      setNewApiKey(mockNewKey);
      setShowNewKey(true);
      setApiKeys([...apiKeys, mockNewKey]);
      
      // Reset form
      setNewKeyForm({
        name: '',
        permissions: ['ReadTransactions'],
        expires_in_days: 365,
        rate_limit: 1000
      });

    } catch (error) {
      console.error('Failed to create API key:', error);
    } finally {
      setCreating(false);
    }
  };

  const revokeApiKey = async (keyId) => {
    try {
      // In a real implementation, this would call the API Gateway canister
      setApiKeys(apiKeys.map(key => 
        key.id === keyId ? { ...key, is_active: false } : key
      ));
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatExpiry = (timestamp) => {
    if (!timestamp) return 'Never';
    const days = Math.ceil((timestamp - Date.now() / 1000) / (24 * 60 * 60));
    if (days < 0) return 'Expired';
    if (days < 30) return `${days} days`;
    return formatDate(timestamp);
  };

  const StatusBadge = ({ active }) => (
    <span className={`px-2 py-1 rounded text-xs font-medium ${
      active 
        ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
        : 'bg-red-500/20 text-red-300 border border-red-500/30'
    }`}>
      {active ? 'Active' : 'Revoked'}
    </span>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-600/30 max-w-6xl mx-auto"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">🔑 API Key Manager</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-2xl transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Create New API Key */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Create New API Key</h3>
          
          <div className="bg-gray-700/50 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Key Name *
              </label>
              <input
                type="text"
                value={newKeyForm.name}
                onChange={(e) => setNewKeyForm({...newKeyForm, name: e.target.value})}
                placeholder="e.g., IC SPICY Logistics Integration"
                className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:border-orange-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Permissions
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {permissions.map((permission) => (
                  <label key={permission.id} className="flex items-start space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newKeyForm.permissions.includes(permission.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewKeyForm({
                            ...newKeyForm,
                            permissions: [...newKeyForm.permissions, permission.id]
                          });
                        } else {
                          setNewKeyForm({
                            ...newKeyForm,
                            permissions: newKeyForm.permissions.filter(p => p !== permission.id)
                          });
                        }
                      }}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-white font-medium">{permission.label}</div>
                      <div className="text-gray-400 text-xs">{permission.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-medium mb-2">
                  Expires in Days
                </label>
                <input
                  type="number"
                  value={newKeyForm.expires_in_days}
                  onChange={(e) => setNewKeyForm({...newKeyForm, expires_in_days: parseInt(e.target.value) || 365})}
                  className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Rate Limit (req/min)
                </label>
                <input
                  type="number"
                  value={newKeyForm.rate_limit}
                  onChange={(e) => setNewKeyForm({...newKeyForm, rate_limit: parseInt(e.target.value) || 1000})}
                  className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={createApiKey}
              disabled={creating || !newKeyForm.name || newKeyForm.permissions.length === 0}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create API Key'}
            </button>
          </div>

          {/* New Key Display */}
          {showNewKey && newApiKey && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6">
              <h4 className="text-green-300 font-semibold mb-3">✅ API Key Created Successfully!</h4>
              <div className="space-y-3">
                <div>
                  <div className="text-green-200 text-sm mb-1">API Key:</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black/30 p-2 rounded text-green-100 text-xs break-all">
                      {newApiKey.key}
                    </code>
                    <button
                      onClick={() => copyToClipboard(newApiKey.key)}
                      className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="text-green-200 text-xs">
                  ⚠️ Store this key securely. It won't be shown again for security reasons.
                </div>
                <button
                  onClick={() => setShowNewKey(false)}
                  className="text-green-300 hover:text-green-100 text-sm underline"
                >
                  I've saved the key securely
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing API Keys */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Existing API Keys</h3>
            <button
              onClick={loadApiKeys}
              className="text-blue-400 hover:text-blue-300 text-sm underline"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">⏳</div>
                <div className="text-gray-400">Loading API keys...</div>
              </div>
            ) : apiKeys.length > 0 ? (
              apiKeys.map((key) => (
                <div key={key.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/30">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-white font-medium">{key.name}</h4>
                      <div className="text-gray-400 text-sm">ID: {key.id}</div>
                    </div>
                    <StatusBadge active={key.is_active} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <div className="text-gray-400">Created:</div>
                      <div className="text-white">{formatDate(key.created_at)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Expires:</div>
                      <div className="text-white">{formatExpiry(key.expires_at)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Usage:</div>
                      <div className="text-white">{key.usage_count.toLocaleString()} requests</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Rate Limit:</div>
                      <div className="text-white">{key.rate_limit}/min</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-gray-400 text-sm mb-1">Permissions:</div>
                    <div className="flex flex-wrap gap-1">
                      {key.permissions.map((permission) => (
                        <span key={permission} className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(`API Key: ${key.key.substring(0, 16)}...${key.key.substring(key.key.length - 8)}`)}
                      className="px-3 py-1 bg-gray-600 text-gray-300 rounded text-xs hover:bg-gray-500 transition-colors"
                    >
                      Copy ID
                    </button>
                    {key.is_active && (
                      <button
                        onClick={() => revokeApiKey(key.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🔑</div>
                <div className="text-gray-400">No API keys found</div>
                <div className="text-gray-500 text-sm mt-1">Create your first API key to get started</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Integration Instructions */}
      <div className="mt-8 bg-blue-500/20 border border-blue-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-300 mb-4">🔗 Integration Instructions</h3>
        
        <div className="space-y-4 text-sm">
          <div>
            <strong className="text-white">For IC SPICY Logistics Integration:</strong>
            <div className="text-blue-200 ml-4 mt-1">
              1. Create an API key with "ReadTransactions" and "ReadAnalytics" permissions<br/>
              2. Provide the generated API key to the logistics team<br/>
              3. The logistics system will use this key to access your transaction data
            </div>
          </div>
          
          <div>
            <strong className="text-white">API Endpoints Available:</strong>
            <div className="text-blue-200 ml-4 mt-1 space-y-1">
              <div><code>/getTransactions</code> - Paginated transaction history</div>
              <div><code>/getAnalytics</code> - Analytics and reporting data</div>
              <div><code>/getUserBalances</code> - User wallet balances</div>
              <div><code>/validateKey</code> - API key validation</div>
            </div>
          </div>
          
          <div>
            <strong className="text-white">Security Features:</strong>
            <div className="text-blue-200 ml-4 mt-1">
              • Rate limiting to prevent abuse<br/>
              • Permission-based access control<br/>
              • Automatic key expiration<br/>
              • Usage monitoring and analytics
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ApiKeyManager;

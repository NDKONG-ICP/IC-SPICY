/**
 * API Configuration Manager Component
 * 
 * Admin interface for managing API keys and configuration
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API_CONFIG, getConfigStatus, validateAPIConfig } from '../config/apiKeys';

const APIConfigManager = ({ onClose }) => {
  const [configStatus, setConfigStatus] = useState(null);
  const [tempApiKey, setTempApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const status = getConfigStatus();
    setConfigStatus(status);
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Test the API connection
      const testUrl = `${API_CONFIG.LOGISTICS.baseUrl}/health`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'X-API-Key': tempApiKey || API_CONFIG.LOGISTICS.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult({
          success: true,
          message: 'Connection successful!',
          data: data
        });
      } else {
        setTestResult({
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}`,
          status: response.status
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Connection error: ${error.message}`,
        error: error.name
      });
    } finally {
      setTesting(false);
    }
  };

  const StatusBadge = ({ status, label }) => {
    const colors = {
      success: 'bg-green-500/20 text-green-300 border-green-500/30',
      error: 'bg-red-500/20 text-red-300 border-red-500/30',
      warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      info: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs border ${colors[status] || colors.info}`}>
        {label}
      </span>
    );
  };

  if (!configStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white">Loading configuration...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-600/30"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">🔧 API Configuration Manager</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-2xl"
        >
          ✕
        </button>
      </div>

      {/* Configuration Status */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Current Configuration</h3>
          
          <div className="bg-gray-700/50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Environment:</span>
              <StatusBadge 
                status={configStatus.environment === 'production' ? 'success' : 'info'} 
                label={configStatus.environment} 
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">API Key:</span>
              <StatusBadge 
                status={configStatus.apiKeySet ? 'success' : 'error'} 
                label={configStatus.apiKeySet ? 'Set' : 'Missing'} 
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Sync Enabled:</span>
              <StatusBadge 
                status={configStatus.syncEnabled ? 'success' : 'warning'} 
                label={configStatus.syncEnabled ? 'Yes' : 'No'} 
              />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Configuration:</span>
              <StatusBadge 
                status={configStatus.isValid ? 'success' : 'error'} 
                label={configStatus.isValid ? 'Valid' : 'Invalid'} 
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Connection Details</h3>
          
          <div className="bg-gray-700/50 rounded-xl p-4 space-y-3">
            <div>
              <span className="text-gray-300 text-sm">Base URL:</span>
              <div className="text-blue-400 text-sm font-mono break-all">
                {configStatus.baseUrl}
              </div>
            </div>
            
            <div>
              <span className="text-gray-300 text-sm">API Key (Masked):</span>
              <div className="text-orange-400 text-sm font-mono">
                {configStatus.apiKeyMasked}
              </div>
            </div>
            
            {configStatus.debugMode && (
              <div className="text-yellow-400 text-xs">
                ⚠️ Debug mode is enabled
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Errors/Warnings */}
      {(configStatus.errors.length > 0 || configStatus.warnings.length > 0) && (
        <div className="mb-6">
          {configStatus.errors.length > 0 && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <h4 className="text-red-300 font-semibold mb-2">❌ Configuration Errors:</h4>
              <ul className="text-red-200 text-sm space-y-1">
                {configStatus.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {configStatus.warnings.length > 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="text-yellow-300 font-semibold mb-2">⚠️ Configuration Warnings:</h4>
              <ul className="text-yellow-200 text-sm space-y-1">
                {configStatus.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* API Key Testing */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Test API Connection</h3>
        
        <div className="bg-gray-700/50 rounded-xl p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-white font-semibold mb-2">
                Test API Key (optional - leave blank to use current):
              </label>
              <div className="flex gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Enter API key to test..."
                  className="flex-1 px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-3 py-2 bg-gray-600 text-gray-300 hover:text-white border border-gray-500 rounded-lg transition-colors"
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? 'Testing Connection...' : 'Test API Connection'}
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className={`rounded-lg p-4 border ${
            testResult.success 
              ? 'bg-green-500/20 border-green-500/30' 
              : 'bg-red-500/20 border-red-500/30'
          }`}>
            <div className={`font-semibold mb-2 ${
              testResult.success ? 'text-green-300' : 'text-red-300'
            }`}>
              {testResult.success ? '✅ Success' : '❌ Failed'}
            </div>
            <div className={`text-sm ${
              testResult.success ? 'text-green-200' : 'text-red-200'
            }`}>
              {testResult.message}
            </div>
            
            {testResult.data && (
              <div className="mt-2 text-xs">
                <details>
                  <summary className="cursor-pointer text-blue-300">Show response data</summary>
                  <pre className="mt-2 bg-black/20 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      <div className="mt-8 bg-blue-500/20 border border-blue-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-300 mb-4">📋 Setup Instructions</h3>
        
        <div className="space-y-3 text-sm">
          <div>
            <strong className="text-white">1. Get your API key:</strong>
            <div className="text-blue-200 ml-4">
              Contact the logistics team at <code>icspicy-logistics-ynt.caffeine.xyz</code> to request an API key for your dApp integration.
            </div>
          </div>
          
          <div>
            <strong className="text-white">2. Set environment variable:</strong>
            <div className="text-blue-200 ml-4">
              Add <code>REACT_APP_LOGISTICS_API_KEY=your-key-here</code> to your <code>.env.production</code> file.
            </div>
          </div>
          
          <div>
            <strong className="text-white">3. Rebuild and deploy:</strong>
            <div className="text-blue-200 ml-4">
              Run <code>npm run build</code> and <code>dfx deploy frontend --network ic</code> to apply the changes.
            </div>
          </div>
          
          <div>
            <strong className="text-white">4. Test the connection:</strong>
            <div className="text-blue-200 ml-4">
              Use the test tool above to verify your API key works correctly.
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default APIConfigManager;


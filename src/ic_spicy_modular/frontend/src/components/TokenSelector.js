/**
 * Token Selector Component
 * 
 * Allows users to select which cryptocurrency token to use for payment
 * when their wallet supports multiple tokens (like OISY with ICP, BTC, ETH)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cryptoPriceService } from '../services/CryptoPriceService';

const TokenSelector = ({ 
  availableTokens, 
  usdAmount, 
  onTokenSelect, 
  selectedToken = null,
  walletName = "Wallet"
}) => {
  const [tokenCalculations, setTokenCalculations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load calculations for all available tokens
  useEffect(() => {
    loadTokenCalculations();
  }, [availableTokens, usdAmount]);

  const loadTokenCalculations = async () => {
    if (!availableTokens?.length || !usdAmount) return;

    setLoading(true);
    setError(null);

    try {
      const calculations = {};
      
      await Promise.all(
        availableTokens.map(async (token) => {
          try {
            const calculation = await cryptoPriceService.calculateCryptoAmount(usdAmount, token);
            calculations[token] = calculation;
          } catch (err) {
            console.error(`Failed to calculate ${token} amount:`, err);
            calculations[token] = { error: err.message };
          }
        })
      );

      setTokenCalculations(calculations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const TokenOption = ({ token }) => {
    const calculation = tokenCalculations[token];
    const isSelected = selectedToken === token;
    
    return (
      <motion.button
        onClick={() => onTokenSelect?.(token, calculation)}
        className={`
          relative w-full p-4 rounded-xl border-2 transition-all duration-300 text-left
          ${isSelected 
            ? 'border-blue-400 bg-blue-50 shadow-lg' 
            : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
          }
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {getTokenIcon(token)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{token}</h3>
              <p className="text-xs text-gray-500">{getTokenName(token)}</p>
            </div>
          </div>
          
          <div className="text-right">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
            ) : calculation?.error ? (
              <div className="text-red-500 text-sm">
                <p>⚠️ Price unavailable</p>
              </div>
            ) : calculation ? (
              <div>
                <div className="font-bold text-gray-900">
                  {cryptoPriceService.formatCryptoAmount(calculation.amount, token)}
                </div>
                <div className="text-xs text-gray-500">
                  ${calculation.price?.toFixed(2)} each
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Selection indicator */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
            >
              <span className="text-white text-xs">✓</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  };

  const getTokenIcon = (token) => {
    const icons = {
      'ICP': '🔵',
      'BTC': '₿',
      'ETH': '⟠',
      'SOL': '☀️',
      'USDC': '💰',
      'USDT': '💵',
      'CRO': '💎',
      'SPICY': '🌶️'
    };
    return icons[token] || '🪙';
  };

  const getTokenName = (token) => {
    const names = {
      'ICP': 'Internet Computer',
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'SOL': 'Solana',
      'USDC': 'USD Coin',
      'USDT': 'Tether USD',
      'CRO': 'Cronos',
      'SPICY': 'IC SPICY Token'
    };
    return names[token] || token;
  };

  if (!availableTokens?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No tokens available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Choose Payment Token
        </h3>
        <p className="text-sm text-gray-600">
          Select which cryptocurrency to use with {walletName} for {cryptoPriceService.formatPrice(usdAmount)}
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">⚠️</span>
            <p className="text-red-700 text-sm">
              Failed to load token prices: {error}
            </p>
          </div>
        </div>
      )}

      {/* Token options */}
      <div className="space-y-3">
        {availableTokens.map(token => (
          <TokenOption key={token} token={token} />
        ))}
      </div>

      {/* Selected token summary */}
      <AnimatePresence>
        {selectedToken && tokenCalculations[selectedToken] && !tokenCalculations[selectedToken].error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <h4 className="font-semibold text-blue-900 mb-3">
              Payment Summary
            </h4>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-blue-700">Order Total:</span>
                <span className="font-semibold text-blue-900">
                  {cryptoPriceService.formatPrice(usdAmount)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-blue-700">You'll Pay:</span>
                <span className="font-bold text-blue-900 text-lg">
                  {cryptoPriceService.formatCryptoAmount(
                    tokenCalculations[selectedToken].amount, 
                    selectedToken
                  )}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-600">Exchange Rate:</span>
                <span className="text-blue-800">
                  1 {selectedToken} = {cryptoPriceService.formatPrice(tokenCalculations[selectedToken].price)}
                </span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-600">
                ⏰ Proceed to pay with {walletName} using {selectedToken}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TokenSelector;


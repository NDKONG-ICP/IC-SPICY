/**
 * Crypto Payment Calculator Component
 * 
 * Displays real-time USD to crypto conversion for all payment methods
 * Integrates with OISY, Phantom, SolanaPay, Internet Identity, NFID, and Crypto.com
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cryptoPriceService } from '../services/CryptoPriceService';
import { getOisySupportedTokens, isOisySupported } from '../config/walletAddresses';

const CryptoPaymentCalculator = ({ 
  usdAmount, 
  onPaymentMethodSelect, 
  selectedMethod = null,
  className = "",
  isPOSMode = false
}) => {
  const [calculations, setCalculations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Payment methods with their supported tokens
  const paymentMethods = [
    {
      id: 'oisy',
      name: 'OISY Wallet',
      icon: '🔵',
      description: 'Pay with ICP, ckBTC, ckETH, SOL, or other assets',
      tokens: ['ICP', 'ckBTC', 'ckETH', 'SOL', 'BTC', 'ETH', 'SPICY'],
      color: 'blue',
      network: 'Multi-Chain'
    },
    {
      id: 'internet_identity',
      name: 'Internet Identity',
      icon: '🆔',
      description: 'Pay with ICP',
      tokens: ['ICP', 'SPICY'],
      color: 'purple',
      network: 'Internet Computer'
    },
    {
      id: 'nfid',
      name: 'NFID',
      icon: '🔐',
      description: 'Pay with ICP',
      tokens: ['ICP', 'SPICY'],
      color: 'green',
      network: 'Internet Computer'
    },
    {
      id: 'phantom',
      name: 'Phantom Wallet',
      icon: '👻',
      description: 'Pay with SOL',
      tokens: ['SOL', 'USDC'],
      color: 'purple',
      network: 'Solana'
    },
    {
      id: 'solana_pay',
      name: 'Solana Pay',
      icon: '⚡',
      description: 'Pay with SOL or USDC',
      tokens: ['SOL', 'USDC'],
      color: 'green',
      network: 'Solana'
    },
    {
      id: 'crypto_com',
      name: 'Crypto.com Pay',
      icon: '💎',
      description: 'Coming Soon - Pay with CRO',
      tokens: ['CRO', 'USDC', 'ETH', 'BTC'],
      color: 'blue',
      network: 'Cronos',
      disabled: true,
      comingSoon: true
    },
    {
      id: 'icpay',
      name: 'IcPay',
      icon: '🌐',
      description: 'Multi-chain payment (ICP, ETH, MATIC, BNB)',
      tokens: ['ICP', 'ETH', 'MATIC', 'BNB', 'USDC'],
      color: 'gradient',
      network: 'Multi-Chain',
      isMultiChain: true
    },
    {
      id: 'cash',
      name: 'Cash Payment',
      icon: '💵',
      description: 'In-person cash transaction',
      tokens: ['USD'],
      color: 'green',
      network: 'Physical',
      isPOSOnly: true
    }
  ];

  // Filter payment methods based on mode
  const availablePaymentMethods = isPOSMode 
    ? paymentMethods // In POS mode, show all methods including cash
    : paymentMethods.filter(method => !method.isPOSOnly); // Online mode, exclude POS-only methods

  // Load price calculations
  useEffect(() => {
    loadPriceCalculations();
  }, [usdAmount]);

  const loadPriceCalculations = async () => {
    if (!usdAmount || usdAmount <= 0) {
      setCalculations({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const allTokens = [...new Set(availablePaymentMethods.filter(method => method.id !== 'cash').flatMap(method => method.tokens))];
      const newCalculations = {};

      // Calculate amounts for each token
      await Promise.all(
        allTokens.map(async (token) => {
          try {
            const calculation = await cryptoPriceService.calculateCryptoAmount(usdAmount, token);
            newCalculations[token] = calculation;
          } catch (err) {
            console.error(`Failed to calculate ${token} amount:`, err);
            newCalculations[token] = {
              error: err.message,
              amount: 0,
              price: 0
            };
          }
        })
      );

      setCalculations(newCalculations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshPrices = async () => {
    setRefreshing(true);
    cryptoPriceService.clearCache();
    await loadPriceCalculations();
    setRefreshing(false);
  };

  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  const PaymentMethodCard = ({ method }) => {
    const isSelected = selectedMethod === method.id;
    const primaryToken = method.tokens[0];
    const calculation = calculations[primaryToken];
    const isDisabled = method.disabled || method.comingSoon;
    
    return (
      <motion.div
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        className={`
          relative overflow-hidden rounded-xl border-2 transition-all duration-300
          ${isDisabled 
            ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-60' 
            : isSelected 
              ? `border-${method.color}-400 bg-${method.color}-50 shadow-lg cursor-pointer` 
              : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md cursor-pointer'
          }
        `}
        onClick={!isDisabled ? () => onPaymentMethodSelect?.(method.id, method, calculation) : undefined}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{method.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{method.name}</h3>
                <p className="text-xs text-gray-500">{method.network}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {method.comingSoon && (
                <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                  Coming Soon
                </div>
              )}
              {isSelected && !isDisabled && (
                <div className={`w-6 h-6 rounded-full bg-${method.color}-500 flex items-center justify-center`}>
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
          </div>

          {/* Price calculation */}
          {method.id === 'cash' ? (
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                ${usdAmount.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                Cash payment
              </div>
              <div className="text-xs text-gray-500">
                Operator will document transaction
              </div>
            </div>
          ) : isDisabled ? (
            <div className="text-center py-4">
              <div className="text-gray-400 text-lg mb-2">🚧</div>
              <div className="text-gray-500 text-sm font-medium">
                Coming Soon
              </div>
              <div className="text-xs text-gray-400 mt-1">
                This payment method is under development
              </div>
            </div>
          ) : loading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : calculation?.error ? (
            <div className="text-red-500 text-sm">
              <p>⚠️ Price unavailable</p>
              <p className="text-xs">{calculation.error}</p>
            </div>
          ) : calculation ? (
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {cryptoPriceService.formatCryptoAmount(calculation.amount, primaryToken)}
              </div>
              <div className="text-sm text-gray-600 mb-3">
                ≈ {cryptoPriceService.formatPrice(usdAmount)} USD
              </div>
              <div className="text-xs text-gray-500">
                {primaryToken} price: {cryptoPriceService.formatPrice(calculation.price)}
              </div>
            </div>
          ) : null}

          {/* Additional tokens */}
          {method.tokens.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Also supports:</p>
              <div className="flex flex-wrap gap-1">
                {method.tokens.slice(1).map(token => (
                  <span 
                    key={token}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selection indicator */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              className={`absolute bottom-0 left-0 right-0 h-1 bg-${method.color}-500`}
              style={{ transformOrigin: 'left' }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (!usdAmount || usdAmount <= 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500">Enter an amount to see crypto payment options</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Pay with Cryptocurrency
          </h3>
          <p className="text-sm text-gray-600">
            Choose your preferred payment method for {cryptoPriceService.formatPrice(usdAmount)}
          </p>
        </div>
        
        {/* Refresh button */}
        <button
          onClick={refreshPrices}
          disabled={refreshing || loading}
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
            transition-all duration-200
            ${refreshing || loading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }
          `}
        >
          <span className={`${refreshing ? 'animate-spin' : ''}`}>🔄</span>
          <span>{refreshing ? 'Updating...' : 'Refresh Prices'}</span>
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">⚠️</span>
            <p className="text-red-700 text-sm">
              Failed to load cryptocurrency prices: {error}
            </p>
          </div>
        </div>
      )}

      {/* Payment methods grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availablePaymentMethods.map(method => (
          <PaymentMethodCard key={method.id} method={method} />
        ))}
      </div>

      {/* Price update info */}
      {!loading && Object.keys(calculations).length > 0 && (
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Prices update every 30 seconds • Powered by CoinGecko API
          </p>
        </div>
      )}

      {/* Selected method details */}
      <AnimatePresence>
        {selectedMethod && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-6"
          >
            <h4 className="font-semibold text-blue-900 mb-3">
              Payment Summary
            </h4>
            
            {(() => {
              const method = paymentMethods.find(m => m.id === selectedMethod);
              const calculation = calculations[method?.tokens[0]];
              
              if (!method || !calculation) return null;
              
              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">Order Total:</span>
                    <span className="font-semibold text-blue-900">
                      {cryptoPriceService.formatPrice(usdAmount)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">You'll Pay:</span>
                    <span className="font-bold text-blue-900 text-lg">
                      {cryptoPriceService.formatCryptoAmount(calculation.amount, method.tokens[0])}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-600">Exchange Rate:</span>
                    <span className="text-blue-800">
                      1 {method.tokens[0]} = {cryptoPriceService.formatPrice(calculation.price)}
                    </span>
                  </div>
                  
                  <div className="pt-3 border-t border-blue-200">
                    <p className="text-xs text-blue-600">
                      ⏰ Prices are valid for 2 minutes. Final amount will be calculated at payment time.
                    </p>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CryptoPaymentCalculator;

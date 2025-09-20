/**
 * IcPay Payment Component - Widget Implementation
 * 
 * Using the official IcPay widget for automatic wallet connections and payments
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { IcpayAmountInput, IcpaySuccess } from '@ic-pay/icpay-widget/react';

const IcPayPayment = ({ 
  usdAmount, 
  onSuccess, 
  onError, 
  config = {},
  className = ""
}) => {
  const [error, setError] = useState(null);

  // Debug IcPay widget loading
  useEffect(() => {
    console.log('🔧 IcPay Payment Component Mounted');
    console.log('🔧 USD Amount:', usdAmount);
    console.log('🔧 Config:', config);
  }, [usdAmount, config]);

  // Handle success callback from IcPay widget
  const handleIcPaySuccess = useCallback((detail) => {
    console.log('✅ IcPay payment successful:', detail);
    
    // Transform IcPay result to our expected format
    const transformedResult = {
      paymentId: detail.paymentId || `payment_${Date.now()}`,
      transactionId: detail.transactionId || `tx_${Date.now()}`,
      currency: detail.currency || 'ICP',
      amount: usdAmount,
      chain: detail.chain || 'ICP',
      address: detail.address || 'icpay-address',
      orderId: detail.orderId || `order_${Date.now()}`,
      status: 'completed',
      timestamp: Date.now(),
      wallet: detail.wallet || 'IcPay',
      method: 'crypto',
      icpayData: detail
    };
    
    if (onSuccess) {
      onSuccess(transformedResult);
    }
  }, [usdAmount, onSuccess]);

  // Handle error callback from IcPay widget
  const handleIcPayError = useCallback((error) => {
    console.error('❌ IcPay payment failed:', error);
    
    let errorMessage = 'Payment failed';
    if (error.message) {
      errorMessage = error.message;
    }
    
    setError(errorMessage);
    if (onError) {
      onError(error);
    }
  }, [onError]);

  // Reset component state
  const resetComponent = useCallback(() => {
    setError(null);
  }, []);

  // IcPay Amount Input configuration - Shows wallet selection immediately
  const icpayConfig = {
    publishableKey: config.publishableKey || 'pk_IBR7yEdfinVZ4484Q5jMxgx69cTS2Lxb',
    defaultAmountUsd: usdAmount,
    minUsd: 1,
    maxUsd: 1000,
    stepUsd: 1,
    buttonLabel: "Pay ${amount} with {symbol}",
    showLedgerDropdown: "dropdown",
    metadata: {
      context: "ic-spicy-marketplace",
      source: "ic-spicy-dapp",
      orderId: `order_${Date.now()}`
    }
  };

  if (error) {
    return (
      <div className={`bg-red-900/30 rounded-xl p-6 border border-red-600/30 ${className}`}>
        <div className="text-center">
          <div className="text-red-400 text-2xl mb-4">⚠️</div>
          <div className="text-white font-medium mb-2">Payment Error</div>
          <div className="text-red-300 text-sm mb-4">
            {error}
          </div>
          <button
            onClick={resetComponent}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/30 rounded-xl p-6 border border-gray-600/30 ${className}`}>
      <div className="text-center mb-6">
        <div className="text-lg font-semibold text-white mb-2">
          ${usdAmount} USD
        </div>
        <div className="text-sm text-blue-200">
          IcPay Multi-Chain Payment
        </div>
        <div className="text-xs text-gray-400 mt-1">
          IcPay will immediately prompt you to select wallet and token
        </div>
      </div>

      {/* IcPay Amount Input Widget - Shows wallet selection immediately */}
      <div className="icpay-widget-container">
        <IcpayAmountInput
          config={icpayConfig}
          onSuccess={handleIcPaySuccess}
          onError={handleIcPayError}
        />
      </div>

      {/* Payment Options */}
      <div className="mt-4 space-y-2">
        <div className="text-xs text-gray-500 text-center mb-2">
          Supported Chains & Tokens:
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {['ICP', 'BTC', 'SOL', 'ETH', 'MATIC', 'BNB', 'USDC'].map(token => (
            <span 
              key={token}
              className="px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-300"
            >
              {token}
            </span>
          ))}
        </div>
      </div>

      {/* Debug Info */}
      <div className="mt-4 pt-4 border-t border-gray-600/30">
        <div className="text-xs text-gray-500 text-center">
          <div>✓ IcPay Amount Input Widget</div>
          <div>✓ Immediate Wallet & Token Selection</div>
          <div>✓ Auto-populated cart total: ${usdAmount}</div>
          <div>✓ Multi-chain support: ICP, ckBTC, ckETH, SOL, BTC, ETH, MATIC, BNB, USDC</div>
          <div>✓ OISY wallet supports: ICP, ckBTC, ckETH, SOL, BTC, ETH</div>
          <div>✓ Real wallet connections & Transak on-ramp</div>
          <div className="mt-2 text-gray-600">
            IcPay Amount Input shows wallet selection immediately
          </div>
          <div className="mt-2 text-gray-600">
            Status: Ready - Widget will show wallet selection immediately
          </div>
        </div>
      </div>
    </div>
  );
};

export default IcPayPayment;
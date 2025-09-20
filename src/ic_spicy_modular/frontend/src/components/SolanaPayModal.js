import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useWallet } from '../WalletContext';
import { getWalletAddress } from '../config/walletAddresses';

const SolanaPayModal = ({ isOpen, onClose, onPaymentComplete, paymentAmount, paymentDescription }) => {
  const { principal, canisters } = useWallet();
  const [paymentId, setPaymentId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [transactionHash, setTransactionHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentDetails, setPaymentDetails] = useState(null);

  // Supported currencies
  const supportedCurrencies = ['SOL', 'USDC', 'USDT'];
  const [selectedCurrency, setSelectedCurrency] = useState('SOL');

  // Solana Pay QR code and deep link generation
  const generateSolanaPayLink = (amount, currency, description, paymentId) => {
    const baseUrl = 'https://pay.solana.com';
    const params = new URLSearchParams({
      amount: amount.toString(),
      currency: currency,
      description: description,
      reference: paymentId,
      recipient: getWalletAddress('solana'), // Use centralized Solana wallet address
    });
    
    return `${baseUrl}?${params.toString()}`;
  };

  // Create payment request
  const createPayment = async () => {
    if (!paymentAmount || !paymentDescription) {
      setError('Payment amount and description are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate unique payment ID
      const newPaymentId = `spicy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setPaymentId(newPaymentId);

      // Create payment record in canister
      if (canisters.solana_pay) {
        const paymentData = {
          id: newPaymentId,
          amount: paymentAmount,
          currency: selectedCurrency,
          description: paymentDescription,
          recipient: getWalletAddress('solana'),
          status: 'pending',
          timestamp: Date.now(),
          principal: principal?.toString() || 'anonymous'
        };

        await canisters.solana_pay.createPayment(paymentData);
        console.log('✅ Payment created in canister:', paymentData);
      }

      setPaymentStatus('pending');
      setPaymentDetails({
        id: newPaymentId,
        amount: paymentAmount,
        currency: selectedCurrency,
        description: paymentDescription,
        recipient: getWalletAddress('solana'),
        qrCodeUrl: generateSolanaPayLink(paymentAmount, selectedCurrency, paymentDescription, newPaymentId)
      });

    } catch (err) {
      console.error('❌ Failed to create payment:', err);
      setError('Failed to create payment request');
    } finally {
      setLoading(false);
    }
  };

  // Check payment status
  const checkPaymentStatus = async () => {
    if (!paymentId || !canisters.solana_pay) return;

    try {
      const status = await canisters.solana_pay.getPaymentStatus(paymentId);
      
      if (status.status === 'completed') {
        setPaymentStatus('completed');
        setTransactionHash(status.transactionHash || '');
        
        if (onPaymentComplete) {
          onPaymentComplete({
            paymentId,
            transactionHash: status.transactionHash,
            amount: paymentAmount,
            currency: selectedCurrency,
            status: 'completed'
          });
        }
      } else if (status.status === 'failed') {
        setPaymentStatus('failed');
        setError(status.error || 'Payment failed');
      }
    } catch (err) {
      console.error('❌ Failed to check payment status:', err);
    }
  };

  // Poll for payment status
  useEffect(() => {
    if (paymentId && paymentStatus === 'pending') {
      const interval = setInterval(checkPaymentStatus, 3000); // Check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [paymentId, paymentStatus]);

  // Reset modal when closed
  useEffect(() => {
    if (!isOpen) {
      setPaymentId(null);
      setPaymentStatus('pending');
      setTransactionHash('');
      setError('');
      setPaymentDetails(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Solana Pay</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {!paymentId ? (
          // Payment setup
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount
              </label>
              <div className="text-2xl font-bold text-gray-900">
                ${paymentAmount?.toFixed(2)} USD
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {supportedCurrencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <div className="text-gray-600">
                {paymentDescription}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-red-600 text-sm">{error}</div>
              </div>
            )}

            <button
              onClick={createPayment}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Creating Payment...' : 'Create Payment Request'}
            </button>
          </div>
        ) : (
          // Payment QR code and status
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-2">
                Scan QR Code to Pay
              </div>
              <div className="text-sm text-gray-600 mb-4">
                Payment ID: {paymentId}
              </div>
            </div>

            {paymentDetails?.qrCodeUrl && (
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <QRCodeSVG
                    value={paymentDetails.qrCodeUrl}
                    size={200}
                    level="M"
                    includeMargin={true}
                  />
                </div>
              </div>
            )}

            <div className="text-center space-y-2">
              <div className="text-sm text-gray-600">
                Amount: {paymentAmount} {selectedCurrency}
              </div>
              <div className="text-sm text-gray-600">
                Recipient: {getWalletAddress('solana')}
              </div>
            </div>

            <div className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {paymentStatus === 'pending' && '⏳ Pending Payment'}
                {paymentStatus === 'completed' && '✅ Payment Completed'}
                {paymentStatus === 'failed' && '❌ Payment Failed'}
              </div>
            </div>

            {transactionHash && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-green-800 text-sm">
                  <div className="font-medium mb-1">Transaction Hash:</div>
                  <div className="font-mono text-xs break-all">{transactionHash}</div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-red-600 text-sm">{error}</div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
              {paymentStatus === 'pending' && (
                <button
                  onClick={checkPaymentStatus}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Check Status
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SolanaPayModal;

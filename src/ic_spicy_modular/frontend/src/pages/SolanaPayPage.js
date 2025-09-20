import React, { useState, useEffect } from 'react';
import { useWallet } from '../WalletContext';
import { useIdentityKit } from '@nfid/identitykit/react';
import { motion } from 'framer-motion';
import { WALLET_ADDRESSES, getWalletAddress } from '../config/walletAddresses';
import IcPayPayment from '../components/IcPayPayment';

// Comprehensive list of Phantom-supported tokens
const PHANTOM_SUPPORTED_TOKENS = {
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    icon: '🌞',
    color: 'from-purple-500 to-blue-500',
    description: 'Native Solana token'
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    icon: '💙',
    color: 'from-blue-500 to-cyan-500',
    description: 'USD-pegged stablecoin'
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether',
    decimals: 6,
    icon: '💚',
    color: 'from-green-500 to-emerald-500',
    description: 'USD-pegged stablecoin'
  },
  // Add more popular SPL tokens
  RAY: {
    symbol: 'RAY',
    name: 'Raydium',
    decimals: 6,
    icon: '⚡',
    color: 'from-yellow-500 to-orange-500',
    description: 'Raydium Protocol Token'
  },
  SRM: {
    symbol: 'SRM',
    name: 'Serum',
    decimals: 6,
    icon: '🔰',
    color: 'from-red-500 to-pink-500',
    description: 'Serum Protocol Token'
  },
  ORCA: {
    symbol: 'ORCA',
    name: 'Orca',
    decimals: 6,
    icon: '🐋',
    color: 'from-cyan-500 to-blue-500',
    description: 'Orca Protocol Token'
  },
  SUI: {
    symbol: 'SUI',
    name: 'Sui',
    decimals: 9,
    icon: '💎',
    color: 'from-indigo-500 to-purple-500',
    description: 'Native Sui blockchain token'
  },
  CRO: {
    symbol: 'CRO',
    name: 'Crypto.com Coin',
    decimals: 8,
    icon: '🦅',
    color: 'from-purple-600 to-pink-600',
    description: 'Native Crypto.com token on Cronos'
  }
};

const SolanaPayPage = () => {
  const { 
    principal, 
    phantomConnected, 
    phantomAddress, 
    phantomBalance,
    phantomNetwork,
    canisters 
  } = useWallet();
  
  // IdentityKit integration for OISY/NFID
  const { user, signer } = useIdentityKit();
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userPayments, setUserPayments] = useState([]);
  const [paymentStats, setPaymentStats] = useState(null);
  const [supportedCurrencies, setSupportedCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('SOL');
  const [currentPayment, setCurrentPayment] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [verificationSignature, setVerificationSignature] = useState('');
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [isMembershipPayment, setIsMembershipPayment] = useState(false);
  const [membershipData, setMembershipData] = useState(null);
  const [showIcPayModal, setShowIcPayModal] = useState(false);
  const [selectedAmountForIcPay, setSelectedAmountForIcPay] = useState(0);

  // Determine if user has access to Solana Pay
  const hasSolanaPayAccess = React.useCallback(() => {
    return phantomConnected || (user?.principal && (signer?.signerType === 'OISY' || signer?.signerType === 'NFIDW'));
  }, [phantomConnected, user?.principal, signer?.signerType]);

  // Get wallet type for display
  const getWalletType = () => {
    if (phantomConnected) return 'Phantom';
    if (user?.principal) {
      if (signer?.signerType === 'OISY') return 'OISY';
      if (signer?.signerType === 'NFIDW') return 'NFID';
    }
    return null;
  };

  // Get wallet address/principal for display
  const getWalletIdentifier = () => {
    if (phantomConnected) return phantomAddress;
    if (user?.principal) return user.principal.toText();
    return null;
  };

  // Handle URL parameters for pre-filled membership payments
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentParam = urlParams.get('payment');
    const membershipParam = urlParams.get('membership');
    
    if (paymentParam && membershipParam === 'true') {
      try {
        const paymentData = JSON.parse(decodeURIComponent(paymentParam));
        setIsMembershipPayment(true);
        setMembershipData(paymentData);
        
        // Pre-fill the form with membership data
        if (paymentData.amount) {
          setPaymentAmount(paymentData.amount.toString());
        }
        if (paymentData.currency) {
          setSelectedCurrency(paymentData.currency);
        }
        if (paymentData.description) {
          setPaymentDescription(paymentData.description);
        }
        
        // Show success message
        setPaymentStatus(`Membership payment ready: ${paymentData.membership_tier} tier`);
      } catch (error) {
        console.error('Error parsing payment data:', error);
        setPaymentStatus('Error: Invalid payment data');
      }
    }
  }, []);

  // Load user payments and stats
  useEffect(() => {
    if (canisters.solana_pay && principal && hasSolanaPayAccess()) {
      loadUserPayments();
      loadPaymentStats();
      loadSupportedCurrencies();
    }
  }, [principal, canisters.solana_pay, hasSolanaPayAccess()]);

  const loadUserPayments = async () => {
    try {
      const payments = await canisters.solana_pay.list_user_payments(principal);
      setUserPayments(payments);
    } catch (error) {
      console.error('Error loading user payments:', error);
    }
  };

  const loadPaymentStats = async () => {
    try {
      const stats = await canisters.solana_pay.get_payment_stats();
      setPaymentStats(stats);
    } catch (error) {
      console.error('Error loading payment stats:', error);
    }
  };

  const loadSupportedCurrencies = async () => {
    try {
      const currencies = await canisters.solana_pay.get_supported_currencies();
      setSupportedCurrencies(currencies);
      if (currencies.length > 0) {
        setSelectedCurrency(currencies[0]);
      }
    } catch (error) {
      console.error('Error loading supported currencies:', error);
      // Fallback to our predefined tokens
      setSupportedCurrencies(Object.keys(PHANTOM_SUPPORTED_TOKENS));
    }
  };

  const handleCreatePayment = async () => {
    if (!hasSolanaPayAccess()) {
      setPaymentStatus('Please connect Phantom Wallet or OISY/NFID wallet first');
      return;
    }

    if (!paymentAmount || !paymentDescription) {
      setPaymentStatus('Please fill in all fields');
      return;
    }

    if (!canisters.solana_pay) {
      setPaymentStatus('Solana Pay canister not available');
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('Creating payment request...');

    try {
      const paymentRequest = {
        amount: parseFloat(paymentAmount),
        currency: selectedCurrency,
        description: paymentDescription,
        expires_in_minutes: 30, // 30 minutes default
        metadata: `Created by ${getWalletType()} wallet: ${getWalletIdentifier()}`
      };

      const response = await canisters.solana_pay.create_payment(paymentRequest);
      
      if (response.success) {
        setPaymentStatus(`Payment request created successfully! Payment ID: ${response.payment_id}`);
        setCurrentPayment({
          id: response.payment_id,
          amount: paymentAmount,
          currency: selectedCurrency,
          description: paymentDescription
        });
        setShowQRCode(true);
        setPaymentAmount('');
        setPaymentDescription('');
        // Refresh payments list
        await loadUserPayments();
        await loadPaymentStats();
      } else {
        setPaymentStatus(`Error: ${response.error || response.message}`);
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      setPaymentStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!verificationSignature || !currentPayment) {
      setPaymentStatus('Please enter the transaction signature and ensure a payment is selected');
      return;
    }

    if (!canisters.solana_pay) {
      setPaymentStatus('Solana Pay canister not available');
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('Verifying payment...');

    try {
      const verifyRequest = {
        payment_id: currentPayment.id,
        transaction_signature: verificationSignature
      };

      const response = await canisters.solana_pay.verify_payment(verifyRequest);
      
      if (response.success) {
        setPaymentStatus(`Payment verified successfully! Transaction: ${response.transaction_hash}`);
        setVerificationSignature('');
        setCurrentPayment(null);
        setShowQRCode(false);
        // Refresh payments list
        await loadUserPayments();
        await loadPaymentStats();
      } else {
        setPaymentStatus(`Verification failed: ${response.error || response.message}`);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setPaymentStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelPayment = async (paymentId) => {
    if (!canisters.solana_pay) {
      setPaymentStatus('Solana Pay canister not available');
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this payment?')) {
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('Cancelling payment...');

    try {
      const response = await canisters.solana_pay.cancel_payment(paymentId);
      
      if (response.success) {
        setPaymentStatus('Payment cancelled successfully');
        // Refresh payments list
        await loadUserPayments();
        await loadPaymentStats();
      } else {
        setPaymentStatus(`Cancellation failed: ${response.error || response.message}`);
      }
    } catch (error) {
      console.error('Error cancelling payment:', error);
      setPaymentStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // IcPay handlers
  const handleIcPayPayment = (amount) => {
    setSelectedAmountForIcPay(amount);
    setShowIcPayModal(true);
  };

  const handleIcPaySuccess = async (paymentResult) => {
    console.log('✅ IcPay Solana payment successful:', paymentResult);
    
    try {
      // Create payment record
      const paymentData = {
        id: paymentResult.paymentId,
        amount: paymentResult.amount,
        currency: paymentResult.currency,
        method: 'IcPay',
        transactionId: paymentResult.transactionId,
        timestamp: Date.now(),
        description: paymentDescription || 'Solana Pay via IcPay',
        status: 'completed'
      };

      // Store in local storage
      const existingPayments = JSON.parse(localStorage.getItem('solana_payments') || '[]');
      existingPayments.push(paymentData);
      localStorage.setItem('solana_payments', JSON.stringify(existingPayments));

      setPaymentStatus(`IcPay payment successful! Transaction: ${paymentResult.transactionId}`);
      setShowIcPayModal(false);
      
      // If this is a membership payment, redirect back to membership page
      if (isMembershipPayment && membershipData) {
        setTimeout(() => {
          window.location.href = '/membership?success=true&tier=' + encodeURIComponent(membershipData.membership_tier) + '&tx=' + paymentResult.transactionId;
        }, 3000);
      }
      
    } catch (error) {
      console.error('❌ Failed to process IcPay payment:', error);
      alert('Failed to process payment. Please try again.');
    }
  };

  const generateSolanaPayURL = (payment) => {
    if (!payment) return '';
    
    // Generate Solana Pay URL according to the specification
    const baseURL = 'https://phantom.app/ul/browse/';
    const paymentData = {
      recipient: getWalletAddress('solana'), // Use centralized Solana wallet address
      amount: payment.amount,
      currency: payment.currency,
      reference: payment.id,
      label: 'IC SPICY Payment',
      message: payment.description
    };
    
    // For now, return a placeholder URL since we need the actual recipient address
    return `${baseURL}?recipient=${encodeURIComponent(paymentData.recipient)}&amount=${paymentData.amount}&currency=${paymentData.currency}&reference=${paymentData.reference}&label=${encodeURIComponent(paymentData.label)}&message=${encodeURIComponent(paymentData.message)}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'text-yellow-400';
      case 'Processing': return 'text-blue-400';
      case 'Completed': return 'text-green-400';
      case 'Failed': return 'text-red-400';
      case 'Expired': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return '⏳';
      case 'Processing': return '🔄';
      case 'Completed': return '✅';
      case 'Failed': return '❌';
      case 'Expired': return '⏰';
      default: return '❓';
    }
  };

  // Debug wallet connection status
  console.log('SolanaPayPage Debug:', {
    phantomConnected,
    phantomAddress,
    user: user?.principal?.toText(),
    signerType: signer?.signerType,
    hasSolanaPayAccess: hasSolanaPayAccess()
  });

  // If user doesn't have Solana Pay access, show access denied
  if (!hasSolanaPayAccess()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(236,72,153,0.15),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(245,158,11,0.15),transparent_55%)]" />
        </div>

        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-6xl mb-6">🔒</div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-red-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
                Access Restricted
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Solana Pay is only available to Phantom Wallet or OISY/NFID wallet users
              </p>
              
              {/* Debug Info */}
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-red-200 mb-2">Debug Information</h3>
                <div className="text-sm text-red-100 text-left">
                  <p>Phantom Connected: {phantomConnected ? '✅ Yes' : '❌ No'}</p>
                  <p>Phantom Address: {phantomAddress || 'Not available'}</p>
                  <p>User Principal: {user?.principal?.toText() || 'Not available'}</p>
                  <p>Signer Type: {signer?.signerType || 'Not available'}</p>
                  <p>Has Access: {hasSolanaPayAccess() ? '✅ Yes' : '❌ No'}</p>
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-2xl mx-auto">
                <h2 className="text-2xl font-semibold mb-4 text-yellow-100">Required Wallets</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg p-4">
                    <div className="text-2xl mb-2">👻</div>
                    <h3 className="font-semibold text-purple-200">Phantom Wallet</h3>
                    <p className="text-sm text-gray-300">Solana-native wallet with multi-token support</p>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 rounded-lg p-4">
                    <div className="text-2xl mb-2">🔐</div>
                    <h3 className="font-semibold text-emerald-200">OISY/NFID</h3>
                    <p className="text-sm text-gray-300">Multi-chain identity wallets with Solana support</p>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-gray-300 mb-4">
                    Connect one of these wallets to access Solana Pay features
                  </p>
                  <a 
                    href="/wallet" 
                    className="inline-block px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
                  >
                    Go to Wallet Page
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(236,72,153,0.15),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(245,158,11,0.15),transparent_55%)]" />
      </div>

      <div className="container mx-auto px-4 py-8 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          {/* Debug Wallet State */}
          <div className="mb-8 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold mb-3 text-blue-200">Wallet Connection Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-100">Phantom:</span>
                <span className={`ml-2 ${phantomConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {phantomConnected ? '✅ Connected' : '❌ Disconnected'}
                </span>
              </div>
              <div>
                <span className="text-blue-100">Address:</span>
                <span className="ml-2 text-gray-300">
                  {phantomAddress ? `${phantomAddress.substring(0, 8)}...` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-blue-100">OISY/NFID:</span>
                <span className={`ml-2 ${user?.principal ? 'text-green-400' : 'text-red-400'}`}>
                  {user?.principal ? '✅ Connected' : '❌ Disconnected'}
                </span>
              </div>
              <div>
                <span className="text-blue-100">Access:</span>
                <span className={`ml-2 ${hasSolanaPayAccess() ? 'text-green-400' : 'text-red-400'}`}>
                  {hasSolanaPayAccess() ? '✅ Granted' : '❌ Denied'}
                </span>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-12">
            <motion.h1 
              className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Solana Pay
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-300 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Accept multiple crypto payments with lightning-fast transactions and minimal fees
            </motion.p>
          </div>

          {/* Membership Payment Indicator */}
          {isMembershipPayment && membershipData && (
            <motion.div 
              className="mb-8 p-6 rounded-2xl backdrop-blur-xl border border-purple-500/30 bg-purple-500/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">👻</div>
                <h2 className="text-2xl font-semibold mb-3 text-purple-200">Ghosties Membership Payment</h2>
                <p className="text-purple-100 mb-4">
                  You're purchasing the <strong>{membershipData.membership_tier}</strong> tier membership
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-purple-500/20 rounded-lg p-3">
                    <div className="text-sm text-purple-300">Tier</div>
                    <div className="text-lg font-semibold text-purple-200">{membershipData.membership_tier}</div>
                  </div>
                  <div className="bg-purple-500/20 rounded-lg p-3">
                    <div className="text-sm text-purple-300">Amount</div>
                    <div className="text-lg font-semibold text-purple-200">{membershipData.amount} {membershipData.currency}</div>
                  </div>
                  <div className="bg-purple-500/20 rounded-lg p-3">
                    <div className="text-sm text-purple-300">Benefits</div>
                    <div className="text-lg font-semibold text-purple-200">Same as Spicy Chads</div>
                  </div>
                </div>
                <div className="text-sm text-purple-300">
                  Complete the payment below to activate your membership
                </div>
              </div>
            </motion.div>
          )}

          {/* Connection Status */}
          <motion.div 
            className="mb-8 p-6 rounded-2xl backdrop-blur-xl border border-white/10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h2 className="text-2xl font-semibold mb-4 text-center">Wallet Connection</h2>
            <div className="text-center">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span>{getWalletType()} Wallet Connected</span>
              </div>
              <p className="text-sm text-gray-400 mt-2 font-mono">
                {getWalletIdentifier()}
              </p>
                              {phantomConnected && (
                  <div className="mt-2 text-sm text-gray-300">
                    Network: {phantomNetwork} | Balance: {phantomBalance.toFixed(4)} SOL
                  </div>
                )}
            </div>
          </motion.div>

          {/* Token Selection */}
          <motion.div 
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <h2 className="text-2xl font-semibold mb-6 text-center">Supported Tokens</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(PHANTOM_SUPPORTED_TOKENS).map(([symbol, token]) => (
                <button
                  key={symbol}
                  onClick={() => {
                    setSelectedCurrency(symbol);
                    setShowTokenSelector(false);
                  }}
                  className={`p-4 rounded-xl border transition-all ${
                    selectedCurrency === symbol
                      ? `bg-gradient-to-r ${token.color} border-white/30 text-white`
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="text-2xl mb-2">{token.icon}</div>
                  <div className="font-semibold text-sm">{token.symbol}</div>
                  <div className="text-xs opacity-75">{token.name}</div>
                </button>
              ))}
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-gray-300 text-sm">
                Selected: <span className="font-semibold text-yellow-200">{selectedCurrency}</span> - {PHANTOM_SUPPORTED_TOKENS[selectedCurrency]?.description}
              </p>
            </div>
          </motion.div>

          {/* Payment Form */}
          <motion.div 
            className={`backdrop-blur-xl border rounded-2xl p-8 mb-8 ${
              isMembershipPayment 
                ? 'bg-purple-500/10 border-purple-500/30' 
                : 'bg-white/5 border-white/10'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <h2 className="text-2xl font-semibold mb-6 text-center">
              {isMembershipPayment ? 'Complete Membership Payment' : 'Create Payment Request'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount ({selectedCurrency})
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Enter amount in ${selectedCurrency}`}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  placeholder="Payment description"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                />
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={handleCreatePayment}
                disabled={!paymentAmount || !paymentDescription || isProcessing}
                className={`px-8 py-3 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  isMembershipPayment
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                }`}
              >
                {isProcessing ? 'Creating...' : isMembershipPayment ? `Pay ${paymentAmount} ${selectedCurrency} for Membership` : `Create ${selectedCurrency} Payment`}
              </button>
            </div>
            
            {paymentStatus && (
              <div className="mt-4 p-3 rounded-lg bg-white/10 border border-white/20">
                <p className="text-center text-gray-200">{paymentStatus}</p>
              </div>
            )}
          </motion.div>

          {/* Payment Verification */}
          {currentPayment && showQRCode && (
            <motion.div 
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <h2 className="text-2xl font-semibold mb-6 text-center">Payment Verification</h2>
              
              <div className="text-center mb-6">
                <div className="bg-white/10 rounded-lg p-6 inline-block">
                  <h3 className="text-lg font-semibold mb-2">Payment Details</h3>
                  <p className="text-gray-300 mb-1">Amount: {currentPayment.amount} {currentPayment.currency}</p>
                  <p className="text-gray-300 mb-1">Description: {currentPayment.description}</p>
                  <p className="text-gray-300 mb-3">ID: {currentPayment.id}</p>
                  
                  <div className="bg-white/20 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-400 mb-2">Scan with Phantom Wallet or click the link below:</p>
                    <a
                      href={generateSolanaPayURL(currentPayment)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 underline break-all"
                    >
                      {generateSolanaPayURL(currentPayment)}
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Transaction Signature
                  </label>
                  <input
                    type="text"
                    value={verificationSignature}
                    onChange={(e) => setVerificationSignature(e.target.value)}
                    placeholder="Enter transaction signature from Phantom wallet..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleVerifyPayment}
                    disabled={!verificationSignature || isProcessing}
                    className="flex-1 py-3 px-6 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? 'Verifying...' : 'Verify Payment'}
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowQRCode(false);
                      setCurrentPayment(null);
                      setVerificationSignature('');
                    }}
                    className="flex-1 py-3 px-6 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Payment Stats */}
          <motion.div 
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-center">
              <h2 className="text-2xl font-semibold mb-4 text-yellow-100">Payment Statistics</h2>
              {paymentStats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-400 mb-2">{paymentStats.total_payments}</div>
                    <div className="text-gray-300">Total Payments</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-400 mb-2">${paymentStats.total_volume.toFixed(2)}</div>
                    <div className="text-gray-300">Total Volume</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">{(paymentStats.success_rate * 100).toFixed(1)}%</div>
                    <div className="text-gray-300">Success Rate</div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">Loading payment statistics...</p>
              )}
            </div>
          </motion.div>

          {/* Payment History */}
          <motion.div 
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
          >
            <h2 className="text-2xl font-semibold mb-6 text-center">Your Payment History</h2>
            {userPayments.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-4">📋</div>
                <p>No payments yet. Create your first payment request above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userPayments.map((payment) => (
                  <div key={payment.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-lg ${getStatusIcon(payment.status)}`}></span>
                        <span className={`font-semibold ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 font-mono">
                          {payment.id}
                        </span>
                        {payment.status === 'Pending' && (
                          <button
                            onClick={() => handleCancelPayment(payment.id)}
                            disabled={isProcessing}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-all disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Amount:</span>
                        <span className="text-white ml-2 font-semibold">
                          {payment.amount} {payment.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Description:</span>
                        <span className="text-white ml-2">{payment.description}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Created:</span>
                        <span className="text-white ml-2">{formatTimestamp(payment.created_at)}</span>
                      </div>
                    </div>
                    {payment.transaction_hash && (
                      <div className="mt-2 text-xs">
                        <span className="text-gray-400">Transaction:</span>
                        <span className="text-green-400 ml-2 font-mono break-all">
                          {payment.transaction_hash}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Supported Currencies Info */}
          <motion.div 
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.6 }}
          >
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 text-center">
              <h2 className="text-2xl font-semibold mb-4 text-yellow-100">Multi-Token Support</h2>
              <p className="text-gray-300 mb-4">
                Accept payments in multiple cryptocurrencies supported by Phantom Wallet
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(PHANTOM_SUPPORTED_TOKENS).map(([symbol, token]) => (
                  <div key={symbol} className="bg-white/10 rounded-lg p-3">
                    <div className="text-2xl mb-1">{token.icon}</div>
                    <div className="font-semibold text-sm">{token.symbol}</div>
                    <div className="text-xs text-gray-400">{token.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default SolanaPayPage;

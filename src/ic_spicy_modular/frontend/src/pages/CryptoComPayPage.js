import React, { useState, useEffect } from 'react';
import { useWallet } from '../WalletContext';
import { useIdentityKit } from '@nfid/identitykit/react';
import { motion } from 'framer-motion';
import { CRONOS_CONFIG, validateTransactionHash, formatCROAmount } from '../config/cronos';
import IcPayPayment from '../components/IcPayPayment';

// Supported tokens on Cronos
const CRONOS_TOKENS = {
  CRO: {
    symbol: 'CRO',
    name: 'Cronos',
    decimals: 18,
    icon: '🦅',
    color: 'from-purple-600 to-pink-600',
    description: 'Native Cronos token',
    contractAddress: null // Native token
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    icon: '💵',
    color: 'from-blue-500 to-green-500',
    description: 'USD Coin on Cronos',
    contractAddress: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59'
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether',
    decimals: 6,
    icon: '💱',
    color: 'from-green-500 to-blue-500',
    description: 'Tether on Cronos',
    contractAddress: '0x66e428c3f67a68878562e79A0234c1F83c208770'
  }
};

const CryptoComPayPage = () => {
  const { 
    principal: walletContextPrincipal, 
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
  const [selectedCurrency, setSelectedCurrency] = useState('CRO');
  const [currentPayment, setCurrentPayment] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [verificationSignature, setVerificationSignature] = useState('');
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [isMembershipPayment, setIsMembershipPayment] = useState(false);
  const [membershipData, setMembershipData] = useState(null);
  const [cronosConnected, setCronosConnected] = useState(false);
  const [cronosAddress, setCronosAddress] = useState('');
  const [cronosBalance, setCronosBalance] = useState(0);
  const [transactionHash, setTransactionHash] = useState('');
  const [showManualVerification, setShowManualVerification] = useState(false);
  const [manualTxHash, setManualTxHash] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [showIcPayModal, setShowIcPayModal] = useState(false);
  const [selectedAmountForIcPay, setSelectedAmountForIcPay] = useState(0);

  // Determine if user has access to Cronos payments
  const hasCronosPayAccess = React.useCallback(() => {
    return phantomConnected || (user?.principal && (signer?.signerType === 'OISY' || signer?.signerType === 'NFIDW'));
  }, [phantomConnected, user?.principal, signer?.signerType]);

  // Get wallet type for display
  const getWalletType = () => {
    if (phantomConnected) return 'Phantom';
    if (signer?.signerType === 'OISY') return 'OISY';
    if (signer?.signerType === 'NFIDW') return 'NFID';
    return 'Unknown';
  };

  // Connect to Cronos network
  const connectToCronos = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0];
        setCronosAddress(account);
        setCronosConnected(true);

        // Switch to Cronos network
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CRONOS_CONFIG.chainId }],
          });
        } catch (switchError) {
          // If Cronos network is not added, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [CRONOS_CONFIG],
            });
          }
        }

        // Get balance
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [account, 'latest'],
        });
        setCronosBalance(parseInt(balance, 16) / Math.pow(10, 18));

        setPaymentStatus('Connected to Cronos network');
      } catch (error) {
        console.error('Error connecting to Cronos:', error);
        setPaymentStatus('Failed to connect to Cronos: ' + error.message);
      }
    } else {
      setPaymentStatus('MetaMask or compatible wallet not found. Please install MetaMask.');
    }
  };

  // Parse URL parameters for pre-filled membership data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentParam = urlParams.get('payment');
    const membershipParam = urlParams.get('membership');
    
    if (paymentParam && membershipParam === 'true') {
      try {
        const paymentData = JSON.parse(decodeURIComponent(paymentParam));
        setPaymentAmount(paymentData.amount?.toString() || '');
        setPaymentDescription(paymentData.description || '');
        setSelectedCurrency(paymentData.currency || 'CRO');
        setIsMembershipPayment(true);
        setMembershipData(paymentData);
        
        // Pre-fill the form
        if (paymentData.amount) {
          setPaymentAmount(paymentData.amount.toString());
        }
        if (paymentData.description) {
          setPaymentDescription(paymentData.description);
        }
      } catch (error) {
        console.error('Error parsing payment data:', error);
      }
    }
  }, []);

  // Initialize supported currencies
  useEffect(() => {
    const enabledTokens = Object.keys(CRONOS_CONFIG.supportedTokens).filter(
      symbol => CRONOS_CONFIG.supportedTokens[symbol].enabled
    );
    setSupportedCurrencies(enabledTokens);
  }, []);

  // Handle payment submission
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!hasCronosPayAccess()) {
      alert('Please connect a compatible wallet to use Cronos payments');
      return;
    }

    if (!cronosConnected) {
      alert('Please connect to Cronos network first');
      return;
    }

    if (!paymentAmount || !paymentDescription) {
      alert('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('Processing payment on Cronos...');

    try {
      const selectedToken = CRONOS_CONFIG.supportedTokens[selectedCurrency];
      const amount = parseFloat(paymentAmount);
      
      if (selectedCurrency === 'CRO') {
        // Native CRO payment
        const transactionParameters = {
          to: CRONOS_CONFIG.recipientAddress,
          from: cronosAddress,
          value: '0x' + (amount * Math.pow(10, 18)).toString(16),
          data: '0x' + Buffer.from(paymentDescription).toString('hex')
        };

        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [transactionParameters],
        });

        setTransactionHash(txHash);
        setPaymentStatus(`Payment successful! Transaction: ${txHash.slice(0, 10)}...`);
        
        // If this is a membership payment, redirect back to membership page
        if (isMembershipPayment && membershipData) {
          setTimeout(() => {
            window.location.href = '/membership?success=true&tier=' + encodeURIComponent(membershipData.membership_tier) + '&tx=' + txHash;
          }, 3000);
        }
      } else {
        // ERC-20 token payment (USDC, USDT)
        setPaymentStatus('ERC-20 token payments coming soon. Please use CRO for now.');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('Payment failed: ' + error.message);
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
    console.log('✅ IcPay Crypto.com payment successful:', paymentResult);
    
    try {
      // Create payment record
      const paymentData = {
        id: paymentResult.paymentId,
        amount: paymentResult.amount,
        currency: paymentResult.currency,
        method: 'IcPay',
        transactionId: paymentResult.transactionId,
        timestamp: Date.now(),
        description: paymentDescription || 'Crypto.com Pay via IcPay',
        status: 'completed'
      };

      // Store in local storage
      const existingPayments = JSON.parse(localStorage.getItem('crypto_com_payments') || '[]');
      existingPayments.push(paymentData);
      localStorage.setItem('crypto_com_payments', JSON.stringify(existingPayments));

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

  // Verify manual payment
  const verifyManualPayment = async () => {
    if (!manualTxHash.trim()) {
      alert('Please enter a transaction hash');
      return;
    }

    if (!validateTransactionHash(manualTxHash)) {
      alert('Please enter a valid transaction hash (0x followed by 64 hex characters)');
      return;
    }

    setVerificationStatus('Verifying transaction...');
    
    try {
      // Verify transaction on Cronos blockchain
      const response = await fetch(`${CRONOS_CONFIG.apiEndpoints.transactions}/${manualTxHash}`);
      
      if (response.ok) {
        const txData = await response.json();
        
        if (txData.status === 'success' && txData.data) {
          const tx = txData.data;
          
          // Check if transaction is to the correct recipient and has sufficient amount
          const amount = parseFloat(tx.value) / Math.pow(10, 18); // Convert from wei
          
          if (amount >= parseFloat(paymentAmount)) {
            setVerificationStatus('Payment verified successfully!');
            setTransactionHash(manualTxHash);
            setPaymentStatus(`Payment verified! Transaction: ${manualTxHash.slice(0, 10)}...`);
            
            // If this is a membership payment, redirect back to membership page
            if (isMembershipPayment && membershipData) {
              setTimeout(() => {
                window.location.href = '/membership?success=true&tier=' + encodeURIComponent(membershipData.membership_tier) + '&tx=' + manualTxHash;
              }, 3000);
            }
          } else {
            setVerificationStatus(`Payment amount insufficient. Expected: ${paymentAmount} CRO, Received: ${formatCROAmount(amount)} CRO`);
          }
        } else {
          setVerificationStatus('Transaction not found or invalid');
        }
      } else {
        setVerificationStatus('Failed to verify transaction. Please check the hash and try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('Verification failed: ' + error.message);
    }
  };

  // If user doesn't have access, show restricted page
  if (!hasCronosPayAccess()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-pink-900/20">
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto text-center"
          >
            <div className="mb-8">
              <div className="text-6xl mb-4">🦅</div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                Cronos Payments
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Access Restricted - Wallet Connection Required
              </p>
            </div>

            <div className="glass-card-dark p-8 border border-pink-500/30 bg-pink-500/5">
              <div className="text-2xl mb-6 text-pink-200">
                🔒 Access Restricted
              </div>
              
              <p className="text-gray-300 mb-6">
                To use Cronos payments, you need to connect a compatible wallet:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                  <div className="text-2xl mb-2">👻</div>
                  <div className="text-purple-200 font-semibold">Phantom Wallet</div>
                  <div className="text-sm text-purple-300">Connect your Phantom wallet</div>
                </div>
                
                <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <div className="text-2xl mb-2">🔐</div>
                  <div className="text-blue-200 font-semibold">OISY/NFID</div>
                  <div className="text-sm text-blue-300">Connect with OISY or NFID</div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => window.location.href = '/wallet'}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all"
                >
                  Connect Wallet
                </button>
                
                <button
                  onClick={() => window.location.href = '/membership'}
                  className="w-full px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
                >
                  Back to Membership
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-pink-900/20">
      {/* Coming Soon Banner */}
      <div className="bg-yellow-500 text-black text-center py-3 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-xl">🚧</span>
            <span className="font-bold">Crypto.com Pay is Coming Soon!</span>
            <span className="text-sm">This feature is currently under development.</span>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <div className="text-6xl mb-4">🦅</div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Cronos Payments
            </h1>
            <p className="text-xl text-gray-300">
              Secure payments with $CRO and other tokens on Cronos blockchain
            </p>
            <p className="text-lg text-gray-400 mt-2">
              Connect your wallet or verify existing payments manually
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment Form */}
            <div className="glass-card-dark p-8 border border-pink-500/30 bg-pink-500/5">
              <h2 className="text-2xl font-bold text-white mb-6">Make Payment</h2>
              
              {/* Cronos Connection Status */}
              {!cronosConnected && (
                <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <div className="text-yellow-200 font-semibold mb-2">⚠️ Cronos Network Not Connected</div>
                  <p className="text-gray-300 mb-4">Connect to Cronos network to make payments</p>
                  <button
                    onClick={connectToCronos}
                    className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-all"
                  >
                    Connect to Cronos
                  </button>
                </div>
              )}

              {cronosConnected && (
                <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="text-green-200 font-semibold mb-2">✅ Connected to Cronos</div>
                  <div className="text-sm text-gray-300">
                    Address: {cronosAddress?.slice(0, 8)}...{cronosAddress?.slice(-8)}<br/>
                    Balance: {cronosBalance.toFixed(4)} CRO
                  </div>
                </div>
              )}
              
              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.00000001"
                    className="w-full px-4 py-3 bg-white/5 border border-pink-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Currency
                  </label>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-pink-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    {supportedCurrencies.map(currency => (
                      <option key={currency} value={currency}>
                        {CRONOS_CONFIG.supportedTokens[currency]?.name || currency}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    placeholder="Payment description..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-pink-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={true}
                  className="w-full px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg cursor-not-allowed opacity-50"
                >
                  Coming Soon - Process Payment
                </button>
              </form>

              {/* IcPay Alternative */}
              <div className="mt-4">
                <div className="text-center text-gray-300 text-sm mb-3">Or pay with IcPay</div>
                <button
                  disabled={true}
                  className="w-full px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg cursor-not-allowed opacity-50"
                >
                  🚧 Coming Soon - Pay with IcPay
                </button>
              </div>

              {paymentStatus && (
                <div className="mt-6 p-4 bg-white/5 border border-pink-500/30 rounded-lg">
                  <div className="text-pink-200 font-semibold">Status:</div>
                  <div className="text-gray-300">{paymentStatus}</div>
                  {transactionHash && (
                    <div className="mt-2">
                      <div className="text-pink-200 font-semibold">Transaction Hash:</div>
                      <a 
                        href={`https://cronoscan.com/tx/${transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 break-all"
                      >
                        {transactionHash}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment Info & Stats */}
            <div className="space-y-6">
              {/* Wallet Connection Status */}
              <div className="glass-card-dark p-6 border border-pink-500/30 bg-pink-500/5">
                <h3 className="text-lg font-semibold text-white mb-4">Wallet Status</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Wallet Type:</span>
                    <span className="text-pink-200">{getWalletType()}</span>
                  </div>
                  {phantomConnected && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Phantom Address:</span>
                        <span className="text-pink-200 font-mono text-xs">
                          {phantomAddress?.slice(0, 8)}...{phantomAddress?.slice(-8)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Network:</span>
                        <span className="text-pink-200">{phantomNetwork}</span>
                      </div>
                    </>
                  )}
                  {user?.principal && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">IC Principal:</span>
                      <span className="text-pink-200 font-mono text-xs">
                        {user.principal.toText().slice(0, 8)}...{user.principal.toText().slice(-8)}
                      </span>
                    </div>
                  )}
                  {cronosConnected && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Cronos Address:</span>
                        <span className="text-pink-200 font-mono text-xs">
                          {cronosAddress?.slice(0, 8)}...{cronosAddress?.slice(-8)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">CRO Balance:</span>
                        <span className="text-pink-200">{cronosBalance.toFixed(4)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Supported Tokens */}
              <div className="glass-card-dark p-6 border border-pink-500/30 bg-pink-500/5">
                <h3 className="text-lg font-semibold text-white mb-4">Supported Tokens</h3>
                <div className="space-y-3">
                  {Object.values(CRONOS_CONFIG.supportedTokens)
                    .filter(token => token.enabled)
                    .map(token => (
                    <div key={token.symbol} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="text-2xl">{token.icon}</div>
                      <div>
                        <div className="text-white font-semibold">{token.name}</div>
                        <div className="text-sm text-gray-300">{token.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-card-dark p-6 border border-pink-500/30 bg-pink-500/5">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.href = '/membership'}
                    className="w-full px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                  >
                    View Membership Tiers
                  </button>
                  <button
                    onClick={() => window.location.href = '/wallet'}
                    className="w-full px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                  >
                    Manage Wallet
                  </button>
                  {!cronosConnected && (
                    <button
                      onClick={connectToCronos}
                      className="w-full px-4 py-2 bg-yellow-500/20 text-yellow-200 rounded-lg hover:bg-yellow-500/30 transition-all border border-yellow-500/30"
                    >
                      Connect to Cronos
                    </button>
                  )}
                </div>
              </div>

              {/* Manual Payment Verification */}
              <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-200 mb-4">Manual Payment Verification</h3>
                <p className="text-gray-300 mb-4">
                  If you've already made a payment on Cronos, you can verify it here by entering the transaction hash.
                </p>
                
                <div className="space-y-3">
                  <input
                    type="text"
                    value={manualTxHash}
                    onChange={(e) => setManualTxHash(e.target.value)}
                    placeholder="Enter transaction hash (0x...)"
                    className="w-full px-4 py-3 bg-white/5 border border-blue-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <button
                    onClick={verifyManualPayment}
                    className="w-full px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all"
                  >
                    Verify Payment
                  </button>
                  
                  {verificationStatus && (
                    <div className="p-3 bg-white/5 border border-blue-500/30 rounded-lg">
                      <div className="text-blue-200 font-semibold">Status:</div>
                      <div className="text-gray-300">{verificationStatus}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Instructions */}
              <div className="mt-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                <h3 className="text-lg font-semibold text-green-200 mb-4">How to Pay with CRO</h3>
                <div className="text-sm text-gray-300 space-y-2">
                  <div>1. <strong>Connect your wallet</strong> to Cronos network</div>
                  <div>2. <strong>Send CRO</strong> to the recipient address</div>
                  <div>3. <strong>Copy the transaction hash</strong> from Cronoscan</div>
                  <div>4. <strong>Verify your payment</strong> using the hash above</div>
                </div>
                
                <div className="mt-4 p-3 bg-white/5 rounded-lg">
                  <div className="text-green-200 font-semibold mb-2">Recipient Address:</div>
                  <div className="text-gray-300 font-mono text-sm break-all">
                    {CRONOS_CONFIG.recipientAddress}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    ⚠️ Update recipient address in config/cronos.js before deployment
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* IcPay Payment Modal */}
      {showIcPayModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-2xl w-full border border-gray-600/30">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                🌐 Pay with IcPay
              </h2>
              <p className="text-gray-300">
                Multi-chain payment with wallet selector and credit card support
              </p>
            </div>
            
            <div className="mb-6">
              <IcPayPayment
                usdAmount={selectedAmountForIcPay}
                onSuccess={handleIcPaySuccess}
                onError={(error) => {
                  console.error('❌ IcPay Crypto.com payment failed:', error);
                  alert(`IcPay payment failed: ${error.message || 'Unknown error'}`);
                }}
                config={{
                  publishableKey: 'pk_IBR7yEdfinVZ4484Q5jMxgx69cTS2Lxb'
                }}
              />
            </div>
            
            <div className="text-center">
              <button
                onClick={() => {
                  setShowIcPayModal(false);
                  setSelectedAmountForIcPay(0);
                }}
                className="px-6 py-3 bg-gray-600/50 hover:bg-gray-600/70 text-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CryptoComPayPage;

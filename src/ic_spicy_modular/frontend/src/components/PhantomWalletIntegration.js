import React, { useState, useEffect } from 'react';
import { useWallet } from '../WalletContext';
import { getWalletAddress } from '../config/walletAddresses';

const PhantomWalletIntegration = () => {
  const {
    phantomProvider,
    phantomAddress,
    phantomConnected,
    phantomNetwork,
    phantomBalance,
    isPhantomAvailable,
    connectPhantom,
    disconnectPhantom
  } = useWallet();

  const [recipientAddress, setRecipientAddress] = useState(getWalletAddress('solana'));
  const [amount, setAmount] = useState('');
  const [messageToSign, setMessageToSign] = useState('');
  const [signedMessage, setSignedMessage] = useState('');
  const [transactionResult, setTransactionResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const result = await connectPhantom();
      if (result) {
        console.log('Connected to Phantom:', result);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectPhantom();
      setSignedMessage('');
      setTransactionResult('');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleSendTransaction = async () => {
    if (!recipientAddress || !amount || !phantomAddress) {
      setTransactionResult('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      // This would need to be implemented with proper Solana transaction handling
      // For now, we'll show a placeholder message
      setTransactionResult('Transaction functionality coming soon! This is a placeholder for the Solana transaction implementation.');
      setAmount('');
      setRecipientAddress('');
    } catch (error) {
      setTransactionResult(`Transaction failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignMessage = async () => {
    if (!messageToSign || !phantomProvider) {
      setSignedMessage('Please enter a message to sign and ensure wallet is connected');
      return;
    }

    try {
      setIsLoading(true);
      const encodedMessage = new TextEncoder().encode(messageToSign);
      const signedMessageResult = await phantomProvider.signMessage(encodedMessage, 'utf8');
      setSignedMessage(`Message signed successfully! Signature: ${signedMessageResult.signature}`);
    } catch (error) {
      setSignedMessage(`Failed to sign message: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isPhantomAvailable) {
    return (
      <div className="max-w-md mx-auto p-6 bg-gray-800 rounded-xl border border-gray-700">
        <div className="text-center">
          <div className="text-6xl mb-4">👻</div>
          <h2 className="text-2xl font-bold text-white mb-4">Phantom Wallet Not Found</h2>
          <p className="text-gray-400 mb-6">
            To use Phantom wallet, please install the browser extension.
          </p>
          <a
            href="https://phantom.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
          >
            Install Phantom Wallet
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-6xl mb-4">👻</div>
        <h1 className="text-3xl font-bold text-white mb-2">Phantom Wallet</h1>
        <p className="text-gray-400">Multi-chain wallet integration</p>
      </div>

      {/* Connection Status */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Connection Status</h2>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            phantomConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {phantomConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        {phantomConnected && phantomAddress && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Address:</span>
              <span className="text-white font-mono text-sm">{phantomAddress}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Network:</span>
              <span className="text-white">{phantomNetwork}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Balance:</span>
              <span className="text-white">{phantomBalance.toFixed(4)} SOL</span>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          {!phantomConnected ? (
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Send Transaction */}
      {phantomConnected && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Send SOL</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Recipient Address</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter Solana address"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Amount (SOL)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="0.001"
                min="0"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              onClick={handleSendTransaction}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Send Transaction'}
            </button>
            {transactionResult && (
              <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-300">{transactionResult}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sign Message */}
      {phantomConnected && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Sign Message</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Message to Sign</label>
              <textarea
                value={messageToSign}
                onChange={(e) => setMessageToSign(e.target.value)}
                placeholder="Enter message to sign"
                rows="3"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              onClick={handleSignMessage}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? 'Signing...' : 'Sign Message'}
            </button>
            {signedMessage && (
              <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-300">{signedMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Features Info */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Phantom Wallet Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-green-400">✅</span>
              <span className="text-gray-300">Solana Network Support</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-400">✅</span>
              <span className="text-gray-300">Message Signing</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-400">✅</span>
              <span className="text-gray-300">Balance Display</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">🔄</span>
              <span className="text-gray-300">Transaction Support (Coming Soon)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">🔄</span>
              <span className="text-gray-300">Network Switching (Coming Soon)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-400">ℹ️</span>
              <span className="text-gray-300">IC Integration Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhantomWalletIntegration;


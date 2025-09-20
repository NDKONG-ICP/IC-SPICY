import React, { useState, useEffect } from 'react';
import { useWallet } from '../WalletContext';
import { validateForm, rateLimiter, auditLog, handleError } from '../utils/security';
import { motion, AnimatePresence } from 'framer-motion';
import { recordPortalTransaction } from '../services/TransactionService';
import MultiChainPortal from '../components/MultiChainPortal';

const PortalPage = () => {
  const { principal, plugConnected, iiLoggedIn, canisters } = useWallet();
  
  // All hooks must be declared before any conditional returns
  const [stakeInput, setStakeInput] = useState('');
  const [lockMonths, setLockMonths] = useState(3);
  const [userStake, setUserStake] = useState(null);
  const [totalStaked, setTotalStaked] = useState(0);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  
  // Transaction logging state
  const [transactions, setTransactions] = useState([]);
  const [transactionStats, setTransactionStats] = useState({
    total: 0,
    volume: 0,
    users: 0
  });
  const [transactionFilters, setTransactionFilters] = useState({
    type: 'all',
    token: 'all',
    timeRange: '7d'
  });
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [showTransactionLog, setShowTransactionLog] = useState(false);
  
  // Load data on component mount and when wallet connects
  useEffect(() => {
    const isWalletConnected = (plugConnected || iiLoggedIn) && principal && canisters.portal;
    if (isWalletConnected) {
      loadUserStake();
      loadTotalStaked();
      loadProposals();
      loadTransactionHistory(); // Load transactions when wallet is connected
    }
  }, [plugConnected, iiLoggedIn, principal, canisters.portal]);
  
  // Use the new MultiChainPortal component
  // If we have a principal, we should show the portal (regardless of which wallet type)
  if (principal && canisters.portal) {
    return <MultiChainPortal />;
  }

  const minMonths = 3;
  const maxMonths = 24;
  const minAPY = 12.5;
  const maxAPY = 30;
  const calcAPY = minAPY + ((lockMonths - minMonths) / (maxMonths - minMonths)) * (maxAPY - minAPY);
  const calcHeat = ((Number(stakeInput || 0) * (calcAPY / 100)) * (lockMonths / 12)).toFixed(2);

  // Load user stake data
  const loadUserStake = async () => {
    if (!canisters.portal || !principal) return;
    
    try {
      const stake = await canisters.portal.get_stake();
      setUserStake(stake);
    } catch (error) {
      console.error('Error loading user stake:', error);
    }
  };

  // Load total staked amount
  const loadTotalStaked = async () => {
    if (!canisters.portal) return;
    
    try {
      const total = await canisters.portal.total_staked();
      setTotalStaked(total);
    } catch (error) {
      console.error('Error loading total staked:', error);
    }
  };

  // Load governance proposals
  const loadProposals = async () => {
    if (!canisters.portal) return;
    
    try {
      const proposalList = await canisters.portal.list_proposals();
      setProposals(proposalList);
    } catch (error) {
      console.error('Error loading proposals:', error);
    }
  };

  // Load comprehensive transaction history
  const loadTransactionHistory = async () => {
    if (!canisters.wallet2 || !principal) return;
    
    setTransactionLoading(true);
    try {
      // Get user's transaction history from canister
      const userTxs = await canisters.wallet2.getTransactionHistory(principal);
      
      // Get wallet statistics
      const stats = await canisters.wallet2.getWalletStats();
      
      // Get membership burn transactions if available
      let membershipTxs = [];
      if (canisters.membership) {
        try {
          const burnTxs = await canisters.membership.get_burn_transactions(100);
          membershipTxs = burnTxs.map(tx => ({
            id: `burn-${tx[0]}-${tx[2]}`,
            from: principal,
            to: 'BURN',
            token: tx[0],
            amount: tx[1],
            timestamp: Number(tx[2]),
            tx_type: 'burn',
            source: 'membership'
          }));
        } catch (error) {
          console.log('Membership transactions not available:', error);
        }
      }
      
      // Get local transaction logs
      const localTxs = JSON.parse(localStorage.getItem('transaction_logs') || '[]')
        .filter(tx => tx.userId === principal)
        .map(tx => ({
          id: `local-${tx.timestamp}`,
          from: tx.userId,
          to: tx.details.to || 'SYSTEM',
          token: tx.details.token || 'UNKNOWN',
          amount: tx.details.amount || 0,
          timestamp: Math.floor(new Date(tx.timestamp).getTime() / 1000),
          tx_type: tx.tx_type,
          source: 'local'
        }));
      
      // Combine and format all transactions
      const allTxs = [
        ...userTxs.map(tx => ({ ...tx, source: 'wallet2' })),
        ...membershipTxs,
        ...localTxs
      ].sort((a, b) => b.timestamp - a.timestamp);
      
      setTransactions(allTxs);
      setTransactionStats({
        total: (stats?.total_transactions || 0) + localTxs.length,
        volume: stats?.total_volume || 0,
        users: stats?.total_users || 0
      });
      
      // Audit logging
      auditLog.log('view_transactions', principal, { count: allTxs.length });
    } catch (error) {
      console.error('Error loading transaction history:', error);
      setMessage('Failed to load transaction history');
      setMessageType('error');
    } finally {
      setTransactionLoading(false);
    }
  };

  // Filter transactions based on current filters
  const getFilteredTransactions = () => {
    let filtered = [...transactions];
    
    if (transactionFilters.type !== 'all') {
      filtered = filtered.filter(tx => tx.tx_type === transactionFilters.type);
    }
    
    if (transactionFilters.token !== 'all') {
      filtered = filtered.filter(tx => tx.token === transactionFilters.token);
    }
    
    if (transactionFilters.timeRange !== 'all') {
      const now = Date.now();
      const ranges = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };
      
      if (ranges[transactionFilters.timeRange]) {
        const cutoff = now - ranges[transactionFilters.timeRange];
        filtered = filtered.filter(tx => tx.timestamp * 1000 > cutoff);
      }
    }
    
    return filtered;
  };

  // Format transaction amount
  const formatAmount = (amount, token) => {
    if (amount === undefined || amount === null) return '0.0000';
    const decimals = token === 'SPICY' || token === 'HEAT' ? 8 : 8;
    return (Number(amount) / Math.pow(10, decimals)).toFixed(4);
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  // Get transaction type icon and color
  const getTransactionDisplay = (tx) => {
    const types = {
      transfer: { icon: '🔄', color: 'text-blue-400', bg: 'bg-blue-500/20' },
      mint: { icon: '🪙', color: 'text-green-400', bg: 'bg-green-500/20' },
      burn: { icon: '🔥', color: 'text-red-400', bg: 'bg-red-500/20' },
      stake: { icon: '🔒', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
      unstake: { icon: '🔓', color: 'text-orange-400', bg: 'bg-orange-500/20' },
      claim: { icon: '⚡', color: 'text-purple-400', bg: 'bg-purple-500/20' },
      purchase: { icon: '🛒', color: 'text-pink-400', bg: 'bg-pink-500/20' },
      tip: { icon: '💝', color: 'text-rose-400', bg: 'bg-rose-500/20' },
      membership: { icon: '👥', color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
      vote: { icon: '🗳️', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
      proposal: { icon: '📋', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
      harvest: { icon: '🌾', color: 'text-amber-400', bg: 'bg-amber-500/20' },
      plant: { icon: '🌱', color: 'text-lime-400', bg: 'bg-lime-500/20' },
      water: { icon: '💧', color: 'text-sky-400', bg: 'bg-sky-500/20' }
    };
    
    return types[tx.tx_type] || { icon: '❓', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  };

  // Export transaction data
  const exportTransactions = () => {
    const data = getFilteredTransactions();
    const csvContent = [
      ['Type', 'From', 'To', 'Token', 'Amount', 'Timestamp', 'Source'],
      ...data.map(tx => [
        tx.tx_type,
        tx.from,
        tx.to,
        tx.token,
        formatAmount(tx.amount, tx.token),
        formatTimestamp(tx.timestamp),
        tx.source
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    auditLog.log('export_transactions', principal, { count: data.length });
  };

  // Stake tokens
  const handleStake = async () => {
    if (!canisters.portal || !principal) {
      setMessage('Please connect your wallet first');
      setMessageType('error');
      return;
    }

    // Rate limiting
    if (!rateLimiter.canPerformAction('stake', principal, 3, 60000)) {
      setMessage('Please wait before making another stake operation');
      setMessageType('error');
      return;
    }

    // Input validation
    const errors = validateForm.staking(Number(stakeInput), lockMonths);
    if (errors.length > 0) {
      setMessage(errors[0]);
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      const result = await canisters.portal.stake(parseInt(stakeInput), lockMonths);
      setMessage(result);
      setMessageType('success');
      setStakeInput('');
      await loadUserStake();
      await loadTotalStaked();
      
      // Record transaction in admin analytics
      try {
        await recordPortalTransaction({
          userPrincipal: principal.toString(),
          amount: parseInt(stakeInput),
          currency: 'RAVEN', // Assuming RAVEN token for staking
          transactionHash: `portal_stake_${Date.now()}`,
          metadata: {
            type: 'staking',
            amount: parseInt(stakeInput),
            lockMonths: lockMonths,
            transactionResult: result
          }
        });
      } catch (analyticsError) {
        console.warn('⚠️ Failed to record portal staking transaction in admin analytics:', analyticsError);
      }
      
      // Audit logging
      auditLog.log('stake', principal, { amount: stakeInput, lockMonths });
    } catch (error) {
      const errorMessage = handleError(error, 'staking');
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Unstake tokens
  const handleUnstake = async () => {
    if (!canisters.portal || !principal) {
      setMessage('Please connect your wallet first');
      setMessageType('error');
      return;
    }

    // Rate limiting
    if (!rateLimiter.canPerformAction('unstake', principal, 2, 300000)) { // 5 minutes
      setMessage('Please wait before making another unstake operation');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      const result = await canisters.portal.unstake();
      setMessage(result);
      setMessageType('success');
      await loadUserStake();
      await loadTotalStaked();
      
      // Audit logging
      auditLog.log('unstake', principal, {});
    } catch (error) {
      const errorMessage = handleError(error, 'unstaking');
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Claim rewards
  const handleClaimRewards = async () => {
    if (!canisters.portal || !principal) {
      setMessage('Please connect your wallet first');
      setMessageType('error');
      return;
    }

    // Rate limiting
    if (!rateLimiter.canPerformAction('claim_rewards', principal, 5, 300000)) { // 5 minutes
      setMessage('Please wait before making another claim operation');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      const result = await canisters.portal.claim_rewards();
      setMessage(result);
      setMessageType('success');
      await loadUserStake();
      
      // Audit logging
      auditLog.log('claim_rewards', principal, {});
    } catch (error) {
      const errorMessage = handleError(error, 'claiming rewards');
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Create governance proposal
  const handleCreateProposal = async (title, description) => {
    if (!canisters.portal || !principal) {
      setMessage('Please connect your wallet first');
      setMessageType('error');
      return;
    }

    // Rate limiting
    if (!rateLimiter.canPerformAction('create_proposal', principal, 2, 3600000)) { // 1 hour
      setMessage('Please wait before creating another proposal');
      setMessageType('error');
      return;
    }

    // Input validation
    if (!title || title.length > 100) {
      setMessage('Title must be 1-100 characters');
      setMessageType('error');
      return;
    }

    if (!description || description.length > 1000) {
      setMessage('Description must be 1-1000 characters');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      const proposalId = await canisters.portal.create_proposal(title, description);
      setMessage(`Proposal created with ID: ${proposalId}`);
      setMessageType('success');
      await loadProposals();
      
      // Audit logging
      auditLog.log('create_proposal', principal, { title, description, proposalId });
    } catch (error) {
      const errorMessage = handleError(error, 'creating proposal');
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Vote on proposal
  const handleVote = async (proposalId, voteFor) => {
    if (!canisters.portal || !principal) {
      setMessage('Please connect your wallet first');
      setMessageType('error');
      return;
    }

    // Rate limiting
    if (!rateLimiter.canPerformAction('vote', principal, 10, 60000)) { // 1 minute
      setMessage('Please wait before voting again');
      setMessageType('error');
      return;
    }

    // Input validation
    if (!proposalId || proposalId <= 0) {
      setMessage('Invalid proposal ID');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      const result = await canisters.portal.vote(proposalId, voteFor);
      setMessage(result);
      setMessageType('success');
      await loadProposals();
      
      // Record transaction in admin analytics
      try {
        await recordPortalTransaction({
          userPrincipal: principal.toString(),
          amount: 0, // Voting doesn't involve token amount
          currency: 'VOTE',
          transactionHash: `portal_vote_${proposalId}_${Date.now()}`,
          metadata: {
            type: 'voting',
            proposalId: proposalId,
            voteFor: voteFor,
            transactionResult: result
          }
        });
      } catch (analyticsError) {
        console.warn('⚠️ Failed to record portal voting transaction in admin analytics:', analyticsError);
      }
      
      // Audit logging
      auditLog.log('vote', principal, { proposalId, voteFor });
    } catch (error) {
      const errorMessage = handleError(error, 'voting');
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Wallet connection section - show connection required if no principal
  
  if (!principal || !canisters.portal) {
    return (
      <div className="relative min-h-screen py-8 px-2 md:px-0 flex flex-col items-center justify-center">
        <div className="glass-card-dark max-w-md w-full p-8 text-center">
          <div className="text-6xl mb-4">🏦</div>
          <h1 className="text-2xl font-bold text-yellow-100 mb-4">Staking Portal & Governance</h1>
          <p className="text-gray-300 mb-6">
            Connect your wallet to access staking and governance features
          </p>
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Supported wallets: Plug, Internet Identity, OISY, NFID
            </p>
            <p className="text-sm text-blue-300">
              Please connect your wallet from the main navigation menu
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen py-8 px-2 md:px-0 flex flex-col items-center justify-center overflow-x-hidden space-y-8">
      {/* Message display */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg ${
          messageType === 'success' ? 'bg-green-500' : 
          messageType === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}>
          {message}
          <button onClick={() => setMessage('')} className="ml-2">×</button>
        </div>
      )}

      {/* Header */}
      <div className="text-center glass-card-dark mb-8 px-6 py-8 md:px-12 md:py-10" style={{borderRadius: '2rem'}}>
        <div className="text-6xl mb-4">🏦</div>
        <h1 className="text-4xl font-extrabold text-yellow-100 mb-4">Staking Portal & Governance</h1>
        <p className="text-xl text-gray-100">
          Connected as: {principal?.slice(0, 10)}...{principal?.slice(-10)}
        </p>
      </div>

      {/* Staking Calculator */}
      <div className="glass-card-dark max-w-xl w-full mx-auto mb-8 p-8 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-yellow-100 mb-4">Staking Calculator</h2>
        <div className="w-full flex flex-col md:flex-row md:items-end gap-6 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-yellow-100 mb-2">Amount to Stake ($SPICY)</label>
            <input
              type="number"
              min="1"
              value={stakeInput}
              onChange={e => setStakeInput(Number(e.target.value))}
              className="w-full p-3 border border-yellow-400/40 rounded-md bg-black/30 text-yellow-100 placeholder-gray-400 focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="Enter $SPICY amount"
            />
          </div>
          <div className="flex-1 flex flex-col items-center">
            <label className="block text-sm font-medium text-yellow-100 mb-2">Staking Duration (months)</label>
            <div className="flex items-center w-full">
              <span className="text-2xl mr-2">3</span>
              <input
                type="range"
                min={minMonths}
                max={maxMonths}
                value={lockMonths}
                onChange={e => setLockMonths(Number(e.target.value))}
                className="flex-1 accent-red-500 h-2 rounded-lg appearance-none bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"
                style={{ background: 'none' }}
              />
              <span className="text-2xl ml-2">24</span>
            </div>
            <div className="flex justify-between w-full mt-2">
              <span className="text-lg">{'🌶️'.repeat(Math.round((lockMonths - minMonths) / (maxMonths - minMonths) * 7) + 1)}</span>
              <span className="text-yellow-200 font-bold">{lockMonths} mo</span>
            </div>
          </div>
        </div>
        <div className="w-full mt-4 p-4 rounded-lg bg-black/40 border border-yellow-400/20 flex flex-col items-center">
          <div className="text-lg text-yellow-100 mb-1">APY: <span className="font-bold text-orange-200">{calcAPY.toFixed(2)}%</span></div>
          <div className="text-lg text-yellow-100">Estimated $HEAT Earned: <span className="font-bold text-orange-200">{calcHeat}</span></div>
        </div>
      </div>

      {/* User Stake Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card-dark text-center">
          <div className="text-3xl font-bold text-yellow-200">
            {userStake ? Number(userStake.amount) : 0}
          </div>
          <div className="text-sm text-gray-100">Your Staked $SPICY</div>
        </div>
        <div className="glass-card-dark text-center">
          <div className="text-3xl font-bold text-green-200">
            {userStake && userStake.apy ? Number(userStake.apy).toFixed(1) : 0}%
          </div>
          <div className="text-sm text-gray-100">Your APY</div>
        </div>
        <div className="glass-card-dark text-center">
          <div className="text-3xl font-bold text-orange-200">
            {userStake ? userStake.rewards : 0}
          </div>
          <div className="text-sm text-gray-100">$HEAT Rewards Earned</div>
        </div>
        <div className="glass-card-dark text-center">
          <div className="text-3xl font-bold text-purple-200">
            {totalStaked.toLocaleString()}
          </div>
          <div className="text-sm text-gray-100">Total Staked</div>
        </div>
      </div>

      {/* Staking Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stake */}
        <div className="glass-card-dark">
          <h2 className="text-2xl font-bold text-yellow-100 mb-4">Stake $SPICY Tokens</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount to Stake ($SPICY)
              </label>
              <input
                type="number"
                value={stakeInput}
                onChange={(e) => setStakeInput(e.target.value)}
                placeholder="Enter amount"
                className="w-full p-3 border border-yellow-400/40 rounded-md bg-black/30 text-yellow-100 placeholder-gray-400 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lock Period (months)
              </label>
              <input
                type="number"
                min="3"
                max="24"
                value={lockMonths}
                onChange={(e) => setLockMonths(Number(e.target.value))}
                className="w-full p-3 border border-yellow-400/40 rounded-md bg-black/30 text-yellow-100 placeholder-gray-400 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            <div className="bg-yellow-900/40 border border-yellow-400/30 rounded-lg p-4">
              <div className="text-sm text-yellow-200">
                <strong>Estimated APY:</strong> {calcAPY.toFixed(2)}%
              </div>
            </div>
            <button 
              onClick={handleStake}
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold py-3 px-6 rounded-md hover:bg-yellow-600 transition-colors shadow-lg disabled:opacity-50"
            >
              {loading ? 'Staking...' : '🌶️ Stake $SPICY Tokens'}
            </button>
          </div>
        </div>

        {/* Unstake */}
        <div className="glass-card-dark">
          <h2 className="text-2xl font-bold text-yellow-100 mb-4">Unstake $SPICY Tokens</h2>
          <div className="space-y-4">
            <div className="bg-red-900/40 border border-red-400/30 rounded-lg p-4">
              <div className="text-sm text-red-200">
                <strong>Note:</strong> Unstaking requires lock period to end
              </div>
            </div>
            <button 
              onClick={handleUnstake}
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-gray-100 font-bold py-3 px-6 rounded-md hover:bg-red-600 transition-colors shadow-lg disabled:opacity-50"
            >
              {loading ? 'Unstaking...' : '🔓 Unstake $SPICY Tokens'}
            </button>
          </div>
        </div>

        {/* Claim Rewards */}
        <div className="glass-card-dark">
          <h2 className="text-2xl font-bold text-yellow-100 mb-4">Claim $HEAT Rewards</h2>
          <div className="space-y-4">
            <div className="bg-green-900/40 border border-green-400/30 rounded-lg p-4">
              <div className="text-sm text-green-200">
                <strong>Available:</strong> {userStake ? userStake.rewards : 0} $HEAT
              </div>
            </div>
            <button 
              onClick={handleClaimRewards}
              disabled={loading || !userStake || userStake.rewards === 0}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-gray-100 font-bold py-3 px-6 rounded-md hover:bg-green-600 transition-colors shadow-lg disabled:opacity-50"
            >
              {loading ? 'Claiming...' : '⚡ Claim $HEAT Rewards'}
            </button>
          </div>
        </div>
      </div>

      {/* Governance Proposals */}
      <div className="glass-card-dark">
        <h2 className="text-2xl font-bold text-yellow-100 mb-4">Governance Proposals</h2>
        <div className="space-y-4">
          {proposals.length === 0 ? (
            <div className="text-center text-gray-300 py-8">
              No proposals yet. Create the first one!
            </div>
          ) : (
            proposals.map((proposal) => (
              <div key={proposal.id} className="p-4 border border-purple-400/20 rounded-lg bg-black/20">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-purple-100">{proposal.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    proposal.executed ? 'bg-green-500' : 'bg-yellow-500'
                  }`}>
                    {proposal.executed ? 'Executed' : 'Active'}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-3">{proposal.description}</p>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    Votes: {proposal.votes_for} For / {proposal.votes_against} Against
                  </div>
                  {!proposal.executed && (
                    <div className="space-x-2">
                      <button
                        onClick={() => handleVote(proposal.id, true)}
                        disabled={loading}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
                      >
                        Vote For
                      </button>
                      <button
                        onClick={() => handleVote(proposal.id, false)}
                        disabled={loading}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
                      >
                        Vote Against
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Transaction Log */}
      <div className="glass-card-dark max-w-4xl w-full mx-auto mt-8 p-6">
        <h2 className="text-2xl font-bold text-yellow-100 mb-4">Transaction Log</h2>
        
        {/* Transaction Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-400/30 rounded-lg p-4 text-center"
          >
            <div className="text-2xl font-bold text-blue-300">
              {(transactionStats.total || 0).toLocaleString()}
            </div>
            <div className="text-sm text-blue-200">Total Transactions</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-400/30 rounded-lg p-4 text-center"
          >
            <div className="text-2xl font-bold text-green-300">
              {formatAmount(transactionStats.volume || 0, 'SPICY')}
            </div>
            <div className="text-sm text-green-200">Total Volume (SPICY)</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-400/30 rounded-lg p-4 text-center"
          >
            <div className="text-2xl font-bold text-purple-300">
              {(transactionStats.users || 0).toLocaleString()}
            </div>
            <div className="text-sm text-purple-200">Active Users</div>
          </motion.div>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <select
              value={transactionFilters.type}
              onChange={(e) => setTransactionFilters({ ...transactionFilters, type: e.target.value })}
              className="p-2 border border-yellow-400/40 rounded-md bg-black/30 text-yellow-100 focus:ring-yellow-500 focus:border-yellow-500"
            >
              <option value="all">All Types</option>
              <option value="transfer">Transfers</option>
              <option value="mint">Mints</option>
              <option value="burn">Burns</option>
              <option value="stake">Stakes</option>
              <option value="unstake">Unstakes</option>
              <option value="claim">Claims</option>
            </select>
            <select
              value={transactionFilters.token}
              onChange={(e) => setTransactionFilters({ ...transactionFilters, token: e.target.value })}
              className="p-2 border border-yellow-400/40 rounded-md bg-black/30 text-yellow-100 focus:ring-yellow-500 focus:border-yellow-500"
            >
              <option value="all">All Tokens</option>
              <option value="SPICY">SPICY</option>
              <option value="HEAT">HEAT</option>
            </select>
            <select
              value={transactionFilters.timeRange}
              onChange={(e) => setTransactionFilters({ ...transactionFilters, timeRange: e.target.value })}
              className="p-2 border border-yellow-400/40 rounded-md bg-black/30 text-yellow-100 focus:ring-yellow-500 focus:border-yellow-500"
            >
              <option value="all">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadTransactionHistory}
              disabled={transactionLoading}
              className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
              title="Refresh transactions"
            >
              🔄
            </button>
            <button
              onClick={exportTransactions}
              className="p-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors disabled:opacity-50"
              title="Export transactions"
            >
              📄
            </button>
            <button
              onClick={() => setShowTransactionLog(!showTransactionLog)}
              className="p-2 bg-yellow-500 text-gray-900 rounded-md hover:bg-yellow-600 transition-colors"
            >
              {showTransactionLog ? 'Hide Log' : 'Show Log'}
            </button>
          </div>
        </div>
        {showTransactionLog && (
          <div className="overflow-y-auto max-h-96">
            {transactionLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-2"></div>
                <div className="text-gray-300">Loading transactions...</div>
              </div>
            ) : getFilteredTransactions().length === 0 ? (
              <div className="text-center py-8 text-gray-300">
                <div className="text-4xl mb-2">📭</div>
                <div>No transactions found matching your criteria.</div>
                <div className="text-sm text-gray-400 mt-1">Try adjusting your filters or refresh the data.</div>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="wait">
                  {getFilteredTransactions().map((tx, index) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-600/30 hover:border-yellow-400/50 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`text-3xl ${getTransactionDisplay(tx).icon}`}>
                            {getTransactionDisplay(tx).icon}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionDisplay(tx).bg} ${getTransactionDisplay(tx).color}`}>
                                {tx.tx_type.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-400">#{tx.id}</span>
                            </div>
                            <div className="text-sm text-white font-medium">
                              {tx.tx_type === 'transfer' ? (
                                <span>
                                  <span className="text-gray-300">From:</span> {tx.from.slice(0, 8)}...{tx.from.slice(-8)}
                                  <span className="mx-2 text-yellow-400">→</span>
                                  <span className="text-gray-300">To:</span> {tx.to.slice(0, 8)}...{tx.to.slice(-8)}
                                </span>
                              ) : tx.tx_type === 'burn' ? (
                                <span>
                                  <span className="text-gray-300">Burned by:</span> {tx.from.slice(0, 8)}...{tx.from.slice(-8)}
                                </span>
                              ) : (
                                <span>
                                  <span className="text-gray-300">User:</span> {tx.from.slice(0, 8)}...{tx.from.slice(-8)}
                                </span>
                              )}
                            </div>
                            <div className="text-lg font-bold text-yellow-300">
                              {formatAmount(tx.amount, tx.token)} {tx.token}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400 mb-1">
                            {formatTimestamp(tx.timestamp)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Source: {tx.source || 'wallet2'}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom glassmorphic dark card style */}
      <style>{`
        .glass-card-dark {
          background: rgba(20, 20, 30, 0.85);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18);
          border-radius: 1.5rem;
          border: 1px solid rgba(255,255,255,0.10);
          backdrop-filter: blur(8px);
        }
      `}</style>
    </div>
  );
};

export default PortalPage; 
import { transactionService } from './TransactionService';

class MultiChainTransactionService extends transactionService {
  constructor() {
    super();
    this.suiTransactions = [];
    this.solanaTransactions = [];
    this.icTransactions = [];
    this.virtualSpicyBalance = 0;
    this.votingHistory = [];
    this.stakingHistory = [];
    
    // Load existing data
    this.loadStoredData();
  }

  // Load stored transaction data
  loadStoredData() {
    try {
      // Load SUI transactions
      const storedSUITransactions = JSON.parse(localStorage.getItem('ic_spicy_sui_transactions') || '[]');
      this.suiTransactions = storedSUITransactions;

      // Load Solana transactions
      const storedSolanaTransactions = JSON.parse(localStorage.getItem('ic_spicy_solana_transactions') || '[]');
      this.solanaTransactions = storedSolanaTransactions;

      // Load IC transactions
      const storedICTransactions = JSON.parse(localStorage.getItem('ic_spicy_ic_transactions') || '[]');
      this.icTransactions = storedICTransactions;

      // Load virtual SPICY balance
      this.virtualSpicyBalance = parseInt(localStorage.getItem('ic_spicy_virtual_balance') || '0');

      // Load voting history
      const storedVotingHistory = JSON.parse(localStorage.getItem('ic_spicy_voting_history') || '[]');
      this.votingHistory = storedVotingHistory;

      // Load staking history
      const storedStakingHistory = JSON.parse(localStorage.getItem('ic_spicy_staking_history') || '[]');
      this.stakingHistory = storedStakingHistory;

      console.log('📊 Multi-chain transaction data loaded');
    } catch (error) {
      console.error('Failed to load stored transaction data:', error);
    }
  }

  // Save data to localStorage
  saveData() {
    try {
      localStorage.setItem('ic_spicy_sui_transactions', JSON.stringify(this.suiTransactions));
      localStorage.setItem('ic_spicy_solana_transactions', JSON.stringify(this.solanaTransactions));
      localStorage.setItem('ic_spicy_ic_transactions', JSON.stringify(this.icTransactions));
      localStorage.setItem('ic_spicy_virtual_balance', this.virtualSpicyBalance.toString());
      localStorage.setItem('ic_spicy_voting_history', JSON.stringify(this.votingHistory));
      localStorage.setItem('ic_spicy_staking_history', JSON.stringify(this.stakingHistory));
    } catch (error) {
      console.error('Failed to save transaction data:', error);
    }
  }

  // Record SUI NFT staking transaction
  async recordSUINFTStaking({ userPrincipal, nftId, lockDuration, transactionHash, metadata }) {
    const transaction = {
      id: `sui_stake_${Date.now()}`,
      userPrincipal,
      type: 'sui_nft_staking',
      amount: 0,
      currency: 'SUI_NFT',
      transactionHash,
      chain: 'SUI',
      timestamp: Date.now(),
      metadata: {
        nftId,
        lockDuration,
        ...metadata
      }
    };

    this.suiTransactions.push(transaction);
    this.saveData();

    // Also record in main analytics
    await this.recordTransaction(userPrincipal, 'sui_nft_staking', 0, 'SUI_NFT', transactionHash, metadata);
    
    console.log('📝 SUI NFT staking transaction recorded');
  }

  // Record SUI reward claim
  async recordSUIRewardClaim({ userPrincipal, stakeId, rewards, transactionHash, metadata }) {
    const transaction = {
      id: `sui_claim_${Date.now()}`,
      userPrincipal,
      type: 'sui_reward_claim',
      amount: rewards,
      currency: 'VIRTUAL_SPICY',
      transactionHash,
      chain: 'SUI',
      timestamp: Date.now(),
      metadata: {
        stakeId,
        rewards,
        ...metadata
      }
    };

    this.suiTransactions.push(transaction);
    this.virtualSpicyBalance += rewards;
    this.saveData();

    await this.recordTransaction(userPrincipal, 'sui_reward_claim', rewards, 'VIRTUAL_SPICY', transactionHash, metadata);
    
    console.log('🎁 SUI reward claim recorded:', rewards, 'virtual SPICY');
  }

  // Record Solana NFT staking transaction
  async recordSolanaNFTStaking({ userPrincipal, nftId, lockDuration, transactionHash, metadata }) {
    const transaction = {
      id: `solana_stake_${Date.now()}`,
      userPrincipal,
      type: 'solana_nft_staking',
      amount: 0,
      currency: 'SOLANA_NFT',
      transactionHash,
      chain: 'SOLANA',
      timestamp: Date.now(),
      metadata: {
        nftId,
        lockDuration,
        ...metadata
      }
    };

    this.solanaTransactions.push(transaction);
    this.saveData();

    await this.recordTransaction(userPrincipal, 'solana_nft_staking', 0, 'SOLANA_NFT', transactionHash, metadata);
    
    console.log('📝 Solana NFT staking transaction recorded');
  }

  // Record Solana reward claim
  async recordSolanaRewardClaim({ userPrincipal, stakeId, rewards, transactionHash, metadata }) {
    const transaction = {
      id: `solana_claim_${Date.now()}`,
      userPrincipal,
      type: 'solana_reward_claim',
      amount: rewards,
      currency: 'VIRTUAL_SPICY',
      transactionHash,
      chain: 'SOLANA',
      timestamp: Date.now(),
      metadata: {
        stakeId,
        rewards,
        ...metadata
      }
    };

    this.solanaTransactions.push(transaction);
    this.virtualSpicyBalance += rewards;
    this.saveData();

    await this.recordTransaction(userPrincipal, 'solana_reward_claim', rewards, 'VIRTUAL_SPICY', transactionHash, metadata);
    
    console.log('🎁 Solana reward claim recorded:', rewards, 'virtual SPICY');
  }

  // Record IC NFT staking transaction
  async recordICNFTStaking({ userPrincipal, nftId, lockDuration, transactionHash, metadata }) {
    const transaction = {
      id: `ic_stake_${Date.now()}`,
      userPrincipal,
      type: 'ic_nft_staking',
      amount: 0,
      currency: 'IC_NFT',
      transactionHash,
      chain: 'IC',
      timestamp: Date.now(),
      metadata: {
        nftId,
        lockDuration,
        ...metadata
      }
    };

    this.icTransactions.push(transaction);
    this.saveData();

    await this.recordTransaction(userPrincipal, 'ic_nft_staking', 0, 'IC_NFT', transactionHash, metadata);
    
    console.log('📝 IC NFT staking transaction recorded');
  }

  // Record IC reward claim
  async recordICRewardClaim({ userPrincipal, stakeId, rewards, transactionHash, metadata }) {
    const transaction = {
      id: `ic_claim_${Date.now()}`,
      userPrincipal,
      type: 'ic_reward_claim',
      amount: rewards,
      currency: 'VIRTUAL_SPICY',
      transactionHash,
      chain: 'IC',
      timestamp: Date.now(),
      metadata: {
        stakeId,
        rewards,
        ...metadata
      }
    };

    this.icTransactions.push(transaction);
    this.virtualSpicyBalance += rewards;
    this.saveData();

    await this.recordTransaction(userPrincipal, 'ic_reward_claim', rewards, 'VIRTUAL_SPICY', transactionHash, metadata);
    
    console.log('🎁 IC reward claim recorded:', rewards, 'virtual SPICY');
  }

  // Record voting transaction
  async recordVoting({ userPrincipal, proposalId, voteFor, votingPower, transactionHash, metadata }) {
    const vote = {
      id: `vote_${Date.now()}`,
      userPrincipal,
      proposalId,
      voteFor,
      votingPower,
      transactionHash,
      timestamp: Date.now(),
      metadata: {
        ...metadata
      }
    };

    this.votingHistory.push(vote);
    this.saveData();

    await this.recordTransaction(userPrincipal, 'voting', votingPower, 'VOTE', transactionHash, {
      proposalId,
      voteFor,
      votingPower,
      ...metadata
    });
    
    console.log('🗳️ Voting transaction recorded');
  }

  // Record staking activity
  async recordStakingActivity({ userPrincipal, type, amount, currency, chain, transactionHash, metadata }) {
    const stakingRecord = {
      id: `staking_${Date.now()}`,
      userPrincipal,
      type, // 'stake', 'unstake', 'claim'
      amount,
      currency,
      chain,
      transactionHash,
      timestamp: Date.now(),
      metadata: {
        ...metadata
      }
    };

    this.stakingHistory.push(stakingRecord);
    this.saveData();

    await this.recordTransaction(userPrincipal, type, amount, currency, transactionHash, {
      chain,
      ...metadata
    });
    
    console.log('🔒 Staking activity recorded:', type);
  }

  // Get multi-chain analytics
  getMultiChainAnalytics() {
    const allTransactions = [
      ...this.transactions,
      ...this.suiTransactions,
      ...this.solanaTransactions,
      ...this.icTransactions
    ];

    const chainBreakdown = {
      ic: {
        staked: this.icTransactions.filter(t => t.type === 'ic_nft_staking').length,
        rewards: this.icTransactions.filter(t => t.type === 'ic_reward_claim').reduce((sum, t) => sum + t.amount, 0),
        transactions: this.icTransactions.length
      },
      sui: {
        staked: this.suiTransactions.filter(t => t.type === 'sui_nft_staking').length,
        rewards: this.suiTransactions.filter(t => t.type === 'sui_reward_claim').reduce((sum, t) => sum + t.amount, 0),
        transactions: this.suiTransactions.length
      },
      solana: {
        staked: this.solanaTransactions.filter(t => t.type === 'solana_nft_staking').length,
        rewards: this.solanaTransactions.filter(t => t.type === 'solana_reward_claim').reduce((sum, t) => sum + t.amount, 0),
        transactions: this.solanaTransactions.length
      }
    };

    return {
      total: {
        transactions: allTransactions.length,
        nftsStaked: this.calculateTotalNFTsStaked(),
        rewardsEarned: this.calculateTotalRewardsEarned(),
        votingPower: this.calculateTotalVotingPower(),
        activeStakes: this.calculateActiveStakes(),
        virtualSpicyBalance: this.virtualSpicyBalance
      },
      chainBreakdown,
      recentTransactions: allTransactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10),
      votingHistory: this.votingHistory,
      stakingHistory: this.stakingHistory
    };
  }

  // Calculate total NFTs staked across all chains
  calculateTotalNFTsStaked() {
    const icStaked = this.icTransactions.filter(t => t.type === 'ic_nft_staking').length;
    const suiStaked = this.suiTransactions.filter(t => t.type === 'sui_nft_staking').length;
    const solanaStaked = this.solanaTransactions.filter(t => t.type === 'solana_nft_staking').length;
    
    return icStaked + suiStaked + solanaStaked;
  }

  // Calculate total rewards earned across all chains
  calculateTotalRewardsEarned() {
    const icRewards = this.icTransactions
      .filter(t => t.type === 'ic_reward_claim')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const suiRewards = this.suiTransactions
      .filter(t => t.type === 'sui_reward_claim')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const solanaRewards = this.solanaTransactions
      .filter(t => t.type === 'solana_reward_claim')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return icRewards + suiRewards + solanaRewards;
  }

  // Calculate total voting power
  calculateTotalVotingPower() {
    // Voting power is based on staked NFTs
    const icVotingPower = this.icTransactions.filter(t => t.type === 'ic_nft_staking').length;
    const suiVotingPower = this.suiTransactions.filter(t => t.type === 'sui_nft_staking').length * 1.5; // SUI NFTs worth more
    const solanaVotingPower = this.solanaTransactions.filter(t => t.type === 'solana_nft_staking').length * 1.2; // Solana NFTs worth slightly more
    
    return Math.floor(icVotingPower + suiVotingPower + solanaVotingPower);
  }

  // Calculate active stakes
  calculateActiveStakes() {
    const now = Date.now();
    
    const icActive = this.icTransactions.filter(t => {
      if (t.type !== 'ic_nft_staking') return false;
      const lockDuration = t.metadata?.lockDuration || 2592000; // 30 days default
      return (now - t.timestamp) < lockDuration * 1000;
    }).length;
    
    const suiActive = this.suiTransactions.filter(t => {
      if (t.type !== 'sui_nft_staking') return false;
      const lockDuration = t.metadata?.lockDuration || 2592000; // 30 days default
      return (now - t.timestamp) < lockDuration * 1000;
    }).length;
    
    const solanaActive = this.solanaTransactions.filter(t => {
      if (t.type !== 'solana_nft_staking') return false;
      const lockDuration = t.metadata?.lockDuration || 2592000; // 30 days default
      return (now - t.timestamp) < lockDuration * 1000;
    }).length;
    
    return icActive + suiActive + solanaActive;
  }

  // Get transaction history by chain
  getTransactionHistoryByChain(chain) {
    switch (chain) {
      case 'ic':
        return this.icTransactions.sort((a, b) => b.timestamp - a.timestamp);
      case 'sui':
        return this.suiTransactions.sort((a, b) => b.timestamp - a.timestamp);
      case 'solana':
        return this.solanaTransactions.sort((a, b) => b.timestamp - a.timestamp);
      case 'all':
      default:
        return [
          ...this.transactions,
          ...this.suiTransactions,
          ...this.solanaTransactions,
          ...this.icTransactions
        ].sort((a, b) => b.timestamp - a.timestamp);
    }
  }

  // Get staking summary
  getStakingSummary() {
    const now = Date.now();
    
    return {
      totalStaked: this.calculateTotalNFTsStaked(),
      totalRewards: this.calculateTotalRewardsEarned(),
      activeStakes: this.calculateActiveStakes(),
      virtualSpicyBalance: this.virtualSpicyBalance,
      chainBreakdown: {
        ic: {
          staked: this.icTransactions.filter(t => t.type === 'ic_nft_staking').length,
          active: this.icTransactions.filter(t => {
            if (t.type !== 'ic_nft_staking') return false;
            const lockDuration = t.metadata?.lockDuration || 2592000;
            return (now - t.timestamp) < lockDuration * 1000;
          }).length,
          rewards: this.icTransactions.filter(t => t.type === 'ic_reward_claim').reduce((sum, t) => sum + t.amount, 0)
        },
        sui: {
          staked: this.suiTransactions.filter(t => t.type === 'sui_nft_staking').length,
          active: this.suiTransactions.filter(t => {
            if (t.type !== 'sui_nft_staking') return false;
            const lockDuration = t.metadata?.lockDuration || 2592000;
            return (now - t.timestamp) < lockDuration * 1000;
          }).length,
          rewards: this.suiTransactions.filter(t => t.type === 'sui_reward_claim').reduce((sum, t) => sum + t.amount, 0)
        },
        solana: {
          staked: this.solanaTransactions.filter(t => t.type === 'solana_nft_staking').length,
          active: this.solanaTransactions.filter(t => {
            if (t.type !== 'solana_nft_staking') return false;
            const lockDuration = t.metadata?.lockDuration || 2592000;
            return (now - t.timestamp) < lockDuration * 1000;
          }).length,
          rewards: this.solanaTransactions.filter(t => t.type === 'solana_reward_claim').reduce((sum, t) => sum + t.amount, 0)
        }
      }
    };
  }

  // Get voting summary
  getVotingSummary() {
    return {
      totalVotes: this.votingHistory.length,
      votingPower: this.calculateTotalVotingPower(),
      recentVotes: this.votingHistory
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5),
      votesByProposal: this.votingHistory.reduce((acc, vote) => {
        if (!acc[vote.proposalId]) {
          acc[vote.proposalId] = { for: 0, against: 0 };
        }
        if (vote.voteFor) {
          acc[vote.proposalId].for += vote.votingPower;
        } else {
          acc[vote.proposalId].against += vote.votingPower;
        }
        return acc;
      }, {})
    };
  }

  // Add virtual SPICY rewards
  addVirtualSpicyRewards(amount, source = 'staking') {
    this.virtualSpicyBalance += amount;
    this.saveData();
    
    console.log(`🎁 Added ${amount} virtual SPICY from ${source}. Total: ${this.virtualSpicyBalance}`);
  }

  // Spend virtual SPICY
  spendVirtualSpicy(amount, purpose = 'spending') {
    if (this.virtualSpicyBalance >= amount) {
      this.virtualSpicyBalance -= amount;
      this.saveData();
      
      console.log(`💰 Spent ${amount} virtual SPICY on ${purpose}. Remaining: ${this.virtualSpicyBalance}`);
      return true;
    } else {
      console.warn(`⚠️ Insufficient virtual SPICY balance. Required: ${amount}, Available: ${this.virtualSpicyBalance}`);
      return false;
    }
  }

  // Get virtual SPICY balance
  getVirtualSpicyBalance() {
    return this.virtualSpicyBalance;
  }

  // Export all data
  exportData() {
    return {
      suiTransactions: this.suiTransactions,
      solanaTransactions: this.solanaTransactions,
      icTransactions: this.icTransactions,
      votingHistory: this.votingHistory,
      stakingHistory: this.stakingHistory,
      virtualSpicyBalance: this.virtualSpicyBalance,
      analytics: this.getMultiChainAnalytics(),
      exportDate: new Date().toISOString()
    };
  }

  // Clear all data
  clearAllData() {
    this.suiTransactions = [];
    this.solanaTransactions = [];
    this.icTransactions = [];
    this.votingHistory = [];
    this.stakingHistory = [];
    this.virtualSpicyBalance = 0;
    
    localStorage.removeItem('ic_spicy_sui_transactions');
    localStorage.removeItem('ic_spicy_solana_transactions');
    localStorage.removeItem('ic_spicy_ic_transactions');
    localStorage.removeItem('ic_spicy_voting_history');
    localStorage.removeItem('ic_spicy_staking_history');
    localStorage.removeItem('ic_spicy_virtual_balance');
    
    console.log('🗑️ All multi-chain transaction data cleared');
  }
}

export const multiChainTransactionService = new MultiChainTransactionService();

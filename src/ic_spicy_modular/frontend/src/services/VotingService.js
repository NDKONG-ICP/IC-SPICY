import { multiChainTransactionService } from './MultiChainTransactionService';

class VotingService {
  constructor() {
    this.votingPower = 0;
    this.userVotes = [];
    this.activeProposals = [];
    this.votingHistory = [];
    this.nftVotingRights = new Map(); // NFT ID -> voting power
    this.votingSessions = new Map(); // Session ID -> voting data
    
    // ICRC-7/ICRC-37 compliance settings
    this.complianceSettings = {
      maxVotingPower: 1000, // Maximum voting power per user
      votingCooldown: 86400, // 24 hours in seconds
      proposalDuration: 604800, // 7 days in seconds
      minimumStakeDuration: 86400, // 24 hours minimum stake for voting
      antiDoubleVoting: true,
      voteWeighting: 'linear', // 'linear', 'quadratic', 'logarithmic'
      requireNFTVerification: true
    };
    
    this.loadStoredData();
  }

  // Load stored voting data
  loadStoredData() {
    try {
      const storedVotes = JSON.parse(localStorage.getItem('ic_spicy_user_votes') || '[]');
      const storedProposals = JSON.parse(localStorage.getItem('ic_spicy_active_proposals') || '[]');
      const storedVotingHistory = JSON.parse(localStorage.getItem('ic_spicy_voting_history') || '[]');
      const storedVotingRights = JSON.parse(localStorage.getItem('ic_spicy_nft_voting_rights') || '{}');
      
      this.userVotes = storedVotes;
      this.activeProposals = storedProposals;
      this.votingHistory = storedVotingHistory;
      this.nftVotingRights = new Map(Object.entries(storedVotingRights));
      
      console.log('🗳️ Voting data loaded');
    } catch (error) {
      console.error('Failed to load voting data:', error);
    }
  }

  // Save voting data
  saveData() {
    try {
      localStorage.setItem('ic_spicy_user_votes', JSON.stringify(this.userVotes));
      localStorage.setItem('ic_spicy_active_proposals', JSON.stringify(this.activeProposals));
      localStorage.setItem('ic_spicy_voting_history', JSON.stringify(this.votingHistory));
      localStorage.setItem('ic_spicy_nft_voting_rights', JSON.stringify(Object.fromEntries(this.nftVotingRights)));
    } catch (error) {
      console.error('Failed to save voting data:', error);
    }
  }

  // Calculate voting power based on staked NFTs
  async calculateVotingPower(userPrincipal, stakedNFTs) {
    let totalPower = 0;
    const nftPowers = new Map();

    for (const nft of stakedNFTs) {
      const power = this.calculateNFTPower(nft);
      nftPowers.set(nft.id, power);
      totalPower += power;
    }

    // Apply compliance limits
    totalPower = Math.min(totalPower, this.complianceSettings.maxVotingPower);
    
    // Store NFT voting rights
    for (const [nftId, power] of nftPowers) {
      this.nftVotingRights.set(nftId, {
        power,
        userPrincipal,
        lastUpdated: Date.now()
      });
    }

    this.votingPower = totalPower;
    this.saveData();
    
    console.log(`🗳️ Voting power calculated: ${totalPower} from ${stakedNFTs.length} NFTs`);
    return totalPower;
  }

  // Calculate individual NFT voting power
  calculateNFTPower(nft) {
    let basePower = 1; // Base power per NFT
    
    // Apply rarity multipliers
    const rarity = this.getNFTRarity(nft);
    const rarityMultipliers = {
      'common': 1.0,
      'uncommon': 1.5,
      'rare': 2.0,
      'epic': 3.0,
      'legendary': 5.0
    };
    
    basePower *= (rarityMultipliers[rarity] || 1.0);
    
    // Apply chain-specific multipliers
    const chainMultipliers = {
      'IC': 1.0,     // Native IC NFTs
      'SUI': 1.2,    // SUI NFTs slightly more powerful
      'SOLANA': 1.1  // Solana NFTs slightly more powerful
    };
    
    basePower *= (chainMultipliers[nft.chain] || 1.0);
    
    // Apply staking duration bonus
    if (nft.stakedAt) {
      const stakingDuration = Date.now() - nft.stakedAt;
      const durationBonus = Math.min(1.5, 1 + (stakingDuration / (365 * 24 * 60 * 60 * 1000)) * 0.5); // Up to 50% bonus for 1 year
      basePower *= durationBonus;
    }
    
    return Math.floor(basePower);
  }

  // Get NFT rarity
  getNFTRarity(nft) {
    const name = (nft.name || nft.content?.fields?.name || '').toLowerCase();
    const attributes = nft.attributes || nft.content?.fields?.attributes || [];
    
    if (name.includes('legendary') || name.includes('mythic')) return 'legendary';
    if (name.includes('epic')) return 'epic';
    if (name.includes('rare')) return 'rare';
    if (name.includes('uncommon')) return 'uncommon';
    
    if (attributes.some(attr => 
      typeof attr === 'string' && attr.toLowerCase().includes('legendary')
    )) return 'legendary';
    if (attributes.some(attr => 
      typeof attr === 'string' && attr.toLowerCase().includes('epic')
    )) return 'epic';
    if (attributes.some(attr => 
      typeof attr === 'string' && attr.toLowerCase().includes('rare')
    )) return 'rare';
    if (attributes.some(attr => 
      typeof attr === 'string' && attr.toLowerCase().includes('uncommon')
    )) return 'uncommon';
    
    return 'common';
  }

  // Create new proposal
  async createProposal(proposalData, creatorPrincipal) {
    const proposal = {
      id: `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: proposalData.title,
      description: proposalData.description,
      options: proposalData.options || ['For', 'Against'], // Default binary voting
      category: proposalData.category || 'general',
      creator: creatorPrincipal,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.complianceSettings.proposalDuration * 1000,
      status: 'active', // 'active', 'passed', 'failed', 'expired'
      votes: {
        for: 0,
        against: 0,
        abstain: 0
      },
      totalVotingPower: 0,
      voterCount: 0,
      metadata: {
        ...proposalData.metadata,
        complianceVersion: '1.0',
        standard: 'ICRC-37'
      }
    };

    this.activeProposals.push(proposal);
    this.saveData();
    
    console.log('📋 New proposal created:', proposal.id);
    return proposal;
  }

  // Vote on proposal
  async voteOnProposal(proposalId, voteChoice, userPrincipal, stakedNFTs) {
    try {
      // Validate voting eligibility
      const validation = await this.validateVotingEligibility(proposalId, userPrincipal, stakedNFTs);
      if (!validation.eligible) {
        throw new Error(validation.reason);
      }

      // Calculate voting power
      const votingPower = await this.calculateVotingPower(userPrincipal, stakedNFTs);
      
      // Check for existing vote
      const existingVote = this.userVotes.find(vote => 
        vote.proposalId === proposalId && vote.userPrincipal === userPrincipal
      );

      if (existingVote && this.complianceSettings.antiDoubleVoting) {
        throw new Error('You have already voted on this proposal');
      }

      // Create vote record
      const vote = {
        id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        proposalId,
        userPrincipal,
        voteChoice,
        votingPower,
        nftsUsed: stakedNFTs.map(nft => nft.id),
        timestamp: Date.now(),
        metadata: {
          chain: 'multi-chain',
          complianceVersion: '1.0',
          standard: 'ICRC-37'
        }
      };

      // Update proposal votes
      const proposal = this.activeProposals.find(p => p.id === proposalId);
      if (proposal) {
        if (existingVote) {
          // Update existing vote
          const oldVote = existingVote;
          proposal.votes[oldVote.voteChoice.toLowerCase()] -= oldVote.votingPower;
          proposal.votes[voteChoice.toLowerCase()] += votingPower;
          oldVote.voteChoice = voteChoice;
          oldVote.votingPower = votingPower;
          oldVote.timestamp = Date.now();
        } else {
          // New vote
          proposal.votes[voteChoice.toLowerCase()] += votingPower;
          proposal.totalVotingPower += votingPower;
          proposal.voterCount += 1;
          this.userVotes.push(vote);
        }
      }

      // Record in voting history
      this.votingHistory.push(vote);
      
      // Record transaction
      await multiChainTransactionService.recordVoting({
        userPrincipal,
        proposalId,
        voteFor: voteChoice === 'For',
        votingPower,
        transactionHash: vote.id,
        metadata: {
          nftsUsed: stakedNFTs.map(nft => nft.id),
          chain: 'multi-chain'
        }
      });

      this.saveData();
      
      console.log(`🗳️ Vote recorded: ${voteChoice} with ${votingPower} power on proposal ${proposalId}`);
      return { success: true, vote, proposal };
    } catch (error) {
      console.error('Voting failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Validate voting eligibility
  async validateVotingEligibility(proposalId, userPrincipal, stakedNFTs) {
    try {
      // Check if proposal exists and is active
      const proposal = this.activeProposals.find(p => p.id === proposalId);
      if (!proposal) {
        return { eligible: false, reason: 'Proposal not found' };
      }

      if (proposal.status !== 'active') {
        return { eligible: false, reason: 'Proposal is not active' };
      }

      if (Date.now() > proposal.expiresAt) {
        return { eligible: false, reason: 'Proposal has expired' };
      }

      // Check minimum stake duration
      const now = Date.now();
      const eligibleNFTs = stakedNFTs.filter(nft => {
        const stakingDuration = now - (nft.stakedAt || 0);
        return stakingDuration >= this.complianceSettings.minimumStakeDuration * 1000;
      });

      if (eligibleNFTs.length === 0) {
        return { eligible: false, reason: 'No NFTs staked long enough to vote' };
      }

      // Check voting cooldown
      const lastVote = this.votingHistory
        .filter(vote => vote.userPrincipal === userPrincipal)
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (lastVote && (now - lastVote.timestamp) < this.complianceSettings.votingCooldown * 1000) {
        const timeLeft = this.complianceSettings.votingCooldown - Math.floor((now - lastVote.timestamp) / 1000);
        return { eligible: false, reason: `Voting cooldown active. ${timeLeft} seconds remaining` };
      }

      // Check NFT verification requirement
      if (this.complianceSettings.requireNFTVerification) {
        const verifiedNFTs = eligibleNFTs.filter(nft => this.verifyNFTOwnership(nft, userPrincipal));
        if (verifiedNFTs.length === 0) {
          return { eligible: false, reason: 'NFT ownership verification failed' };
        }
      }

      return { eligible: true, eligibleNFTs };
    } catch (error) {
      return { eligible: false, reason: 'Validation error: ' + error.message };
    }
  }

  // Verify NFT ownership
  verifyNFTOwnership(nft, userPrincipal) {
    // This would integrate with actual NFT ownership verification
    // For now, we'll assume NFTs in the staked list are owned
    return nft.owner === userPrincipal || nft.userPrincipal === userPrincipal;
  }

  // Get user's voting power
  getUserVotingPower(userPrincipal) {
    return this.votingPower;
  }

  // Get user's vote history
  getUserVoteHistory(userPrincipal) {
    return this.votingHistory.filter(vote => vote.userPrincipal === userPrincipal);
  }

  // Get proposal details
  getProposal(proposalId) {
    return this.activeProposals.find(p => p.id === proposalId);
  }

  // Get all active proposals
  getActiveProposals() {
    return this.activeProposals.filter(p => 
      p.status === 'active' && Date.now() < p.expiresAt
    );
  }

  // Get proposal results
  getProposalResults(proposalId) {
    const proposal = this.getProposal(proposalId);
    if (!proposal) return null;

    const totalVotes = proposal.votes.for + proposal.votes.against + proposal.votes.abstain;
    const participationRate = proposal.totalVotingPower > 0 ? 
      (totalVotes / proposal.totalVotingPower) * 100 : 0;

    return {
      proposalId,
      title: proposal.title,
      status: proposal.status,
      votes: proposal.votes,
      totalVotes,
      participationRate,
      voterCount: proposal.voterCount,
      createdAt: proposal.createdAt,
      expiresAt: proposal.expiresAt,
      results: {
        for: proposal.votes.for,
        against: proposal.votes.against,
        abstain: proposal.votes.abstain,
        forPercentage: totalVotes > 0 ? (proposal.votes.for / totalVotes) * 100 : 0,
        againstPercentage: totalVotes > 0 ? (proposal.votes.against / totalVotes) * 100 : 0,
        abstainPercentage: totalVotes > 0 ? (proposal.votes.abstain / totalVotes) * 100 : 0
      }
    };
  }

  // Update proposal status
  updateProposalStatus(proposalId) {
    const proposal = this.getProposal(proposalId);
    if (!proposal) return null;

    const now = Date.now();
    
    if (now > proposal.expiresAt) {
      proposal.status = 'expired';
    } else {
      // Determine if proposal passed based on voting results
      const totalVotes = proposal.votes.for + proposal.votes.against;
      const threshold = 0.5; // 50% threshold for passing
      
      if (totalVotes > 0) {
        const forPercentage = proposal.votes.for / totalVotes;
        proposal.status = forPercentage >= threshold ? 'passed' : 'failed';
      }
    }

    this.saveData();
    return proposal;
  }

  // Get voting statistics
  getVotingStatistics() {
    const totalProposals = this.activeProposals.length;
    const activeProposals = this.getActiveProposals().length;
    const completedProposals = this.activeProposals.filter(p => 
      p.status === 'passed' || p.status === 'failed' || p.status === 'expired'
    ).length;

    const totalVotes = this.votingHistory.length;
    const uniqueVoters = new Set(this.votingHistory.map(v => v.userPrincipal)).size;
    
    const averageVotingPower = totalVotes > 0 ? 
      this.votingHistory.reduce((sum, v) => sum + v.votingPower, 0) / totalVotes : 0;

    return {
      totalProposals,
      activeProposals,
      completedProposals,
      totalVotes,
      uniqueVoters,
      averageVotingPower: Math.round(averageVotingPower),
      participationRate: uniqueVoters > 0 ? (totalVotes / uniqueVoters) : 0
    };
  }

  // Get compliance report
  getComplianceReport() {
    return {
      standard: 'ICRC-37',
      complianceVersion: '1.0',
      settings: this.complianceSettings,
      violations: this.detectComplianceViolations(),
      recommendations: this.getComplianceRecommendations()
    };
  }

  // Detect compliance violations
  detectComplianceViolations() {
    const violations = [];

    // Check for double voting
    const doubleVotes = this.userVotes.reduce((acc, vote, index) => {
      const duplicate = this.userVotes.find((v, i) => 
        i !== index && v.proposalId === vote.proposalId && v.userPrincipal === vote.userPrincipal
      );
      if (duplicate) acc.push({ type: 'double_voting', vote, duplicate });
      return acc;
    }, []);

    if (doubleVotes.length > 0) {
      violations.push({
        type: 'double_voting',
        count: doubleVotes.length,
        severity: 'high'
      });
    }

    // Check for excessive voting power
    const excessivePower = this.votingHistory.filter(vote => 
      vote.votingPower > this.complianceSettings.maxVotingPower
    );

    if (excessivePower.length > 0) {
      violations.push({
        type: 'excessive_voting_power',
        count: excessivePower.length,
        severity: 'medium'
      });
    }

    return violations;
  }

  // Get compliance recommendations
  getComplianceRecommendations() {
    const recommendations = [];

    if (this.votingHistory.length > 100) {
      recommendations.push({
        type: 'performance',
        message: 'Consider implementing pagination for large voting datasets',
        priority: 'medium'
      });
    }

    if (this.activeProposals.length > 50) {
      recommendations.push({
        type: 'governance',
        message: 'Consider archiving old proposals to improve performance',
        priority: 'low'
      });
    }

    return recommendations;
  }

  // Export voting data
  exportVotingData() {
    return {
      userVotes: this.userVotes,
      activeProposals: this.activeProposals,
      votingHistory: this.votingHistory,
      votingPower: this.votingPower,
      statistics: this.getVotingStatistics(),
      complianceReport: this.getComplianceReport(),
      exportDate: new Date().toISOString()
    };
  }

  // Clear all voting data
  clearVotingData() {
    this.userVotes = [];
    this.activeProposals = [];
    this.votingHistory = [];
    this.nftVotingRights.clear();
    this.votingSessions.clear();
    
    localStorage.removeItem('ic_spicy_user_votes');
    localStorage.removeItem('ic_spicy_active_proposals');
    localStorage.removeItem('ic_spicy_voting_history');
    localStorage.removeItem('ic_spicy_nft_voting_rights');
    
    console.log('🗑️ All voting data cleared');
  }
}

export const votingService = new VotingService();

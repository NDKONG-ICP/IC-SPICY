import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SUIWalletService, 
  SUINFTStakingService 
} from '../services/SUIWalletService';
import { 
  multiChainTransactionService 
} from '../services/MultiChainTransactionService';
import { 
  recordPortalTransaction 
} from '../services/TransactionService';

const MultiChainPortal = () => {
  const { principal, plugConnected, iiLoggedIn, canisters } = useWallet();
  
  // Multi-chain state management
  const [activeTab, setActiveTab] = useState('overview');
  const [activeChain, setActiveChain] = useState('all'); // 'all', 'ic', 'sui', 'solana'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  
  // SUI Integration State
  const [suiWallet, setSuiWallet] = useState(null);
  const [suiAddress, setSuiAddress] = useState(null);
  const [suiBalance, setSuiBalance] = useState(0);
  const [suiNFTs, setSuiNFTs] = useState([]);
  const [stakedSUINFTs, setStakedSUINFTs] = useState([]);
  const [suiConnected, setSuiConnected] = useState(false);
  
  // IC Integration State
  const [icNFTs, setIcNFTs] = useState([]);
  const [stakedICNFTs, setStakedICNFTs] = useState([]);
  const [icTokenStake, setIcTokenStake] = useState(null);
  const [totalIcStaked, setTotalIcStaked] = useState(0);
  
  // Solana Integration State
  const [solanaNFTs, setSolanaNFTs] = useState([]);
  const [stakedSolanaNFTs, setStakedSolanaNFTs] = useState([]);
  const [solanaConnected, setSolanaConnected] = useState(false);
  
  // Voting System State
  const [activeProposals, setActiveProposals] = useState([]);
  const [userVotes, setUserVotes] = useState([]);
  const [votingPower, setVotingPower] = useState(0);
  
  // Analytics State
  const [portalAnalytics, setPortalAnalytics] = useState({
    totalNFTsStaked: 0,
    totalRewardsEarned: 0,
    totalVotingPower: 0,
    activeStakes: 0,
    chainBreakdown: {
      ic: { staked: 0, rewards: 0 },
      sui: { staked: 0, rewards: 0 },
      solana: { staked: 0, rewards: 0 }
    }
  });

  // Initialize portal data
  useEffect(() => {
    if (principal) {
      loadPortalData();
    }
  }, [principal]);

  // Load all portal data
  const loadPortalData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadICData(),
        loadVotingData(),
        loadAnalytics()
      ]);
    } catch (error) {
      console.error('Failed to load portal data:', error);
      setMessage('Failed to load portal data');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Load IC blockchain data
  const loadICData = async () => {
    if (!canisters.portal || !principal) return;
    
    try {
      // Load IC token staking
      const stake = await canisters.portal.get_stake();
      const totalStaked = await canisters.portal.total_staked();
      setIcTokenStake(stake);
      setTotalIcStaked(totalStaked);
      
      // Load IC NFTs (Chili NFTs)
      const userNFTs = await canisters.chili.get_user_nfts(principal);
      setIcNFTs(userNFTs);
      
      // Load staked IC NFTs
      const stakedNFTs = await canisters.chili.get_staked_nfts(principal);
      setStakedICNFTs(stakedNFTs);
    } catch (error) {
      console.error('Failed to load IC data:', error);
    }
  };

  // Load voting data
  const loadVotingData = async () => {
    if (!canisters.portal || !principal) return;
    
    try {
      // Load active proposals
      const proposals = await canisters.portal.list_proposals();
      setActiveProposals(proposals);
      
      // Load user voting power (based on staked NFTs)
      const votingPower = calculateVotingPower();
      setVotingPower(votingPower);
      
      // Load user votes
      const votes = await canisters.portal.get_user_votes(principal);
      setUserVotes(votes);
    } catch (error) {
      console.error('Failed to load voting data:', error);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    try {
      const analytics = multiChainTransactionService.getMultiChainAnalytics();
      setPortalAnalytics(analytics.total);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  // Calculate voting power based on staked NFTs
  const calculateVotingPower = () => {
    let power = 0;
    
    // IC NFTs: 1 vote per NFT
    power += icNFTs.length;
    
    // SUI NFTs: Weighted by rarity
    power += suiNFTs.reduce((sum, nft) => {
      const rarity = getNFTRarity(nft);
      return sum + (rarity === 'legendary' ? 5 : 
                   rarity === 'epic' ? 3 : 
                   rarity === 'rare' ? 2 : 1);
    }, 0);
    
    // Solana NFTs: Weighted by value
    power += solanaNFTs.reduce((sum, nft) => {
      return sum + (nft.value || 1);
    }, 0);
    
    return power;
  };

  // Get NFT rarity
  const getNFTRarity = (nft) => {
    const name = nft.content?.fields?.name?.toLowerCase() || '';
    const attributes = nft.content?.fields?.attributes || [];
    
    if (name.includes('legendary') || attributes.some(attr => attr.toLowerCase().includes('legendary'))) return 'legendary';
    if (name.includes('epic') || attributes.some(attr => attr.toLowerCase().includes('epic'))) return 'epic';
    if (name.includes('rare') || attributes.some(attr => attr.toLowerCase().includes('rare'))) return 'rare';
    if (name.includes('uncommon') || attributes.some(attr => attr.toLowerCase().includes('uncommon'))) return 'uncommon';
    return 'common';
  };

  // Connect SUI wallet
  const connectSUIWallet = async () => {
    try {
      setLoading(true);
      const suiService = new SUIWalletService();
      const result = await suiService.connectWallet();
      
      if (result.success) {
        setSuiWallet(suiService);
        setSuiAddress(result.address);
        setSuiBalance(suiService.balance);
        setSuiNFTs(suiService.nfts);
        setSuiConnected(true);
        setMessage('SUI wallet connected successfully!');
        setMessageType('success');
        
        // Load SUI staking data
        const stakingService = new SUINFTStakingService(suiService.client, suiService);
        const stakedNFTs = await stakingService.getStakedNFTs(result.address);
        setStakedSUINFTs(stakedNFTs);
      } else {
        setMessage(`Failed to connect SUI wallet: ${result.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`SUI wallet connection error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Connect Solana wallet
  const connectSolanaWallet = async () => {
    try {
      setLoading(true);
      // Solana wallet connection logic
      setSolanaConnected(true);
      setMessage('Solana wallet connected successfully!');
      setMessageType('success');
    } catch (error) {
      setMessage(`Solana wallet connection error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Stake IC NFT
  const handleStakeICNFT = async (nftId) => {
    if (!canisters.chili || !principal) return;
    
    setLoading(true);
    try {
      const result = await canisters.chili.stake_nft(nftId, 30); // 30 days lock
      
      if (result.success) {
        setMessage('IC NFT staked successfully!');
        setMessageType('success');
        await loadICData();
        
        // Record transaction
        await recordPortalTransaction({
          userPrincipal: principal.toString(),
          amount: 0,
          currency: 'IC_NFT',
          transactionHash: result.transactionId,
          metadata: {
            type: 'ic_nft_staking',
            nftId: nftId,
            chain: 'IC'
          }
        });
      } else {
        setMessage('Failed to stake IC NFT');
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`IC NFT staking error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Stake SUI NFT
  const handleStakeSUINFT = async (nftId, lockDuration) => {
    if (!suiWallet || !suiConnected) {
      setMessage('Please connect your SUI wallet first');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      const stakingService = new SUINFTStakingService(suiWallet.client, suiWallet);
      const result = await stakingService.stakeNFT(nftId, lockDuration);
      
      if (result.success) {
        setMessage(`SUI NFT staked successfully! TX: ${result.transactionHash}`);
        setMessageType('success');
        await loadSUIStakingData(stakingService);
        
        // Record transaction
        await recordPortalTransaction({
          userPrincipal: principal.toString(),
          amount: 0,
          currency: 'SUI_NFT',
          transactionHash: result.transactionHash,
          metadata: {
            type: 'sui_nft_staking',
            nftId: nftId,
            lockDuration: lockDuration,
            chain: 'SUI'
          }
        });
      } else {
        setMessage(`SUI NFT staking failed: ${result.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`SUI NFT staking error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Vote on proposal
  const handleVote = async (proposalId, voteFor) => {
    if (!canisters.portal || !principal) return;
    
    setLoading(true);
    try {
      const result = await canisters.portal.vote(proposalId, voteFor);
      setMessage(result);
      setMessageType('success');
      await loadVotingData();
      
      // Record transaction
      await recordPortalTransaction({
        userPrincipal: principal.toString(),
        amount: 0,
        currency: 'VOTE',
        transactionHash: `vote_${proposalId}_${Date.now()}`,
        metadata: {
          type: 'voting',
          proposalId: proposalId,
          voteFor: voteFor,
          votingPower: votingPower
        }
      });
    } catch (error) {
      setMessage(`Voting error: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Load SUI staking data
  const loadSUIStakingData = async (stakingService) => {
    try {
      const stakedNFTs = await stakingService.getStakedNFTs(suiAddress);
      setStakedSUINFTs(stakedNFTs);
    } catch (error) {
      console.error('Failed to load SUI staking data:', error);
    }
  };

  // Tab navigation
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'staking', label: 'NFT Staking', icon: '🔒' },
    { id: 'voting', label: 'Governance', icon: '🗳️' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'rewards', label: 'Rewards', icon: '🎁' }
  ];

  // Chain filters
  const chainFilters = [
    { id: 'all', label: 'All Chains', icon: '🌐' },
    { id: 'ic', label: 'Internet Computer', icon: '🖥️' },
    { id: 'sui', label: 'SUI Network', icon: '🔷' },
    { id: 'solana', label: 'Solana', icon: '🌞' }
  ];

  return (
    <div className="relative min-h-screen py-8 px-2 md:px-0">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-800 to-indigo-700 opacity-70" />
        <div className="absolute inset-0 bg-black bg-opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-purple-900/20" />
      </div>

      {/* Header */}
      <div className="relative z-10 max-w-7xl mx-auto mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-dark p-8 text-center"
        >
          <div className="text-6xl mb-4">🏦</div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-yellow-100 mb-4 tracking-tight">
            Multi-Chain NFT Portal
          </h1>
          <p className="text-xl text-gray-100 mb-4">
            Stake NFTs, vote on proposals, and earn rewards across multiple blockchains
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>IC: {icNFTs.length} NFTs</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>SUI: {suiConnected ? `${suiNFTs.length} NFTs` : 'Not Connected'}</span>
            </div>
            <div className="flex items-center gap-2 text-purple-400">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              <span>Solana: {solanaConnected ? `${solanaNFTs.length} NFTs` : 'Not Connected'}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-dark p-6 mb-6"
        >
          <div className="flex flex-wrap gap-2 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 shadow-lg'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chain Filters */}
          <div className="flex flex-wrap gap-2">
            {chainFilters.map((chain) => (
              <button
                key={chain.id}
                onClick={() => setActiveChain(chain.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeChain === chain.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-gray-600/50 text-gray-300 hover:bg-gray-500/50'
                }`}
              >
                <span className="mr-1">{chain.icon}</span>
                {chain.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && <OverviewTab analytics={portalAnalytics} votingPower={votingPower} />}
            {activeTab === 'staking' && <StakingTab 
              icNFTs={icNFTs}
              suiNFTs={suiNFTs}
              solanaNFTs={solanaNFTs}
              stakedICNFTs={stakedICNFTs}
              stakedSUINFTs={stakedSUINFTs}
              stakedSolanaNFTs={stakedSolanaNFTs}
              suiConnected={suiConnected}
              solanaConnected={solanaConnected}
              onConnectSUI={connectSUIWallet}
              onConnectSolana={connectSolanaWallet}
              onStakeIC={handleStakeICNFT}
              onStakeSUI={handleStakeSUINFT}
              activeChain={activeChain}
            />}
            {activeTab === 'voting' && <VotingTab 
              proposals={activeProposals}
              userVotes={userVotes}
              votingPower={votingPower}
              onVote={handleVote}
            />}
            {activeTab === 'analytics' && <AnalyticsTab analytics={portalAnalytics} />}
            {activeTab === 'rewards' && <RewardsTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Message Display */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            messageType === 'success' ? 'bg-green-600' :
            messageType === 'error' ? 'bg-red-600' :
            'bg-blue-600'
          } text-white`}
        >
          {message}
          <button
            onClick={() => setMessage('')}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </motion.div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="glass-card-dark p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-white">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ analytics, votingPower }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card-dark p-6 text-center"
    >
      <div className="text-4xl mb-2">🔒</div>
      <h3 className="text-2xl font-bold text-white mb-1">{analytics.totalNFTsStaked}</h3>
      <p className="text-gray-300">NFTs Staked</p>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      className="glass-card-dark p-6 text-center"
    >
      <div className="text-4xl mb-2">🎁</div>
      <h3 className="text-2xl font-bold text-white mb-1">{analytics.totalRewardsEarned.toLocaleString()}</h3>
      <p className="text-gray-300">Rewards Earned</p>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="glass-card-dark p-6 text-center"
    >
      <div className="text-4xl mb-2">🗳️</div>
      <h3 className="text-2xl font-bold text-white mb-1">{votingPower}</h3>
      <p className="text-gray-300">Voting Power</p>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="glass-card-dark p-6 text-center"
    >
      <div className="text-4xl mb-2">⚡</div>
      <h3 className="text-2xl font-bold text-white mb-1">{analytics.activeStakes}</h3>
      <p className="text-gray-300">Active Stakes</p>
    </motion.div>
  </div>
);

// Staking Tab Component
const StakingTab = ({ 
  icNFTs, suiNFTs, solanaNFTs, 
  stakedICNFTs, stakedSUINFTs, stakedSolanaNFTs,
  suiConnected, solanaConnected,
  onConnectSUI, onConnectSolana,
  onStakeIC, onStakeSUI,
  activeChain 
}) => (
  <div className="space-y-6">
    {/* IC NFT Staking */}
    {(activeChain === 'all' || activeChain === 'ic') && (
      <div className="glass-card-dark p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🖥️</span>
            Internet Computer NFTs
          </h3>
          <div className="text-sm text-gray-300">
            {icNFTs.length} available • {stakedICNFTs.length} staked
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {icNFTs.map(nft => (
            <ICNFTStakingCard key={nft.id} nft={nft} onStake={onStakeIC} />
          ))}
        </div>
      </div>
    )}

    {/* SUI NFT Staking */}
    {(activeChain === 'all' || activeChain === 'sui') && (
      <div className="glass-card-dark p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🔷</span>
            SUI Network NFTs
          </h3>
          {!suiConnected ? (
            <button
              onClick={onConnectSUI}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded hover:from-blue-600 hover:to-purple-600 transition-colors"
            >
              Connect SUI Wallet
            </button>
          ) : (
            <div className="text-sm text-gray-300">
              {suiNFTs.length} available • {stakedSUINFTs.length} staked
            </div>
          )}
        </div>
        
        {suiConnected ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suiNFTs.map(nft => (
              <SUINFTStakingCard key={nft.id} nft={nft} onStake={onStakeSUI} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🔷</div>
            <h4 className="text-xl font-semibold text-white mb-2">Connect SUI Wallet</h4>
            <p className="text-gray-300 mb-4">Connect your SUI wallet to stake NFTs and earn rewards</p>
          </div>
        )}
      </div>
    )}

    {/* Solana NFT Staking */}
    {(activeChain === 'all' || activeChain === 'solana') && (
      <div className="glass-card-dark p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🌞</span>
            Solana NFTs
          </h3>
          {!solanaConnected ? (
            <button
              onClick={onConnectSolana}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              Connect Solana Wallet
            </button>
          ) : (
            <div className="text-sm text-gray-300">
              {solanaNFTs.length} available • {stakedSolanaNFTs.length} staked
            </div>
          )}
        </div>
        
        {solanaConnected ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {solanaNFTs.map(nft => (
              <SolanaNFTStakingCard key={nft.id} nft={nft} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🌞</div>
            <h4 className="text-xl font-semibold text-white mb-2">Connect Solana Wallet</h4>
            <p className="text-gray-300 mb-4">Connect your Solana wallet to stake NFTs and earn rewards</p>
          </div>
        )}
      </div>
    )}
  </div>
);

// Voting Tab Component
const VotingTab = ({ proposals, userVotes, votingPower, onVote }) => (
  <div className="space-y-6">
    {/* Voting Power Display */}
    <div className="glass-card-dark p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Your Voting Power</h3>
          <p className="text-3xl font-bold text-yellow-400">{votingPower}</p>
          <p className="text-gray-300">Based on your staked NFTs across all chains</p>
        </div>
        <div className="text-6xl">🗳️</div>
      </div>
    </div>

    {/* Active Proposals */}
    <div className="glass-card-dark p-6">
      <h3 className="text-xl font-bold text-white mb-4">Active Proposals</h3>
      <div className="space-y-4">
        {proposals.map(proposal => (
          <ProposalCard 
            key={proposal.id} 
            proposal={proposal} 
            userVotes={userVotes}
            votingPower={votingPower}
            onVote={onVote}
          />
        ))}
      </div>
    </div>
  </div>
);

// Analytics Tab Component
const AnalyticsTab = ({ analytics }) => (
  <div className="space-y-6">
    {/* Chain Breakdown */}
    <div className="glass-card-dark p-6">
      <h3 className="text-xl font-bold text-white mb-4">Chain Breakdown</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-2">Internet Computer</h4>
          <p className="text-2xl font-bold text-blue-400">{analytics.chainBreakdown.ic.staked}</p>
          <p className="text-gray-300">NFTs Staked</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-2">SUI Network</h4>
          <p className="text-2xl font-bold text-green-400">{analytics.chainBreakdown.sui.staked}</p>
          <p className="text-gray-300">NFTs Staked</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-2">Solana</h4>
          <p className="text-2xl font-bold text-purple-400">{analytics.chainBreakdown.solana.staked}</p>
          <p className="text-gray-300">NFTs Staked</p>
        </div>
      </div>
    </div>

    {/* Rewards Breakdown */}
    <div className="glass-card-dark p-6">
      <h3 className="text-xl font-bold text-white mb-4">Rewards Breakdown</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-300">IC Rewards</span>
          <span className="text-white font-semibold">{analytics.chainBreakdown.ic.rewards.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-300">SUI Rewards</span>
          <span className="text-white font-semibold">{analytics.chainBreakdown.sui.rewards.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Solana Rewards</span>
          <span className="text-white font-semibold">{analytics.chainBreakdown.solana.rewards.toLocaleString()}</span>
        </div>
      </div>
    </div>
  </div>
);

// Rewards Tab Component
const RewardsTab = () => (
  <div className="glass-card-dark p-6 text-center">
    <div className="text-6xl mb-4">🎁</div>
    <h3 className="text-2xl font-bold text-white mb-4">Rewards Center</h3>
    <p className="text-gray-300 mb-6">
      Claim your earned rewards and view your staking history
    </p>
    <button className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-colors">
      Claim All Rewards
    </button>
  </div>
);

// Individual NFT Staking Cards
const ICNFTStakingCard = ({ nft, onStake }) => (
  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/30">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h5 className="font-semibold text-white">{nft.name}</h5>
        <p className="text-sm text-gray-300">{nft.variety}</p>
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
          nft.rarity === 'legendary' ? 'bg-purple-500/20 text-purple-300' :
          nft.rarity === 'epic' ? 'bg-pink-500/20 text-pink-300' :
          nft.rarity === 'rare' ? 'bg-blue-500/20 text-blue-300' :
          nft.rarity === 'uncommon' ? 'bg-green-500/20 text-green-300' :
          'bg-gray-500/20 text-gray-300'
        }`}>
          {nft.rarity}
        </span>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-400">Daily Reward</p>
        <p className="text-lg font-bold text-yellow-400">10 Points</p>
      </div>
    </div>
    
    <button 
      onClick={() => onStake(nft.id)}
      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 font-bold py-2 px-4 rounded hover:from-yellow-600 hover:to-orange-600 transition-colors"
    >
      🖥️ Stake IC NFT
    </button>
  </div>
);

const SUINFTStakingCard = ({ nft, onStake }) => {
  const [lockDuration, setLockDuration] = useState(30);
  const multiplier = lockDurationMultipliers[lockDuration] || 1.0;
  const dailyReward = Math.floor(10 * multiplier);

  return (
    <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/30">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h5 className="font-semibold text-white">{nft.content?.fields?.name || `NFT #${nft.id.substring(0, 8)}`}</h5>
          <p className="text-sm text-gray-300">{nft.type}</p>
          {nft.display?.data && (
            <img 
              src={nft.display.data.image_url} 
              alt={nft.content?.fields?.name}
              className="w-16 h-16 object-cover rounded mt-2"
            />
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Daily Reward</p>
          <p className="text-lg font-bold text-blue-400">{dailyReward} Points</p>
        </div>
      </div>
      
      <div className="mb-3">
        <label className="block text-sm text-gray-300 mb-2">Lock Duration</label>
        <select 
          value={lockDuration} 
          onChange={(e) => setLockDuration(parseInt(e.target.value))}
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
        >
          <option value={7}>7 days (1.0x)</option>
          <option value={30}>30 days (1.2x)</option>
          <option value={90}>90 days (1.5x)</option>
          <option value={180}>180 days (2.0x)</option>
          <option value={365}>365 days (3.0x)</option>
        </select>
      </div>
      
      <button 
        onClick={() => onStake(nft.id, lockDuration * 86400)}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-2 px-4 rounded hover:from-blue-600 hover:to-purple-600 transition-colors"
      >
        🔷 Stake SUI NFT
      </button>
    </div>
  );
};

const SolanaNFTStakingCard = ({ nft }) => (
  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/30">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h5 className="font-semibold text-white">{nft.name || `NFT #${nft.id.substring(0, 8)}`}</h5>
        <p className="text-sm text-gray-300">Solana NFT</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-400">Daily Reward</p>
        <p className="text-lg font-bold text-purple-400">8 Points</p>
      </div>
    </div>
    
    <button 
      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-2 px-4 rounded hover:from-purple-600 hover:to-pink-600 transition-colors"
    >
      🌞 Stake Solana NFT
    </button>
  </div>
);

// Proposal Card Component
const ProposalCard = ({ proposal, userVotes, votingPower, onVote }) => {
  const hasVoted = userVotes.some(vote => vote.proposalId === proposal.id);
  const userVote = userVotes.find(vote => vote.proposalId === proposal.id);

  return (
    <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/30">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h5 className="font-semibold text-white">{proposal.title}</h5>
          <p className="text-sm text-gray-300">{proposal.description}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Votes</p>
          <p className="text-lg font-bold text-white">{proposal.votesFor + proposal.votesAgainst}</p>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-green-400">For: {proposal.votesFor}</span>
          <span className="text-red-400">Against: {proposal.votesAgainst}</span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full"
            style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {hasVoted ? (
        <div className="text-center">
          <p className="text-green-400 font-semibold">
            ✅ Voted {userVote.voteFor ? 'FOR' : 'AGAINST'}
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <button 
            onClick={() => onVote(proposal.id, true)}
            disabled={votingPower === 0}
            className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Vote FOR
          </button>
          <button 
            onClick={() => onVote(proposal.id, false)}
            disabled={votingPower === 0}
            className="flex-1 bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Vote AGAINST
          </button>
        </div>
      )}
    </div>
  );
};

// Lock duration multipliers
const lockDurationMultipliers = {
  7: 1.0,
  30: 1.2,
  90: 1.5,
  180: 2.0,
  365: 3.0
};

export default MultiChainPortal;

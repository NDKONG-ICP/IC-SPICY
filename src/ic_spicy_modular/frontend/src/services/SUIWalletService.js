import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';

class SUIWalletService {
  constructor() {
    this.client = new SuiClient({ url: getFullnodeUrl('mainnet') });
    this.wallet = null;
    this.address = null;
    this.balance = 0;
    this.nfts = [];
    this.isConnected = false;
    this.stakingContract = process.env.REACT_APP_SUI_STAKING_CONTRACT || '0x...'; // Your SUI staking contract
  }

  // Connect to SUI wallet
  async connectWallet() {
    try {
      // Check if wallet is available
      if (!window.sui) {
        throw new Error('SUI wallet not found. Please install a SUI wallet extension.');
      }

      // Request connection
      const result = await window.sui.requestAccounts();
      
      if (result && result.length > 0) {
        this.address = result[0];
        this.isConnected = true;
        
        // Load user data
        await this.loadBalance();
        await this.loadNFTs();
        
        console.log('✅ SUI wallet connected:', this.address);
        return { success: true, address: this.address };
      } else {
        throw new Error('No accounts returned from wallet');
      }
    } catch (error) {
      console.error('❌ SUI wallet connection failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Disconnect wallet
  disconnectWallet() {
    this.wallet = null;
    this.address = null;
    this.balance = 0;
    this.nfts = [];
    this.isConnected = false;
    console.log('🔌 SUI wallet disconnected');
  }

  // Load SUI balance
  async loadBalance() {
    if (!this.address) return;
    
    try {
      const balance = await this.client.getBalance({
        owner: this.address,
        coinType: '0x2::sui::SUI'
      });
      this.balance = parseInt(balance.totalBalance) / 1000000000; // Convert from MIST to SUI
      console.log('💰 SUI balance loaded:', this.balance);
    } catch (error) {
      console.error('Failed to load SUI balance:', error);
    }
  }

  // Load user's NFTs
  async loadNFTs() {
    if (!this.address) return;
    
    try {
      // Get all owned objects
      const objects = await this.client.getOwnedObjects({
        owner: this.address,
        options: {
          showContent: true,
          showDisplay: true,
          showType: true,
          showOwner: true
        }
      });
      
      // Filter for NFT-like objects
      this.nfts = objects.data
        .filter(obj => {
          const type = obj.data?.type;
          // Filter for NFT-like objects (customize based on your NFT standards)
          return type && (
            type.includes('nft') || 
            type.includes('NFT') ||
            type.includes('collectible') ||
            type.includes('art') ||
            type.includes('game') ||
            // Add your specific NFT collection types here
            type.includes('ic_spicy') ||
            type.includes('chili') ||
            type.includes('pepper')
          );
        })
        .map(obj => ({
          id: obj.data.objectId,
          type: obj.data.type,
          display: obj.data.display,
          content: obj.data.content,
          owner: this.address,
          createdAt: obj.data.createdAt,
          updatedAt: obj.data.updatedAt
        }));
      
      console.log('🎨 SUI NFTs loaded:', this.nfts.length);
      return this.nfts;
    } catch (error) {
      console.error('Failed to load SUI NFTs:', error);
      return [];
    }
  }

  // Get specific NFT collection
  async getNFTCollection(collectionType) {
    return this.nfts.filter(nft => 
      nft.type.includes(collectionType) || 
      nft.content?.fields?.name?.includes(collectionType) ||
      nft.display?.data?.name?.includes(collectionType)
    );
  }

  // Get NFT details
  async getNFTDetails(nftId) {
    try {
      const object = await this.client.getObject({
        id: nftId,
        options: {
          showContent: true,
          showDisplay: true,
          showType: true
        }
      });
      
      return {
        id: object.data.objectId,
        type: object.data.type,
        display: object.data.display,
        content: object.data.content,
        owner: object.data.owner
      };
    } catch (error) {
      console.error('Failed to get NFT details:', error);
      return null;
    }
  }

  // Check if NFT is stakable
  isStakable(nft) {
    // Add your staking eligibility logic here
    const type = nft.type;
    const name = nft.content?.fields?.name || nft.display?.data?.name || '';
    
    // Example: Only allow certain types of NFTs to be staked
    const stakableTypes = [
      'nft',
      'collectible',
      'art',
      'game',
      'ic_spicy',
      'chili',
      'pepper'
    ];
    
    return stakableTypes.some(stakableType => 
      type.toLowerCase().includes(stakableType) ||
      name.toLowerCase().includes(stakableType)
    );
  }

  // Get NFT rarity for reward calculation
  getNFTRarity(nft) {
    const name = (nft.content?.fields?.name || nft.display?.data?.name || '').toLowerCase();
    const attributes = nft.content?.fields?.attributes || nft.display?.data?.attributes || [];
    
    // Check name for rarity indicators
    if (name.includes('legendary') || name.includes('mythic')) return 'legendary';
    if (name.includes('epic') || name.includes('rare')) return 'epic';
    if (name.includes('rare')) return 'rare';
    if (name.includes('uncommon')) return 'uncommon';
    
    // Check attributes for rarity indicators
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

  // Calculate reward rate for NFT
  calculateRewardRate(nft, lockDuration = 30) {
    const baseRate = 10; // Base reward per day
    const rarity = this.getNFTRarity(nft);
    
    // Rarity multipliers
    const rarityMultipliers = {
      'common': 1.0,
      'uncommon': 1.5,
      'rare': 2.0,
      'epic': 3.0,
      'legendary': 5.0
    };
    
    // Lock duration multipliers
    const lockMultipliers = {
      7: 1.0,
      30: 1.2,
      90: 1.5,
      180: 2.0,
      365: 3.0
    };
    
    const rarityMultiplier = rarityMultipliers[rarity] || 1.0;
    const lockMultiplier = lockMultipliers[lockDuration] || 1.0;
    
    return Math.floor(baseRate * rarityMultiplier * lockMultiplier);
  }

  // Sign message
  async signMessage(message) {
    if (!this.isConnected || !window.sui) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await window.sui.signMessage({
        message: new TextEncoder().encode(message),
        account: this.address
      });
      
      return {
        success: true,
        signature: result.signature,
        message: message
      };
    } catch (error) {
      console.error('Failed to sign message:', error);
      return { success: false, error: error.message };
    }
  }

  // Get wallet info
  getWalletInfo() {
    return {
      address: this.address,
      balance: this.balance,
      nftCount: this.nfts.length,
      isConnected: this.isConnected,
      stakableNFTs: this.nfts.filter(nft => this.isStakable(nft)).length
    };
  }

  // Refresh all data
  async refresh() {
    if (!this.isConnected) return;
    
    try {
      await Promise.all([
        this.loadBalance(),
        this.loadNFTs()
      ]);
      console.log('🔄 SUI wallet data refreshed');
    } catch (error) {
      console.error('Failed to refresh SUI wallet data:', error);
    }
  }
}

// SUI NFT Staking Service
class SUINFTStakingService {
  constructor(suiClient, wallet) {
    this.client = suiClient;
    this.wallet = wallet;
    this.stakingContract = process.env.REACT_APP_SUI_STAKING_CONTRACT || '0x...';
  }

  // Stake NFT on SUI
  async stakeNFT(nftId, lockDuration) {
    try {
      if (!this.wallet || !this.wallet.isConnected) {
        throw new Error('Wallet not connected');
      }

      const txb = new TransactionBlock();
      
      // Create stake transaction
      txb.moveCall({
        target: `${this.stakingContract}::staking::stake_nft`,
        arguments: [
          txb.object(nftId), // NFT to stake
          txb.pure.u64(lockDuration) // Lock duration in seconds
        ]
      });

      // Set gas budget
      txb.setGasBudget(10000000);

      // Sign and execute transaction
      const result = await this.wallet.client.signAndExecuteTransactionBlock({
        transactionBlock: txb,
        account: this.wallet.address,
        options: {
          showEffects: true,
          showObjectChanges: true
        }
      });

      console.log('✅ SUI NFT staked successfully:', result.digest);

      return {
        success: true,
        transactionHash: result.digest,
        stakeId: result.objectChanges.find(change => 
          change.type === 'created' && change.objectType.includes('Stake')
        )?.objectId
      };
    } catch (error) {
      console.error('❌ SUI NFT staking failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Unstake NFT
  async unstakeNFT(stakeId) {
    try {
      const txb = new TransactionBlock();
      
      txb.moveCall({
        target: `${this.stakingContract}::staking::unstake_nft`,
        arguments: [txb.object(stakeId)]
      });

      txb.setGasBudget(10000000);

      const result = await this.wallet.client.signAndExecuteTransactionBlock({
        transactionBlock: txb,
        account: this.wallet.address
      });

      console.log('✅ SUI NFT unstaked successfully:', result.digest);

      return {
        success: true,
        transactionHash: result.digest
      };
    } catch (error) {
      console.error('❌ SUI NFT unstaking failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Claim rewards
  async claimRewards(stakeId) {
    try {
      const txb = new TransactionBlock();
      
      txb.moveCall({
        target: `${this.stakingContract}::staking::claim_rewards`,
        arguments: [txb.object(stakeId)]
      });

      const result = await this.wallet.client.signAndExecuteTransactionBlock({
        transactionBlock: txb,
        account: this.wallet.address
      });

      console.log('✅ SUI rewards claimed successfully:', result.digest);

      return {
        success: true,
        transactionHash: result.digest,
        rewards: result.effects?.gasUsed?.computationCost || 0
      };
    } catch (error) {
      console.error('❌ SUI reward claiming failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's staked NFTs
  async getStakedNFTs(userAddress) {
    try {
      const objects = await this.client.getOwnedObjects({
        owner: userAddress,
        filter: {
          StructType: `${this.stakingContract}::staking::Stake`
        },
        options: {
          showContent: true
        }
      });

      return objects.data.map(stake => ({
        stakeId: stake.data.objectId,
        nftId: stake.data.content?.fields?.nft_id,
        stakedAt: stake.data.content?.fields?.staked_at,
        lockDuration: stake.data.content?.fields?.lock_duration,
        rewards: stake.data.content?.fields?.rewards,
        status: stake.data.content?.fields?.status
      }));
    } catch (error) {
      console.error('Failed to load staked NFTs:', error);
      return [];
    }
  }

  // Get staking pool info
  async getStakingPoolInfo() {
    try {
      const poolObject = await this.client.getObject({
        id: `${this.stakingContract}::staking::Pool`,
        options: {
          showContent: true
        }
      });

      return {
        totalStaked: poolObject.data.content?.fields?.total_staked || 0,
        rewardRate: poolObject.data.content?.fields?.reward_rate || 10,
        treasury: poolObject.data.content?.fields?.treasury || 0
      };
    } catch (error) {
      console.error('Failed to get staking pool info:', error);
      return {
        totalStaked: 0,
        rewardRate: 10,
        treasury: 0
      };
    }
  }

  // Calculate pending rewards
  calculatePendingRewards(stake, currentTime = Date.now()) {
    const timeElapsed = (currentTime / 1000) - stake.stakedAt;
    const dailyReward = 10; // Base reward rate
    return Math.floor((timeElapsed / 86400) * dailyReward);
  }

  // Check if NFT can be unstaked
  canUnstake(stake, currentTime = Date.now()) {
    const lockEndTime = stake.stakedAt + stake.lockDuration;
    return (currentTime / 1000) >= lockEndTime;
  }

  // Get time until unstake
  getTimeUntilUnstake(stake, currentTime = Date.now()) {
    const lockEndTime = stake.stakedAt + stake.lockDuration;
    const timeLeft = lockEndTime - (currentTime / 1000);
    return Math.max(0, timeLeft);
  }
}

export { SUIWalletService, SUINFTStakingService };

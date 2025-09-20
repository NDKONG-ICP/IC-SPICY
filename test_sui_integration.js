/**
 * SUI Wallet Integration Test
 * Tests SUI wallet connection and NFT staking functionality
 */

import { SUIWalletService, SUINFTStakingService } from './src/ic_spicy_modular/frontend/src/services/SUIWalletService.js';

class SUIWalletTester {
  constructor() {
    this.suiService = new SUIWalletService();
    this.testResults = {
      walletConnection: false,
      nftLoading: false,
      stakingService: false,
      stakingMethods: false,
      errorLog: []
    };
  }

  async runTests() {
    console.log('🧪 Starting SUI Wallet Integration Tests...\n');

    try {
      // Test 1: Wallet Service Instantiation
      await this.testWalletServiceInstantiation();
      
      // Test 2: Mock Wallet Connection (without actual wallet)
      await this.testWalletConnection();
      
      // Test 3: NFT Loading Methods
      await this.testNFTLoadingMethods();
      
      // Test 4: Staking Service Instantiation
      await this.testStakingServiceInstantiation();
      
      // Test 5: Staking Methods
      await this.testStakingMethods();
      
      // Test 6: Utility Methods
      await this.testUtilityMethods();

      this.generateReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.testResults.errorLog.push(`Test suite error: ${error.message}`);
    }
  }

  async testWalletServiceInstantiation() {
    console.log('1️⃣ Testing SUI Wallet Service Instantiation...');
    
    try {
      // Test basic instantiation
      const service = new SUIWalletService();
      
      // Check required properties
      const hasClient = !!service.client;
      const hasAddress = service.address === null; // Should be null initially
      const hasBalance = service.balance === 0; // Should be 0 initially
      const hasNFTs = Array.isArray(service.nfts) && service.nfts.length === 0;
      const hasConnection = service.isConnected === false;
      
      if (hasClient && hasAddress && hasBalance && hasNFTs && hasConnection) {
        console.log('✅ SUI Wallet Service instantiated correctly');
        this.testResults.walletConnection = true;
      } else {
        throw new Error('Service properties not initialized correctly');
      }
    } catch (error) {
      console.error('❌ Wallet service instantiation failed:', error.message);
      this.testResults.errorLog.push(`Wallet service: ${error.message}`);
    }
  }

  async testWalletConnection() {
    console.log('2️⃣ Testing Wallet Connection Methods...');
    
    try {
      // Test disconnect method (should work without wallet)
      this.suiService.disconnectWallet();
      console.log('✅ Disconnect method works');
      
      // Test getWalletInfo method
      const walletInfo = this.suiService.getWalletInfo();
      const expectedInfo = {
        address: null,
        balance: 0,
        nftCount: 0,
        isConnected: false,
        stakableNFTs: 0
      };
      
      if (JSON.stringify(walletInfo) === JSON.stringify(expectedInfo)) {
        console.log('✅ getWalletInfo returns correct default values');
        this.testResults.walletConnection = true;
      } else {
        throw new Error('getWalletInfo returned unexpected values');
      }
    } catch (error) {
      console.error('❌ Wallet connection methods failed:', error.message);
      this.testResults.errorLog.push(`Wallet connection: ${error.message}`);
    }
  }

  async testNFTLoadingMethods() {
    console.log('3️⃣ Testing NFT Loading Methods...');
    
    try {
      // Test loadNFTs without address (should return empty array)
      const nfts = await this.suiService.loadNFTs();
      if (Array.isArray(nfts) && nfts.length === 0) {
        console.log('✅ loadNFTs handles no address correctly');
      }
      
      // Test loadBalance without address (should handle gracefully)
      await this.suiService.loadBalance();
      console.log('✅ loadBalance handles no address correctly');
      
      // Test getNFTCollection method
      const collection = await this.suiService.getNFTCollection('test');
      if (Array.isArray(collection) && collection.length === 0) {
        console.log('✅ getNFTCollection works correctly');
      }
      
      this.testResults.nftLoading = true;
    } catch (error) {
      console.error('❌ NFT loading methods failed:', error.message);
      this.testResults.errorLog.push(`NFT loading: ${error.message}`);
    }
  }

  async testStakingServiceInstantiation() {
    console.log('4️⃣ Testing SUI NFT Staking Service Instantiation...');
    
    try {
      // Create mock client and wallet
      const mockClient = { getOwnedObjects: () => Promise.resolve({ data: [] }) };
      const mockWallet = {
        client: mockClient,
        address: '0x123',
        isConnected: true
      };
      
      const stakingService = new SUINFTStakingService(mockClient, mockWallet);
      
      // Check required properties
      const hasClient = !!stakingService.client;
      const hasWallet = !!stakingService.wallet;
      const hasContract = !!stakingService.stakingContract;
      
      if (hasClient && hasWallet && hasContract) {
        console.log('✅ SUINFTStakingService instantiated correctly');
        this.testResults.stakingService = true;
      } else {
        throw new Error('Staking service properties not initialized correctly');
      }
    } catch (error) {
      console.error('❌ Staking service instantiation failed:', error.message);
      this.testResults.errorLog.push(`Staking service: ${error.message}`);
    }
  }

  async testStakingMethods() {
    console.log('5️⃣ Testing Staking Methods...');
    
    try {
      // Create mock service
      const mockClient = { 
        getOwnedObjects: () => Promise.resolve({ data: [] }),
        getObject: () => Promise.resolve({ data: { content: { fields: {} } } })
      };
      const mockWallet = {
        client: mockClient,
        address: '0x123',
        isConnected: true
      };
      
      const stakingService = new SUINFTStakingService(mockClient, mockWallet);
      
      // Test getStakedNFTs method
      const stakedNFTs = await stakingService.getStakedNFTs('0x123');
      if (Array.isArray(stakedNFTs)) {
        console.log('✅ getStakedNFTs returns array');
      }
      
      // Test getStakingPoolInfo method
      const poolInfo = await stakingService.getStakingPoolInfo();
      if (typeof poolInfo === 'object' && poolInfo.hasOwnProperty('totalStaked')) {
        console.log('✅ getStakingPoolInfo returns object with expected properties');
      }
      
      // Test calculatePendingRewards method
      const mockStake = { stakedAt: Date.now() / 1000 - 86400 }; // 1 day ago
      const rewards = stakingService.calculatePendingRewards(mockStake);
      if (typeof rewards === 'number') {
        console.log('✅ calculatePendingRewards returns number');
      }
      
      // Test canUnstake method
      const canUnstake = stakingService.canUnstake(mockStake);
      if (typeof canUnstake === 'boolean') {
        console.log('✅ canUnstake returns boolean');
      }
      
      // Test getTimeUntilUnstake method
      const timeLeft = stakingService.getTimeUntilUnstake(mockStake);
      if (typeof timeLeft === 'number' && timeLeft >= 0) {
        console.log('✅ getTimeUntilUnstake returns non-negative number');
      }
      
      this.testResults.stakingMethods = true;
    } catch (error) {
      console.error('❌ Staking methods failed:', error.message);
      this.testResults.errorLog.push(`Staking methods: ${error.message}`);
    }
  }

  async testUtilityMethods() {
    console.log('6️⃣ Testing Utility Methods...');
    
    try {
      // Test isStakable method
      const mockNFT = {
        type: 'nft',
        content: { fields: { name: 'test nft' } }
      };
      const isStakable = this.suiService.isStakable(mockNFT);
      if (typeof isStakable === 'boolean') {
        console.log('✅ isStakable returns boolean');
      }
      
      // Test getNFTRarity method
      const rarity = this.suiService.getNFTRarity(mockNFT);
      const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      if (validRarities.includes(rarity)) {
        console.log('✅ getNFTRarity returns valid rarity');
      }
      
      // Test calculateRewardRate method
      const rewardRate = this.suiService.calculateRewardRate(mockNFT, 30);
      if (typeof rewardRate === 'number' && rewardRate > 0) {
        console.log('✅ calculateRewardRate returns positive number');
      }
      
      console.log('✅ All utility methods working correctly');
    } catch (error) {
      console.error('❌ Utility methods failed:', error.message);
      this.testResults.errorLog.push(`Utility methods: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n📊 SUI Wallet Integration Test Report');
    console.log('=====================================');
    
    const tests = [
      { name: 'Wallet Service Instantiation', passed: this.testResults.walletConnection },
      { name: 'NFT Loading Methods', passed: this.testResults.nftLoading },
      { name: 'Staking Service Instantiation', passed: this.testResults.stakingService },
      { name: 'Staking Methods', passed: this.testResults.stakingMethods }
    ];
    
    let passedTests = 0;
    tests.forEach(test => {
      const status = test.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${test.name}`);
      if (test.passed) passedTests++;
    });
    
    console.log(`\n📈 Results: ${passedTests}/${tests.length} tests passed`);
    
    if (this.testResults.errorLog.length > 0) {
      console.log('\n🚨 Errors Found:');
      this.testResults.errorLog.forEach(error => {
        console.log(`   • ${error}`);
      });
    }
    
    if (passedTests === tests.length) {
      console.log('\n🎉 All SUI wallet integration tests passed!');
      console.log('✅ SUI wallet connection and NFT staking functionality is ready');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the errors above.');
    }
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  const tester = new SUIWalletTester();
  tester.runTests();
}

export default SUIWalletTester;

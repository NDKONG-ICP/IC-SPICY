import { Actor } from '@dfinity/agent';
import { idlFactory as membershipIdl } from '../declarations/membership';
import { CANISTER_IDS } from '../config';

/**
 * Centralized Transaction Recording Service
 * Records all transactions in the membership canister for admin analytics
 */
class TransactionService {
  constructor() {
    this.membershipActor = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the service with membership canister actor
   * @param {Object} membershipActor - The membership canister actor
   */
  initialize(membershipActor) {
    this.membershipActor = membershipActor;
    this.isInitialized = true;
    console.log('📊 TransactionService initialized');
  }

  /**
   * Record a transaction in the membership canister
   * @param {Object} transactionData - Transaction details
   * @param {string} transactionData.userPrincipal - User's principal ID
   * @param {string} transactionData.transactionType - Type of transaction (e.g., 'shop_purchase', 'membership_upgrade', 'staking', etc.)
   * @param {number} transactionData.amount - Amount in USD
   * @param {string} transactionData.currency - Currency used (e.g., 'ICP', 'ckBTC', 'USD')
   * @param {string} transactionData.transactionHash - Transaction hash from payment provider
   * @param {Object} transactionData.metadata - Additional transaction metadata
   * @returns {Promise<string>} Payment ID
   */
  async recordTransaction({
    userPrincipal,
    transactionType,
    amount,
    currency = 'USD',
    transactionHash,
    metadata = {}
  }) {
    if (!this.isInitialized || !this.membershipActor) {
      console.warn('⚠️ TransactionService not initialized, skipping transaction recording');
      return null;
    }

    try {
      // Create cross-chain payment record
      const paymentId = await this.membershipActor.create_cross_chain_payment(
        userPrincipal,
        transactionType, // Using membership_tier field for transaction type
        amount,
        currency
      );

      // Complete the payment with transaction hash
      if (transactionHash) {
        await this.membershipActor.complete_cross_chain_payment(
          paymentId,
          transactionHash
        );
      } else {
        // If no transaction hash, use a generated one
        await this.membershipActor.complete_cross_chain_payment(
          paymentId,
          `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        );
      }

      console.log('✅ Transaction recorded in admin analytics:', {
        paymentId,
        transactionType,
        amount,
        currency,
        userPrincipal: userPrincipal.substring(0, 8) + '...'
      });

      return paymentId;
    } catch (error) {
      console.error('❌ Failed to record transaction in admin analytics:', error);
      throw error;
    }
  }

  /**
   * Record a shop purchase transaction
   * @param {Object} purchaseData - Purchase details
   */
  async recordShopPurchase(purchaseData) {
    return this.recordTransaction({
      ...purchaseData,
      transactionType: 'shop_purchase'
    });
  }

  /**
   * Record a membership transaction
   * @param {Object} membershipData - Membership details
   */
  async recordMembershipTransaction(membershipData) {
    return this.recordTransaction({
      ...membershipData,
      transactionType: 'membership_payment'
    });
  }

  /**
   * Record a staking transaction
   * @param {Object} stakingData - Staking details
   */
  async recordStakingTransaction(stakingData) {
    return this.recordTransaction({
      ...stakingData,
      transactionType: 'staking'
    });
  }

  /**
   * Record a game transaction
   * @param {Object} gameData - Game transaction details
   */
  async recordGameTransaction(gameData) {
    return this.recordTransaction({
      ...gameData,
      transactionType: 'game_purchase'
    });
  }

  /**
   * Record a tipping transaction
   * @param {Object} tippingData - Tipping details
   */
  async recordTippingTransaction(tippingData) {
    return this.recordTransaction({
      ...tippingData,
      transactionType: 'tipping'
    });
  }

  /**
   * Record a portal governance transaction
   * @param {Object} portalData - Portal transaction details
   */
  async recordPortalTransaction(portalData) {
    return this.recordTransaction({
      ...portalData,
      transactionType: 'portal_governance'
    });
  }

  /**
   * Record any custom transaction
   * @param {string} transactionType - Custom transaction type
   * @param {Object} transactionData - Transaction details
   */
  async recordCustomTransaction(transactionType, transactionData) {
    return this.recordTransaction({
      ...transactionData,
      transactionType
    });
  }

  /**
   * Get transaction statistics (if needed)
   */
  async getTransactionStats() {
    if (!this.isInitialized || !this.membershipActor) {
      return null;
    }

    try {
      const crossChainPayments = await this.membershipActor.list_cross_chain_payments();
      const treasuryBalances = await this.membershipActor.get_treasury_balances();
      
      return {
        totalTransactions: crossChainPayments.length,
        crossChainPayments,
        treasuryBalances
      };
    } catch (error) {
      console.error('❌ Failed to get transaction stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const transactionService = new TransactionService();

export default transactionService;

// Export convenience functions
export const recordTransaction = (data) => transactionService.recordTransaction(data);
export const recordShopPurchase = (data) => transactionService.recordShopPurchase(data);
export const recordMembershipTransaction = (data) => transactionService.recordMembershipTransaction(data);
export const recordStakingTransaction = (data) => transactionService.recordStakingTransaction(data);
export const recordGameTransaction = (data) => transactionService.recordGameTransaction(data);
export const recordTippingTransaction = (data) => transactionService.recordTippingTransaction(data);
export const recordPortalTransaction = (data) => transactionService.recordPortalTransaction(data);
export const recordCustomTransaction = (type, data) => transactionService.recordCustomTransaction(type, data);

// Export the service instance
export { transactionService };

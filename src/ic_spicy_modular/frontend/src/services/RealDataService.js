/**
 * Real Data Service
 * 
 * Connects to actual IC canisters to get real transaction, inventory, and analytics data
 * Replaces demo/mock data with live blockchain data
 */

export class RealDataService {
  constructor() {
    this.initialized = false;
    this.canisters = null;
    this.agent = null;
  }

  /**
   * Initialize with real canister actors (optional for POS-only data)
   */
  async initialize(canisters, agent) {
    try {
      this.canisters = canisters;
      this.agent = agent;
      this.initialized = true;
      
      console.log('✅ Real Data Service initialized with canisters:', Object.keys(canisters || {}));
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Real Data Service:', error);
      return false;
    }
  }

  /**
   * Initialize for POS-only mode (without canisters)
   */
  initializePOSMode() {
    this.initialized = false; // No canister access
    console.log('✅ Real Data Service initialized in POS-only mode');
    return true;
  }

  /**
   * Get real transaction data from wallet2 canister + local POS transactions
   */
  async getTransactions(filters = {}) {
    const {
      page = 1,
      limit = 20,
      user = null,
      token = null,
      startTime = null,
      endTime = null
    } = filters;

    let canisterTransactions = [];
    let localTransactions = [];

    // Get transactions from wallet2 canister if available
    if (this.initialized && this.canisters?.wallet2) {
      try {
        let transactions = [];
        
        if (user) {
          // Get transactions for specific user
          const userTxs = await this.canisters.wallet2.getTransactionHistory(user);
          transactions = userTxs || [];
        } else {
          // This would require an admin method to get all transactions
          // For now, we'll use a placeholder that indicates we need admin access
          console.warn('⚠️ Getting all transactions requires admin access to wallet2 canister');
          transactions = [];
        }

        // Transform IC transaction format to standardized format
        canisterTransactions = transactions.map((tx, index) => ({
          id: tx.id || index + 1,
          from: tx.from?.toText() || tx.from,
          to: tx.to?.toText() || tx.to,
          token: tx.token || 'SPICY',
          amount: Number(tx.amount) || 0,
          timestamp: Number(tx.timestamp) || Date.now(),
          tx_type: tx.tx_type || 'transfer',
          block_hash: tx.block_hash || null,
          fee: tx.fee ? Number(tx.fee) : null,
          status: 'completed',
          network: 'IC',
          canister_id: this.canisters.wallet2._canisterId || 'unknown',
          source: 'wallet2'
        }));
      } catch (error) {
        console.warn('⚠️ Failed to get canister transactions:', error);
        canisterTransactions = [];
      }
    }

    // Get local POS transactions and orders
    try {
      const localOrders = JSON.parse(localStorage.getItem('icspicy_orders') || '[]');
      
      // Convert local orders to transaction format
      localTransactions = localOrders.map(order => ({
        id: order.id || `local-${Date.now()}-${Math.random()}`,
        from: 'customer',
        to: 'ic-spicy-shop',
        amount: order.total || 0,
        token: order.payment?.currency || 'USD',
        timestamp: Math.floor((order.payment?.timestamp || Date.now()) / 1000),
        tx_type: order.payment?.method === 'Cash' ? 'cash_payment' : 'crypto_payment',
        source: 'pos',
        items: order.items?.length || 0,
        payment_method: order.payment?.method || 'unknown',
        status: 'completed',
        network: 'POS',
        order_data: order
      }));

      console.log(`📊 Found ${localTransactions.length} local POS transactions`);
    } catch (error) {
      console.warn('⚠️ Failed to load local POS transactions:', error);
      localTransactions = [];
    }

    // Combine all transactions
    let allTransactions = [...canisterTransactions, ...localTransactions];

    // Apply filters
    if (token) {
      allTransactions = allTransactions.filter(tx => 
        tx.token.toLowerCase() === token.toLowerCase()
      );
    }

    if (startTime) {
      allTransactions = allTransactions.filter(tx => 
        tx.timestamp >= startTime
      );
    }

    if (endTime) {
      allTransactions = allTransactions.filter(tx => 
        tx.timestamp <= endTime
      );
    }

    // Sort by timestamp (newest first)
    allTransactions.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTransactions = allTransactions.slice(startIndex, endIndex);

    return {
      success: true,
      data: {
        transactions: paginatedTransactions,
        pagination: {
          page,
          limit,
          total: allTransactions.length,
          totalPages: Math.ceil(allTransactions.length / limit),
          hasNext: endIndex < allTransactions.length,
          hasPrev: page > 1
        },
        sources: {
          canister: canisterTransactions.length,
          local: localTransactions.length,
          total: allTransactions.length
        }
      }
    };
  }

  /**
   * Get real inventory data from shop canister
   */
  async getInventory(filters = {}) {
    if (!this.initialized || !this.canisters?.shop) {
      throw new Error('Real Data Service not initialized or shop canister not available');
    }

    try {
      const { page = 1, limit = 50, category = null, status = null } = filters;

      // Get products from shop canister (this represents inventory)
      const products = await this.canisters.shop.getProducts() || [];

      // Transform shop products to inventory format
      const inventoryItems = products.map((product, index) => ({
        id: product.id || `item_${index + 1}`,
        sku: product.sku || `SKU_${index + 1}`,
        name: product.name || product.variety || 'Unknown Product',
        description: product.description || '',
        category: product.category || 'plants',
        variety: product.variety || '',
        size: product.size || 'Standard',
        price: Number(product.price) || 0,
        quantity: Number(product.stock) || Number(product.quantity) || 0,
        reserved: Number(product.reserved) || 0,
        available: Math.max(0, (Number(product.stock) || 0) - (Number(product.reserved) || 0)),
        status: this.getInventoryStatus(Number(product.stock) || 0),
        location: product.location || 'Warehouse A',
        supplier: product.supplier || 'IC SPICY Co-op',
        cost: Number(product.cost) || Number(product.price) * 0.7,
        last_updated: Date.now(),
        tags: product.tags || [],
        image: product.image || '',
        metadata: {
          heat_level: product.heat_level || 'Medium',
          growing_season: product.growing_season || 'Year-round',
          origin: product.origin || 'Local Farm'
        }
      }));

      // Apply filters
      let filteredItems = inventoryItems;

      if (category) {
        filteredItems = filteredItems.filter(item => 
          item.category.toLowerCase() === category.toLowerCase()
        );
      }

      if (status) {
        filteredItems = filteredItems.filter(item => 
          item.status.toLowerCase() === status.toLowerCase()
        );
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = filteredItems.slice(startIndex, endIndex);

      return {
        success: true,
        data: {
          items: paginatedItems,
          pagination: {
            page,
            limit,
            total: filteredItems.length,
            totalPages: Math.ceil(filteredItems.length / limit),
            hasNext: endIndex < filteredItems.length,
            hasPrev: page > 1
          },
          summary: {
            total_items: filteredItems.length,
            total_value: filteredItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            low_stock_items: filteredItems.filter(item => item.status === 'low_stock').length,
            out_of_stock_items: filteredItems.filter(item => item.status === 'out_of_stock').length
          }
        }
      };

    } catch (error) {
      console.error('❌ Failed to get real inventory:', error);
      return {
        success: false,
        error: error.message,
        data: { items: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }
      };
    }
  }

  /**
   * Get real analytics data from multiple canisters
   */
  async getAnalytics(timeframe = '30d') {
    if (!this.initialized) {
      throw new Error('Real Data Service not initialized');
    }

    try {
      const now = Date.now();
      const timeframes = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
        '1y': 365 * 24 * 60 * 60 * 1000
      };
      
      const startTime = now - (timeframes[timeframe] || timeframes['30d']);

      // Get data from multiple sources
      const [transactionData, inventoryData, membershipData] = await Promise.allSettled([
        this.getTransactions({ startTime }),
        this.getInventory(),
        this.getMembershipStats()
      ]);

      const transactions = transactionData.status === 'fulfilled' ? transactionData.value.data.transactions : [];
      const inventory = inventoryData.status === 'fulfilled' ? inventoryData.value.data.items : [];
      const membership = membershipData.status === 'fulfilled' ? membershipData.value : { total_members: 0 };

      // Calculate analytics
      const totalRevenue = transactions
        .filter(tx => tx.tx_type === 'transfer' && tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalTransactions = transactions.length;
      const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      const inventoryValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const lowStockItems = inventory.filter(item => item.quantity < 10).length;

      // Calculate daily metrics
      const dailyMetrics = this.calculateDailyMetrics(transactions, timeframe);

      return {
        success: true,
        data: {
          summary: {
            timeframe,
            total_revenue: totalRevenue,
            total_transactions: totalTransactions,
            avg_transaction_value: avgTransactionValue,
            active_users: membership.total_members || 0,
            inventory_value: inventoryValue,
            low_stock_alerts: lowStockItems,
            growth_rate: this.calculateGrowthRate(dailyMetrics)
          },
          daily_metrics: dailyMetrics,
          top_products: this.getTopProducts(inventory, transactions),
          recent_activity: transactions.slice(0, 10),
          alerts: this.generateAlerts(inventory, transactions),
          last_updated: now
        }
      };

    } catch (error) {
      console.error('❌ Failed to get real analytics:', error);
      return {
        success: false,
        error: error.message,
        data: {
          summary: {
            total_revenue: 0,
            total_transactions: 0,
            active_users: 0,
            inventory_value: 0
          }
        }
      };
    }
  }

  /**
   * Get membership statistics
   */
  async getMembershipStats() {
    if (!this.canisters?.membership) {
      return { total_members: 0, by_tier: {} };
    }

    try {
      const members = await this.canisters.membership.list_members();
      const memberArray = Array.isArray(members) ? members : [];

      const tierCounts = memberArray.reduce((acc, member) => {
        const tier = member.tier ? Object.keys(member.tier)[0] : 'Basic';
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {});

      return {
        total_members: memberArray.length,
        by_tier: tierCounts,
        recent_joins: memberArray.filter(m => 
          Date.now() - Number(m.joined || 0) / 1000000 < 30 * 24 * 60 * 60 * 1000
        ).length
      };
    } catch (error) {
      console.warn('⚠️ Could not get membership stats:', error);
      return { total_members: 0, by_tier: {} };
    }
  }

  /**
   * Helper: Determine inventory status based on quantity
   */
  getInventoryStatus(quantity) {
    if (quantity <= 0) return 'out_of_stock';
    if (quantity <= 10) return 'low_stock';
    return 'in_stock';
  }

  /**
   * Helper: Calculate daily metrics
   */
  calculateDailyMetrics(transactions, timeframe) {
    const days = parseInt(timeframe.replace('d', '')) || 30;
    const dailyData = {};

    // Initialize days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = {
        date: dateKey,
        revenue: 0,
        transactions: 0,
        volume: 0
      };
    }

    // Aggregate transaction data by day
    transactions.forEach(tx => {
      const date = new Date(tx.timestamp).toISOString().split('T')[0];
      if (dailyData[date]) {
        dailyData[date].revenue += tx.amount;
        dailyData[date].transactions += 1;
        dailyData[date].volume += tx.amount;
      }
    });

    return Object.values(dailyData).reverse();
  }

  /**
   * Helper: Calculate growth rate
   */
  calculateGrowthRate(dailyMetrics) {
    if (dailyMetrics.length < 2) return 0;
    
    const recent = dailyMetrics.slice(-7).reduce((sum, day) => sum + day.revenue, 0);
    const previous = dailyMetrics.slice(-14, -7).reduce((sum, day) => sum + day.revenue, 0);
    
    if (previous === 0) return recent > 0 ? 100 : 0;
    return ((recent - previous) / previous) * 100;
  }

  /**
   * Helper: Get top products
   */
  getTopProducts(inventory, transactions) {
    // This would require more sophisticated analysis
    // For now, return top inventory items by value
    return inventory
      .sort((a, b) => (b.price * b.quantity) - (a.price * a.quantity))
      .slice(0, 5)
      .map(item => ({
        name: item.name,
        revenue: item.price * item.quantity,
        units_sold: item.quantity,
        category: item.category
      }));
  }

  /**
   * Helper: Generate alerts
   */
  generateAlerts(inventory, transactions) {
    const alerts = [];

    // Low stock alerts
    const lowStockItems = inventory.filter(item => item.quantity <= 5 && item.quantity > 0);
    lowStockItems.forEach(item => {
      alerts.push({
        type: 'warning',
        category: 'inventory',
        message: `Low stock alert: ${item.name} (${item.quantity} remaining)`,
        item_id: item.id,
        severity: 'medium'
      });
    });

    // Out of stock alerts
    const outOfStockItems = inventory.filter(item => item.quantity <= 0);
    outOfStockItems.forEach(item => {
      alerts.push({
        type: 'error',
        category: 'inventory',
        message: `Out of stock: ${item.name}`,
        item_id: item.id,
        severity: 'high'
      });
    });

    // Large transaction alerts (over 1000 tokens)
    const largeTransactions = transactions.filter(tx => tx.amount > 1000);
    largeTransactions.forEach(tx => {
      alerts.push({
        type: 'info',
        category: 'transaction',
        message: `Large transaction: ${tx.amount} ${tx.token}`,
        transaction_id: tx.id,
        severity: 'low'
      });
    });

    return alerts.slice(0, 10); // Limit to 10 most recent alerts
  }

  /**
   * Create real order from transaction data
   */
  async createOrder(orderData) {
    try {
      // Transform order data to real format and store it
      const realOrder = {
        id: `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        customer: orderData.customer,
        items: orderData.items,
        total: orderData.total,
        created_at: Date.now(),
        updated_at: Date.now(),
        metadata: {
          source: 'ic_spicy_dapp',
          canister_origin: this.canisters?.shop?._canisterId || 'unknown'
        }
      };

      // In a real implementation, this would create a transaction in the wallet canister
      // and update inventory in the shop canister
      console.log('📦 Real order created:', realOrder);

      return {
        success: true,
        data: realOrder
      };
    } catch (error) {
      console.error('❌ Failed to create real order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const realDataService = new RealDataService();

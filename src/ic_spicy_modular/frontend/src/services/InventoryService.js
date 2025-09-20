/**
 * Centralized Inventory Management Service
 * Handles stock levels, inventory tracking, and stock management
 */
class InventoryService {
  constructor() {
    this.storageKey = 'ic_spicy_inventory';
    this.inventory = this.loadInventory();
    this.listeners = [];
  }

  /**
   * Load inventory from localStorage
   */
  loadInventory() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load inventory:', error);
      return {};
    }
  }

  /**
   * Save inventory to localStorage
   */
  saveInventory() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.inventory));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save inventory:', error);
    }
  }

  /**
   * Subscribe to inventory changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all listeners of inventory changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.inventory);
      } catch (error) {
        console.error('Error notifying inventory listener:', error);
      }
    });
  }

  /**
   * Initialize inventory for products
   */
  initializeProductInventory(productId, initialStock = 0, lowStockThreshold = 5) {
    if (!this.inventory[productId]) {
      this.inventory[productId] = {
        currentStock: initialStock,
        lowStockThreshold: lowStockThreshold,
        lastUpdated: Date.now(),
        totalSold: 0,
        lastRestocked: null,
        reservedStock: 0
      };
      this.saveInventory();
    }
  }

  /**
   * Get current stock level for a product
   */
  getStock(productId) {
    return this.inventory[productId]?.currentStock || 0;
  }

  /**
   * Get available stock (current - reserved)
   */
  getAvailableStock(productId) {
    const item = this.inventory[productId];
    if (!item) return 0;
    return Math.max(0, item.currentStock - item.reservedStock);
  }

  /**
   * Check if product is in stock
   */
  isInStock(productId, quantity = 1) {
    return this.getAvailableStock(productId) >= quantity;
  }

  /**
   * Check if product is low on stock
   */
  isLowStock(productId) {
    const item = this.inventory[productId];
    if (!item) return false;
    return this.getAvailableStock(productId) <= item.lowStockThreshold;
  }

  /**
   * Reserve stock for an order
   */
  reserveStock(productId, quantity) {
    if (!this.isInStock(productId, quantity)) {
      return false;
    }

    if (!this.inventory[productId]) {
      this.initializeProductInventory(productId);
    }

    this.inventory[productId].reservedStock += quantity;
    this.saveInventory();
    return true;
  }

  /**
   * Release reserved stock (when order is cancelled)
   */
  releaseStock(productId, quantity) {
    if (this.inventory[productId]) {
      this.inventory[productId].reservedStock = Math.max(0, 
        this.inventory[productId].reservedStock - quantity
      );
      this.saveInventory();
    }
  }

  /**
   * Reduce stock when order is completed
   */
  reduceStock(productId, quantity) {
    if (!this.inventory[productId]) {
      this.initializeProductInventory(productId);
    }

    const item = this.inventory[productId];
    item.currentStock = Math.max(0, item.currentStock - quantity);
    item.reservedStock = Math.max(0, item.reservedStock - quantity);
    item.totalSold += quantity;
    item.lastUpdated = Date.now();
    
    this.saveInventory();
    return true;
  }

  /**
   * Restock inventory
   */
  restock(productId, quantity, reason = 'manual_restock') {
    if (!this.inventory[productId]) {
      this.initializeProductInventory(productId);
    }

    const item = this.inventory[productId];
    item.currentStock += quantity;
    item.lastRestocked = Date.now();
    item.lastUpdated = Date.now();
    
    this.saveInventory();
    
    console.log(`📦 Restocked ${productId}: +${quantity} (${reason})`);
    return item.currentStock;
  }

  /**
   * Set stock level directly
   */
  setStock(productId, quantity) {
    if (!this.inventory[productId]) {
      this.initializeProductInventory(productId);
    }

    const item = this.inventory[productId];
    item.currentStock = Math.max(0, quantity);
    item.lastUpdated = Date.now();
    
    this.saveInventory();
    return item.currentStock;
  }

  /**
   * Set low stock threshold
   */
  setLowStockThreshold(productId, threshold) {
    if (!this.inventory[productId]) {
      this.initializeProductInventory(productId);
    }

    this.inventory[productId].lowStockThreshold = Math.max(0, threshold);
    this.saveInventory();
  }

  /**
   * Get all low stock items
   */
  getLowStockItems() {
    return Object.keys(this.inventory).filter(productId => 
      this.isLowStock(productId)
    );
  }

  /**
   * Get all out of stock items
   */
  getOutOfStockItems() {
    return Object.keys(this.inventory).filter(productId => 
      !this.isInStock(productId, 1)
    );
  }

  /**
   * Get inventory summary
   */
  getInventorySummary() {
    const totalProducts = Object.keys(this.inventory).length;
    const lowStockCount = this.getLowStockItems().length;
    const outOfStockCount = this.getOutOfStockItems().length;
    
    let totalStockValue = 0;
    let totalSoldValue = 0;
    
    Object.keys(this.inventory).forEach(productId => {
      const item = this.inventory[productId];
      // Note: This would need product pricing data to calculate actual values
      totalStockValue += item.currentStock;
      totalSoldValue += item.totalSold;
    });

    return {
      totalProducts,
      lowStockCount,
      outOfStockCount,
      totalStockValue,
      totalSoldValue,
      lowStockItems: this.getLowStockItems(),
      outOfStockItems: this.getOutOfStockItems()
    };
  }

  /**
   * Bulk initialize inventory for all products
   */
  initializeAllProducts(products) {
    Object.keys(products).forEach(categoryKey => {
      const category = products[categoryKey];
      if (category.products) {
        category.products.forEach(product => {
          // Set default stock levels based on product type
          let defaultStock = 10; // Default stock
          let lowStockThreshold = 3; // Default low stock threshold
          
          if (product.specialty) {
            defaultStock = 5; // Lower stock for specialty items
            lowStockThreshold = 2;
          }
          
          if (product.isSuperhot) {
            defaultStock = 8; // Moderate stock for superhots
            lowStockThreshold = 3;
          }
          
          // Set very low stock for coming soon items
          if (product.comingSoon) {
            defaultStock = 0;
            lowStockThreshold = 0;
          }
          
          this.initializeProductInventory(
            product.id, 
            defaultStock, 
            lowStockThreshold
          );
        });
      }
    });
  }

  /**
   * Get product inventory status
   */
  getProductStatus(productId) {
    const item = this.inventory[productId];
    if (!item) {
      return { status: 'not_tracked', stock: 0, available: 0 };
    }

    const available = this.getAvailableStock(productId);
    const isLow = this.isLowStock(productId);
    const isOut = !this.isInStock(productId, 1);

    let status = 'in_stock';
    if (isOut) status = 'out_of_stock';
    else if (isLow) status = 'low_stock';

    return {
      status,
      stock: item.currentStock,
      available,
      reserved: item.reservedStock,
      totalSold: item.totalSold,
      lowStockThreshold: item.lowStockThreshold,
      lastUpdated: item.lastUpdated,
      lastRestocked: item.lastRestocked
    };
  }

  /**
   * Clear all inventory data
   */
  clearInventory() {
    this.inventory = {};
    this.saveInventory();
  }

  /**
   * Export inventory data
   */
  exportInventory() {
    return {
      inventory: this.inventory,
      summary: this.getInventorySummary(),
      exportedAt: Date.now()
    };
  }

  /**
   * Import inventory data
   */
  importInventory(data) {
    if (data.inventory && typeof data.inventory === 'object') {
      this.inventory = data.inventory;
      this.saveInventory();
      return true;
    }
    return false;
  }
}

// Create singleton instance
const inventoryService = new InventoryService();

export default inventoryService;

// Export convenience functions
export const getStock = (productId) => inventoryService.getStock(productId);
export const getAvailableStock = (productId) => inventoryService.getAvailableStock(productId);
export const isInStock = (productId, quantity = 1) => inventoryService.isInStock(productId, quantity);
export const isLowStock = (productId) => inventoryService.isLowStock(productId);
export const reserveStock = (productId, quantity) => inventoryService.reserveStock(productId, quantity);
export const releaseStock = (productId, quantity) => inventoryService.releaseStock(productId, quantity);
export const reduceStock = (productId, quantity) => inventoryService.reduceStock(productId, quantity);
export const restock = (productId, quantity, reason) => inventoryService.restock(productId, quantity, reason);
export const setStock = (productId, quantity) => inventoryService.setStock(productId, quantity);
export const getProductStatus = (productId) => inventoryService.getProductStatus(productId);
export const getInventorySummary = () => inventoryService.getInventorySummary();
export const getLowStockItems = () => inventoryService.getLowStockItems();
export const getOutOfStockItems = () => inventoryService.getOutOfStockItems();

// Export the service instance
export { inventoryService };

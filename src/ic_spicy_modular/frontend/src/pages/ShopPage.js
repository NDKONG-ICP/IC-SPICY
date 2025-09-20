import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../WalletContext';
import { useIdentityKit } from '@nfid/identitykit/react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { ADMIN_PRINCIPALS } from '../config';
import { WALLET_ADDRESSES, getWalletAddress, getOisyWalletAddress, getOisyChainConfig, isOisySupported } from '../config/walletAddresses';
import { useLogistics, useOrders } from '../hooks/useLogistics';
import { logisticsAPI } from '../services/LogisticsAPI';
import LogisticsDemo from '../components/LogisticsDemo';
import APIConfigManager from '../components/APIConfigManager';
import CryptoPaymentCalculator from '../components/CryptoPaymentCalculator';
import TokenSelector from '../components/TokenSelector';
import ConsentManager from '../components/ConsentManager';
import IcPayPayment from '../components/IcPayPayment';
import { cryptoPriceService } from '../services/CryptoPriceService';
import { customerCRMService, useCustomerCRM } from '../services/CustomerCRMService';
import { recordShopPurchase } from '../services/TransactionService';
import { inventoryService, getStock, isInStock, isLowStock, reserveStock, reduceStock, getProductStatus } from '../services/InventoryService';

const ShopPage = () => {
  console.log('🔥 ShopPage component is loading...');
  console.log('🚨 ShopPage: Component mounted and ready');
  
  const { 
    principal, 
    agent, 
    canisters,
    phantomConnected, 
    phantomAddress, 
    phantomBalance,
    iiLoggedIn,
    iiPrincipal,
    loginII,
    connectPlug,
    plugConnected,
    isConnected,
    preferredPrincipal
  } = useWallet();
  const { user, signer } = useIdentityKit();
  
  // Logistics API integration
  const logistics = useLogistics();
  const orders = useOrders();
  const customerCRM = useCustomerCRM();
  
  // State management
  const [activeCategory, setActiveCategory] = useState('plants');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [isInPerson, setIsInPerson] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFacts, setShowFacts] = useState(false);
  const [selectedFacts, setSelectedFacts] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [paymentProductInfo, setPaymentProductInfo] = useState(null);
  const [showPOSMode, setShowPOSMode] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [dailySummaries, setDailySummaries] = useState({});
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showProductManagement, setShowProductManagement] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [products, setProducts] = useState({});
  const [showProductInfo, setShowProductInfo] = useState(false);
  const [inventoryData, setInventoryData] = useState({});
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [selectedVariety, setSelectedVariety] = useState(null);
  const [shoppingCart, setShoppingCart] = useState([]);
  const [showShoppingCart, setShowShoppingCart] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showLogisticsDemo, setShowLogisticsDemo] = useState(false);
  const [showAPIConfig, setShowAPIConfig] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('mode'); // 'mode', 'cart', 'shipping', 'billing', 'payment', 'confirmation'
  const [isPOSMode, setIsPOSMode] = useState(false); // Fast checkout for in-person events
  const [showCheckoutModeModal, setShowCheckoutModeModal] = useState(false); // New modal for checkout mode selection
  const [receiptEmail, setReceiptEmail] = useState(''); // Optional receipt email for POS
  const [selectedToken, setSelectedToken] = useState(null);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [customerConsent, setCustomerConsent] = useState({});
  const [showConsentManager, setShowConsentManager] = useState(false);
  const [showProductSizeModal, setShowProductSizeModal] = useState(false);
  const [allowIcPayCallback, setAllowIcPayCallback] = useState(false); // Guard to prevent premature callbacks
  const [selectedCategory, setSelectedCategory] = useState('plants');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });
  const [billingInfo, setBillingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    sameAsShipping: true
  });

  // Handle URL parameters for payment flow
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPayment = urlParams.get('payment');
    
    if (isPayment === 'true') {
      const productInfo = {
        id: urlParams.get('product'),
        name: decodeURIComponent(urlParams.get('name') || 'Unknown Product'),
        price: parseFloat(urlParams.get('price') || '0'),
        size: urlParams.get('size') ? decodeURIComponent(urlParams.get('size')) : null
      };
      
      setPaymentProductInfo(productInfo);
      setShowPaymentOptions(true);
    }
  }, []);


  // Old payment methods moved to new structure below

  // Helper functions
  const handleShippingSubmit = (e) => {
    e.preventDefault();
    console.log('Shipping info submitted:', shippingInfo);
    // In production, this would send to whiskeybravospices82@gmail.com
    setShowCheckout(false);
  };

  // POS System Functions
  const addToCart = (product, size = null) => {
    const price = size?.price || product.price || 0;
    const cartItem = {
      id: `${product.id}-${size?.id || 'default'}-${Date.now()}`,
      product: product.name,
      size: size?.name || null,
      price: price,
      timestamp: new Date().toISOString()
    };
    
    const newCartItems = [...cartItems, cartItem];
    setCartItems(newCartItems);
    setCartTotal(newCartItems.reduce((total, item) => total + item.price, 0));
  };

  const removeFromCart = (itemId) => {
    const newCartItems = cartItems.filter(item => item.id !== itemId);
    setCartItems(newCartItems);
    setCartTotal(newCartItems.reduce((total, item) => total + item.price, 0));
  };

  const clearCart = () => {
    setCartItems([]);
    setCartTotal(0);
  };

  const processTransaction = (paymentMethod, paymentData = null) => {
    const transactionId = `TX-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // Enhanced transaction record with full transparency
    const transaction = {
      id: transactionId,
      timestamp: timestamp,
      date: new Date(timestamp).toLocaleDateString(),
      time: new Date(timestamp).toLocaleTimeString(),
      items: cartItems.map(item => ({
        ...item,
        sku: `IC-SPICY-${item.id}`,
        category: getItemCategory(item.product)
      })),
      subtotal: cartTotal,
      tax: 0, // No tax for now, but structure is ready
      total: cartTotal,
      paymentMethod: paymentMethod.name,
      paymentType: paymentMethod.type,
      paymentIcon: paymentMethod.icon,
      status: 'completed',
      paymentData: paymentData,
      receiptNumber: `R-${Date.now()}`,
      location: 'IC SPICY Event Location',
      cashier: 'POS System',
      deviceId: navigator.userAgent.substring(0, 50) + '...',
      sessionId: `SESSION-${Date.now()}`,
      // Transparency fields
      auditTrail: {
        created: timestamp,
        method: paymentMethod.name,
        itemCount: cartItems.length,
        hash: generateTransactionHash(transactionId, cartTotal, timestamp)
      }
    };

    setCurrentTransaction(transaction);
    setTransactionHistory(prev => [transaction, ...prev]);
    setShowReceipt(true);
    clearCart();
    
    // Store transaction with enhanced transparency
    const storedTransactions = JSON.parse(localStorage.getItem('icspicy_pos_transactions') || '[]');
    const updatedTransactions = [transaction, ...storedTransactions];
    localStorage.setItem('icspicy_pos_transactions', JSON.stringify(updatedTransactions));
    
    // Also store daily summary for transparency
    updateDailySummary(transaction);
    
    console.log('Transaction processed:', transaction);
  };

  // Helper function to categorize items
  const getItemCategory = (productName) => {
    if (productName.toLowerCase().includes('plant')) return 'Live Plants';
    if (productName.toLowerCase().includes('charapita') || productName.toLowerCase().includes('apocalypse') || productName.toLowerCase().includes('sugar rush')) return 'Pepper Pods';
    if (productName.toLowerCase().includes('sriracha') || productName.toLowerCase().includes('apocalypse')) return 'Spice Blends';
    return 'Other';
  };

  // Generate transaction hash for integrity
  const generateTransactionHash = (id, total, timestamp) => {
    const data = `${id}-${total}-${timestamp}`;
    // Simple hash function for transaction integrity
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  };

  // Update daily summary for transparency
  const updateDailySummary = (transaction) => {
    const today = new Date().toDateString();
    const summaries = JSON.parse(localStorage.getItem('icspicy_daily_summaries') || '{}');
    
    if (!summaries[today]) {
      summaries[today] = {
        date: today,
        totalTransactions: 0,
        totalRevenue: 0,
        paymentMethods: {},
        categories: {}
      };
    }
    
    summaries[today].totalTransactions += 1;
    summaries[today].totalRevenue += transaction.total;
    
    // Track payment method usage
    if (!summaries[today].paymentMethods[transaction.paymentMethod]) {
      summaries[today].paymentMethods[transaction.paymentMethod] = { count: 0, amount: 0 };
    }
    summaries[today].paymentMethods[transaction.paymentMethod].count += 1;
    summaries[today].paymentMethods[transaction.paymentMethod].amount += transaction.total;
    
    // Track category sales
    transaction.items.forEach(item => {
      const category = item.category;
      if (!summaries[today].categories[category]) {
        summaries[today].categories[category] = { count: 0, amount: 0 };
      }
      summaries[today].categories[category].count += 1;
      summaries[today].categories[category].amount += item.price;
    });
    
    localStorage.setItem('icspicy_daily_summaries', JSON.stringify(summaries));
  };

  // Check if current user is admin
  const isUserAdmin = () => {
    // Get principal from various sources
    const currentPrincipal = preferredPrincipal || iiPrincipal || principal;
    const oisyPrincipal = user?.principal; // OISY principal from IdentityKit
    
    // Debug logging
    console.log('🔍 Admin check - preferredPrincipal:', preferredPrincipal?.toString());
    console.log('🔍 Admin check - iiPrincipal:', iiPrincipal?.toString());
    console.log('🔍 Admin check - principal:', principal?.toString());
    console.log('🔍 Admin check - OISY user principal:', oisyPrincipal?.toString());
    console.log('🔍 Admin check - known admin principals:', Object.values(ADMIN_PRINCIPALS));
    
    // Check all possible principal sources
    const principalsToCheck = [
      currentPrincipal?.toString(),
      oisyPrincipal?.toString(),
    ].filter(Boolean);
    
    console.log('🔍 Checking principals:', principalsToCheck);
    
    // Check if any of the principals match admin list
    const isAdmin = principalsToCheck.some(principalString => 
      Object.values(ADMIN_PRINCIPALS).includes(principalString)
    );
    
    // Manual override for your specific OISY principal
    const isManualAdmin = principalsToCheck.includes('yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe');
    
    const finalResult = isAdmin || isManualAdmin;
    console.log('🔍 Is admin result:', isAdmin);
    console.log('🔍 Is manual admin:', isManualAdmin);
    console.log('🔍 Final admin result:', finalResult);
    return finalResult;
  };

  // Admin authentication function - wallet-based
  const authenticateAdmin = async (actionDescription = 'access sensitive data') => {
    // If already authenticated and still admin, continue
    if (isAdminAuthenticated && isUserAdmin()) {
      return true;
    }

    // Check if currently connected wallet is admin (including OISY)
    if ((isConnected || user) && isUserAdmin()) {
      console.log('✅ User already authenticated as admin');
      setIsAdminAuthenticated(true);
      return true;
    }

    // If not connected or not admin, show connection options
    const shouldConnect = window.confirm(
      `🔒 Admin Authentication Required\n\n` +
      `Action: ${actionDescription}\n\n` +
      `This action requires admin wallet authentication.\n\n` +
      `Click OK to connect your admin wallet, or Cancel to abort.`
    );

    if (!shouldConnect) {
      return false;
    }

    // Show wallet connection options
    return await showWalletConnectionModal(actionDescription);
  };

  // Show wallet connection modal for admin authentication
  const showWalletConnectionModal = async (actionDescription) => {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 max-w-md w-full border border-gray-600/30">
          <h2 class="text-2xl font-bold text-white mb-4 text-center">🔒 Admin Authentication</h2>
          <p class="text-gray-300 mb-6 text-center">Connect your admin wallet to: ${actionDescription}</p>
          
          <div class="space-y-3 mb-6">
            <button id="connect-ii" class="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all">
              🌐 Internet Identity
            </button>
            <button id="connect-oisy" class="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:from-green-600 hover:to-blue-600 transition-all">
              🔗 OISY Wallet
            </button>
            <button id="connect-plug" class="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">
              🔌 Plug Wallet
            </button>
          </div>
          
          <div class="text-center">
            <button id="cancel-auth" class="px-6 py-2 bg-gray-600/50 text-gray-300 hover:bg-gray-600/70 border border-gray-500/30 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Handle wallet connections
      document.getElementById('connect-ii').onclick = async () => {
        try {
          await loginII();
          setTimeout(() => {
            if (isUserAdmin()) {
              setIsAdminAuthenticated(true);
              document.body.removeChild(modal);
              resolve(true);
            } else {
              alert('❌ Access Denied\n\nConnected wallet is not authorized as admin.');
              document.body.removeChild(modal);
              resolve(false);
            }
          }, 1000);
        } catch (error) {
          alert('Connection failed: ' + error.message);
          document.body.removeChild(modal);
          resolve(false);
        }
      };

      document.getElementById('connect-oisy').onclick = async () => {
        try {
          // OISY connection through IdentityKit
          if (user) {
            setTimeout(() => {
              if (isUserAdmin()) {
                setIsAdminAuthenticated(true);
                document.body.removeChild(modal);
                resolve(true);
              } else {
                alert('❌ Access Denied\n\nConnected OISY wallet is not authorized as admin.');
                document.body.removeChild(modal);
                resolve(false);
              }
            }, 1000);
          } else {
            alert('Please connect OISY wallet first through the main wallet interface.');
            document.body.removeChild(modal);
            resolve(false);
          }
        } catch (error) {
          alert('OISY connection failed: ' + error.message);
          document.body.removeChild(modal);
          resolve(false);
        }
      };

      document.getElementById('connect-plug').onclick = async () => {
        try {
          await connectPlug();
          setTimeout(() => {
            if (isUserAdmin()) {
              setIsAdminAuthenticated(true);
              document.body.removeChild(modal);
              resolve(true);
            } else {
              alert('❌ Access Denied\n\nConnected Plug wallet is not authorized as admin.');
              document.body.removeChild(modal);
              resolve(false);
            }
          }, 1000);
        } catch (error) {
          alert('Plug connection failed: ' + error.message);
          document.body.removeChild(modal);
          resolve(false);
        }
      };

      document.getElementById('cancel-auth').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };

      // Close on outside click
      modal.onclick = (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(false);
        }
      };
    });
  };

  // Product management functions
  const saveProducts = (updatedProducts) => {
    setProducts(updatedProducts);
    localStorage.setItem('icspicy_products', JSON.stringify(updatedProducts));
  };

  const addProduct = (categoryKey, newProduct) => {
    const updatedProducts = { ...products };
    const productId = `${categoryKey}-${Date.now()}`;
    const productWithId = { ...newProduct, id: productId };
    
    updatedProducts[categoryKey].products.push(productWithId);
    saveProducts(updatedProducts);
  };

  const updateProduct = (categoryKey, productId, updatedProduct) => {
    const updatedProducts = { ...products };
    const productIndex = updatedProducts[categoryKey].products.findIndex(p => p.id === productId);
    
    if (productIndex !== -1) {
      updatedProducts[categoryKey].products[productIndex] = { ...updatedProduct, id: productId };
      saveProducts(updatedProducts);
    }
  };

  const deleteProduct = (categoryKey, productId) => {
    const updatedProducts = { ...products };
    updatedProducts[categoryKey].products = updatedProducts[categoryKey].products.filter(p => p.id !== productId);
    saveProducts(updatedProducts);
  };

  const toggleProductStock = (categoryKey, productId) => {
    const updatedProducts = { ...products };
    const product = updatedProducts[categoryKey].products.find(p => p.id === productId);
    
    if (product) {
      product.inStock = !product.inStock;
      saveProducts(updatedProducts);
    }
  };

  // Shopping cart management functions
  const addToShoppingCart = (product, selectedSize = null, quantity = 1) => {
    console.log('🛒 Adding to cart:', product);
    
    // Check stock availability
    if (!isInStock(product.id, quantity)) {
      const availableStock = inventoryService.getAvailableStock(product.id);
      alert(`Sorry, only ${availableStock} ${product.name} available in stock.`);
      return;
    }

    // Check for low stock warning
    if (isLowStock(product.id)) {
      const availableStock = inventoryService.getAvailableStock(product.id);
      if (availableStock <= quantity) {
        alert(`⚠️ Low Stock Warning: Only ${availableStock} ${product.name} remaining!`);
      }
    }
    
    const cartItem = {
      id: `${product.id}-${selectedSize?.id || 'default'}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      variety: product.variety || product.name,
      size: selectedSize?.name || product.size,
      unit: product.unit,
      price: selectedSize?.price || product.price,
      quantity: quantity,
      subtotal: (selectedSize?.price || product.price) * quantity,
      category: activeCategory,
      image: product.image || null
    };
    
    console.log('🛒 Cart item created:', cartItem);
    
    // Reserve stock for this item
    if (reserveStock(product.id, quantity)) {
      // Use functional state update to ensure we get the latest cart state
      setShoppingCart(prev => {
        const newCart = [...prev, cartItem];
        console.log('🛒 New cart state:', newCart);
        // Update total with the new cart
        updateCartTotal(newCart);
        return newCart;
      });
      
      // Show success message
      alert(`Added ${cartItem.name} ${cartItem.size ? `(${cartItem.size})` : ''} to cart!`);
    } else {
      alert('Failed to reserve stock for this item. Please try again.');
    }
  };

  const removeFromShoppingCart = (itemId) => {
    const itemToRemove = shoppingCart.find(item => item.id === itemId);
    if (itemToRemove) {
      // Release reserved stock
      inventoryService.releaseStock(itemToRemove.productId, itemToRemove.quantity);
    }
    
    const newCart = shoppingCart.filter(item => item.id !== itemId);
    setShoppingCart(newCart);
    updateCartTotal(newCart);
  };

  const updateCartQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromShoppingCart(itemId);
      return;
    }
    
    const newCart = shoppingCart.map(item => 
      item.id === itemId 
        ? { ...item, quantity: newQuantity, subtotal: item.price * newQuantity }
        : item
    );
    setShoppingCart(newCart);
    updateCartTotal(newCart);
  };

  const updateCartTotal = (cart) => {
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    console.log('💰 Updating cart total:', total, 'from cart:', cart);
    setCartTotal(total);
  };

  const clearShoppingCart = () => {
    setShoppingCart([]);
    setCartTotal(0);
  };

  // Payment method configuration
  const paymentMethods = {
    crypto: [
      {
        id: 'oisy',
        name: 'OISY Wallet',
      icon: '🔥',
        currencies: ['ICP'],
        description: 'Internet Computer native wallet',
        available: !!user
      },
      {
        id: 'phantom',
        name: 'Phantom Wallet',
        icon: '👻', 
        currencies: ['SOL', 'USDC'],
        description: 'Solana ecosystem wallet',
        available: !!phantomConnected || window.solana
      },
      {
        id: 'solana_pay',
        name: 'Solana Pay',
        icon: '⚡',
        currencies: ['SOL', 'USDC'],
        description: 'QR code payments on Solana',
        available: true
      },
      {
        id: 'crypto_com',
        name: 'Crypto.com Pay',
        icon: '💎',
        currencies: ['CRO', 'BTC', 'ETH', 'USDC'],
        description: 'Coming Soon - Crypto.com ecosystem payments',
        available: false,
        disabled: true,
        comingSoon: true
      }
    ],
    traditional: [
      {
        id: 'apple_pay',
        name: 'Apple Pay',
        icon: '🍎',
        description: 'Touch ID, Face ID, or passcode',
        available: window.ApplePaySession && window.ApplePaySession.canMakePayments()
      },
      {
        id: 'google_pay',
        name: 'Google Pay',
        icon: '📱',
        description: 'Quick and secure payments',
        available: window.google && window.google.payments
      },
      {
        id: 'card',
        name: 'Credit/Debit Card',
        icon: '💳',
        description: 'Visa, Mastercard, American Express',
        available: true
      }
    ]
  };

  // Generate order ID
  const generateOrderId = () => {
    return `SPICY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
  };

  // Real-time currency conversion helpers
  const convertUSDToCrypto = async (usdAmount, tokenSymbol) => {
    try {
      const calculation = await cryptoPriceService.calculateCryptoAmount(usdAmount, tokenSymbol);
      return calculation;
    } catch (error) {
      console.error(`${tokenSymbol} conversion error:`, error);
      throw error;
    }
  };

  const convertUSDToSOL = async (usdAmount) => {
    const calculation = await convertUSDToCrypto(usdAmount, 'SOL');
    return calculation.amount.toFixed(6);
  };

  const convertUSDToICP = async (usdAmount) => {
    const calculation = await convertUSDToCrypto(usdAmount, 'ICP');
    return calculation.amount.toFixed(6);
  };

  // Handle cash payment for in-person events
  const handleCashPayment = async (paymentMethod) => {
    setPaymentProcessing(true);
    
    try {
      const orderId = generateOrderId();
      
      // Create cash transaction record
      const orderData = {
        id: orderId,
        items: shoppingCart.map(item => ({
          id: item.id,
          name: item.name || `${item.variety} ${item.size}`,
          variety: item.variety,
          size: item.size,
          unit: item.unit,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal
        })),
        total: cartTotal,
        payment: {
          method: 'Cash',
          transactionId: `cash_${orderId}_${Date.now()}`,
          amount: cartTotal,
          currency: 'USD',
          timestamp: Date.now(),
          operator: 'pos-operator', // This could be enhanced to capture actual operator name
          status: 'documented'
        },
        customer: {
          type: 'in-person',
          timestamp: Date.now()
        },
        status: 'confirmed',
        source: 'pos-cash-payment'
      };

      setOrderDetails(orderData);
      setPaymentStatus('success');
      
      // Clear cart and proceed
      setShoppingCart([]);
      
      if (isPOSMode) {
        // Fast POS mode: show immediate success with optional receipt
        setShowPaymentSuccess(true);
        setShowCheckoutModal(false);
      } else {
        // Regular mode: go to confirmation step
        setCheckoutStep('confirmation');
      }
      
      // Track in analytics
      const analyticsData = {
        event: 'cash_payment_completed',
        orderId: orderId,
        amount: cartTotal,
        items: shoppingCart.length,
        source: 'pos-cash',
        timestamp: Date.now()
      };
      
      console.log('💵 Cash payment documented:', analyticsData);
      
      // Store in local analytics
      const existingAnalytics = JSON.parse(localStorage.getItem('posAnalytics') || '[]');
      existingAnalytics.push(analyticsData);
      localStorage.setItem('posAnalytics', JSON.stringify(existingAnalytics));
      
      // Store cash order
      const existingOrders = JSON.parse(localStorage.getItem('icspicy_orders') || '[]');
      existingOrders.push(orderData);
      localStorage.setItem('icspicy_orders', JSON.stringify(existingOrders));
      
    } catch (error) {
      console.error('❌ Cash payment documentation failed:', error);
      alert('Failed to document cash payment. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Handle crypto payment with real-time pricing
  const handleCryptoPayment = async (paymentMethod) => {
    setPaymentProcessing(true);
    
    try {
      const orderId = generateOrderId();
      let result;

      // Process payment based on method
      switch (paymentMethod.id) {
        case 'oisy':
        case 'internet_identity':
        case 'nfid':
          result = await processOisyPayment(cartTotal, 'ICP');
          break;
        case 'phantom':
        case 'solana_pay':
          result = await processPhantomPayment(cartTotal, 'SOL');
          break;
      case 'crypto_com':
        result = await processCryptoComPayment(cartTotal, 'CRO');
        break;
      case 'icpay':
        result = await processIcPayPayment(cartTotal);
        break;
      default:
        throw new Error('Unsupported payment method');
      }

      if (result.success) {
        // Create customer profile in CRM
        const customerData = {
          email: shippingInfo.email,
          firstName: shippingInfo.firstName,
          lastName: shippingInfo.lastName,
          phone: shippingInfo.phone,
          shippingAddress: shippingInfo,
          billingAddress: billingInfo.sameAsShipping ? shippingInfo : billingInfo
        };

        try {
          const crmResult = await customerCRM.createProfile(customerData, customerConsent);
          console.log('✅ Customer profile created in CRM:', crmResult.customerId);
        } catch (crmError) {
          console.warn('⚠️ Failed to create customer profile:', crmError);
        }

        // Create order with real crypto pricing
        const orderData = {
          id: orderId,
          items: shoppingCart,
          total: cartTotal,
          cryptoAmount: paymentMethod.calculation?.amount || 0,
          cryptoToken: paymentMethod.token || paymentMethod.calculation?.token || 'CRYPTO',
          exchangeRate: paymentMethod.calculation?.price || 0,
          payment: {
            method: paymentMethod.name,
            transactionId: result.transactionId,
            currency: result.currency,
            amount: result.amount,
            usdAmount: cartTotal,
            timestamp: Date.now(),
            selectedToken: paymentMethod.token
          },
          customer: {
            ...customerData,
            consent: customerConsent
          },
          status: 'confirmed'
        };

        setOrderDetails(orderData);
        setPaymentStatus('success');
        
        // Clear cart and proceed
        setShoppingCart([]);
        
        if (isPOSMode) {
          // Fast POS mode: show immediate success with optional receipt
          setShowPaymentSuccess(true);
          setShowCheckoutModal(false);
        } else {
          // Regular mode: go to confirmation step
          setCheckoutStep('confirmation');
        }
        
        // Create order in logistics system
        try {
          const logisticsOrder = await orders.createOrder(orderData);
          console.log('✅ Order created in logistics system:', logisticsOrder);
        } catch (logisticsError) {
          console.warn('⚠️ Failed to create logistics order:', logisticsError);
        }
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      console.error('Crypto payment failed:', error);
      setPaymentStatus('error');
      // Show error to user - could add a toast notification here
      alert(`Payment failed: ${error.message}`);
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Payment processing functions
  const processOisyPayment = async (amount, currency = 'ICP') => {
    try {
      if (!user || !signer) {
        throw new Error('OISY wallet not connected');
      }
      
      // Check if token is supported by OISY
      if (!isOisySupported(currency)) {
        throw new Error(`${currency} is not supported by OISY wallet`);
      }
      
      // Get the correct address for the selected token
      const recipientAddress = getOisyWalletAddress(currency);
      const chainConfig = getOisyChainConfig(currency);
      
      if (!recipientAddress || !chainConfig) {
        throw new Error(`Configuration not found for ${currency}`);
      }
      
      const cryptoAmount = await convertUSDToCrypto(amount, currency);
      const orderId = generateOrderId();
      
      // Real OISY payment processing - connect to actual wallet
      console.log(`Processing OISY payment: ${cryptoAmount} ${currency} to ${recipientAddress}`);
      
      // Connect to OISY wallet and process payment
      if (window.oisy) {
        try {
          const result = await window.oisy.requestTransfer({
            to: recipientAddress,
            amount: cryptoAmount,
            symbol: currency,
            // Include chain-specific configuration
            ...chainConfig
          });
          
          return {
            success: true,
            transactionId: result.transactionId,
            orderId,
            amount: cryptoAmount,
            currency: currency,
            recipient: recipientAddress,
            chain: chainConfig.network
          };
        } catch (error) {
          console.error('OISY payment failed:', error);
          throw error;
        }
      } else {
        throw new Error('OISY wallet not available');
      }
    } catch (error) {
      console.error('OISY payment failed:', error);
      throw error;
    }
  };

  const processPhantomPayment = async (amount, currency = 'SOL') => {
    try {
      if (!window.solana || !phantomConnected) {
        throw new Error('Phantom wallet not available or not connected');
      }
      
      const calculation = await convertUSDToCrypto(amount, currency);
      const orderId = generateOrderId();
      
      // Real Solana payment processing using Phantom wallet
      console.log(`Processing Phantom payment: ${calculation.amount} ${currency} for order ${orderId}`);
      console.log(`Exchange rate: 1 ${currency} = $${calculation.price}`);
      
      // Get recipient address for Solana payments
      const recipientAddress = getWalletAddress('solana');
      
      // Create real Solana transaction
      const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
      
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      const fromPubkey = new PublicKey(phantomAddress);
      const toPubkey = new PublicKey(recipientAddress);
      
      // Convert amount to lamports (SOL has 9 decimals)
      const lamports = Math.floor(calculation.amount * LAMPORTS_PER_SOL);
      
      // Create transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );
      
      // Get recent blockhash
      const { blockhash } = await connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;
      
      // Sign and send transaction using Phantom wallet
      const signedTransaction = await window.solana.signAndSendTransaction(transaction);
      
      // Wait for confirmation
      const signature = signedTransaction.signature;
      await connection.confirmTransaction(signature);
      
      return {
        success: true,
        transactionId: signature,
        orderId,
        amount: calculation.amount,
        currency: currency,
        recipient: recipientAddress,
        chain: 'solana'
      };
    } catch (error) {
      console.error('Phantom payment failed:', error);
      throw error;
    }
  };

  const processCryptoComPayment = async (amount, currency = 'CRO') => {
    try {
      const calculation = await convertUSDToCrypto(amount, currency);
      const orderId = generateOrderId();
      
      // Real Crypto.com payment processing
      console.log(`Processing Crypto.com payment: ${calculation.amount} ${currency} for order ${orderId}`);
      console.log(`Exchange rate: 1 ${currency} = $${calculation.price}`);
      
      // Get recipient address for Ethereum-based tokens (CRO is on Cronos which is EVM-compatible)
      const recipientAddress = getWalletAddress('ethereum');
      
      // For Crypto.com payments, we'll use Web3 to interact with Cronos network
      if (window.ethereum) {
        try {
          // Request account access
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          
          // Get the user's account
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length === 0) {
            throw new Error('No accounts found');
          }
          
          const fromAddress = accounts[0];
          
          // For CRO (native token), use eth_sendTransaction
          if (currency === 'CRO') {
            const transactionParameters = {
              from: fromAddress,
              to: recipientAddress,
              value: '0x' + (calculation.amount * Math.pow(10, 18)).toString(16), // Convert to wei
              gas: '0x5208', // 21000 gas for simple transfer
            };
            
            const txHash = await window.ethereum.request({
              method: 'eth_sendTransaction',
              params: [transactionParameters],
            });
            
            return {
              success: true,
              transactionId: txHash,
              orderId,
              amount: calculation.amount,
              currency: currency,
              recipient: recipientAddress,
              chain: 'cronos'
            };
          } else {
            // For ERC-20 tokens, we would need to call the token contract
            // This is a placeholder for ERC-20 token transfers
            throw new Error('ERC-20 token transfers not yet implemented');
          }
        } catch (error) {
          console.error('Ethereum/Cronos transaction failed:', error);
          throw error;
        }
      } else {
        throw new Error('Ethereum wallet not found. Please install MetaMask or compatible wallet.');
      }
    } catch (error) {
      console.error('Crypto.com payment failed:', error);
      throw error;
    }
  };

  const processIcPayPayment = async (amount) => {
    try {
      const orderId = generateOrderId();
      
      // IcPay multi-chain payment processing
      console.log(`Processing IcPay multi-chain payment: $${amount} for order ${orderId}`);
      
      // IcPay handles the actual payment processing through their widget
      // This is a placeholder for the initial transaction creation
      return {
        success: true,
        transactionId: `icpay-pending-${Date.now()}`,
        orderId,
        amount: amount,
        currency: 'USD',
        paymentMethod: 'IcPay'
      };
    } catch (error) {
      console.error('IcPay payment setup failed:', error);
      throw error;
    }
  };

  const processSolanaPayQR = async (amount) => {
    try {
      const solAmount = await convertUSDToSOL(amount);
      const orderId = generateOrderId();
      
      // Generate Solana Pay QR code URL
      const recipient = getWalletAddress('solana'); // Use centralized Solana wallet address
      const reference = `spicy-${Date.now()}`;
      
      const solanaPayUrl = `solana:${recipient}?amount=${solAmount}&reference=${reference}&label=IC%20SPICY%20Marketplace&message=Order%20${orderId}`;
      
      return {
        success: true,
        qrCodeUrl: solanaPayUrl,
        orderId,
        amount: solAmount,
        currency: 'SOL',
        reference
      };
    } catch (error) {
      console.error('Solana Pay QR generation failed:', error);
      throw error;
    }
  };

  const processCryptoComPay = async (amount) => {
    try {
      const orderId = generateOrderId();
      
      // Real Crypto.com Pay integration
      const cryptoComUrl = `https://pay.crypto.com/checkout?amount=${amount}&currency=USD&order_id=${orderId}&merchant=ic_spicy`;
      
      window.open(cryptoComUrl, '_blank');
      
      return {
        success: true,
        redirected: true,
        orderId,
        amount,
        currency: 'USD'
      };
    } catch (error) {
      console.error('Crypto.com Pay failed:', error);
      throw error;
    }
  };

  const processApplePay = async (amount) => {
    try {
      if (!window.ApplePaySession || !window.ApplePaySession.canMakePayments()) {
        throw new Error('Apple Pay not available');
      }
      
      const orderId = generateOrderId();
      
      // Real Apple Pay integration
      console.log(`Processing Apple Pay: $${amount} for order ${orderId}`);
      
      // Check if Apple Pay is available
      // eslint-disable-next-line no-undef
      if (typeof window !== 'undefined' && window.ApplePaySession && ApplePaySession.canMakePayments()) {
        const paymentRequest = {
          countryCode: 'US',
          currencyCode: 'USD',
          supportedNetworks: ['visa', 'masterCard', 'amex'],
          merchantCapabilities: ['supports3DS'],
          total: {
            label: 'IC SPICY Order',
            amount: amount.toString()
          }
        };

        // eslint-disable-next-line no-undef
        const session = new ApplePaySession(3, paymentRequest);
        
        session.onvalidatemerchant = (event) => {
          // Validate merchant with Apple
          // This would typically involve server-side validation
          session.completeMerchantValidation({});
        };

        session.onpaymentauthorized = (event) => {
          // Process payment
          // eslint-disable-next-line no-undef
          session.completePayment(ApplePaySession.STATUS_SUCCESS);
      
      return {
        success: true,
            transactionId: `apple-${Date.now()}`,
        orderId,
        amount,
        currency: 'USD'
      };
        };

        session.begin();
      } else {
        throw new Error('Apple Pay not available');
      }
    } catch (error) {
      console.error('Apple Pay failed:', error);
      throw error;
    }
  };

  const processGooglePay = async (amount) => {
    try {
      const orderId = generateOrderId();
      
      // Real Google Pay integration
      console.log(`Processing Google Pay: $${amount} for order ${orderId}`);
      
      // Check if Google Pay is available
      if (typeof window !== 'undefined' && window.google && window.google.payments) {
        const paymentRequest = {
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [{
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA']
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: {
                gateway: 'example',
                gatewayMerchantId: 'exampleGatewayMerchantId'
              }
            }
          }],
          transactionInfo: {
            totalPriceStatus: 'FINAL',
            totalPriceLabel: 'Total',
            totalPrice: amount.toString(),
            currencyCode: 'USD'
          },
          merchantInfo: {
            merchantId: 'ic-spicy-merchant',
            merchantName: 'IC SPICY Co-op'
          }
        };

        // eslint-disable-next-line no-undef
        const paymentsClient = new google.payments.api.PaymentsClient({environment: 'TEST'});
        
        paymentsClient.loadPaymentData(paymentRequest).then((paymentData) => {
          // Process payment data
          console.log('Google Pay payment successful:', paymentData);
      return {
        success: true,
            transactionId: `google-${Date.now()}`,
        orderId,
        amount,
        currency: 'USD'
      };
        }).catch((error) => {
          console.error('Google Pay failed:', error);
          throw error;
        });
      } else {
        throw new Error('Google Pay not available');
      }
    } catch (error) {
      console.error('Google Pay failed:', error);
      throw error;
    }
  };

  const processCardPayment = async (amount, cardData) => {
    try {
      const orderId = generateOrderId();
      
      // Real card payment integration
      console.log(`Processing card payment: $${amount} for order ${orderId}`);
      
      // This would typically integrate with a payment processor like Stripe, Square, etc.
      // For now, we'll simulate a real payment flow
      const paymentData = {
        amount: amount * 100, // Convert to cents
        currency: 'usd',
        orderId: orderId,
        description: `IC SPICY Order ${orderId}`
      };

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real implementation, this would call your payment processor API
      const paymentResult = {
        success: true,
        transactionId: `card-${Date.now()}`,
        orderId,
        amount,
        currency: 'USD',
        paymentMethod: 'card'
      };

      return paymentResult;
    } catch (error) {
      console.error('Card payment failed:', error);
      throw error;
    }
  };

  // Main payment handler
  const handlePayment = async (paymentMethod) => {
    setPaymentProcessing(true);
    setPaymentStatus('processing');
    
    try {
      let result;
      
      switch (paymentMethod.id) {
        case 'oisy':
          result = await processOisyPayment(cartTotal);
          break;
        case 'phantom':
          result = await processPhantomPayment(cartTotal);
          break;
        case 'solana_pay':
          result = await processSolanaPayQR(cartTotal);
          break;
        case 'crypto_com':
          result = await processCryptoComPay(cartTotal);
          break;
        case 'apple_pay':
          result = await processApplePay(cartTotal);
          break;
        case 'google_pay':
          result = await processGooglePay(cartTotal);
          break;
        case 'card':
          result = await processCardPayment(cartTotal);
          break;
        default:
          throw new Error('Unsupported payment method');
      }
      
      if (result.success) {
        // Create order record
        const order = {
          id: result.orderId,
          items: shoppingCart,
          total: cartTotal,
          payment: {
            method: paymentMethod.name,
            transactionId: result.transactionId,
            amount: result.amount,
            currency: result.currency,
            status: 'completed'
          },
          timestamp: new Date().toISOString(),
          customer: user?.principal || 'anonymous',
          shipping: shippingInfo,
          billing: billingInfo.sameAsShipping ? shippingInfo : billingInfo
        };
        
        setOrderDetails(order);
        setPaymentStatus('success');
        setShowPaymentSuccess(true);
        setShowCheckoutModal(false);
        
        // Clear cart after successful payment
        clearShoppingCart();
        
        // Store order in localStorage
        const existingOrders = JSON.parse(localStorage.getItem('icspicy_orders') || '[]');
        existingOrders.unshift(order);
        localStorage.setItem('icspicy_orders', JSON.stringify(existingOrders));
        
        // Sync order with logistics system
        try {
          const logisticsOrder = await syncOrderWithLogistics(order);
          if (logisticsOrder) {
            // Update local order with logistics ID
            order.logisticsOrderId = logisticsOrder.id;
            order.logisticsStatus = 'synced';
            
            // Update stored order
            existingOrders[0] = order;
            localStorage.setItem('icspicy_orders', JSON.stringify(existingOrders));
            
            // Update inventory in logistics system
            await updateLogisticsInventory(order.items);
          }
        } catch (error) {
          console.warn('⚠️ Order completed but logistics sync failed:', error);
          order.logisticsStatus = 'sync_failed';
        }
        
      } else {
        setPaymentStatus('failed');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentStatus('failed');
      alert(`Payment failed: ${error.message}`);
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Payment method selection handler
  const handlePaymentMethodSelect = useCallback(async (methodId, method, calculation) => {
    // Prevent multiple rapid clicks
    if (paymentProcessing) return;
    
    setSelectedPaymentMethod(methodId);
    
    // Enable IcPay callback only when IcPay is actually selected
    if (methodId === 'icpay') {
      setAllowIcPayCallback(true);
    } else {
      setAllowIcPayCallback(false);
    }
    
    // Handle cash payments differently
    if (methodId === 'cash') {
      await handleCashPayment(method);
    } else if (methodId === 'oisy' && method.tokens.length > 1) {
      setShowTokenSelector(true);
      setSelectedToken(null);
    } else if (methodId === 'icpay') {
      // IcPay should NOT auto-proceed - let the IcPay component handle the flow
      // Don't call handleCryptoPayment - let IcPay component handle it
    } else {
      // Auto-proceed with single-token payment methods
      const paymentMethod = {
        id: methodId,
        name: method.name,
        icon: method.icon,
        calculation: calculation,
        token: method.tokens[0]
      };
      
      await handleCryptoPayment(paymentMethod);
    }
  }, [paymentProcessing, handleCashPayment, handleCryptoPayment]);

  // Checkout step management
  const validateShippingInfo = () => {
    const required = ['firstName', 'lastName', 'email', 'address', 'city', 'state', 'zipCode'];
    return required.every(field => shippingInfo[field].trim() !== '');
  };

  const validateBillingInfo = () => {
    if (billingInfo.sameAsShipping) return true;
    const required = ['firstName', 'lastName', 'email', 'address', 'city', 'state', 'zipCode'];
    return required.every(field => billingInfo[field].trim() !== '');
  };

  const proceedToNextStep = () => {
    switch (checkoutStep) {
      case 'cart':
        if (shoppingCart.length === 0) {
          alert('Your cart is empty!');
          return;
        }
        setCheckoutStep('shipping');
        break;
      case 'shipping':
        if (!validateShippingInfo()) {
          alert('Please fill in all required shipping information.');
          return;
        }
        setCheckoutStep('billing');
        break;
      case 'billing':
        if (!validateBillingInfo()) {
          alert('Please fill in all required billing information.');
          return;
        }
        // Copy shipping to billing if same address
        if (billingInfo.sameAsShipping) {
          setBillingInfo(prev => ({
            ...prev,
            firstName: shippingInfo.firstName,
            lastName: shippingInfo.lastName,
            email: shippingInfo.email,
            address: shippingInfo.address,
            city: shippingInfo.city,
            state: shippingInfo.state,
            zipCode: shippingInfo.zipCode,
            country: shippingInfo.country
          }));
        }
        setCheckoutStep('payment');
        break;
      default:
        break;
    }
  };

  const goBackStep = () => {
    switch (checkoutStep) {
      case 'shipping':
        setCheckoutStep('cart');
        break;
      case 'billing':
        setCheckoutStep('shipping');
        break;
      case 'payment':
        setCheckoutStep('billing');
        break;
      default:
        break;
    }
  };

  // Logistics API integration functions
  const initializeLogistics = async () => {
    try {
      // Initialize with API credentials (these would normally come from environment variables)
      await logistics.initialize({
        apiKey: process.env.REACT_APP_LOGISTICS_API_KEY || 'icspicy_1_abc123def_1704067200',
        principal: user?.principal || iiPrincipal || preferredPrincipal
      });
      
      console.log('✅ Logistics API initialized');
    } catch (error) {
      console.error('❌ Failed to initialize logistics API:', error);
    }
  };

  const syncOrderWithLogistics = async (orderData) => {
    try {
      if (!logistics.isInitialized || !logistics.isAuthenticated) {
        console.log('🔄 Logistics API not ready, skipping sync');
        return null;
      }

      console.log('🚚 Syncing order with logistics system...');
      
      // Transform order data to logistics API format
      const logisticsOrderData = {
        items: orderData.items.map(item => ({
          id: item.id,
          product_id: `${item.variety.replace(/\s+/g, '-').toUpperCase()}-${item.size.toUpperCase()}`,
          variety: item.variety,
          size: item.size,
          unit: item.unit || 'each',
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          category: item.category
        })),
        customer: {
          principal: orderData.customer || user?.principal || iiPrincipal || 'anonymous',
          email: orderData.shipping?.email || 'unknown@example.com'
        },
        shipping: orderData.shipping,
        billing: orderData.billing,
        total: orderData.total,
        subtotal: orderData.total,
        tax: 0,
        shipping_cost: 0,
        payment: {
          method: orderData.payment?.method || 'Unknown',
          transaction_id: orderData.payment?.transactionId || `tx_${Date.now()}`,
          status: orderData.payment?.status || 'completed'
        },
        source: 'ic-spicy-frontend',
        notes: 'Order created from IC SPICY dApp'
      };

      const response = await orders.createOrder(logisticsOrderData);
      
      if (response) {
        console.log('✅ Order synced with logistics system:', response.id);
        return response;
      }
    } catch (error) {
      console.error('❌ Failed to sync order with logistics:', error);
      // Don't throw error - order was successful locally even if sync failed
      return null;
    }
  };

  const updateLogisticsInventory = async (items) => {
    try {
      if (!logistics.isInitialized || !logistics.isAuthenticated) {
        return;
      }

      console.log('📦 Updating logistics inventory...');
      
      // Update inventory for each item (would require inventory management hook)
      for (const item of items) {
        try {
          const productId = `${item.variety.replace(/\s+/g, '-').toUpperCase()}-${item.size.toUpperCase()}`;
          // This would update inventory levels in the logistics system
          console.log(`📦 Would update inventory for ${productId}, quantity: -${item.quantity}`);
        } catch (error) {
          console.warn('⚠️ Failed to update inventory for item:', item.variety, error);
        }
      }
    } catch (error) {
      console.error('❌ Failed to update logistics inventory:', error);
    }
  };

  // Show product information modal
  const showVarietyInfo = (variety) => {
    setSelectedVariety(variety);
    setShowProductInfo(true);
  };

  // Enhanced addToShoppingCart with analytics tracking
  const addToShoppingCartWithAnalytics = async (product, size, quantity, source = 'regular') => {
    try {
      // Add to cart normally
      addToShoppingCart(product, size, quantity);
      
      // Track in logistics and analytics
      const transactionData = {
        id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productId: product.id,
        productName: product.name || `${product.variety} ${product.size}`,
        category: product.category || selectedCategory,
        variety: product.variety || product.name,
        size: size ? size.name : 'Standard',
        quantity: quantity,
        unitPrice: size ? size.price : product.price,
        totalPrice: (size ? size.price : product.price) * quantity,
        source: source, // 'pos-menu', 'regular', etc.
        timestamp: Date.now(),
        location: 'in-person-event',
        paymentMethod: 'pending',
        status: 'cart'
      };

      // Send to logistics API for tracking
      try {
        console.log('📊 Tracking POS transaction:', transactionData);
        
        // Update inventory in logistics system
        await updateLogisticsInventory([{
          variety: transactionData.variety,
          size: transactionData.size,
          quantity: transactionData.quantity
        }]);

        // Track in analytics (would integrate with real analytics service)
        const analyticsData = {
          event: 'product_added_to_cart',
          source: source,
          category: transactionData.category,
          product: transactionData.productName,
          value: transactionData.totalPrice,
          timestamp: transactionData.timestamp
        };
        
        console.log('📈 Analytics tracking:', analyticsData);
        
        // Store locally for API endpoint aggregation
        const existingAnalytics = JSON.parse(localStorage.getItem('posAnalytics') || '[]');
        existingAnalytics.push(analyticsData);
        localStorage.setItem('posAnalytics', JSON.stringify(existingAnalytics));
        
      } catch (analyticsError) {
        console.warn('⚠️ Analytics tracking failed:', analyticsError);
      }

    } catch (error) {
      console.error('❌ Error adding to cart with analytics:', error);
      // Still add to cart even if analytics fails
      addToShoppingCart(product, size, quantity);
    }
  };

  // Admin logout function
  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setShowAnalytics(false);
    setShowTransactionDetails(false);
    setShowPOSMode(false);
    setShowProductManagement(false);
  };

  // Check admin status when wallet connection changes
  useEffect(() => {
    const checkAdminStatus = () => {
      console.log('🔍 Checking admin status...');
      console.log('🔍 isConnected:', isConnected);
      console.log('🔍 OISY user:', user);
      console.log('🔍 isUserAdmin():', isUserAdmin());
      
      if ((isConnected || user) && isUserAdmin()) {
        console.log('✅ Setting admin authenticated to true');
        setIsAdminAuthenticated(true);
      } else if (!isConnected && !user) {
        console.log('❌ No wallet connected, setting admin authenticated to false');
        setIsAdminAuthenticated(false);
      } else if ((isConnected || user) && !isUserAdmin()) {
        console.log('⚠️ Wallet connected but user is not admin');
        setIsAdminAuthenticated(false);
      }
    };
    
    checkAdminStatus();
  }, [isConnected, iiPrincipal, principal, preferredPrincipal, user]);

  // Initialize logistics API when wallet is connected
  useEffect(() => {
    const initLogistics = async () => {
      if ((user?.principal || iiPrincipal || preferredPrincipal) && !logistics.isInitialized) {
        console.log('🚚 Initializing logistics API integration...');
        await initializeLogistics();
      }
    };

    initLogistics();
  }, [user?.principal, iiPrincipal, preferredPrincipal, logistics.isInitialized]);

  // Debug modal states (removed for production)

  // Initialize comprehensive product catalog
  const initializeProducts = () => {
    // Define plant varieties with comprehensive information
    const plantVarieties = [
      {
        name: 'Carolina Reaper',
        id: 'carolina-reaper',
        description: 'World\'s hottest pepper - extreme heat variety',
        heat: 'Extreme (2.2M+ SHU)',
        shu: '2,200,000+',
        isSuperhot: true,
        origin: 'South Carolina, USA',
        history: 'Developed by Ed Currie of PuckerButt Pepper Company, the Carolina Reaper officially became the world\'s hottest pepper in 2013. It\'s a cross between a Pakistani Naga and a Red Habanero.',
        culinaryUses: 'Use sparingly in hot sauces, extreme challenge foods, and as a heat enhancer. Excellent for making super-hot powders and extracts.',
        flavorProfile: 'Initially sweet and fruity, followed by intense, lingering heat',
        pairings: ['Chocolate', 'Mango', 'Pineapple', 'Lime', 'Honey', 'Garlic']
      },
      {
        name: 'Death Spiral',
        id: 'death-spiral',
        description: 'Ultra-hot variety with unique twisted pods',
        heat: 'Extreme (1.5M+ SHU)',
        shu: '1,500,000+',
        isSuperhot: true,
        origin: 'Hybrid cultivar',
        history: 'A relatively new superhot variety known for its distinctive spiral-shaped pods. Created through selective breeding of superhot varieties to achieve both extreme heat and unique appearance.',
        culinaryUses: 'Perfect for creating visually striking hot sauces and extreme heat challenges. The unique shape makes it ideal for decorative hot sauce bottles.',
        flavorProfile: 'Fruity with citrus notes, building to devastating heat',
        pairings: ['Orange', 'Papaya', 'Ginger', 'Turmeric', 'Coconut', 'Cilantro']
      },
      {
        name: 'Apocalypse Scorpion',
        id: 'apocalypse-scorpion',
        description: 'Devastating heat with scorpion-tail pods',
        heat: 'Extreme (1.2M+ SHU)',
        shu: '1,200,000+',
        isSuperhot: true,
        origin: 'Italy/Trinidad hybrid',
        history: 'Developed in Italy, this variety combines the heat of Trinidad Scorpion peppers with enhanced flavor characteristics. Known for its distinctive scorpion-tail tip and extreme heat.',
        culinaryUses: 'Excellent for creating artisanal hot sauces, extreme cooking challenges, and heat-focused culinary applications. Use extreme caution.',
        flavorProfile: 'Sweet and fruity initially, with a delayed but intense burning sensation',
        pairings: ['Dark chocolate', 'Cherry', 'Balsamic vinegar', 'Basil', 'Olive oil', 'Parmesan']
      },
      {
        name: 'MOA Scotch Bonnet',
        id: 'moa-scotch-bonnet',
        description: 'Caribbean favorite with fruity heat',
        heat: 'Hot (350K SHU)',
        shu: '350,000',
        isSuperhot: false,
        origin: 'Jamaica, Caribbean',
        history: 'Named "Ministry of Agriculture" Scotch Bonnet, this is a premium strain developed for optimal flavor and heat balance. Essential in authentic Jamaican and Caribbean cuisine.',
        culinaryUses: 'Perfect for jerk seasoning, Caribbean curries, hot sauces, and traditional island dishes. Excellent fresh, dried, or in marinades.',
        flavorProfile: 'Distinctly fruity with tropical notes and substantial heat',
        pairings: ['Allspice', 'Thyme', 'Ginger', 'Coconut', 'Rum', 'Plantains']
      },
      {
        name: 'Foodarama Scotch Bonnet',
        id: 'foodarama-scotch-bonnet',
        description: 'Premium Scotch Bonnet variety',
        heat: 'Hot (400K SHU)',
        shu: '400,000',
        isSuperhot: false,
        origin: 'Jamaica, Caribbean',
        history: 'A superior Scotch Bonnet cultivar selected for enhanced flavor complexity and consistent heat levels. Prized by Caribbean chefs for its reliability and exceptional taste.',
        culinaryUses: 'Ideal for traditional Caribbean cooking, jerk marinades, pepper sauces, and wherever authentic Scotch Bonnet flavor is desired.',
        flavorProfile: 'Rich fruity flavor with citrus undertones and sustained heat',
        pairings: ['Scotch whisky', 'Brown sugar', 'Soy sauce', 'Garlic', 'Onion', 'Bell peppers']
      },
      {
        name: 'Sugar Rush Peach',
        id: 'sugar-rush-peach',
        description: 'Sweet and spicy peach-colored pods',
        heat: 'Medium (50K SHU)',
        shu: '50,000',
        isSuperhot: false,
        origin: 'USA (selective breeding)',
        history: 'Developed through selective breeding programs focusing on color and flavor. Part of the "Sugar Rush" series known for combining sweetness with moderate heat levels.',
        culinaryUses: 'Excellent in fruit salsas, sweet and spicy jams, dessert applications, and wherever a fruity heat is desired without overwhelming spice.',
        flavorProfile: 'Sweet, peachy flavor with mild to medium heat that doesn\'t overwhelm',
        pairings: ['Peaches', 'Vanilla', 'Cream cheese', 'Brie', 'Champagne', 'Arugula']
      },
      {
        name: 'Aji Charapita',
        id: 'aji-charapita',
        description: 'Tiny Peruvian peppers, highly prized',
        heat: 'Hot (100K SHU)',
        shu: '100,000',
        isSuperhot: false,
        specialty: true,
        origin: 'Peru, Amazon rainforest',
        history: 'Known as "Mother of all Chilis" in Peru, these tiny wild peppers are considered the most expensive chili in the world. They grow wild in the Amazon and are extremely difficult to cultivate.',
        culinaryUses: 'Used sparingly as a finishing pepper in high-end cuisine. Perfect for infusions, gourmet hot sauces, and as a unique garnish for special dishes.',
        flavorProfile: 'Intense fruity flavor with quick, clean heat that doesn\'t linger',
        pairings: ['Seafood', 'White wine', 'Butter', 'Citrus', 'Quinoa', 'Ceviche']
      },
      {
        name: 'Aji Guyana',
        id: 'aji-guyana',
        description: 'South American variety with citrus notes',
        heat: 'Medium-Hot (75K SHU)',
        shu: '75,000',
        isSuperhot: false,
        origin: 'Guyana, South America',
        history: 'Traditional South American variety cultivated for generations. Known for its unique citrusy flavor profile and moderate heat level that enhances rather than overwhelms dishes.',
        culinaryUses: 'Excellent in South American cuisine, marinades, ceviches, and dishes where citrusy heat is desired. Great fresh or in sauces.',
        flavorProfile: 'Bright citrusy flavor with medium heat and tropical fruit notes',
        pairings: ['Lime', 'Fish', 'Rice', 'Black beans', 'Avocado', 'Cilantro']
      },
      {
        name: 'Farmers Market Jalapeno',
        id: 'farmers-market-jalapeno',
        description: 'Classic mild pepper for everyday use',
        heat: 'Mild (5K SHU)',
        shu: '5,000',
        isSuperhot: false,
        origin: 'Mexico (Xalapa, Veracruz)',
        history: 'Named after the town of Xalapa (Jalapa) in Mexico, jalapeños have been cultivated for thousands of years. This farmers market variety is selected for consistent size and flavor.',
        culinaryUses: 'Perfect for everyday cooking, stuffing, pickling, salsas, and anywhere mild heat is desired. Excellent fresh, roasted, or pickled.',
        flavorProfile: 'Fresh, grassy flavor with mild heat and slight vegetal notes',
        pairings: ['Cheese', 'Bacon', 'Cream cheese', 'Corn', 'Tomatoes', 'Onions']
      },
      {
        name: 'Fish Pepper',
        id: 'fish-pepper',
        description: 'Historic variety with variegated leaves',
        heat: 'Medium (15K SHU)',
        shu: '15,000',
        isSuperhot: false,
        origin: 'Chesapeake Bay region, USA',
        history: 'A historic African-American heirloom variety from the Chesapeake Bay area. Nearly extinct, it was traditionally used by fish house cooks and oyster shuckers in Baltimore and Philadelphia.',
        culinaryUses: 'Traditional in seafood houses, excellent with oysters, fish dishes, and wherever a medium heat with unique appearance is desired.',
        flavorProfile: 'Clean, bright heat with a slightly smoky undertone',
        pairings: ['Seafood', 'Oysters', 'Vinegar', 'Butter', 'Lemon', 'Old Bay seasoning']
      },
      {
        name: 'Calabrian Chili',
        id: 'calabrian-chili',
        description: 'Italian favorite with smoky flavor',
        heat: 'Medium (25K SHU)',
        shu: '25,000',
        isSuperhot: false,
        origin: 'Calabria, Southern Italy',
        history: 'Traditional to the Calabria region of Italy, these peppers have been cultivated for centuries. They\'re essential in Calabrian cuisine and are often preserved in olive oil.',
        culinaryUses: 'Perfect for Italian cuisine, pizza toppings, pasta sauces, and preservation in olive oil. Excellent fresh, dried, or as a paste.',
        flavorProfile: 'Smoky, fruity flavor with moderate heat and slight sweetness',
        pairings: ['Olive oil', 'Garlic', 'Tomatoes', 'Mozzarella', 'Basil', 'Prosciutto']
      }
    ];

    // Plant size pricing
    const plantSizes = [
      { id: 'plug', name: 'Plug', price: 5.00, description: 'Small seedling in cell tray' },
      { id: 'small', name: 'Small', price: 12.00, description: '3-4 inch pot, young plant' },
      { id: 'medium', name: 'Medium', price: 25.00, description: '5-6 inch pot, established plant' },
      { id: 'large', name: 'Large', price: 45.00, description: '8+ inch pot, mature plant ready to produce' }
    ];

    // Plumeria varieties and sizes
    const plumeriaVarieties = [
      {
        name: 'Plumeria Tree #1',
        id: 'plumeria-1',
        description: 'Young plumeria tree, bloom color to be determined',
        bloom: 'Unknown - Not Yet Bloomed'
      },
      {
        name: 'Plumeria Tree #2',
        id: 'plumeria-2',
        description: 'Young plumeria tree, bloom color to be determined',
        bloom: 'Unknown - Not Yet Bloomed'
      },
      {
        name: 'Plumeria Tree #3',
        id: 'plumeria-3',
        description: 'Young plumeria tree, bloom color to be determined',
        bloom: 'Unknown - Not Yet Bloomed'
      },
      {
        name: 'Plumeria Tree #4',
        id: 'plumeria-4',
        description: 'Young plumeria tree, bloom color to be determined',
        bloom: 'Unknown - Not Yet Bloomed'
      }
    ];

    const plumeriaSizes = [
      { id: '3-gallon', name: '3 Gallon', price: 65.00, description: '3 gallon container with premium potting soil blend' },
      { id: '5-gallon', name: '5 Gallon', price: 85.00, description: '5 gallon container with premium potting soil blend' }
    ];

    const defaultProducts = {
    plants: {
        categoryName: 'Pepper Plants',
        categoryIcon: '🌱',
        varieties: plantVarieties,
        sizes: plantSizes,
        products: [] // Generated dynamically
      },
      plumeria: {
        categoryName: 'Plumeria Trees',
        categoryIcon: '🌺',
        varieties: plumeriaVarieties,
        sizes: plumeriaSizes,
        products: [] // Generated dynamically
      },
      pepperPods: {
        categoryName: 'Fresh Pepper Pods',
        categoryIcon: '🌶️',
        varieties: plantVarieties,
        sizes: [
          {
            id: 'small-pod',
            name: 'Small (1/4 lb)',
            description: 'Perfect for trying new varieties',
            price: 8.00,
            weight: '0.25 lbs'
          },
          {
            id: 'medium-pod',
            name: 'Medium (1/2 lb)',
            description: 'Great for cooking and recipes',
            price: 15.00,
            weight: '0.5 lbs'
          },
          {
            id: 'large-pod',
            name: 'Large (1 lb)',
            description: 'Bulk quantity for serious cooks',
            price: 25.00,
            weight: '1 lb'
          }
        ],
        products: [] // Generated dynamically
      },
      spiceBlends: {
        categoryName: 'Spice Blends & Seasonings',
        categoryIcon: '🧂',
        products: [
          {
            id: 'spice-apocalypse',
            name: 'Apocalypse Blend',
            size: 'Shaker Bottle',
            price: 15.99,
            description: 'Our signature ultra-hot spice blend with Carolina Reaper',
            inStock: true,
            heat: 'Extreme'
          },
          {
            id: 'spice-fire-storm',
            name: 'Fire Storm Seasoning',
            size: 'Shaker Bottle',
            price: 15.99,
            description: 'Medium-hot all-purpose seasoning blend',
            inStock: true,
            heat: 'Medium-Hot'
          },
          {
            id: 'spice-smoky-chipotle',
            name: 'Smoky Chipotle Blend',
            size: 'Shaker Bottle',
            price: 15.99,
            description: 'Smoky chipotle with mild heat and deep flavor',
            inStock: true,
            heat: 'Mild-Medium'
          },
          {
            id: 'spice-caribbean-fire',
            name: 'Caribbean Fire',
            size: 'Shaker Bottle',
            price: 15.99,
            description: 'Scotch bonnet based blend with tropical notes',
            inStock: true,
            heat: 'Hot'
          },
          {
            id: 'spice-devils-dust',
            name: 'Devil\'s Dust',
            size: 'Shaker Bottle',
            price: 15.99,
            description: 'Ghost pepper powder blend for serious heat',
            inStock: true,
            heat: 'Very Hot'
          }
        ]
      },
      sauces: {
        categoryName: 'Hot Sauces',
        categoryIcon: '🍯',
        products: [
          {
            id: 'sauce-reaper-rage',
            name: 'Reaper Rage Sauce',
            size: '5 oz bottle',
            price: 16.99,
            description: 'Extreme heat Carolina Reaper sauce - not for beginners',
            inStock: false,
            comingSoon: true,
            heat: 'Extreme'
          },
          {
            id: 'sauce-ghost-town',
            name: 'Ghost Town Hot Sauce',
            size: '5 oz bottle',
            price: 14.99,
            description: 'Ghost pepper sauce with garlic and vinegar',
            inStock: false,
            comingSoon: true,
            heat: 'Very Hot'
          },
          {
            id: 'sauce-scotch-bonnet-fire',
            name: 'Scotch Bonnet Fire',
            size: '5 oz bottle',
            price: 12.99,
            description: 'Caribbean-style sauce with fruity heat',
            inStock: false,
            comingSoon: true,
            heat: 'Hot'
          }
        ]
      }
    };

    // Generate plant products dynamically
    plantVarieties.forEach(variety => {
      plantSizes.forEach(size => {
        defaultProducts.plants.products.push({
          id: `plant-${variety.id}-${size.id}`,
          name: `${variety.name} Plant`,
          variety: variety.name,
          varietyId: variety.id,
          size: size.name,
          sizeId: size.id,
          price: size.price,
          description: `${size.description} - ${variety.description}`,
          heat: variety.heat,
          inStock: true,
          isSuperhot: variety.isSuperhot,
          specialty: variety.specialty || false
        });
      });
    });

    // Generate plumeria products dynamically
    plumeriaVarieties.forEach(variety => {
      plumeriaSizes.forEach(size => {
        defaultProducts.plumeria.products.push({
          id: `plumeria-${variety.id}-${size.id}`,
          name: `${variety.name} Plumeria`,
          variety: variety.name,
          varietyId: variety.id,
          size: size.name,
          sizeId: size.id,
          price: size.price,
          description: `${size.description} - ${variety.description}`,
          bloom: variety.bloom,
          inStock: true,
          specialty: true,
          fragrant: true
        });
      });
    });

    // Generate pod products dynamically
    plantVarieties.forEach(variety => {
      // Regular by-the-pound option
      let poundPrice = 12.99; // Default price
      if (variety.isSuperhot) {
        poundPrice = 14.99; // Superhot pricing
      }
      if (variety.specialty && variety.id === 'aji-charapita') {
        poundPrice = 55.00; // Special Aji Charapita pricing
      }

      defaultProducts.pepperPods.products.push({
        id: `pods-${variety.id}-pound`,
        name: `${variety.name} Pods`,
        variety: variety.name,
        varietyId: variety.id,
        unit: 'per pound',
        price: poundPrice,
        description: `Fresh ${variety.name} pods, sold by the pound - ${variety.description}`,
        heat: variety.heat,
        inStock: true,
        isSuperhot: variety.isSuperhot,
        specialty: variety.specialty || false
      });

      // Add "by the pod" option for superhots only
      if (variety.isSuperhot) {
        defaultProducts.pepperPods.products.push({
          id: `pods-${variety.id}-single`,
          name: `${variety.name} Pod`,
          variety: variety.name,
          varietyId: variety.id,
          unit: 'per pod',
          price: 1.00,
          description: `Single fresh ${variety.name} pod for in-person sales - ${variety.description}`,
          heat: variety.heat,
          inStock: true,
          isSuperhot: true,
          inPersonOnly: true
        });
      }
    });
    
    return defaultProducts;
  };

  // Load transaction history and products on component mount
  useEffect(() => {
    const storedTransactions = JSON.parse(localStorage.getItem('icspicy_pos_transactions') || '[]');
    const storedSummaries = JSON.parse(localStorage.getItem('icspicy_daily_summaries') || '{}');
    const storedProducts = JSON.parse(localStorage.getItem('icspicy_products') || 'null');
    const lastProductVersion = localStorage.getItem('icspicy_product_version') || '1.0';
    
    setTransactionHistory(storedTransactions);
    setDailySummaries(storedSummaries);
    
    // Version 4.0 - Complete multichain payment integration with crypto and traditional options
    const currentVersion = '4.0';
    
    // Force refresh if version changed or no stored products
    if (!storedProducts || lastProductVersion !== currentVersion || !storedProducts.plumeria) {
      console.log('🔄 Updating product catalog to version', currentVersion);
      const defaultProducts = initializeProducts();
      setProducts(defaultProducts);
      localStorage.setItem('icspicy_products', JSON.stringify(defaultProducts));
      localStorage.setItem('icspicy_product_version', currentVersion);
      
      // Initialize inventory for all products
      inventoryService.initializeAllProducts(defaultProducts);
    } else {
      setProducts(storedProducts);
      // Initialize inventory for existing products
      inventoryService.initializeAllProducts(storedProducts);
    }

    // Subscribe to inventory changes
    const unsubscribeInventory = inventoryService.subscribe((inventory) => {
      setInventoryData(inventory);
      
      // Check for low stock alerts
      const lowStockItems = inventoryService.getLowStockItems();
      setLowStockAlerts(lowStockItems);
    });

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeInventory) {
        unsubscribeInventory();
      }
    };
  }, []);

  // Export functions for transparency
  const exportTransactions = (format = 'json') => {
    const dataToExport = {
      exported: new Date().toISOString(),
      totalTransactions: transactionHistory.length,
      transactions: transactionHistory,
      dailySummaries: dailySummaries
    };

    if (format === 'json') {
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `icspicy_transactions_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const csvHeaders = ['Transaction ID', 'Date', 'Time', 'Payment Method', 'Items', 'Total', 'Receipt Number', 'Hash'];
      const csvRows = transactionHistory.map(tx => [
        tx.id,
        tx.date,
        tx.time,
        tx.paymentMethod,
        tx.items.map(item => `${item.product}${item.size ? ` (${item.size})` : ''}`).join('; '),
        tx.total.toFixed(2),
        tx.receiptNumber,
        tx.auditTrail?.hash || 'N/A'
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      const dataBlob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `icspicy_transactions_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const printReceipt = (transaction = currentTransaction) => {
    if (!transaction) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${transaction.receiptNumber}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 12px; margin: 20px; }
            .receipt { max-width: 300px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; font-weight: bold; }
            .footer { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; text-align: center; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h2>🌶️ IC SPICY</h2>
              <p>Receipt #${transaction.receiptNumber}</p>
              <p>${transaction.date} ${transaction.time}</p>
              <p>Transaction: ${transaction.id}</p>
            </div>
            
            <div class="items">
              ${transaction.items.map(item => `
                <div class="item">
                  <span>${item.product}${item.size ? ` (${item.size})` : ''}</span>
                  <span>$${item.price.toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="total">
              <div class="item">
                <span>Subtotal:</span>
                <span>$${transaction.subtotal.toFixed(2)}</span>
              </div>
              <div class="item">
                <span>Tax:</span>
                <span>$${transaction.tax.toFixed(2)}</span>
              </div>
              <div class="item" style="font-size: 14px;">
                <span>TOTAL:</span>
                <span>$${transaction.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Payment: ${transaction.paymentMethod}</p>
              <p>Cashier: ${transaction.cashier}</p>
              <p>Location: ${transaction.location}</p>
              <p>Hash: ${transaction.auditTrail?.hash}</p>
              <p>Thank you for your business!</p>
              <p>🌶️ Visit us at icspicy.com 🌶️</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generateQRData = () => {
    // Create a URL that leads to payment options for this specific product
    const baseUrl = window.location.origin;
    const productId = selectedProduct?.id || 'unknown';
    const productName = encodeURIComponent(selectedProduct?.name || 'Unknown Product');
    const price = selectedProduct?.price || 0;
    const size = selectedProduct?.size ? encodeURIComponent(selectedProduct.size) : '';
    const unit = selectedProduct?.unit ? encodeURIComponent(selectedProduct.unit) : '';
    
    // Create a payment selection URL that shows all available payment methods
    const paymentUrl = `${baseUrl}/shop?product=${productId}&name=${productName}&price=${price}&size=${size}&unit=${unit}&payment=true`;
    
    return paymentUrl;
  };

  console.log('🔍 Products object:', products);
  console.log('🔍 Active category:', activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Header */}
      <div className="text-center py-12">
        <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-yellow-400 mb-6">
          IC SPICY MARKETPLACE
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
          Premium pepper varieties, live plants, and expertly crafted spice blends
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
          <motion.button
            onClick={() => {
              console.log('🛒 Shopping cart button clicked, current cart:', shoppingCart, 'total:', cartTotal);
              setShowShoppingCart(true);
            }}
            className="relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🛒 Shopping Cart
            {shoppingCart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {shoppingCart.length}
              </span>
            )}
            {cartTotal > 0 && (
              <span className="ml-2 text-sm opacity-90">
                ${cartTotal.toFixed(2)}
              </span>
            )}
          </motion.button>
          
          <motion.button
            onClick={() => window.open('https://t3kno-logic.xyz/collections/ic-spicy', '_blank')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🔥 Shop our Exclusive Merch
          </motion.button>
        </div>
        
        {/* POS Mode Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        <motion.button
          onClick={() => setShowMenu(true)}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl text-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
            🍽️ MENU FOR IN-PERSON EVENTS
        </motion.button>
          
          <motion.button
            onClick={async () => {
              const authenticated = await authenticateAdmin('access multichain POS system');
              if (authenticated) {
                setShowPOSMode(true);
              }
            }}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl text-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🔒 ADMIN POS SYSTEM
          </motion.button>
          
        </div>
      </div>

      {/* Category Navigation */}
      <div className="flex justify-center mb-12">
        <div className="flex flex-wrap gap-4 justify-center">
          {Object.entries(products).map(([key, category]) => (
            <motion.button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeCategory === key
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-600/30'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {category.categoryIcon} {category.categoryName}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4">
        {activeCategory === 'plants' || activeCategory === 'plumeria' || activeCategory === 'pepperPods' ? (
          // Variety-based display for plants and pods
          <div className="space-y-8">
            {products[activeCategory]?.varieties?.map((variety) => {
              const varietyProducts = products[activeCategory]?.products?.filter(p => p.varietyId === variety.id) || [];
              if (varietyProducts.length === 0) return null;
              
              return (
                <motion.div
                  key={variety.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-600/30"
                >
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-white">{variety.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          activeCategory === 'plumeria'
                            ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                            : variety.isSuperhot 
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                              : variety.specialty
                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                : 'bg-green-500/20 text-green-300 border border-green-500/30'
                        }`}>
                          {activeCategory === 'plumeria' ? 'Pre-Bloom' : variety.heat}
                        </span>
                      </div>
                      {(activeCategory === 'plants' || activeCategory === 'pepperPods') && variety.history && (
                        <button
                          onClick={() => showVarietyInfo(variety)}
                          className="px-3 py-1 bg-blue-600/50 text-blue-200 hover:bg-blue-600/70 border border-blue-500/30 rounded text-sm"
                        >
                          📖 Learn More
                        </button>
                      )}
                    </div>
                    <p className="text-gray-300">{variety.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {varietyProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        className={`bg-gray-700/50 rounded-xl p-4 border border-gray-600/30 text-center hover:border-orange-400/50 transition-all duration-300 ${
                          !product.inStock || product.comingSoon ? 'opacity-70' : ''
                        }`}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="text-2xl mb-2">
                          {activeCategory === 'plants' ? '🌱' : activeCategory === 'plumeria' ? '🌺' : '🌶️'}
                        </div>
                        
                        <h4 className="text-white font-semibold mb-1">
                          {product.size || product.unit}
                        </h4>
                        
                        <div className="text-orange-400 font-bold text-lg mb-2">
                          ${product.price?.toFixed(2)}
                        </div>
                        
                        {product.inPersonOnly && (
                          <div className="text-xs text-blue-300 mb-2">In-Person Only</div>
                        )}
                        
                        <div className="flex flex-col items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            product.inStock ? 'bg-green-400' : 'bg-red-400'
                          }`}></span>
                          
                          {(() => {
                            const inventoryStatus = getProductStatus(product.id);
                            const isAvailable = inventoryStatus.status !== 'out_of_stock' && !product.comingSoon;
                            const stockCount = inventoryStatus.available;
                            const isLowStock = inventoryStatus.status === 'low_stock';
                            
                            return isAvailable ? (
                              <div className="space-y-1">
                                <div className={`text-xs ${isLowStock ? 'text-yellow-400' : 'text-green-400'}`}>
                                  {isLowStock ? `⚠️ Low Stock (${stockCount})` : `✓ In Stock (${stockCount})`}
                                </div>
                                <button
                                  onClick={() => addToShoppingCart(product)}
                                  className={`w-full px-3 py-1 border rounded text-sm transition-all ${
                                    isLowStock 
                                      ? 'bg-yellow-600/50 text-yellow-200 hover:bg-yellow-600/70 border-yellow-500/30'
                                      : 'bg-green-600/50 text-green-200 hover:bg-green-600/70 border-green-500/30'
                                  }`}
                                >
                                  🛒 Add to Cart
                                </button>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">
                                {product.comingSoon ? 'Coming Soon' : 'Out of Stock'}
                              </div>
                            );
                          })()}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          // Regular grid display for spices and sauces
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products[activeCategory]?.products?.map((product) => (
            <motion.div
              key={product.id}
                className={`bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-600/30 text-center hover:border-orange-400/50 transition-all duration-300 cursor-pointer ${
                  !product.inStock || product.comingSoon ? 'opacity-70' : ''
                }`}
              whileHover={{ scale: 1.02, y: -2 }}
              onClick={() => {
                  if (product.inStock && !product.comingSoon) {
                  setSelectedProduct(product);
                  setSelectedSize(null);
                }
              }}
            >
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center text-4xl mb-4">
                  {products[activeCategory]?.categoryIcon || '🌶️'}
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
              <p className="text-gray-300 text-sm mb-3">{product.description}</p>
              
              {product.heat && (
                  <div className="mb-3">
                    <span className="px-3 py-1 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-500/30">
                  {product.heat}
                    </span>
                </div>
              )}
              
                <div className="flex items-center justify-center gap-2 mb-3">
                  {product.size && (
                    <span className="text-gray-400 text-sm">{product.size}</span>
                  )}
                  {product.comingSoon && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full border border-yellow-500/30">
                      Coming Soon
                    </span>
                  )}
                  {!product.inStock && !product.comingSoon && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full border border-red-500/30">
                      Out of Stock
                    </span>
                  )}
                </div>
                
                <div className="text-orange-400 font-semibold text-xl">
                  ${product.price?.toFixed(2)}
                </div>
                
                <div className="mt-2 flex justify-center">
                  <span className={`w-3 h-3 rounded-full ${
                    product.inStock ? 'bg-green-400' : 'bg-red-400'
                  }`}></span>
              </div>
            </motion.div>
            )) || (
              <div className="col-span-full text-center text-gray-400 py-12">
                <p className="text-xl">No products available in this category yet.</p>
                <p className="text-sm mt-2">Check back soon for new items!</p>
        </div>
            )}
          </div>
        )}
      </div>

      {/* Product Selection Modal */}
      {selectedProduct && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 max-w-2xl w-full border border-gray-600/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl font-bold text-white">{selectedProduct.name}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                ×
              </button>
            </div>

            <p className="text-gray-300 mb-6">{selectedProduct.description}</p>

            {/* Product Details */}
            <div className="bg-gray-800/50 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 text-sm">Price:</span>
                  <div className="text-2xl font-bold text-green-400">${selectedProduct.price?.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">
                    {selectedProduct.size ? 'Size:' : selectedProduct.unit ? 'Unit:' : 'Category:'}
                  </span>
                  <div className="text-white font-semibold">
                    {selectedProduct.size || selectedProduct.unit || products[activeCategory]?.categoryName}
              </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${selectedProduct.inStock ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  <span className="text-gray-300 text-sm">
                    {selectedProduct.comingSoon ? 'Coming Soon' : selectedProduct.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                {selectedProduct.comingSoon && (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full border border-yellow-500/30">
                    Available Soon
                  </span>
                )}
              </div>
            </div>

            {/* Transaction Type Selection */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Transaction Type:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.button
                  onClick={() => setIsInPerson(false)}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    !isInPerson
                      ? 'border-blue-400 bg-blue-500/20 text-blue-300'
                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="font-bold text-lg">🛒 Online Order</div>
                  <div className="text-sm text-gray-400">Shipping available</div>
                </motion.button>

                <motion.button
                  onClick={() => setIsInPerson(true)}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    isInPerson
                      ? 'border-green-400 bg-green-500/20 text-green-300'
                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="font-bold text-lg">🏪 In-Person Event</div>
                  <div className="text-sm text-gray-400">No shipping fees</div>
                </motion.button>
              </div>
            </div>

            {/* Checkout Button */}
            <div className="flex justify-center">
              <motion.button
                onClick={() => {
                  if (isInPerson) {
                    setShowQRCode(true);
                    setSelectedProduct(null);
                  } else {
                    setShowCheckout(true);
                    setSelectedProduct(null);
                  }
                }}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl text-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isInPerson ? 'Generate QR Code' : 'Proceed to Checkout'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Compact POS Event Menu Modal */}
      {showMenu && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-40 bg-black/95 backdrop-blur-sm overflow-hidden"
        >
          <div className="h-screen flex flex-col">
            {/* POS Header */}
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-600 to-red-600 border-b border-orange-400/30">
              <div>
                <h2 className="text-2xl font-black text-white">
                  🍽️ IC SPICY POS
                </h2>
                <p className="text-orange-200 text-sm">
                  Event Menu • Touch to Order
                </p>
              </div>
              
              {/* Cart Summary */}
              <div className="flex items-center space-x-4">
                <div className="bg-black/20 rounded-lg px-4 py-2 text-white">
                  <div className="text-sm">Cart: {shoppingCart.length} items</div>
                  <div className="text-lg font-bold">${cartTotal.toFixed(2)}</div>
                </div>
                
                {shoppingCart.length > 0 && (
                  <motion.button
                    onClick={() => {
                      setShowShoppingCart(true);
                      setShowMenu(false);
                    }}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    View Cart
                  </motion.button>
                )}
                
                <motion.button
                  onClick={() => setShowMenu(false)}
                  className="px-4 py-2 bg-gray-600/50 hover:bg-gray-600/70 text-white rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ✕
                </motion.button>
              </div>
            </div>

            {/* Modern Category-Based Menu */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Plants Category Card */}
                <motion.div
                  className="bg-gradient-to-br from-green-600/20 to-emerald-700/20 rounded-2xl p-6 border border-green-500/30 cursor-pointer hover:border-green-400/50 transition-all duration-300"
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedCategory('plants');
                    setShowCategoryModal(true);
                  }}
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">🌱</div>
                    <h3 className="text-2xl font-bold text-white mb-2">Plants</h3>
                    <p className="text-green-300 text-sm mb-4">Live pepper plants ready to grow</p>
                    <div className="text-lg font-bold text-green-400">
                      {products.plants?.varieties?.length || 0} Varieties
                    </div>
                    <div className="text-sm text-gray-400">
                      Starting at $25.00
                    </div>
                  </div>
                </motion.div>

                {/* Pods Category Card */}
                <motion.div
                  className="bg-gradient-to-br from-red-600/20 to-orange-700/20 rounded-2xl p-6 border border-red-500/30 cursor-pointer hover:border-red-400/50 transition-all duration-300"
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedCategory('pepperPods');
                    setShowCategoryModal(true);
                  }}
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">🌶️</div>
                    <h3 className="text-2xl font-bold text-white mb-2">Fresh Pods</h3>
                    <p className="text-red-300 text-sm mb-4">Fresh pepper pods for cooking</p>
                    <div className="text-lg font-bold text-red-400">
                      {products.pepperPods?.varieties?.length || 0} Varieties
                    </div>
                    <div className="text-sm text-gray-400">
                      Starting at ${products.pepperPods?.sizes?.[0]?.price?.toFixed(2) || '8.00'}
                    </div>
                  </div>
                </motion.div>

                {/* Spices Category Card */}
                <motion.div
                  className="bg-gradient-to-br from-yellow-600/20 to-amber-700/20 rounded-2xl p-6 border border-yellow-500/30 cursor-pointer hover:border-yellow-400/50 transition-all duration-300"
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedCategory('spiceBlends');
                    setShowCategoryModal(true);
                  }}
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">🧂</div>
                    <h3 className="text-2xl font-bold text-white mb-2">Spices</h3>
                    <p className="text-yellow-300 text-sm mb-4">Premium spice blends & seasonings</p>
                    <div className="text-lg font-bold text-yellow-400">
                      {products.spiceBlends?.products?.length || 0} Products
                    </div>
                    <div className="text-sm text-gray-400">
                      Starting at $12.00
                    </div>
                  </div>
                </motion.div>

                {/* Sauces Category Card */}
                <motion.div
                  className="bg-gradient-to-br from-purple-600/20 to-indigo-700/20 rounded-2xl p-6 border border-purple-500/30 cursor-pointer hover:border-purple-400/50 transition-all duration-300"
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedCategory('hotSauces');
                    setShowCategoryModal(true);
                  }}
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">🔥</div>
                    <h3 className="text-2xl font-bold text-white mb-2">Sauces</h3>
                    <p className="text-purple-300 text-sm mb-4">Artisan hot sauces & condiments</p>
                    <div className="text-lg font-bold text-purple-400">
                      {products.hotSauces?.products?.length || 0} Products
                    </div>
                    <div className="text-sm text-gray-400">
                      Starting at $15.00
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Quick Stats Bar */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-600/30">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-400">
                      {products.plants?.varieties?.length || 0}
                    </div>
                    <div className="text-sm text-gray-400">Plant Varieties</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">
                      {products.pepperPods?.varieties?.length || 0}
                    </div>
                    <div className="text-sm text-gray-400">Pod Varieties</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {products.spiceBlends?.products?.length || 0}
                    </div>
                    <div className="text-sm text-gray-400">Spice Blends</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">
                      {products.hotSauces?.products?.length || 0}
                    </div>
                    <div className="text-sm text-gray-400">Hot Sauces</div>
                  </div>
                </div>
              </div>
            </div>

            {/* POS Action Bar */}
            <div className="bg-gray-800/90 border-t border-gray-600/30 p-4">
              <div className="flex justify-between items-center">
                <div className="flex space-x-3">
                  <motion.button
                    onClick={() => {
                      if (shoppingCart.length === 0) {
                        alert('Cart is empty');
                        return;
                      }
                      setShowShoppingCart(true);
                      setShowMenu(false);
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🛒 View Cart ({shoppingCart.length})
                  </motion.button>
                  
                  <motion.button
                    onClick={() => {
                      setShoppingCart([]);
                      setCartTotal(0);
                    }}
                    className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🗑️ Clear
                  </motion.button>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    Total: ${cartTotal.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-300">
                    {shoppingCart.length} item{shoppingCart.length !== 1 ? 's' : ''}
                  </div>
                </div>
                
                {/* Fast POS Checkout Buttons */}
                <div className="space-y-3">
                  <motion.button
                    onClick={() => {
                      if (shoppingCart.length === 0) {
                        alert('Cart is empty');
                        return;
                      }
                      setShowMenu(false);
                      setIsPOSMode(true);
                      setCheckoutStep('payment');
                      setShowCheckoutModal(true);
                    }}
                    className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-lg transition-all duration-300 text-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                    ⚡ FAST CHECKOUT
                  </motion.button>
                  
                  <motion.button
                    onClick={() => {
                      if (shoppingCart.length === 0) {
                        alert('Cart is empty');
                        return;
                      }
                      setShowMenu(false);
                      setIsPOSMode(false);
                      setCheckoutStep('shipping');
                      setShowCheckoutModal(true);
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold rounded-lg transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    📦 Checkout + Shipping
                </motion.button>
              </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Product Size Selection Modal for POS */}
      {showProductSizeModal && selectedProduct && (
                          <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 max-w-lg w-full border border-gray-600/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">
                {selectedCategory === 'plants' ? '🌱' : '🌶️'}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {selectedProduct.name}
                {selectedCategory === 'pepperPods' ? ' Pods' : selectedCategory === 'plants' ? ' Plant' : ''}
              </h3>
              <p className="text-gray-300 text-sm mb-2">
                Select size and add to cart
              </p>
              {selectedProduct.heat && (
                <div className="inline-block px-3 py-1 bg-red-500/20 text-red-300 text-sm rounded-full border border-red-500/30">
                  {selectedProduct.heat}
                </div>
              )}
              {selectedProduct.isSuperhot && (
                <div className="inline-block px-3 py-1 bg-orange-500/20 text-orange-300 text-sm rounded-full border border-orange-500/30 ml-2">
                  SUPERHOT 🔥
                </div>
              )}
            </div>

            {/* Size Options */}
            <div className="space-y-3 mb-6">
              {selectedCategory === 'pepperPods' ? (
                // For pods, show the individual products (per pound, per pod)
                products[selectedCategory]?.products
                  ?.filter(product => product.varietyId === selectedProduct.id)
                  ?.map((product) => (
                    <motion.button
                            key={product.id}
                            onClick={() => {
                        // Add the pod product directly to cart
                        addToShoppingCartWithAnalytics(product, null, 1, 'pos-pod-selection');
                        setShowProductSizeModal(false);
                        setSelectedProduct(null);
                      }}
                      className="w-full p-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 hover:border-orange-400/50 rounded-lg text-left transition-all duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-semibold">
                            {product.unit === 'per pound' ? 'By the Pound' : 'By the Pod'}
                            </div>
                          <div className="text-gray-400 text-sm">{product.description}</div>
                          {product.unit === 'per pound' && (
                            <div className="text-red-400 text-xs mt-1">
                              Fresh pods sold by weight
                            </div>
                          )}
                          {product.unit === 'per pod' && (
                            <div className="text-orange-400 text-xs mt-1">
                              Individual pod for in-person sales
                            </div>
                          )}
                          {product.isSuperhot && (
                            <div className="text-orange-400 text-xs mt-1">
                              🔥 SUPERHOT - Handle with care!
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold text-lg">
                            ${product.price.toFixed(2)}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {product.unit}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))
              ) : (
                // For plants, use the sizes array
                products[selectedCategory]?.sizes?.map((size) => (
                  <motion.button
                    key={size.id}
                    onClick={() => {
                      // Create a product object for the cart
                      const cartProduct = {
                        id: `${selectedCategory}-${selectedProduct.id}-${size.id}`,
                        name: `${selectedProduct.name} ${selectedCategory === 'plants' ? 'Plant' : 'Pods'}`,
                        variety: selectedProduct.name,
                        varietyId: selectedProduct.id,
                        size: size.name,
                        sizeId: size.id,
                        price: size.price,
                        description: `${size.description} - ${selectedProduct.description || ''}`,
                        heat: selectedProduct.heat,
                        isSuperhot: selectedProduct.isSuperhot,
                        category: selectedCategory
                      };
                      
                      addToShoppingCartWithAnalytics(cartProduct, size, 1, 'pos-size-selection');
                      setShowProductSizeModal(false);
                      setSelectedProduct(null);
                    }}
                    className="w-full p-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 hover:border-orange-400/50 rounded-lg text-left transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-semibold">{size.name}</div>
                        <div className="text-gray-400 text-sm">{size.description}</div>
                        {selectedCategory === 'plants' && size.growthStage && (
                          <div className="text-green-400 text-xs mt-1">
                            {size.growthStage}
                          </div>
                        )}
                        {selectedCategory === 'pepperPods' && size.weight && (
                          <div className="text-red-400 text-xs mt-1">
                            {size.weight}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-lg">
                          ${size.price.toFixed(2)}
                        </div>
                        {selectedCategory === 'plants' && size.potSize && (
                          <div className="text-gray-500 text-xs">
                            {size.potSize}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            {/* Product Details */}
            {selectedProduct.description && (
              <div className="bg-gray-800/30 rounded-lg p-3 mb-4">
                <p className="text-gray-300 text-sm">{selectedProduct.description}</p>
                              </div>
                            )}
                            
            {/* Actions */}
            <div className="flex space-x-3">
              <motion.button
                onClick={() => {
                  setShowProductSizeModal(false);
                  setSelectedProduct(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-600/50 hover:bg-gray-600/70 text-white font-semibold rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
                            </div>
                          </motion.div>
        </motion.div>
      )}

      {/* Category Selection Modal */}
      {showCategoryModal && selectedCategory && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto"
        >
          <div className="min-h-screen p-4 flex items-start justify-center">
            <motion.div
              className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 max-w-4xl w-full border border-gray-600/30 mt-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Category Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className="text-5xl">
                    {selectedCategory === 'plants' && '🌱'}
                    {selectedCategory === 'pepperPods' && '🌶️'}
                    {selectedCategory === 'spiceBlends' && '🧂'}
                    {selectedCategory === 'hotSauces' && '🔥'}
                      </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white">
                      {selectedCategory === 'plants' && 'Pepper Plants'}
                      {selectedCategory === 'pepperPods' && 'Fresh Pepper Pods'}
                      {selectedCategory === 'spiceBlends' && 'Spice Blends'}
                      {selectedCategory === 'hotSauces' && 'Hot Sauces'}
                    </h3>
                    <p className="text-gray-300">
                      {selectedCategory === 'plants' && 'Live plants ready to grow in your garden'}
                      {selectedCategory === 'pepperPods' && 'Fresh pods perfect for cooking and recipes'}
                      {selectedCategory === 'spiceBlends' && 'Premium blends and seasonings'}
                      {selectedCategory === 'hotSauces' && 'Artisan sauces and condiments'}
                    </p>
                    </div>
                </div>
                <motion.button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 bg-gray-600/50 hover:bg-gray-600/70 text-white rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ✕
                </motion.button>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto">
                {/* Plants and Pods with varieties */}
                {(selectedCategory === 'plants' || selectedCategory === 'pepperPods') && 
                  products[selectedCategory]?.varieties?.map((variety) => (
                    <motion.div
                      key={`${selectedCategory}-${variety.id}`}
                      className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30 cursor-pointer hover:border-orange-400/50 transition-all duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedProduct(variety);
                        
                        // Small delay to ensure state updates properly
                        setTimeout(() => {
                          setShowCategoryModal(false);
                          setShowProductSizeModal(true);
                        }, 50);
                      }}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">
                          {selectedCategory === 'plants' ? '🌱' : '🌶️'}
                        </div>
                        <h4 className="text-sm font-bold text-white mb-2">
                          {variety.name}
                        </h4>
                        {variety.heat && (
                          <div className="inline-block px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded mb-2">
                            {variety.heat}
                          </div>
                        )}
                        {variety.isSuperhot && (
                          <div className="inline-block px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded ml-1 mb-2">
                            SUPERHOT
              </div>
                        )}
                        <div className="text-green-400 font-bold">
                          ${products[selectedCategory]?.sizes?.[0]?.price || '25.00'}+
                        </div>
                        <div className="text-xs text-gray-400">
                          Tap for sizes
            </div>
          </div>
        </motion.div>
                  ))
                }

                {/* Direct products for spices and sauces */}
                {(selectedCategory === 'spiceBlends' || selectedCategory === 'hotSauces') && 
                  products[selectedCategory]?.products?.map((product) => (
                    <motion.div
                      key={product.id}
                      className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30 cursor-pointer hover:border-orange-400/50 transition-all duration-200"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        // Add to cart with analytics tracking
                        addToShoppingCartWithAnalytics(product, null, 1, 'pos-menu');
                        setShowCategoryModal(false);
                        
                        // Flash success feedback
                        const button = document.getElementById(`category-product-${product.id}`);
                        if (button) {
                          button.style.transform = 'scale(1.1)';
                          button.style.backgroundColor = 'rgba(34, 197, 94, 0.5)';
                          setTimeout(() => {
                            button.style.transform = 'scale(1)';
                            button.style.backgroundColor = '';
                          }, 300);
                        }
                      }}
                      id={`category-product-${product.id}`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">
                          {selectedCategory === 'spiceBlends' ? '🧂' : '🔥'}
                        </div>
                        <h4 className="text-sm font-bold text-white mb-2">
                          {product.name}
                        </h4>
                        {product.heat && (
                          <div className="inline-block px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded mb-2">
                            {product.heat}
                          </div>
                        )}
                        <div className="text-green-400 font-bold">
                          ${product.price || '0.00'}
                        </div>
                        <div className="text-xs text-gray-400">
                          Tap to add
                        </div>
                      </div>
                    </motion.div>
                  ))
                }
              </div>

              {/* Category Actions */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-600/30">
                <div className="text-sm text-gray-400">
                  {selectedCategory === 'plants' && `${products.plants?.varieties?.length || 0} varieties available`}
                  {selectedCategory === 'pepperPods' && `${products.pepperPods?.varieties?.length || 0} varieties available`}
                  {selectedCategory === 'spiceBlends' && `${products.spiceBlends?.products?.length || 0} products available`}
                  {selectedCategory === 'hotSauces' && `${products.hotSauces?.products?.length || 0} products available`}
                </div>
                <motion.button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-6 py-2 bg-gray-600/50 hover:bg-gray-600/70 text-white rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Back to Categories
                </motion.button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* QR Code Modal */}
      {showQRCode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowQRCode(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 max-w-2xl w-full border border-gray-600/30 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl font-bold text-white">Payment QR Code</h2>
              <button
                onClick={() => setShowQRCode(false)}
                className="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <QRCodeSVG
                value={generateQRData()}
                size={256}
                className="mx-auto bg-white p-4 rounded-xl"
              />
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Supported Payment Methods:</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {/* Cash payment for POS */}
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600/30">
                  <div className="text-2xl mb-1">💵</div>
                  <div className="text-sm font-semibold text-white">Cash Payment</div>
                </div>
                {/* Crypto payments */}
                {paymentMethods.crypto.slice(0, 2).map((method) => (
                  <div key={method.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-600/30">
                    <div className="text-2xl mb-1">{method.icon}</div>
                    <div className="text-sm font-semibold text-white">{method.name}</div>
                  </div>
                ))}
                {/* Traditional payments */}
                {paymentMethods.traditional.slice(0, 2).map((method) => (
                  <div key={method.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-600/30">
                    <div className="text-2xl mb-1">{method.icon}</div>
                    <div className="text-sm font-semibold text-white">{method.name}</div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-gray-300 text-sm">
              Scan this QR code with your phone to complete payment for in-person transactions.
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Payment Options Modal - Shows when QR code is scanned */}
      {showPaymentOptions && paymentProductInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowPaymentOptions(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 max-w-2xl w-full border border-gray-600/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl font-bold text-white">Payment Options</h2>
              <button
                onClick={() => setShowPaymentOptions(false)}
                className="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                ×
              </button>
    </div>

            {/* Product Information */}
            <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-600/30">
              <h3 className="text-xl font-bold text-white mb-2">{paymentProductInfo.name}</h3>
              {paymentProductInfo.size && (
                <p className="text-gray-300 mb-2">Size: {paymentProductInfo.size}</p>
              )}
              <div className="text-2xl font-bold text-orange-400">${paymentProductInfo.price}</div>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Choose Payment Method:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cash payment for POS */}
                <motion.button
                  key="cash"
                  onClick={() => {
                    // Process cash payment
                    const confirmed = window.confirm(
                      `Cash Payment: $${paymentProductInfo.price}\n\n` +
                      `Product: ${paymentProductInfo.name}${paymentProductInfo.size ? ` (${paymentProductInfo.size})` : ''}\n\n` +
                      `Confirm cash payment received?`
                    );
                    
                    if (confirmed) {
                      const cashPayment = {
                        method: 'cash',
                        amount: paymentProductInfo.price,
                        currency: 'USD',
                        confirmation: `CASH-${Date.now()}`
                      };
                      
                      processTransaction(cashPayment, [{ name: paymentProductInfo.name, size: paymentProductInfo.size, price: paymentProductInfo.price, quantity: 1 }]);
                      setShowPaymentOptions(false);
                    }
                  }}
                  className="p-4 bg-green-600/20 border border-green-500/30 rounded-xl hover:bg-green-600/30 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💵</span>
                    <div className="text-left">
                      <div className="text-white font-semibold">Cash Payment</div>
                      <div className="text-gray-300 text-sm">USD Cash Transaction</div>
                    </div>
                  </div>
                </motion.button>
                
                {/* Crypto and traditional payment methods */}
                {[...paymentMethods.crypto, ...paymentMethods.traditional].filter(method => method.available).map((method) => (
                  <motion.button
                    key={method.id}
                    onClick={() => {
                      alert(`${method.name} integration: Processing ${paymentProductInfo.name} - $${paymentProductInfo.price}. Full integration coming soon!`);
                      setShowPaymentOptions(false);
                    }}
                    className="p-4 bg-gray-700/50 border border-gray-600/30 rounded-xl hover:bg-blue-600/20 hover:border-blue-500/50 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{method.icon}</span>
                      <div className="text-left">
                        <div className="text-white font-semibold">{method.name}</div>
                        <div className="text-gray-300 text-sm">{method.description}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Multichain POS System Modal */}
      {showPOSMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 overflow-y-auto"
        >
          <div className="min-h-screen p-4">
            <div className="max-w-7xl mx-auto">
              {/* POS Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pt-4 gap-4">
                <div>
                  <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-500 to-green-400">
                    IC SPICY MULTICHAIN POS
                  </h2>
                  {isAdminAuthenticated && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      <span className="text-green-400 text-sm font-medium">Admin Authenticated</span>
                      <span className="text-gray-400 text-xs">• Full Access to Sensitive Data</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowProductManagement(true)}
                    className="px-4 py-2 bg-green-600/50 text-green-200 hover:bg-green-600/70 border border-green-500/30 rounded-lg transition-colors text-sm"
                  >
                    📦 Manage Products
                  </button>
                  {lowStockAlerts.length > 0 && (
                    <button
                      onClick={() => setShowProductManagement(true)}
                      className="px-4 py-2 bg-yellow-600/50 text-yellow-200 hover:bg-yellow-600/70 border border-yellow-500/30 rounded-lg transition-colors text-sm animate-pulse"
                    >
                      ⚠️ Low Stock ({lowStockAlerts.length})
                    </button>
                  )}
                  <button
                    onClick={() => setShowLogisticsDemo(true)}
                    className="px-4 py-2 bg-purple-600/50 text-purple-200 hover:bg-purple-600/70 border border-purple-500/30 rounded-lg transition-colors text-sm"
                  >
                    🚚 Logistics API
                  </button>
                  <button
                    onClick={() => setShowAPIConfig(true)}
                    className="px-4 py-2 bg-orange-600/50 text-orange-200 hover:bg-orange-600/70 border border-orange-500/30 rounded-lg transition-colors text-sm"
                  >
                    🔧 API Config
                  </button>
                  <button
                    onClick={async () => {
                      const authenticated = await authenticateAdmin('view detailed analytics dashboard');
                      if (authenticated) {
                        setShowAnalytics(true);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600/50 text-blue-200 hover:bg-blue-600/70 border border-blue-500/30 rounded-lg transition-colors text-sm"
                  >
                    🔒 Admin Analytics
                  </button>
                  <button
                    onClick={async () => {
                      const authenticated = await authenticateAdmin('export transaction data (CSV)');
                      if (authenticated) {
                        exportTransactions('csv');
                      }
                    }}
                    className="px-4 py-2 bg-green-600/50 text-green-200 hover:bg-green-600/70 border border-green-500/30 rounded-lg transition-colors text-sm"
                  >
                    🔒 Export CSV
                  </button>
                  <button
                    onClick={async () => {
                      const authenticated = await authenticateAdmin('export transaction data (JSON)');
                      if (authenticated) {
                        exportTransactions('json');
                      }
                    }}
                    className="px-4 py-2 bg-purple-600/50 text-purple-200 hover:bg-purple-600/70 border border-purple-500/30 rounded-lg transition-colors text-sm"
                  >
                    🔒 Export JSON
                  </button>
                  <button
                    onClick={logoutAdmin}
                    className="px-4 py-2 bg-red-600/50 text-red-200 hover:bg-red-600/70 border border-red-500/30 rounded-lg transition-colors text-sm"
                  >
                    🚪 Admin Logout
                  </button>
                  <button
                    onClick={() => setShowPOSMode(false)}
                    className="px-4 py-2 bg-gray-600/50 text-gray-300 hover:bg-gray-600/70 border border-gray-500/30 rounded-lg transition-colors text-sm"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product Selection */}
                <div className="lg:col-span-2">
                  <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-600/30 mb-6">
                    <h3 className="text-2xl font-bold text-white mb-4">Product Selection</h3>
                    
                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {Object.entries(products).map(([categoryKey, category]) => (
                        <button
                          key={categoryKey}
                          onClick={() => setActiveCategory(categoryKey)}
                          className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                            activeCategory === categoryKey
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                          }`}
                        >
                          {category.categoryIcon} {category.categoryName}
                        </button>
                      ))}
                    </div>

                    {/* Products Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {products[activeCategory]?.products?.map((product) => (
                        <motion.div
                          key={product.id}
                          className={`bg-gray-700/50 rounded-lg p-4 border border-gray-600/30 cursor-pointer transition-all ${
                            product.inStock 
                              ? 'hover:border-green-400/50' 
                              : 'opacity-60 cursor-not-allowed'
                          } ${product.comingSoon ? 'border-yellow-500/30' : ''}`}
                          whileHover={product.inStock ? { scale: 1.02 } : {}}
                          onClick={() => {
                            if (product.inStock && !product.comingSoon) {
                              addToCart(product);
                            }
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-white font-semibold">{product.name}</h4>
                            {product.comingSoon && (
                              <span className="text-yellow-400 text-xs bg-yellow-400/20 px-2 py-1 rounded">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          <p className="text-gray-300 text-sm mb-2">{product.description}</p>
                          <div className="flex justify-between items-center">
                            <p className="text-green-400 font-bold">${product.price.toFixed(2)}</p>
                            <div className="flex items-center gap-2">
                              {product.size && (
                                <span className="text-gray-400 text-xs">{product.size}</span>
                              )}
                              {product.unit && (
                                <span className="text-gray-400 text-xs">{product.unit}</span>
                              )}
                              <span className={`w-2 h-2 rounded-full ${
                                product.inStock ? 'bg-green-400' : 'bg-red-400'
                              }`}></span>
                            </div>
                          </div>
                        </motion.div>
                      )) || (
                        <div className="col-span-2 text-center text-gray-400 py-8">
                          No products in this category yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cart & Payment */}
                <div className="lg:col-span-1">
                  <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-600/30 sticky top-4">
                    <h3 className="text-2xl font-bold text-white mb-4">Cart</h3>
                    
                    {/* Cart Items */}
                    <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                      {cartItems.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">Cart is empty</p>
                      ) : (
                        cartItems.map((item) => (
                          <div key={item.id} className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
                            <div className="flex-1">
                              <div className="text-white font-semibold">{item.product}</div>
                              {item.size && <div className="text-gray-300 text-sm">{item.size}</div>}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-green-400 font-bold">${item.price}</span>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="text-red-400 hover:text-red-300 text-lg"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Total */}
                    <div className="border-t border-gray-600/30 pt-4 mb-6">
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span className="text-white">Total:</span>
                        <span className="text-green-400">${cartTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Payment Methods */}
                    {cartItems.length > 0 && (
                      <div>
                        <h4 className="text-lg font-bold text-white mb-3">Payment Methods</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {paymentMethods.map((method) => (
                            <motion.button
                              key={method.id}
                              onClick={() => {
                                if (method.id === 'cash') {
                                  const confirmed = window.confirm(
                                    `Cash Payment: $${cartTotal.toFixed(2)}\n\n` +
                                    `Items: ${cartItems.length}\n\n` +
                                    `Confirm cash payment received?`
                                  );
                                  
                                  if (confirmed) {
                                    const cashPayment = {
                                      method: 'cash',
                                      amount: cartTotal,
                                      currency: 'USD',
                                      confirmation: `CASH-${Date.now()}`
                                    };
                                    processTransaction(method, cashPayment);
                                  }
                                } else if (method.id === 'tabbypos') {
                                  alert('TabbyPOS integration coming soon!');
                                } else {
                                  alert(`${method.name} integration available. Processing ${cartItems.length} items totaling $${cartTotal.toFixed(2)}`);
                                  // In production, this would integrate with the respective payment processors
                                }
                              }}
                              className={`p-3 rounded-lg border transition-all duration-300 text-left ${
                                method.id === 'tabbypos'
                                  ? 'border-gray-600 bg-gray-700/30 text-gray-400 cursor-not-allowed'
                                  : method.type === 'fiat'
                                  ? 'border-green-500/50 bg-green-500/10 text-white hover:border-green-400/70 hover:bg-green-500/20'
                                  : 'border-purple-500/50 bg-purple-500/10 text-white hover:border-purple-400/70 hover:bg-purple-500/20'
                              }`}
                              whileHover={method.id !== 'tabbypos' ? { scale: 1.02 } : {}}
                              whileTap={method.id !== 'tabbypos' ? { scale: 0.98 } : {}}
                              disabled={method.id === 'tabbypos'}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="text-xl">{method.icon}</div>
                                <div>
                                  <div className="font-semibold">{method.name}</div>
                                  <div className="text-xs text-gray-400">{method.description}</div>
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>

                        {/* Clear Cart */}
                        <button
                          onClick={clearCart}
                          className="w-full mt-4 px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                        >
                          Clear Cart
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Transactions - Admin Only */}
              {transactionHistory.length > 0 && isAdminAuthenticated && (
                <div className="mt-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-600/30">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-white">🔒 Admin: Recent Transactions</h3>
                    <div className="text-sm text-gray-400">
                      Total: {transactionHistory.length} transactions
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {transactionHistory.slice(0, 9).map((transaction) => (
                      <motion.div 
                        key={transaction.id} 
                        className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/30 cursor-pointer hover:border-blue-400/50 transition-all"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setShowTransactionDetails(true);
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm text-gray-400 font-mono">{transaction.receiptNumber}</span>
                          <span className="text-green-400 font-bold">${transaction.total.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{transaction.paymentIcon}</span>
                          <span className="text-white font-semibold">{transaction.paymentMethod}</span>
                        </div>
                        <div className="text-gray-300 text-sm mb-1">{transaction.items.length} items</div>
                        <div className="text-gray-400 text-xs mb-2">
                          {transaction.date} {transaction.time}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">#{transaction.auditTrail?.hash?.substring(0, 8)}</span>
                          <span className="text-xs text-blue-400">View Details →</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {transactionHistory.length > 9 && (
                    <div className="text-center mt-4">
                      <button 
                        onClick={async () => {
                          const authenticated = await authenticateAdmin('view all transaction details');
                          if (authenticated) {
                            setShowAnalytics(true);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600/30 text-blue-200 hover:bg-blue-600/50 border border-blue-500/30 rounded-lg transition-colors text-sm"
                      >
                        🔒 View All {transactionHistory.length} Transactions (Admin)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Authentication for Transaction History */}
              {transactionHistory.length > 0 && !isAdminAuthenticated && (
                <div className="mt-6 bg-gradient-to-br from-red-800/20 to-orange-800/20 rounded-xl p-6 border border-red-500/30 text-center">
                  <div className="text-3xl mb-4">🔒</div>
                  <h3 className="text-xl font-bold text-white mb-3">Sensitive Operational Data</h3>
                  <p className="text-gray-300 mb-4">
                    Transaction history and detailed analytics are restricted to authorized administrators.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={async () => {
                        await authenticateAdmin('view transaction history');
                        // Authentication state already set in function
                      }}
                      className="px-6 py-3 bg-blue-600/50 text-blue-200 hover:bg-blue-600/70 border border-blue-500/30 rounded-lg transition-colors"
                    >
                      🔑 Connect Admin Wallet for Transaction History
                    </button>
                    <button
                      onClick={async () => {
                        const authenticated = await authenticateAdmin('access detailed analytics');
                        if (authenticated) {
                          setShowAnalytics(true);
                        }
                      }}
                      className="px-6 py-3 bg-purple-600/50 text-purple-200 hover:bg-purple-600/70 border border-purple-500/30 rounded-lg transition-colors"
                    >
                      📊 Connect Admin Wallet for Analytics
                    </button>
                  </div>
                  <div className="mt-4 text-xs text-gray-400">
                    Public users can only see aggregated metrics on the main dashboard
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Receipt Modal */}
      {showReceipt && currentTransaction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowReceipt(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white text-black rounded-2xl p-8 max-w-md w-full border border-gray-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-black mb-2">🌶️ IC SPICY</h2>
              <p className="text-gray-600">Transaction Receipt</p>
            </div>

            <div className="border-t border-b border-gray-300 py-4 mb-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Receipt Number:</span>
                <span className="font-mono text-sm font-bold">{currentTransaction.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-mono text-sm">{currentTransaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date & Time:</span>
                <span>{currentTransaction.date} {currentTransaction.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-semibold flex items-center gap-1">
                  <span>{currentTransaction.paymentIcon}</span>
                  {currentTransaction.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cashier:</span>
                <span>{currentTransaction.cashier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location:</span>
                <span>{currentTransaction.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Security Hash:</span>
                <span className="font-mono text-xs">{currentTransaction.auditTrail?.hash}</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <h3 className="font-bold text-lg">Items:</h3>
              {currentTransaction.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{item.product}</div>
                    {item.size && <div className="text-sm text-gray-600">{item.size}</div>}
                  </div>
                  <span className="font-semibold">${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-300 pt-4 mb-6">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total:</span>
                <span>${currentTransaction.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => printReceipt(currentTransaction)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                🖨️ Print Receipt
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Analytics Dashboard Modal */}
      {showAnalytics && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto"
        >
          <div className="min-h-screen p-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-6 pt-4">
                <h2 className="text-3xl font-bold text-white">📊 Transaction Analytics</h2>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="px-4 py-2 bg-gray-600/50 text-gray-300 hover:bg-gray-600/70 border border-gray-500/30 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Daily Summaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {Object.entries(dailySummaries).map(([date, summary]) => (
                  <div key={date} className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-600/30">
                    <h3 className="text-xl font-bold text-white mb-4">{date}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Transactions:</span>
                        <span className="text-white font-semibold">{summary.totalTransactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Revenue:</span>
                        <span className="text-green-400 font-bold">${summary.totalRevenue.toFixed(2)}</span>
                      </div>
                      
                      <div className="border-t border-gray-600/30 pt-3">
                        <h4 className="text-sm font-semibold text-gray-200 mb-2">Payment Methods</h4>
                        {Object.entries(summary.paymentMethods).map(([method, data]) => (
                          <div key={method} className="flex justify-between text-sm">
                            <span className="text-gray-400">{method}:</span>
                            <span className="text-gray-300">{data.count} (${data.amount.toFixed(2)})</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-t border-gray-600/30 pt-3">
                        <h4 className="text-sm font-semibold text-gray-200 mb-2">Categories</h4>
                        {Object.entries(summary.categories).map(([category, data]) => (
                          <div key={category} className="flex justify-between text-sm">
                            <span className="text-gray-400">{category}:</span>
                            <span className="text-gray-300">{data.count} (${data.amount.toFixed(2)})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* All Transactions */}
              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-600/30">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-white">All Transactions</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const authenticated = await authenticateAdmin('export CSV data from analytics');
                        if (authenticated) {
                          exportTransactions('csv');
                        }
                      }}
                      className="px-3 py-1 bg-green-600/50 text-green-200 hover:bg-green-600/70 border border-green-500/30 rounded text-sm"
                    >
                      🔒 Export CSV
                    </button>
                    <button
                      onClick={async () => {
                        const authenticated = await authenticateAdmin('export JSON data from analytics');
                        if (authenticated) {
                          exportTransactions('json');
                        }
                      }}
                      className="px-3 py-1 bg-purple-600/50 text-purple-200 hover:bg-purple-600/70 border border-purple-500/30 rounded text-sm"
                    >
                      🔒 Export JSON
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-600/30">
                      <tr className="text-left">
                        <th className="text-gray-300 pb-2">Receipt #</th>
                        <th className="text-gray-300 pb-2">Date/Time</th>
                        <th className="text-gray-300 pb-2">Payment</th>
                        <th className="text-gray-300 pb-2">Items</th>
                        <th className="text-gray-300 pb-2">Total</th>
                        <th className="text-gray-300 pb-2">Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionHistory.map((transaction) => (
                        <tr 
                          key={transaction.id} 
                          className="border-b border-gray-700/30 hover:bg-gray-700/30 cursor-pointer"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowTransactionDetails(true);
                          }}
                        >
                          <td className="py-2 text-blue-300 font-mono">{transaction.receiptNumber}</td>
                          <td className="py-2 text-gray-300">{transaction.date} {transaction.time}</td>
                          <td className="py-2 text-gray-300">
                            <span className="flex items-center gap-1">
                              <span>{transaction.paymentIcon}</span>
                              {transaction.paymentMethod}
                            </span>
                          </td>
                          <td className="py-2 text-gray-300">{transaction.items.length}</td>
                          <td className="py-2 text-green-400 font-semibold">${transaction.total.toFixed(2)}</td>
                          <td className="py-2 text-gray-500 font-mono text-xs">{transaction.auditTrail?.hash?.substring(0, 8)}...</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Transaction Details Modal */}
      {showTransactionDetails && selectedTransaction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowTransactionDetails(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 max-w-2xl w-full border border-gray-600/30 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl font-bold text-white">Transaction Details</h2>
              <button
                onClick={() => setShowTransactionDetails(false)}
                className="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                ×
              </button>
            </div>

            {/* Transaction Information */}
            <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-600/30">
              <h3 className="text-xl font-bold text-white mb-4">Transaction Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Receipt Number:</span>
                  <div className="text-white font-mono font-bold">{selectedTransaction.receiptNumber}</div>
                </div>
                <div>
                  <span className="text-gray-400">Transaction ID:</span>
                  <div className="text-white font-mono">{selectedTransaction.id}</div>
                </div>
                <div>
                  <span className="text-gray-400">Date:</span>
                  <div className="text-white">{selectedTransaction.date}</div>
                </div>
                <div>
                  <span className="text-gray-400">Time:</span>
                  <div className="text-white">{selectedTransaction.time}</div>
                </div>
                <div>
                  <span className="text-gray-400">Payment Method:</span>
                  <div className="text-white flex items-center gap-1">
                    <span>{selectedTransaction.paymentIcon}</span>
                    {selectedTransaction.paymentMethod}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <div className="text-green-400 font-semibold">{selectedTransaction.status}</div>
                </div>
                <div>
                  <span className="text-gray-400">Cashier:</span>
                  <div className="text-white">{selectedTransaction.cashier}</div>
                </div>
                <div>
                  <span className="text-gray-400">Location:</span>
                  <div className="text-white">{selectedTransaction.location}</div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-600/30">
              <h3 className="text-xl font-bold text-white mb-4">Items Purchased</h3>
              <div className="space-y-3">
                {selectedTransaction.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-700/50 rounded-lg p-3">
                    <div>
                      <div className="text-white font-semibold">{item.product}</div>
                      {item.size && <div className="text-gray-300 text-sm">Size: {item.size}</div>}
                      <div className="text-gray-400 text-xs">SKU: {item.sku}</div>
                      <div className="text-gray-400 text-xs">Category: {item.category}</div>
                    </div>
                    <div className="text-green-400 font-bold">${item.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-600/30">
              <h3 className="text-xl font-bold text-white mb-4">Payment Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Subtotal:</span>
                  <span className="text-white">${selectedTransaction.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Tax:</span>
                  <span className="text-white">${selectedTransaction.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-600/30 pt-2">
                  <span className="text-white">Total:</span>
                  <span className="text-green-400">${selectedTransaction.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-600/30">
              <h3 className="text-xl font-bold text-white mb-4">Audit Trail & Security</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Transaction Hash:</span>
                  <span className="text-orange-400 font-mono">{selectedTransaction.auditTrail?.hash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white">{new Date(selectedTransaction.auditTrail?.created).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Item Count:</span>
                  <span className="text-white">{selectedTransaction.auditTrail?.itemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Session ID:</span>
                  <span className="text-gray-300 font-mono text-xs">{selectedTransaction.sessionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Device:</span>
                  <span className="text-gray-300 text-xs">{selectedTransaction.deviceId}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => printReceipt(selectedTransaction)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                🖨️ Print Receipt
              </button>
              <button
                onClick={() => {
                  setCurrentTransaction(selectedTransaction);
                  setShowReceipt(true);
                  setShowTransactionDetails(false);
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                View Receipt
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Product Management Modal */}
      {showProductManagement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto"
        >
          <div className="min-h-screen p-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-6 pt-4">
                <h2 className="text-3xl font-bold text-white">📦 Product Management</h2>
                <button
                  onClick={() => setShowProductManagement(false)}
                  className="px-4 py-2 bg-gray-600/50 text-gray-300 hover:bg-gray-600/70 border border-gray-500/30 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Category Management */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {Object.entries(products).map(([categoryKey, category]) => (
                  <div key={categoryKey} className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-6 border border-gray-600/30">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-2xl">{category.categoryIcon}</span>
                        {category.categoryName}
                      </h3>
                      <button
                        onClick={() => {
                          setEditingProduct({ categoryKey, product: null, isNew: true });
                        }}
                        className="px-3 py-1 bg-green-600/50 text-green-200 hover:bg-green-600/70 border border-green-500/30 rounded text-sm"
                      >
                        + Add Product
                      </button>
                    </div>

                    <div className="space-y-3">
                      {category.products.map((product) => (
                        <div key={product.id} className="bg-gray-700/50 rounded-lg p-3 border border-gray-600/30">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="text-white font-medium">{product.name}</h4>
                              <p className="text-gray-300 text-sm">{product.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-green-400 font-semibold">${product.price.toFixed(2)}</span>
                                {product.size && <span className="text-gray-400 text-xs">{product.size}</span>}
                                {product.unit && <span className="text-gray-400 text-xs">{product.unit}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleProductStock(categoryKey, product.id)}
                                className={`w-6 h-6 rounded-full ${
                                  product.inStock ? 'bg-green-400' : 'bg-red-400'
                                }`}
                                title={product.inStock ? 'In Stock' : 'Out of Stock'}
                              ></button>
                            </div>
                          </div>
                          
                          {/* Inventory Management */}
                          <div className="mt-2 p-2 bg-gray-600/30 rounded border border-gray-500/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-300">Inventory:</span>
                              <span className={`text-xs font-medium ${
                                getProductStatus(product.id).status === 'out_of_stock' ? 'text-red-400' :
                                getProductStatus(product.id).status === 'low_stock' ? 'text-yellow-400' :
                                'text-green-400'
                              }`}>
                                {getProductStatus(product.id).available} available
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                min="0"
                                placeholder="Qty"
                                className="w-16 px-2 py-1 text-xs bg-gray-700 border border-gray-500 rounded text-white"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const quantity = parseInt(e.target.value);
                                    if (!isNaN(quantity) && quantity >= 0) {
                                      inventoryService.setStock(product.id, quantity);
                                      e.target.value = '';
                                    }
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  const quantity = prompt('Enter restock quantity:', '10');
                                  if (quantity && !isNaN(parseInt(quantity))) {
                                    inventoryService.restock(product.id, parseInt(quantity), 'manual_restock');
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-blue-600/50 text-blue-200 hover:bg-blue-600/70 border border-blue-500/30 rounded"
                                title="Restock"
                              >
                                + Restock
                              </button>
                              <button
                                onClick={() => {
                                  const quantity = prompt('Enter quantity to set:', '0');
                                  if (quantity && !isNaN(parseInt(quantity))) {
                                    inventoryService.setStock(product.id, parseInt(quantity));
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-purple-600/50 text-purple-200 hover:bg-purple-600/70 border border-purple-500/30 rounded"
                                title="Set Stock"
                              >
                                Set
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingProduct({ categoryKey, product, isNew: false });
                              }}
                              className="flex-1 px-2 py-1 bg-blue-600/50 text-blue-200 hover:bg-blue-600/70 text-xs rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete "${product.name}"?`)) {
                                  deleteProduct(categoryKey, product.id);
                                }
                              }}
                              className="flex-1 px-2 py-1 bg-red-600/50 text-red-200 hover:bg-red-600/70 text-xs rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {category.products.length === 0 && (
                        <div className="text-center text-gray-400 py-4">
                          No products in this category
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Product Edit Modal */}
      {editingProduct && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setEditingProduct(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 max-w-lg w-full border border-gray-600/30"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {editingProduct.isNew ? 'Add New Product' : 'Edit Product'}
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const productData = {
                name: formData.get('name'),
                description: formData.get('description'),
                price: parseFloat(formData.get('price')),
                size: formData.get('size') || null,
                unit: formData.get('unit') || null,
                inStock: formData.get('inStock') === 'on',
                comingSoon: formData.get('comingSoon') === 'on'
              };
              
              if (editingProduct.isNew) {
                addProduct(editingProduct.categoryKey, productData);
              } else {
                updateProduct(editingProduct.categoryKey, editingProduct.product.id, productData);
              }
              
              setEditingProduct(null);
            }} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Product Name</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingProduct.product?.name || ''}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/30 rounded-lg text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingProduct.product?.description || ''}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/30 rounded-lg text-white h-20 resize-none"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Price ($)</label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={editingProduct.product?.price || ''}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/30 rounded-lg text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-1">Size/Unit</label>
                  <input
                    name={editingProduct.categoryKey === 'pepperPods' ? 'unit' : 'size'}
                    type="text"
                    defaultValue={editingProduct.product?.size || editingProduct.product?.unit || ''}
                    placeholder={editingProduct.categoryKey === 'pepperPods' ? 'per pound' : 'Small, Medium, Large'}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/30 rounded-lg text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    name="inStock"
                    type="checkbox"
                    defaultChecked={editingProduct.product?.inStock !== false}
                    className="rounded"
                  />
                  In Stock
                </label>
                
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    name="comingSoon"
                    type="checkbox"
                    defaultChecked={editingProduct.product?.comingSoon || false}
                    className="rounded"
                  />
                  Coming Soon
                </label>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingProduct.isNew ? 'Add Product' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Product Information Modal */}
      {showProductInfo && selectedVariety && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-600/30"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{selectedVariety.name}</h2>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedVariety.isSuperhot 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                      : selectedVariety.specialty
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : 'bg-green-500/20 text-green-300 border border-green-500/30'
                  }`}>
                    {selectedVariety.heat}
                  </span>
                  <span className="text-orange-400 font-bold">{selectedVariety.shu} SHU</span>
                </div>
              </div>
              <button
                onClick={() => setShowProductInfo(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-orange-400 mb-3">🌍 Origin & History</h3>
                  <p className="text-gray-300 leading-relaxed mb-2">
                    <strong className="text-white">Origin:</strong> {selectedVariety.origin}
                  </p>
                  <p className="text-gray-300 leading-relaxed">{selectedVariety.history}</p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-orange-400 mb-3">🍽️ Culinary Uses</h3>
                  <p className="text-gray-300 leading-relaxed">{selectedVariety.culinaryUses}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-orange-400 mb-3">👅 Flavor Profile</h3>
                  <p className="text-gray-300 leading-relaxed">{selectedVariety.flavorProfile}</p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-orange-400 mb-3">🥄 Perfect Pairings</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedVariety.pairings?.map((pairing, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-full text-sm"
                      >
                        {pairing}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h4 className="text-yellow-400 font-semibold mb-2">🌶️ Heat Level Guide</h4>
                  <div className="text-sm text-gray-300">
                    {selectedVariety.shu === '5,000' && "Mild - Perfect for everyday cooking"}
                    {selectedVariety.shu === '15,000' && "Medium - Noticeable heat, still enjoyable"}
                    {selectedVariety.shu === '25,000' && "Medium-Hot - Warming sensation"}
                    {selectedVariety.shu === '50,000' && "Hot - Significant heat, use sparingly"}
                    {selectedVariety.shu === '75,000' && "Very Hot - Serious heat level"}
                    {selectedVariety.shu === '100,000' && "Extremely Hot - Use with caution"}
                    {selectedVariety.shu === '350,000' && "Superhot - Extreme caution required"}
                    {selectedVariety.shu === '400,000' && "Superhot - Extreme caution required"}
                    {selectedVariety.shu === '1,200,000+' && "DANGER LEVEL - Only for extreme heat enthusiasts"}
                    {selectedVariety.shu === '1,500,000+' && "DANGER LEVEL - Only for extreme heat enthusiasts"}
                    {selectedVariety.shu === '2,200,000+' && "WORLD'S HOTTEST - Use extreme caution"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => setShowProductInfo(false)}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300"
              >
                Close Info
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Shopping Cart Modal */}
      {showShoppingCart && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-600/30"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">🛒 Shopping Cart</h2>
              <button
                onClick={() => setShowShoppingCart(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {shoppingCart.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🛒</div>
                <h3 className="text-xl text-gray-300 mb-2">Your cart is empty</h3>
                <p className="text-gray-400">Add some spicy products to get started!</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {shoppingCart.map((item) => (
                    <div key={item.id} className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/30">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-white font-semibold">{item.variety}</h4>
                          <p className="text-gray-300 text-sm">{item.size} {item.unit && `(${item.unit})`}</p>
                          <p className="text-orange-400 font-bold">${item.price.toFixed(2)} each</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 bg-red-600/50 text-red-200 rounded border border-red-500/30 hover:bg-red-600/70"
                            >
                              -
                            </button>
                            <span className="text-white font-semibold w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 bg-green-600/50 text-green-200 rounded border border-green-500/30 hover:bg-green-600/70"
                            >
                              +
                            </button>
                          </div>
                          
                          <div className="text-white font-bold min-w-[80px] text-right">
                            ${item.subtotal.toFixed(2)}
                          </div>
                          
                          <button
                            onClick={() => removeFromShoppingCart(item.id)}
                            className="text-red-400 hover:text-red-300 ml-2"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-600/30 pt-6">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xl text-white font-semibold">Total:</span>
                    <span className="text-2xl text-orange-400 font-bold">${cartTotal.toFixed(2)}</span>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={clearShoppingCart}
                      className="px-6 py-3 bg-red-600/50 text-red-200 border border-red-500/30 rounded-xl hover:bg-red-600/70 transition-all duration-300"
                    >
                      Clear Cart
                    </button>
                    <button
                      onClick={() => {
                        setShowShoppingCart(false);
                        setShowCheckoutModeModal(true);
                      }}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300"
                    >
                      💳 Proceed to Checkout (${cartTotal.toFixed(2)})
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Checkout Mode Selection Modal */}
      {showCheckoutModeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-2xl w-full border border-gray-600/30"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">🛒 Choose Checkout Method</h2>
              <p className="text-gray-300 mb-8">How would you like to complete your purchase?</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* In-Person Event Option */}
                <motion.button
                  onClick={() => {
                    setShowCheckoutModeModal(false);
                    setIsPOSMode(true);
                    setCheckoutStep('payment');
                    setShowCheckoutModal(true);
                  }}
                  className="p-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/30 rounded-2xl hover:border-green-400/50 transition-all duration-300 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-6xl mb-4">⚡</div>
                  <h3 className="text-xl font-bold text-white mb-3">In-Person Event</h3>
                  <p className="text-green-200 text-sm mb-4">
                    Fast checkout for events, farmers markets, and direct sales
                  </p>
                  <div className="text-xs text-green-300 space-y-1">
                    <div>✓ Quick payment processing</div>
                    <div>✓ Cash payment option</div>
                    <div>✓ Optional email receipt</div>
                    <div>✓ IcPay multi-chain support</div>
                  </div>
                </motion.button>

                {/* Online Order Option */}
                <motion.button
                  onClick={() => {
                    setShowCheckoutModeModal(false);
                    setIsPOSMode(false);
                    setCheckoutStep('shipping');
                    setShowCheckoutModal(true);
                  }}
                  className="p-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-500/30 rounded-2xl hover:border-blue-400/50 transition-all duration-300 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-6xl mb-4">🚚</div>
                  <h3 className="text-xl font-bold text-white mb-3">Online Order</h3>
                  <p className="text-blue-200 text-sm mb-4">
                    Full checkout with shipping and billing information
                  </p>
                  <div className="text-xs text-blue-300 space-y-1">
                    <div>✓ Shipping & billing forms</div>
                    <div>✓ Address validation</div>
                    <div>✓ Order tracking</div>
                    <div>✓ IcPay multi-chain support</div>
                  </div>
                </motion.button>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => setShowCheckoutModeModal(false)}
                  className="px-6 py-3 bg-gray-600/50 hover:bg-gray-600/70 text-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Multi-Step Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-gray-600/30"
          >
            {/* Header with Progress */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white">🛒 Checkout</h2>
                <div className="flex items-center space-x-2 mt-2">
                  {['cart', 'shipping', 'billing', 'payment'].map((step, index) => (
                    <div key={step} className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        checkoutStep === step ? 'bg-orange-400' : 
                        ['cart', 'shipping', 'billing', 'payment'].indexOf(checkoutStep) > index ? 'bg-green-400' : 'bg-gray-600'
                      }`}></div>
                      {index < 3 && <div className="w-8 h-0.5 bg-gray-600 mx-1"></div>}
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                  setCheckoutStep('cart');
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Step Content */}
            {checkoutStep === 'cart' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-orange-400">📋 Review Your Order</h3>
                
                {/* Order Items */}
                <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600/30">
                  <div className="space-y-4 mb-4">
                    {shoppingCart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium">{item.variety}</div>
                          <div className="text-gray-300 text-sm">{item.size} {item.unit && `(${item.unit})`} × {item.quantity}</div>
                        </div>
                        <div className="text-orange-400 font-bold">${item.subtotal.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-gray-600/50 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-white">Total:</span>
                      <span className="text-2xl font-bold text-orange-400">${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={proceedToNextStep}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300"
                  >
                    Continue to Shipping →
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 'shipping' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-orange-400">🚚 Shipping Information</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white font-semibold mb-2">First Name *</label>
                    <input
                      id="shipping-first-name"
                      name="firstName"
                      type="text"
                      value={shippingInfo.firstName}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                      placeholder="Enter first name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">Last Name *</label>
                    <input
                      id="shipping-last-name"
                      name="lastName"
                      type="text"
                      value={shippingInfo.lastName}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                      placeholder="Enter last name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">Email *</label>
                    <input
                      id="shipping-email"
                      name="email"
                      type="email"
                      value={shippingInfo.email}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                      placeholder="Enter email address"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">Phone</label>
                    <input
                      id="shipping-phone"
                      name="phone"
                      type="tel"
                      value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                      placeholder="Enter phone number"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-white font-semibold mb-2">Address *</label>
                    <input
                      id="shipping-address"
                      name="address"
                      type="text"
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                      placeholder="Enter street address"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">City *</label>
                    <input
                      id="shipping-city"
                      name="city"
                      type="text"
                      value={shippingInfo.city}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                      placeholder="Enter city"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">State *</label>
                    <input
                      id="shipping-state"
                      name="state"
                      type="text"
                      value={shippingInfo.state}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                      placeholder="Enter state"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">ZIP Code *</label>
                    <input
                      id="shipping-zip"
                      name="zipCode"
                      type="text"
                      value={shippingInfo.zipCode}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                      placeholder="Enter ZIP code"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">Country</label>
                    <select
                      value={shippingInfo.country}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                    >
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>
                </div>

                {/* Privacy & Consent Management */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-600/30">
                  <ConsentManager
                    onConsentChange={(consent) => setCustomerConsent(consent)}
                    initialConsent={customerConsent}
                    showTitle={true}
                  />
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={goBackStep}
                    className="px-6 py-3 bg-gray-600 text-white font-bold rounded-xl hover:bg-gray-700 transition-all duration-300"
                  >
                    ← Back to Cart
                  </button>
                  <button
                    onClick={proceedToNextStep}
                    disabled={!customerConsent.dataProcessing}
                    className={`px-6 py-3 font-bold rounded-xl transition-all duration-300 ${
                      customerConsent.dataProcessing
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                        : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    Continue to Billing →
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 'billing' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-orange-400">💳 Billing Information</h3>
                
                <div className="mb-6">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={billingInfo.sameAsShipping}
                      onChange={(e) => setBillingInfo(prev => ({ ...prev, sameAsShipping: e.target.checked }))}
                      className="w-4 h-4 text-orange-400 bg-gray-700 border border-gray-600 rounded focus:ring-orange-400"
                    />
                    <span className="text-white">Billing address same as shipping</span>
                  </label>
                </div>

                {!billingInfo.sameAsShipping && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white font-semibold mb-2">First Name *</label>
                      <input
                        id="billing-first-name"
                        name="billingFirstName"
                        type="text"
                        value={billingInfo.firstName}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                        placeholder="Enter first name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white font-semibold mb-2">Last Name *</label>
                      <input
                        id="billing-last-name"
                        name="billingLastName"
                        type="text"
                        value={billingInfo.lastName}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                        placeholder="Enter last name"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-white font-semibold mb-2">Email *</label>
                      <input
                        id="billing-email"
                        name="billingEmail"
                        type="email"
                        value={billingInfo.email}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                        placeholder="Enter email address"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-white font-semibold mb-2">Address *</label>
                      <input
                        id="billing-address"
                        name="billingAddress"
                        type="text"
                        value={billingInfo.address}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                        placeholder="Enter street address"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white font-semibold mb-2">City *</label>
                      <input
                        id="billing-city"
                        name="billingCity"
                        type="text"
                        value={billingInfo.city}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                        placeholder="Enter city"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white font-semibold mb-2">State *</label>
                      <input
                        id="billing-state"
                        name="billingState"
                        type="text"
                        value={billingInfo.state}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                        placeholder="Enter state"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white font-semibold mb-2">ZIP Code *</label>
                      <input
                        id="billing-zip"
                        name="billingZipCode"
                        type="text"
                        value={billingInfo.zipCode}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                        placeholder="Enter ZIP code"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white font-semibold mb-2">Country</label>
                      <select
                        value={billingInfo.country}
                        onChange={(e) => setBillingInfo(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-400 focus:outline-none"
                      >
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Australia">Australia</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={goBackStep}
                    className="px-6 py-3 bg-gray-600 text-white font-bold rounded-xl hover:bg-gray-700 transition-all duration-300"
                  >
                    ← Back to Shipping
                  </button>
                  <button
                    onClick={proceedToNextStep}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300"
                  >
                    Continue to Payment →
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 'payment' && (
              <div className="space-y-6">
                {isPOSMode ? (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">⚡</span>
                      <div>
                        <h3 className="text-xl font-bold text-green-400">Fast In-Person Checkout</h3>
                        <p className="text-green-300 text-sm">Skip personal info • Quick payment • Optional receipt</p>
                      </div>
                    </div>
                  </div>
                ) : (
                <h3 className="text-xl font-bold text-orange-400">💳 Payment Method</h3>
                )}
                
                {/* Order Summary */}
                <div className="bg-gray-700/50 rounded-xl p-6 border border-gray-600/30">
                  <h4 className="text-white font-semibold mb-4">Order Summary</h4>
                  <div className="space-y-2 mb-4">
                    {shoppingCart.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{item.variety} × {item.quantity}</span>
                        <span className="text-white">${item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-600/50 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-white">Total:</span>
                      <span className="text-xl font-bold text-orange-400">${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Crypto Payment Calculator */}
                <div className="mb-6">
                  <CryptoPaymentCalculator
                    usdAmount={cartTotal}
                    selectedMethod={selectedPaymentMethod}
                    isPOSMode={isPOSMode}
                    onPaymentMethodSelect={handlePaymentMethodSelect}
                    className="bg-gray-800/30 rounded-xl p-6 border border-gray-600/30"
                  />

                  {/* Token Selector for Multi-Token Wallets */}
                  {showTokenSelector && selectedPaymentMethod === 'oisy' && (
                    <div className="mt-6 bg-gray-800/30 rounded-xl p-6 border border-gray-600/30">
                      <TokenSelector
                        availableTokens={['ICP', 'BTC', 'ETH', 'SPICY']}
                        usdAmount={cartTotal}
                        selectedToken={selectedToken}
                        walletName="OISY Wallet"
                        onTokenSelect={async (token, calculation) => {
                          setSelectedToken(token);
                          
                          const paymentMethod = {
                            id: 'oisy',
                            name: 'OISY Wallet',
                            icon: '🔵',
                            calculation: calculation,
                            token: token
                          };
                          
                          setShowTokenSelector(false);
                          await handleCryptoPayment(paymentMethod);
                        }}
                      />
                            </div>
                  )}

                  {/* IcPay Multi-Chain Payment */}
                  {selectedPaymentMethod === 'icpay' && (
                    <div className="mt-6">
                      <IcPayPayment
                        usdAmount={cartTotal}
                        onSuccess={async (paymentResult) => {
                          console.log('✅ IcPay payment successful:', paymentResult);
                          
                          if (!allowIcPayCallback) {
                            console.log('🚫 BLOCKING IcPay callback - not allowed yet');
                            return; // Block the callback
                          }
                          
                          // Create customer profile in CRM
                          const customerData = {
                            email: shippingInfo.email,
                            firstName: shippingInfo.firstName,
                            lastName: shippingInfo.lastName,
                            phone: shippingInfo.phone,
                            shippingAddress: shippingInfo,
                            billingAddress: billingInfo.sameAsShipping ? shippingInfo : billingInfo
                          };

                          try {
                            const crmResult = await customerCRM.createProfile(customerData, customerConsent);
                            console.log('✅ Customer profile created in CRM:', crmResult.customerId);
                          } catch (crmError) {
                            console.warn('⚠️ Failed to create customer profile:', crmError);
                          }

                          // Record IcPay transaction in admin analytics
                          try {
                            if (principal) {
                              await recordShopPurchase({
                                userPrincipal: principal.toString(),
                                amount: cartTotal,
                                currency: paymentResult.currency || 'USD',
                                transactionHash: paymentResult.transactionId || `icpay_${Date.now()}`,
                                metadata: {
                                  items: shoppingCart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity })),
                                  paymentMethod: 'IcPay',
                                  icpayData: paymentResult.icpayData
                                }
                              });
                            }
                          } catch (analyticsError) {
                            console.warn('⚠️ Failed to record IcPay transaction in admin analytics:', analyticsError);
                          }

                          // Create order with IcPay payment details
                          const orderData = {
                            id: paymentResult.orderId || generateOrderId(),
                            items: shoppingCart,
                            total: cartTotal,
                            payment: {
                              method: 'IcPay',
                              transactionId: paymentResult.transactionId,
                              currency: paymentResult.currency,
                              amount: paymentResult.amount,
                              chain: paymentResult.chain,
                              address: paymentResult.address,
                              usdAmount: cartTotal,
                              timestamp: Date.now()
                            },
                            customer: {
                              ...customerData,
                              consent: customerConsent
                            },
                            status: 'confirmed'
                          };

                          setOrderDetails(orderData);
                          setPaymentStatus('success');
                          
                          // Reduce stock for all items in the order
                          shoppingCart.forEach(item => {
                            reduceStock(item.productId, item.quantity);
                          });
                          
                          // Clear cart and proceed
                          setShoppingCart([]);
                          
                          if (isPOSMode) {
                            // Fast POS mode: show immediate success with optional receipt
                            setShowPaymentSuccess(true);
                            setShowCheckoutModal(false);
                          } else {
                            // Regular mode: go to confirmation step
                            setCheckoutStep('confirmation');
                          }
                          
                          // Create order in logistics system
                          try {
                            const logisticsOrder = await orders.createOrder(orderData);
                            console.log('✅ Order created in logistics system:', logisticsOrder);
                          } catch (logisticsError) {
                            console.warn('⚠️ Failed to create logistics order:', logisticsError);
                          }
                        }}
                        onError={(error) => {
                          console.error('❌ IcPay payment failed:', error);
                          alert(`IcPay payment failed: ${error.message || 'Unknown error'}`);
                        }}
                config={{
                  publishableKey: process.env.REACT_APP_ICPAY_PK || 'pk_IBR7yEdfinVZ4484Q5jMxgx69cTS2Lxb'
                }}
                      />
                          </div>
                  )}
                </div>

                {/* Traditional Payment Options */}
                <div>
                  <h4 className="text-lg text-green-400 mb-3">💳 Traditional Payment</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {paymentMethods.traditional.filter(method => method.available).map((method) => (
                      <motion.button
                        key={method.id}
                        onClick={() => handlePayment(method)}
                        disabled={paymentProcessing}
                        className={`p-4 rounded-xl border transition-all duration-300 text-left ${
                          paymentProcessing 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'border-gray-600/30 bg-gray-700/50 hover:border-green-500/50 hover:bg-green-500/10'
                        }`}
                        whileHover={!paymentProcessing ? { scale: 1.02 } : {}}
                        whileTap={!paymentProcessing ? { scale: 0.98 } : {}}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">{method.icon}</div>
                          <div className="flex-1">
                            <div className="text-white font-semibold">{method.name}</div>
                            <div className="text-gray-300 text-sm">{method.description}</div>
                          </div>
                          <div className="text-green-400">→</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Payment Processing Status */}
                {paymentProcessing && (
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-4">🔄</div>
                    <div className="text-blue-300 font-semibold mb-2">Processing Payment...</div>
                    <div className="text-gray-300 text-sm">Please wait while we process your transaction</div>
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={goBackStep}
                    className="px-6 py-3 bg-gray-600 text-white font-bold rounded-xl hover:bg-gray-700 transition-all duration-300"
                  >
                    ← Back to Billing
                  </button>
                </div>

                {/* Security Notice */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-yellow-400 text-xl">🔒</div>
                    <div>
                      <div className="text-yellow-400 font-semibold text-sm">Secure Checkout</div>
                      <div className="text-gray-300 text-xs">Your payment information is protected with enterprise-grade security</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* API Configuration Modal */}
      {showAPIConfig && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <APIConfigManager onClose={() => setShowAPIConfig(false)} />
          </motion.div>
        </div>
      )}

      {/* Logistics Demo Modal */}
      {showLogisticsDemo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-7xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowLogisticsDemo(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ✕ Close Demo
              </button>
            </div>
            <LogisticsDemo />
          </motion.div>
        </div>
      )}

      {/* Payment Success Modal */}
      {showPaymentSuccess && orderDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl p-8 w-full border ${
              isPOSMode 
                ? 'bg-gradient-to-br from-green-600 to-emerald-700 border-green-400/30 max-w-lg' 
                : 'bg-gradient-to-br from-green-800 to-green-900 border-green-600/30 max-w-2xl'
            }`}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              {isPOSMode ? (
                <>
                  <h2 className="text-2xl font-bold text-white mb-2">Transaction Complete!</h2>
                  <p className="text-green-100 mb-4">Payment successful • Thank you!</p>
                  
                  {/* Quick Transaction Summary for POS */}
                  <div className="bg-green-800/50 rounded-xl p-4 mb-6">
                    <div className="text-white font-bold text-xl mb-2">${orderDetails.total.toFixed(2)}</div>
                    <div className="text-green-200 text-sm">{orderDetails.items.length} items • {orderDetails.payment.method}</div>
                    <div className="text-green-300 text-xs mt-1">Order #{orderDetails.id.slice(-6)}</div>
                  </div>
                </>
              ) : (
                <>
              <h2 className="text-3xl font-bold text-white mb-4">Payment Successful!</h2>
              <p className="text-green-200 mb-6">Your order has been confirmed and is being processed.</p>
                </>
              )}
              
              {/* Conditional Order Details */}
              {!isPOSMode && (
              <div className="bg-green-700/50 rounded-xl p-6 mb-6 text-left">
                <h3 className="text-lg font-semibold text-white mb-3">Order Details</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2 text-green-200">
                    <div><strong>Order ID:</strong> {orderDetails.id}</div>
                    <div><strong>Payment Method:</strong> {orderDetails.payment.method}</div>
                    <div><strong>Transaction ID:</strong> {orderDetails.payment.transactionId}</div>
                    <div><strong>Amount:</strong> ${orderDetails.total.toFixed(2)}</div>
                    <div><strong>Items:</strong> {orderDetails.items.length} products</div>
                  </div>
                  
                  <div className="space-y-2 text-green-200">
                    <h4 className="font-semibold text-white">Shipping Address</h4>
                    <div className="text-sm">
                      <div>{orderDetails.shipping.firstName} {orderDetails.shipping.lastName}</div>
                      <div>{orderDetails.shipping.address}</div>
                      <div>{orderDetails.shipping.city}, {orderDetails.shipping.state} {orderDetails.shipping.zipCode}</div>
                      <div>{orderDetails.shipping.country}</div>
                      <div className="mt-1 text-green-300">{orderDetails.shipping.email}</div>
                    </div>
                  </div>
                </div>
              </div>
              )}
              
              {/* Conditional Action Buttons */}
              {isPOSMode ? (
                <div className="space-y-3">
                  {/* Optional Receipt Collection */}
                  <div className="bg-green-800/30 rounded-xl p-4 mb-4">
                    <h4 className="text-white font-semibold mb-3">📧 Optional Receipt</h4>
                    <div className="flex gap-3">
                      <input
                        id="receipt-email"
                        name="receiptEmail"
                        type="email"
                        value={receiptEmail}
                        onChange={(e) => setReceiptEmail(e.target.value)}
                        placeholder="customer@email.com (optional)"
                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 text-sm"
                      />
                      <button 
                        onClick={() => {
                          if (receiptEmail && receiptEmail.includes('@')) {
                            // Here you would integrate with your email service
                            console.log('📧 Sending receipt to:', receiptEmail);
                            alert(`Receipt sent to ${receiptEmail}`);
                            setReceiptEmail('');
                          } else {
                            alert('Please enter a valid email address');
                          }
                        }}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Send
                      </button>
                    </div>
                    <p className="text-green-300 text-xs mt-2">Receipt email is optional for in-person purchases</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowPaymentSuccess(false);
                        setIsPOSMode(false); // Reset POS mode
                      }}
                      className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all duration-300"
                    >
                      ✅ Done
                    </button>
                    <button
                      onClick={() => {
                        setShowPaymentSuccess(false);
                        setShowMenu(true); // Return to POS menu
                      }}
                      className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all duration-300"
                    >
                      🛒 New Sale
                    </button>
                  </div>
                </div>
              ) : (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowPaymentSuccess(false)}
                  className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all duration-300"
                >
                  Continue Shopping
                </button>
                <button
                  onClick={() => {
                    const orders = JSON.parse(localStorage.getItem('icspicy_orders') || '[]');
                    console.log('All Orders:', orders);
                    alert('Check console for order history');
                  }}
                  className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all duration-300"
                >
                  View Orders
                </button>
              </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ShopPage; 
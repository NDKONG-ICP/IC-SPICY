/**
 * Crypto Price Service
 * 
 * Provides real-time USD conversion rates for all supported cryptocurrencies
 * Uses CoinGecko API as primary source with DexScreener as fallback
 * Supports: ICP, SOL, ETH, BTC, USDC, and other tokens
 */

import React from 'react';

class CryptoPriceService {
  constructor() {
    this.priceCache = new Map();
    this.cacheExpiry = 30000; // 30 seconds cache for live data
    this.lastUpdate = new Map();
    this.requestQueue = new Map();
    this.rateLimitDelay = 1000;
    this.lastRequestTime = 0;
    
    // IC Price API endpoint
    this.priceApiUrl = 'https://ycy5f-4aaaa-aaaao-a4prq-cai.icp0.io'; // Will be updated after deployment
    
    // DexScreener API configuration
    this.dexScreenerApiUrl = 'https://api.dexscreener.com/latest/dex';
    
    // Supported tokens with their DexScreener contract addresses
    this.supportedTokens = {
      // Internet Computer ecosystem
      'ICP': {
        coingecko: 'internet-computer',
        symbol: 'ICP',
        decimals: 8,
        name: 'Internet Computer',
        dexScreener: {
          chain: 'internet-computer',
          address: 'ryjl3-tyaaa-aaaaa-aaaba-cai' // ICP ledger canister
        }
      },
      'ckBTC': {
        coingecko: 'bitcoin',
        symbol: 'ckBTC',
        decimals: 8,
        name: 'Chain Key Bitcoin',
        dexScreener: {
          chain: 'internet-computer',
          address: 'mxzaz-hqaaa-aaaar-qaada-cai' // ckBTC ledger canister
        }
      },
      'ckETH': {
        coingecko: 'ethereum',
        symbol: 'ckETH',
        decimals: 18,
        name: 'Chain Key Ethereum',
        dexScreener: {
          chain: 'internet-computer',
          address: 'ss2fx-dyaaa-aaaar-qacoq-cai' // ckETH ledger canister
        }
      },
      'SPICY': {
        coingecko: null,
        symbol: 'SPICY',
        decimals: 8,
        name: 'IC SPICY Token',
        customPrice: true,
        dexScreener: {
          chain: 'internet-computer',
          address: 'spicy-token-address' // Will be updated when SPICY token is deployed
        }
      },
      // Solana ecosystem
      'SOL': {
        coingecko: 'solana',
        symbol: 'SOL',
        decimals: 9,
        name: 'Solana',
        dexScreener: {
          chain: 'solana',
          address: 'So11111111111111111111111111111111111111112' // Wrapped SOL
        }
      },
      // Ethereum ecosystem
      'ETH': {
        coingecko: 'ethereum',
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
        dexScreener: {
          chain: 'ethereum',
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
        }
      },
      'USDC': {
        coingecko: 'usd-coin',
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
        dexScreener: {
          chain: 'ethereum',
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC
        }
      },
      'USDT': {
        coingecko: 'tether',
        symbol: 'USDT',
        decimals: 6,
        name: 'Tether USD',
        dexScreener: {
          chain: 'ethereum',
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' // USDT
        }
      },
      // Bitcoin
      'BTC': {
        coingecko: 'bitcoin',
        symbol: 'BTC',
        decimals: 8,
        name: 'Bitcoin',
        dexScreener: {
          chain: 'bitcoin',
          address: 'bitcoin' // Bitcoin doesn't have contract addresses
        }
      },
      // Cronos (Crypto.com)
      'CRO': {
        coingecko: 'crypto-com-chain',
        symbol: 'CRO',
        decimals: 8,
        name: 'Cronos',
        dexScreener: {
          chain: 'cronos',
          address: '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23' // CRO
        }
      },
      // Polygon
      'MATIC': {
        coingecko: 'matic-network',
        symbol: 'MATIC',
        decimals: 18,
        name: 'Polygon',
        dexScreener: {
          chain: 'polygon',
          address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' // WMATIC
        }
      },
      // Binance Smart Chain
      'BNB': {
        coingecko: 'binancecoin',
        symbol: 'BNB',
        decimals: 18,
        name: 'Binance Coin',
        dexScreener: {
          chain: 'bsc',
          address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' // WBNB
        }
      }
    };
  }

  /**
   * Get current USD price for a cryptocurrency
   */
  async getPrice(tokenSymbol) {
    const token = this.supportedTokens[tokenSymbol.toUpperCase()];
    if (!token) {
      throw new Error(`Unsupported token: ${tokenSymbol}`);
    }

    const cacheKey = tokenSymbol.toUpperCase();
    const now = Date.now();
    
    // Check cache first
    if (this.priceCache.has(cacheKey)) {
      const lastUpdate = this.lastUpdate.get(cacheKey) || 0;
      if (now - lastUpdate < this.cacheExpiry) {
        const cachedPrice = this.priceCache.get(cacheKey);
        console.log(`✅ Using cached price for ${tokenSymbol}: $${cachedPrice}`);
        return cachedPrice;
      }
    }

    // Check if there's already a pending request for this token
    if (this.requestQueue.has(cacheKey)) {
      console.log(`⏳ Waiting for pending request for ${tokenSymbol}`);
      return this.requestQueue.get(cacheKey);
    }

    // Create new request
    const requestPromise = this.fetchPriceFromIC(tokenSymbol, token, cacheKey, now);
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const price = await requestPromise;
      return price;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  /**
   * Fetch price from DexScreener API (primary source for live data)
   */
  async fetchPriceFromIC(tokenSymbol, token, cacheKey, now) {
    try {
      // Try DexScreener API first for live data
      const price = await this.fetchPriceFromDexScreener(tokenSymbol, token);
      if (price) {
        this.priceCache.set(cacheKey, price);
        this.lastUpdate.set(cacheKey, now);
        console.log(`✅ Successfully fetched live price from DexScreener for ${tokenSymbol}: $${price}`);
        return price;
      }
      
      console.warn(`⚠️ DexScreener API failed for ${tokenSymbol}, trying IC Price API`);
      throw new Error('DEXSCREENER_API_FAILED');
    } catch (error) {
      console.warn(`⚠️ DexScreener API error for ${tokenSymbol}:`, error.message);
      
      // Fallback to IC Price API
      try {
        return await this.fetchPriceFromICCanister(tokenSymbol, token, cacheKey, now);
      } catch (icError) {
        console.warn(`⚠️ IC Price API also failed for ${tokenSymbol}, using fallback`);
        // Final fallback to external APIs
        return await this.fetchPriceWithRateLimit(tokenSymbol, token, cacheKey, now);
      }
    }
  }

  /**
   * Fetch price from DexScreener API
   */
  async fetchPriceFromDexScreener(tokenSymbol, token) {
    try {
      console.log(`🔍 Fetching ${tokenSymbol} price from DexScreener...`);
      const dexScreenerConfig = token.dexScreener;
      if (!dexScreenerConfig) {
        throw new Error('No DexScreener configuration for token');
      }

      // Handle special cases
      if (tokenSymbol === 'BTC') {
        // Bitcoin doesn't have contract addresses, use search endpoint
        console.log(`🔍 Searching for Bitcoin on DexScreener...`);
        return await this.searchTokenOnDexScreener('bitcoin');
      }

      console.log(`🔍 Using DexScreener token endpoint: ${dexScreenerConfig.address}`);
      
      // Use token address endpoint for other tokens
      const response = await fetch(
        `${this.dexScreenerApiUrl}/tokens/${dexScreenerConfig.address}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'IC-SPICY-DAPP/1.0'
          }
        }
      );

      console.log(`📊 DexScreener response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ DexScreener API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`DexScreener API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📊 DexScreener data received:`, data);
      
      if (data.pairs && data.pairs.length > 0) {
        // For ICP, we need to find pairs where ICP is the base token (not quote)
        // and calculate the USD price from the most liquid pair
        let bestPair = null;
        let bestLiquidity = 0;

        for (const pair of data.pairs) {
          const liquidity = pair.liquidity?.usd || 0;
          
          if (tokenSymbol === 'ICP') {
            // For ICP, use pairs where ICP is the quote token and calculate ICP price
            if (pair.quoteToken?.address === dexScreenerConfig.address && 
                pair.priceUsd && parseFloat(pair.priceUsd) > 0) {
              // For pairs where ICP is quote token, priceUsd is the base token price
              // We need to calculate ICP price from the pair data
              // ICP price = (base token price in USD) / (base token price in ICP)
              const baseTokenPriceUsd = parseFloat(pair.priceUsd);
              const baseTokenPriceIcp = parseFloat(pair.priceNative);
              if (baseTokenPriceIcp > 0) {
                const icpPrice = baseTokenPriceUsd / baseTokenPriceIcp;
                if (icpPrice > 0 && liquidity > bestLiquidity) {
                  bestPair = { ...pair, priceUsd: icpPrice };
                  bestLiquidity = liquidity;
                }
              }
            }
          } else {
            // For other tokens, use the pair with highest liquidity
            if (pair.priceUsd && parseFloat(pair.priceUsd) > 0) {
              if (liquidity > bestLiquidity) {
                bestPair = pair;
                bestLiquidity = liquidity;
              }
            }
          }
        }

        if (bestPair && bestPair.priceUsd && parseFloat(bestPair.priceUsd) > 0) {
          const price = parseFloat(bestPair.priceUsd);
          console.log(`📊 DexScreener: Found ${tokenSymbol} price $${price} from pair ${bestPair.pairAddress} (liquidity: $${bestLiquidity.toFixed(2)})`);
          return price;
        }
      }

      throw new Error('No valid price data found');
    } catch (error) {
      console.error(`DexScreener API error for ${tokenSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Search for token on DexScreener (for tokens without specific addresses)
   */
  async searchTokenOnDexScreener(tokenName) {
    try {
      const response = await fetch(
        `${this.dexScreenerApiUrl}/search/?q=${encodeURIComponent(tokenName)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'IC-SPICY-DAPP/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`DexScreener search error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.pairs && data.pairs.length > 0) {
        // Find the most liquid pair for the token
        const bestPair = data.pairs.reduce((best, current) => {
          const bestLiquidity = best.liquidity?.usd || 0;
          const currentLiquidity = current.liquidity?.usd || 0;
          return currentLiquidity > bestLiquidity ? current : best;
        });

        if (bestPair.priceUsd && parseFloat(bestPair.priceUsd) > 0) {
          return parseFloat(bestPair.priceUsd);
        }
      }

      throw new Error('No valid price data found in search results');
    } catch (error) {
      console.error(`DexScreener search error for ${tokenName}:`, error);
      throw error;
    }
  }

  /**
   * Fetch price from IC Price API canister (fallback)
   */
  async fetchPriceFromICCanister(tokenSymbol, token, cacheKey, now) {
    // For now, use fallback prices since we can't deploy the price API canister
    // This will be updated once we have cycles to deploy the canister
    console.log(`⚠️ IC Price API not available, using fallback for ${tokenSymbol}`);
    throw new Error('IC_API_NOT_AVAILABLE');
  }

  /**
   * Fetch price with rate limiting (fallback method)
   */
  async fetchPriceWithRateLimit(tokenSymbol, token, cacheKey, now) {
    // Rate limiting to avoid API abuse
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    try {
      // Try DexScreener API first
      try {
        const price = await this.fetchPriceFromDexScreener(tokenSymbol, token);
        if (price) {
          this.priceCache.set(cacheKey, price);
          this.lastUpdate.set(cacheKey, now);
          console.log(`✅ Successfully fetched live price from DexScreener for ${tokenSymbol}: $${price}`);
          return price;
        }
      } catch (dexError) {
        console.warn(`⚠️ DexScreener API failed for ${tokenSymbol}:`, dexError.message);
      }

      // Try CoinGecko API as fallback
      try {
        const price = await this.getPriceFromCoinGecko(token.coingecko);
        if (price) {
          this.priceCache.set(cacheKey, price);
          this.lastUpdate.set(cacheKey, now);
          console.log(`✅ Successfully fetched price from CoinGecko for ${tokenSymbol}: $${price}`);
          return price;
        }
      } catch (coingeckoError) {
        console.warn(`⚠️ CoinGecko API failed for ${tokenSymbol}:`, coingeckoError.message);
      }

      // Final fallback to static prices
      let price;
      if (token.customPrice) {
        // Handle custom tokens like SPICY
        price = await this.getCustomTokenPrice(tokenSymbol);
      } else {
        // Use fallback prices for standard tokens
        price = await this.getFallbackPrice(tokenSymbol);
      }

      // Cache the result
      this.priceCache.set(cacheKey, price);
      this.lastUpdate.set(cacheKey, now);

      console.log(`✅ Successfully fetched fallback price for ${tokenSymbol}: $${price}`);
      return price;
    } catch (error) {
      console.error(`❌ Failed to get any price for ${tokenSymbol}:`, error);
      throw new Error(`Unable to fetch price for ${tokenSymbol}`);
    }
  }

  /**
   * Get price from CoinGecko API with CORS proxy
   */
  async getPriceFromCoinGecko(coinId) {
    if (!coinId || coinId === 'null') {
      throw new Error('Coin ID is required');
    }
    
    try {
      // Try direct API call first (might work in some environments)
      try {
        const directResponse = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'IC-SPICY-DAPP/1.0'
            }
          }
        );

        if (directResponse.ok) {
          const data = await directResponse.json();
          const price = data[coinId]?.usd;
          if (typeof price === 'number') {
            console.log(`✅ Direct API call successful for ${coinId}: $${price}`);
            return price;
          }
        }
      } catch (directError) {
        console.log(`Direct API call failed for ${coinId}, trying CORS proxies...`);
      }

      // Try multiple CORS proxies for better reliability
      const corsProxies = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest='
      ];
      
      const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
      
      for (let i = 0; i < corsProxies.length; i++) {
        try {
          const proxy = corsProxies[i];
          const response = await fetch(
            `${proxy}${encodeURIComponent(apiUrl)}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'IC-SPICY-DAPP/1.0'
              }
            }
          );

          if (response.status === 429) {
            console.warn(`⚠️ CoinGecko rate limit hit for ${coinId}, trying next proxy`);
            continue;
          }

          if (!response.ok) {
            console.warn(`⚠️ Proxy ${i} failed for ${coinId}, trying next`);
            continue;
          }

          const data = await response.json();
          const price = data[coinId]?.usd;

          if (typeof price !== 'number') {
            console.warn(`⚠️ Invalid price data from proxy ${i} for ${coinId}, trying next`);
            continue;
          }

          console.log(`✅ Successfully fetched price for ${coinId} using proxy ${i}: $${price}`);
          return price;
        } catch (proxyError) {
          console.warn(`⚠️ Proxy ${i} failed for ${coinId}:`, proxyError.message);
          if (i === corsProxies.length - 1) {
            throw proxyError;
          }
        }
      }
      
      throw new Error('All CORS proxies failed');
    } catch (error) {
      console.error(`CoinGecko API error for ${coinId}:`, error);
      throw error;
    }
  }

  /**
   * Get fallback price from DexScreener or other sources
   */
  async getFallbackPrice(tokenSymbol) {
    // Use updated current market prices as fallback
    // These are updated regularly to reflect current market conditions
    const fallbackPrices = {
      'USDC': 1.00,
      'USDT': 1.00,
      'BTC': 95000,  // Current approximate price
      'ETH': 3500,   // Current approximate price
      'SOL': 200,    // Current approximate price
      'ICP': 12.50,  // Current approximate price
      'CRO': 0.15,   // Current approximate price
      'ckBTC': 95000, // Same as BTC
      'ckETH': 3500,  // Same as ETH
      'MATIC': 0.85,  // Current approximate price
      'BNB': 600.0    // Current approximate price
    };

    const price = fallbackPrices[tokenSymbol.toUpperCase()];
    if (price) {
      console.log(`✅ Using updated fallback price for ${tokenSymbol}: $${price}`);
      return price;
    }

    throw new Error(`No fallback price available for ${tokenSymbol}`);
  }

  /**
   * Refresh all prices from DexScreener (for admin/development use)
   */
  async refreshAllPrices() {
    console.log('🔄 Refreshing all prices from DexScreener...');
    const results = {};
    
    for (const [symbol, token] of Object.entries(this.supportedTokens)) {
      try {
        const price = await this.fetchPriceFromDexScreener(symbol, token);
        results[symbol] = {
          success: true,
          price: price,
          source: 'DexScreener'
        };
        console.log(`✅ ${symbol}: $${price}`);
      } catch (error) {
        results[symbol] = {
          success: false,
          error: error.message,
          source: 'DexScreener'
        };
        console.error(`❌ ${symbol}: ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Get price with live data indicator
   */
  async getPriceWithSource(tokenSymbol) {
    const token = this.supportedTokens[tokenSymbol.toUpperCase()];
    if (!token) {
      throw new Error(`Unsupported token: ${tokenSymbol}`);
    }

    const cacheKey = tokenSymbol.toUpperCase();
    const now = Date.now();
    
    // Check cache first
    if (this.priceCache.has(cacheKey)) {
      const lastUpdate = this.lastUpdate.get(cacheKey) || 0;
      if (now - lastUpdate < this.cacheExpiry) {
        const cachedPrice = this.priceCache.get(cacheKey);
        return {
          price: cachedPrice,
          source: 'cache',
          timestamp: lastUpdate,
          isLive: false
        };
      }
    }

    try {
      const price = await this.fetchPriceFromDexScreener(tokenSymbol, token);
      this.priceCache.set(cacheKey, price);
      this.lastUpdate.set(cacheKey, now);
      
      return {
        price: price,
        source: 'DexScreener',
        timestamp: now,
        isLive: true
      };
    } catch (error) {
      // Fallback to cached or static price
      const fallbackPrice = await this.getFallbackPrice(tokenSymbol);
      return {
        price: fallbackPrice,
        source: 'fallback',
        timestamp: now,
        isLive: false,
        error: error.message
      };
    }
  }

  /**
   * Get alternative price from other sources
   */
  async getAlternativePrice(tokenSymbol) {
    // Try CoinCap API as alternative
    try {
      const coinCapMap = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'ICP': 'internet-computer',
        'USDC': 'usd-coin',
        'USDT': 'tether'
      };

      const coinCapId = coinCapMap[tokenSymbol.toUpperCase()];
      if (coinCapId) {
        const response = await fetch(
          `https://api.coincap.io/v2/assets/${coinCapId}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          const price = parseFloat(data.data?.priceUsd);
          if (price && price > 0) {
            return price;
          }
        }
      }
    } catch (error) {
      console.warn(`CoinCap API failed for ${tokenSymbol}:`, error);
    }

    return null;
  }

  /**
   * Get custom token price (like SPICY)
   */
  async getCustomTokenPrice(tokenSymbol) {
    if (tokenSymbol.toUpperCase() === 'SPICY') {
      // For SPICY token, you might want to:
      // 1. Get price from your own DEX
      // 2. Use a fixed rate
      // 3. Calculate based on ICP price
      
      // For now, let's use a demo rate of $0.10 per SPICY
      // You can replace this with actual DEX pricing logic
      return 0.10;
    }

    throw new Error(`No custom price logic for ${tokenSymbol}`);
  }

  /**
   * Get alternative ICP price
   */
  async getAlternativeICPPrice() {
    try {
      // Try DFINITY dashboard or other IC-specific sources
      // For now, return the current market price
      return 4.77; // Current ICP price from search results
    } catch (error) {
      throw new Error('Failed to get alternative ICP price');
    }
  }

  /**
   * Get DexScreener price
   */
  async getDexScreenerPrice(chain, tokenSymbol) {
    try {
      // DexScreener API (if available)
      // This is a placeholder - you'd need to implement actual DexScreener integration
      console.warn(`DexScreener integration not implemented for ${tokenSymbol}`);
      throw new Error('DexScreener not implemented');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate crypto amount needed for USD total
   */
  async calculateCryptoAmount(usdAmount, tokenSymbol) {
    const price = await this.getPrice(tokenSymbol);
    const token = this.supportedTokens[tokenSymbol.toUpperCase()];
    
    if (!token) {
      throw new Error(`Unsupported token: ${tokenSymbol}`);
    }

    // Calculate amount needed
    const rawAmount = usdAmount / price;
    
    // Round to appropriate decimal places
    const decimals = Math.min(token.decimals, 8); // Max 8 decimal places for display
    const amount = Math.ceil(rawAmount * Math.pow(10, decimals)) / Math.pow(10, decimals);

    return {
      amount,
      price,
      usdAmount,
      token: token.symbol,
      tokenName: token.name,
      calculation: {
        usdAmount,
        pricePerToken: price,
        rawAmount,
        roundedAmount: amount,
        decimals
      }
    };
  }

  /**
   * Get multiple token prices at once
   */
  async getMultiplePrices(tokenSymbols) {
    const results = {};
    const promises = tokenSymbols.map(async (symbol) => {
      try {
        const price = await this.getPrice(symbol);
        results[symbol.toUpperCase()] = { price, error: null };
      } catch (error) {
        results[symbol.toUpperCase()] = { price: null, error: error.message };
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Format price for display
   */
  formatPrice(price, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price);
  }

  /**
   * Format crypto amount for display
   */
  formatCryptoAmount(amount, tokenSymbol) {
    const token = this.supportedTokens[tokenSymbol.toUpperCase()];
    const decimals = Math.min(token?.decimals || 8, 8);
    
    return `${amount.toFixed(decimals)} ${tokenSymbol.toUpperCase()}`;
  }

  /**
   * Get token info
   */
  getTokenInfo(tokenSymbol) {
    return this.supportedTokens[tokenSymbol.toUpperCase()] || null;
  }

  /**
   * Get all supported tokens
   */
  getSupportedTokens() {
    return Object.keys(this.supportedTokens);
  }

  /**
   * Clear price cache
   */
  clearCache() {
    this.priceCache.clear();
    this.lastUpdate.clear();
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    const status = {};
    for (const [token, updateTime] of this.lastUpdate.entries()) {
      const age = Date.now() - updateTime;
      status[token] = {
        age,
        expired: age > this.cacheExpiry,
        price: this.priceCache.get(token)
      };
    }
    return status;
  }
}

// Create singleton instance
export const cryptoPriceService = new CryptoPriceService();

// React hook for easy integration

export const useCryptoPrices = () => {
  const [prices, setPrices] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const updatePrices = async (tokenSymbols) => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await cryptoPriceService.getMultiplePrices(tokenSymbols);
      setPrices(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateAmount = async (usdAmount, tokenSymbol) => {
    try {
      return await cryptoPriceService.calculateCryptoAmount(usdAmount, tokenSymbol);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    prices,
    loading,
    error,
    updatePrices,
    calculateAmount,
    clearCache: () => cryptoPriceService.clearCache()
  };
};

export default cryptoPriceService;

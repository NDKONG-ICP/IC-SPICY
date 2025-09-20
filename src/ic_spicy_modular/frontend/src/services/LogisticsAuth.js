/**
 * IC SPICY Co-op Logistics Authentication Manager
 * 
 * Handles secure authentication and authorization for logistics API
 */

import { LOGISTICS_CONFIG } from '../config/logistics.js';

class LogisticsAuth {
  constructor() {
    this.apiKey = null;
    this.authToken = null;
    this.refreshToken = null;
    this.userRole = null;
    this.expirationTime = null;
    this.refreshTimer = null;
    
    // Load existing session from localStorage
    this.loadSession();
  }

  /**
   * Initialize authentication with credentials
   * @param {Object} credentials - Authentication credentials
   * @param {string} credentials.apiKey - API key for service authentication
   * @param {string} credentials.username - Username for login
   * @param {string} credentials.password - Password for login
   * @param {string} credentials.principal - IC Principal for wallet-based auth
   */
  async initialize(credentials) {
    try {
      console.log('🔐 Initializing Logistics Authentication...');

      // Set API key for service-to-service authentication
      if (credentials.apiKey) {
        this.apiKey = credentials.apiKey;
        this.saveToStorage('apiKey', this.apiKey);
      }

      // Authenticate user if credentials provided
      if (credentials.username && credentials.password) {
        await this.loginWithCredentials(credentials.username, credentials.password);
      } else if (credentials.principal) {
        await this.loginWithPrincipal(credentials.principal);
      }

      console.log('✅ Logistics Authentication initialized');
      return { success: true, role: this.userRole };
    } catch (error) {
      console.error('❌ Failed to initialize authentication:', error);
      throw error;
    }
  }

  /**
   * Login with username and password
   */
  async loginWithCredentials(username, password) {
    try {
      const loginData = {
        username: username,
        password: password,
        client_type: 'ic_spicy_frontend'
      };

      const response = await fetch(`${LOGISTICS_CONFIG.BASE_URL}${LOGISTICS_CONFIG.ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(loginData)
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      this.authToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.userRole = data.user.role;
      this.expirationTime = Date.now() + (data.expires_in * 1000);

      this.saveSession();
      this.scheduleTokenRefresh();

      console.log(`✅ Logged in as ${this.userRole}`);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  /**
   * Login with IC Principal (wallet-based authentication)
   */
  async loginWithPrincipal(principal) {
    try {
      // Generate authentication challenge
      const challengeResponse = await fetch(`${LOGISTICS_CONFIG.BASE_URL}/auth/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({ principal })
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to get authentication challenge');
      }

      const { challenge, nonce } = await challengeResponse.json();

      // In a real implementation, this would involve signing the challenge
      // with the user's private key. For now, we'll simulate this.
      const signature = await this.signChallenge(challenge, principal);

      // Verify signed challenge
      const verifyResponse = await fetch(`${LOGISTICS_CONFIG.BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          principal,
          challenge,
          signature,
          nonce
        })
      });

      if (!verifyResponse.ok) {
        throw new Error('Challenge verification failed');
      }

      const data = await verifyResponse.json();
      
      this.authToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.userRole = data.user.role;
      this.expirationTime = Date.now() + (data.expires_in * 1000);

      this.saveSession();
      this.scheduleTokenRefresh();

      console.log(`✅ Authenticated with principal: ${principal.slice(0, 8)}...`);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('❌ Principal authentication failed:', error);
      throw error;
    }
  }

  /**
   * Sign authentication challenge (simplified implementation)
   * In production, this would use the actual IC identity
   */
  async signChallenge(challenge, principal) {
    // This is a placeholder. In a real implementation, you would:
    // 1. Use the IC identity to sign the challenge
    // 2. Return the actual cryptographic signature
    
    const message = `${challenge}:${principal}:${Date.now()}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Simulate signing with crypto API
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // Fallback to simple hash
      return btoa(message).replace(/[^a-zA-Z0-9]/g, '');
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshAuthToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${LOGISTICS_CONFIG.BASE_URL}${LOGISTICS_CONFIG.ENDPOINTS.REFRESH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'Authorization': `Bearer ${this.refreshToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      this.authToken = data.access_token;
      this.expirationTime = Date.now() + (data.expires_in * 1000);
      
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }

      this.saveSession();
      this.scheduleTokenRefresh();

      console.log('🔄 Auth token refreshed');
      return true;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      this.logout();
      throw error;
    }
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.expirationTime) return;

    const refreshTime = this.expirationTime - Date.now() - LOGISTICS_CONFIG.AUTH.REFRESH_THRESHOLD;
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshAuthToken().catch(error => {
          console.error('Scheduled token refresh failed:', error);
        });
      }, refreshTime);
    }
  }

  /**
   * Logout and clear session
   */
  async logout() {
    try {
      if (this.authToken) {
        // Notify server of logout
        await fetch(`${LOGISTICS_CONFIG.BASE_URL}${LOGISTICS_CONFIG.ENDPOINTS.LOGOUT}`, {
          method: 'POST',
          headers: {
            'X-API-Key': this.apiKey,
            'Authorization': `Bearer ${this.authToken}`
          }
        }).catch(() => {}); // Ignore errors during logout
      }
    } finally {
      this.clearSession();
      console.log('🚪 Logged out of Logistics API');
    }
  }

  /**
   * Clear session data
   */
  clearSession() {
    this.authToken = null;
    this.refreshToken = null;
    this.userRole = null;
    this.expirationTime = null;
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear from localStorage
    const keys = ['authToken', 'refreshToken', 'userRole', 'expirationTime'];
    keys.forEach(key => this.removeFromStorage(key));
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!(this.authToken && this.expirationTime && Date.now() < this.expirationTime);
  }

  /**
   * Check if token needs refresh
   */
  needsRefresh() {
    if (!this.expirationTime) return false;
    return Date.now() > (this.expirationTime - LOGISTICS_CONFIG.AUTH.REFRESH_THRESHOLD);
  }

  /**
   * Get current user role
   */
  getUserRole() {
    return this.userRole;
  }

  /**
   * Check if user has required permission level
   */
  hasPermission(requiredRole) {
    if (!this.userRole) return false;
    
    const userLevel = LOGISTICS_CONFIG.ROLE_LEVELS[this.userRole] || 0;
    const requiredLevel = LOGISTICS_CONFIG.ROLE_LEVELS[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  }

  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders() {
    const headers = {};
    
    if (this.apiKey) {
      headers[LOGISTICS_CONFIG.AUTH.API_KEY_HEADER] = this.apiKey;
    }
    
    if (this.authToken) {
      headers[LOGISTICS_CONFIG.AUTH.TOKEN_HEADER] = `${LOGISTICS_CONFIG.AUTH.TOKEN_PREFIX}${this.authToken}`;
    }
    
    return headers;
  }

  /**
   * Save session to localStorage
   */
  saveSession() {
    const sessionData = {
      authToken: this.authToken,
      refreshToken: this.refreshToken,
      userRole: this.userRole,
      expirationTime: this.expirationTime
    };

    Object.entries(sessionData).forEach(([key, value]) => {
      if (value !== null) {
        this.saveToStorage(key, value);
      }
    });
  }

  /**
   * Load session from localStorage
   */
  loadSession() {
    this.apiKey = this.loadFromStorage('apiKey');
    this.authToken = this.loadFromStorage('authToken');
    this.refreshToken = this.loadFromStorage('refreshToken');
    this.userRole = this.loadFromStorage('userRole');
    this.expirationTime = parseInt(this.loadFromStorage('expirationTime')) || null;

    // Check if session is still valid
    if (this.isAuthenticated()) {
      this.scheduleTokenRefresh();
    } else if (this.refreshToken && this.expirationTime) {
      // Try to refresh if token is expired but refresh token exists
      this.refreshAuthToken().catch(() => {
        this.clearSession();
      });
    }
  }

  /**
   * Save data to localStorage with error handling
   */
  saveToStorage(key, value) {
    try {
      const storageKey = `ic_spicy_logistics_${key}`;
      localStorage.setItem(storageKey, value.toString());
    } catch (error) {
      console.warn(`Failed to save ${key} to localStorage:`, error);
    }
  }

  /**
   * Load data from localStorage with error handling
   */
  loadFromStorage(key) {
    try {
      const storageKey = `ic_spicy_logistics_${key}`;
      return localStorage.getItem(storageKey);
    } catch (error) {
      console.warn(`Failed to load ${key} from localStorage:`, error);
      return null;
    }
  }

  /**
   * Remove data from localStorage
   */
  removeFromStorage(key) {
    try {
      const storageKey = `ic_spicy_logistics_${key}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
    }
  }
}

// Export singleton instance
export const logisticsAuth = new LogisticsAuth();
export default LogisticsAuth;


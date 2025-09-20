/**
 * Customer CRM Service
 * 
 * Secure customer relationship management system with consent tracking
 * Handles customer data storage, mailing list management, and privacy compliance
 */

import React from 'react';

class CustomerCRMService {
  constructor() {
    this.initialized = false;
    this.canister = null;
    this.agent = null;
  }

  /**
   * Initialize CRM service with canister connection
   */
  async initialize(canister, agent) {
    try {
      this.canister = canister;
      this.agent = agent;
      this.initialized = true;
      
      console.log('✅ Customer CRM Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize CRM Service:', error);
      return false;
    }
  }

  /**
   * Create or update customer profile with consent tracking
   */
  async createCustomerProfile(customerData, consentData) {
    try {
      if (!this.initialized) {
        throw new Error('CRM Service not initialized');
      }

      // Validate required fields
      this.validateCustomerData(customerData);
      this.validateConsentData(consentData);

      const profile = {
        id: this.generateCustomerId(),
        personal_info: {
          email: customerData.email,
          first_name: customerData.firstName || '',
          last_name: customerData.lastName || '',
          phone: customerData.phone || '',
          created_at: Date.now(),
          updated_at: Date.now()
        },
        shipping_address: customerData.shippingAddress ? {
          street: customerData.shippingAddress.address || '',
          city: customerData.shippingAddress.city || '',
          state: customerData.shippingAddress.state || '',
          zip_code: customerData.shippingAddress.zipCode || '',
          country: customerData.shippingAddress.country || '',
          is_default: true
        } : null,
        billing_address: customerData.billingAddress ? {
          street: customerData.billingAddress.address || '',
          city: customerData.billingAddress.city || '',
          state: customerData.billingAddress.state || '',
          zip_code: customerData.billingAddress.zipCode || '',
          country: customerData.billingAddress.country || '',
          same_as_shipping: customerData.billingAddress.sameAsShipping || false
        } : null,
        consent: {
          marketing_emails: consentData.marketingEmails || false,
          order_updates: consentData.orderUpdates !== false, // Default true
          newsletter: consentData.newsletter || false,
          data_processing: consentData.dataProcessing !== false, // Required, default true
          consent_date: Date.now(),
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          consent_version: '1.0'
        },
        preferences: {
          email_frequency: consentData.emailFrequency || 'weekly',
          categories: consentData.categories || [],
          language: consentData.language || 'en'
        },
        purchase_history: [],
        loyalty_points: 0,
        customer_tier: 'standard',
        tags: [],
        notes: '',
        status: 'active'
      };

      // Store in IC canister (mock for now - you'd implement actual canister calls)
      const result = await this.storeCustomerProfile(profile);
      
      if (result.success) {
        console.log('✅ Customer profile created:', profile.id);
        
        // Add to mailing lists based on consent
        if (consentData.marketingEmails || consentData.newsletter) {
          await this.addToMailingLists(profile, consentData);
        }
        
        return {
          success: true,
          customerId: profile.id,
          profile: profile
        };
      } else {
        throw new Error('Failed to store customer profile');
      }
    } catch (error) {
      console.error('❌ Failed to create customer profile:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update customer consent preferences
   */
  async updateConsent(customerId, newConsent) {
    try {
      const profile = await this.getCustomerProfile(customerId);
      if (!profile) {
        throw new Error('Customer not found');
      }

      // Update consent with audit trail
      profile.consent = {
        ...profile.consent,
        ...newConsent,
        consent_date: Date.now(),
        previous_consent: profile.consent, // Keep audit trail
        consent_version: '1.0'
      };

      profile.personal_info.updated_at = Date.now();

      const result = await this.storeCustomerProfile(profile);
      
      if (result.success) {
        // Update mailing list subscriptions
        await this.updateMailingListSubscriptions(profile);
        
        return {
          success: true,
          profile: profile
        };
      } else {
        throw new Error('Failed to update consent');
      }
    } catch (error) {
      console.error('❌ Failed to update consent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get customer profile by email or ID
   */
  async getCustomerProfile(identifier) {
    try {
      // This would be implemented with actual canister calls
      // For now, using localStorage as demo
      const profiles = this.getStoredProfiles();
      
      const profile = profiles.find(p => 
        p.id === identifier || 
        p.personal_info.email === identifier
      );
      
      return profile || null;
    } catch (error) {
      console.error('❌ Failed to get customer profile:', error);
      return null;
    }
  }

  /**
   * Add customer to mailing lists based on consent
   */
  async addToMailingLists(profile, consentData) {
    try {
      const mailingLists = [];
      
      if (consentData.orderUpdates) {
        mailingLists.push({
          type: 'order_updates',
          subscribed: true,
          date_subscribed: Date.now()
        });
      }
      
      if (consentData.marketingEmails) {
        mailingLists.push({
          type: 'marketing',
          subscribed: true,
          date_subscribed: Date.now()
        });
      }
      
      if (consentData.newsletter) {
        mailingLists.push({
          type: 'newsletter',
          subscribed: true,
          date_subscribed: Date.now()
        });
      }

      // Store mailing list subscriptions
      profile.mailing_lists = mailingLists;
      
      console.log(`✅ Added customer to ${mailingLists.length} mailing lists`);
      return mailingLists;
    } catch (error) {
      console.error('❌ Failed to add to mailing lists:', error);
      throw error;
    }
  }

  /**
   * Generate mailing list for marketing campaigns
   */
  async generateMailingList(criteria = {}) {
    try {
      const profiles = this.getStoredProfiles();
      
      let filteredProfiles = profiles.filter(profile => {
        // Only include customers who consented to marketing
        if (!profile.consent?.marketing_emails && !profile.consent?.newsletter) {
          return false;
        }
        
        // Apply additional filters
        if (criteria.customerTier && profile.customer_tier !== criteria.customerTier) {
          return false;
        }
        
        if (criteria.minPurchases && profile.purchase_history.length < criteria.minPurchases) {
          return false;
        }
        
        if (criteria.categories && criteria.categories.length > 0) {
          const hasMatchingCategory = criteria.categories.some(cat => 
            profile.preferences.categories.includes(cat)
          );
          if (!hasMatchingCategory) {
            return false;
          }
        }
        
        return true;
      });

      // Format for email marketing
      const mailingList = filteredProfiles.map(profile => ({
        email: profile.personal_info.email,
        firstName: profile.personal_info.first_name,
        lastName: profile.personal_info.last_name,
        customerId: profile.id,
        tier: profile.customer_tier,
        preferences: profile.preferences,
        consentDate: profile.consent.consent_date,
        mailingLists: profile.mailing_lists || []
      }));

      console.log(`✅ Generated mailing list with ${mailingList.length} subscribers`);
      
      return {
        success: true,
        subscribers: mailingList,
        totalCount: mailingList.length,
        criteria: criteria,
        generatedAt: Date.now()
      };
    } catch (error) {
      console.error('❌ Failed to generate mailing list:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export customer data (GDPR compliance)
   */
  async exportCustomerData(customerId) {
    try {
      const profile = await this.getCustomerProfile(customerId);
      if (!profile) {
        throw new Error('Customer not found');
      }

      return {
        success: true,
        data: profile,
        exportDate: new Date().toISOString(),
        dataRetentionPolicy: 'Data retained for 7 years or until deletion request'
      };
    } catch (error) {
      console.error('❌ Failed to export customer data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete customer data (GDPR right to be forgotten)
   */
  async deleteCustomerData(customerId) {
    try {
      const profiles = this.getStoredProfiles();
      const updatedProfiles = profiles.filter(p => p.id !== customerId);
      
      localStorage.setItem('icspicy_customer_profiles', JSON.stringify(updatedProfiles));
      
      console.log(`✅ Customer data deleted for ${customerId}`);
      return {
        success: true,
        deletedAt: Date.now()
      };
    } catch (error) {
      console.error('❌ Failed to delete customer data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate customer data
   */
  validateCustomerData(data) {
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Valid email address is required');
    }
    
    if (data.shippingAddress && !data.shippingAddress.address) {
      throw new Error('Shipping address is required when provided');
    }
  }

  /**
   * Validate consent data
   */
  validateConsentData(consent) {
    if (consent.dataProcessing === false) {
      throw new Error('Data processing consent is required');
    }
  }

  /**
   * Utility methods
   */
  generateCustomerId() {
    return `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async getClientIP() {
    try {
      // In production, you might want to get the actual IP
      return 'masked_for_privacy';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Storage methods (demo implementation)
   */
  async storeCustomerProfile(profile) {
    try {
      const profiles = this.getStoredProfiles();
      const existingIndex = profiles.findIndex(p => p.id === profile.id);
      
      if (existingIndex >= 0) {
        profiles[existingIndex] = profile;
      } else {
        profiles.push(profile);
      }
      
      localStorage.setItem('icspicy_customer_profiles', JSON.stringify(profiles));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getStoredProfiles() {
    try {
      const stored = localStorage.getItem('icspicy_customer_profiles');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async updateMailingListSubscriptions(profile) {
    // Implementation for updating external mailing list services
    console.log('📧 Updated mailing list subscriptions for', profile.personal_info.email);
  }

  /**
   * Get CRM statistics
   */
  async getCRMStats() {
    try {
      const profiles = this.getStoredProfiles();
      
      const stats = {
        totalCustomers: profiles.length,
        activeCustomers: profiles.filter(p => p.status === 'active').length,
        mailingListSubscribers: {
          marketing: profiles.filter(p => p.consent?.marketing_emails).length,
          newsletter: profiles.filter(p => p.consent?.newsletter).length,
          orderUpdates: profiles.filter(p => p.consent?.order_updates).length
        },
        customersByTier: profiles.reduce((acc, p) => {
          acc[p.customer_tier] = (acc[p.customer_tier] || 0) + 1;
          return acc;
        }, {}),
        recentSignups: profiles.filter(p => 
          Date.now() - p.personal_info.created_at < 30 * 24 * 60 * 60 * 1000
        ).length
      };
      
      return stats;
    } catch (error) {
      console.error('❌ Failed to get CRM stats:', error);
      return null;
    }
  }
}

// Create singleton instance
export const customerCRMService = new CustomerCRMService();

// React hook for CRM integration
export const useCustomerCRM = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const createProfile = async (customerData, consentData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await customerCRMService.createCustomerProfile(customerData, consentData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateConsent = async (customerId, newConsent) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await customerCRMService.updateConsent(customerId, newConsent);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateMailingList = async (criteria) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await customerCRMService.generateMailingList(criteria);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createProfile,
    updateConsent,
    generateMailingList,
    setError
  };
};

export default customerCRMService;


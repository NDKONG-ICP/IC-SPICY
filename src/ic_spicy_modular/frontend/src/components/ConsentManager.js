/**
 * Consent Manager Component
 * 
 * Handles customer privacy consent and mailing list authorizations
 * GDPR compliant with clear opt-in/opt-out controls
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ConsentManager = ({ 
  onConsentChange, 
  initialConsent = {},
  showTitle = true,
  className = ""
}) => {
  const [consent, setConsent] = useState({
    dataProcessing: initialConsent.dataProcessing !== false, // Required, default true
    orderUpdates: initialConsent.orderUpdates !== false, // Default true
    marketingEmails: initialConsent.marketingEmails || false,
    newsletter: initialConsent.newsletter || false,
    analytics: initialConsent.analytics !== false, // Default true
    emailFrequency: initialConsent.emailFrequency || 'weekly',
    categories: initialConsent.categories || [],
    language: initialConsent.language || 'en',
    ...initialConsent
  });

  const [showDetails, setShowDetails] = useState(false);

  const handleConsentChange = (key, value) => {
    const newConsent = { ...consent, [key]: value };
    setConsent(newConsent);
    onConsentChange?.(newConsent);
  };

  const handleCategoryToggle = (category) => {
    const newCategories = consent.categories.includes(category)
      ? consent.categories.filter(c => c !== category)
      : [...consent.categories, category];
    
    handleConsentChange('categories', newCategories);
  };

  const ConsentToggle = ({ 
    id, 
    label, 
    description, 
    required = false, 
    checked, 
    onChange,
    icon = "📧"
  }) => (
    <div className="flex items-start space-x-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
      <div className="flex items-center h-5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={required}
          className={`
            w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500
            ${required ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 cursor-pointer'}
          `}
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <label htmlFor={id} className={`font-medium ${required ? 'text-gray-600' : 'text-gray-900 cursor-pointer'}`}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        </div>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
        {required && (
          <p className="text-xs text-gray-500 mt-1 italic">Required for service operation</p>
        )}
      </div>
    </div>
  );

  const availableCategories = [
    { id: 'plants', label: 'Chili Plants & Seeds', icon: '🌶️' },
    { id: 'accessories', label: 'Growing Accessories', icon: '🧰' },
    { id: 'recipes', label: 'Recipes & Cooking', icon: '👨‍🍳' },
    { id: 'events', label: 'Events & Workshops', icon: '📅' },
    { id: 'community', label: 'Community Updates', icon: '👥' }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {showTitle && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🔒 Privacy & Communication Preferences
          </h3>
          <p className="text-sm text-gray-600">
            Choose how we can communicate with you and use your information. You can change these settings anytime.
          </p>
        </div>
      )}

      {/* Required Consents */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Required Permissions</h4>
        <div className="space-y-3">
          <ConsentToggle
            id="dataProcessing"
            label="Data Processing"
            description="Allow us to process your order and shipping information to fulfill your purchases."
            required={true}
            checked={consent.dataProcessing}
            onChange={(value) => handleConsentChange('dataProcessing', value)}
            icon="🔐"
          />
          
          <ConsentToggle
            id="orderUpdates"
            label="Order Updates"
            description="Receive important updates about your orders, shipping, and delivery status."
            checked={consent.orderUpdates}
            onChange={(value) => handleConsentChange('orderUpdates', value)}
            icon="📦"
          />

          <ConsentToggle
            id="analytics"
            label="Anonymous Analytics"
            description="Help us improve our service with anonymous usage analytics (no personal data shared)."
            checked={consent.analytics}
            onChange={(value) => handleConsentChange('analytics', value)}
            icon="📊"
          />
        </div>
      </div>

      {/* Optional Marketing Consents */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Optional Communications</h4>
        <div className="space-y-3">
          <ConsentToggle
            id="marketingEmails"
            label="Marketing Emails"
            description="Receive special offers, promotions, and product recommendations from IC SPICY."
            checked={consent.marketingEmails}
            onChange={(value) => handleConsentChange('marketingEmails', value)}
            icon="🎯"
          />
          
          <ConsentToggle
            id="newsletter"
            label="Newsletter Subscription"
            description="Get our weekly newsletter with growing tips, new varieties, and community stories."
            checked={consent.newsletter}
            onChange={(value) => handleConsentChange('newsletter', value)}
            icon="📰"
          />
        </div>
      </div>

      {/* Email Preferences */}
      <AnimatePresence>
        {(consent.marketingEmails || consent.newsletter) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <h4 className="font-medium text-gray-900">Email Preferences</h4>
            
            {/* Email Frequency */}
            <div className="bg-blue-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                📅 Email Frequency
              </label>
              <select
                value={consent.emailFrequency}
                onChange={(e) => handleConsentChange('emailFrequency', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="daily">Daily Updates</option>
                <option value="weekly">Weekly Digest</option>
                <option value="monthly">Monthly Newsletter</option>
                <option value="important">Important Only</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                How often would you like to receive emails from us?
              </p>
            </div>

            {/* Interest Categories */}
            <div className="bg-green-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                🎯 Topics of Interest
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableCategories.map(category => (
                  <label
                    key={category.id}
                    className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-green-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={consent.categories.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-lg">{category.icon}</span>
                    <span className="text-sm text-gray-700">{category.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Select topics you're interested in to receive relevant content.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Details */}
      <div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          <span>{showDetails ? '▼' : '▶'}</span>
          <span>Privacy & Data Protection Details</span>
        </button>
        
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 space-y-3"
            >
              <div>
                <h5 className="font-medium text-gray-900 mb-1">🔒 Data Security</h5>
                <p>Your personal information is encrypted and securely stored on the Internet Computer blockchain. We use industry-standard security measures to protect your data.</p>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-900 mb-1">📧 Unsubscribe Anytime</h5>
                <p>You can unsubscribe from any marketing communications at any time by clicking the unsubscribe link in emails or updating your preferences in your account.</p>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-900 mb-1">🌍 Data Rights</h5>
                <p>You have the right to access, correct, or delete your personal data. Contact us to exercise your data protection rights under GDPR and other privacy laws.</p>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-900 mb-1">📊 Data Usage</h5>
                <p>We only use your data for the purposes you've consented to. We never sell your personal information to third parties.</p>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  Last updated: {new Date().toLocaleDateString()} • 
                  <a href="/privacy" className="text-blue-600 hover:underline ml-1">
                    View Privacy Policy
                  </a>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Consent Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">📋 Your Consent Summary</h4>
        <div className="text-sm space-y-1">
          <p className="text-blue-800">
            ✅ <strong>Required:</strong> Data processing, Order updates
            {consent.analytics && ', Anonymous analytics'}
          </p>
          {(consent.marketingEmails || consent.newsletter) && (
            <p className="text-blue-800">
              📧 <strong>Marketing:</strong> 
              {consent.marketingEmails && ' Marketing emails'}
              {consent.marketingEmails && consent.newsletter && ','}
              {consent.newsletter && ' Newsletter'}
              {' '}({consent.emailFrequency})
            </p>
          )}
          {consent.categories.length > 0 && (
            <p className="text-blue-800">
              🎯 <strong>Interests:</strong> {consent.categories.length} topic{consent.categories.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        <p className="text-xs text-blue-600 mt-2">
          These preferences are saved with your order and can be updated anytime.
        </p>
      </div>
    </div>
  );
};

export default ConsentManager;


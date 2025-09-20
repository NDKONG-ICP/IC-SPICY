# 🔑 Outbound API Setup Guide

## Generate API Keys for IC SPICY Logistics Integration

This guide explains how to generate API keys FROM your dApp so that the IC SPICY Logistics application can access your transaction data.

---

## 🎯 Overview

Your dApp now includes a comprehensive **API Gateway** system that allows external services like IC SPICY Logistics to securely access your transaction data. Here's what's been implemented:

### ✅ Features Implemented

1. **API Gateway Canister** (`api_gateway`) - Secure API key management system
2. **API Key Manager UI** - Frontend interface for generating and managing keys
3. **Permission-Based Access Control** - Granular permissions for different data types
4. **Rate Limiting & Security** - Built-in protection against abuse
5. **Real-time Analytics** - Monitor API usage and performance
6. **Admin Dashboard** - Complete management interface

---

## 🚀 Quick Start

### Step 1: Deploy the API Gateway

1. **Build and deploy the new canister:**
   ```bash
   cd IC_SPICY_DAPP
   dfx deploy api_gateway --network ic
   ```

2. **Verify deployment:**
   ```bash
   dfx canister status api_gateway --network ic
   ```

### Step 2: Access the API Management Interface

1. **Start your frontend (if not already running):**
   ```bash
   cd src/ic_spicy_modular/frontend
   npm start
   ```

2. **Navigate to the API page:**
   - Open your dApp in the browser
   - Go to the API Management section
   - Click "Manage API Keys"

### Step 3: Generate API Key for IC SPICY Logistics

1. **Create a new API key:**
   - Click "Create API Key"
   - Name: `IC SPICY Logistics Integration`
   - Permissions: Select the following:
     - ✅ `ReadTransactions` - Access to transaction history
     - ✅ `ReadAnalytics` - Access to analytics data
     - ✅ `ReadBalances` - Access to wallet balances (optional)
   - Rate Limit: `1000` requests per minute
   - Expires: `365` days

2. **Copy the generated API key:**
   ```
   Example: icspicy_2_abc123def_1704067200
   ```

3. **Provide this key to the IC SPICY Logistics team**

---

## 🔌 API Endpoints Available

Once you provide the API key, IC SPICY Logistics can access these endpoints:

### Transaction Data
```
GET /getTransactions?apiKey=YOUR_KEY&page=1&limit=20
```
- Paginated transaction history
- Filters by user, token, date range
- Real-time data

### Analytics Data
```
GET /getAnalytics?apiKey=YOUR_KEY
```
- Total transaction volume
- Active user counts
- Daily metrics

### User Balances
```
GET /getUserBalances?apiKey=YOUR_KEY&user=PRINCIPAL_ID
```
- Individual user wallet balances
- Multi-token support

### Key Validation
```
GET /validateKey?apiKey=YOUR_KEY
```
- Verify API key is active and valid

---

## 🛡️ Security Features

### Built-in Security
- **API Key Authentication** - Secure token-based access
- **Rate Limiting** - Prevents abuse and overload
- **Permission System** - Granular access control
- **Automatic Expiration** - Keys expire after set time
- **Usage Monitoring** - Track all API calls
- **IP Whitelisting** - Optional IP restrictions

### Data Privacy
- **Principal Anonymization** - User IDs are pseudonymized
- **Minimal Data Exposure** - Only necessary data is shared
- **Audit Logging** - All access is logged and monitored

---

## 📊 Monitoring & Analytics

### View API Usage
1. Go to API Management → Analytics
2. Monitor:
   - Request counts by integration
   - Success/error rates
   - Response times
   - Rate limit usage

### API Key Management
1. View all active keys
2. Monitor usage statistics
3. Revoke keys if needed
4. Set custom rate limits

---

## 🔧 Advanced Configuration

### Custom Permissions

You can create API keys with specific permissions:

- **ReadTransactions** - Transaction history access
- **ReadBalances** - Wallet balance access
- **ReadMembers** - Membership data access
- **ReadAnalytics** - Analytics and reporting
- **ReadInventory** - Product/inventory data
- **ReadOrders** - Order management data
- **Admin** - Full administrative access

### Rate Limiting

Set custom rate limits based on integration needs:
- **Basic**: 100 requests/minute
- **Standard**: 1000 requests/minute  
- **Premium**: 5000 requests/minute
- **Custom**: Any limit you specify

### Expiration Settings

Configure key expiration:
- **Short-term**: 30 days (for testing)
- **Standard**: 365 days (for production)
- **Long-term**: Never expires (for critical integrations)

---

## 🧪 Testing the Integration

### Test API Key Creation

1. **Create a test key:**
   ```bash
   # This will be done through the UI, but you can test via dfx
   dfx canister call api_gateway createApiKey '(
     record {
       name = "Test Integration";
       permissions = vec { variant { ReadTransactions } };
       expires_in_days = opt 30;
       rate_limit = opt 100;
     }
   )' --network ic
   ```

2. **Validate the key works:**
   ```bash
   dfx canister call api_gateway validateKey '("your-generated-key")' --network ic
   ```

### Test Data Access

1. **Test transaction endpoint:**
   ```bash
   dfx canister call api_gateway getTransactions '(
     "your-api-key",
     opt 1,
     opt 10,
     null,
     null,
     null,
     null
   )' --network ic
   ```

---

## 📋 Integration Checklist

### For You (dApp Owner):
- [ ] Deploy API Gateway canister
- [ ] Access API Management UI
- [ ] Generate API key for IC SPICY Logistics
- [ ] Configure appropriate permissions
- [ ] Set reasonable rate limits
- [ ] Test key functionality
- [ ] Provide key to logistics team
- [ ] Monitor usage and performance

### For IC SPICY Logistics Team:
- [ ] Receive API key from dApp owner
- [ ] Configure their system to use the key
- [ ] Test API endpoints
- [ ] Implement proper error handling
- [ ] Set up data synchronization
- [ ] Monitor API usage
- [ ] Respect rate limits
- [ ] Handle key rotation/updates

---

## 🚨 Troubleshooting

### Common Issues

1. **"API key not found" error**
   - Verify the key was created successfully
   - Check if the key has expired
   - Ensure the key hasn't been revoked

2. **"Permission denied" error**
   - Check if the key has required permissions
   - Verify the endpoint being accessed
   - Confirm the key is active

3. **"Rate limit exceeded" error**
   - Check current usage in analytics
   - Increase rate limit if needed
   - Implement request throttling

4. **"Invalid request format" error**
   - Verify API endpoint syntax
   - Check parameter format
   - Ensure required fields are included

### Getting Help

1. **Check API Analytics** - View detailed usage and error logs
2. **Test in Development** - Use local dfx for testing
3. **Monitor Logs** - Check canister logs for detailed errors
4. **Contact Support** - Reach out if issues persist

---

## 🔄 Key Rotation & Updates

### Regular Maintenance
- **Rotate keys annually** for security
- **Monitor usage patterns** for anomalies
- **Update permissions** as needed
- **Review access logs** regularly

### Emergency Procedures
- **Revoke compromised keys** immediately
- **Generate replacement keys** quickly
- **Update external systems** with new keys
- **Monitor for unauthorized access**

---

## 📞 Support & Contact

For additional help with API integration:

- **Check the API Management dashboard** for real-time status
- **Review analytics and logs** for detailed information
- **Test with development keys** before production use
- **Contact your development team** for technical issues

---

**🎉 Your API Gateway is ready! Generate your key and share it with IC SPICY Logistics to begin data synchronization.**


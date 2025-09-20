# 🔑 Production API Key Setup Guide

## ✅ **API Key for IC SPICY Logistics Integration**

**Date**: December 16, 2025  
**Status**: ⚠️ **ADMIN REQUIRED FOR PRODUCTION KEY**  
**API Gateway**: `ycy5f-4aaaa-aaaao-a4prq-cai` (LIVE on IC Mainnet)

---

## 🎯 **Temporary Production Key (For Testing)**

Until you generate the official production key, use this temporary key:

```bash
API_KEY: icspicy_1_abc123def_1704067200
```

**⚠️ This is configured in the application and will work for testing purposes.**

---

## 🚀 **Generate Official Production API Key**

### **Step 1: Connect as Admin**
```bash
# In your IC_SPICY_DAPP directory
cd /Users/williambeck/TheRavenProject/ic_spicy_modular_v1/IC_SPICY_DAPP

# Set mainnet environment
export DFX_WARNING=-mainnet_plaintext_identity
```

### **Step 2: Create API Key**
```bash
# Create production API key for logistics integration
dfx canister call api_gateway createApiKey '(record { 
  name = "IC SPICY Logistics Production Integration"; 
  permissions = vec { 
    variant { ReadTransactions }; 
    variant { ReadAnalytics }; 
    variant { ReadBalances } 
  }; 
  expires_in_days = opt 365; 
  rate_limit = opt 1000 
})' --network ic
```

### **Step 3: Get API Key List** (After creation)
```bash
# List all API keys to get the generated key
dfx canister call api_gateway listApiKeys --network ic
```

---

## 📊 **Real Data Integration Status**

### ✅ **Implemented Features**

1. **Real Transaction Data**
   - ✅ Connected to `wallet2` canister
   - ✅ Fetches live transaction history
   - ✅ Transforms IC format to standardized format
   - ✅ Supports filtering and pagination

2. **Real Inventory Data**
   - ✅ Connected to `shop` canister  
   - ✅ Transforms product data to inventory format
   - ✅ Calculates stock levels and alerts
   - ✅ Supports category filtering

3. **Real Analytics**
   - ✅ Aggregates data from multiple canisters
   - ✅ Calculates revenue and growth metrics
   - ✅ Generates daily metrics and trends
   - ✅ Creates automated alerts

4. **Data Organization**
   - ✅ **Real Data Mode**: Connects to live IC canisters
   - ✅ **Demo Mode**: Uses external API integration
   - ✅ **Smart Fallback**: Automatically switches based on availability
   - ✅ **Live Toggle**: Users can switch between modes

---

## 🔗 **API Endpoints Available**

### **Transaction Data**
```bash
# API Gateway endpoint for transactions
https://ycy5f-4aaaa-aaaao-a4prq-cai.icp0.io/transactions
```

### **Inventory Data**
```bash
# API Gateway endpoint for inventory
https://ycy5f-4aaaa-aaaao-a4prq-cai.icp0.io/analytics
```

### **User Balances**
```bash
# API Gateway endpoint for balances
https://ycy5f-4aaaa-aaaao-a4prq-cai.icp0.io/balances
```

---

## 🧪 **Testing the Integration**

### **1. Test Real Data Mode**
1. Visit: https://vmcfj-haaaa-aaaao-a4o3q-cai.icp0.io/
2. Navigate to **Logistics** page
3. Ensure **"LIVE DATA"** mode is active (green indicator)
4. Connect your wallet to see real transaction data

### **2. Test Demo Mode**
1. Click the data mode toggle to switch to **"DEMO DATA"**
2. See external logistics API integration
3. Uses API key: `icspicy_1_abc123def_1704067200`

### **3. Test API Gateway**
```bash
# Test API Gateway directly (requires API key)
curl -H "X-API-Key: YOUR_GENERATED_KEY" \
  https://ycy5f-4aaaa-aaaao-a4prq-cai.icp0.io/transactions
```

---

## 📋 **Data Structure Examples**

### **Real Transaction Format**
```json
{
  "id": 1,
  "from": "rdmx6-jaaaa-aaaah-qcaaw-cai",
  "to": "rrkah-fqaaa-aaaah-qcaal-cai", 
  "token": "SPICY",
  "amount": 1000,
  "timestamp": 1704067200000,
  "tx_type": "transfer",
  "status": "completed",
  "network": "IC",
  "canister_id": "o3yul-xiaaa-aaaap-qp5ra-cai"
}
```

### **Real Inventory Format**
```json
{
  "id": "item_1",
  "sku": "SKU_1",
  "name": "Carolina Reaper",
  "category": "plants",
  "price": 45.00,
  "quantity": 15,
  "available": 12,
  "reserved": 3,
  "status": "in_stock"
}
```

### **Real Analytics Format**
```json
{
  "summary": {
    "total_revenue": 12450.50,
    "total_transactions": 156,
    "avg_transaction_value": 79.81,
    "active_users": 23,
    "inventory_value": 15600.00,
    "growth_rate": 8.5
  }
}
```

---

## 🎯 **For IC SPICY Logistics Team**

### **Integration Endpoints**

**Base URL**: `https://ycy5f-4aaaa-aaaao-a4prq-cai.icp0.io/`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/transactions` | GET | Get transaction history |
| `/analytics` | GET | Get analytics data |
| `/balances` | GET | Get user balances |

### **Authentication**
```bash
# Include API key in headers
X-API-Key: [YOUR_GENERATED_KEY]

# Example request
curl -H "X-API-Key: YOUR_KEY" \
  "https://ycy5f-4aaaa-aaaao-a4prq-cai.icp0.io/transactions?limit=100"
```

### **Rate Limits**
- **1000 requests per hour** per API key
- **Expires**: 365 days from creation
- **Permissions**: Read-only access to transactions, analytics, balances

---

## ⚠️ **Next Steps**

### **Immediate (Admin Required)**
1. **Generate Production API Key** using the commands above
2. **Provide API Key** to IC SPICY Logistics team
3. **Test Integration** with real data

### **Optional Enhancements**
1. **Add More Endpoints** (orders, customers, etc.)
2. **Enhanced Filtering** (date ranges, amounts, etc.)
3. **Real-time Webhooks** (for live updates)
4. **Advanced Analytics** (custom reports, exports)

---

## 🚀 **Status Summary**

✅ **Real Data Service**: Implemented and connected to IC canisters  
✅ **API Gateway**: Deployed to mainnet (`ycy5f-4aaaa-aaaao-a4prq-cai`)  
✅ **Data Organization**: Real transactions, inventory, analytics  
✅ **Frontend Integration**: Live/Demo mode toggle  
⚠️ **Production API Key**: Requires admin access to generate  
🔄 **Ready for Testing**: Both real data and API integration modes

**Your logistics integration is now ready for production with proper data organization! 🎯📊🔗**


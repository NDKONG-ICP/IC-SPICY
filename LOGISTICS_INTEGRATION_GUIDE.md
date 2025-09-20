# 🚚 IC SPICY Logistics API Integration Guide

This guide will help you connect your dApp to the IC SPICY Logistics application at `https://icspicy-logistics-ynt.caffeine.xyz` using an API key.

## 🎯 Overview

Your dApp already has a comprehensive logistics integration built-in with the following features:

- ✅ **API Configuration Management** - Secure handling of API keys and settings
- ✅ **Comprehensive Logistics Dashboard** - Orders, transactions, inventory, and analytics
- ✅ **Real-time Data Sync** - Live updates from the logistics system
- ✅ **Error Handling & Retry Logic** - Robust connection management
- ✅ **Role-based Access Control** - Different permission levels
- ✅ **Development & Production Modes** - Environment-specific settings

## 🔧 Quick Setup

### Method 1: Interactive Setup Script (Recommended)

1. **Run the setup script:**
   ```bash
   cd IC_SPICY_DAPP
   node setup_logistics_api.js
   ```

2. **Follow the prompts:**
   - Enter your API key from the logistics system
   - Choose your environment (development/staging/production)
   - Enable/disable debug mode

3. **Restart your development server:**
   ```bash
   npm start
   # or
   dfx start --clean --background && dfx deploy
   ```

### Method 2: Manual Environment Configuration

1. **Create a `.env` file in the `IC_SPICY_DAPP` directory:**
   ```bash
   # IC SPICY Logistics API Configuration
   REACT_APP_LOGISTICS_API_KEY=your-actual-api-key-here
   REACT_APP_LOGISTICS_BASE_URL=https://icspicy-logistics-ynt.caffeine.xyz/api/v1
   REACT_APP_LOGISTICS_ENVIRONMENT=production
   REACT_APP_ENABLE_LOGISTICS_SYNC=true
   REACT_APP_DEBUG_LOGISTICS=false
   ```

2. **Replace `your-actual-api-key-here` with your real API key**

3. **Restart your development server**

## 🔑 Getting Your API Key

1. **Contact the IC SPICY Logistics team:**
   - Visit: `https://icspicy-logistics-ynt.caffeine.xyz`
   - Request API access for your dApp integration
   - Provide your dApp's domain and use case

2. **API Key Requirements:**
   - The API key should be a secure token provided by the logistics system
   - Keep it confidential and never commit it to version control
   - Use different keys for development, staging, and production environments

## 📱 Using the Logistics Features

### Access the Logistics Dashboard

1. **Start your dApp:**
   ```bash
   npm start
   ```

2. **Navigate to the Logistics page in your dApp**

3. **Features available:**
   - 📊 **Dashboard** - Overview of logistics operations
   - 📦 **Orders** - Order management and tracking
   - 💳 **Transactions** - Payment and transaction history
   - 📋 **Inventory** - Stock management and alerts
   - 📈 **Analytics** - Reports and insights
   - 🔧 **API Demo** - Test API connections

### API Configuration Manager

Access the built-in API configuration manager to:
- ✅ View current configuration status
- 🧪 Test API connections
- 🔍 Validate API key functionality
- 📋 Get setup instructions

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `REACT_APP_LOGISTICS_API_KEY` | Your API key from logistics system | `demo-api-key-dev` | `lgs_1234567890abcdef` |
| `REACT_APP_LOGISTICS_BASE_URL` | API base URL | `https://icspicy-logistics-ynt.caffeine.xyz/api/v1` | Same |
| `REACT_APP_LOGISTICS_ENVIRONMENT` | Environment setting | `production` | `development`, `staging`, `production` |
| `REACT_APP_ENABLE_LOGISTICS_SYNC` | Enable real-time sync | `true` | `true` or `false` |
| `REACT_APP_DEBUG_LOGISTICS` | Debug mode | `false` | `true` or `false` |

### Feature Flags

The system includes several feature flags that can be configured:

- **Real-time Updates** - Live data synchronization
- **Bulk Operations** - Batch processing capabilities
- **Advanced Filtering** - Enhanced search and filter options
- **Export Reports** - Data export functionality
- **Webhook Notifications** - Event-driven updates

## 🧪 Testing Your Integration

### 1. Configuration Validation

Check if your configuration is valid:
```javascript
import { getConfigStatus } from './src/config/apiKeys';

const status = getConfigStatus();
console.log('Configuration Status:', status);
```

### 2. API Connection Test

Use the built-in test tools:
1. Navigate to the Logistics page
2. Click "API Demo" section
3. Use the connection test feature
4. Verify successful API communication

### 3. Development Console

Enable debug mode to see detailed logs:
```bash
REACT_APP_DEBUG_LOGISTICS=true npm start
```

## 🚨 Troubleshooting

### Common Issues

1. **"API Key Missing" Error**
   - Ensure `REACT_APP_LOGISTICS_API_KEY` is set in your `.env` file
   - Restart your development server after adding the key

2. **"Connection Failed" Error**
   - Verify your internet connection
   - Check if the logistics system is online
   - Confirm your API key is valid and not expired

3. **"Unauthorized" Error**
   - Your API key may be invalid or expired
   - Contact the logistics team to verify your key
   - Ensure you're using the correct environment (dev/staging/prod)

4. **"Environment Variables Not Loading"**
   - Environment variables must start with `REACT_APP_`
   - Restart your development server after changes
   - Check for typos in variable names

### Debug Information

Enable debug mode to get detailed information:
```bash
# In your .env file
REACT_APP_DEBUG_LOGISTICS=true
```

This will log:
- API requests and responses
- Configuration validation results
- Connection status changes
- Error details and retry attempts

## 🛡️ Security Best Practices

1. **API Key Security:**
   - Never commit API keys to version control
   - Use different keys for different environments
   - Rotate keys regularly
   - Store production keys securely

2. **Environment Configuration:**
   - Use `.env.local` for local development
   - Use environment-specific deployment configs
   - Validate configuration on startup

3. **Error Handling:**
   - Don't expose sensitive error details to users
   - Log security-relevant events
   - Implement rate limiting for API calls

## 📚 API Documentation

### Available Endpoints

The logistics system provides these main endpoints:

- `/health` - System health check
- `/auth` - Authentication management  
- `/orders` - Order operations
- `/transactions` - Payment transactions
- `/inventory` - Stock management
- `/analytics` - Reports and metrics
- `/webhooks` - Event notifications

### Authentication

All API requests require:
```javascript
headers: {
  'X-API-Key': 'your-api-key-here',
  'Content-Type': 'application/json'
}
```

## 🎉 Next Steps

After successful setup:

1. **Explore the Logistics Dashboard** - Familiarize yourself with available features
2. **Configure Webhooks** - Set up real-time notifications for your dApp
3. **Customize Analytics** - Tailor reports to your business needs
4. **Integrate Order Flow** - Connect your dApp's ordering system
5. **Set up Monitoring** - Monitor API usage and performance

## 🤝 Support

For additional help:

- 📧 Contact IC SPICY Logistics support
- 🌐 Visit the logistics system documentation
- 🔧 Use the built-in API configuration manager
- 📋 Check the browser console for debug information

---

**Happy Logistics Integration! 🚚✨**


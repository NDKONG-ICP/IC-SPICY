# Cronos Integration Configuration

This directory contains configuration files for the Cronos blockchain integration in the IC Spicy dApp.

## Files

### `cronos.js`
Main configuration file for Cronos blockchain settings.

## Configuration Options

### Basic Settings
- `chainId`: Cronos mainnet chain ID (0x19)
- `chainName`: Display name for the network
- `rpcUrls`: Array of RPC endpoints for connecting to Cronos
- `blockExplorerUrls`: Array of block explorer URLs

### Payment Settings
- `recipientAddress`: The address that will receive payments (UPDATE THIS BEFORE DEPLOYMENT)
- `minPaymentAmount`: Minimum payment amount in CRO
- `maxPaymentAmount`: Maximum payment amount in CRO

### Supported Tokens
Currently supports:
- **CRO**: Native Cronos token (enabled)
- **USDC**: USD Coin on Cronos (coming soon)
- **USDT**: Tether on Cronos (coming soon)

Each token has:
- `symbol`: Token symbol
- `name`: Display name
- `decimals`: Token decimal places
- `icon`: Emoji icon
- `color`: CSS gradient colors
- `description`: Token description
- `contractAddress`: ERC-20 contract address (null for native CRO)
- `enabled`: Whether the token is currently enabled

## Setup Instructions

### 1. Update Recipient Address
Before deploying, update the `recipientAddress` in `cronos.js`:

```javascript
recipientAddress: '0xYOUR_ACTUAL_RECIPIENT_ADDRESS_HERE'
```

### 2. Configure RPC Endpoints
If needed, update the RPC endpoints:

```javascript
rpcUrls: [
  'https://evm.cronos.org',
  'https://cronos-rpc.crypto.org'
]
```

### 3. Enable/Disable Tokens
To enable or disable specific tokens, update the `enabled` property:

```javascript
USDC: {
  // ... other properties
  enabled: true // Set to true to enable USDC payments
}
```

## Usage

### Frontend Integration
The configuration is imported and used in the `CryptoComPayPage.js`:

```javascript
import { CRONOS_CONFIG, validateTransactionHash, formatCROAmount } from '../config/cronos';
```

### Helper Functions
- `formatCROAmount(amount, decimals)`: Formats CRO amounts with specified decimal places
- `validateTransactionHash(hash)`: Validates transaction hash format
- `getCronosNetworkInfo()`: Returns network information for wallet connections

## Security Notes

1. **Never commit real recipient addresses** to version control
2. **Use environment variables** for sensitive configuration in production
3. **Validate all inputs** before processing payments
4. **Test thoroughly** on testnet before mainnet deployment

## Testing

### Testnet Configuration
For testing, you can create a testnet configuration:

```javascript
export const CRONOS_TESTNET_CONFIG = {
  chainId: '0x152', // Cronos testnet
  chainName: 'Cronos Testnet',
  // ... other settings
};
```

### Manual Payment Verification
The system includes a manual payment verification feature where users can:
1. Make a payment on Cronos
2. Copy the transaction hash
3. Verify the payment in the dApp

## Future Enhancements

- [ ] ERC-20 token payment support (USDC, USDT)
- [ ] Multi-signature wallet support
- [ ] Payment scheduling
- [ ] Recurring payments
- [ ] Payment analytics and reporting
- [ ] Integration with Cronos DeFi protocols

## Support

For issues or questions about the Cronos integration:
1. Check the Cronos documentation: https://docs.cronos.org/
2. Review the Cronoscan API: https://cronoscan.com/apis
3. Check the IC Spicy dApp repository for updates

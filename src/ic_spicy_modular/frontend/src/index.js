import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import '@nfid/identitykit/react/styles.css';
import { IdentityKitProvider } from '@nfid/identitykit/react';
import { NFIDW, OISY, IdentityKitAuthType } from '@nfid/identitykit';

// Comprehensive Cache Busting Script
const clearAllCaches = async () => {
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        console.log('Service worker unregistered:', registration.scope);
      }
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    }

    // Clear localStorage and sessionStorage for this domain
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('Local storage cleared');
    } catch (e) {
      console.log('Could not clear local storage:', e);
    }

    // Force reload if this is a cached version
    const currentVersion = '2025-12-19-v2';
    const storedVersion = localStorage.getItem('app_version');
    if (storedVersion !== currentVersion) {
      localStorage.setItem('app_version', currentVersion);
      console.log('App version updated to:', currentVersion);
    }
  } catch (error) {
    console.log('Cache clearing error:', error);
  }
};

// Run cache clearing immediately
clearAllCaches();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <IdentityKitProvider
      authType={IdentityKitAuthType.ACCOUNTS}
      signers={[OISY, NFIDW]}
      featuredSigner={OISY}
      signerClientOptions={{ 
        targets: [
          "laci2-ryaaa-aaaap-qp5oa-cai", // membership canister
          "os37x-baaaa-aaaap-qp5qq-cai", // user canister
          "ljbdg-hqaaa-aaaap-qp5pq-cai", // shop canister
          "lhdoo-4aaaa-aaaap-qp5oq-cai", // portal canister
          "o3yul-xiaaa-aaaap-qp5ra-cai"  // wallet2 canister
        ]
      }}
    >
      <App />
    </IdentityKitProvider>
  </React.StrictMode>
);

serviceWorkerRegistration.unregister();
reportWebVitals();

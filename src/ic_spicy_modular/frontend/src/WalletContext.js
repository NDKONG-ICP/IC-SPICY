import React, { createContext, useContext, useState, useEffect } from "react";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory as aiIdl } from "./declarations/ai";
import { idlFactory as blogIdl } from "./declarations/blog";
import { idlFactory as chiliIdl } from "./declarations/chili";
import { idlFactory as gameIdl } from "./declarations/game";
import { idlFactory as membershipIdl } from "./declarations/membership";
import { idlFactory as portalIdl } from "./declarations/portal";
import { idlFactory as profileIdl } from "./declarations/profile";
import { idlFactory as shopIdl } from "./declarations/shop";
import { idlFactory as userIdl } from "./declarations/user";
import { idlFactory as wallet2Idl } from "./declarations/wallet2";
import { idlFactory as whitepaperIdl } from "./declarations/whitepaper";
import { idlFactory as deepseekIdl } from "./declarations/deepseek_agent";
import { idlFactory as solanaPayIdl } from "./declarations/solana_pay";
import { AuthClient } from '@dfinity/auth-client';
import { CANISTER_IDS } from './config';
import { getInternetIdentityConfig, logInternetIdentityConfig } from './config/internet-identity';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { transactionService } from './services/TransactionService';

export const WalletContext = createContext();

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }) {
  const [principal, setPrincipal] = useState(null);
  const [plugConnected, setPlugConnected] = useState(false);
  const [agent, setAgent] = useState(null);
  const [canisters, setCanisters] = useState({});
  const [iiPrincipal, setIiPrincipal] = useState(null);
  const [iiLoggedIn, setIiLoggedIn] = useState(false);
  const [authClient, setAuthClient] = useState(null);
  const [phantomConnected, setPhantomConnected] = useState(false);
  const [phantomAddress, setPhantomAddress] = useState(null);
  const [phantomProvider, setPhantomProvider] = useState(null);
  const [phantomAgent, setPhantomAgent] = useState(null);
  const [phantomNetwork, setPhantomNetwork] = useState('mainnet-beta');
  const [phantomBalance, setPhantomBalance] = useState(0);

  const isLocal = () => {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
  };
  
  const defaultHost = () => {
    const config = getInternetIdentityConfig();
    return config.host;
  };

  // Initialize canister actors
  const initializeCanisters = (anAgent) => {
    const canisterActors = {};
    const entries = Object.entries(CANISTER_IDS);
    for (const [name, canisterId] of entries) {
      let idlFactory;
      switch(name) {
        case 'ai': idlFactory = aiIdl; break;
        case 'blog': idlFactory = blogIdl; break;
        case 'chili': idlFactory = chiliIdl; break;
        case 'game': idlFactory = gameIdl; break;
        case 'membership': idlFactory = membershipIdl; break;
        case 'portal': idlFactory = portalIdl; break;
        case 'profile': idlFactory = profileIdl; break;
        case 'shop': idlFactory = shopIdl; break;
        case 'user': idlFactory = userIdl; break;
        case 'wallet2': idlFactory = wallet2Idl; break;
        case 'whitepaper': idlFactory = whitepaperIdl; break;
        case 'deepseek_agent': idlFactory = deepseekIdl; break;
        case 'solana_pay': idlFactory = solanaPayIdl; break;
        default: continue;
      }
      canisterActors[name] = Actor.createActor(idlFactory, { agent: anAgent, canisterId });
    }
    setCanisters(canisterActors);
    
    // Initialize TransactionService with membership canister
    if (canisterActors.membership) {
      transactionService.initialize(canisterActors.membership);
    }
  };

  async function connectPlug() {
    if (!window.ic || !window.ic.plug) {
      alert("Plug wallet not found! Please install the Plug extension.");
      return;
    }
    try {
      const connected = await window.ic.plug.requestConnect();
      if (connected) {
        const p = await window.ic.plug.getPrincipal();
        setPrincipal(p.toString());
        setPlugConnected(true);
        const plugAgent = await window.ic.plug.createAgent({ host: defaultHost() });
        setAgent(plugAgent);
        initializeCanisters(plugAgent);
        return p;
      } else {
        alert("Plug connection rejected.");
      }
    } catch (e) {
      alert("Plug connection failed: " + e.message);
    }
  }

  async function disconnectPlug() {
    if (window.ic && window.ic.plug) {
      await window.ic.plug.disconnect();
      setPrincipal(null);
      setPlugConnected(false);
    }
  }

  // Load Solana balance for Phantom wallet
  const loadPhantomBalance = async (address) => {
    try {
      if (!address) return;
      
      // Check if Solana Web3.js is available
      if (typeof Connection === 'undefined' || typeof PublicKey === 'undefined') {
        console.warn('Solana Web3.js not available, skipping balance load');
        setPhantomBalance(0);
        return;
      }
      
      // Use more reliable RPC endpoints
      const rpcEndpoints = {
        'mainnet-beta': [
          'https://solana-mainnet.rpc.extrnode.com',
          'https://rpc.ankr.com/solana',
          'https://api.mainnet-beta.solana.com'
        ],
        'devnet': [
          'https://api.devnet.solana.com'
        ]
      };
      
      const endpoints = rpcEndpoints[phantomNetwork] || rpcEndpoints['mainnet-beta'];
      let balance = 0;
      let lastError = null;
      
      // Try multiple endpoints for reliability
      for (const endpoint of endpoints) {
        try {
          const connection = new Connection(endpoint, 'confirmed');
          const publicKey = new PublicKey(address);
          balance = await connection.getBalance(publicKey);
          console.log(`Successfully loaded balance from ${endpoint}:`, balance / LAMPORTS_PER_SOL, 'SOL');
          break; // Success, exit the loop
        } catch (err) {
          lastError = err;
          console.warn(`Failed to load balance from ${endpoint}:`, err.message);
          continue; // Try next endpoint
        }
      }
      
      if (balance > 0) {
        setPhantomBalance(balance / LAMPORTS_PER_SOL);
      } else {
        console.warn('All RPC endpoints failed, setting balance to 0');
        setPhantomBalance(0);
      }
    } catch (err) {
      console.error('Error loading Phantom balance:', err);
      setPhantomBalance(0);
    }
  };

  // Phantom Wallet connection
  async function connectPhantom() {
    if (!window.phantom?.solana) {
      // Provide helpful information about installing Phantom Wallet
      const installPhantom = window.confirm(
        "Phantom Wallet extension not found!\n\n" +
        "To use Phantom Wallet:\n" +
        "1. Visit https://phantom.app\n" +
        "2. Install the browser extension\n" +
        "3. Create or import a wallet\n" +
        "4. Return here and click '👻 Phantom' again\n\n" +
        "Would you like to open the Phantom website now?"
      );
      
      if (installPhantom) {
        window.open('https://phantom.app', '_blank');
      }
      return;
    }
    
    try {
      const response = await window.phantom.solana.connect();
      const publicKey = response.publicKey.toString();
      
      setPhantomAddress(publicKey);
      setPhantomConnected(true);
      setPhantomProvider(window.phantom.solana);
      
      // For Phantom, we'll use a descriptive principal since it's not IC-based
      const phantomPrincipal = `phantom_solana_${publicKey.substring(0, 8)}`;
      setPrincipal(phantomPrincipal);
      
      // Initialize canisters with a placeholder agent for Phantom
      // Since Phantom is Solana-based, we'll create a basic agent
      const phantomAgent = new HttpAgent({ 
        host: defaultHost(),
        // Note: This agent won't work with IC canisters, but it provides structure
      });
      
      // Store the Phantom agent separately
      setPhantomAgent(phantomAgent);
      
      // Load initial balance (don't let failures block connection)
      try {
        await loadPhantomBalance(publicKey);
      } catch (balanceError) {
        console.warn('Balance loading failed, but connection successful:', balanceError);
        setPhantomBalance(0); // Set to 0 if balance loading fails
      }
      
      // Set up event listeners for Phantom wallet
      const provider = window.phantom.solana;
      
      try {
        // Listen for account changes
        if (typeof provider.on === 'function') {
          provider.on('accountChanged', async (newPublicKey) => {
            try {
              if (newPublicKey) {
                const newAddress = newPublicKey.toString();
                setPhantomAddress(newAddress);
                try {
                  await loadPhantomBalance(newAddress);
                } catch (balanceError) {
                  console.warn('Balance loading failed on account change:', balanceError);
                  setPhantomBalance(0);
                }
              } else {
                setPhantomAddress(null);
                setPhantomConnected(false);
                setPhantomBalance(0);
              }
            } catch (error) {
              console.error('Error in accountChanged event:', error);
            }
          });

          // Listen for disconnect
          provider.on('disconnect', () => {
            try {
              setPhantomAddress(null);
              setPhantomConnected(false);
              setPhantomProvider(null);
              setPhantomAgent(null);
              setPhantomBalance(0);
              setPrincipal(null);
            } catch (error) {
              console.error('Error in disconnect event:', error);
            }
          });

          // Listen for connect
          provider.on('connect', async (newPublicKey) => {
            try {
              const newAddress = newPublicKey.toString();
              setPhantomAddress(newAddress);
              setPhantomConnected(true);
              try {
                await loadPhantomBalance(newAddress);
              } catch (balanceError) {
                console.warn('Balance loading failed on connect event:', balanceError);
                setPhantomBalance(0);
              }
            } catch (error) {
              console.error('Error in connect event:', error);
            }
          });
        } else {
          console.warn('Phantom provider does not support event listeners');
        }
      } catch (error) {
        console.error('Error setting up Phantom event listeners:', error);
      }
      
      return publicKey;
    } catch (e) {
      console.error("Phantom connection failed:", e);
      alert("Phantom connection failed: " + e.message);
    }
  }

  async function disconnectPhantom() {
    if (window.phantom?.solana) {
      await window.phantom.solana.disconnect();
      setPhantomAddress(null);
      setPhantomConnected(false);
      setPhantomProvider(null);
      setPhantomAgent(null);
      setPhantomBalance(0);
      setPrincipal(null);
    }
  }

  // Check if Plug is already connected on mount
  useEffect(() => {
    const checkPlugConnection = async () => {
      if (!isLocal()) {
        // On mainnet, do not auto-initialize Plug to avoid extension localhost calls
        return;
      }
      if (window.ic && window.ic.plug) {
        const connected = await window.ic.plug.isConnected();
        if (connected) {
          const p = await window.ic.plug.getPrincipal();
          setPrincipal(p.toString());
          setPlugConnected(true);
          const plugAgent = await window.ic.plug.createAgent({ host: defaultHost() });
          setAgent(plugAgent);
          initializeCanisters(plugAgent);
        }
      }
    };
    checkPlugConnection();
  }, []);

  // Check if Phantom is already connected on mount
  useEffect(() => {
    const checkPhantomConnection = async () => {
      if (window.phantom?.solana) {
        try {
          // Check if Phantom is connected by trying to get the public key
          // If it throws an error, it's not connected
          const publicKey = await window.phantom.solana.getPublicKey();
          if (publicKey) {
            const address = publicKey.toString();
            setPhantomAddress(address);
            setPhantomConnected(true);
            setPhantomProvider(window.phantom.solana);
            
            // Set descriptive principal for Phantom
            const phantomPrincipal = `phantom_solana_${address.substring(0, 8)}`;
            setPrincipal(phantomPrincipal);
            
            // Create placeholder agent for Phantom
            const phantomAgent = new HttpAgent({ 
              host: defaultHost(),
              // Note: This agent won't work with IC canisters, but it provides structure
            });
            setPhantomAgent(phantomAgent);
            
            // Load initial balance (don't let failures block connection)
            try {
              await loadPhantomBalance(address);
            } catch (balanceError) {
              console.warn('Balance loading failed on initial check, but connection successful:', balanceError);
              setPhantomBalance(0);
            }
          }
        } catch (error) {
          // Phantom is not connected, which is fine
          console.log('Phantom wallet not connected:', error.message);
        }
      }
    };
    checkPhantomConnection();
  }, []);

  // Internet Identity login with fallback
  const loginII = async (retryCount = 0) => {
    try {
      console.log(`🔐 Starting Internet Identity login (attempt ${retryCount + 1})...`);
      
      // Log the current configuration
      logInternetIdentityConfig();
      
      const client = await AuthClient.create();
      setAuthClient(client);
      
      console.log('✅ AuthClient created successfully');
      
      const config = getInternetIdentityConfig();
      console.log('🌐 Using identity provider:', config.url);
      
      await client.login({
        identityProvider: config.url,
        onSuccess: async () => {
          try {
            console.log('✅ Internet Identity login successful');
            const identity = client.getIdentity();
            const p = identity.getPrincipal().toText();
            console.log('👤 Principal obtained:', p);
            
            setIiPrincipal(p);
            setIiLoggedIn(true);
            setPrincipal(p); // ensure pages depending on `principal` work after II login
            
            const iiAgent = new HttpAgent({ 
              identity, 
              host: config.host 
            });
            
            if (isLocal()) { 
              try { 
                await iiAgent.fetchRootKey(); 
                console.log('✅ Root key fetched for local development');
              } catch (e) {
                console.warn('⚠️ Root key fetch failed (this is normal for local dev):', e);
              } 
            }
            
            setAgent(iiAgent);
            console.log('✅ HttpAgent created and set');
            
            initializeCanisters(iiAgent);
            console.log('✅ Canisters initialized');
            
            try {
              const walletActor = Actor.createActor(wallet2Idl, { 
                agent: iiAgent, 
                canisterId: CANISTER_IDS.wallet2 
              });
              await walletActor.registerUser();
              console.log('✅ User registered in wallet canister');
            } catch (e) { 
              console.warn('⚠️ registerUser failed or already registered:', e); 
            }
            
            console.log('🎉 Internet Identity setup complete!');
          } catch (error) {
            console.error('❌ Error in onSuccess callback:', error);
            setIiLoggedIn(false);
            setIiPrincipal(null);
            setPrincipal(null);
            setAgent(null);
          }
        },
        onError: (error) => {
          console.error(`❌ Internet Identity login failed (attempt ${retryCount + 1}):`, error);
          
          // Try fallback provider if this is the first attempt
          if (retryCount === 0) {
            console.log('🔄 Trying fallback Internet Identity provider...');
            setTimeout(() => {
              loginII(1); // Retry with fallback
            }, 1000);
            return;
          }
          
          // If retry also failed, show error
          alert(`Internet Identity login failed: ${error.message || 'Unknown error'}`);
          setIiLoggedIn(false);
          setIiPrincipal(null);
          setPrincipal(null);
          setAgent(null);
        }
      });
    } catch (error) {
      console.error(`❌ Failed to create AuthClient (attempt ${retryCount + 1}):`, error);
      
      // Try fallback if this is the first attempt
      if (retryCount === 0) {
        console.log('🔄 Trying fallback Internet Identity provider...');
        setTimeout(() => {
          loginII(1); // Retry with fallback
        }, 1000);
        return;
      }
      
      alert(`Failed to initialize Internet Identity: ${error.message || 'Unknown error'}`);
    }
  };

  // Internet Identity logout
  const logoutII = async () => {
    if (authClient) {
      await authClient.logout();
    }
    setIiPrincipal(null);
    setIiLoggedIn(false);
    setPrincipal(null);
    setAgent(null);
    setCanisters({});
  };

  // On mount, check if II is already logged in
  useEffect(() => {
    const init = async () => {
      try {
        console.log('🚀 Initializing wallet context...');
        
        // Log the current configuration
        logInternetIdentityConfig();
        
        // II
        const client = await AuthClient.create();
        setAuthClient(client);
        console.log('✅ AuthClient created for session check');
        
        if (await client.isAuthenticated()) {
          try {
            console.log('🔍 Found existing Internet Identity session');
            const identity = client.getIdentity();
            const p = identity.getPrincipal().toText();
            console.log('👤 Restoring principal from session:', p);
            
            setIiPrincipal(p);
            setIiLoggedIn(true);
            setPrincipal(p); // ensure principal set from existing II session
            
            const config = getInternetIdentityConfig();
            const iiAgent = new HttpAgent({ identity, host: config.host });
            
            if (isLocal()) { 
              try { 
                await iiAgent.fetchRootKey(); 
                console.log('✅ Root key fetched for local development');
              } catch (e) {
                console.warn('⚠️ Root key fetch failed (this is normal for local dev):', e);
              } 
            }
            
            setAgent(iiAgent);
            console.log('✅ HttpAgent restored from session');
            
            initializeCanisters(iiAgent);
            console.log('✅ Canisters initialized from session');
            
            try {
              const walletActor = Actor.createActor(wallet2Idl, { 
                agent: iiAgent, 
                canisterId: CANISTER_IDS.wallet2 
              });
              await walletActor.registerUser();
              console.log('✅ User registration checked from session');
            } catch (e) {
              console.warn('⚠️ User registration check failed (may already be registered):', e);
            }
            
            console.log('🎉 Internet Identity session restored successfully!');
          } catch (error) {
            console.error('❌ Error restoring Internet Identity session:', error);
            // Clear the failed session
            await client.logout();
            setIiPrincipal(null);
            setIiLoggedIn(false);
            setPrincipal(null);
            setAgent(null);
          }
        } else {
          console.log('ℹ️ No existing Internet Identity session found');
        }
        
        // IdentityKit handles OISY connection; no WalletConnect here
        console.log('✅ Wallet context initialization complete');
      } catch (error) {
        console.error('❌ Failed to initialize wallet context:', error);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preferredPrincipal = iiLoggedIn ? iiPrincipal : principal;
  const setExternalPrincipal = (p) => setPrincipal(p);

  // IdentityKit manages OISY session; no local restore here

  return (
    <WalletContext.Provider value={{
      principal,
      plugConnected,
      connectPlug,
      disconnectPlug,
      agent,
      canisters,
      CANISTER_IDS,
      iiPrincipal,
      iiLoggedIn,
      loginII,
      logoutII,
      preferredPrincipal,
      setExternalPrincipal,
      phantomConnected,
      phantomAddress,
      phantomProvider,
      phantomAgent,
      phantomNetwork,
      phantomBalance,
      connectPhantom,
      disconnectPhantom,
      isPhantomAvailable: !!window.phantom?.solana,
      isConnected: !!(iiLoggedIn || plugConnected || phantomConnected),
    }}>
      {children}
    </WalletContext.Provider>
  );
} 
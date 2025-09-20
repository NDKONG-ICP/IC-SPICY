import React, { useEffect, useState } from 'react';
import { Principal } from '@dfinity/principal';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory as membershipIdl } from '../declarations/membership';
import { useAgent, useIdentityKit } from '@nfid/identitykit/react';
import { useWallet } from '../WalletContext';
import { rateLimiter, auditLog, handleError } from '../utils/security';
import { ADMIN_PRINCIPALS, CANISTER_IDS } from '../config';
import IcPayPayment from '../components/IcPayPayment';
import { recordMembershipTransaction } from '../services/TransactionService';

const TIER_MAP = [
  { id: 1, name: 'Street Team', icon: '🌶', motoko: { Basic: null } },
  { id: 2, name: 'Spicy Chads', icon: '🔥', motoko: { Elite: null } },
  { id: 3, name: 'Ghosties', icon: '👻', motoko: { Elite: null }, isSolana: true },
  { id: 4, name: 'Corvids', icon: '🦅', motoko: { Elite: null }, isCryptoCom: true }
];

// Persistent multi-token pricing and totals
const DEFAULT_PRICE_CONFIG = {
  'Street Team': { ICP: 2.0, ckBTC: 0.0001, RAVEN: 100000.0, ZOMBIE: 1000000.0, ckSOL: null },
  'Spicy Chads': { ICP: 20.0, ckBTC: 0.001, RAVEN: 1000000.0, ZOMBIE: 10000000.0, ckSOL: null },
  'Ghosties': { ICP: 20.0, ckBTC: 0.001, RAVEN: 1000000.0, ZOMBIE: 10000000.0, SOL: 0.5, SUI: 28.0 },
  'Corvids': { ICP: 20.0, ckBTC: 0.001, RAVEN: 1000000.0, ZOMBIE: 10000000.0, CRO: 5000.0 },
};

// Solana, Sui, and Crypto.com token information
const SOLANA_TOKENS = {
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    icon: '🌞',
    color: 'from-purple-500 to-blue-500',
    description: 'Native Solana token'
  },
  SUI: {
    symbol: 'SUI',
    name: 'Sui',
    decimals: 9,
    icon: '💎',
    color: 'from-cyan-500 to-blue-500',
    description: 'Native Sui token'
  }
};

const CRYPTOCOM_TOKENS = {
  CRO: {
    symbol: 'CRO',
    name: 'Crypto.com Coin',
    decimals: 8,
    icon: '🪙',
    color: 'from-purple-600 to-pink-600',
    description: 'Native Crypto.com token on Cronos'
  }
};

const LOCAL_STORAGE_PRICE_KEY = 'membership_price_v1';
const LOCAL_STORAGE_BURN_KEY = 'membership_burn_totals_v1';
const LOCAL_STORAGE_CUSTOM_TOKENS_KEY = 'membership_custom_tokens_v1';
const LOCAL_STORAGE_ROUTE_CFG_KEY = 'membership_route_cfg_v1';

const MembershipPage = () => {
  const { 
    principal: walletContextPrincipal, 
    iiLoggedIn, 
    loginII, 
    canisters,
    phantomConnected,
    phantomAddress,
    phantomBalance
  } = useWallet();
  const { user } = useIdentityKit();
  const oisyAgent = useAgent();
  
  const [showAdmin, setShowAdmin] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);
  const [priceConfig, setPriceConfig] = useState(() => {
    try { const raw = localStorage.getItem(LOCAL_STORAGE_PRICE_KEY); return raw ? JSON.parse(raw) : DEFAULT_PRICE_CONFIG; } catch { return DEFAULT_PRICE_CONFIG; }
  });
  const [burnTotals, setBurnTotals] = useState(() => {
    try { const raw = localStorage.getItem(LOCAL_STORAGE_BURN_KEY); return raw ? JSON.parse(raw) : { RAVEN: 0, ZOMBIE: 0 }; } catch { return { RAVEN: 0, ZOMBIE: 0 }; }
  });
  const [customTokens, setCustomTokens] = useState(() => {
    try { const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_TOKENS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [routeConfig, setRouteConfig] = useState(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ROUTE_CFG_KEY);
      return raw ? JSON.parse(raw) : {
        burn: { RAVEN: '', ZOMBIE: '' },
        kongSwap: { ICP: '', ckBTC: '', RAVEN: '', ZOMBIE: '' },
        icpSwap: { ICP: '', ckBTC: '', RAVEN: '', ZOMBIE: '' },
        treasury: { ICP: '', ckBTC: '' },
      };
    } catch {
      return { burn: { RAVEN: '', ZOMBIE: '' }, kongSwap: { ICP: '', ckBTC: '', RAVEN: '', ZOMBIE: '' }, icpSwap: { ICP: '', ckBTC: '', RAVEN: '', ZOMBIE: '' }, treasury: { ICP: '', ckBTC: '' } };
    }
  });
  const BASE_TOKENS = React.useMemo(() => ([
    { key: 'ICP', label: 'ICP', disabled: false },
    { key: 'ckBTC', label: 'ckBTC', disabled: false },
  ]), []);
  // Token registry (symbol -> principal + decimals) for universal ICRC-1/2 coverage
  const LOCAL_STORAGE_TOKEN_REGISTRY_KEY = 'token_registry_v1';
  const [tokenRegistry, setTokenRegistry] = useState(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_TOKEN_REGISTRY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(LOCAL_STORAGE_TOKEN_REGISTRY_KEY, JSON.stringify(tokenRegistry)); } catch {} }, [tokenRegistry]);

  // Ensure default common tokens exist in registry
  useEffect(() => {
    const defaults = [
      { symbol: 'ICP', principal: 'ryjl3-tyaaa-aaaaa-aaaba-cai', decimals: 8 },
      { symbol: 'ckBTC', principal: 'mxzaz-hqaaa-aaaar-qaada-cai', decimals: 8 },
      { symbol: 'ZOMBIE', principal: 'rwdg7-ciaaa-aaaam-qczja-cai', decimals: 8 },
      { symbol: 'RAVEN', principal: '4k7jk-vyaaa-aaaam-qcyaa-cai', decimals: 8 },
    ];
    setTokenRegistry(prev => {
      const have = new Set(prev.map(t => t.symbol));
      const merged = [...prev];
      for (const d of defaults) { if (!have.has(d.symbol)) merged.push(d); }
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tokens = React.useMemo(() => {
    const reg = tokenRegistry.map(t => ({ key: t.symbol, label: t.symbol, disabled: false }));
    // de-duplicate by symbol
    const seen = new Set();
    const all = [];
    for (const t of [...BASE_TOKENS, ...reg]) { if (!seen.has(t.key)) { seen.add(t.key); all.push(t); } }
    return all;
  }, [BASE_TOKENS, tokenRegistry]);
  const [selectedToken, setSelectedToken] = useState('ICP');
  const effectivePrincipal = React.useMemo(() => {
    if (user?.principal?.toText) return user.principal.toText();
    if (walletContextPrincipal) return String(walletContextPrincipal);
    return null;
  }, [user, walletContextPrincipal]);
  const isAdmin = React.useMemo(() => {
    if (!effectivePrincipal) return false;
    const p = String(effectivePrincipal);
    const admins = [ADMIN_PRINCIPALS.membership, ADMIN_PRINCIPALS.membership_oisy, ADMIN_PRINCIPALS.membership_nfid, ADMIN_PRINCIPALS.membership_nfid2].filter(Boolean);
    return admins.includes(p);
  }, [effectivePrincipal]);

  // Determine if user has access to Solana Pay
  const hasSolanaPayAccess = () => {
    return phantomConnected || (user?.principal && (user?.signerType === 'OISY' || user?.signerType === 'NFIDW'));
  };

  // Get wallet type for display
  const getWalletType = () => {
    if (phantomConnected) return 'Phantom';
    if (user?.principal) {
      if (user?.signerType === 'OISY') return 'OISY';
      if (user?.signerType === 'NFIDW') return 'NFID';
    }
    return null;
  };

  const getLedgerBySymbol = (sym) => {
    const entry = tokenRegistry.find(t => t.symbol === sym);
    if (entry && entry.principal) return entry.principal;
    if (sym === 'ICP') return 'ryjl3-tyaaa-aaaaa-aaaba-cai';
    if (sym === 'ckBTC') return 'mxzaz-hqaaa-aaaar-qaada-cai';
    if (sym === 'ZOMBIE') return 'rwdg7-ciaaa-aaaam-qczja-cai';
    if (sym === 'RAVEN') return '4k7jk-vyaaa-aaaam-qcyaa-cai';
    return null;
  };

  const [withdrawSym, setWithdrawSym] = useState('ICP');
  const [withdrawTo, setWithdrawTo] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [treasuryBalances, setTreasuryBalances] = useState({});
  const [treasuryLoading, setTreasuryLoading] = useState(false);
  const [showIcPayModal, setShowIcPayModal] = useState(false);
  const [selectedTierForIcPay, setSelectedTierForIcPay] = useState(null);

  // Comprehensive page jumping prevention
  useEffect(() => {
    const preventAllScrolling = (e) => {
      // Prevent ALL Enter key actions in inputs
      if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      
      // Prevent Tab key from causing unwanted scrolling
      if (e.key === 'Tab' && e.target.tagName === 'INPUT') {
        e.stopPropagation();
      }
    };

    const preventFormSubmission = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    const preventScroll = (e) => {
      // Prevent any programmatic scrolling
      if (e.target && e.target.scrollIntoView) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Add multiple layers of event prevention
    document.addEventListener('keydown', preventAllScrolling, true);
    document.addEventListener('keypress', preventAllScrolling, true);
    document.addEventListener('submit', preventFormSubmission, true);
    document.addEventListener('scroll', preventScroll, true);
    document.addEventListener('focus', preventScroll, true);
    
    // Disable all scroll behaviors
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // Override any scroll functions
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function() {
      // Do nothing - disable all scrollIntoView calls
    };

    return () => {
      document.removeEventListener('keydown', preventAllScrolling, true);
      document.removeEventListener('keypress', preventAllScrolling, true);
      document.removeEventListener('submit', preventFormSubmission, true);
      document.removeEventListener('scroll', preventScroll, true);
      document.removeEventListener('focus', preventScroll, true);
      
      // Restore original scrollIntoView
      Element.prototype.scrollIntoView = originalScrollIntoView;
    };
  }, []);

  // Error boundary for admin panel to avoid blank screen on unexpected errors
  class AdminErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, errorMsg: '' };
    }
    static getDerivedStateFromError(error) {
      return { hasError: true, errorMsg: String(error?.message || error) };
    }
    componentDidCatch(error, info) {
      console.error('Admin panel render error', error, info);
    }
    render() {
      if (this.state.hasError) {
        return (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded">
            <div className="text-red-300 font-bold mb-2">Admin Panel Error</div>
            <div className="text-red-200 text-sm">{this.state.errorMsg}</div>
            <button 
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm"
              onClick={() => this.setState({ hasError: false, errorMsg: '' })}
            >
              Reset
            </button>
          </div>
        );
      }
      return this.props.children;
    }
  }

  // Minimal ICRC-1 interface for transfers, balance and decimals
  const icrc1IdlFactory = ({ IDL }) => {
    const Account = IDL.Record({ owner: IDL.Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) });
    const TransferArg = IDL.Record({
      to: Account,
      amount: IDL.Nat,
      fee: IDL.Opt(IDL.Nat),
      memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
      from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
      created_at_time: IDL.Opt(IDL.Nat64),
    });
    return IDL.Service({
      icrc1_transfer: IDL.Func([TransferArg], [IDL.Variant({ Ok: IDL.Nat, Err: IDL.Variant({}) })], []),
      icrc1_decimals: IDL.Func([], [IDL.Nat8], ['query']),
      icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query'])
    });
  };

  // Minimal DIP20 interface fallback (balanceOf, decimals)
  const dip20IdlFactory = ({ IDL }) => {
    return IDL.Service({
      balanceOf: IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
      decimals: IDL.Func([], [IDL.Nat8], ['query'])
    });
  };

  const createIcrcActor = (ledgerCanisterIdText, agentOverride) => {
    const canisterId = Principal.fromText(ledgerCanisterIdText);
    let agentToUse = agentOverride || oisyAgent;
    if (!agentToUse) {
      // Fallback to anonymous agent
      agentToUse = new HttpAgent({ host: isLocal() ? 'http://127.0.0.1:4943' : 'https://ic0.app' });
      if (isLocal()) { try { agentToUse.fetchRootKey(); } catch {} }
    }
    return Actor.createActor(icrc1IdlFactory, { agent: agentToUse, canisterId });
  };

  const numberToBaseUnits = async (ledgerActor, humanAmount) => {
    try {
      const decimals = Number(await ledgerActor.icrc1_decimals());
      const scale = 10 ** decimals;
      const base = Math.round(Number(humanAmount) * scale);
      return window.BigInt(base);
    } catch {
      // Fallback to 8 decimals
      const base = Math.round(Number(humanAmount) * 1e8);
      return window.BigInt(base);
    }
  };

  // Local/IC host helper
  const isLocal = () => {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
  };

  // Format BigInt balance to human string with decimals
  const formatBalance = (nat, decimals) => {
    try {
      const s = nat.toString();
      if (decimals === 0) return s;
      const pad = decimals;
      const padded = s.padStart(pad + 1, '0');
      const intPart = padded.slice(0, -pad);
      const fracPartRaw = padded.slice(-pad);
      const frac = fracPartRaw.replace(/0+$/, '');
      return frac ? `${intPart}.${frac}` : intPart;
    } catch {
      return '0';
    }
  };

  // Load treasury balances for known tokens (account is membership canister principal)
  const loadTreasuryBalances = async () => {
    if (treasuryLoading) return; // Prevent multiple concurrent calls
    setTreasuryLoading(true);
    try {
      const membershipPrincipal = Principal.fromText(CANISTER_IDS.membership);
      const symbols = ['ICP','ckBTC','RAVEN','ZOMBIE'];
      const next = {};
      // Use anonymous agent for balance queries to avoid wallet popups/freezing
      const agentForQueries = new HttpAgent({ host: isLocal() ? 'http://127.0.0.1:4943' : 'https://ic0.app' });
      if (isLocal()) { try { await agentForQueries.fetchRootKey(); } catch {} }
      // Process tokens sequentially with delay to prevent overwhelming
      for (let i = 0; i < symbols.length; i++) {
        const sym = symbols[i];
        const ledgerId = getLedgerBySymbol(sym);
        if (!ledgerId) continue;
        let decimals = 8;
        let balance = 0n;
        
        // Try ICRC-1 first
        try {
          const icrcActor = createIcrcActor(ledgerId, agentForQueries);
          if (icrcActor) {
            try { decimals = Number(await icrcActor.icrc1_decimals()); } catch {}
            balance = await icrcActor.icrc1_balance_of({ owner: membershipPrincipal, subaccount: [] });
          }
        } catch (e) {
          console.warn(`Failed to get ${sym} ICRC balance:`, e);
        }
        
        // If ICRC-1 failed (balance still 0 and sym is not ICP/ckBTC), try DIP20 fallback
        if (balance === 0n && (sym === 'ZOMBIE' || sym === 'RAVEN')) {
          try {
            const canisterId = Principal.fromText(ledgerId);
            const dipActor = Actor.createActor(dip20IdlFactory, { agent: agentForQueries, canisterId });
            try { decimals = Number(await dipActor.decimals()); } catch {}
            balance = await dipActor.balanceOf(membershipPrincipal);
          } catch (e) {
            console.warn(`Failed to get ${sym} DIP20 balance:`, e);
          }
        }
        
        const human = formatBalance(balance, decimals);
        next[sym] = { balance, decimals, human };
        
        // Add small delay between requests to prevent overwhelming
        if (i < symbols.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      setTreasuryBalances(next);
    } catch (e) {
      console.warn('loadTreasuryBalances failed', e);
    } finally {
      setTreasuryLoading(false);
    }
  };

  // Robust copy helper with fallback
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        alert('Copied to clipboard');
        return true;
      }
    } catch {}
    try {
      const tmp = document.createElement('textarea');
      tmp.value = text;
      tmp.setAttribute('readonly', '');
      tmp.style.position = 'absolute';
      tmp.style.left = '-9999px';
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand('copy');
      document.body.removeChild(tmp);
      alert('Copied to clipboard');
      return true;
    } catch (e) {
      alert('Copy failed. Please select and copy manually.');
      return false;
    }
  };

  const handleAdminWithdraw = async () => {
    if (!isAdmin) { alert('Admin only'); return; }
    // Require II or OISY agent so the call is signed by an admin identity
    if (!iiLoggedIn && !oisyAgent) { alert('Connect OISY (Connect Wallet) or login with Internet Identity to perform admin actions.'); return; }
    if (!canisters?.membership) { alert('Membership canister not ready'); return; }
    const symbol = withdrawSym;
    const ledgerId = getLedgerBySymbol(symbol);
    if (!ledgerId) { alert('Unsupported token'); return; }
    if (!withdrawTo || !withdrawAmount) { alert('Enter destination and amount'); return; }
    let destPrincipal;
    try { destPrincipal = Principal.fromText(withdrawTo.trim()); } catch { alert('Invalid destination principal'); return; }
    setWithdrawing(true);
    try {
      // Resolve decimals best-effort without requiring an actor
      let decimals = 8;
      try {
        const actorTry = createIcrcActor(ledgerId);
        if (actorTry && actorTry.icrc1_decimals) {
          decimals = Number(await actorTry.icrc1_decimals());
        }
      } catch {}
      if ((symbol === 'ZOMBIE' || symbol === 'RAVEN') && decimals === 8) {
        // Try DIP20 decimals if ICRC-1 failed
        try {
          const dipAgent = new HttpAgent({ host: isLocal() ? 'http://127.0.0.1:4943' : 'https://ic0.app' });
          if (isLocal()) { try { await dipAgent.fetchRootKey(); } catch {} }
          const dipActor = Actor.createActor(dip20IdlFactory, { agent: dipAgent, canisterId: Principal.fromText(ledgerId) });
          decimals = Number(await dipActor.decimals());
        } catch {}
      }
      const scale = Math.pow(10, decimals);
      const amountBase = window.BigInt(Math.round(Number(withdrawAmount) * scale));
      // Use OISY agent for membership actor if available; otherwise use the pre-initialized actor
      // Prefer IdentityKit agent (OISY) for admin calls; fallback to prebuilt actor
      const membershipActor = oisyAgent
        ? Actor.createActor(membershipIdl, { agent: oisyAgent, canisterId: CANISTER_IDS.membership })
        : canisters.membership;
      const res = await membershipActor.admin_withdraw(Principal.fromText(ledgerId), destPrincipal, amountBase);
      if (res && res.Ok !== undefined) {
        alert('Withdrawal successful at height ' + String(res.Ok));
      } else if (res && res.Err !== undefined) {
        alert('Withdrawal failed: ' + String(res.Err));
      } else {
        alert('Withdrawal submitted');
      }
    } catch (e) {
      alert(handleError(e, 'admin withdraw'));
    } finally {
      setWithdrawing(false);
    }
  };

  // Fetch membership status
  useEffect(() => {
    if ((canisters.membership || oisyAgent) && effectivePrincipal) {
      setLoading(true);
      setError('');
      const membershipActor = canisters.membership || Actor.createActor(membershipIdl, { agent: oisyAgent, canisterId: CANISTER_IDS.membership });
      membershipActor.get_membership_status(Principal.fromText(String(effectivePrincipal)))
        .then((res) => {
          setMembership(res);
        })
        .catch((e) => setError('Failed to fetch membership: ' + e.message))
        .finally(() => setLoading(false));
    }
  }, [canisters.membership, oisyAgent, effectivePrincipal]);

  // Persist pricing + burns
  useEffect(() => { try { localStorage.setItem(LOCAL_STORAGE_PRICE_KEY, JSON.stringify(priceConfig)); } catch {} }, [priceConfig]);
  useEffect(() => { try { localStorage.setItem(LOCAL_STORAGE_BURN_KEY, JSON.stringify(burnTotals)); } catch {} }, [burnTotals]);
  useEffect(() => { try { localStorage.setItem(LOCAL_STORAGE_ROUTE_CFG_KEY, JSON.stringify(routeConfig)); } catch {} }, [routeConfig]);

  // Load persisted prices from canister (symbol-based)
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        if (!canisters?.membership) return;
        const tiers = TIER_MAP;
        const syms = ['ICP','ckBTC','RAVEN','ZOMBIE'];
        const next = { ...priceConfig };
        for (const t of tiers) {
          for (const s of syms) {
            // membership tier mapping
            const tierMotoko = t.motoko;
            const tierVariant = tierMotoko;
            const got = await canisters.membership.get_price_by_symbol(s, tierVariant);
            if (got && got.length > 0) {
              const val = Number(got[0]);
              next[t.name] = next[t.name] || {};
              next[t.name][s] = val;
            }
          }
        }
        if (!ignore) setPriceConfig(next);
      } catch {}
    };
    load();
    return () => { ignore = true; };
  }, [canisters.membership]);

  // Fetch all members (admin only)
  useEffect(() => {
    if (canisters.membership && isAdmin) {
      canisters.membership.list_members().then(setMembers).catch(() => {});
    }
  }, [canisters.membership, isAdmin]);

  // Helper to get membership actor
  const getMembershipActor = () => {
    return canisters.membership || (oisyAgent ? Actor.createActor(membershipIdl, { agent: oisyAgent, canisterId: CANISTER_IDS.membership }) : null);
  };

  // Helper to record membership transactions
  const recordMembershipPayment = async (tier, token, amount, transactionHash = null) => {
    try {
      if (effectivePrincipal) {
        await recordMembershipTransaction({
          userPrincipal: effectivePrincipal.toString(),
          amount: amount,
          currency: token,
          transactionHash: transactionHash || `membership_${tier}_${Date.now()}`,
          metadata: {
            tier: tier,
            paymentMethod: 'IC_Token',
            token: token
          }
        });
      }
    } catch (analyticsError) {
      console.warn('⚠️ Failed to record membership transaction in admin analytics:', analyticsError);
    }
  };

  const handleIcPayMembership = (tier) => {
    setSelectedTierForIcPay(tier);
    setShowIcPayModal(true);
  };

  const handleIcPaySuccess = async (paymentResult) => {
    console.log('✅ IcPay membership payment successful:', paymentResult);
    
    try {
      // Create membership record
      const membershipData = {
        tier: selectedTierForIcPay.name,
        paymentMethod: 'IcPay',
        transactionId: paymentResult.transactionId,
        amount: paymentResult.amount,
        currency: paymentResult.currency,
        chain: paymentResult.chain,
        timestamp: Date.now(),
        userPrincipal: effectivePrincipal
      };

      // Store in local analytics
      const existingMemberships = JSON.parse(localStorage.getItem('icpay_memberships') || '[]');
      existingMemberships.push(membershipData);
      localStorage.setItem('icpay_memberships', JSON.stringify(existingMemberships));

      // Record membership transaction in admin analytics
      try {
        if (effectivePrincipal) {
          await recordMembershipTransaction({
            userPrincipal: effectivePrincipal.toString(),
            amount: paymentResult.amount || (priceConfig?.[selectedTierForIcPay.name]?.ICP || 20),
            currency: paymentResult.currency || 'USD',
            transactionHash: paymentResult.transactionId || `icpay_membership_${Date.now()}`,
            metadata: {
              tier: selectedTierForIcPay.name,
              paymentMethod: 'IcPay',
              chain: paymentResult.chain,
              icpayData: paymentResult.icpayData
            }
          });
        }
      } catch (analyticsError) {
        console.warn('⚠️ Failed to record membership transaction in admin analytics:', analyticsError);
      }

      // Update logistics API
      try {
        // await logisticsAPI.createOrder({
        //   type: 'membership',
        //   tier: selectedTierForIcPay.name,
        //   amount: paymentResult.amount,
        //   currency: paymentResult.currency,
        //   paymentMethod: 'IcPay',
        //   transactionId: paymentResult.transactionId,
        //   userPrincipal: effectivePrincipal,
        //   timestamp: Date.now()
        // });
        console.log('✅ Membership order would be created in logistics system');
        console.log('✅ Membership order created in logistics API');
      } catch (logisticsError) {
        console.warn('⚠️ Failed to create logistics order:', logisticsError);
      }

      alert(`🎉 Successfully joined ${selectedTierForIcPay.name} tier with IcPay!`);
      setShowIcPayModal(false);
      setSelectedTierForIcPay(null);
      
    } catch (error) {
      console.error('❌ Failed to process IcPay membership:', error);
      alert('Failed to process membership. Please try again.');
    }
  };

  const handleJoinWithPayment = async (tier) => {
    // Check if this is a Solana tier and user has Phantom wallet
    if (tier.isSolana) {
      if (!phantomConnected) {
        alert('Please connect your Phantom wallet first to use Solana Pay');
        return;
      }
      
      // Redirect to Solana Pay page with pre-filled membership payment details
      const paymentData = encodeURIComponent(JSON.stringify({
        amount: tier.name === 'Ghosties' ? 0.5 : 0, // Default to 0.5 SOL for Ghosties
        currency: 'SOL',
        description: `IC SPICY Membership - ${tier.name} Tier`,
        metadata: `Membership tier: ${tier.name}, User: ${effectivePrincipal}`,
        membership_tier: tier.name,
        user_principal: effectivePrincipal
      }));
      
      window.location.href = `/solana-pay?payment=${paymentData}&membership=true`;
      return;
    }

    // Check if this is a Crypto.com tier
    if (tier.isCryptoCom) {
      // For now, redirect to a Crypto.com payment page or show instructions
      // In the future, this could integrate with Crypto.com's payment APIs
      const paymentData = encodeURIComponent(JSON.stringify({
        amount: tier.name === 'Corvids' ? 5000 : 0, // Default to 5000 CRO for Corvids
        currency: 'CRO',
        description: `IC SPICY Membership - ${tier.name} Tier`,
        metadata: `Membership tier: ${tier.name}, User: ${effectivePrincipal}`,
        membership_tier: tier.name,
        user_principal: effectivePrincipal
      }));
      
      // Redirect to a Crypto.com payment page (to be implemented)
      window.location.href = `/cronos-pay?payment=${paymentData}&membership=true`;
      return;
    }

    // Regular IC token payment flow
    if ((!canisters.membership && !oisyAgent) || !effectivePrincipal) return alert('Please connect a wallet first.');
    if (!rateLimiter.canPerformAction('join_membership_with_payment', effectivePrincipal, 2, 60000)) return alert('Please wait…');
    const tierPrices = priceConfig?.[tier.name] || {};
    const amount = tierPrices?.[selectedToken];
    const tokenObj = tokens.find(t => t.key === selectedToken);
    if (tokenObj?.disabled) return alert('This token is not yet available.');
    if (amount == null) return alert('Price not set for this token');
    setLoading(true);
    try {
      const membershipPrincipal = Principal.fromText(CANISTER_IDS.membership);

      if (selectedToken === 'ckBTC') {
        if (!oisyAgent) { alert('Please connect OISY wallet first.'); setLoading(false); return; }
        const ledger = createIcrcActor('mxzaz-hqaaa-aaaar-qaada-cai');
        if (!ledger) { alert('Ledger not available'); setLoading(false); return; }
        const totalBase = await numberToBaseUnits(ledger, amount);
        // Approve the membership canister to spend tokens (for automatic burning/routing)
        await ledger.icrc2_approve({ spender: { owner: membershipPrincipal, subaccount: [] }, amount: totalBase, fee: [], memo: [], from_subaccount: [], created_at_time: [], expires_at: [] });

        const membershipActor = getMembershipActor();
        const result = await membershipActor.join_membership_with_payment(tier.motoko, Principal.fromText('mxzaz-hqaaa-aaaar-qaada-cai'), selectedToken);
        auditLog.log('join_membership_payment', effectivePrincipal, { tier: tier.name, token: selectedToken, amount });
        setMembership(await membershipActor.get_membership_status(Principal.fromText(String(effectivePrincipal))));
        
        // Record transaction in admin analytics
        await recordMembershipPayment(tier.name, selectedToken, amount);
        
        alert(typeof result === 'string' ? result : 'Membership updated');
      } else if (selectedToken === 'ZOMBIE') {
        if (!oisyAgent) { alert('Please connect OISY wallet first.'); setLoading(false); return; }
        const ledger = createIcrcActor('rwdg7-ciaaa-aaaam-qczja-cai');
        if (!ledger) { alert('Ledger not available'); setLoading(false); return; }
        const totalBase = await numberToBaseUnits(ledger, amount);
        // Approve the membership canister to spend tokens (for automatic 50% burning)
        await ledger.icrc2_approve({ spender: { owner: membershipPrincipal, subaccount: [] }, amount: totalBase, fee: [], memo: [], from_subaccount: [], created_at_time: [], expires_at: [] });

        const membershipActor = getMembershipActor();
        const result = await membershipActor.join_membership_with_payment(tier.motoko, Principal.fromText('rwdg7-ciaaa-aaaam-qczja-cai'), selectedToken);
        auditLog.log('join_membership_payment', effectivePrincipal, { tier: tier.name, token: selectedToken, amount });
        setMembership(await membershipActor.get_membership_status(Principal.fromText(String(effectivePrincipal))));
        
        // Record transaction in admin analytics
        await recordMembershipPayment(tier.name, selectedToken, amount);
        
        alert(typeof result === 'string' ? result : 'Membership updated');
      } else if (selectedToken === 'RAVEN') {
        if (!oisyAgent) { alert('Please connect OISY wallet first.'); setLoading(false); return; }
        const ledger = createIcrcActor('4k7jk-vyaaa-aaaam-qcyaa-cai');
        if (!ledger) { alert('Ledger not available'); setLoading(false); return; }
        const totalBase = await numberToBaseUnits(ledger, amount);
        await ledger.icrc1_transfer({ to: { owner: membershipPrincipal, subaccount: [] }, amount: totalBase, fee: [], memo: [], from_subaccount: [], created_at_time: [] });

        const membershipActor = getMembershipActor();
        const result = await membershipActor.join_membership(tier.motoko);
        auditLog.log('join_membership_payment', effectivePrincipal, { tier: tier.name, token: selectedToken, amount });
        setMembership(await membershipActor.get_membership_status(Principal.fromText(String(effectivePrincipal))));
        
        // Record transaction in admin analytics
        await recordMembershipPayment(tier.name, selectedToken, amount);
        
        alert(typeof result === 'string' ? result : 'Membership updated');
      } else if (selectedToken === 'ICP') {
        if (!oisyAgent) { alert('Please connect OISY wallet first.'); setLoading(false); return; }
        const ledger = createIcrcActor('ryjl3-tyaaa-aaaaa-aaaba-cai');
        if (!ledger) { alert('Ledger not available'); setLoading(false); return; }
        const totalBase = await numberToBaseUnits(ledger, amount);
        await ledger.icrc1_transfer({ to: { owner: membershipPrincipal, subaccount: [] }, amount: totalBase, fee: [], memo: [], from_subaccount: [], created_at_time: [] });

      const result = await canisters.membership.join_membership(tier.motoko);
        auditLog.log('join_membership_payment', effectivePrincipal, { tier: tier.name, token: selectedToken, amount });
        setMembership(await canisters.membership.get_membership_status(Principal.fromText(String(effectivePrincipal))));
        
        // Record transaction in admin analytics
        await recordMembershipPayment(tier.name, selectedToken, amount);
        
        alert(typeof result === 'string' ? result : 'Membership updated');
      } else {
        alert('Unsupported token for payment');
      }
    } catch (error) {
      alert(handleError(error, 'processing membership payment'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeMembership = async (newTier) => {
    const membershipActor = getMembershipActor();
    if (!membershipActor || !effectivePrincipal) return;

    // Rate limiting
    if (!rateLimiter.canPerformAction('upgrade_membership', effectivePrincipal, 2, 60000)) {
      alert('Please wait before upgrading again');
      return;
    }

    setLoading(true);
    try {
      const result = await membershipActor.upgrade_membership(newTier.motoko);
      alert(result);
      auditLog.log('upgrade_membership', effectivePrincipal, { newTier });
      setMembership(await membershipActor.get_membership_status(Principal.fromText(String(effectivePrincipal))));
    } catch (error) {
      alert(handleError(error, 'upgrading membership'));
    }
    setLoading(false);
  };

  const refreshStatus = async () => {
    const membershipActor = getMembershipActor();
    if (!membershipActor || !effectivePrincipal) return;
    setLoading(true);
    setError('');
    try {
      const res = await membershipActor.get_membership_status(Principal.fromText(String(effectivePrincipal)));
      setMembership(res);
    } catch (e) {
      setError('Failed to refresh membership: ' + e.message);
    }
    setLoading(false);
  };

  const currentTier = (membership && typeof membership === 'object' && 'tier' in membership && membership.tier && typeof membership.tier === 'object')
    ? Object.keys(membership.tier)[0]
    : null;

  return (
    <div className="relative" style={{scrollBehavior: 'auto'}}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(236,72,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(245,158,11,0.18),transparent_55%)]" />
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl" />
      </div>
    <div className="space-y-8">
      <div className="text-center">
        <div className="text-6xl mb-4">👑</div>
          <h1 className="text-4xl font-bold text-white mb-2">Premium Membership</h1>
          <p className="text-xl text-gray-300">Exclusive features and subscription benefits</p>
        </div>

        {/* Total Burned */}
        <div className="glass-card-dark p-4 border border-white/10 flex items-center justify-center gap-6 text-sm">
          <div className="text-rose-300 font-semibold">Total Burned</div>
          <div className="flex items-center gap-4">
            <div className="text-gray-300">RAVEN: <span className="text-rose-200 font-mono">{burnTotals.RAVEN?.toLocaleString()}</span></div>
            <div className="text-gray-300">ZOMBIE: <span className="text-rose-200 font-mono">{burnTotals.ZOMBIE?.toLocaleString()}</span></div>
          </div>
      </div>

      {/* Header / actions */}
      <div className="flex items-center justify-between glass-card-dark p-3 text-xs text-gray-300 sticky top-16 z-10">
        <div className="truncate">Signed in as: <span className="font-mono">{effectivePrincipal || 'Not logged in'}</span></div>
        <div className="flex items-center gap-2">
          {!iiLoggedIn && (
            <button className="px-3 py-1 rounded bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]" onClick={loginII}>Login with Internet Identity</button>
          )}
          <button className="px-3 py-1 rounded bg-white/10 text-gray-100 hover:bg-white/20" onClick={()=>{ try { setShowAdmin(prev=>!prev); } catch(e) { console.warn('toggle admin failed', e); } }}>
            {showAdmin ? 'Hide Admin Controls' : 'Show Admin Controls'}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Membership status */}
      {(iiLoggedIn || isAdmin) && (
        <div className="glass-card-dark p-6 text-center border border-white/10">
          {loading ? (
            <div className="text-lg text-gray-300">Loading membership status...</div>
          ) : membership && currentTier ? (
            <>
              <div className="text-3xl mb-2">{TIER_MAP.find(t => t.name === currentTier)?.icon}</div>
              <div className="text-xl font-bold text-amber-400 mb-2">{currentTier} Member</div>
              <div className="text-gray-300 mb-2">Joined: {membership?.joined ? new Date(Number(membership.joined) / 1_000_000).toLocaleString() : '—'}</div>
              <div className="text-emerald-400 font-semibold">Active Membership</div>
            </>
          ) : (
            <div className="text-gray-300">No membership found.</div>
          )}
        </div>
      )}

      {/* Membership Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TIER_MAP.map((tier) => {
          const isCurrent = currentTier === tier.name;
          const tierPrices = priceConfig?.[tier.name] || {};
          const isSolanaTier = tier.isSolana;
          const isCryptoComTier = tier.isCryptoCom;
          
          return (
            <div key={tier.id} className={`glass-card-dark p-6 flex flex-col border ${
              isSolanaTier ? 'border-purple-500/30 bg-purple-500/5' : 
              isCryptoComTier ? 'border-pink-500/30 bg-pink-500/5' : 
              'border-white/10'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{tier.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                    {isSolanaTier && (
                      <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full">
                        Solana Pay
                      </span>
                    )}
                    {isCryptoComTier && (
                      <span className="text-xs text-pink-300 bg-pink-500/20 px-2 py-1 rounded-full">
                        Crypto.com Pay
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Token Selection - Only show for non-Solana/Crypto.com tiers */}
                {!isSolanaTier && !isCryptoComTier && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-300">Pay with</label>
                    <select value={selectedToken} onChange={(e)=>setSelectedToken(e.target.value)} className="bg-white/5 text-white text-sm p-2 rounded border border-white/10">
                      {tokens.map(t => (
                        <option key={t.key} value={t.key} disabled={t.disabled}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              {/* Pricing Display */}
              <div className="mb-4">
                {isSolanaTier ? (
                  // Solana tier pricing
                  <div className="space-y-2">
                    <div className="text-center p-3 bg-purple-500/20 rounded border border-purple-500/30">
                      <div className="text-2xl mb-1">🌞</div>
                      <div className="text-purple-200 font-semibold">0.5 SOL</div>
                      <div className="text-xs text-purple-300">Solana Payment</div>
                    </div>
                    <div className="text-center p-3 bg-cyan-500/20 rounded border border-cyan-500/30">
                      <div className="text-2xl mb-1">💎</div>
                      <div className="text-cyan-200 font-semibold">28 SUI</div>
                      <div className="text-xs text-cyan-300">Sui Payment</div>
                    </div>
                  </div>
                ) : isCryptoComTier ? (
                  // Crypto.com tier pricing
                  <div className="space-y-2">
                    <div className="text-center p-3 bg-pink-500/20 rounded border border-pink-500/30">
                      <div className="text-2xl mb-1">🪙</div>
                      <div className="text-pink-200 font-semibold">5,000 CRO</div>
                      <div className="text-xs text-pink-300">Crypto.com Payment</div>
                    </div>
                  </div>
                ) : (
                  // Traditional tier pricing
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {tokens.map(t => (
                      <div key={t.key} className={`p-3 rounded border ${t.disabled ? 'opacity-50 border-white/10 bg-white/5' : 'border-white/10 bg-white/5'}`}>
                        <div className="text-gray-300">{t.label}</div>
                        <div className="text-amber-300 font-mono">{tierPrices?.[t.key] ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Benefits Section */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Benefits:</h4>
                <div className="text-xs text-gray-400 space-y-1">
                  {tier.name === 'Street Team' && (
                    <>
                      <div>• Access to core features</div>
                      <div>• Basic rewards</div>
                      <div>• Community access</div>
                    </>
                  )}
                  {(tier.name === 'Spicy Chads' || tier.name === 'Ghosties' || tier.name === 'Corvids') && (
                    <>
                      <div>• All Street Team benefits</div>
                      <div>• Premium content access</div>
                      <div>• Enhanced rewards (10x)</div>
                      <div>• Priority support</div>
                      <div>• Exclusive features</div>
                      <div>• VIP community access</div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Action Button */}
              <div className="mt-auto flex items-center gap-3">
                {!(iiLoggedIn || oisyAgent || phantomConnected) ? (
                  <button className="px-4 py-2 rounded bg-gray-300 text-gray-600 cursor-not-allowed" disabled>
                    {isSolanaTier ? 'Phantom Wallet Required' : 
                     isCryptoComTier ? 'Crypto.com Wallet Required' : 
                     'Login Required'}
                  </button>
                ) : isCurrent ? (
                  <button className="px-4 py-2 rounded bg-green-500 text-white cursor-not-allowed" disabled>
                    Current Plan
                  </button>
                ) : (
                  <div className="space-y-2">
                    {/* IcPay Option - DISABLED until SPICY tokens are minted */}
                    <button 
                      className="w-full px-4 py-2 rounded text-white font-semibold transition-all cursor-not-allowed opacity-50 bg-gradient-to-r from-blue-500 to-purple-500"
                      disabled={true}
                    >
                      🌐 Join with IcPay (Multi-Chain) - Coming Soon
                    </button>
                    
                    {/* Original Payment Method - DISABLED */}
                    <button 
                      className={`w-full px-4 py-2 rounded text-white font-semibold transition-all cursor-not-allowed opacity-50 ${
                        isSolanaTier 
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500'
                          : isCryptoComTier
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                          : 'bg-gradient-to-r from-amber-500 to-pink-500'
                      }`}
                      disabled={true}
                    >
                      {isSolanaTier ? '🌞 Join with Solana Pay (Coming Soon)' : 
                       isCryptoComTier ? '💳 Join with Crypto.com Pay (Coming Soon)' : 
                       '🌶 Join / Upgrade (IC Tokens) - Coming Soon'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Controls */}
      {showAdmin && isAdmin && (
        <AdminErrorBoundary>
        <div className="glass-card-dark p-6 border border-white/10 space-y-6">
          <div className="text-emerald-200 font-bold mb-2">Admin Controls</div>

          {/* Treasury Balances + Receive */}
          <div className="bg-white/5 border border-white/10 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-gray-200 font-semibold">Treasury Balances</div>
              <div className="flex items-center gap-2">
                <button 
                  className="px-3 py-1 rounded bg-white/10 text-white hover:bg-white/20 disabled:opacity-50" 
                  onClick={loadTreasuryBalances}
                  disabled={treasuryLoading}
                >
                  {treasuryLoading ? 'Loading...' : 'Refresh'}
                </button>
                <button className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500" onClick={()=>setShowReceiveModal(true)}>Receive Treasury Tokens</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {['ICP', 'ckBTC', 'RAVEN', 'ZOMBIE'].map(sym => (
                <div key={sym} className="p-3 bg-black/30 rounded border border-white/10">
                  <div className="text-gray-300 mb-1">{sym}</div>
                  <div className="text-amber-300 font-mono">{treasuryBalances?.[sym]?.human ?? '—'}</div>
                </div>
              ))}
            </div>
            {treasuryLoading && (
              <div className="mt-2 text-xs text-gray-400">Refreshing balances…</div>
            )}
          </div>

          {/* Pricing editor */}
          <div className="space-y-4">
            <div className="text-sm text-gray-300">Tier Pricing (persisted)</div>
            {TIER_MAP.map(tier => (
              <div key={tier.id} className="bg-white/5 border border-white/10 rounded p-4">
                <div className="text-gray-200 font-semibold mb-3">{tier.name}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    { key: 'ICP', label: 'ICP', disabled: false },
                    { key: 'ckBTC', label: 'ckBTC', disabled: false },
                    { key: 'RAVEN', label: 'RAVEN', disabled: false },
                    { key: 'ZOMBIE', label: 'ZOMBIE', disabled: false },
                    { key: 'ckSOL', label: 'ckSOL (coming soon)', disabled: true }
                  ].map(tok => (
                    <div key={tok.key} className="flex flex-col">
                      <label className={`text-xs mb-1 ${tok.disabled ? 'opacity-60' : ''}`}>{tok.label}</label>
                      <input type="number" step="any" disabled={tok.disabled} value={priceConfig?.[tier.name]?.[tok.key] ?? ''}
                        onChange={(e)=>{
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setPriceConfig(prev => ({ ...prev, [tier.name]: { ...(prev?.[tier.name]||{}), [tok.key]: val }}));
                        }}
                        className="bg-white/5 text-white text-sm p-2 rounded border border-white/10 disabled:opacity-50"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Custom Token Management */}
          <div className="space-y-4">
            <div className="text-sm text-gray-300">Custom Token Management</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-300 mb-1 block">Token Symbol</label>
                <input type="text" value={customTokens.symbol || ''} onChange={(e) => setCustomTokens(prev => ({ ...prev, symbol: e.target.value }))} className="w-full bg-white/5 text-white text-sm p-2 rounded border border-white/10" />
              </div>
              <div>
                <label className="text-xs text-gray-300 mb-1 block">Token Principal</label>
                <input type="text" value={customTokens.principal || ''} onChange={(e) => setCustomTokens(prev => ({ ...prev, principal: e.target.value }))} className="w-full bg-white/5 text-white text-sm p-2 rounded border border-white/10" />
              </div>
              <div>
                <label className="text-xs text-gray-300 mb-1 block">Decimals</label>
                <input type="number" value={customTokens.decimals || ''} onChange={(e) => setCustomTokens(prev => ({ ...prev, decimals: Number(e.target.value) }))} className="w-full bg-white/5 text-white text-sm p-2 rounded border border-white/10" />
              </div>
            </div>
            <button 
              onClick={() => {
                if (customTokens.symbol && customTokens.principal && customTokens.decimals) {
                  setTokenRegistry(prev => [...prev, customTokens]);
                  setCustomTokens({});
                }
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500"
            >
              Add Custom Token
            </button>
          </div>

          {/* Route Configuration */}
          <div className="space-y-4">
            <div className="text-sm text-gray-300">Route Configuration</div>
            {Object.entries(routeConfig).map(([route, tokens]) => (
              <div key={route} className="bg-white/5 border border-white/10 rounded p-4">
                <div className="text-gray-200 font-semibold mb-3">{route}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(tokens).map(([token, address]) => (
                    <div key={token} className="flex flex-col">
                      <label className="text-xs text-gray-300 mb-1">{token}</label>
                      <input type="text" value={address} onChange={(e) => setRouteConfig(prev => ({ ...prev, [route]: { ...prev[route], [token]: e.target.value } }))} className="bg-white/5 text-white text-sm p-2 rounded border border-white/10" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        </AdminErrorBoundary>
      )}

      {/* Admin Toggle */}
      {isAdmin && (
        <div className="glass-card-dark p-4 border border-white/10 z-10">
          <button 
            onClick={() => setShowAdmin(!showAdmin)}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500"
          >
            {showAdmin ? 'Hide Admin' : 'Show Admin'}
          </button>
        </div>
      )}

      {/* Custom glassmorphic dark card style */}
      <style>{`
        .glass-card-dark {
          background: rgba(20, 20, 30, 0.85);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18);
          border-radius: 1.5rem;
          border: 1px solid rgba(255,255,255,0.10);
          backdrop-filter: blur(8px);
        }
      `}</style>
      </div>

      {/* IcPay Membership Payment Modal */}
      {showIcPayModal && selectedTierForIcPay && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-2xl w-full border border-gray-600/30">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                🌐 Join {selectedTierForIcPay.name} with IcPay
              </h2>
              <p className="text-gray-300">
                Multi-chain payment with wallet selector and credit card support
              </p>
            </div>
            
            <div className="mb-6">
              <IcPayPayment
                usdAmount={priceConfig?.[selectedTierForIcPay.name]?.ICP || 20}
                onSuccess={handleIcPaySuccess}
                onError={(error) => {
                  console.error('❌ IcPay membership payment failed:', error);
                  alert(`IcPay payment failed: ${error.message || 'Unknown error'}`);
                }}
                config={{
                  publishableKey: 'pk_IBR7yEdfinVZ4484Q5jMxgx69cTS2Lxb'
                }}
              />
            </div>
            
            <div className="text-center">
              <button
                onClick={() => {
                  setShowIcPayModal(false);
                  setSelectedTierForIcPay(null);
                }}
                className="px-6 py-3 bg-gray-600/50 hover:bg-gray-600/70 text-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipPage;
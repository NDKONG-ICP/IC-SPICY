import React, { useEffect, useMemo, useState } from 'react';
import { useWallet } from '../WalletContext';
import { Principal } from '@dfinity/principal';
import { Actor } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { ConnectWallet, useIdentityKit, useAgent } from '@nfid/identitykit/react';

const TOKEN_LABELS = {
  'ryjl3-tyaaa-aaaaa-aaaba-cai': 'ICP',
  'mxzaz-hqaaa-aaaar-qaada-cai': 'ckBTC',
  '4k7jk-vyaaa-aaaam-qcyaa-cai': 'RAVEN',
  'rwdg7-ciaaa-aaaam-qczja-cai': 'ZOMBIE',
};

const TOKEN_DECIMALS = {
  ICP: 8,
  ckBTC: 8,
  RAVEN: 8,
  ZOMBIE: 8,
};

const icrcIdlFactory = ({ IDL }) => {
  const Account = IDL.Record({ owner: IDL.Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) });
  const TransferArg = IDL.Record({
    to: Account,
    amount: IDL.Nat,
    fee: IDL.Opt(IDL.Vec(IDL.Nat8)),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
  });
  const TransferError = IDL.Variant({
    GenericError: IDL.Record({ message: IDL.Text, error_code: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    TooOld: IDL.Null,
    CreatedInFuture: IDL.Null,
    BadRecipient: IDL.Record({ message: IDL.Text }),
  });
  const TransferResult = IDL.Variant({ Ok: IDL.Nat, Err: TransferError });
  return IDL.Service({
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
    icrc1_transfer: IDL.Func([TransferArg], [TransferResult], []),
  });
};

function formatBaseUnits(amountStr, decimals) {
  try {
    const BI = typeof window !== 'undefined' && typeof window.BigInt !== 'undefined' ? window.BigInt : null;
    if (!BI) {
      const num = Number(amountStr);
      if (Number.isNaN(num)) return amountStr;
      const scaled = num / Math.pow(10, decimals);
      const fixed = scaled.toFixed(Math.min(decimals, 8));
      return fixed.replace(/0+$/, '').replace(/\.$/, '');
    }
    const value = BI(amountStr);
    const negative = value < 0n ? '-' : '';
    const u = value < 0n ? -value : value;
    const factor = BI(10) ** BI(decimals);
    const whole = u / factor;
    const frac = u % factor;
    let fracStr = frac.toString().padStart(decimals, '0');
    fracStr = fracStr.replace(/0+$/, '');
    return negative + whole.toString() + (fracStr ? '.' + fracStr : '');
  } catch {
    return amountStr;
  }
}

function toBaseUnitsFromHuman(humanAmount, decimals) {
  const BI = typeof window !== 'undefined' && typeof window.BigInt !== 'undefined' ? window.BigInt : null;
  if (!BI) {
    const num = Number(humanAmount);
    if (Number.isNaN(num)) throw new Error('Invalid amount');
    return Math.round(num * Math.pow(10, decimals));
  }
  const parts = String(humanAmount).trim();
  if (!/^\d*(?:\.\d*)?$/.test(parts)) throw new Error('Invalid amount format');
  const [intPart, fracPartRaw = ''] = parts.split('.');
  const fracPart = (fracPartRaw + '0'.repeat(decimals)).slice(0, decimals);
  const digits = (intPart || '0') + fracPart;
  return BI(digits);
}

const WalletPage = () => {
  const { 
    principal: walletContextPrincipal, 
    canisters, 
    agent: walletContextAgent,
    iiLoggedIn,
    loginII,
    logoutII,
    plugConnected,
    connectPlug,
    disconnectPlug,
    phantomConnected,
    phantomAddress,
    phantomNetwork,
    phantomBalance,
    connectPhantom,
    disconnectPhantom
  } = useWallet();
  
  // IdentityKit integration
  const { user, signer } = useIdentityKit();
  const oisyAgent = useAgent();
  
  // Determine effective wallet state
  const effectivePrincipal = user?.principal?.toText() || walletContextPrincipal;
  const effectiveAgent = oisyAgent || walletContextAgent;
  const isConnected = !!(user?.principal || iiLoggedIn || plugConnected || phantomConnected);
  const [spicyBalance, setSpicyBalance] = useState(0);
  const [heatBalance, setHeatBalance] = useState(0);
  const [walletActor, setWalletActor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  // ICRC state
  const [icrcTokens, setIcrcTokens] = useState([]);
  const [icrcBalances, setIcrcBalances] = useState({});
  const [icrcLoading, setIcrcLoading] = useState(false);

  // Copy state
  const [copied, setCopied] = useState(false);

  // Simplified transfer UI state
  const [tab, setTab] = useState('send'); // 'send' | 'receive'
  const availableTokenLabels = useMemo(() => {
    const dynamicLabels = icrcTokens
      .map((t) => TOKEN_LABELS[t])
      .filter((x) => !!x);
    const base = ['SPICY', 'HEAT', ...dynamicLabels];
    return Array.from(new Set(base));
  }, [icrcTokens]);

  // Determine which wallet is connected
  const getWalletType = () => {
    if (user?.principal) {
      if (signer?.signerType === 'OISY' || signer?.name?.includes('OISY') || signer?.id === 'OISY') return 'OISY';
      if (signer?.signerType === 'NFIDW' || signer?.name?.includes('NFID') || signer?.id === 'NFIDW') return 'NFID';
    }
    if (iiLoggedIn) return 'Internet Identity';
    if (plugConnected) return 'Plug';
    if (phantomConnected) return 'Phantom';
    return null;
  };

  const [selectedToken, setSelectedToken] = useState('ICP');
  const [destPrincipal, setDestPrincipal] = useState('');
  const [amountHuman, setAmountHuman] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const LABEL_TO_CANISTER = useMemo(() => {
    const entries = Object.entries(TOKEN_LABELS).map(([cid, label]) => [label, cid]);
    return Object.fromEntries(entries);
  }, []);

  const handleCopyPrincipal = async () => {
    if (!effectivePrincipal) return;
    try {
      await navigator.clipboard.writeText(effectivePrincipal);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleCopyPhantomAddress = async () => {
    if (!phantomAddress) return;
    try {
      await navigator.clipboard.writeText(phantomAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  useEffect(() => { 
    // For IdentityKit wallets, create wallet actor directly
    if (user?.principal && effectiveAgent) {
      const wallet2Idl = ({ IDL }) => IDL.Service({
        getSpicyBalance: IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
        getAllBalances: IDL.Func([IDL.Principal], [IDL.Vec(IDL.Record({ token: IDL.Text, amount: IDL.Nat }))], ['query']),
        getTransactionHistory: IDL.Func([IDL.Principal], [IDL.Vec(IDL.Record({ to: IDL.Text, from: IDL.Text, amount: IDL.Nat, token: IDL.Text, timestamp: IDL.Nat64 }))], ['query']),
        transfer: IDL.Func([IDL.Principal, IDL.Text, IDL.Nat], [IDL.Bool], []),
        listIcrcTokens: IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
        icrcBalance: IDL.Func([IDL.Principal, IDL.Principal], [IDL.Nat], ['query']),
      });
      
      const walletCanisterId = 'o3yul-xiaaa-aaaap-qp5ra-cai'; // wallet2 canister ID
      const identityKitWalletActor = Actor.createActor(wallet2Idl, { 
        agent: effectiveAgent, 
        canisterId: walletCanisterId 
      });
      setWalletActor(identityKitWalletActor);
    } else if (phantomConnected) {
      // For Phantom wallet, we don't need a wallet actor for IC tokens
      setWalletActor(null);
    } else {
      setWalletActor(canisters?.wallet2 || null);
    }
  }, [canisters, user, effectiveAgent, phantomConnected]);

  useEffect(() => {
    (async () => {
      // Skip IC token loading if Phantom wallet is connected
      if (phantomConnected) return;
      
      if (walletActor && effectivePrincipal) {
        try {
          const p = Principal.fromText(effectivePrincipal);
          const spicy = await walletActor.getSpicyBalance(p);
          const all = await walletActor.getAllBalances(p);
          const heat = all.find((b) => b.token === 'HEAT')?.amount ?? 0;
          setSpicyBalance(Number(spicy));
          setHeatBalance(Number(heat));
          const txHistory = await walletActor.getTransactionHistory(p);
          setTransactions(txHistory);
          const tokens = await walletActor.listIcrcTokens();
          const tokenIds = tokens.map((pp) => (pp.toText ? pp.toText() : pp));
          // Add default ICRC tokens if not already included
          const defaultTokens = Object.keys(TOKEN_LABELS);
          const allTokens = [...new Set([...tokenIds, ...defaultTokens])];
          setIcrcTokens(allTokens);
          const balances = {};
          for (const t of allTokens) {
            try {
              const bal = await walletActor.icrcBalance(Principal.fromText(t), p);
              balances[t] = bal?.toString ? bal.toString() : String(bal);
            } catch (e) { balances[t] = '0'; }
          }
          setIcrcBalances(balances);
        } catch (e) { console.error('Error fetching wallet data:', e); }
      }
    })();
  }, [walletActor, effectivePrincipal, phantomConnected]);

  const refreshBalances = async () => {
    if (!walletActor || !effectivePrincipal || phantomConnected) return;
    setLoading(true);
    try {
      const p = Principal.fromText(effectivePrincipal);
      const spicy = await walletActor.getSpicyBalance(p);
      const all = await walletActor.getAllBalances(p);
      const heat = all.find((b) => b.token === 'HEAT')?.amount ?? 0;
      setSpicyBalance(Number(spicy));
      setHeatBalance(Number(heat));
    } catch (error) { console.error('Error refreshing balances:', error); }
    setLoading(false);
  };

  const refreshIcrc = async () => {
    if (!walletActor || !effectivePrincipal || phantomConnected) return;
    setIcrcLoading(true);
    try {
      const p = Principal.fromText(effectivePrincipal);
      const tokens = await walletActor.listIcrcTokens();
      const tokenIds = tokens.map((pp) => (pp.toText ? pp.toText() : pp));
      // Add default ICRC tokens if not already included
      const defaultTokens = Object.keys(TOKEN_LABELS);
      const allTokens = [...new Set([...tokenIds, ...defaultTokens])];
      setIcrcTokens(allTokens);
      const balances = {};
      for (const t of allTokens) {
        try {
          const bal = await walletActor.icrcBalance(Principal.fromText(t), p);
          balances[t] = bal?.toString ? bal.toString() : String(bal);
        } catch (e) { balances[t] = '0'; }
      }
      setIcrcBalances(balances);
    } catch (e) { console.error('ICRC refresh failed', e); }
    setIcrcLoading(false);
  };

  const openConfirm = (e) => {
    e.preventDefault();
    if (!selectedToken || !destPrincipal || !amountHuman) {
      alert('Please fill token, destination principal, and amount');
      return;
    }
    setConfirmChecked(false);
    setShowConfirm(true);
  };

  const handleConfirmTransfer = async () => {
    if (!confirmChecked) return;
    if (!effectivePrincipal) return;
    try {
      if (selectedToken === 'SPICY' || selectedToken === 'HEAT') {
        if (!walletActor) throw new Error('Wallet not ready');
        const units = parseInt(amountHuman, 10);
        if (Number.isNaN(units) || units <= 0) throw new Error('Amount must be a positive integer');
        const ok = await walletActor.transfer(Principal.fromText(destPrincipal), selectedToken, units);
        if (!ok) throw new Error('Transfer failed');
        await refreshBalances();
      } else {
        if (!effectiveAgent) throw new Error('Agent not initialized');
        const canisterId = LABEL_TO_CANISTER[selectedToken];
        if (!canisterId) throw new Error('Unsupported token');
        const decimals = TOKEN_DECIMALS[selectedToken] ?? 8;
        const base = toBaseUnitsFromHuman(amountHuman, decimals);
        const ledger = Actor.createActor(icrcIdlFactory, { agent: effectiveAgent, canisterId });
        const res = await ledger.icrc1_transfer({
          to: { owner: Principal.fromText(destPrincipal), subaccount: [] },
          amount: base,
          fee: [],
          memo: [],
          from_subaccount: [],
          created_at_time: [],
        });
        if ('Err' in res) {
          const k = Object.keys(res.Err)[0];
          throw new Error(`Ledger error: ${k}`);
        }
        await refreshIcrc();
      }
      setShowConfirm(false);
      setAmountHuman('');
      setDestPrincipal('');
      alert('Transfer submitted');
    } catch (err) {
      alert(err?.message || 'Transfer failed');
    }
  };

  if (!isConnected) {
    return (
      <div className="relative min-h-screen py-8 px-2 md:px-0 flex flex-col items-center justify-center overflow-x-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none select-none">
          <div className="w-full h-full bg-gradient-to-br from-blue-900 via-purple-800 to-indigo-700 opacity-70" />
        </div>
        
        <div className="glass-card-dark w-full max-w-md p-8 z-10">
          <h2 className="text-2xl font-bold text-yellow-100 mb-6 text-center">Connect Your Wallet</h2>
          <p className="text-gray-300 text-center mb-6">Choose your preferred wallet to manage tokens and view balances</p>
          
          <div className="space-y-4">
            {/* IdentityKit Wallets */}
            <div className="text-center">
              <ConnectWallet />
              <p className="text-xs text-gray-400 mt-2">OISY & NFID wallets</p>
            </div>
            
            {/* Traditional Wallets */}
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={loginII}
                className="w-full px-4 py-3 rounded-lg bg-blue-600/20 text-blue-200 hover:bg-blue-600/30 border border-blue-500/30 transition-all"
              >
                🔐 Internet Identity
              </button>
              
              <button 
                onClick={connectPlug}
                className="w-full px-4 py-3 rounded-lg bg-purple-600/20 text-purple-200 hover:bg-purple-600/30 border border-purple-500/30 transition-all"
              >
                🔌 Plug Wallet
              </button>
              
              <button 
                onClick={connectPhantom}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-200 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/30 transition-all"
              >
                👻 Phantom Wallet
              </button>
            </div>
          </div>
          
          <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-400/30">
            <p className="text-amber-100 text-xs text-center">
              Multiple wallet support: OISY, NFID, Internet Identity, Plug, and Phantom
            </p>
          </div>
        </div>
        
        <style>{`
          .glass-card-dark { background: rgba(20, 20, 30, 0.85); box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18); border-radius: 1.5rem; border: 1px solid rgba(255,255,255,0.10); backdrop-filter: blur(8px); }
        `}</style>
      </div>
    );
  }

  // For Phantom wallet, we don't need to wait for walletActor
  if (!phantomConnected && !walletActor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl mb-4">Initializing wallet...</h2>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen py-8 px-2 md:px-0 flex flex-col items-center justify-center overflow-x-hidden space-y-8">
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <div className="w-full h-full bg-gradient-to-br from-blue-900 via-purple-800 to-indigo-700 opacity-70" />
        <div className="absolute inset-0 bg-black bg-opacity-60" />
      </div>

      <div className="text-center glass-card-dark mb-8 px-6 py-8 md:px-12 md:py-10" style={{borderRadius: '2rem'}}>
        <div className="text-6xl mb-4">💎</div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-yellow-100 mb-4 tracking-tight">Spicy Wallet</h1>
        <p className="text-xl text-gray-100">
          {phantomConnected 
            ? 'Manage your Solana assets and use Solana Pay throughout the dApp' 
            : 'Manage your $SPICY and $HEAT tokens on the Internet Computer'
          }
        </p>
        
        {/* Wallet Connection Status */}
        <div className="mt-4 mb-2">
          <span className={`px-3 py-1 text-xs rounded-full ${
            getWalletType() === 'OISY' ? 'bg-emerald-600/20 text-emerald-200' :
            getWalletType() === 'NFID' ? 'bg-blue-600/20 text-blue-200' :
            getWalletType() === 'Internet Identity' ? 'bg-purple-600/20 text-purple-200' :
            getWalletType() === 'Plug' ? 'bg-pink-600/20 text-pink-200' :
            getWalletType() === 'Phantom' ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-200' :
            'bg-gray-600/20 text-gray-200'
          }`}>
            {getWalletType() ? `${getWalletType()} Connected` : 'Wallet Connected'}
          </span>
        </div>
        
        {/* Display appropriate address/principal */}
        {phantomConnected ? (
          <div className="mt-4">
            <p className="text-sm text-gray-300 mb-2">Solana Address:</p>
            <button onClick={handleCopyPhantomAddress} className="px-3 py-1 rounded-lg bg-white/10 text-yellow-100 hover:bg-white/20 transition active:scale-[0.99]">
              <span className="font-mono break-all">{phantomAddress}</span>
              <span className="ml-2 text-xs text-emerald-300">{copied ? 'Copied!' : 'Click to copy'}</span>
            </button>
            <div className="mt-2 text-sm text-gray-300">
              Network: {phantomNetwork} | Balance: {phantomBalance.toFixed(4)} SOL
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-gray-300 mb-2">Principal:</p>
            <button onClick={handleCopyPrincipal} className="px-3 py-1 rounded-lg bg-white/10 text-yellow-100 hover:bg-white/20 transition active:scale-[0.99]">
              <span className="font-mono break-all">{effectivePrincipal}</span>
              <span className="ml-2 text-xs text-emerald-300">{copied ? 'Copied!' : 'Click to copy'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Phantom Wallet Specific Section */}
      {phantomConnected && (
        <div className="glass-card-dark w-full max-w-4xl p-8 z-10">
          <h2 className="text-2xl font-bold text-yellow-100 mb-6 text-center">Solana Wallet</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card-dark border border-purple-200/20 rounded-lg p-6 text-center">
              <div className="text-4xl mb-2">👻</div>
              <div className="text-3xl font-bold text-purple-200 mb-2">{phantomBalance.toFixed(4)}</div>
              <div className="text-lg text-gray-300">SOL</div>
              <div className="text-sm text-gray-400 mt-2">Solana Balance</div>
            </div>
            <div className="glass-card-dark border border-blue-200/20 rounded-lg p-6 text-center">
              <div className="text-4xl mb-2">🌐</div>
              <div className="text-2xl font-bold text-blue-200 mb-2">{phantomNetwork}</div>
              <div className="text-lg text-gray-300">Network</div>
              <div className="text-sm text-gray-400 mt-2">Solana Network</div>
            </div>
          </div>
          
          <div className="mt-6 p-4 rounded-lg bg-purple-500/10 border border-purple-400/30">
            <h3 className="text-lg font-semibold text-purple-200 mb-2">Solana Pay Ready! 🚀</h3>
            <p className="text-gray-300 text-sm">
              Your Phantom wallet is now connected and ready to use Solana Pay throughout the dApp. 
              You can make purchases in the Shop, use Solana Pay features, and manage your Solana assets.
            </p>
          </div>
        </div>
      )}

      {/* IC Wallet Section - Only show if not Phantom */}
      {!phantomConnected && (
        <>
          <div className="glass-card-dark w-full max-w-4xl p-6">
            <div className="flex gap-2 mb-4">
              <button className={`px-4 py-2 rounded ${tab === 'send' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-200'}`} onClick={() => setTab('send')}>Send</button>
              <button className={`px-4 py-2 rounded ${tab === 'receive' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-200'}`} onClick={() => setTab('receive')}>Receive</button>
            </div>
            {tab === 'send' ? (
              <form onSubmit={openConfirm} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select className="p-2 rounded bg-black/30 border border-white/10 text-white" value={selectedToken} onChange={(e)=>setSelectedToken(e.target.value)}>
                    {availableTokenLabels.map((label) => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                  </select>
                  <input className="p-2 rounded bg-black/30 border border-white/10 text-white" placeholder="Destination Principal" value={destPrincipal} onChange={(e)=>setDestPrincipal(e.target.value)} />
                  <input className="p-2 rounded bg-black/30 border border-white/10 text-white" placeholder={selectedToken === 'SPICY' || selectedToken === 'HEAT' ? 'Amount (whole units)' : `Amount (${selectedToken})`} value={amountHuman} onChange={(e)=>setAmountHuman(e.target.value)} />
                </div>
                <div className="rounded bg-amber-500/10 border border-amber-400/30 text-amber-100 text-sm p-3">
                  Please confirm the destination principal and amount before proceeding. Crypto transactions are irreversible. Do your own due diligence and research.
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="px-5 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Review & Transfer</button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="text-gray-200 text-sm">Share your principal to receive tokens:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs md:text-sm break-all p-2 rounded bg-black/30 border border-white/10 text-white">{effectivePrincipal}</code>
                  <button onClick={handleCopyPrincipal} className="px-3 py-2 rounded bg-white/10 text-gray-100 hover:bg-white/20">Copy</button>
                </div>
              </div>
            )}
          </div>

          <div className="glass-card-dark w-full max-w-4xl p-8 z-10">
            <h2 className="text-2xl font-bold text-yellow-100 mb-6">Token Balances</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card-dark border border-yellow-200/20 rounded-lg p-6 text-center">
                <div className="text-4xl mb-2">🌶️</div>
                <div className="text-3xl font-bold text-yellow-200 mb-2">{spicyBalance.toLocaleString()}</div>
                <div className="text-lg text-gray-300">$SPICY</div>
                <div className="text-sm text-gray-400 mt-2">Spicy Token</div>
              </div>
              <div className="glass-card-dark border border-orange-200/20 rounded-lg p-6 text-center">
                <div className="text-4xl mb-2">🔥</div>
                <div className="text-3xl font-bold text-orange-200 mb-2">{heatBalance.toLocaleString()}</div>
                <div className="text-lg text-gray-300">$HEAT</div>
                <div className="text-sm text-gray-400 mt-2">Heat Token</div>
              </div>
            </div>
            <div className="flex justify-center mt-6">
              <button onClick={refreshBalances} className="bg-emerald-500 text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-emerald-600 transition" disabled={loading}>
                {loading ? 'Refreshing...' : '🔄 Refresh Balances'}
              </button>
            </div>
          </div>

          <div className="glass-card-dark w-full max-w-4xl p-8 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-yellow-100">ICRC Tokens</h2>
              <button onClick={refreshIcrc} className="px-4 py-2 bg-blue-500 text-white rounded" disabled={icrcLoading}>{icrcLoading ? 'Refreshing…' : 'Refresh'}</button>
            </div>
            {icrcTokens.length === 0 ? (
              <div className="text-gray-300">No ICRC tokens registered yet.</div>
            ) : (
              <div className="space-y-3">
                {icrcTokens.map((t) => {
                  const label = TOKEN_LABELS[t] || 'Token';
                  const decimals = TOKEN_DECIMALS[label] ?? 8;
                  const raw = icrcBalances[t] ?? '0';
                  const display = formatBaseUnits(raw, decimals);
                  return (
                    <div key={t} className="flex items-center justify-between p-3 rounded border border-white/10">
                      <div className="text-gray-200 text-sm">{label}</div>
                      <div className="text-yellow-200 font-bold">{display} {label}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Transfer Confirmation Modal - Only show if not Phantom */}
      {!phantomConnected && (
        <div className={`fixed inset-0 z-50 items-center justify-center ${showConfirm ? 'flex' : 'hidden'}`} style={{background: 'rgba(0,0,0,0.6)'}}>
          <div className="glass-card-dark w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-yellow-100 mb-3">Confirm Transfer</h3>
            <div className="text-gray-200 text-sm space-y-1 mb-3">
              <div><span className="text-gray-400">Token:</span> {selectedToken}</div>
              <div><span className="text-gray-400">Amount:</span> {amountHuman} {selectedToken}</div>
              <div className="break-all"><span className="text-gray-400">To:</span> {destPrincipal}</div>
            </div>
            <div className="rounded bg-amber-500/10 border border-amber-400/30 text-amber-100 text-xs p-3 mb-3">
              Transactions are irreversible. Verify the destination principal and amount. Do your own due diligence and research before engaging in crypto transactions.
            </div>
            <label className="flex items-center gap-2 text-gray-200 text-sm mb-4">
              <input type="checkbox" checked={confirmChecked} onChange={(e)=>setConfirmChecked(e.target.checked)} />
              I confirm the destination principal and amount are correct.
            </label>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-white/10 text-gray-100 hover:bg-white/20" onClick={()=>setShowConfirm(false)}>Cancel</button>
              <button className={`px-4 py-2 rounded ${confirmChecked ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-600/50 text-white/70 cursor-not-allowed'}`} disabled={!confirmChecked} onClick={handleConfirmTransfer}>Confirm Transfer</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .glass-card-dark { background: rgba(20, 20, 30, 0.85); box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18); border-radius: 1.5rem; border: 1px solid rgba(255,255,255,0.10); backdrop-filter: blur(8px); }
      `}</style>
    </div>
  );
};

export default WalletPage; 
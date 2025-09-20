import './polyfills';
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { WalletProvider } from "./WalletContext";
import IcPayPayment from './components/IcPayPayment';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AiPage = lazy(() => import('./pages/AiPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const PortalPage = lazy(() => import('./pages/PortalPage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const WhitepaperPage = lazy(() => import('./pages/WhitepaperPage'));
const CoopPage = lazy(() => import('./pages/CoopPage'));
const CoopLogisticsPage = lazy(() => import('./pages/CoopLogisticsPage'));
const LogisticsPage = lazy(() => import('./pages/LogisticsPage'));
const MembershipPage = lazy(() => import('./pages/MembershipPage'));
const UserPage = lazy(() => import('./pages/UserPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SolanaPayPage = lazy(() => import('./pages/SolanaPayPage'));
const PhantomWalletPage = lazy(() => import('./pages/PhantomWalletPage'));
const CryptoComPayPage = lazy(() => import('./pages/CryptoComPayPage'));

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: String(error?.message || error) };
  }
  componentDidCatch(error, info) {
    console.error('App render error', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white p-6">
          <div className="max-w-2xl mx-auto bg-red-900/30 border border-red-500/40 p-4 rounded">
            <div className="font-semibold mb-2">An error occurred</div>
            <div className="text-xs break-all">{this.state.errorMsg}</div>
            <button className="mt-3 px-3 py-1 rounded bg-white/10" onClick={()=>this.setState({ hasError: false, errorMsg: '' })}>Retry</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Enhanced loading component for better UX
const PageLoadingFallback = () => (
  <div className="relative min-h-screen flex items-center justify-center">
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(236,72,153,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(245,158,11,0.18),transparent_55%)]" />
    </div>
    <div className="text-center">
      <LoadingSpinner />
      <div className="mt-4 text-lg text-white">Loading...</div>
    </div>
  </div>
);

function App() {
  return (
    <WalletProvider>
      <AppErrorBoundary>
        <Router>
          <Layout>
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/ai" element={<AiPage />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/wallet2" element={<WalletPage />} />
                <Route path="/portal" element={<PortalPage />} />
                <Route path="/game" element={<GamePage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:postId" element={<BlogPostPage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/membership" element={<MembershipPage />} />
                <Route path="/whitepaper" element={<WhitepaperPage />} />
                <Route path="/coop" element={<CoopPage />} />
                <Route path="/coop-logistics" element={<CoopLogisticsPage />} />
                <Route path="/logistics" element={<LogisticsPage />} />
                <Route path="/user" element={<UserPage />} />
                <Route path="/profile" element={<UserPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/solana-pay" element={<SolanaPayPage />} />
                <Route path="/phantom-wallet" element={<PhantomWalletPage />} />
                <Route path="/cronos-pay" element={<CryptoComPayPage />} />
              </Routes>
            </Suspense>
          </Layout>
        </Router>
      </AppErrorBoundary>
    </WalletProvider>
  );
}

export default App;

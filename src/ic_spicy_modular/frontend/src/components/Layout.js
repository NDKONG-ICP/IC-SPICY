import React from 'react';
import GlobalNav from '../components/GlobalNav';

const Layout = ({ children }) => {
  const [runtimeError, setRuntimeError] = React.useState(null);

  React.useEffect(() => {
    const onError = (event) => {
      try { setRuntimeError(event.error ? String(event.error) : String(event.message || 'Unknown error')); } catch {}
    };
    const onRejection = (event) => {
      try { setRuntimeError(event.reason ? String(event.reason) : 'Unhandled promise rejection'); } catch {}
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return (
    <div>
      <GlobalNav />
      {runtimeError && (
        <div className="fixed top-16 left-0 right-0 z-[9999] px-3 pointer-events-none">
          <div className="max-w-5xl mx-auto glass-card-dark border border-red-500/40 p-3 text-sm text-red-200 break-all pointer-events-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold mb-1">Runtime error</div>
                <div>{runtimeError}</div>
              </div>
              <button className="ml-2 px-2 py-1 rounded bg-white/10 text-gray-100 hover:bg-white/20" onClick={() => setRuntimeError(null)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
      <main className="pt-16 lg:pt-20">{children}</main>
      <style>{`
        .glass-card-dark { background: rgba(20, 20, 30, 0.85); box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18); border-radius: 1rem; border: 1px solid rgba(255,255,255,0.10); backdrop-filter: blur(6px); }
      `}</style>
    </div>
  );
};

export default Layout; 
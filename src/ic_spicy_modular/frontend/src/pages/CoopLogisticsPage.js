import React from 'react';

const CoopLogisticsPage = () => {
  const handleLogisticsAccess = () => {
    // Direct link to IC SPICY Logistics application
    window.open('https://icspicy-logistics-ynt.caffeine.xyz', '_blank');
  };

  // Auto-redirect to logistics app on page load
  React.useEffect(() => {
    handleLogisticsAccess();
  }, []);

  return (
    <div className="relative min-h-screen py-8 px-2 md:px-0 flex flex-col items-center justify-center overflow-x-hidden space-y-8">
      {/* Background Image and Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <img src="/coop.jpg" alt="Co-op Logistics Background" className="w-full h-full object-cover object-center blur-sm opacity-70" />
        <div className="absolute inset-0 bg-black bg-opacity-60" />
      </div>
      
      {/* Header */}
      <div className="text-center glass-card-dark mb-8 px-6 py-8 md:px-12 md:py-10" style={{borderRadius: '2rem', fontFamily: 'serif'}}>
        <h1 className="text-4xl md:text-5xl font-extrabold text-yellow-100 mb-4 tracking-tight" style={{letterSpacing:'0.01em'}}>
          🌶️ IC SPICY Co-op Logistics
        </h1>
        <p className="text-xl text-gray-100 max-w-2xl mx-auto mb-6">
          Redirecting to IC SPICY Logistics Application...
        </p>
        <div className="text-sm text-gray-300">
          If you're not automatically redirected, click the button below:
        </div>
      </div>

      {/* Main Logistics Access */}
      <div className="w-full max-w-2xl">
        <div className="glass-card-dark flex flex-col items-center p-8 border-2 border-blue-400/30 rounded-2xl shadow-xl">
          <div className="text-6xl mb-4 drop-shadow-lg">📦</div>
          <h2 className="text-3xl font-bold text-blue-200 mb-4">IC SPICY Logistics</h2>
          <p className="text-gray-100 text-center mb-6">
            Access the complete logistics management system for IC SPICY Co-op operations.
          </p>
          <button 
            onClick={handleLogisticsAccess}
            className="w-full bg-gradient-to-r from-blue-400 to-purple-500 text-white font-bold py-4 px-6 rounded-lg hover:from-purple-500 hover:to-blue-400 transition-all shadow-lg text-lg"
          >
            🚀 Launch Logistics Application
          </button>
          <div className="mt-4 text-xs text-gray-400 text-center">
            Opens in new tab: <a href="https://icspicy-logistics-ynt.caffeine.xyz" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200">
              icspicy-logistics-ynt.caffeine.xyz
            </a>
          </div>
        </div>
      </div>


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
  );
};

export default CoopLogisticsPage;

import React from 'react';
import PhantomWalletIntegration from '../components/PhantomWalletIntegration';

const PhantomWalletPage = () => {
  return (
    <div className="relative min-h-screen py-8 px-2 md:px-0 flex flex-col items-center justify-center overflow-x-hidden space-y-8">
      {/* Luxury Background */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-800 to-indigo-700 opacity-70" />
        <div className="absolute inset-0 bg-black bg-opacity-60" />
      </div>

      {/* Phantom Wallet Integration */}
      <PhantomWalletIntegration />
    </div>
  );
};

export default PhantomWalletPage;

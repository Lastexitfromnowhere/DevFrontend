import React from "react";

export default function DesktopAppPromo() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
      <span className="text-6xl mb-4">🖥️</span>
      <h2 className="text-2xl md:text-3xl font-bold mb-4">Desktop App Coming Soon!</h2>
      <p className="text-lg text-gray-300 mb-6 max-w-xl">
        Our desktop application is coming soon for Windows, Mac, and Linux.<br />
        Stay tuned to enjoy a super simple, fast, and secure VPN experience on your computer.
      </p>
      {/* Large app image in a modern card with opacity */}
      <div className="mt-6 bg-black/60 rounded-2xl shadow-2xl flex flex-col items-center justify-center p-0 overflow-hidden">
        <img
          src="/app.png"
          alt="Desktop App Preview"
          className="w-full h-auto max-w-2xl object-contain opacity-90"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
}

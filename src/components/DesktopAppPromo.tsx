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
      {/* Carte stylée avec l'image de l'app */}
      <div className="mt-6 bg-gradient-to-tr from-blue-800/60 to-gray-900/80 rounded-2xl shadow-2xl p-4 flex flex-col items-center transition-transform duration-300 hover:scale-105 hover:shadow-blue-400/40">
        <img
          src="/app.png"
          alt="Aperçu Application Desktop"
          className="w-40 h-24 object-contain rounded-xl shadow-lg mb-2 border border-blue-700/40 bg-gray-950"
        />
        <span className="text-xs text-blue-300 tracking-wide uppercase mt-1">App Preview</span>
      </div>
    </div>
  );
}

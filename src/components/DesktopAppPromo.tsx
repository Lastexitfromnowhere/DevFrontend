import React from "react";

export default function DesktopAppPromo() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
      <span className="text-6xl mb-4">🖥️</span>
      <h2 className="text-2xl md:text-3xl font-bold mb-4">Desktop App Coming Soon!</h2>
      <p className="text-lg text-gray-300 mb-6 max-w-xl">
        Notre application desktop arrive bientôt sur Windows, Mac et Linux.<br />
        Reste connecté pour profiter d'une expérience VPN ultra simple, rapide et sécurisée sur ton ordinateur.
      </p>
      {/* Espace réservé pour une image ou un bouton de téléchargement */}
      <div className="w-40 h-24 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
        Image à venir
      </div>
    </div>
  );
}

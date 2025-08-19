// libp2p-polyfill.js

// Polyfill pour Event
if (typeof global.Event !== 'function') {
  global.Event = class Event {
    constructor(type, options = {}) {
      this.type = type;
      this.bubbles = options.bubbles || false;
      this.cancelable = options.cancelable || false;
      this.composed = options.composed || false;
    }
  };
}

// Polyfill pour CustomEvent qui étend Event
if (typeof global.CustomEvent !== 'function') {
  global.CustomEvent = class CustomEvent extends global.Event {
    constructor(type, options = {}) {
      super(type, options);
      this.detail = options.detail || null;
    }
  };
}

// Patch pour libp2p - sera exécuté après le chargement des modules
const patchLibp2p = () => {
  try {
    // Trouver le module @libp2p/interface
    const libp2pInterface = require('@libp2p/interface');
    
    if (libp2pInterface && libp2pInterface.EventTarget) {
      // Remplacer la méthode dispatchEvent pour qu'elle accepte CustomEvent
      const originalDispatchEvent = libp2pInterface.EventTarget.prototype.dispatchEvent;
      
      libp2pInterface.EventTarget.prototype.dispatchEvent = function(event) {
        // Convertir CustomEvent en Event si nécessaire
        if (event instanceof CustomEvent && !(event instanceof Event)) {
          const newEvent = new Event(event.type, {
            bubbles: event.bubbles,
            cancelable: event.cancelable,
            composed: event.composed
          });
          
          // Copier les propriétés de detail
          if (event.detail) {
            newEvent.detail = event.detail;
          }
          
          return originalDispatchEvent.call(this, newEvent);
        }
        
        return originalDispatchEvent.call(this, event);
      };
      
      console.log('✅ Patch libp2p appliqué avec succès');
    }
  } catch (err) {
    console.error('❌ Erreur lors du patch libp2p:', err);
  }
};

// Mock pour wireguardUtils si nécessaire
global.wireguardUtils = global.wireguardUtils || {};
if (typeof global.wireguardUtils.createInitialWireGuardConfig !== 'function') {
  global.wireguardUtils.createInitialWireGuardConfig = function() {
    console.log('⚠️ Mock de wireguardUtils.createInitialWireGuardConfig appelé');
    return { success: true, mock: true };
  };
}

console.log('✅ Polyfills et mocks chargés avec succès');

// Exécuter le patch après un court délai pour s'assurer que les modules sont chargés
setTimeout(patchLibp2p, 1000);

// Pour compatibilité ES Modules
export default { patchLibp2p };

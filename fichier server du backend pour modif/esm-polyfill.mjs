// esm-polyfill.mjs

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

// Mock pour wireguardUtils
if (!global.wireguardUtils) {
  global.wireguardUtils = {};
}

if (typeof global.wireguardUtils.createInitialWireGuardConfig !== 'function') {
  global.wireguardUtils.createInitialWireGuardConfig = function() {
    console.log('⚠️ Mock de wireguardUtils.createInitialWireGuardConfig appelé');
    return { success: true, mock: true };
  };
}

// Patch pour l'erreur CustomEvent
// Cette fonction sera injectée dans le code global
const patchEventTarget = () => {
  // Monkey patch EventTarget.prototype.dispatchEvent
  const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
  
  EventTarget.prototype.dispatchEvent = function(event) {
    try {
      return originalDispatchEvent.call(this, event);
    } catch (error) {
      if (error.code === 'ERR_INVALID_ARG_TYPE' && error.message.includes('CustomEvent')) {
        console.log('⚠️ Intercepté erreur CustomEvent, tentative de conversion...');
        // Créer un Event standard à partir du CustomEvent
        const newEvent = new Event(event.type);
        // Copier les propriétés importantes
        Object.keys(event).forEach(key => {
          if (key !== 'constructor' && key !== '__proto__') {
            newEvent[key] = event[key];
          }
        });
        return originalDispatchEvent.call(this, newEvent);
      }
      throw error;
    }
  };
};

// Injecter le code de patch dans le contexte global
global.patchEventTarget = patchEventTarget;

console.log('✅ Polyfills et mocks chargés avec succès');

// Exporter un objet vide pour la compatibilité ES Modules
export {};

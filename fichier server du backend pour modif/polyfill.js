// polyfill.js
// Ce fichier doit être chargé avant le serveur pour fournir les polyfills nécessaires

// Polyfill pour CustomEvent qui est utilisé par libp2p mais n'existe pas dans Node.js
(function () {
  if (typeof global.CustomEvent !== 'function') {
    function CustomEvent(event, params) {
      params = params || { bubbles: false, cancelable: false, detail: null };
      const evt = new Event(event, {
        bubbles: params.bubbles,
        cancelable: params.cancelable,
      });
      evt.detail = params.detail;
      return evt;
    }

    CustomEvent.prototype = global.Event.prototype;
    global.CustomEvent = CustomEvent;
  }
})();

console.log('✅ Polyfills chargés avec succès');

/* =============================================================
   Cloud Functions — אימות והזמנות בצד שרת (Callable)
   ============================================================= */
const USE_FIREBASE_FUNCTIONS = false;

var YashirBackend = (function () {
  'use strict';

  function httpsCallable(name) {
    if (!USE_FIREBASE_FUNCTIONS) return null;
    if (!window.FUNCTIONS) return null;
    return window.FUNCTIONS.httpsCallable(name);
  }

  function call(name, data) {
    if (!USE_FIREBASE_FUNCTIONS) {
      console.log('[LOCAL MODE] Functions disabled');
      return Promise.reject(new Error('FUNCTIONS_DISABLED'));
    }
    var fn = httpsCallable(name);
    if (!fn) return Promise.reject(new Error('FUNCTIONS_UNAVAILABLE'));
    return fn(data || {});
  }

  return {
    authenticateCustomer: function (hp, password) {
      return call('authenticateCustomer', { hp: hp, password: password != null ? password : '' });
    },
    authenticateAdmin: function (pin) {
      return call('authenticateAdmin', { pin: pin != null ? pin : '' });
    },
    createOrder: function (payload) {
      return call('createOrder', payload);
    },
    ensurePublicAppSettings: function () {
      return call('ensurePublicAppSettings', {});
    }
  };
})();

/* =============================================================
   Cloud Functions — אימות והזמנות בצד שרת (Callable)
   ============================================================= */
var YashirBackend = (function () {
  'use strict';

  function httpsCallable(name) {
    if (!window.FUNCTIONS) return null;
    return window.FUNCTIONS.httpsCallable(name);
  }

  function call(name, data) {
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

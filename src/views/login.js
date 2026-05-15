var LoginView = {
  render: function (el) {
    el.innerHTML =
      '<div class="login-page">' +
        '<div class="login-card">' +
          '<div class="login-logo">' +
            '<div class="logo-mark large">' + t('header.logoMark') + '</div>' +
            '<h2>' + t('login.title') + '</h2>' +
            '<p>' + t('login.subtitle') + '</p>' +
          '</div>' +
          '<div id="lv-customer">' +
            '<div class="form-group"><label>' + t('login.hpLabel') + '</label>' +
              '<input type="text" id="lv-hp" inputmode="numeric" placeholder="' + t('login.hpPlaceholder') + '" maxlength="9" autocomplete="username" required autofocus></div>' +
            '<div class="form-group"><label>' + t('login.passwordLabel') + '</label>' +
              '<div class="login-pass-row">' +
              '<input type="password" id="lv-pass" placeholder="' + t('login.passwordPlaceholder') + '" autocomplete="current-password" required>' +
              '<button type="button" class="btn-login-eye" onclick="LoginView.togglePasswordVisibility()" aria-label="הצג סיסמה">👁️</button>' +
              '</div></div>' +
            '<label class="checkbox-label"><input type="checkbox" id="lv-rem"> ' + t('login.remember') + '</label>' +
            '<button class="btn-primary full-width" onclick="LoginView.doLogin()">' +
              '<span class="material-icons-round">login</span> ' + t('login.loginBtn') +
            '</button>' +
            '<p class="login-guest-note">' + t('login.guest') + ' <a onclick="App.navigate(\'catalog\')" style="cursor:pointer;color:var(--orange)">' + t('login.toCatalog') + '</a></p>' +
          '</div>' +
        '</div>' +
      '</div>';

    setTimeout(function () {
      var hp = document.getElementById('lv-hp');
      var pass = document.getElementById('lv-pass');
      if (hp) {
        hp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var passField = document.getElementById('lv-pass'); if (passField) passField.focus(); } });
      }
      if (pass) {
        pass.addEventListener('keydown', function (e) { if (e.key === 'Enter') LoginView.doLogin(); });
      }
    }, 50);
  },

  togglePasswordVisibility: function () {
    var el = document.getElementById('lv-pass');
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
  },

  doLogin: function () {
    var hpEl = document.getElementById('lv-hp');
    var passEl = document.getElementById('lv-pass');
    if (hpEl) hpEl.classList.remove('input-error');
    if (passEl) passEl.classList.remove('input-error');
    if (!hpEl || !passEl) return;
    console.log('[LOGIN TRACE] LoginView.doLogin RAW hp from UI:', hpEl.value);
    console.log('[LOGIN TRACE] LoginView.doLogin RAW password from UI:', passEl.value);
    var hp   = hpEl.value != null ? String(hpEl.value).trim() : '';
    var pass = passEl.value != null ? String(passEl.value).trim() : '';
    console.log('[LOGIN TRACE] LoginView.doLogin trimmed hp:', hp);
    console.log('[LOGIN TRACE] LoginView.doLogin trimmed password length:', pass.length);
    var errMsg = t('login.invalidCredentials');
    if (!hp || !pass) {
      App.toast(errMsg, 'error');
      if (hpEl) hpEl.classList.add('input-error');
      if (passEl) passEl.classList.add('input-error');
      return;
    }
    var rem  = (document.getElementById('lv-rem') || {}).checked;
    App.Auth.loginCustomerFirebase(hp, rem, pass)
      .then(function () {
        App.renderHeader();
        var c = App.state.currentUser.customer;
        App.showModal(
          '<div class="sys-message">' +
            '<div class="sys-icon success"><span class="material-icons-round" style="font-size:30px">waving_hand</span></div>' +
            '<h3>' + t('header.hello') + App.escHTML(pLang(c, 'name')) + '!</h3>' +
            '<p>' + t('login.welcome') + '<br>' + t('login.freeShipping') + ' <strong>₪' + App.state.settings.minOrderAmount + '</strong></p>' +
            '<div style="display:flex;gap:10px">' +
              '<button class="btn-primary" onclick="App.closeModal();App.navigate(\'catalog\')">' +
                '<span class="material-icons-round">menu_book</span> ' + t('login.toCatalog') +
              '</button>' +
            '</div>' +
          '</div>'
        );
      })
      .catch(function (e) {
        console.error('customer login failed:', e);
        App.toast(errMsg, 'error');
        var h = document.getElementById('lv-hp');
        var p = document.getElementById('lv-pass');
        if (h) h.classList.add('input-error');
        if (p) p.classList.add('input-error');
      });
  },

  doAdmin: function () {
    var pin = document.getElementById('lv-pin');
    if (!pin) return;
    if (!App.Auth.loginAdmin(pin.value)) { App.toast(t('login.adminWrong'), 'error'); return; }
    App.renderHeader();
    App.navigate('admin');
  }
};

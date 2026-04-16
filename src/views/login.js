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
              '<input type="text" id="lv-hp" inputmode="numeric" placeholder="' + t('login.hpPlaceholder') + '" maxlength="9" autofocus></div>' +
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
      if (hp) hp.addEventListener('keydown', function (e) { if (e.key === 'Enter') LoginView.doLogin(); });
    }, 50);
  },

  doLogin: function () {
    var hp  = document.getElementById('lv-hp').value.trim();
    var rem = document.getElementById('lv-rem').checked;
    if (!hp) { App.toast(t('login.missingHp'), 'warning'); return; }
    if (!App.Auth.login(hp, rem)) {
      App.toast(t('login.notFound'), 'error');
      document.getElementById('lv-hp').classList.add('input-error');
      return;
    }
    App.renderHeader();
    var c = App.state.currentUser.customer;
    App.showModal(
      '<div class="sys-message">' +
        '<div class="sys-icon success"><span class="material-icons-round" style="font-size:30px">waving_hand</span></div>' +
        '<h3>' + t('header.hello') + App.escHTML(c.name) + '!</h3>' +
        '<p>' + t('login.welcome') + '<br>' + t('login.freeShipping') + ' <strong>₪' + App.state.settings.minOrderAmount + '</strong></p>' +
        '<div style="display:flex;gap:10px">' +
          '<button class="btn-primary" onclick="App.closeModal();App.navigate(\'catalog\')">' +
            '<span class="material-icons-round">menu_book</span> ' + t('login.toCatalog') +
          '</button>' +
        '</div>' +
      '</div>'
    );
  },

  doAdmin: function () {
    var pin = document.getElementById('lv-pin');
    if (!pin) return;
    if (!App.Auth.loginAdmin(pin.value)) { App.toast(t('login.adminWrong'), 'error'); return; }
    App.renderHeader();
    App.navigate('admin');
  }
};

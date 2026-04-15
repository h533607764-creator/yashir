var LoginView = {
  render: function (el) {
    el.innerHTML =
      '<div class="login-page">' +
        '<div class="login-card">' +
          '<div class="login-logo">' +
            '<div class="logo-mark large">י</div>' +
            '<h2>כניסה ללקוחות</h2>' +
            '<p>הזן את מספר ח.פ שלך</p>' +
          '</div>' +
          '<div id="lv-customer">' +
            '<div class="form-group"><label>מספר ח.פ / עוסק מורשה</label>' +
              '<input type="text" id="lv-hp" inputmode="numeric" placeholder="123456789" maxlength="9" autofocus></div>' +
            '<label class="checkbox-label"><input type="checkbox" id="lv-rem"> זכור אותי למשך 30 יום</label>' +
            '<button class="btn-primary full-width" onclick="LoginView.doLogin()">' +
              '<span class="material-icons-round">login</span> כניסה' +
            '</button>' +
            '<p class="login-guest-note">אורח? <a onclick="App.navigate(\'catalog\')" style="cursor:pointer;color:var(--orange)">לקטלוג</a> (ללא מחירים)</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    setTimeout(function () {
      var hp = document.getElementById('lv-hp');
      if (hp) hp.addEventListener('keydown', function (e) { if (e.key === 'Enter') LoginView.doLogin(); });
      var pin = document.getElementById('lv-pin');
      if (pin) pin.addEventListener('keydown', function (e) { if (e.key === 'Enter') LoginView.doAdmin(); });
    }, 50);
  },

  doLogin: function () {
    var hp  = document.getElementById('lv-hp').value.trim();
    var rem = document.getElementById('lv-rem').checked;
    if (!hp) { App.toast('יש להזין מספר ח.פ', 'warning'); return; }
    if (!App.Auth.login(hp, rem)) {
      App.toast('מספר ח.פ לא נמצא במערכת', 'error');
      document.getElementById('lv-hp').classList.add('input-error');
      return;
    }
    App.renderHeader();
    var c = App.state.currentUser.customer;
    App.showModal(
      '<div class="sys-message">' +
        '<div class="sys-icon success"><span class="material-icons-round" style="font-size:30px">waving_hand</span></div>' +
        '<h3>שלום, ' + c.name + '!</h3>' +
        '<p>ברוכים הבאים לישיר.<br>משלוח חינם בהזמנות מעל <strong>₪' + App.state.settings.minOrderAmount + '</strong></p>' +
        '<div style="display:flex;gap:10px">' +
          '<button class="btn-primary" onclick="App.closeModal();App.navigate(\'catalog\')">' +
            '<span class="material-icons-round">menu_book</span> לקטלוג' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  },

  doAdmin: function () {
    var pin = document.getElementById('lv-pin').value;
    if (!App.Auth.loginAdmin(pin)) { App.toast('קוד מנהל שגוי', 'error'); return; }
    App.renderHeader();
    App.navigate('admin');
  },

  toggleAdmin: function () {
    var a = document.getElementById('lv-admin');
    var c = document.getElementById('lv-customer');
    var show = a.style.display === 'none';
    a.style.display = show ? 'flex' : 'none';
    c.style.display = show ? 'none' : 'flex';
    c.style.flexDirection = 'column'; c.style.gap = '16px';
  }
};

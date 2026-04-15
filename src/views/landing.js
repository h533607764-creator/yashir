var LandingView = {
  render: function (el) {
    var s = App.state.settings;
    el.innerHTML =
      '<section class="landing-hero">' +
        '<div class="hero-content">' +
          '<div class="hero-logo">' +
            '<div class="hero-logo-mark">י</div>' +
            '<div class="hero-logo-text">' +
              '<h1>ישיר שיווק והפצה</h1>' +
              '<p class="hero-slogan">' + s.landingTitle + '</p>' +
            '</div>' +
          '</div>' +
          '<p class="hero-desc">' + s.landingSubtitle + '</p>' +
          '<div class="hero-ctas">' +
            '<button class="btn-hero-primary" onclick="App.navigate(\'catalog\')">' +
              '<span class="material-icons-round">menu_book</span> לקטלוג המוצרים' +
            '</button>' +
            '<button class="btn-hero-secondary" onclick="App.startOrder()">' +
              '<span class="material-icons-round">shopping_bag</span> התחלת הזמנה' +
            '</button>' +
          '</div>' +
          '<div class="hero-features">' +
            '<div class="hero-feature"><span class="material-icons-round">verified</span><span>מוצרים איכותיים</span></div>' +
            '<div class="hero-feature"><span class="material-icons-round">local_shipping</span><span>משלוח מהיר</span></div>' +
            '<div class="hero-feature"><span class="material-icons-round">support_agent</span><span>שירות אישי</span></div>' +
          '</div>' +
        '</div>' +
      '</section>';
    if (App.Auth.isCustomer()) setTimeout(function () { App.showSystemMsg(); }, 600);
  }
};

var LandingView = {
  render: function (el) {
    var s = App.state.settings;
    el.innerHTML =
      '<section class="landing-hero">' +
        '<div class="hero-content">' +
          '<div class="hero-logo">' +
            '<div class="hero-logo-mark">' + t('header.logoMark') + '</div>' +
            '<div class="hero-logo-text">' +
              '<h1>' + t('landing.companyName') + '</h1>' +
              '<p class="hero-slogan">' + App.escHTML(s.landingTitle) + '</p>' +
            '</div>' +
          '</div>' +
          '<p class="hero-desc">' + App.escHTML(s.landingSubtitle) + '</p>' +
          '<div class="hero-ctas">' +
            '<button class="btn-hero-primary" onclick="App.navigate(\'catalog\')">' +
              '<span class="material-icons-round">menu_book</span> ' + t('landing.toCatalog') +
            '</button>' +
            '<button class="btn-hero-secondary" onclick="App.startOrder()">' +
              '<span class="material-icons-round">shopping_bag</span> ' + t('landing.startOrder') +
            '</button>' +
          '</div>' +
          '<div class="hero-features">' +
            '<div class="hero-feature"><span class="material-icons-round">verified</span><span>' + t('landing.quality') + '</span></div>' +
            '<div class="hero-feature"><span class="material-icons-round">local_shipping</span><span>' + t('landing.shipping') + '</span></div>' +
            '<div class="hero-feature"><span class="material-icons-round">support_agent</span><span>' + t('landing.service') + '</span></div>' +
          '</div>' +
        '</div>' +
      '</section>';
    if (App.Auth.isCustomer()) setTimeout(function () { App.showSystemMsg(); }, 600);
  }
};

(function (window, $) {
  'use strict';

  var config = window.CivicEvents.config;

  function getStorage() {
    return config.storageType === 'local' ? window.localStorage : window.sessionStorage;
  }

  function getToken() {
    return getStorage().getItem(config.tokenKey);
  }

  function getUser() {
    var serializedUser = getStorage().getItem(config.userKey);
    if (!serializedUser) {
      return null;
    }

    try {
      return JSON.parse(serializedUser);
    } catch (error) {
      clearSession();
      return null;
    }
  }

  function saveSession(token, user) {
    if (!token || !user) {
      throw new Error('A token and user are required to create a session.');
    }

    var storage = getStorage();
    storage.setItem(config.tokenKey, token);
    storage.setItem(config.userKey, JSON.stringify(user));
  }

  function clearSession() {
    window.sessionStorage.removeItem(config.tokenKey);
    window.sessionStorage.removeItem(config.userKey);
    window.localStorage.removeItem(config.tokenKey);
    window.localStorage.removeItem(config.userKey);
  }

  function isAuthenticated() {
    return Boolean(getToken() && getUser());
  }

  function isAdmin() {
    var user = getUser();
    return Boolean(user && user.role === 'admin');
  }

  function redirectToLogin(message) {
    clearSession();
    if (message) {
      window.sessionStorage.setItem('civicEventsAuthMessage', message);
    }
    if (!window.location.pathname.endsWith('/login.html')) {
      window.location.assign('login.html');
    }
  }

  window.CivicEvents.auth = {
    getToken: getToken,
    getUser: getUser,
    saveSession: saveSession,
    clearSession: clearSession,
    isAuthenticated: isAuthenticated,
    isAdmin: isAdmin,
    redirectToLogin: redirectToLogin
  };
}(window, window.jQuery));

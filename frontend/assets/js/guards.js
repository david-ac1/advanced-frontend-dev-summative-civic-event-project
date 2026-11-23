(function (window, $) {
  'use strict';

  var auth = window.CivicEvents.auth;

  function getCurrentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function requireAuth() {
    if (auth.isAuthenticated()) {
      return true;
    }

    auth.redirectToLogin('Please sign in to continue.');
    return false;
  }

  function requireAdmin() {
    if (!requireAuth()) {
      return false;
    }

    if (auth.isAdmin()) {
      return true;
    }

    if (window.CivicEvents.ui) {
      window.CivicEvents.ui.showToast('This area is available to administrators only.', 'error');
    }
    window.setTimeout(function () {
      window.location.assign('index.html');
    }, 1000);
    return false;
  }

  function redirectAuthenticatedUsers() {
    if (!auth.isAuthenticated()) {
      return false;
    }

    if (getCurrentPage() === 'login.html' || getCurrentPage() === 'signup.html') {
      window.location.assign(auth.isAdmin() ? 'admin-dashboard.html' : 'events.html');
      return true;
    }
    return false;
  }

  window.CivicEvents.guards = {
    requireAuth: requireAuth,
    requireAdmin: requireAdmin,
    redirectAuthenticatedUsers: redirectAuthenticatedUsers
  };
}(window, window.jQuery));

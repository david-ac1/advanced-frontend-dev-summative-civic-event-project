(function (window, $) {
  'use strict';

  var api = window.CivicEvents.api;
  var auth = window.CivicEvents.auth;
  var guards = window.CivicEvents.guards;
  var ui = window.CivicEvents.ui;

  function escapeHtml(value) {
    return $('<div>').text(value == null ? '' : String(value)).html();
  }

  function setMessage(message, type) {
    $('#profile-status')
      .removeClass('form-message-success form-message-error')
      .addClass(type === 'error' ? 'form-message-error' : 'form-message-success')
      .text(message)
      .prop('hidden', false);
  }

  function loadProfile() {
    ui.setLoading('Loading profile...');
    api.get('/users/profile/me')
      .then(function (response) {
        var user = response && response.data;
        if (!user) throw new Error('Profile information is unavailable.');
        $('#profile-name').val(user.full_name || '');
        $('#profile-email').val(user.email || '');
        $('#profile-role').text(user.role === 'admin' ? 'Admin' : 'User');
        $('#profile-status-value').text(user.is_active ? 'Active' : 'Disabled');
      })
      .catch(function (error) {
        setMessage(ui.getApiErrorMessage(error), 'error');
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  function submitProfile(event) {
    event.preventDefault();
    $('[data-error-for]').text('');
    var name = $.trim($('#profile-name').val());
    var email = $.trim($('#profile-email').val());
    if (!name) $('[data-error-for="profile-name"]').text('Enter your full name.');
    if (!email) $('[data-error-for="profile-email"]').text('Enter your email address.');
    if (email && !$('#profile-email')[0].checkValidity()) {
      $('[data-error-for="profile-email"]').text('Enter a valid email address.');
    }
    if (!name || !email || !$('#profile-email')[0].checkValidity()) return;

    ui.setLoading('Saving profile...');
    api.patch('/users/profile/me', { full_name: name, email: email })
      .then(function (response) {
        var user = response && response.data;
        if (user) {
          var sessionUser = auth.getUser();
          if (sessionUser) {
            sessionUser.full_name = user.full_name;
            sessionUser.email = user.email;
            sessionUser.role = user.role;
            auth.saveSession(auth.getToken(), sessionUser);
          }
        }
        setMessage(response.message || 'Profile updated successfully.', 'success');
        ui.showToast('Profile updated.');
      })
      .catch(function (error) {
        setMessage(ui.getApiErrorMessage(error), 'error');
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  $(function () {
    if (!guards.requireAuth()) return;
    window.CivicEvents.layout.render();
    $('#profile-form').on('submit', submitProfile);
    loadProfile();
  });
}(window, window.jQuery));

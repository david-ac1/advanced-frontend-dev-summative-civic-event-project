(function (window, $) {
  'use strict';

  var api = window.CivicEvents.api;
  var auth = window.CivicEvents.auth;
  var ui = window.CivicEvents.ui;
  var passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  function setMessage(message, type) {
    var messageBox = $('#auth-message');
    messageBox.removeClass('form-message-success form-message-error');
    messageBox.addClass('form-message-' + type).text(message).prop('hidden', false);
  }

  function clearErrors() {
    $('.field-error').text('');
    $('.form-field input').removeClass('input-error').removeAttr('aria-invalid');
  }

  function setFieldError(fieldId, message) {
    $('[data-error-for="' + fieldId + '"]').text(message);
    $('#' + fieldId).addClass('input-error').attr('aria-invalid', 'true');
  }

  function validateRequired(fieldId, message) {
    if (!$.trim($('#' + fieldId).val())) {
      setFieldError(fieldId, message);
      return false;
    }
    return true;
  }

  function updatePasswordMeter() {
    var password = $('#signup-password').val();
    var score = 0;
    var label = 'Use 8+ characters with upper/lowercase, a number, and a special character.';

    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[\W_]/.test(password)) score += 1;

    $('#password-meter-bar').css('width', (score * 20) + '%')
      .removeClass('meter-weak meter-medium meter-strong')
      .addClass(score < 3 ? 'meter-weak' : score < 5 ? 'meter-medium' : 'meter-strong');

    if (score === 5) {
      label = 'Strong password.';
    } else if (score >= 3) {
      label = 'Almost there. Add the missing password requirements.';
    }
    $('#password-meter-label').text(label);
  }

  function validateSignup() {
    var valid = true;
    var password = $('#signup-password').val();
    var confirmation = $('#signup-confirm-password').val();
    var email = $('#signup-email').val();

    valid = validateRequired('signup-name', 'Enter your full name.') && valid;
    valid = validateRequired('signup-email', 'Enter your email address.') && valid;
    if (email && !$('#signup-email')[0].checkValidity()) {
      setFieldError('signup-email', 'Enter a valid email address.');
      valid = false;
    }
    valid = validateRequired('signup-password', 'Create a password.') && valid;
    if (password && !passwordPattern.test(password)) {
      setFieldError('signup-password', 'Use 8+ characters with upper/lowercase, a number, and a special character.');
      valid = false;
    }
    valid = validateRequired('signup-confirm-password', 'Confirm your password.') && valid;
    if (confirmation && password !== confirmation) {
      setFieldError('signup-confirm-password', 'Passwords do not match.');
      valid = false;
    }
    return valid;
  }

  function validateLogin() {
    var valid = true;
    var email = $('#login-email').val();

    valid = validateRequired('login-email', 'Enter your email address.') && valid;
    if (email && !$('#login-email')[0].checkValidity()) {
      setFieldError('login-email', 'Enter a valid email address.');
      valid = false;
    }
    valid = validateRequired('login-password', 'Enter your password.') && valid;
    return valid;
  }

  function handleSignup(event) {
    event.preventDefault();
    clearErrors();
    $('#auth-message').prop('hidden', true);
    if (!validateSignup()) return;

    ui.setLoading('Creating your account...');
    api.post('/auth/signup', {
      full_name: $.trim($('#signup-name').val()),
      email: $.trim($('#signup-email').val()),
      password: $('#signup-password').val()
    }).then(function (response) {
      ui.clearLoading();
      setMessage(response.message || 'Account created. You can now sign in.', 'success');
      ui.showToast('Account created successfully.');
      $('#signup-form')[0].reset();
      updatePasswordMeter();
      window.setTimeout(function () {
        window.location.assign('login.html');
      }, 1200);
    }).catch(function (error) {
      ui.clearLoading();
      setMessage(ui.getApiErrorMessage(error), 'error');
    });
  }

  function handleLogin(event) {
    event.preventDefault();
    clearErrors();
    $('#auth-message').prop('hidden', true);
    if (!validateLogin()) return;

    ui.setLoading('Signing you in...');
    api.post('/auth/login', {
      email: $.trim($('#login-email').val()),
      password: $('#login-password').val()
    }).then(function (response) {
      if (!response || !response.data || !response.data.token || !response.data.user) {
        throw new Error('The server returned an incomplete login response.');
      }
      auth.saveSession(response.data.token, response.data.user);
      ui.clearLoading();
      ui.showToast('Welcome back.');
      window.setTimeout(function () {
        window.location.assign(response.data.user.role === 'admin' ? 'admin-dashboard.html' : 'events.html');
      }, 400);
    }).catch(function (error) {
      ui.clearLoading();
      setMessage(ui.getApiErrorMessage(error), 'error');
    });
  }

  $(function () {
    if (!window.CivicEvents.guards || !window.CivicEvents.guards.redirectAuthenticatedUsers()) {
      var authMessage = window.sessionStorage.getItem('civicEventsAuthMessage');
      if (authMessage) {
        setMessage(authMessage, 'error');
        window.sessionStorage.removeItem('civicEventsAuthMessage');
      }
      $('#login-form').on('submit', handleLogin);
      $('#signup-form').on('submit', handleSignup);
      $('#signup-password').on('input', updatePasswordMeter);
    }
  });
}(window, window.jQuery));

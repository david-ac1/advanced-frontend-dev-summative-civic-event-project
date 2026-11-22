(function (window, $) {
  'use strict';

  function showToast(message, type) {
    var toast = $('<div>', {
      class: 'toast toast-' + (type || 'success'),
      text: message
    });

    $('#toast-region').append(toast);
    window.setTimeout(function () {
      toast.fadeOut(200, function () {
        toast.remove();
      });
    }, 4500);
  }

  function setLoading(message) {
    $('#loading-region').html(
      $('<div>', {
        class: 'loading-indicator',
        role: 'status',
        text: message || 'Loading...'
      })
    );
  }

  function clearLoading() {
    $('#loading-region').empty();
  }

  function getApiErrorMessage(error) {
    if (error && error.message) {
      return error.message;
    }
    return 'Something went wrong. Please try again.';
  }

  window.CivicEvents.ui = {
    showToast: showToast,
    setLoading: setLoading,
    clearLoading: clearLoading,
    getApiErrorMessage: getApiErrorMessage
  };
}(window, window.jQuery));

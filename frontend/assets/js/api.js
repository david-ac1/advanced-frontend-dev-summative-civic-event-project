(function (window, $) {
  'use strict';

  var config = window.CivicEvents.config;
  var auth = window.CivicEvents.auth;

  function parseResponse(response) {
    return response.text().then(function (text) {
      var payload = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (error) {
          payload = { message: text };
        }
      }

      if (!response.ok) {
        var apiError = new Error(
          payload && payload.message ? payload.message : 'The request could not be completed.'
        );
        apiError.status = response.status;
        apiError.payload = payload;
        throw apiError;
      }

      return payload;
    });
  }

  function request(path, options) {
    var requestOptions = options || {};
    var headers = $.extend({}, requestOptions.headers || {});
    var token = auth.getToken();
    var body = requestOptions.body;

    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }

    if (body && !(body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify(body);
    }

    requestOptions.headers = headers;
    return window.fetch(config.apiBaseUrl + path, requestOptions)
      .then(parseResponse)
      .catch(function (error) {
        if (error.status === 401) {
          auth.redirectToLogin('Your session has expired. Please sign in again.');
        }
        throw error;
      });
  }

  window.CivicEvents.api = {
    request: request,
    get: function (path) {
      return request(path, { method: 'GET' });
    },
    post: function (path, body) {
      return request(path, { method: 'POST', body: body });
    },
    put: function (path, body) {
      return request(path, { method: 'PUT', body: body });
    },
    patch: function (path, body) {
      return request(path, { method: 'PATCH', body: body });
    },
    delete: function (path) {
      return request(path, { method: 'DELETE' });
    }
  };
}(window, window.jQuery));

(function (window) {
  'use strict';

  window.CivicEvents = window.CivicEvents || {};
  window.CivicEvents.config = Object.freeze({
    apiBaseUrl: window.CIVIC_EVENTS_API_URL || 'http://localhost:4000/api',
    storageType: 'session',
    tokenKey: 'civicEventsToken',
    userKey: 'civicEventsUser'
  });
}(window));

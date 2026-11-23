(function (window, $) {
  'use strict';

  function renderHeader() {
    var user = window.CivicEvents.auth.getUser();
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    var adminLink = user && user.role === 'admin'
      ? '<a href="admin-dashboard.html" data-page="admin-dashboard.html">Admin</a>'
      : '';
    var profileLabel = user ? 'Profile' : 'Sign in';
    var profileHref = user ? 'profile.html' : 'login.html';
    var sessionAction = user
      ? '<button class="text-button" type="button" data-action="logout">Sign out</button>'
      : '';

    $('#site-header').html(
      '<div class="site-header">' +
        '<a class="brand" href="index.html">CivicEvents</a>' +
        '<nav class="main-nav" aria-label="Primary navigation">' +
          '<a href="events.html" data-page="events.html">Events</a>' +
          '<a href="announcements.html" data-page="announcements.html">Announcements</a>' +
          '<a href="promos.html" data-page="promos.html">Promos</a>' +
          adminLink +
        '</nav>' +
        '<div class="header-actions">' +
          '<label class="sr-only" for="global-search">Search CivicEvents</label>' +
          '<input id="global-search" class="search-control" type="search" placeholder="Search">' +
          '<a class="icon-button" href="notifications.html" aria-label="Notifications">' +
            '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
              '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9">' +
              '</path><path d="M13.7 21a2 2 0 0 1-3.4 0"></path>' +
            '</svg>' +
            '<span class="notification-badge" hidden>0</span>' +
          '</a>' +
          '<a class="profile-link" href="' + profileHref + '">' + profileLabel + '</a>' +
          sessionAction +
        '</div>' +
      '</div>'
    );

    $('#site-header [data-page="' + currentPage + '"]').attr('aria-current', 'page');
    $('#site-header [data-action="logout"]').on('click', function () {
      window.CivicEvents.auth.clearSession();
      window.location.assign('login.html');
    });

    updateNotificationBadge();
  }

  function updateNotificationBadge() {
    if (!window.CivicEvents.auth.isAuthenticated()) return;
    window.CivicEvents.api.get('/notifications')
      .then(function (response) {
        var items = response && Array.isArray(response.data) ? response.data : [];
        var unreadCount = items.filter(function (notification) {
          return notification.read === false;
        }).length;
        var badge = $('#site-header .notification-badge');
        if (unreadCount > 0) {
          badge.text(unreadCount).prop('hidden', false);
        } else {
          badge.prop('hidden', true);
        }
      })
      .catch(function () {
        $('#site-header .notification-badge').prop('hidden', true);
      });
  }

  function renderFooter() {
    $('#site-footer').html(
      '<div class="site-footer">' +
        '<span>Help: <a href="mailto:support@civicevents.example">support@civicevents.example</a> · ' +
        '<a href="accessibility.html">Accessibility statement</a> · ' +
        '<a href="privacy.html">Privacy</a></span>' +
      '</div>'
    );
  }

  function render() {
    renderHeader();
    renderFooter();
  }

  window.CivicEvents.layout = {
    render: render
  };
}(window, window.jQuery));

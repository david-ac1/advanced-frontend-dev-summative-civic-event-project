(function (window, $) {
  'use strict';

  var api = window.CivicEvents.api;
  var auth = window.CivicEvents.auth;
  var guards = window.CivicEvents.guards;
  var ui = window.CivicEvents.ui;
  var notifications = [];

  function escapeHtml(value) {
    return $('<div>').text(value == null ? '' : String(value)).html();
  }

  function normalizeData(response) {
    return response && Array.isArray(response.data) ? response.data : [];
  }

  function formatDate(value) {
    if (!value) return 'Time unavailable';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Time unavailable';
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function getRelatedLink(notification) {
    var metadata = notification.metadata || {};
    if (metadata.event_id) {
      return '<a class="button button-secondary" href="event-detail.html?id=' +
        encodeURIComponent(metadata.event_id) + '">Open related event</a>';
    }
    if (metadata.promo_id) {
      return '<a class="button button-secondary" href="promo-detail.html?id=' +
        encodeURIComponent(metadata.promo_id) + '">Open related promo</a>';
    }
    if (metadata.announcement_id) {
      return '<a class="button button-secondary" href="announcement-detail.html?id=' +
        encodeURIComponent(metadata.announcement_id) + '">Open related announcement</a>';
    }
    return '';
  }

  function renderDetail(notification) {
    $('#notification-detail-panel').prop('hidden', false);
    $('#notification-detail-heading').text(notification.title);
    $('#notification-detail').html(
      '<p class="notification-detail-message">' + escapeHtml(notification.message) + '</p>' +
      '<div class="notification-detail-meta">' +
        '<span class="tag">' + escapeHtml(notification.type || 'Update') + '</span>' +
        '<span class="muted-label">' + escapeHtml(formatDate(notification.created_at)) + '</span>' +
      '</div>' +
      '<div class="detail-actions">' +
        getRelatedLink(notification) +
        (auth.isAdmin()
          ? '<button id="delete-notification" class="button button-danger" type="button">Delete</button>'
          : '') +
      '</div>'
    );
    $('#delete-notification').on('click', function () {
      deleteNotification(notification.id);
    });
  }

  function renderList(items) {
    var unreadCount = items.filter(function (notification) {
      return notification.read === false;
    }).length;
    $('#notification-count').text(unreadCount + ' unread');
    if (!items.length) {
      $('#notifications-status').text('No notifications are available.');
      $('#notifications-list').empty();
      return;
    }
    $('#notifications-status').empty();
    $('#notifications-list').html(items.map(function (notification) {
      var unread = notification.read === false;
      return '<button class="notification-row' + (unread ? ' notification-unread' : '') +
        '" type="button" data-notification-id="' + escapeHtml(notification.id) + '">' +
        '<span class="notification-row-top">' +
          '<strong>' + escapeHtml(notification.title) + '</strong>' +
          '<span class="tag">' + escapeHtml(notification.type || 'Update') + '</span>' +
        '</span>' +
        '<span class="notification-preview">' + escapeHtml(notification.message) + '</span>' +
        '<span class="muted-label">' + escapeHtml(formatDate(notification.created_at)) + '</span>' +
      '</button>';
    }).join(''));
    $('#notifications-list').find('.notification-row').on('click', function () {
      var id = $(this).data('notification-id');
      var notification = notifications.find(function (item) {
        return item.id === id;
      });
      if (notification) renderDetail(notification);
    });
  }

  function deleteNotification(id) {
    if (!window.confirm('Delete this notification?')) return;
    api.delete('/notifications/' + encodeURIComponent(id))
      .then(function () {
        ui.showToast('Notification deleted.');
        loadNotifications();
        $('#notification-detail-panel').prop('hidden', true);
      })
      .catch(function (error) {
        ui.showToast(ui.getApiErrorMessage(error), 'error');
      });
  }

  function loadNotifications() {
    ui.setLoading('Loading notifications...');
    api.get('/notifications')
      .then(function (response) {
        notifications = normalizeData(response);
        renderList(notifications);

        var requestedId = new URLSearchParams(window.location.search).get('id');
        if (requestedId) {
          var notification = notifications.find(function (item) {
            return item.id === requestedId;
          });
          if (notification) renderDetail(notification);
        }
      })
      .catch(function (error) {
        $('#notifications-status').text(ui.getApiErrorMessage(error));
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  $(function () {
    if (!guards.requireAuth()) return;
    window.CivicEvents.layout.render();
    loadNotifications();
  });
}(window, window.jQuery));

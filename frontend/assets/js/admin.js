(function (window, $) {
  'use strict';

  var api = window.CivicEvents.api;
  var guards = window.CivicEvents.guards;
  var ui = window.CivicEvents.ui;

  function getPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function escapeHtml(value) {
    return $('<div>').text(value == null ? '' : String(value)).html();
  }

  function numberValue(value) {
    var number = Number(value || 0);
    return Number.isNaN(number) ? 0 : number;
  }

  function metricCard(label, value) {
    return '<article class="metric-card"><span class="muted-label">' + escapeHtml(label) + '</span>' +
      '<strong>' + numberValue(value).toLocaleString() + '</strong></article>';
  }

  function renderDashboard(stats) {
    var users = stats.users || {};
    var events = stats.events || {};
    var registrations = stats.registrations || {};
    var promos = stats.promos || {};
    $('#dashboard-metrics').html(
      metricCard('Events', events.total_events) +
      metricCard('Promos', promos.total_promos) +
      metricCard('Users', users.total_users) +
      metricCard('Registrations', registrations.total_registrations)
    );
  }

  function renderUserRows(users, body) {
    if (!users.length) {
      body.html('<tr><td colspan="5" class="table-empty">No users found.</td></tr>');
      return;
    }
    body.html(users.map(function (user) {
      var active = user.is_active !== false;
      return '<tr>' +
        '<td>' + escapeHtml(user.full_name) + '</td>' +
        '<td>' + escapeHtml(user.email) + '</td>' +
        '<td><span class="tag">' + escapeHtml(user.role) + '</span></td>' +
        '<td><span class="' + (active ? 'status-active' : 'status-disabled') + '">' +
          (active ? 'Active' : 'Disabled') + '</span></td>' +
        '<td><button class="text-button user-status-action" type="button" data-id="' +
          escapeHtml(user.id) + '" data-active="' + (active ? 'true' : 'false') + '">' +
          (active ? 'Disable' : 'Enable') + '</button></td>' +
      '</tr>';
    }).join(''));
  }

  function bindStatusActions() {
    $('.user-status-action').on('click', function () {
      var button = $(this);
      var id = button.data('id');
      var active = button.data('active') === true || button.data('active') === 'true';
      var action = active ? 'disable' : 'enable';
      var name = button.closest('tr').find('td').first().text();
      if (!window.confirm((active ? 'Disable' : 'Enable') + ' ' + name + '?')) return;
      api.patch('/users/' + encodeURIComponent(id) + '/' + action)
        .then(function () {
          ui.showToast(active ? 'User disabled.' : 'User enabled.');
          if (getPage() === 'admin-dashboard.html') loadDashboard();
          if (getPage() === 'admin-users.html') loadUsers(1);
        })
        .catch(function (error) {
          ui.showToast(ui.getApiErrorMessage(error), 'error');
        });
    });
  }

  function loadDashboard() {
    ui.setLoading('Loading dashboard...');
    Promise.all([api.get('/dashboard/admin'), api.get('/users?page=1&limit=5')])
      .then(function (responses) {
        var stats = responses[0] && responses[0].data ? responses[0].data : {};
        var users = responses[1] && Array.isArray(responses[1].data) ? responses[1].data : [];
        renderDashboard(stats);
        renderUserRows(users, $('#dashboard-users-body'));
        bindStatusActions();
        $('#dashboard-status').empty();
      })
      .catch(function (error) {
        $('#dashboard-status').text(ui.getApiErrorMessage(error));
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  function loadUsers(page) {
    ui.setLoading('Loading users...');
    api.get('/users?page=' + (page || 1) + '&limit=20')
      .then(function (response) {
        var users = Array.isArray(response.data) ? response.data : [];
        renderUserRows(users, $('#users-body'));
        bindStatusActions();
        $('#users-status').empty();
      })
      .catch(function (functionError) {
        $('#users-status').text(ui.getApiErrorMessage(functionError));
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  $(function () {
    if (!guards.requireAdmin()) return;
    window.CivicEvents.layout.render();
    if (getPage() === 'admin-dashboard.html') loadDashboard();
    if (getPage() === 'admin-users.html') loadUsers(1);
  });
}(window, window.jQuery));

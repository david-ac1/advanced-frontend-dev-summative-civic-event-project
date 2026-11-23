(function (window, $) {
  'use strict';

  var api = window.CivicEvents.api;
  var auth = window.CivicEvents.auth;
  var guards = window.CivicEvents.guards;
  var ui = window.CivicEvents.ui;
  var audioExtensions = ['mp3', 'wav', 'm4a', 'ogg'];
  var maxAudioSize = 5 * 1024 * 1024;

  function getPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function getAnnouncementId() {
    return new URLSearchParams(window.location.search).get('id');
  }

  function escapeHtml(value) {
    return $('<div>').text(value == null ? '' : String(value)).html();
  }

  function normalizeData(response) {
    return response && Array.isArray(response.data) ? response.data : [];
  }

  function formatDate(value) {
    if (!value) return 'Date unavailable';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  function isPublished(announcement) {
    return announcement.published !== false;
  }

  function renderAdminActions(announcement) {
    if (!auth.isAdmin()) return '';
    var publishAction = isPublished(announcement)
      ? '<button class="text-button announcement-publish" type="button" data-action="unpublish" data-id="' + escapeHtml(announcement.id) + '">Unpublish</button>'
      : '<button class="text-button announcement-publish" type="button" data-action="publish" data-id="' + escapeHtml(announcement.id) + '">Publish</button>';
    return '<div class="admin-card-actions">' +
      '<a class="text-button" href="admin-announcement-form.html?id=' + encodeURIComponent(announcement.id) + '">Edit</a>' +
      publishAction +
      '<button class="text-button danger-button announcement-delete" type="button" data-id="' + escapeHtml(announcement.id) + '">Delete</button>' +
    '</div>';
  }

  function renderCard(announcement) {
    return '<article class="announcement-card">' +
      '<div class="announcement-card-icon" aria-hidden="true">Audio</div>' +
      '<div class="announcement-card-body">' +
        '<span class="tag">' + (isPublished(announcement) ? 'Published' : 'Draft') + '</span>' +
        '<h2>' + escapeHtml(announcement.title) + '</h2>' +
        '<p class="event-meta">Added ' + escapeHtml(formatDate(announcement.created_at)) + '</p>' +
        '<audio controls preload="metadata" src="' + escapeHtml(announcement.audio_url) + '">' +
          'Your browser does not support audio playback. ' +
          '<a href="' + escapeHtml(announcement.audio_url) + '">Download the audio file</a>.' +
        '</audio>' +
        '<div class="card-actions">' +
          '<a class="button button-secondary" href="announcement-detail.html?id=' + encodeURIComponent(announcement.id) + '">Open details</a>' +
          renderAdminActions(announcement) +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function bindAdminActions() {
    $('.announcement-delete').on('click', function () {
      var id = $(this).data('id');
      if (!window.confirm('Delete this announcement? This cannot be undone.')) return;
      api.delete('/announcements/' + encodeURIComponent(id))
        .then(function () {
          ui.showToast('Announcement deleted.');
          loadList();
        })
        .catch(function (error) {
          ui.showToast(ui.getApiErrorMessage(error), 'error');
        });
    });
    $('.announcement-publish').on('click', function () {
      var button = $(this);
      var id = button.data('id');
      var action = button.data('action');
      api.patch('/announcements/' + encodeURIComponent(id) + '/' + action)
        .then(function () {
          ui.showToast(action === 'publish' ? 'Announcement published.' : 'Announcement unpublished.');
          loadList();
        })
        .catch(function (error) {
          ui.showToast(ui.getApiErrorMessage(error), 'error');
        });
    });
  }

  function loadList() {
    ui.setLoading('Loading announcements...');
    api.get('/announcements')
      .then(function (response) {
        var announcements = normalizeData(response).filter(function (item) {
          return auth.isAdmin() || isPublished(item);
        });
        var grid = $('#announcements-grid');
        grid.empty();
        if (!announcements.length) {
          $('#announcements-status').text('No announcements are available yet.');
          return;
        }
        $('#announcements-status').empty();
        grid.html(announcements.map(renderCard).join(''));
        bindAdminActions();
      })
      .catch(function (error) {
        $('#announcements-status').text(ui.getApiErrorMessage(error));
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  function loadDetail() {
    var id = getAnnouncementId();
    if (!id) {
      $('#announcement-detail-status').text('This announcement could not be found.');
      return;
    }
    ui.setLoading('Loading announcement...');
    api.get('/announcements/' + encodeURIComponent(id))
      .then(function (response) {
        var announcement = response && response.data;
        if (!announcement || (!auth.isAdmin() && !isPublished(announcement))) {
          throw new Error('This announcement is not available.');
        }
        $('#announcement-detail').html(
          '<div class="media-detail-icon" aria-hidden="true">Audio</div>' +
          '<div class="media-detail-copy"><span class="tag">' +
            (isPublished(announcement) ? 'Published' : 'Draft') + '</span>' +
            '<h1>' + escapeHtml(announcement.title) + '</h1>' +
            '<p class="event-meta">Added ' + escapeHtml(formatDate(announcement.created_at)) + '</p>' +
            '<audio class="detail-audio" controls preload="metadata" src="' + escapeHtml(announcement.audio_url) + '">' +
              'Your browser does not support audio playback. ' +
              '<a href="' + escapeHtml(announcement.audio_url) + '">Download the audio file</a>.' +
            '</audio>' +
            '<p class="muted-label">Use the audio controls above to play, pause, adjust volume, or seek through this announcement.</p>' +
          '</div>'
        );
      })
      .catch(function (error) {
        $('#announcement-detail-status').text(ui.getApiErrorMessage(error));
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  function validateFile(file, required) {
    if (!file) return required ? 'Select an audio file.' : '';
    var extension = file.name.split('.').pop().toLowerCase();
    if (audioExtensions.indexOf(extension) === -1) return 'Use an MP3, WAV, M4A, or OGG file.';
    if (file.size > maxAudioSize) return 'Audio files must be 5 MB or smaller.';
    return '';
  }

  function setFormMessage(message, type) {
    $('#announcement-form-message')
      .removeClass('form-message-success form-message-error')
      .addClass('form-message-' + type)
      .text(message)
      .prop('hidden', false);
  }

  function loadFormAnnouncement(id) {
    ui.setLoading('Loading announcement...');
    api.get('/announcements/' + encodeURIComponent(id))
      .then(function (response) {
        var announcement = response && response.data;
        $('#announcement-title').val(announcement.title);
        $('#announcement-published').prop('checked', isPublished(announcement));
        $('#announcement-form-heading').text('Edit announcement');
        $('#announcement-audio').prop('required', false);
        $('#announcement-audio').prop('disabled', true);
        $('#announcement-audio-help').text('(Audio replacement is not available while editing.)');
        $('#announcement-audio-name').text('Existing audio will be kept.');
      })
      .catch(function (error) {
        setFormMessage(ui.getApiErrorMessage(error), 'error');
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  function submitForm(event) {
    event.preventDefault();
    var title = $.trim($('#announcement-title').val());
    var file = $('#announcement-audio')[0].files[0];
    var fileError = validateFile(file, !getAnnouncementId());
    $('[data-error-for]').text('');
    if (!title) {
      $('[data-error-for="announcement-title"]').text('Enter a title.');
      return;
    }
    if (fileError) {
      $('[data-error-for="announcement-audio"]').text(fileError);
      return;
    }
    var formData = new FormData();
    formData.append('title', title);
    formData.append('published', String($('#announcement-published').is(':checked')));
    if (file) formData.append('audio', file);
    var id = getAnnouncementId();
    var request = id
      ? api.put('/announcements/' + encodeURIComponent(id), formData)
      : api.post('/announcements', formData);
    ui.setLoading(id ? 'Updating announcement...' : 'Creating announcement...');
    request.then(function (response) {
      ui.clearLoading();
      setFormMessage(response.message || 'Announcement saved successfully.', 'success');
      ui.showToast(id ? 'Announcement updated.' : 'Announcement created.');
      window.setTimeout(function () {
        window.location.assign('announcements.html');
      }, 700);
    }).catch(function (error) {
      ui.clearLoading();
      setFormMessage(ui.getApiErrorMessage(error), 'error');
    });
  }

  $(function () {
    if (!guards.requireAuth()) return;
    window.CivicEvents.layout.render();
    if (getPage() === 'announcements.html') {
      $('#create-announcement-link').prop('hidden', !auth.isAdmin());
      loadList();
    } else if (getPage() === 'announcement-detail.html') {
      loadDetail();
    } else if (getPage() === 'admin-announcement-form.html') {
      if (!guards.requireAdmin()) return;
      var id = getAnnouncementId();
      if (id) loadFormAnnouncement(id);
      $('#announcement-audio').on('change', function () {
        $('#announcement-audio-name').text(this.files[0] ? this.files[0].name : 'No file selected.');
      });
      $('#announcement-form').on('submit', submitForm);
    }
  });
}(window, window.jQuery));

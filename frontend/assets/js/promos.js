(function (window, $) {
  'use strict';

  var api = window.CivicEvents.api;
  var auth = window.CivicEvents.auth;
  var guards = window.CivicEvents.guards;
  var ui = window.CivicEvents.ui;
  var videoExtensions = ['mp4', 'mov', 'avi', 'mkv'];
  var maxVideoSize = 8 * 1024 * 1024;
  var captionUrls = [];

  function getPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function getPromoId() {
    return new URLSearchParams(window.location.search).get('id');
  }

  function escapeHtml(value) {
    return $('<div>').text(value == null ? '' : String(value)).html();
  }

  function normalizeData(response) {
    return response && Array.isArray(response.data) ? response.data : [];
  }

  function isPublished(promo) {
    return promo.published !== false;
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

  function createCaptionUrl(captionText) {
    if (!captionText) return '';
    var vtt = 'WEBVTT\n\n00:00:00.000 --> 99:59:59.000\n' +
      captionText.replace(/-->/g, '-- &gt;') + '\n';
    var url = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
    captionUrls.push(url);
    return url;
  }

  function renderAdminActions(promo) {
    if (!auth.isAdmin()) return '';
    var action = isPublished(promo) ? 'unpublish' : 'publish';
    return '<div class="admin-card-actions">' +
      '<a class="text-button" href="admin-promo-form.html?id=' + encodeURIComponent(promo.id) + '">Edit</a>' +
      '<button class="text-button promo-publish" type="button" data-action="' + action + '" data-id="' + escapeHtml(promo.id) + '">' +
        (action === 'publish' ? 'Publish' : 'Unpublish') + '</button>' +
      '<button class="text-button danger-button promo-delete" type="button" data-id="' + escapeHtml(promo.id) + '">Delete</button>' +
    '</div>';
  }

  function renderCard(promo) {
    var captionUrl = createCaptionUrl(promo.caption_text);
    return '<article class="promo-card">' +
      '<video class="promo-card-video" controls preload="metadata" src="' + escapeHtml(promo.video_url) + '">' +
        (captionUrl ? '<track kind="captions" src="' + escapeHtml(captionUrl) + '" srclang="en" label="English" default>' : '') +
        'Your browser does not support video playback.' +
      '</video>' +
      '<div class="promo-card-body">' +
        '<span class="tag">' + (isPublished(promo) ? 'Published' : 'Draft') + '</span>' +
        '<h2>' + escapeHtml(promo.title) + '</h2>' +
        '<p class="event-meta">Added ' + escapeHtml(formatDate(promo.created_at)) + '</p>' +
        '<p class="event-description">' + escapeHtml(promo.description || 'No description available.') + '</p>' +
        '<div class="card-actions">' +
          '<a class="button button-secondary" href="promo-detail.html?id=' + encodeURIComponent(promo.id) + '">Open promo</a>' +
          renderAdminActions(promo) +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function bindAdminActions() {
    $('.promo-delete').on('click', function () {
      var id = $(this).data('id');
      if (!window.confirm('Delete this promo? This cannot be undone.')) return;
      api.delete('/promos/' + encodeURIComponent(id))
        .then(function () {
          ui.showToast('Promo deleted.');
          loadList(1);
        })
        .catch(function (error) {
          ui.showToast(ui.getApiErrorMessage(error), 'error');
        });
    });
    $('.promo-publish').on('click', function () {
      var button = $(this);
      var id = button.data('id');
      var action = button.data('action');
      api.patch('/promos/' + encodeURIComponent(id) + '/' + action)
        .then(function () {
          ui.showToast(action === 'publish' ? 'Promo published.' : 'Promo unpublished.');
          loadList(1);
        })
        .catch(function (error) {
          ui.showToast(ui.getApiErrorMessage(error), 'error');
        });
    });
  }

  function renderPagination(pagination) {
    var nav = $('#promos-pagination');
    if (!pagination || pagination.pages <= 1) {
      nav.prop('hidden', true).empty();
      return;
    }
    nav.prop('hidden', false).html(
      '<button class="button button-secondary" type="button" data-page="' + (pagination.page - 1) + '"' +
        (pagination.page <= 1 ? ' disabled' : '') + '>Previous</button>' +
      '<span class="pagination-label">Page ' + pagination.page + ' of ' + pagination.pages + '</span>' +
      '<button class="button button-secondary" type="button" data-page="' + (pagination.page + 1) + '"' +
        (pagination.page >= pagination.pages ? ' disabled' : '') + '>Next</button>'
    );
    nav.find('button').on('click', function () {
      loadList(Number($(this).data('page')));
    });
  }

  function loadList(page) {
    captionUrls.forEach(URL.revokeObjectURL);
    captionUrls = [];
    ui.setLoading('Loading promos...');
    api.get('/promos?page=' + (page || 1) + '&limit=12')
      .then(function (response) {
        var promos = normalizeData(response).filter(function (item) {
          return auth.isAdmin() || isPublished(item);
        });
        var grid = $('#promos-grid');
        grid.empty();
        if (!promos.length) {
          $('#promos-status').text('No promos are available yet.');
          renderPagination(null);
          return;
        }
        $('#promos-status').empty();
        grid.html(promos.map(renderCard).join(''));
        bindAdminActions();
        renderPagination(response.pagination);
      })
      .catch(function (error) {
        $('#promos-status').text(ui.getApiErrorMessage(error));
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  function renderDetail(promo) {
    var captionUrl = createCaptionUrl(promo.caption_text);
    $('#promo-detail').html(
      '<div class="promo-detail-media">' +
        '<video id="promo-player" controls preload="metadata" src="' + escapeHtml(promo.video_url) + '">' +
          (captionUrl ? '<track kind="captions" src="' + escapeHtml(captionUrl) + '" srclang="en" label="English" default>' : '') +
          'Your browser does not support video playback.' +
        '</video>' +
      '</div>' +
      '<div class="media-detail-copy"><span class="tag">' + (isPublished(promo) ? 'Published' : 'Draft') + '</span>' +
        '<h1>' + escapeHtml(promo.title) + '</h1>' +
        '<p class="event-meta">Added ' + escapeHtml(formatDate(promo.created_at)) + '</p>' +
        '<p class="detail-description">' + escapeHtml(promo.description || 'No description available.') + '</p>' +
        '<h2 class="transcript-heading">Transcript</h2>' +
        '<p class="detail-description">' + escapeHtml(promo.caption_text || 'No transcript available.') + '</p>' +
      '</div>'
    );
  }

  function loadDetail() {
    var id = getPromoId();
    if (!id) {
      $('#promo-detail-status').text('This promo could not be found.');
      return;
    }
    ui.setLoading('Loading promo...');
    api.get('/promos/' + encodeURIComponent(id))
      .then(function (response) {
        var promo = response && response.data;
        if (!promo || (!auth.isAdmin() && !isPublished(promo))) {
          throw new Error('This promo is not available.');
        }
        renderDetail(promo);
      })
      .catch(function (error) {
        $('#promo-detail-status').text(ui.getApiErrorMessage(error));
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  function validateVideo(file, required) {
    if (!file) return required ? 'Select a video file.' : '';
    var extension = file.name.split('.').pop().toLowerCase();
    if (videoExtensions.indexOf(extension) === -1) return 'Use an MP4, MOV, AVI, or MKV file.';
    if (file.size > maxVideoSize) return 'Video files must be 8 MB or smaller.';
    return '';
  }

  function setFormMessage(message, type) {
    $('#promo-form-message')
      .removeClass('form-message-success form-message-error')
      .addClass('form-message-' + type)
      .text(message)
      .prop('hidden', false);
  }

  function loadFormPromo(id) {
    ui.setLoading('Loading promo...');
    api.get('/promos/' + encodeURIComponent(id))
      .then(function (response) {
        var promo = response && response.data;
        $('#promo-title').val(promo.title);
        $('#promo-description').val(promo.description);
        $('#promo-captions').val(promo.caption_text);
        $('#promo-published').prop('checked', isPublished(promo));
        $('#promo-form-heading').text('Edit promo');
        $('#promo-video-name').text('Existing video will be kept unless you choose a replacement.');
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
    var title = $.trim($('#promo-title').val());
    var description = $.trim($('#promo-description').val());
    var captions = $.trim($('#promo-captions').val());
    var file = $('#promo-video')[0].files[0];
    var fileError = validateVideo(file, !getPromoId());
    $('[data-error-for]').text('');
    if (!title) $('[data-error-for="promo-title"]').text('Enter a title.');
    if (!description) $('[data-error-for="promo-description"]').text('Enter a description.');
    if (!captions) $('[data-error-for="promo-captions"]').text('Add caption text for accessibility.');
    if (fileError) $('[data-error-for="promo-video"]').text(fileError);
    if (!title || !description || !captions || fileError) return;

    var formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('caption_text', captions);
    formData.append('published', String($('#promo-published').is(':checked')));
    if (file) formData.append('video', file);
    var id = getPromoId();
    var request = id
      ? api.put('/promos/' + encodeURIComponent(id), formData)
      : api.post('/promos', formData);
    ui.setLoading(id ? 'Updating promo...' : 'Creating promo...');
    request.then(function (response) {
      ui.clearLoading();
      setFormMessage(response.message || 'Promo saved successfully.', 'success');
      ui.showToast(id ? 'Promo updated.' : 'Promo created.');
      window.setTimeout(function () {
        window.location.assign('promos.html');
      }, 700);
    }).catch(function (error) {
      ui.clearLoading();
      setFormMessage(ui.getApiErrorMessage(error), 'error');
    });
  }

  $(function () {
    if (!guards.requireAuth()) return;
    window.CivicEvents.layout.render();
    if (getPage() === 'promos.html') {
      $('#create-promo-link').prop('hidden', !auth.isAdmin());
      loadList(1);
    } else if (getPage() === 'promo-detail.html') {
      loadDetail();
    } else if (getPage() === 'admin-promo-form.html') {
      if (!guards.requireAdmin()) return;
      var id = getPromoId();
      if (id) loadFormPromo(id);
      $('#promo-video').on('change', function () {
        $('#promo-video-name').text(this.files[0] ? this.files[0].name : 'No file selected.');
      });
      $('#promo-form').on('submit', submitForm);
    }
  });
}(window, window.jQuery));

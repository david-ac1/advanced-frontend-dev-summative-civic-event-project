(function (window, $) {
  'use strict';

  var api = window.CivicEvents.api;
  var auth = window.CivicEvents.auth;
  var guards = window.CivicEvents.guards;
  var ui = window.CivicEvents.ui;
  var events = [];
  var registrations = [];

  function getPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function getEventId() {
    return new URLSearchParams(window.location.search).get('id');
  }

  function escapeHtml(value) {
    return $('<div>').text(value == null ? '' : String(value)).html();
  }

  function formatDate(value, includeTime) {
    if (!value) return 'Date to be confirmed';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date to be confirmed';
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: includeTime ? '2-digit' : undefined,
      minute: includeTime ? '2-digit' : undefined
    }).format(date);
  }

  function imageMarkup(event, className) {
    var imageUrl = event.metadata && event.metadata.image_url;
    if (imageUrl) {
      return '<img class="' + className + '" src="' + escapeHtml(imageUrl) + '" alt="">' ;
    }
    return '<div class="' + className + ' event-image-placeholder" aria-hidden="true">Event image</div>';
  }

  function normalizeData(response) {
    return response && Array.isArray(response.data) ? response.data : [];
  }

  function isPublished(event) {
    return event.published !== false;
  }

  function renderEventCard(event) {
    var description = event.description || 'Join your community at this upcoming event.';
    return '<article class="event-card">' +
      imageMarkup(event, 'event-card-image') +
      '<div class="event-card-body">' +
        '<span class="tag">Community event</span>' +
        '<h2>' + escapeHtml(event.title) + '</h2>' +
        '<p class="event-meta">' + escapeHtml(formatDate(event.starts_at, true)) + '</p>' +
        '<p class="event-meta">' + escapeHtml(event.location || 'Location to be confirmed') + '</p>' +
        '<p class="event-description">' + escapeHtml(description) + '</p>' +
        '<div class="card-actions">' +
          '<a class="button button-secondary" href="event-detail.html?id=' + encodeURIComponent(event.id) + '">View</a>' +
          (auth.isAdmin()
            ? '<a class="button button-primary" href="admin-event-form.html?id=' + encodeURIComponent(event.id) + '">Edit</a>' +
              '<button class="text-button danger-button delete-event" type="button" data-event-id="' + escapeHtml(event.id) + '">Delete</button>'
            : '<button class="button button-primary register-button" type="button" data-event-id="' + escapeHtml(event.id) + '">Register</button>') +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function getFilteredEvents() {
    var query = $.trim($('#event-search').val()).toLowerCase();
    var location = $.trim($('#event-location').val()).toLowerCase();
    var date = $('#event-date').val();

    return events.filter(function (event) {
      var searchable = (event.title || '') + ' ' + (event.description || '');
      var matchesQuery = !query || searchable.toLowerCase().indexOf(query) !== -1;
      var matchesLocation = !location || (event.location || '').toLowerCase().indexOf(location) !== -1;
      var matchesDate = !date || (event.starts_at || '').slice(0, 10) === date;
      return matchesQuery && matchesLocation && matchesDate;
    });
  }

  function renderEvents() {
    var filteredEvents = getFilteredEvents();
    var grid = $('#events-grid');
    $('#events-status').empty();
    grid.empty();

    if (!filteredEvents.length) {
      $('#events-status').text(events.length ? 'No events match your filters.' : 'No upcoming events are available yet.');
      return;
    }
    grid.html(filteredEvents.map(renderEventCard).join(''));
    if (auth.isAdmin()) {
      grid.find('.delete-event').on('click', function () {
        deleteEvent($(this).data('event-id'));
      });
    } else {
    grid.find('.register-button').on('click', function () {
      registerForEvent($(this).data('event-id'), $(this));
    });
    }
  }

  function deleteEvent(eventId) {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    api.delete('/events/' + encodeURIComponent(eventId))
      .then(function () {
        ui.showToast('Event deleted.');
        loadEvents();
      })
      .catch(function (error) {
        ui.showToast(ui.getApiErrorMessage(error), 'error');
      });
  }

  function fetchRegistrations() {
    return api.get('/event-registrations/my-registrations')
      .then(function (response) {
        registrations = normalizeData(response);
      });
  }

  function registerForEvent(eventId, button) {
    button.prop('disabled', true).text('Registering...');
    api.post('/event-registrations/register', { event_id: eventId })
      .then(function () {
        button.text('Registered');
        ui.showToast('You are registered for this event.');
        return fetchRegistrations();
      })
      .catch(function (error) {
        button.prop('disabled', false).text('Register');
        ui.showToast(ui.getApiErrorMessage(error), 'error');
      });
  }

  function loadEvents() {
    ui.setLoading('Loading events...');
    return Promise.all([api.get('/events'), fetchRegistrations()])
      .then(function (responses) {
        events = normalizeData(responses[0]).filter(isPublished);
        renderEvents();
      })
      .catch(function (error) {
        $('#events-status').html(
          '<span>' + escapeHtml(ui.getApiErrorMessage(error)) + ' </span>' +
          '<button id="retry-events" class="text-button" type="button">Retry</button>'
        );
        $('#retry-events').on('click', loadEvents);
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  function renderDetail(event) {
    var registered = registrations.some(function (registration) {
      return registration.event_id === event.id && registration.status === 'registered';
    });
    $('#event-detail').html(
      '<div class="detail-main">' +
        imageMarkup(event, 'detail-image') +
        '<div class="detail-copy">' +
          '<span class="tag">Community event</span>' +
          '<h1>' + escapeHtml(event.title) + '</h1>' +
          '<p class="event-meta">' + escapeHtml(formatDate(event.starts_at, true)) + ' — ' +
            escapeHtml(formatDate(event.ends_at, true)) + '</p>' +
          '<p class="event-meta">' + escapeHtml(event.location || 'Location to be confirmed') + '</p>' +
          '<p class="detail-description">' + escapeHtml(event.description || 'No description available.') + '</p>' +
          '<div class="detail-actions">' +
            '<button id="detail-registration-button" class="button button-primary" type="button">' +
              (registered ? 'Cancel registration' : 'Register') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<section class="feedback-panel" aria-labelledby="feedback-heading">' +
        '<div class="section-heading"><h2 id="feedback-heading">Feedback</h2>' +
          '<span id="feedback-summary" class="muted-label">Feedback is welcome</span></div>' +
        '<div id="feedback-list" class="feedback-list"><p class="muted-label">Feedback details are available to administrators.</p></div>' +
        '<form id="feedback-form" class="feedback-form" novalidate>' +
          '<div class="form-field"><label for="feedback-rating">Rating (1–5)</label>' +
            '<select id="feedback-rating" required><option value="">Select a rating</option>' +
              '<option value="5">5 — Excellent</option><option value="4">4 — Good</option>' +
              '<option value="3">3 — Okay</option><option value="2">2 — Needs improvement</option>' +
              '<option value="1">1 — Poor</option></select></div>' +
          '<div class="form-field"><label for="feedback-comment">Comment</label>' +
            '<textarea id="feedback-comment" rows="4" placeholder="Share your experience"></textarea></div>' +
          '<button class="button button-primary" type="submit">Submit feedback</button>' +
        '</form>' +
      '</section>'
    );
    $('#detail-registration-button').on('click', function () {
      toggleRegistration(event, $(this), registered);
    });
    $('#feedback-form').on('submit', function (submitEvent) {
      submitFeedback(submitEvent, event.id);
    });
    if (auth.isAdmin()) {
      loadFeedback(event.id);
    }
  }

  function loadFeedback(eventId) {
    api.get('/event-feedback/event/' + encodeURIComponent(eventId))
      .then(function (response) {
        var feedback = normalizeData(response);
        var average = feedback.length
          ? feedback.reduce(function (total, item) {
            return total + Number(item.rating || 0);
          }, 0) / feedback.length
          : 0;
        $('#feedback-summary').text(
          feedback.length ? 'Average rating ' + average.toFixed(1) + ' of 5' : 'No feedback yet'
        );
        if (feedback.length) {
          $('#feedback-list').html(feedback.map(function (item) {
            return '<article class="feedback-item"><strong>' +
              escapeHtml(item.full_name || 'Community member') + '</strong>' +
              '<span class="muted-label">' + escapeHtml(item.rating) + ' of 5</span>' +
              '<p>' + escapeHtml(item.comment || 'No comment provided.') + '</p></article>';
          }).join(''));
        } else {
          $('#feedback-list').html('<p class="muted-label">No feedback has been submitted yet.</p>');
        }
      })
      .catch(function (error) {
        $('#feedback-list').text(ui.getApiErrorMessage(error));
      });
  }

  function toggleRegistration(event, button, registered) {
    button.prop('disabled', true).text(registered ? 'Cancelling...' : 'Registering...');
    var path = registered ? '/event-registrations/cancel' : '/event-registrations/register';
    api.post(path, { event_id: event.id })
      .then(function () {
        ui.showToast(registered ? 'Registration cancelled.' : 'You are registered for this event.');
        window.setTimeout(function () {
          window.location.reload();
        }, 500);
      })
      .catch(function (error) {
        button.prop('disabled', false).text(registered ? 'Cancel registration' : 'Register');
        ui.showToast(ui.getApiErrorMessage(error), 'error');
      });
  }

  function submitFeedback(event, eventId) {
    event.preventDefault();
    var rating = $('#feedback-rating').val();
    if (!rating) {
      ui.showToast('Select a rating before submitting feedback.', 'error');
      return;
    }
    var button = $('#feedback-form button[type="submit"]');
    button.prop('disabled', true).text('Submitting...');
    api.post('/event-feedback', {
      event_id: eventId,
      rating: Number(rating),
      comment: $.trim($('#feedback-comment').val())
    }).then(function () {
      ui.showToast('Feedback submitted.');
      $('#feedback-form')[0].reset();
    }).catch(function (error) {
      ui.showToast(ui.getApiErrorMessage(error), 'error');
    }).finally(function () {
      button.prop('disabled', false).text('Submit feedback');
    });
  }

  function toLocalDateTime(value) {
    if (!value) return '';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    var offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
  }

  function validateEventImage(file) {
    if (!file) return '';
    var extension = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
      return 'Use a JPG, JPEG, PNG, or GIF image.';
    }
    if (file.size > 2 * 1024 * 1024) {
      return 'Images must be 2 MB or smaller.';
    }
    return '';
  }

  function setEventFormMessage(message, type) {
    $('#event-form-message')
      .removeClass('form-message-success form-message-error')
      .addClass('form-message-' + type)
      .text(message)
      .prop('hidden', false);
  }

  function loadEventForm(id) {
    ui.setLoading('Loading event...');
    api.get('/events/' + encodeURIComponent(id))
      .then(function (response) {
        var event = response && response.data;
        $('#event-title').val(event.title || '');
        $('#event-description').val(event.description || '');
        $('#event-location').val(event.location || '');
        $('#event-starts').val(toLocalDateTime(event.starts_at));
        $('#event-ends').val(toLocalDateTime(event.ends_at));
        $('#event-published').prop('checked', event.published !== false);
        $('#event-form-heading').text('Edit event');
        if (event.metadata && event.metadata.image_url) {
          $('#event-image-preview').attr('src', event.metadata.image_url).prop('hidden', false);
        }
      })
      .catch(function (error) {
        setEventFormMessage(ui.getApiErrorMessage(error), 'error');
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  function submitEventForm(event) {
    event.preventDefault();
    var title = $.trim($('#event-title').val());
    var location = $.trim($('#event-location').val());
    var starts = $('#event-starts').val();
    var ends = $('#event-ends').val();
    var file = $('#event-image')[0].files[0];
    var fileError = validateEventImage(file);
    $('[data-error-for]').text('');
    if (!title) $('[data-error-for="event-title"]').text('Enter a title.');
    if (!location) $('[data-error-for="event-location"]').text('Enter a location.');
    if (!starts) $('[data-error-for="event-starts"]').text('Choose a start date and time.');
    if (!ends) $('[data-error-for="event-ends"]').text('Choose an end date and time.');
    if (starts && ends && new Date(ends) <= new Date(starts)) {
      $('[data-error-for="event-ends"]').text('End time must be after the start time.');
    }
    if (fileError) $('[data-error-for="event-image"]').text(fileError);
    if (!title || !location || !starts || !ends || (starts && ends && new Date(ends) <= new Date(starts)) || fileError) return;

    var formData = new FormData();
    formData.append('title', title);
    formData.append('description', $.trim($('#event-description').val()));
    formData.append('location', location);
    formData.append('starts_at', new Date(starts).toISOString());
    formData.append('ends_at', new Date(ends).toISOString());
    formData.append('published', String($('#event-published').is(':checked')));
    if (file) formData.append('image', file);

    var id = getEventId();
    ui.setLoading(id ? 'Updating event...' : 'Creating event...');
    var request = id
      ? api.put('/events/' + encodeURIComponent(id), formData)
      : api.post('/events', formData);
    request.then(function (response) {
      ui.clearLoading();
      setEventFormMessage(response.message || 'Event saved successfully.', 'success');
      ui.showToast(id ? 'Event updated.' : 'Event created.');
      window.setTimeout(function () {
        window.location.assign('events.html');
      }, 700);
    }).catch(function (error) {
      ui.clearLoading();
      setEventFormMessage(ui.getApiErrorMessage(error), 'error');
    });
  }

  function loadDetail() {
    var eventId = getEventId();
    if (!eventId) {
      $('#event-detail-status').text('This event could not be found.');
      return;
    }
    ui.setLoading('Loading event details...');
    Promise.all([api.get('/events/' + encodeURIComponent(eventId)), fetchRegistrations()])
      .then(function (responses) {
        var event = responses[0] && responses[0].data;
        if (!event || !isPublished(event)) {
          throw new Error('This event is not available.');
        }
        renderDetail(event);
      })
      .catch(function (error) {
        $('#event-detail-status').text(ui.getApiErrorMessage(error));
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  function loadRegistrations() {
    ui.setLoading('Loading your registrations...');
    api.get('/event-registrations/my-registrations')
      .then(function (response) {
        var list = normalizeData(response);
        var container = $('#registrations-list');
        if (!list.length) {
          $('#registrations-status').text('You have not registered for any events yet.');
          return;
        }
        container.html(list.map(function (registration) {
          var isCancelled = registration.status === 'cancelled';
          return '<article class="registration-card">' +
            '<div><span class="tag">' + (isCancelled ? 'Cancelled' : 'Registered') + '</span>' +
            '<h2>' + escapeHtml(registration.title) + '</h2>' +
            '<p class="event-meta">' + escapeHtml(formatDate(registration.starts_at, true)) + '</p>' +
            '<p class="event-meta">' + escapeHtml(registration.location || 'Location to be confirmed') + '</p></div>' +
            '<a class="button button-secondary" href="event-detail.html?id=' + encodeURIComponent(registration.event_id) + '">View event</a>' +
          '</article>';
        }).join(''));
      })
      .catch(function (error) {
        $('#registrations-status').text(ui.getApiErrorMessage(error));
      })
      .finally(function () {
        ui.clearLoading();
      });
  }

  $(function () {
    if (!guards.requireAuth()) return;
    window.CivicEvents.layout.render();
    if (getPage() === 'admin-event-form.html') {
      if (!guards.requireAdmin()) return;
      var eventId = getEventId();
      if (eventId) loadEventForm(eventId);
      $('#event-image').on('change', function () {
        var file = this.files[0];
        $('#event-image-name').text(file ? file.name : 'No file selected.');
        if (file) {
          var reader = new FileReader();
          reader.onload = function (loadEvent) {
            $('#event-image-preview').attr('src', loadEvent.target.result).prop('hidden', false);
          };
          reader.readAsDataURL(file);
        }
      });
      $('#event-form').on('submit', submitEventForm);
    } else if (getPage() === 'events.html') {
      $('#create-event-link').prop('hidden', !auth.isAdmin());
      var initialQuery = new URLSearchParams(window.location.search).get('q');
      if (initialQuery) {
        $('#event-search').val(initialQuery);
      }
      $('#event-filters').on('submit', function (event) {
        event.preventDefault();
        renderEvents();
      });
      $('#clear-event-filters').on('click', function () {
        $('#event-filters')[0].reset();
        renderEvents();
      });
      loadEvents();
    } else if (getPage() === 'event-detail.html') {
      loadDetail();
    } else if (getPage() === 'my-registrations.html') {
      loadRegistrations();
    }
  });
}(window, window.jQuery));

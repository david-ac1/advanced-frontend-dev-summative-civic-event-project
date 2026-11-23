# CivicEvents frontend

This directory contains the CivicEvents frontend. It uses semantic HTML, Tailwind CSS utilities, jQuery, and a small set of shared JavaScript modules. The visual system follows the supplied CivicEvents UI reference: warm off-white canvas, white surfaces, deep teal actions, burnt-orange accents, Inter typography, rounded controls, and responsive layouts.

## Run locally

1. Start the backend from the repository root:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

2. Serve this directory with a local static server. For example, with Python:

   ```powershell
   cd frontend
   python -m http.server 5500
   ```

3. Open `http://localhost:5500/`.

The API client defaults to `http://localhost:4000/api`. To use another API URL, set `window.CIVIC_EVENTS_API_URL` before the application scripts load.

## Shared foundation

- `assets/js/config.js` contains API and session-storage configuration.
- `assets/js/auth.js` owns token/user session storage and role checks.
- `assets/js/guards.js` provides authenticated and admin-only page guards.
- `assets/js/auth-pages.js` handles login, signup, password validation, and the password-strength meter.
- `assets/js/events.js` handles event discovery, filtering, details, registration/cancellation, feedback submission, and “My registrations”.
- `assets/js/api.js` adds the `Authorization: Bearer <token>` header to protected requests, serializes JSON payloads, supports `FormData`, and redirects on `401`.
- `assets/js/ui.js` provides shared loading, toast, and API error presentation.
- `assets/js/layout.js` renders the shared header, navigation, notification entry point, and footer.
- `assets/css/app.css` contains the reference design tokens and responsive primitives.

The current default is session-only storage. Persistent storage can be enabled deliberately by changing `storageType` in `assets/js/config.js` after considering the security tradeoff.

Event feedback submission is available to authenticated users. The current backend exposes event feedback listings to administrators only, so the event detail view shows the average and feedback list when an administrator opens it.
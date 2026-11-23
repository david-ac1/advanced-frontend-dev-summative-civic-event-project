# CivicEvents+ Project

CivicEvents+ is a full-stack civic events portal. This repository contains the Node.js/Express/PostgreSQL backend and a frontend-only implementation using semantic HTML, Tailwind CSS, and jQuery.

## Features

- JWT authentication and admin/user role guards
- Event browsing, registration, feedback, and admin event management
- Audio announcements
- Captioned promo videos
- Broadcast and targeted notifications
- Profile management and admin user controls
- Admin dashboard statistics

## Prerequisites

- Node.js 18 or newer
- PostgreSQL 15 or newer
- Python 3 or another static HTTP server
- A modern browser

Optional:

- pgAdmin for database management
- Postman for API testing

## 1. Configure PostgreSQL

Create the project database. In pgAdmin, open the Query Tool for the `postgres` database and run:

```sql
CREATE DATABASE "civic-events-db";
```

The database name contains a hyphen, so it must be quoted.

## 2. Configure the backend

Copy [backend/.env.example](backend/.env.example) to `backend/.env`, then set local values:

```env
DB_USER=postgres
DB_PASS=your_postgresql_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=civic-events-db
JWT_SECRET=replace_with_a_long_random_string
```

Never commit `backend/.env` or share its contents. A safe `.env.example` is provided for setup.

If PostgreSQL is running but the password is forgotten, reset the `postgres` role using pgAdmin or PostgreSQL tools before starting the app.

## 3. Install dependencies and create tables

PowerShell:

```powershell
cd backend
npm install
psql -h localhost -p 5432 -U postgres -d civic-events-db -f migrations/001_create_tables.sql
npm run dev
```

When prompted by `psql`, enter the PostgreSQL password. The backend runs at:

```text
http://localhost:4000
```

The migration can also be run through pgAdmin by opening the Query Tool for `civic-events-db` and executing `backend/migrations/001_create_tables.sql`.

Verify the backend:

```text
http://localhost:4000/health
```

## 4. Start the frontend

Open a second terminal:

```powershell
cd frontend
python -m http.server 5500
```

Open:

```text
http://localhost:5500/
```

## API connection

The frontend API client uses:

```text
http://localhost:4000/api
```

The default is configured in [frontend/assets/js/config.js](frontend/assets/js/config.js). To use another API URL before the scripts load, set:

```html
<script>
  window.CIVIC_EVENTS_API_URL = "http://localhost:4000/api";
</script>
```

Protected requests send `Authorization: Bearer <token>`. Authentication uses session storage by default.

## First account and admin access

1. Open `http://localhost:5500/signup.html`.
2. Create an account.
3. In pgAdmin, run:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your_account_email@example.com';
```

4. Sign out and sign in again.
5. Open `http://localhost:5500/admin-dashboard.html`.

Role changes must be applied through the backend/database. The frontend does not allow normal users to change roles.

## Running with two terminals

Terminal 1:

```powershell
cd backend
npm run dev
```

Terminal 2:

```powershell
cd frontend
python -m http.server 5500
```

No sample data is included. Create events, announcements, and promos through an admin account after signup.

## Troubleshooting

- `ECONNREFUSED` or “Failed to fetch”: confirm the backend is running on port `4000`.
- PostgreSQL password authentication failed: verify `DB_PASS` in `backend/.env`.
- Database does not exist: create `civic-events-db` and run the migration.
- `401 Unauthorized`: sign in again and confirm the session token exists.
- `403 Forbidden`: the endpoint requires an admin account.
- Uploaded media not visible: confirm the backend uploads folder exists and the media URL is returned by the API.
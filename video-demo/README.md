# CivicEvents — Demo Video

**Video Link:** https://www.tella.com/video/civic-events-platform-demo-c7i57haa

## What the demo covers

| Segment | Time (approx.) | Content |
|---------|---------------|---------|
| Backend setup | 0:00–0:45 | Postgres, Node.js API, health check, frontend static server |
| Normal user flow | 0:45–3:15 | Sign up, login, browse events, register, feedback, my registrations (with cancel), profile, notifications, announcements, promos |
| Admin flow | 3:15–5:30 | Admin dashboard, user management (enable/disable), create/edit/delete events, announcements, promos, notifications |
| Accessibility & responsive | 5:30–6:15 | Mobile layout, keyboard focus, ARIA labels, skip link, error handling |
| Closing | 6:15–7:00 | Repo structure and README instructions |

## How to run locally

See the root [`README.md`](../README.md) and [`frontend/README.md`](../frontend/README.md) for backend setup, environment variables, and frontend run instructions.

The frontend connects to `http://localhost:4000/api` and sends `Authorization: Bearer <token>` on protected requests.
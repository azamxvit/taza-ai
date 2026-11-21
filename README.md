# CleanCity

A community environmental reporting app. Residents click a location on a live map,
attach a photo and a category, and the report appears both on the map and in a
filterable community feed. Built as a single repo: Vite/React frontend + a
Node/Express backend backed by MongoDB Atlas.

## Features

- Interactive Leaflet map (Addis Ababa centered) with **Street / Satellite / Dark**
  base layers, scale control, and a "locate me" button. Click to drop a report pin.
- Report form with title, description, category, and image upload.
- All submitted reports render as colored map markers (color = category); resolved
  reports show a green check badge on the pin and in the feed.
- **Resolve flow:** "Mark solved" keeps the report (status = resolved); "Report as false"
  removes it. Both available from the map popup, the feed card, and the detail view.
- **Upvotes** ("I see this too") for community validation, with live counts.
- **Stats bar:** total / open / resolved / resolution rate.
- **Detail view:** modal with full image, description, mini-map, and all actions.
- Community feed with category filters (synced with the map), loading / empty / error states.
- Live updates: new reports and status changes appear instantly on the map and in the feed.
- Client-side routing (`/`, `/map`, `/reports`).
- Dark, responsive UI (Tailwind v4).

## Tech Stack

- **Frontend:** React 19, Vite 7, React Router 7, Leaflet / react-leaflet, Tailwind v4
- **Backend:** Node.js, Express, Multer (image uploads), CORS
- **Database:** MongoDB Atlas (`cleancity` database, `reports` collection)
- **Deployment:** Vercel (frontend), any Node host (backend)

## Project Structure

```
clean-city/
  server/
    index.js            # Express API (reports CRUD, image upload)
    db.js               # MongoDB connection (cleancity db, reports collection)
    uploads/            # uploaded images (gitignored, runtime)
  src/
    api.js              # fetch wrappers (respects VITE_API_URL)
    categories.js       # category definitions (map colors + filters)
    leafletIcon.js      # Leaflet default-icon fix + colored marker factory
    context/
      ReportsContext.jsx# shared report state (live refresh)
      useReports.js     # hook
    components/
      Header.jsx MapView.jsx ReportForm.jsx ReportsPage.jsx
      ReportCard.jsx Footer.jsx
    App.jsx main.jsx index.css
```

## Getting Started (local)

```bash
npm install
npm run dev        # starts API (http://localhost:5000) + Vite (http://localhost:5173)
```

Open http://localhost:5173. The Vite dev server proxies are not required — the
frontend talks to the API directly via `VITE_API_URL` (defaults to same-origin
in production, or `http://localhost:5000` in dev if you set it).

### Run servers separately

```bash
npm run dev:server   # API only → http://localhost:5000 (health: /api/health)
npm run dev:client   # Vite only → http://localhost:5173
```

## API

| Method | Endpoint           | Description                          |
|--------|--------------------|--------------------------------------|
| GET    | `/api/reports`     | List all reports (newest first)      |
| POST   | `/api/reports`     | Create a report (multipart/form-data)|
| GET    | `/api/stats`       | Counts: total / open / resolved / byCategory |
| PATCH  | `/api/reports/:id/resolve` | Mark solved (kept) or false (removed). Body: `{ "reason": "solved" \| "false" }` |
| PATCH  | `/api/reports/:id/upvote`  | Increment upvotes (community validation) |
| DELETE | `/api/reports/:id` | Hard delete a report + its image (admin/cleanup) |

POST fields: `title` (required), `desc`, `category` (one of `trash`, `pollution`,
`water`, `green`, `hazard`, `other`), `lat`, `lng`, `image` (file, optional).

Report documents have a `status` field (`open` | `resolved`) and an `upvotes` counter.

## Configuration

Server (`server/.env` or environment variables):

- `MONGODB_URI` — MongoDB connection string (Atlas SRV recommended). **Required.**
- `MONGODB_DB` — database name (default `cleancity`).
- `PORT` — backend port (default `5000`).
- `CORS_ORIGINS` — comma-separated allowed origins (default `http://localhost:5173`).

Frontend (`VITE_API_URL`):

- API base URL (e.g. `https://your-backend.onrender.com`). Leave empty to use
  same-origin (works when the API is served from the same domain as the frontend).

A `.env.example` is provided; copy it to `.env` and fill in `MONGODB_URI`. **Never
commit `.env`** — it is gitignored.

## Deployment

- **Frontend (Vercel):** build `npm run build`, `vercel.json` SPA rewrite included.
- **Backend:** deploy `server/index.js` to Render/Fly/etc. Set `MONGODB_URI`,
  `MONGODB_DB`, and `CORS_ORIGINS` as environment variables, and persist
  `server/uploads`. Set `VITE_API_URL` on the frontend build to the backend URL.

## License

MIT

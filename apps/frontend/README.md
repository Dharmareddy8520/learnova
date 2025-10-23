# Frontend - Local dev

This frontend is a Vite + React app.

Dev server (uses Vite proxy to forward /api to backend):

```bash
cd apps/frontend
npm install
npm run dev
```

By default the Vite dev server proxies `/api` to `http://localhost:3001` (see `vite.config.ts`). Make sure the backend is running on port 3001 (or set `PORT=3001` in `apps/backend/.env`).

Test endpoints with Postman or curl. Example summarize request:

POST http://localhost:3001/api/summarize
Headers: Content-Type: application/json
Body:
{
  "text": "The Moon is Earth's only natural satellite."
}

The frontend service functions call relative `/api/*` routes so the proxy will handle routing during dev.

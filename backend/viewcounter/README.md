# viewcounter

Minimal self-hosted view counter API for the blog. SQLite-backed, no external
dependencies besides Node.

## API

- `GET /api/views/:slug` — returns `{ slug, views }` without incrementing.
- `POST /api/views/:slug` — increments the counter and returns `{ slug, views }`.
- `GET /health` — returns `ok`.

`:slug` must match `[a-zA-Z0-9][a-zA-Z0-9/_-]{0,199}`.

## Deploy (podman compose)

```sh
cd backend/viewcounter
podman compose up -d --build
```

This builds the image, starts the container on port 3001, and persists the
SQLite file in the `viewcounter-data` volume.

Put a reverse proxy (e.g. Caddy/nginx/Traefik) in front with TLS and point a
subdomain (e.g. `views.your-domain.tld`) at port 3001. Then set
`VIEWCOUNTER_API_URL` in `src/consts.ts` on the blog to that URL.

## Config (env vars)

- `PORT` — listen port (default `3001`).
- `DB_PATH` — path to the SQLite file (default `/data/views.db`, matches the
  volume mount in `docker-compose.yml`).
- `ALLOWED_ORIGIN` — the single origin allowed via CORS (default
  `https://uahic.github.io`). Change this if the blog moves to a custom domain.

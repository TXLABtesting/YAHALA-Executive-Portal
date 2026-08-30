# YAHALA Executive Portal

Executive portal for the YAHALA Royal Platinum Membership Network: a merchant
directory, dashboard and admin back office backed by PostgreSQL.

```
server/    Node.js + Express REST API, PostgreSQL access, seed scripts
web/       React + Vite frontend
api/       Serverless entry point, used only when deploying to Vercel
canvas/    Source files for the design canvas (see canvas/README.md)
assets/    Original brand assets and the generated merchant seed (data.js)
data/      Merchant exports the seed was built from
```

## Quickest way to see it running

With Docker installed, one command brings up the portal and its database:

```bash
docker compose up --build     # then open http://localhost:8080
```

The first boot creates the schema and loads the merchant data. Set
`ADMIN_PASSWORD`, `JWT_SECRET` and `PORT` in the environment (or a `.env` file
beside `docker-compose.yml`) to override the defaults.

To run it without Docker, follow the setup below.

## Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer

## Setup

Install once from the repository root — it is an npm workspace, so this covers
both `server/` and `web/`:

```bash
npm install
```

```bash
# 1. Database
createdb yahala
psql -c "CREATE ROLE yahala LOGIN PASSWORD 'yahala_dev'" -c "ALTER DATABASE yahala OWNER TO yahala"

# 2. API
cd server
cp .env.example .env          # then edit DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD
npm run migrate               # create the tables
npm run seed                  # load merchants and dashboard defaults
```

`npm run seed` refuses to overwrite a database that already holds merchants;
pass `--force` when you really want to replace them.

## Running

Development — two processes, with the Vite dev server proxying `/api` and
`/uploads` to the API:

```bash
cd server && npm run dev      # http://localhost:4000
cd web    && npm run dev      # http://localhost:5173  ← open this one
```

Production — build the frontend once; the API then serves it from the same
origin, so only one process runs:

```bash
cd web    && npm run build
cd server && npm start        # http://localhost:4000 serves API + app
```

## Signing in

The portal has two ways in, matching the original design:

- **Enter Executive Dashboard** — no password. Read-only session; the Admin
  Portal is hidden and every write is rejected by the API.
- **Administrator Access** — username and password. Full read/write.

The seeded credentials come from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in
`server/.env` (`admin` / `admin123` by default — **change this before
deploying**). To change it later:

```bash
cd server && node scripts/set-password.js "a new password"
```

Passwords are stored as bcrypt hashes. The session is a signed JWT in an
httpOnly, SameSite=Lax cookie that expires after 12 hours.

## Data model

| Table            | Holds                                                      |
| ---------------- | ---------------------------------------------------------- |
| `merchants`      | Live and archived merchants (`archived` flag), offers, logo |
| `kpi`            | The six dashboard KPI values (single row)                   |
| `spotlight`      | Auto-rotate flag and the pinned merchant (single row)       |
| `spotlight_pool` | Merchants eligible for the dashboard hero, in order         |
| `newsletters`    | Marketing newsletters, cover image and PDF                  |
| `launches`       | Upcoming launch pipeline and its stage                      |
| `updates`        | The Recent Updates feed                                     |
| `redeemers`      | Top redeemers leaderboard                                   |
| `accommodation`  | Accommodation request total (single row)                    |
| `settings`       | Small key/value settings, currently the dashboard layout    |
| `credentials`    | Administrator username and bcrypt password hash             |
| `files`          | Uploaded logos, covers and PDFs, keyed by content hash       |

Marking a merchant **Inactive** moves it to the archive; giving an archived
merchant any other status restores it to the live list. `kpi.merchants` is kept
in step with the live merchant count on every merchant write.

## API

All routes live under `/api`. Every route except `/api/health` and
`/api/auth/*` needs a session; the ones that change data need an administrator
session.

| Method             | Path                    | Access |
| ------------------ | ----------------------- | ------ |
| `GET`              | `/api/health`           | public |
| `POST`             | `/api/auth/viewer`      | public |
| `POST`             | `/api/auth/login`       | public |
| `POST`             | `/api/auth/logout`      | public |
| `GET`              | `/api/auth/session`     | public |
| `GET`              | `/api/bootstrap`        | signed in |
| `GET`              | `/api/merchants?archived=` | signed in |
| `POST/PUT/DELETE`  | `/api/merchants[/:id]`  | admin |
| `GET`              | `/api/newsletters`, `/api/launches`, `/api/updates`, `/api/redeemers` | signed in |
| `POST/PUT/DELETE`  | the same collections    | admin |
| `GET`              | `/api/kpis`, `/api/spotlight`, `/api/accommodation`, `/api/settings` | signed in |
| `PUT`              | the same resources      | admin |
| `POST`             | `/api/uploads`          | admin |

`GET /api/bootstrap` returns everything the portal renders in one response, so
a page load is a single round trip.

### Uploads

Logos, newsletter covers and PDFs are posted as base64 `data:` URIs and stored
in the `files` table, keyed by the hash of their contents. The row keeps the
resulting `/uploads/<hash>.<ext>` URL, which `GET /uploads/:name` serves back
from the database behind the same session check as the rest of the portal.
Files are capped at 8 MB.

Keeping files in the database means the portal needs no persistent volume and a
restart or redeploy never loses an upload. Because names are content hashes,
uploading the same image twice stores it once. Replacing a logo leaves the old
row behind; there is no automatic cleanup, which is fine at this volume.

## Deploying

The portal is one container plus a PostgreSQL database. `render.yaml` deploys
it on Render's free tier against a Supabase database; the same image runs
unchanged on Railway, Fly.io or any Docker host.

### 1. Create the database on Supabase

1. Create a project at supabase.com and choose a strong database password.
2. Open **Connect** (top of the project dashboard) and copy the URI under
   **Connection pooling** — its host looks like
   `aws-0-<region>.pooler.supabase.com`. Do **not** use the direct
   `db.<ref>.supabase.co` host: it resolves to IPv6 only, which most hosts,
   Render included, cannot reach.
3. Put your database password into the URI in place of `[YOUR-PASSWORD]` and
   make sure it ends with `?sslmode=require`.

Check the string before deploying anything:

```bash
cd server
DATABASE_URL="postgresql://…pooler.supabase.com:5432/postgres?sslmode=require" npm run db:check
```

It prints the server version and what the database already holds, or an
explanation of why the connection failed.

The app talks to Supabase over the PostgreSQL protocol as the database owner,
not through Supabase's REST API, so row-level security policies and the
anon/service API keys play no part — leave the API keys unused and unshared.

### 2. Deploy on Render

Connect the repository at dashboard.render.com/blueprints. Render reads
`render.yaml` and asks for the two values it does not generate:

- `DATABASE_URL` — the Supabase URI from step 1.
- `ADMIN_PASSWORD` — the administrator sign-in password.

On its first boot the container creates the schema and loads the merchant data,
then serves the portal. Later deploys skip seeding because the database already
holds merchants.

A free Render service sleeps after 15 minutes without traffic and takes about a
minute to wake up; a paid instance stays awake. Free Supabase projects pause
after a week of no activity and are resumed from the dashboard.

### 3. Point a domain at it

Add the domain under the service's **Settings → Custom Domains** in Render and
create the DNS record it shows. TLS is issued automatically.

### Deploying to Vercel instead

Vercel can host the portal too: it serves the built frontend from its CDN and
runs `api/index.js`, which is the same Express app as a serverless function.
`vercel.json` already routes `/api/*` and `/uploads/*` there. Import the
repository at vercel.com/new and set `DATABASE_URL`, `JWT_SECRET` and
`ADMIN_PASSWORD` as environment variables.

Two differences from the container deployments:

- **Create the schema yourself.** There is no boot step to run migrations, so
  run them once from your machine against the same database before the first
  visit:

  ```bash
  cd server
  DATABASE_URL="…?sslmode=require" npm run migrate
  DATABASE_URL="…?sslmode=require" npm run seed
  ```

- **Uploads are capped at 3 MB** rather than 8, because a Vercel function may
  not receive a request body larger than 4.5 MB and base64 adds a third. The
  limit follows `MAX_UPLOAD_MB` if you set it.

Use Supabase's **transaction pooler** (port 6543) on Vercel: serverless
instances open many short-lived connections, which is exactly what that pooler
is for. Each instance keeps a single connection.

Managed PostgreSQL requires TLS; the pool enables it automatically when
`DATABASE_URL` carries `sslmode=require` (or when `PGSSL=true` is set).

- Set a long random `JWT_SECRET`; the default is for development only.
- Run behind TLS — the session cookie sets `secure` when `NODE_ENV=production`.
- `CORS_ORIGIN` only matters when the frontend is served from another origin;
  the single-process production setup above does not need it.

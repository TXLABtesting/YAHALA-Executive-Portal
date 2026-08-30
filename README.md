# YAHALA Executive Portal

Executive portal for the YAHALA Royal Platinum Membership Network: a merchant
directory, dashboard and admin back office backed by PostgreSQL.

```
server/    Node.js + Express REST API, PostgreSQL access, seed scripts
web/       React + Vite frontend
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

```bash
# 1. Database
createdb yahala
psql -c "CREATE ROLE yahala LOGIN PASSWORD 'yahala_dev'" -c "ALTER DATABASE yahala OWNER TO yahala"

# 2. API
cd server
cp .env.example .env          # then edit DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD
npm install
npm run migrate               # create the tables
npm run seed                  # load merchants and dashboard defaults

# 3. Frontend
cd ../web
npm install
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

Logos, newsletter covers and PDFs are posted as base64 `data:` URIs; the server
writes them to `server/uploads/` under a content hash and stores the resulting
`/uploads/<hash>.<ext>` URL on the row. Files are capped at 8 MB. Point a
volume at `server/uploads/` (or swap `src/uploads.js` for object storage) when
deploying.

## Notes for deployment

- Set a long random `JWT_SECRET`; the default is for development only.
- Run behind TLS — the session cookie sets `secure` when `NODE_ENV=production`.
- `CORS_ORIGIN` only matters when the frontend is served from another origin;
  the single-process production setup above does not need it.

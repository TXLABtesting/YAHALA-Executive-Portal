-- YAHALA Executive Portal — PostgreSQL schema.
-- Singleton tables (kpi, spotlight, accommodation) are pinned to id = 1 so the
-- dashboard always reads one well-defined row.

CREATE TABLE IF NOT EXISTS credentials (
  id            serial PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'admin',
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchants (
  id           serial PRIMARY KEY,
  name         text NOT NULL,
  category     text NOT NULL DEFAULT 'Fashion & Retail',
  sub          text NOT NULL DEFAULT '',
  offer_type   text NOT NULL DEFAULT '',
  offer_desc   text NOT NULL DEFAULT '',
  offers       integer NOT NULL DEFAULT 1,
  offer_source text NOT NULL DEFAULT 'YAHALA Exclusive',
  status       text NOT NULL DEFAULT 'Live',
  city         text NOT NULL DEFAULT '',
  logo         text,
  reason       text NOT NULL DEFAULT '',
  expiry_label text NOT NULL DEFAULT '',
  archived     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS merchants_archived_category_idx ON merchants (archived, category);
CREATE INDEX IF NOT EXISTS merchants_name_idx ON merchants (lower(name));

CREATE TABLE IF NOT EXISTS kpi (
  id          integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  merchants   integer NOT NULL DEFAULT 0,
  offers      integer NOT NULL DEFAULT 0,
  categories  integer NOT NULL DEFAULT 6,
  active      integer NOT NULL DEFAULT 0,
  new_users   integer NOT NULL DEFAULT 0,
  redemptions integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS spotlight (
  id          integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pinned_id   integer REFERENCES merchants (id) ON DELETE SET NULL,
  auto_rotate boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS spotlight_pool (
  merchant_id integer PRIMARY KEY REFERENCES merchants (id) ON DELETE CASCADE,
  position    integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS newsletters (
  id          serial PRIMARY KEY,
  title       text NOT NULL,
  issue_date  date,
  description text NOT NULL DEFAULT '',
  thumb       text,
  pdf         text,
  pdf_name    text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS launches (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  category      text NOT NULL DEFAULT 'Fashion & Retail',
  expected_date date,
  stage         text NOT NULL DEFAULT 'Negotiation',
  position      integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS updates (
  id         serial PRIMARY KEY,
  type       text NOT NULL DEFAULT 'update',
  title      text NOT NULL,
  detail     text NOT NULL DEFAULT '',
  time_label text NOT NULL DEFAULT '',
  position   integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS redeemers (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  redemptions integer NOT NULL DEFAULT 0,
  position    integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS accommodation (
  id        integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total     integer NOT NULL DEFAULT 0,
  from_date date,
  to_date   date
);

CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO kpi (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO spotlight (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO accommodation (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('layout', 'A') ON CONFLICT (key) DO NOTHING;

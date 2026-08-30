import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import {
  UPDATE_META,
  fmtDate,
  fmtNum,
  initials,
  stageBar,
  stageColor,
  stagePct,
} from '../lib/format.js';
import { KPI_FIELDS } from './dashboard/Kpis.jsx';
import { RowAvatar, SectionHead, SegGroup, SourceBadge, StatusPill } from './common.jsx';

const MERCHANT_LIMIT = 60;
const ARCHIVE_LIMIT = 80;

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'YAHALA Exclusive', label: 'YAHALA Exclusive' },
  { value: 'Entertainer', label: 'Entertainer' },
];

const NEW_MERCHANT = {
  name: '',
  category: 'Fashion & Retail',
  sub: '',
  offerType: '',
  offerDesc: '',
  offers: 1,
  status: 'Live',
  offerSource: 'YAHALA Exclusive',
  logo: null,
  city: '',
};

const NEW_ARCHIVED = { ...NEW_MERCHANT, status: 'Inactive', reason: 'Inactive', expiryLabel: '' };

export default function Admin({
  data,
  openEdit,
  removeItem,
  saveKpis,
  saveSpotlight,
  saveAccommodation,
}) {
  const [tab, setTab] = useState('merchants');

  const TABS = [
    { id: 'merchants', label: 'Merchants' },
    { id: 'dashboard', label: 'Dashboard & Spotlight' },
    { id: 'launches', label: 'Upcoming Launches' },
    { id: 'newsletters', label: 'Newsletters' },
    { id: 'redeemers', label: 'Redeemers & Requests' },
    { id: 'updates', label: 'Recent Updates' },
    { id: 'archive', label: `Archive (${data.archive.length})` },
  ];

  return (
    <main className="page" style={{ animation: 'fadeUp .4s both' }}>
      <div className="admin-head">
        <div className="admin-eyebrow">Administration</div>
        <h1 className="admin-title">Portal Management</h1>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'merchants' && <MerchantsTab data={data} openEdit={openEdit} removeItem={removeItem} />}
      {tab === 'dashboard' && (
        <DashboardTab data={data} saveKpis={saveKpis} saveSpotlight={saveSpotlight} />
      )}
      {tab === 'launches' && <LaunchesTab data={data} openEdit={openEdit} removeItem={removeItem} />}
      {tab === 'newsletters' && (
        <NewslettersTab data={data} openEdit={openEdit} removeItem={removeItem} />
      )}
      {tab === 'redeemers' && (
        <RedeemersTab data={data} openEdit={openEdit} removeItem={removeItem} save={saveAccommodation} />
      )}
      {tab === 'updates' && <UpdatesTab data={data} openEdit={openEdit} removeItem={removeItem} />}
      {tab === 'archive' && <ArchiveTab data={data} openEdit={openEdit} removeItem={removeItem} />}
    </main>
  );
}

/* ------------------------------------------------------------ merchants -- */

function MerchantsTab({ data, openEdit, removeItem }) {
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.merchants.filter(
      (m) =>
        (source === 'all' || m.offerSource === source) &&
        (!q || `${m.name} ${m.category} ${m.sub}`.toLowerCase().includes(q)),
    );
  }, [data.merchants, search, source]);

  const shown = matches.slice(0, MERCHANT_LIMIT);

  return (
    <div>
      <div className="toolbar">
        <div className="field-search">
          <span className="search-icon">
            <Icon name="search" size={16} stroke={1.9} />
          </span>
          <input
            className="input-light"
            value={search}
            placeholder="Search merchants…"
            aria-label="Search merchants"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="btn-primary" onClick={() => openEdit('merchant', null, NEW_MERCHANT)}>
          <Icon name="plus" size={16} stroke={2} /> Add Merchant
        </button>
      </div>

      <div className="filter-row">
        <span>OFFER SOURCE</span>
        <SegGroup options={SOURCE_OPTIONS} value={source} onChange={setSource} />
      </div>

      <div className="result-note">
        Showing {shown.length} of {matches.length} merchants
      </div>

      <div className="grid-rows">
        {shown.map((m) => (
          <div key={m.id} className="row-card">
            <RowAvatar merchant={m} />
            <div className="flex-1">
              <div className="row-name">{m.name}</div>
              <div className="row-meta">
                {m.category} · {m.offerType}
                {m.city ? ` · ${m.city}` : ''}
              </div>
            </div>
            <SourceBadge source={m.offerSource} compact />
            <StatusPill status={m.status} />
            <button
              type="button"
              className="icon-btn"
              title="Edit"
              onClick={() => openEdit('merchant', m)}
            >
              <Icon name="edit" size={15} stroke={1.7} />
            </button>
            <button
              type="button"
              className="icon-btn is-danger"
              title="Delete"
              onClick={() => {
                if (window.confirm(`Delete ${m.name}?`)) {
                  removeItem('merchants', m.id, 'Merchant deleted.');
                }
              }}
            >
              <Icon name="trash" size={15} stroke={1.7} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------- dashboard & spotlight -- */

function DashboardTab({ data, saveKpis, saveSpotlight }) {
  const [kpis, setKpis] = useState(data.kpis);
  const [poolSearch, setPoolSearch] = useState('');

  useEffect(() => setKpis(data.kpis), [data.kpis]);

  const byId = useMemo(() => new Map(data.merchants.map((m) => [m.id, m])), [data.merchants]);
  const pool = (data.spotlight.pool || []).map((id) => byId.get(id)).filter(Boolean);

  const poolResults = useMemo(() => {
    const q = poolSearch.trim().toLowerCase();
    if (!q) return [];
    const inPool = new Set(data.spotlight.pool || []);
    return data.merchants
      .filter((m) => !inPool.has(m.id) && `${m.name} ${m.category}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [data.merchants, data.spotlight.pool, poolSearch]);

  return (
    <div className="grid-split">
      <div className="panel">
        <h3 className="section-title">KPI Values</h3>
        <p className="panel-note">Edits are saved when you leave the field.</p>
        <div className="field-grid-2">
          {KPI_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="field-label" htmlFor={`kpi-${f.key}`}>
                {f.label}
              </label>
              <input
                id={`kpi-${f.key}`}
                className="field-input"
                type="number"
                value={kpis[f.key]}
                onChange={(e) => setKpis((k) => ({ ...k, [f.key]: e.target.value }))}
                onBlur={() => saveKpis(kpis)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3 className="section-title">Featured Spotlight</h3>
        <p className="panel-note">
          A rotating spotlight of active merchants shown in the dashboard hero.
        </p>

        <div className="toggle-row">
          <div>
            <div className="toggle-row-title">Automatic Rotation</div>
            <div className="toggle-row-note">Cycle spotlight every few seconds</div>
          </div>
          <button
            type="button"
            className={`toggle${data.spotlight.autoRotate ? ' is-on' : ''}`}
            aria-pressed={data.spotlight.autoRotate}
            aria-label="Automatic rotation"
            onClick={() => saveSpotlight({ autoRotate: !data.spotlight.autoRotate })}
          >
            <span />
          </button>
        </div>

        <label className="field-label" htmlFor="spot-pin">
          Pin a merchant (overrides rotation)
        </label>
        <select
          id="spot-pin"
          className="field-input"
          style={{ marginBottom: 18 }}
          value={data.spotlight.pinnedId ?? ''}
          onChange={(e) => saveSpotlight({ pinnedId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">No pin — auto rotate</option>
          {pool.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <label className="field-label">Eligible merchants ({pool.length})</label>
        <div className="pool-chips">
          {pool.length === 0 && (
            <span className="pool-empty">No merchants selected — search below to add.</span>
          )}
          {pool.map((m) => (
            <span key={m.id} className="pool-chip">
              {m.name}
              <button
                type="button"
                aria-label={`Remove ${m.name}`}
                onClick={() =>
                  saveSpotlight({
                    pool: data.spotlight.pool.filter((id) => id !== m.id),
                    pinnedId: data.spotlight.pinnedId === m.id ? null : data.spotlight.pinnedId,
                  })
                }
              >
                <Icon name="x" size={12} stroke={2.2} />
              </button>
            </span>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <span className="search-icon" style={{ color: 'var(--ink3)' }}>
            <Icon name="search" size={16} stroke={1.9} />
          </span>
          <input
            className="field-input"
            style={{ paddingLeft: 38 }}
            value={poolSearch}
            placeholder="Search merchants to add…"
            aria-label="Search merchants to add to the spotlight"
            onChange={(e) => setPoolSearch(e.target.value)}
          />
        </div>

        {poolResults.length > 0 && (
          <div className="pool-results">
            {poolResults.map((m) => (
              <button
                key={m.id}
                type="button"
                className="pool-result"
                onClick={() => {
                  saveSpotlight({ pool: [...(data.spotlight.pool || []), m.id] });
                  setPoolSearch('');
                }}
              >
                <span className="avatar-sm" style={{ width: 34, height: 34, fontSize: 12 }}>
                  {initials(m.name)}
                </span>
                <span className="flex-1">
                  <span className="search-result-name">{m.name}</span>
                  <span className="search-result-meta">{m.category}</span>
                </span>
                <span style={{ color: 'var(--gold)', display: 'inline-flex' }}>
                  <Icon name="plus" size={16} stroke={2} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- launches -- */

function LaunchesTab({ data, openEdit, removeItem }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            openEdit('launch', null, { name: '', category: 'Fashion & Retail', date: '', stage: 'Negotiation' })
          }
        >
          <Icon name="plus" size={16} stroke={2} /> Add Launch
        </button>
      </div>

      <div className="grid-rows gap-14">
        {data.launches.map((l) => (
          <div key={l.id} className="row-card" style={{ display: 'block', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
              <span className="launch-mark size-42">{initials(l.name)}</span>
              <div className="flex-1">
                <div className="row-name">{l.name}</div>
                <div className="row-meta">
                  {l.category} · {fmtDate(l.date)}
                </div>
              </div>
              <button type="button" className="icon-btn sm" onClick={() => openEdit('launch', l)}>
                <Icon name="edit" size={15} stroke={1.7} />
              </button>
              <button
                type="button"
                className="icon-btn sm is-danger"
                onClick={() => {
                  if (window.confirm(`Remove ${l.name} from the pipeline?`)) {
                    removeItem('launches', l.id, 'Launch removed.');
                  }
                }}
              >
                <Icon name="trash" size={15} stroke={1.7} />
              </button>
            </div>
            <div className="launch-progress-row" style={{ marginBottom: 6 }}>
              <span className="launch-stage" style={{ color: stageColor(l.stage), fontSize: 12 }}>
                {l.stage}
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink2)' }}>{stagePct(l.stage)}%</span>
            </div>
            <div className="progress slim">
              <div style={{ width: `${stagePct(l.stage)}%`, background: stageBar(l.stage) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- newsletters -- */

function NewslettersTab({ data, openEdit, removeItem }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            openEdit('newsletter', null, { title: '', date: '', desc: '', thumb: null, pdf: null, pdfName: '' })
          }
        >
          <Icon name="plus" size={16} stroke={2} /> Add Newsletter
        </button>
      </div>

      <div className="grid-rows gap-14" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        {data.newsletters.map((n) => (
          <div key={n.id} className="row-card" style={{ gap: 14 }}>
            <span className="news-thumb-sm">
              <Icon name="newspaper" size={22} stroke={1.5} />
              {n.thumb && <img src={n.thumb} alt="" />}
            </span>
            <div className="flex-1">
              <div className="row-name">{n.title}</div>
              <div className="row-meta">
                {fmtDate(n.date)} · {n.pdf ? 'PDF attached' : n.thumb ? 'Cover only' : 'No file'}
              </div>
            </div>
            <button type="button" className="icon-btn sm" onClick={() => openEdit('newsletter', n)}>
              <Icon name="edit" size={15} stroke={1.7} />
            </button>
            <button
              type="button"
              className="icon-btn sm is-danger"
              onClick={() => {
                if (window.confirm(`Delete "${n.title}"?`)) {
                  removeItem('newsletters', n.id, 'Newsletter deleted.');
                }
              }}
            >
              <Icon name="trash" size={15} stroke={1.7} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------ redeemers & requests -- */

function RedeemersTab({ data, openEdit, removeItem, save }) {
  const [total, setTotal] = useState(data.accommodation.total);

  useEffect(() => setTotal(data.accommodation.total), [data.accommodation.total]);

  return (
    <div className="grid-split">
      <div className="panel">
        <div className="panel-head">
          <h3 className="section-title">Top Redeemers</h3>
          <button
            type="button"
            className="btn-primary sm"
            onClick={() => openEdit('redeemer', null, { name: '', redemptions: 0 })}
          >
            <Icon name="plus" size={15} stroke={2} /> Add
          </button>
        </div>
        <p className="panel-note">
          Manually maintained. Ranking updates automatically by redemptions.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {data.redeemers.map((r) => (
            <div key={r.id} className="red-row">
              <span className="avatar-sm" style={{ borderRadius: 10 }}>
                {initials(r.name)}
              </span>
              <div className="flex-1">
                <div className="row-name" style={{ fontSize: '13.5px' }}>
                  {r.name}
                </div>
                <div className="row-meta" style={{ marginTop: 0 }}>
                  {fmtNum(r.redemptions)} redemptions
                </div>
              </div>
              <button type="button" className="icon-btn sm" onClick={() => openEdit('redeemer', r)}>
                <Icon name="edit" size={15} stroke={1.7} />
              </button>
              <button
                type="button"
                className="icon-btn sm is-danger"
                onClick={() => {
                  if (window.confirm(`Delete ${r.name}?`)) {
                    removeItem('redeemers', r.id, 'Redeemer deleted.');
                  }
                }}
              >
                <Icon name="trash" size={15} stroke={1.7} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3 className="section-title">Accommodation Requests</h3>
        <p className="panel-note">Inserted manually. Total shown on the dashboard.</p>
        <div>
          <label className="field-label" htmlFor="acc-total">
            Total Requests
          </label>
          <input
            id="acc-total"
            className="field-input"
            type="number"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            onBlur={() => save({ total })}
          />
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- updates -- */

function UpdatesTab({ data, openEdit, removeItem }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => openEdit('update', null, { type: 'live', title: '', detail: '', time: 'Just now' })}
        >
          <Icon name="plus" size={16} stroke={2} /> Add Update
        </button>
      </div>

      <div className="updates-card" style={{ maxWidth: 720 }}>
        {data.updates.map((u) => {
          const meta = UPDATE_META[u.type] || UPDATE_META.update;
          return (
            <div key={u.id} className="update-row" style={{ alignItems: 'center' }}>
              <span className="update-icon" style={{ background: meta.bg, color: meta.color }}>
                <Icon name={meta.icon} size={16} stroke={1.7} />
              </span>
              <div className="flex-1">
                <div className="update-title">{u.title}</div>
                <div className="update-detail">
                  {u.detail} · {u.time}
                </div>
              </div>
              <button type="button" className="icon-btn sm" onClick={() => openEdit('update', u)}>
                <Icon name="edit" size={15} stroke={1.7} />
              </button>
              <button
                type="button"
                className="icon-btn sm is-danger"
                onClick={() => {
                  if (window.confirm('Delete this update?')) {
                    removeItem('updates', u.id, 'Update deleted.');
                  }
                }}
              >
                <Icon name="trash" size={15} stroke={1.7} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- archive -- */

function ArchiveTab({ data, openEdit, removeItem }) {
  const [search, setSearch] = useState('');

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.archive.filter(
      (m) => !q || `${m.name} ${m.category} ${m.sub}`.toLowerCase().includes(q),
    );
  }, [data.archive, search]);

  const shown = matches.slice(0, ARCHIVE_LIMIT);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => openEdit('merchant', null, NEW_ARCHIVED)}
        >
          <Icon name="plus" size={16} stroke={2} /> Add Inactive Merchant
        </button>
      </div>

      <p className="panel-note" style={{ maxWidth: 640, margin: '0 0 16px' }}>
        Merchants marked Inactive or Expired in the source list. They are hidden from the live
        dashboard but kept here for reference.
      </p>

      <div className="field-search" style={{ maxWidth: 360, marginBottom: 16 }}>
        <span className="search-icon">
          <Icon name="search" size={16} stroke={1.9} />
        </span>
        <input
          className="input-light"
          value={search}
          placeholder="Search archive…"
          aria-label="Search the archive"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="result-note">
        Showing {shown.length} of {matches.length} inactive merchants
      </div>

      <div className="grid-rows">
        {shown.map((m) => (
          <div key={m.id} className="row-card is-archived">
            <RowAvatar merchant={m} />
            <div className="flex-1">
              <div className="row-name">{m.name}</div>
              <div className="row-meta">
                {m.category} · {m.offerType}
                {m.city ? ` · ${m.city}` : ''}
              </div>
              {(m.reason || m.expiryLabel) && (
                <div className="row-reason">
                  {m.reason}
                  {m.expiryLabel ? ` · expired ${m.expiryLabel}` : ''}
                </div>
              )}
            </div>
            <button
              type="button"
              className="icon-btn"
              title="Edit / Restore to Live"
              onClick={() => openEdit('merchant', m)}
            >
              <Icon name="edit" size={15} stroke={1.7} />
            </button>
            <button
              type="button"
              className="icon-btn is-danger"
              title="Delete"
              onClick={() => {
                if (window.confirm(`Delete ${m.name} from the archive?`)) {
                  removeItem('merchants', m.id, 'Archived merchant deleted.');
                }
              }}
            >
              <Icon name="trash" size={15} stroke={1.7} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Icon } from '../../lib/icons.jsx';
import {
  CATEGORIES,
  CATEGORY_META,
  UPDATE_META,
  fmtDate,
  fmtNum,
  initials,
  stageBar,
  stageColor,
  stagePct,
} from '../../lib/format.js';
import { SectionHead } from '../common.jsx';

/* ------------------------------------------------------------- launches -- */

export function LaunchGrid({ launches }) {
  return (
    <div className="grid-launches">
      {launches.map((l) => (
        <div key={l.id} className="launch-card">
          <div className="launch-head">
            <span className="launch-mark">{initials(l.name)}</span>
            <div className="min-w-0">
              <div className="launch-name">{l.name}</div>
              <div className="launch-meta">{l.category}</div>
            </div>
          </div>
          <div className="launch-progress-row">
            <span className="launch-stage" style={{ color: stageColor(l.stage) }}>
              {l.stage}
            </span>
            <span className="launch-pct">{stagePct(l.stage)}%</span>
          </div>
          <div className="progress">
            <div style={{ width: `${stagePct(l.stage)}%`, background: stageBar(l.stage) }} />
          </div>
          <div className="launch-date">
            <Icon name="calendar" size={14} stroke={1.7} />
            <span>Expected {fmtDate(l.date)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LaunchList({ launches }) {
  return (
    <div className="list-card">
      {launches.map((l) => (
        <div key={l.id} className="launch-row">
          <span className="launch-mark size-40">{initials(l.name)}</span>
          <div className="launch-row-name">
            <div className="launch-name" style={{ fontSize: '13.5px' }}>
              {l.name}
            </div>
            <div className="launch-meta" style={{ fontSize: '11.5px' }}>
              {fmtDate(l.date)}
            </div>
          </div>
          <div className="flex-1">
            <div className="launch-progress-row" style={{ marginBottom: 6 }}>
              <span className="launch-stage" style={{ color: stageColor(l.stage), fontSize: 12 }}>
                {l.stage}
              </span>
              <span className="launch-pct" style={{ fontSize: 12 }}>
                {stagePct(l.stage)}%
              </span>
            </div>
            <div className="progress slim">
              <div style={{ width: `${stagePct(l.stage)}%`, background: stageBar(l.stage) }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- updates -- */

export function UpdatesPanel({ updates, compact = false }) {
  return (
    <div className="updates-card">
      {updates.map((u) => {
        const meta = UPDATE_META[u.type] || UPDATE_META.update;
        return (
          <div
            key={u.id}
            className="update-row"
            style={compact ? { gap: 12, padding: '13px 11px' } : undefined}
          >
            <span
              className="update-icon"
              style={{
                background: meta.bg,
                color: meta.color,
                ...(compact ? { width: 34, height: 34 } : null),
              }}
            >
              <Icon name={meta.icon} size={16} stroke={1.7} />
            </span>
            <div className="flex-1">
              <div className="update-title" style={compact ? { fontSize: 13 } : undefined}>
                {u.title}
              </div>
              <div className="update-detail" style={compact ? { fontSize: '11.5px' } : undefined}>
                {u.detail}
              </div>
            </div>
            <span className="update-time" style={compact ? { fontSize: '10.5px' } : undefined}>
              {u.time}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------- categories -- */

const countByCategory = (merchants) =>
  merchants.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {});

export function CategoryGrid({ merchants, onOpen }) {
  const counts = countByCategory(merchants);
  return (
    <div className="grid-cats">
      {CATEGORIES.map((name) => (
        <div key={name} className="cat-card">
          <div className="cat-card-top">
            <span className="cat-icon">
              <Icon name={CATEGORY_META[name].icon} size={24} stroke={1.6} />
            </span>
            <span className="cat-count">{counts[name] || 0}</span>
          </div>
          <div className="cat-name">{name}</div>
          <div className="cat-tag">{CATEGORY_META[name].tag}</div>
          <button type="button" className="btn-ghost self-start" onClick={() => onOpen(name)}>
            View Merchants <Icon name="arrow" size={15} stroke={2} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function CategoryTiles({ merchants, onOpen }) {
  const counts = countByCategory(merchants);
  return (
    <div className="grid-cats-compact">
      {CATEGORIES.map((name) => (
        <button key={name} type="button" className="cat-tile" onClick={() => onOpen(name)}>
          <span className="cat-icon size-46">
            <Icon name={CATEGORY_META[name].icon} size={22} stroke={1.6} />
          </span>
          <div className="flex-1">
            <div className="cat-tile-name">{name}</div>
            <div className="cat-tile-count">{counts[name] || 0} merchants</div>
          </div>
          <span style={{ color: 'var(--ink3)' }}>
            <Icon name="arrow" size={15} stroke={2} />
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ redeemers -- */

export const rankClass = (i) => (i === 0 ? 'rank is-first' : i < 3 ? 'rank is-top' : 'rank');

function RedeemerRows({ redeemers }) {
  return redeemers.map((r, i) => (
    <div key={r.id ?? r.name} className="red-row">
      <span className={rankClass(i)}>{i + 1}</span>
      <span className="red-name">{r.name}</span>
      <span className="red-value">{fmtNum(r.redemptions)}</span>
    </div>
  ));
}

export function RedeemersBlockA({ redeemers, onViewAll }) {
  const top = redeemers[0];
  return (
    <>
      <SectionHead title="Top Redeemers">
        <button type="button" className="btn-ghost sm" onClick={onViewAll}>
          View All <Icon name="arrow" size={14} stroke={2} />
        </button>
      </SectionHead>
      <div className="grid-redeemers">
        <div className="red-hero">
          <div className="red-hero-head">
            <Icon name="trophy" size={18} stroke={1.7} />
            <span>Highest Redemptions</span>
          </div>
          <div className="red-hero-value">{fmtNum(top?.redemptions)}</div>
          <div className="red-hero-name">by {top?.name || '—'}</div>
        </div>
        <div className="red-list">
          <div className="red-list-title">Top 5 Redeemers</div>
          <RedeemerRows redeemers={redeemers.slice(0, 5)} />
        </div>
      </div>
    </>
  );
}

export function RedeemersBlockB({ redeemers, onViewAll }) {
  const top = redeemers[0];
  return (
    <>
      <SectionHead title="Top Redeemers">
        <button type="button" className="btn-ghost sm" onClick={onViewAll}>
          View All <Icon name="arrow" size={14} stroke={2} />
        </button>
      </SectionHead>
      <div className="table-card">
        <div className="red-banner">
          <span className="red-banner-icon">
            <Icon name="trophy" size={20} stroke={1.7} />
          </span>
          <div className="flex-1" style={{ position: 'relative' }}>
            <div className="red-banner-label">Highest Redemptions</div>
            <div className="red-banner-name">{top?.name || '—'}</div>
          </div>
          <div className="red-banner-value">{fmtNum(top?.redemptions)}</div>
        </div>
        <div style={{ padding: '6px 20px' }}>
          <RedeemerRows redeemers={redeemers.slice(0, 5)} />
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------- accommodation -- */

export function AccommodationCard({ total }) {
  return (
    <div className="acc-card">
      <span className="acc-icon">
        <Icon name="bed" size={22} stroke={1.7} />
      </span>
      <div className="acc-value">{fmtNum(total)}</div>
      <div className="acc-label">Total Requests</div>
      <div className="acc-note">Requests &amp; inquiries handled by the team</div>
    </div>
  );
}

/* ---------------------------------------------------------- newsletters -- */

export function NewslettersGrid({ newsletters }) {
  return (
    <div className="grid-news">
      {newsletters.map((n) => {
        const file = n.pdf || n.thumb;
        const fileName =
          (n.title || 'newsletter').replace(/[^a-z0-9]+/gi, '-').toLowerCase() +
          (n.pdf ? '.pdf' : n.thumb ? '.jpg' : '');
        return (
          <div key={n.id} className="news-card">
            <div className="news-cover">
              <Icon name="newspaper" size={34} stroke={1.4} />
              {n.thumb && <img src={n.thumb} alt="" />}
            </div>
            <div className="news-body">
              <div className="news-date">{fmtDate(n.date)}</div>
              <div className="news-title">{n.title}</div>
              <p className="news-desc">{n.desc}</p>
              <div className="news-actions">
                <button
                  type="button"
                  className="btn-soft"
                  disabled={!file}
                  onClick={() => file && window.open(file, '_blank', 'noopener')}
                >
                  <Icon name="eye" size={15} stroke={1.7} /> Preview
                </button>
                <a
                  className={`btn-navy${file ? '' : ' is-disabled'}`}
                  href={file || '#'}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="download" size={15} stroke={1.7} /> Download
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

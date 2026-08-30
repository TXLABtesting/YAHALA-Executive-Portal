import { Icon } from '../../lib/icons.jsx';
import { fmtNum } from '../../lib/format.js';

const KPI_DEFS = [
  { key: 'merchants', label: 'Total Merchants', icon: 'store' },
  { key: 'offers', label: 'Total Offers', icon: 'tag' },
  { key: 'categories', label: 'Categories', icon: 'grid' },
  { key: 'active', label: 'Active Users', icon: 'users' },
  { key: 'newUsers', label: 'New Users', icon: 'sparkles' },
  { key: 'redemptions', label: 'Total Redemptions', icon: 'trending', gold: true },
];

const CLICKABLE = new Set(['merchants', 'offers', 'categories']);

export const KPI_FIELDS = KPI_DEFS.map(({ key, label }) => ({ key, label }));

/** Share of the network coming from each offer source, shown under Total Merchants. */
function sourceSplit(merchants) {
  const yahala = merchants.filter((m) => m.offerSource !== 'Entertainer').length;
  const entertainer = merchants.length - yahala;
  const yahalaPct = merchants.length ? Math.round((yahala / merchants.length) * 100) : 0;
  return { yahala, entertainer, yahalaPct };
}

export function KpiGrid({ kpis, merchants, onKpiClick }) {
  const split = sourceSplit(merchants);

  return (
    <div className="grid-kpi">
      {KPI_DEFS.map((def) => {
        const clickable = CLICKABLE.has(def.key);
        return (
          <button
            key={def.key}
            type="button"
            className={`kpi-card${def.gold ? ' is-gold' : ''}${clickable ? ' is-clickable' : ''}`}
            onClick={clickable ? () => onKpiClick(def.key) : undefined}
            aria-label={clickable ? `${def.label} — open details` : undefined}
          >
            <div className="kpi-card-top">
              <span className="kpi-icon">
                <Icon name={def.icon} size={20} stroke={1.6} />
              </span>
              {def.gold && <span className="kpi-key">Key</span>}
            </div>
            <div className="kpi-value">{fmtNum(kpis[def.key])}</div>
            <div className="kpi-label">{def.label}</div>

            {def.key === 'merchants' && (
              <div className="kpi-split">
                <div className="kpi-split-bar">
                  <div style={{ width: `${split.yahalaPct}%`, background: '#5B82DC' }} />
                  <div style={{ width: `${100 - split.yahalaPct}%`, background: 'var(--gold)' }} />
                </div>
                <div className="kpi-split-legend">
                  <span>
                    <span className="dot-6" style={{ background: '#5B82DC' }} />
                    {fmtNum(split.yahala)} YAHALA
                  </span>
                  <span>
                    <span className="dot-6" style={{ background: 'var(--gold)' }} />
                    {fmtNum(split.entertainer)} Entertainer
                  </span>
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function KpiRail({ kpis, onKpiClick }) {
  return (
    <div className="rail-card">
      <div className="rail-head">
        <i />
        <span>Network Metrics</span>
      </div>
      <div className="rail-grid">
        {KPI_DEFS.map((def) => {
          const clickable = CLICKABLE.has(def.key);
          return (
            <button
              key={def.key}
              type="button"
              className={`rail-kpi${def.gold ? ' is-gold' : ''}${clickable ? ' is-clickable' : ''}`}
              onClick={clickable ? () => onKpiClick(def.key) : undefined}
            >
              <span className="rail-kpi-icon">
                <Icon name={def.icon} size={20} stroke={1.6} />
              </span>
              <div className="rail-kpi-value">{fmtNum(kpis[def.key])}</div>
              <div className="rail-kpi-label">{def.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

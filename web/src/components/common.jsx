import { useEffect } from 'react';
import { Icon } from '../lib/icons.jsx';
import { initials, sourceMeta } from '../lib/format.js';

/** Merchant logo if one is uploaded, monogram otherwise. */
export function MerchantMark({ merchant, className = '' }) {
  return (
    <span className={`merchant-mark ${className}`.trim()}>
      {merchant.logo && <img src={merchant.logo} alt="" />}
      {!merchant.logo && initials(merchant.name)}
    </span>
  );
}

export function RowAvatar({ merchant }) {
  return (
    <span className="row-avatar">
      {merchant.logo && <img src={merchant.logo} alt="" />}
      {!merchant.logo && initials(merchant.name)}
    </span>
  );
}

export function SourceBadge({ source, onDark = false, compact = false }) {
  const meta = sourceMeta(source);
  const classes = [
    'source-badge',
    meta.entertainer ? 'is-entertainer' : '',
    onDark ? 'on-dark' : '',
    compact ? 'is-compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Dense list rows only have room for the source name, not the full label.
  const label = compact ? (meta.entertainer ? 'Entertainer' : 'YAHALA') : meta.label;

  return (
    <span className={classes} title={meta.label}>
      <span className="dot-6" style={{ background: meta.dot, width: 7, height: 7 }} />
      {label}
    </span>
  );
}

export function StatusPill({ status }) {
  return (
    <span className={`status-pill${status === 'Live' ? ' is-live' : ''}`}>{status}</span>
  );
}

export function SectionHead({ title, note, children, id }) {
  return (
    <div className="section-head" id={id}>
      <h3 className="section-title">{title}</h3>
      {note && <span className="section-note">{note}</span>}
      {children}
    </div>
  );
}

export function SegGroup({ options, value, onChange, light = false, boxed = false }) {
  const groupClass = light ? `seg-light-group${boxed ? ' boxed' : ''}` : 'seg-group';
  const itemClass = light ? 'seg-light' : 'seg';

  return (
    <div className={groupClass}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`${itemClass}${value === opt.value ? ' is-active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function DrawerHead({ icon, iconGold, title, sub, onClose, children }) {
  return (
    <div className="drawer-head">
      <div className="drawer-head-row">
        <div className="drawer-head-title">
          <span className={`drawer-icon${iconGold ? ' is-gold' : ''}`}>{icon}</span>
          <div>
            <h2 className="drawer-title">{title}</h2>
            {sub && <div className="drawer-sub">{sub}</div>}
          </div>
        </div>
        <button type="button" className="btn-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={17} stroke={2} />
        </button>
      </div>
      {children}
    </div>
  );
}

/** Closes on backdrop click and on Escape; content clicks never bubble out. */
export function Overlay({ variant = '', onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={`overlay ${variant}`.trim()} role="presentation" onClick={onClose}>
      <div className="contents" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

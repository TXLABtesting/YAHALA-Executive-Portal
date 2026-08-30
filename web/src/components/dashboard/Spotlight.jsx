import { Icon } from '../../lib/icons.jsx';
import { initials } from '../../lib/format.js';
import { SourceBadge } from '../common.jsx';

function LogoTile({ merchant, size }) {
  return (
    <div className={`logo-tile size-${size}`}>
      {merchant.logo && <img src={merchant.logo} alt="" />}
      {!merchant.logo && <span className="logo-tile-initials">{initials(merchant.name)}</span>}
    </div>
  );
}

function Dots({ pool, activeIndex, onSelect, className = '' }) {
  if (pool.length < 2) return null;
  return (
    <div className={`spot-dots ${className}`.trim()}>
      {pool.map((m, i) => (
        <button
          key={m.id}
          type="button"
          className={`spot-dot${i === activeIndex ? ' is-active' : ''}`}
          aria-label={`Show ${m.name}`}
          onClick={() => onSelect(i)}
        />
      ))}
    </div>
  );
}

export function SpotlightHero({ merchant, pool, activeIndex, pinned, onSelect }) {
  return (
    <div className="spotlight">
      <div className="spotlight-inner">
        <div className="spotlight-body">
          <div className="badge-row">
            <div className="badge-featured">
              <Icon name="crown" size={13} stroke={1.8} /> Featured Merchant
            </div>
            <SourceBadge source={merchant.offerSource} onDark />
          </div>

          <h2 className="spotlight-name">{merchant.name}</h2>

          <div className="chip-row">
            <span className="chip-dark">{merchant.category}</span>
            {merchant.sub && <span className="chip-dark">{merchant.sub}</span>}
          </div>

          <p className="spotlight-desc">{merchant.offerDesc}</p>

          <div className="spotlight-foot">
            <div>
              <div className="label-dark">Featured Offer</div>
              <div className="spotlight-offer">{merchant.offerType || 'Exclusive Offer'}</div>
            </div>
            {!pinned && (
              <Dots pool={pool} activeIndex={activeIndex} onSelect={onSelect} className="push" />
            )}
          </div>
        </div>

        <div className="spotlight-art">
          <LogoTile merchant={merchant} size={190} />
        </div>
      </div>
    </div>
  );
}

export function SpotlightCompact({ merchant, pool, activeIndex, pinned, onSelect }) {
  return (
    <div className="spotlight-b">
      <div className="spotlight-b-row">
        <LogoTile merchant={merchant} size={120} />
        <div className="flex-1" style={{ minWidth: 220 }}>
          <div className="badge-row">
            <div className="badge-featured is-compact">
              <Icon name="crown" size={12} stroke={1.8} /> Featured
            </div>
            <SourceBadge source={merchant.offerSource} onDark />
          </div>
          <h2 className="spotlight-b-name">{merchant.name}</h2>
          <p className="spotlight-b-desc">{merchant.offerDesc}</p>
        </div>
      </div>

      <div className="spotlight-b-foot">
        <div className="stat-dark">
          <div className="stat-dark-label">Featured Offer</div>
          <div className="stat-dark-value is-gold">{merchant.offerType || 'Exclusive Offer'}</div>
        </div>
        <div className="stat-dark">
          <div className="stat-dark-label">Category</div>
          <div className="stat-dark-value">{merchant.category}</div>
        </div>
        {!pinned && <Dots pool={pool} activeIndex={activeIndex} onSelect={onSelect} />}
      </div>
    </div>
  );
}

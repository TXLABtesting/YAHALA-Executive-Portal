import { useMemo } from 'react';
import { Icon } from '../lib/icons.jsx';
import { CATEGORY_META, shareLinks } from '../lib/format.js';
import { DrawerHead, MerchantMark, Overlay, SegGroup, SourceBadge, StatusPill } from './common.jsx';

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'YAHALA Exclusive', label: 'YAHALA Exclusive' },
  { value: 'Entertainer', label: 'Entertainer' },
];

export default function CategoryDrawer({
  category,
  setCategory,
  merchants,
  shareId,
  setShareId,
  onClose,
}) {
  const list = useMemo(() => {
    const q = category.query.trim().toLowerCase();
    return merchants.filter(
      (m) =>
        m.category === category.name &&
        (category.source === 'all' || m.offerSource === category.source) &&
        (!q || `${m.name}${m.sub}${m.offerType}`.toLowerCase().includes(q)),
    );
  }, [merchants, category]);

  const icon = CATEGORY_META[category.name]?.icon || 'bag';

  return (
    <Overlay onClose={onClose}>
      <div className="drawer">
        <DrawerHead
          icon={<Icon name={icon} size={26} stroke={1.6} />}
          title={category.name}
          sub={`${list.length} merchants`}
          onClose={onClose}
        >
          <div className="drawer-search">
            <span className="search-icon">
              <Icon name="search" size={17} stroke={1.9} />
            </span>
            <input
              className="input-dark"
              value={category.query}
              placeholder="Filter within category…"
              aria-label="Filter within category"
              onChange={(e) => setCategory((c) => ({ ...c, query: e.target.value }))}
            />
          </div>
          <div className="source-row">
            <span>Source</span>
            <SegGroup
              light
              options={SOURCE_OPTIONS}
              value={category.source}
              onChange={(source) => setCategory((c) => ({ ...c, source }))}
            />
          </div>
        </DrawerHead>

        <div className="drawer-body">
          {list.length === 0 ? (
            <div className="empty-state">No merchants match these filters.</div>
          ) : (
            <div className="grid-merchant-cards">
              {list.map((m) => {
                const links = shareLinks(m);
                const open = shareId === m.id;
                return (
                  <div key={m.id} className="merchant-card">
                    <div className="merchant-card-top">
                      <SourceBadge source={m.offerSource} />
                      <StatusPill status={m.status} />
                    </div>

                    <div className="merchant-card-id">
                      <MerchantMark merchant={m} />
                      <div className="flex-1">
                        <div className="merchant-name">{m.name}</div>
                        <div className="merchant-meta">
                          {m.category} · {m.sub}
                        </div>
                        {m.city && <div className="merchant-city">{m.city}</div>}
                      </div>
                    </div>

                    <div className="merchant-offer">
                      <span className="offer-tag">{m.offerType}</span>
                      <p className="merchant-desc">{m.offerDesc}</p>
                    </div>

                    <div className="merchant-foot">
                      <div className="merchant-offers-count">
                        <Icon name="tag" size={14} stroke={1.7} />
                        <span>{m.offers} active offers</span>
                      </div>
                      <button
                        type="button"
                        className="btn-share"
                        onClick={() => setShareId(open ? null : m.id)}
                      >
                        <Icon name="link" size={14} stroke={1.7} /> Share
                      </button>
                    </div>

                    {open && (
                      <div className="share-row">
                        <a
                          className="btn-whatsapp"
                          href={links.whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Icon name="whatsapp" size={15} stroke={1.7} /> WhatsApp
                        </a>
                        <a className="btn-email" href={links.email}>
                          <Icon name="mail" size={15} stroke={1.7} /> Email
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}

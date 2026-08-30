import { useMemo } from 'react';
import { Icon } from '../lib/icons.jsx';
import { CATEGORIES } from '../lib/format.js';
import { DrawerHead, MerchantMark, Overlay, SegGroup, SourceBadge, StatusPill } from './common.jsx';

const LIMIT = 150;

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'YAHALA Exclusive', label: 'YAHALA' },
  { value: 'Entertainer', label: 'Entertainer' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'Live', label: 'Live' },
  { value: 'Coming Soon', label: 'Coming Soon' },
];

export default function DirectoryDialog({ state, setState, merchants, onClose }) {
  const matches = useMemo(() => {
    const q = state.query.trim().toLowerCase();
    return merchants.filter(
      (m) =>
        (state.category === 'all' || m.category === state.category) &&
        (state.source === 'all' || m.offerSource === state.source) &&
        (state.status === 'all' || m.status === state.status) &&
        (!q || `${m.name} ${m.category} ${m.sub} ${m.offerType}`.toLowerCase().includes(q)),
    );
  }, [merchants, state]);

  const shown = matches.slice(0, LIMIT);
  const patch = (values) => setState((s) => ({ ...s, ...values }));

  return (
    <Overlay variant="is-centered" onClose={onClose}>
      <div className="dialog">
        <DrawerHead
          icon={<Icon name="store" size={24} stroke={1.6} />}
          title="Merchant Directory"
          sub={`Showing ${shown.length} of ${matches.length} merchants`}
          onClose={onClose}
        >
          <div className="drawer-filters">
            <div className="flex-1" style={{ position: 'relative', minWidth: 200 }}>
              <span className="search-icon">
                <Icon name="search" size={16} stroke={1.9} />
              </span>
              <input
                className="input-dark sm"
                value={state.query}
                placeholder="Search by name, category, sub category…"
                aria-label="Search the merchant directory"
                onChange={(e) => patch({ query: e.target.value })}
              />
            </div>

            <select
              className="select-dark"
              value={state.category}
              aria-label="Filter by category"
              onChange={(e) => patch({ category: e.target.value })}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <SegGroup
              light
              boxed
              options={SOURCE_OPTIONS}
              value={state.source}
              onChange={(source) => patch({ source })}
            />
            <SegGroup
              light
              boxed
              options={STATUS_OPTIONS}
              value={state.status}
              onChange={(status) => patch({ status })}
            />
          </div>
        </DrawerHead>

        <div className="drawer-body">
          {shown.length === 0 ? (
            <div className="empty-state">No merchants match these filters.</div>
          ) : (
            <div className="grid-merchant-cards compact">
              {shown.map((m) => (
                <div key={m.id} className="merchant-card compact">
                  <div className="merchant-card-top">
                    <SourceBadge source={m.offerSource} />
                    <StatusPill status={m.status} />
                  </div>
                  <div className="merchant-card-id">
                    <MerchantMark merchant={m} className="size-44" />
                    <div className="flex-1">
                      <div className="merchant-name sm">{m.name}</div>
                      <div className="merchant-meta sm">
                        {m.category} · {m.sub}
                      </div>
                      {m.city && <div className="merchant-city dim">{m.city}</div>}
                    </div>
                  </div>
                  <div className="merchant-offer compact">
                    <span className="offer-tag sm">{m.offerType}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {matches.length > LIMIT && (
            <div className="empty-state">
              Showing the first {LIMIT} matches — refine the filters to narrow the list.
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}

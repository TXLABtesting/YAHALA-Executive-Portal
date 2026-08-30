import { useEffect, useMemo, useRef } from 'react';
import { Icon } from '../lib/icons.jsx';
import { initials } from '../lib/format.js';

export default function TopBar({
  role,
  section,
  merchants,
  search,
  setSearch,
  onNavigate,
  onOpenCategory,
  onSignOut,
}) {
  const wrapRef = useRef(null);

  const results = useMemo(() => {
    const q = search.query.trim().toLowerCase();
    if (!q) return [];
    return merchants
      .filter((m) => `${m.name} ${m.category} ${m.sub}`.toLowerCase().includes(q))
      .slice(0, 30);
  }, [merchants, search.query]);

  // Clicking anywhere outside the field dismisses the result panel.
  useEffect(() => {
    if (!search.open) return undefined;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setSearch((s) => ({ ...s, open: false }));
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [search.open, setSearch]);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <img className="topbar-logo" src="/logo_mark.png" alt="YAHALA" />
        <div className="topbar-divider" />

        <nav>
          <button
            type="button"
            className={`nav-link${section === 'dashboard' ? ' is-active' : ''}`}
            onClick={() => onNavigate('dashboard')}
          >
            Dashboard
          </button>
          {role === 'admin' && (
            <button
              type="button"
              className={`nav-link${section === 'admin' ? ' is-active' : ''}`}
              onClick={() => onNavigate('admin')}
            >
              Admin Portal
            </button>
          )}
        </nav>

        <div className="topbar-spacer" />

        <div className="search-wrap" ref={wrapRef}>
          <span className="search-icon">
            <Icon name="search" size={16} stroke={1.9} />
          </span>
          <input
            className="search-input"
            value={search.query}
            placeholder="Search merchants, categories…"
            aria-label="Search merchants and categories"
            onChange={(e) => setSearch({ query: e.target.value, open: true })}
            onFocus={() => search.query && setSearch((s) => ({ ...s, open: true }))}
          />

          {search.open && search.query.trim() !== '' && (
            <div className="search-panel">
              <div className="search-panel-head">
                <span className="search-panel-count">{results.length} results</span>
                <button
                  type="button"
                  style={{ color: 'var(--ink3)', display: 'inline-flex' }}
                  aria-label="Close search results"
                  onClick={() => setSearch((s) => ({ ...s, open: false }))}
                >
                  <Icon name="x" size={15} stroke={2} />
                </button>
              </div>

              {results.length === 0 ? (
                <div className="search-result-empty">No merchants match that search.</div>
              ) : (
                results.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="search-result"
                    onClick={() => onOpenCategory(m.category)}
                  >
                    <span className="avatar-sm">{initials(m.name)}</span>
                    <span className="flex-1">
                      <span className="search-result-name">{m.name}</span>
                      <span className="search-result-meta">
                        {m.category} · {m.sub}
                      </span>
                    </span>
                    <span className="search-result-offer">{m.offerType}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="role-chip">
          <span>{role === 'admin' ? 'Administrator' : 'Executive'}</span>
          <button
            type="button"
            className="icon-btn-round"
            title="Sign out"
            aria-label="Sign out"
            onClick={onSignOut}
          >
            <Icon name="logout" size={15} stroke={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}

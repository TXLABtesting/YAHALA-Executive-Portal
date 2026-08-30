import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import Admin from './Admin.jsx';
import CategoryDrawer from './CategoryDrawer.jsx';
import Dashboard from './Dashboard.jsx';
import DirectoryDialog from './DirectoryDialog.jsx';
import EditModal from './EditModal.jsx';
import RedeemersDrawer from './RedeemersDrawer.jsx';
import TopBar from './TopBar.jsx';

const DIRECTORY_DEFAULTS = {
  open: false,
  query: '',
  category: 'all',
  source: 'all',
  status: 'all',
};

export default function Portal({ role, data, setData, reload, loading, notify, onSignOut }) {
  const isAdmin = role === 'admin';

  const [section, setSection] = useState('dashboard');
  const [search, setSearch] = useState({ query: '', open: false });
  const [category, setCategory] = useState({ name: null, query: '', source: 'all' });
  const [shareId, setShareId] = useState(null);
  const [redeemersOpen, setRedeemersOpen] = useState(false);
  const [directory, setDirectory] = useState(DIRECTORY_DEFAULTS);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [edit, setEdit] = useState(null);

  const { merchants, spotlight } = data;

  /* ----------------------------------------------------------- spotlight */

  const pool = useMemo(() => {
    const byId = new Map(merchants.map((m) => [m.id, m]));
    const chosen = (spotlight.pool || []).map((id) => byId.get(id)).filter(Boolean);
    return chosen.length ? chosen : merchants.slice(0, 8);
  }, [merchants, spotlight.pool]);

  const spotMerchant = useMemo(() => {
    if (spotlight.pinnedId) {
      const pinned = merchants.find((m) => m.id === spotlight.pinnedId);
      if (pinned) return pinned;
    }
    if (!pool.length) return null;
    return pool[spotlightIndex % pool.length];
  }, [merchants, pool, spotlight.pinnedId, spotlightIndex]);

  const rotationPaused =
    Boolean(spotlight.pinnedId) || Boolean(category.name) || Boolean(edit) || directory.open;

  useEffect(() => {
    if (section !== 'dashboard' || !spotlight.autoRotate || rotationPaused) return undefined;
    if (pool.length < 2) return undefined;
    const timer = setInterval(() => {
      setSpotlightIndex((i) => (i + 1) % pool.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [section, spotlight.autoRotate, rotationPaused, pool.length]);

  /* ------------------------------------------------------------- writes */

  const guardAdmin = useCallback(() => {
    if (!isAdmin) {
      notify('Administrator access required.', 'error');
      return false;
    }
    return true;
  }, [isAdmin, notify]);

  /** Runs an API write, then applies its result to local state. */
  const run = useCallback(
    async (fn, { success } = {}) => {
      if (!guardAdmin()) return null;
      try {
        const result = await fn();
        if (success) notify(success);
        return result;
      } catch (err) {
        notify(err.message, 'error');
        return null;
      }
    },
    [guardAdmin, notify],
  );

  const setLayout = useCallback(
    (layout) => {
      setData((d) => ({ ...d, layout }));
      if (isAdmin) api.saveSetting('layout', layout).catch(() => {});
    },
    [isAdmin, setData],
  );

  const saveSpotlight = useCallback(
    (patch) =>
      run(async () => {
        const next = await api.saveSpotlight({ ...spotlight, ...patch });
        setData((d) => ({ ...d, spotlight: next }));
        return next;
      }),
    [run, setData, spotlight],
  );

  const saveKpis = useCallback(
    (kpis) =>
      run(async () => {
        const next = await api.saveKpis(kpis);
        setData((d) => ({ ...d, kpis: next }));
        return next;
      }),
    [run, setData],
  );

  const saveAccommodation = useCallback(
    (patch) =>
      run(async () => {
        const next = await api.saveAccommodation({ ...data.accommodation, ...patch });
        setData((d) => ({ ...d, accommodation: next }));
        return next;
      }),
    [data.accommodation, run, setData],
  );

  const removeItem = useCallback(
    (resource, id, message) =>
      run(
        async () => {
          await api[resource].remove(id);
          // Merchants and their archive share one endpoint and one table.
          await reload();
          return true;
        },
        { success: message },
      ),
    [reload, run],
  );

  /* --------------------------------------------------------- edit modal */

  const openEdit = useCallback(
    (kind, item, extra = {}) => {
      if (!guardAdmin()) return;
      setEdit({ kind, id: item?.id ?? null, draft: { ...(item || {}), ...extra } });
    },
    [guardAdmin],
  );

  const closeEdit = useCallback(() => setEdit(null), []);

  const submitEdit = useCallback(
    async (kind, id, draft) => {
      const resource = {
        merchant: 'merchants',
        launch: 'launches',
        newsletter: 'newsletters',
        update: 'updates',
        redeemer: 'redeemers',
      }[kind];

      const saved = await run(
        async () => {
          const result = id ? await api[resource].update(id, draft) : await api[resource].create(draft);
          await reload();
          return result;
        },
        { success: id ? 'Saved.' : 'Added.' },
      );
      if (saved) setEdit(null);
    },
    [reload, run],
  );

  /* -------------------------------------------------------------- views */

  const openCategory = useCallback((name) => {
    setCategory({ name, query: '', source: 'all' });
    setShareId(null);
    setSearch((s) => ({ ...s, open: false }));
  }, []);

  const openDirectory = useCallback(() => {
    setDirectory({ ...DIRECTORY_DEFAULTS, open: true });
  }, []);

  const onKpiClick = useCallback(
    (key) => {
      if (key === 'merchants' || key === 'offers') {
        openDirectory();
      } else if (key === 'categories') {
        const el = document.getElementById('categories-section');
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90 });
      }
    },
    [openDirectory],
  );

  return (
    <div>
      <TopBar
        role={role}
        section={section}
        merchants={merchants}
        search={search}
        setSearch={setSearch}
        onNavigate={setSection}
        onOpenCategory={openCategory}
        onSignOut={onSignOut}
      />

      {section === 'dashboard' ? (
        <Dashboard
          data={data}
          loading={loading}
          layout={data.layout}
          onLayout={setLayout}
          spot={spotMerchant}
          pool={pool}
          spotlightIndex={spotlightIndex}
          onSpotlightIndex={(i) => {
            setSpotlightIndex(i);
            if (spotlight.pinnedId) saveSpotlight({ pinnedId: null });
          }}
          pinned={Boolean(spotlight.pinnedId)}
          onOpenCategory={openCategory}
          onOpenRedeemers={() => setRedeemersOpen(true)}
          onKpiClick={onKpiClick}
        />
      ) : (
        <Admin
          data={data}
          reload={reload}
          openEdit={openEdit}
          removeItem={removeItem}
          saveKpis={saveKpis}
          saveSpotlight={saveSpotlight}
          saveAccommodation={saveAccommodation}
        />
      )}

      {category.name && (
        <CategoryDrawer
          category={category}
          setCategory={setCategory}
          merchants={merchants}
          shareId={shareId}
          setShareId={setShareId}
          onClose={() => setCategory({ name: null, query: '', source: 'all' })}
        />
      )}

      {redeemersOpen && (
        <RedeemersDrawer redeemers={data.redeemers} onClose={() => setRedeemersOpen(false)} />
      )}

      {directory.open && (
        <DirectoryDialog
          state={directory}
          setState={setDirectory}
          merchants={merchants}
          onClose={() => setDirectory(DIRECTORY_DEFAULTS)}
        />
      )}

      {edit && (
        <EditModal
          edit={edit}
          setEdit={setEdit}
          onCancel={closeEdit}
          onSubmit={submitEdit}
          notify={notify}
        />
      )}
    </div>
  );
}

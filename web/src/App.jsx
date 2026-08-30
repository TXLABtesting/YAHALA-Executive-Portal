import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Login from './components/Login.jsx';
import Portal from './components/Portal.jsx';
import Toast from './components/Toast.jsx';

const EMPTY = {
  merchants: [],
  archive: [],
  newsletters: [],
  launches: [],
  updates: [],
  redeemers: [],
  kpis: { merchants: 0, offers: 0, categories: 6, active: 0, newUsers: 0, redemptions: 0 },
  spotlight: { pool: [], pinnedId: null, autoRotate: true },
  accommodation: { total: 0, from: '', to: '' },
  layout: 'A',
};

export default function App() {
  const [role, setRole] = useState(null);
  const [data, setData] = useState(EMPTY);
  const [booting, setBooting] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, kind = 'info') => {
    setToast({ message, kind, id: Date.now() });
  }, []);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      setData(await api.bootstrap());
    } catch (err) {
      if (err.status === 401) setRole(null);
      else notify(err.message, 'error');
    } finally {
      setLoadingData(false);
    }
  }, [notify]);

  // A session cookie survives a reload, so check for one before showing login.
  useEffect(() => {
    let cancelled = false;
    api
      .session()
      .then((s) => {
        if (!cancelled) setRole(s.role);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (role) loadData();
    else setData(EMPTY);
  }, [role, loadData]);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setRole(null);
    }
  }, []);

  if (booting) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <span>Loading portal</span>
      </div>
    );
  }

  return (
    <>
      {role ? (
        <Portal
          role={role}
          data={data}
          setData={setData}
          reload={loadData}
          loading={loadingData}
          notify={notify}
          onSignOut={signOut}
        />
      ) : (
        <Login onSignedIn={setRole} />
      )}
      {toast && <Toast key={toast.id} {...toast} onDone={() => setToast(null)} />}
    </>
  );
}

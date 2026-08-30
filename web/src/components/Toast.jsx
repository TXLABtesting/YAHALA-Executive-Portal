import { useEffect } from 'react';

export default function Toast({ message, kind = 'info', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, kind === 'error' ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [kind, onDone]);

  return (
    <div className={`toast${kind === 'error' ? ' is-error' : ''}`} role="status">
      {message}
    </div>
  );
}

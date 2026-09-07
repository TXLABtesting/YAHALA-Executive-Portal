import { useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../lib/icons.jsx';
import { readFileAsDataUrl } from '../lib/format.js';
import { Overlay } from './common.jsx';

const PREVIEW_ROWS = 100;

/**
 * Bulk merchant upload. The spreadsheet is checked on the server against the
 * same rules the Add Merchant form applies, and nothing is written until the
 * admin has seen the result of that check.
 */
export default function ImportMerchants({ onClose, onImported, notify }) {
  const [fileName, setFileName] = useState('');
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dataUri, setDataUri] = useState(null);
  const [updateExisting, setUpdateExisting] = useState(false);

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setReport(null);
    setFileName(file.name);
    try {
      const uri = await readFileAsDataUrl(file);
      setDataUri(uri);
      setReport(await api.merchants.import(uri, { updateExisting }));
    } catch (err) {
      notify(err.message, 'error');
      setFileName('');
      setDataUri(null);
    } finally {
      setBusy(false);
    }
  };

  // Re-checks the same file when the update option is toggled.
  const recheck = async (next) => {
    setUpdateExisting(next);
    if (!dataUri) return;
    setBusy(true);
    try {
      setReport(await api.merchants.import(dataUri, { updateExisting: next }));
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    setBusy(true);
    try {
      const result = await api.merchants.import(dataUri, { commit: true, updateExisting });
      const notes = [
        result.logosFetched ? `${result.logosFetched} logos fetched` : '',
        result.logosFailed ? `${result.logosFailed} logo links could not be downloaded` : '',
      ].filter(Boolean);
      notify(`${result.imported} merchants saved${notes.length ? `, ${notes.join(', ')}` : ''}.`);
      await onImported();
      onClose();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  /* Rejected rows first, then the ones that will be written: re-uploading an
     exported sheet is mostly rows that change nothing, and those must not push
     what needs attention past the end of the preview. */
  const rank = (r) => (r.valid ? (r.writes ? 1 : 2) : 0);
  const rows = [...(report?.rows ?? [])].sort((a, b) => rank(a) - rank(b) || a.row - b.row);

  return (
    <Overlay variant="is-edit" onClose={onClose}>
      <div className="edit-modal is-wide">
        <div className="edit-head">
          <h2 className="edit-title">Upload Merchants</h2>
          <button type="button" className="btn-close-light" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} stroke={2} />
          </button>
        </div>

        <div className="edit-body">
          <ol className="import-steps">
            <li>
              <span className="import-step-num">1</span>
              <div className="flex-1">
                <div className="import-step-title">Download the template</div>
                <div className="import-step-note">
                  Its columns are generated from the Add Merchant form, with drop-down lists for
                  Category, Offer Source, Status and City. To fill something in for merchants you
                  already have — logos, for instance — start from the current list instead.
                </div>
              </div>
              <div className="import-step-actions">
                <a className="btn-soft" href={api.merchants.templateUrl} download>
                  <Icon name="download" size={15} stroke={1.7} /> Download Excel Template
                </a>
                <a className="btn-soft" href={api.merchants.exportUrl} download>
                  <Icon name="store" size={15} stroke={1.7} /> Download Current Merchants
                </a>
              </div>
            </li>

            <li>
              <span className="import-step-num">2</span>
              <div className="flex-1">
                <div className="import-step-title">Fill it in and upload it back</div>
                <div className="import-step-note">
                  {fileName ? fileName : 'One merchant per row, .xlsx format.'}
                </div>
              </div>
              <label className={`btn-primary${busy ? ' is-busy' : ''}`}>
                {busy ? 'Reading…' : fileName ? 'Choose another file' : 'Choose file'}
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={pickFile}
                  style={{ display: 'none' }}
                />
              </label>
            </li>
            <li>
              <span className="import-step-num">3</span>
              <div className="flex-1">
                <div className="import-step-title">Merchants already in the portal</div>
                <div className="import-step-note">
                  Off, a name that already exists is reported and skipped. On, its filled-in
                  columns are updated and blank ones are left alone.
                </div>
              </div>
              <button
                type="button"
                className={`toggle${updateExisting ? ' is-on' : ''}`}
                aria-pressed={updateExisting}
                aria-label="Update merchants that already exist"
                disabled={busy}
                onClick={() => recheck(!updateExisting)}
              >
                <span />
              </button>
            </li>
          </ol>

          {report && (
            <>
              <div className="import-summary">
                <span className="import-chip is-ok">
                  {report.creates} new {report.creates === 1 ? 'merchant' : 'merchants'}
                </span>
                {report.updates > 0 && (
                  <span className="import-chip is-warn">{report.updates} will be updated</span>
                )}
                {report.unchanged > 0 && (
                  <span className="import-chip">{report.unchanged} already up to date</span>
                )}
                {report.invalid > 0 && (
                  <span className="import-chip is-bad">{report.invalid} rejected</span>
                )}
                {report.blankRows > 0 && (
                  <span className="import-chip">{report.blankRows} blank rows skipped</span>
                )}
              </div>

              {rows.length === 0 ? (
                <div className="empty-state">The sheet has no merchant rows.</div>
              ) : (
                <div className="import-table">
                  {rows.slice(0, PREVIEW_ROWS).map((r) => (
                    <div key={r.row} className={`import-row${r.valid ? '' : ' is-bad'}`}>
                      <span className="import-row-num">Row {r.row}</span>
                      <div className="flex-1">
                        <div className="import-row-name">{r.merchant.name || '—'}</div>
                        <div className="import-row-meta">
                          {[r.merchant.category, r.merchant.offerSource, r.merchant.status]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                        {[...r.errors, ...r.warnings].map((msg, i) => (
                          <div
                            key={i}
                            className={`import-row-msg${r.errors.includes(msg) ? ' is-bad' : ''}`}
                          >
                            {msg}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {rows.length > PREVIEW_ROWS && (
                    <div className="import-row-more">
                      and {rows.length - PREVIEW_ROWS} more rows
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="edit-foot">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-save"
            disabled={busy || !report || report.writes === 0}
            onClick={commit}
          >
            {busy ? 'Working…' : `Save ${report?.writes ?? 0} ${report?.writes === 1 ? 'merchant' : 'merchants'}`}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

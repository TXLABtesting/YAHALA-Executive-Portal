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
      setReport(await api.merchants.import(uri, false));
    } catch (err) {
      notify(err.message, 'error');
      setFileName('');
      setDataUri(null);
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    setBusy(true);
    try {
      const result = await api.merchants.import(dataUri, true);
      notify(`${result.imported} merchants added.`);
      await onImported();
      onClose();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const rows = report?.rows ?? [];

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
                  Category, Offer Source, Status and City.
                </div>
              </div>
              <a className="btn-soft" href={api.merchants.templateUrl} download>
                <Icon name="download" size={15} stroke={1.7} /> Download Excel Template
              </a>
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
          </ol>

          {report && (
            <>
              <div className="import-summary">
                <span className="import-chip is-ok">{report.valid} ready to add</span>
                {report.invalid > 0 && (
                  <span className="import-chip is-bad">{report.invalid} rejected</span>
                )}
                {report.warnings > 0 && (
                  <span className="import-chip is-warn">{report.warnings} with notes</span>
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
            disabled={busy || !report || report.valid === 0}
            onClick={commit}
          >
            {busy ? 'Working…' : `Add ${report?.valid ?? 0} merchants`}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

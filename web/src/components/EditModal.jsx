import { useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import {
  CATEGORIES,
  STAGE_NAMES,
  UPDATE_TYPES,
  initials,
  readFileAsDataUrl,
} from '../lib/format.js';
import { Overlay } from './common.jsx';

const TITLES = {
  merchant: ['Add Merchant', 'Edit Merchant'],
  launch: ['Add Launch', 'Edit Launch'],
  newsletter: ['Add Newsletter', 'Edit Newsletter'],
  redeemer: ['Add Redeemer', 'Edit Redeemer'],
  update: ['Add Update', 'Edit Update'],
};

const REQUIRED = {
  merchant: ['name', 'Merchant name is required.'],
  launch: ['name', 'Merchant name is required.'],
  newsletter: ['title', 'Title is required.'],
  redeemer: ['name', 'User name is required.'],
  update: ['title', 'Title is required.'],
};

export default function EditModal({ edit, setEdit, onCancel, onSubmit, notify }) {
  const [busy, setBusy] = useState(false);
  const { kind, id, draft } = edit;

  const set = (patch) => setEdit((e) => ({ ...e, draft: { ...e.draft, ...patch } }));
  const field = (name) => ({
    name,
    value: draft[name] ?? '',
    onChange: (e) => set({ [name]: e.target.value }),
  });

  const pickFile = async (e, key, extra) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      set({ [key]: dataUrl, ...(extra ? extra(file) : null) });
    } catch {
      notify('Could not read that file.', 'error');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const [key, message] = REQUIRED[kind];
    if (!String(draft[key] || '').trim()) {
      notify(message, 'error');
      return;
    }
    setBusy(true);
    try {
      await onSubmit(kind, id, draft);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay variant="is-edit" onClose={onCancel}>
      <form className="edit-modal" onSubmit={submit}>
        <div className="edit-head">
          <h2 className="edit-title">{TITLES[kind][id ? 1 : 0]}</h2>
          <button type="button" className="btn-close-light" onClick={onCancel} aria-label="Close">
            <Icon name="x" size={16} stroke={2} />
          </button>
        </div>

        <div className="edit-body">
          {kind === 'merchant' && (
            <>
              <div className="logo-editor">
                <span className="logo-editor-tile">
                  {draft.logo && <img src={draft.logo} alt="" />}
                  {!draft.logo && initials(draft.name)}
                </span>
                <div className="flex-1">
                  <div className="logo-editor-title">Merchant Logo</div>
                  <div className="logo-editor-note">
                    {draft.logo ? 'Custom logo uploaded' : 'Using monogram placeholder'}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label className="file-btn">
                      {draft.logo ? 'Replace' : 'Upload'}
                      <input type="file" accept="image/*" onChange={(e) => pickFile(e, 'logo')} />
                    </label>
                    {draft.logo && (
                      <button
                        type="button"
                        className="btn-delete-soft"
                        onClick={() => set({ logo: null })}
                      >
                        <Icon name="trash" size={13} stroke={1.8} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <Field label="Merchant Name">
                <input className="field-input" {...field('name')} />
              </Field>

              <div className="field-row">
                <Field label="Category">
                  <select className="field-input" {...field('category')}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Sub Category">
                  <input className="field-input" {...field('sub')} />
                </Field>
              </div>

              <div className="field-row">
                <Field label="Offer Source">
                  <select className="field-input" {...field('offerSource')}>
                    <option value="YAHALA Exclusive">YAHALA Exclusive</option>
                    <option value="Entertainer">Entertainer</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select className="field-input" {...field('status')}>
                    <option value="Live">Live</option>
                    <option value="Coming Soon">Coming Soon</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </Field>
              </div>

              <div className="field-row">
                <div className="flex-2">
                  <Field label="Offer Type">
                    <input
                      className="field-input"
                      placeholder="e.g. Buy 1 Get 1 · 25% Off"
                      {...field('offerType')}
                    />
                  </Field>
                </div>
                <Field label="City">
                  <select className="field-input" {...field('city')}>
                    <option value="">Unspecified</option>
                    <option value="Dubai">Dubai</option>
                    <option value="Abu Dhabi">Abu Dhabi</option>
                    <option value="Dubai & Abu Dhabi">Dubai &amp; Abu Dhabi</option>
                  </select>
                </Field>
                <Field label="# Offers">
                  <input className="field-input" type="number" min="0" {...field('offers')} />
                </Field>
              </div>

              {draft.status === 'Inactive' && (
                <div className="field-row">
                  <Field label="Reason">
                    <input
                      className="field-input"
                      placeholder="e.g. Expired, Paused"
                      {...field('reason')}
                    />
                  </Field>
                  <Field label="Expired On">
                    <input
                      className="field-input"
                      placeholder="e.g. 29 Apr 2026"
                      {...field('expiryLabel')}
                    />
                  </Field>
                </div>
              )}

              <Field label="Offer Description">
                <textarea className="field-input" rows={2} {...field('offerDesc')} />
              </Field>
            </>
          )}

          {kind === 'launch' && (
            <>
              <Field label="Merchant Name">
                <input className="field-input" {...field('name')} />
              </Field>
              <div className="field-row">
                <Field label="Category">
                  <select className="field-input" {...field('category')}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Expected Date">
                  <input className="field-input" type="date" {...field('date')} />
                </Field>
              </div>
              <Field label="Progress Stage">
                <select className="field-input" {...field('stage')}>
                  {STAGE_NAMES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          {kind === 'newsletter' && (
            <>
              <div className="news-editor">
                <span className="news-editor-tile">
                  <Icon name="newspaper" size={24} stroke={1.5} />
                  {draft.thumb && <img src={draft.thumb} alt="" />}
                </span>
                <div className="news-editor-actions">
                  <label className="file-drop">
                    Upload Cover Image
                    <input type="file" accept="image/*" onChange={(e) => pickFile(e, 'thumb')} />
                  </label>
                  <label className="file-drop">
                    {draft.pdfName || 'Attach PDF'}
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => pickFile(e, 'pdf', (f) => ({ pdfName: f.name }))}
                    />
                  </label>
                </div>
              </div>
              <Field label="Title">
                <input className="field-input" {...field('title')} />
              </Field>
              <Field label="Publication Date">
                <input className="field-input" type="date" {...field('date')} />
              </Field>
              <Field label="Short Description">
                <textarea className="field-input" rows={3} {...field('desc')} />
              </Field>
            </>
          )}

          {kind === 'redeemer' && (
            <>
              <Field label="User Name">
                <input className="field-input" {...field('name')} />
              </Field>
              <Field label="Number of Redemptions">
                <input className="field-input" type="number" min="0" {...field('redemptions')} />
              </Field>
            </>
          )}

          {kind === 'update' && (
            <>
              <Field label="Type">
                <select className="field-input" {...field('type')}>
                  {UPDATE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <input className="field-input" {...field('title')} />
              </Field>
              <div className="field-row">
                <div className="flex-2">
                  <Field label="Detail">
                    <input className="field-input" {...field('detail')} />
                  </Field>
                </div>
                <Field label="Time">
                  <input className="field-input" placeholder="2h ago" {...field('time')} />
                </Field>
              </div>
            </>
          )}
        </div>

        <div className="edit-foot">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-save" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

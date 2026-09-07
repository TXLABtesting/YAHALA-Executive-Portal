import ExcelJS from 'exceljs';
import { query, withTransaction } from '../db/index.js';
import { cell, EXAMPLE_ROW, ID_HEADER, MERCHANT_FIELDS, validateRow } from '../merchant-fields.js';
import { merchantOut } from '../mappers.js';
import { config } from '../config.js';
import { storeBuffer } from '../files.js';

const SHEET = 'Merchants';
const VALIDATION_ROWS = 500;
const SPARE_ROWS = 50;
// Comfortably above the whole portal, so an exported sheet round-trips whole.
const MAX_ROWS = 6000;

const NAVY = 'FF0E1631';
const GOLD = 'FFBC9A4F';
const PAPER = 'FFF5F6FA';

/* ------------------------------------------------------------- template -- */

/**
 * Puts a drop-down on every cell of the fields that have a fixed set of
 * values, down to `lastRow`. Reading a cell creates its row, so this runs
 * after the data rows are in — otherwise it would leave several hundred blank
 * rows above them.
 */
function applyDropdowns(sheet, lastRow) {
  MERCHANT_FIELDS.forEach((field, i) => {
    if (!field.options) return;
    const letter = sheet.getColumn(i + 1).letter;
    for (let row = 2; row <= lastRow; row += 1) {
      sheet.getCell(`${letter}${row}`).dataValidation = {
        type: 'list',
        allowBlank: !field.required,
        formulae: [`"${field.options.join(',')}"`],
        showErrorMessage: true,
        errorTitle: field.header,
        error: `Choose one of: ${field.options.join(', ')}`,
      };
    }
  });
}

/**
 * Header, styling and the Instructions sheet, built from MERCHANT_FIELDS so
 * the workbook always matches the Add Merchant form. Drop-downs are left to
 * the caller, which knows how many rows the sheet will end up with.
 */
async function buildWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'YAHALA Executive Portal';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(SHEET, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = MERCHANT_FIELDS.map((f) => ({ header: f.header, key: f.key, width: f.width }));

  const header = sheet.getRow(1);
  header.height = 26;
  header.eachCell((cell, col) => {
    const field = MERCHANT_FIELDS[col - 1];
    cell.font = { bold: true, color: { argb: field.required ? 'FFFFF3D6' : 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = { bottom: { style: 'thin', color: { argb: GOLD } } };
    cell.note = `${field.required ? 'Required. ' : ''}${field.note || ''}`.trim();
  });

  /* A second sheet carries the guidance and a filled-in example, so nothing in
     the data sheet has to be deleted before uploading. */
  const guide = workbook.addWorksheet('Instructions');
  guide.columns = [
    { header: 'Column', key: 'column', width: 22 },
    { header: 'Required', key: 'required', width: 12 },
    { header: 'Allowed values', key: 'values', width: 60 },
    { header: 'Notes', key: 'notes', width: 52 },
    { header: 'Example', key: 'example', width: 40 },
  ];
  guide.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  });

  for (const field of MERCHANT_FIELDS) {
    const row = guide.addRow({
      column: field.header,
      required: field.required ? 'Yes' : 'No',
      values: field.options ? field.options.join(' · ') : 'Any text',
      notes: field.note || '',
      example: String(EXAMPLE_ROW[field.key] ?? ''),
    });
    row.alignment = { vertical: 'top', wrapText: true };
    if (field.required) {
      row.getCell('required').font = { bold: true, color: { argb: GOLD } };
      row.getCell('column').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PAPER } };
    }
  }

  guide.addRow([]);
  guide.addRow(['Fill in the Merchants sheet, one merchant per row, then upload it in the Admin Portal.']);
  guide.addRow(['Logo URL takes a direct link to an image; the portal downloads it and stores it as the logo.']);
  guide.addRow(['A name already in the portal is skipped, unless you upload with "merchants already in the portal" on — then its filled-in columns are updated and blank ones left alone.']);

  return workbook;
}

/** The empty workbook to fill in: blank rows, each with its drop-downs. */
export async function buildTemplate() {
  const workbook = await buildWorkbook();
  applyDropdowns(workbook.getWorksheet(SHEET), VALIDATION_ROWS);
  return workbook;
}

/** The same workbook, pre-filled with the merchants already in the portal. */
export async function buildExport() {
  const workbook = await buildWorkbook();
  const sheet = workbook.getWorksheet(SHEET);

  const { rows } = await query(
    `SELECT id, name, category, sub, offer_type, offer_desc, offers, offer_source,
            status, city, reason, expiry_label
     FROM merchants ORDER BY archived, name`,
  );

  /* An identity column, past the last form field: 32 merchants share a name
     with another, so a re-uploaded sheet has to say which row it means. */
  const idCol = MERCHANT_FIELDS.length + 1;
  sheet.getColumn(idCol).width = 12;
  const idHead = sheet.getRow(1).getCell(idCol);
  idHead.value = ID_HEADER;
  idHead.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  idHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  idHead.alignment = { vertical: 'middle', horizontal: 'left' };
  idHead.border = { bottom: { style: 'thin', color: { argb: GOLD } } };
  idHead.note = 'Leave this column alone. It tells the portal which merchant a row belongs to. Rows you add yourself leave it empty.';

  for (const r of rows) {
    const added = sheet.addRow({
      name: r.name,
      category: r.category,
      sub: r.sub,
      offerSource: r.offer_source,
      status: r.status,
      offerType: r.offer_type,
      offerDesc: r.offer_desc,
      offers: r.offers,
      city: r.city,
      reason: r.reason,
      expiryLabel: r.expiry_label,
      logoUrl: '',
    });
    const idCell = added.getCell(idCol);
    idCell.value = r.id;
    idCell.font = { color: { argb: 'FF9AA3B5' }, size: 10 };
  }

  // Plus a few spare rows, so new merchants can be appended to the same sheet.
  applyDropdowns(sheet, rows.length + 1 + SPARE_ROWS);
  return workbook;
}

/* --------------------------------------------------------------- import -- */

const norm = (s) => String(s || '').trim().toLowerCase();

/** Maps the sheet's header row onto field keys, accepting headers or keys. */
function readHeaderMap(sheet) {
  const map = new Map();
  const missing = [];
  const headerRow = sheet.getRow(1);
  const seen = new Map();

  headerRow.eachCell((c, col) => {
    const text = norm(c.value && typeof c.value === 'object' ? c.value.text : c.value);
    if (text) seen.set(text, col);
  });

  for (const field of MERCHANT_FIELDS) {
    const col = seen.get(norm(field.header)) ?? seen.get(norm(field.key));
    if (col) map.set(field.key, col);
    else if (field.required) missing.push(field.header);
  }
  // Only the exported sheet carries it; the blank template does not.
  return { map, missing, idColumn: seen.get(norm(ID_HEADER)) ?? null };
}

/** Spreadsheet field -> merchants column, for partial updates. */
const COLUMN_OF = {
  name: 'name',
  category: 'category',
  sub: 'sub',
  offerType: 'offer_type',
  offerDesc: 'offer_desc',
  offers: 'offers',
  offerSource: 'offer_source',
  status: 'status',
  city: 'city',
  reason: 'reason',
  expiryLabel: 'expiry_label',
};

/** True when a filled-in cell says the same thing the portal already holds. */
function unchanged(value, current) {
  if (typeof value === 'number') return Number(current) === value;
  return String(current ?? '').trim() === String(value ?? '').trim();
}

/**
 * Reads an uploaded workbook and checks every row against the Add Merchant
 * rules. Returns one entry per row so the admin can see what will happen
 * before anything is written.
 */
export async function analyseWorkbook(buffer, { updateExisting = false } = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet(SHEET) || workbook.worksheets[0];
  if (!sheet) {
    throw Object.assign(new Error('That file has no sheets.'), { status: 400, expose: true });
  }

  const { map, missing, idColumn } = readHeaderMap(sheet);
  if (missing.length) {
    throw Object.assign(
      new Error(
        `The sheet is missing these columns: ${missing.join(', ')}. Download the template and use its headers.`,
      ),
      { status: 400, expose: true },
    );
  }

  const { rows: existing } = await query(
    `SELECT id, name, lower(name) AS key, category, sub, offer_type, offer_desc,
            offers, offer_source, status, city, reason, expiry_label
     FROM merchants`,
  );
  const byId = new Map(existing.map((r) => [r.id, r]));
  const byName = new Map();
  for (const r of existing) {
    // A name shared by two merchants identifies neither of them.
    byName.set(r.key, byName.has(r.key) ? null : r);
  }
  const claimed = new Set();

  const results = [];
  let blank = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || results.length >= MAX_ROWS) return;

    const raw = {};
    let hasValue = false;
    for (const [key, col] of map) {
      const value = row.getCell(col).value;
      raw[key] = value;
      if (value !== null && value !== undefined && String(value).trim() !== '') hasValue = true;
    }
    if (!hasValue) {
      blank += 1;
      return;
    }

    /* The Portal ID an exported sheet carries names the merchant outright; a
       sheet without one falls back to the name, which only identifies a
       merchant when no other merchant shares it. */
    const id = idColumn ? Number(cell(row.getCell(idColumn).value)) : NaN;
    const named = byName.get(cell(raw.name).toLowerCase());
    const ambiguous = !Number.isInteger(id) && named === null;
    const match = (Number.isInteger(id) ? byId.get(id) : named) || null;
    const key = match ? `#${match.id}` : cell(raw.name).toLowerCase();

    const { merchant, errors, warnings, provided, updateId } = validateRow(raw, {
      match,
      ambiguous,
      duplicate: Boolean(key) && claimed.has(key),
      updateExisting,
    });
    if (!errors.length && key) claimed.add(key);

    /* Re-uploading an exported sheet repeats every merchant unchanged. Keep
       only the cells that differ from what the portal holds, so such a file
       writes the handful of rows the admin actually edited and no more. */
    let changed = provided;
    if (updateId && !errors.length) {
      const current = match;
      // A Portal ID identifies the merchant, so even its name can be corrected.
      changed = provided.filter(
        (key) => key !== 'logoUrl' && !unchanged(merchant[key], current[COLUMN_OF[key]]),
      );
      if (changed.length) {
        warnings.push(`Already in the portal — ${changed.length} column${changed.length === 1 ? '' : 's'} will be updated.`);
      } else if (merchant.logoUrl) {
        warnings.push('Already in the portal — its logo will be updated.');
      } else {
        warnings.push('Already in the portal and unchanged — nothing to write.');
      }
    }

    const writes = !updateId || changed.length > 0 || Boolean(merchant.logoUrl);

    results.push({
      row: rowNumber,
      merchant,
      provided: changed,
      updateId,
      writes,
      errors,
      warnings,
      valid: errors.length === 0,
    });
  });

  const writable = results.filter((r) => r.valid && r.writes);

  return {
    rows: results,
    blankRows: blank,
    updates: writable.filter((r) => r.updateId).length,
    creates: writable.filter((r) => !r.updateId).length,
    unchanged: results.filter((r) => r.valid && !r.writes).length,
    writes: writable.length,
    valid: results.filter((r) => r.valid).length,
    invalid: results.filter((r) => !r.valid).length,
    warnings: results.filter((r) => r.valid && r.warnings.length).length,
    truncated: results.length >= MAX_ROWS,
  };
}

const LOGO_TIMEOUT_MS = 10000;
const LOGO_CONCURRENCY = 6;

/**
 * Downloads one merchant logo and stores it like a manual upload. Returns null
 * on any failure — a logo that cannot be fetched must not stop the merchant
 * from being created.
 */
async function fetchLogo(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOGO_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!res.ok) return { error: `responded ${res.status}` };

    const mime = (res.headers.get('content-type') || '').split(';')[0].trim();
    if (!mime.startsWith('image/')) return { error: `is not an image (${mime || 'unknown type'})` };

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > config.maxUploadBytes) return { error: 'image is too large' };

    return { url: await storeBuffer(buffer, mime) };
  } catch (err) {
    return { error: err.name === 'AbortError' ? 'timed out' : 'could not be reached' };
  } finally {
    clearTimeout(timer);
  }
}

/** Fetches the logos of the rows that carry one, a few at a time. */
async function attachLogos(rows) {
  const pending = rows.filter((r) => r.merchant.logoUrl);
  let fetched = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += LOGO_CONCURRENCY) {
    const batch = pending.slice(i, i + LOGO_CONCURRENCY);
    await Promise.all(
      batch.map(async (r) => {
        const result = await fetchLogo(r.merchant.logoUrl);
        if (result.url) {
          r.merchant.logo = result.url;
          fetched += 1;
        } else {
          failed += 1;
          r.warnings.push(`Logo not added — the link ${result.error}.`);
        }
      }),
    );
  }
  return { fetched, failed };
}

/**
 * Writes the valid rows: new merchants through the same insert the Add
 * Merchant form uses, matched ones as a patch of the columns the sheet filled.
 */
export async function importRows(rows) {
  const validRows = rows.filter((r) => r.valid && r.writes);
  if (!validRows.length) return { created: [], logosFetched: 0, logosFailed: 0 };

  // Logos are fetched before the transaction opens, so a slow link never holds
  // a database transaction open.
  const { fetched: logosFetched, failed: logosFailed } = await attachLogos(validRows);

  const written = await withTransaction(async (client) => {
    const created = [];

    for (const row of validRows.filter((r) => r.updateId)) {
      // Only the columns the sheet actually filled are written, so a sheet
      // carrying just names and logos leaves everything else untouched.
      const patch = new Map();
      for (const key of row.provided) {
        if (key === 'logoUrl') continue;
        patch.set(COLUMN_OF[key], row.merchant[key]);
      }
      if (row.merchant.logo) patch.set('logo', row.merchant.logo);
      if (patch.has('status')) patch.set('archived', row.merchant.status === 'Inactive');
      if (!patch.size) continue;

      const keys = [...patch.keys()];
      const assignments = keys.map((col, i) => `${col} = $${i + 2}`).join(', ');
      const { rows: updated } = await client.query(
        `UPDATE merchants SET ${assignments}, updated_at = now() WHERE id = $1 RETURNING *`,
        [row.updateId, ...keys.map((k) => patch.get(k))],
      );
      if (updated[0]) created.push(merchantOut(updated[0]));
    }

    for (const m of validRows.filter((r) => !r.updateId).map((r) => r.merchant)) {
      const { rows: inserted } = await client.query(
        `INSERT INTO merchants
           (name, category, sub, offer_type, offer_desc, offers, offer_source,
            status, city, logo, reason, expiry_label, archived)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          m.name, m.category, m.sub, m.offerType, m.offerDesc, m.offers, m.offerSource,
          m.status, m.city, m.logo ?? null, m.reason, m.expiryLabel, m.status === 'Inactive',
        ],
      );
      created.push(merchantOut(inserted[0]));
    }
    await client.query(
      'UPDATE kpi SET merchants = (SELECT count(*) FROM merchants WHERE NOT archived) WHERE id = 1',
    );
    return created;
  });

  return { created: written, logosFetched, logosFailed };
}

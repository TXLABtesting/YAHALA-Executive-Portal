import ExcelJS from 'exceljs';
import { query, withTransaction } from '../db/index.js';
import { EXAMPLE_ROW, MERCHANT_FIELDS, validateRow } from '../merchant-fields.js';
import { merchantOut } from '../mappers.js';

const SHEET = 'Merchants';
const VALIDATION_ROWS = 500;
const MAX_ROWS = 2000;

const NAVY = 'FF0E1631';
const GOLD = 'FFBC9A4F';
const PAPER = 'FFF5F6FA';

/* ------------------------------------------------------------- template -- */

/** Builds the workbook from MERCHANT_FIELDS, so it always matches the form. */
export async function buildTemplate() {
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

  // Dropdowns for every field that has a fixed set of values.
  MERCHANT_FIELDS.forEach((field, i) => {
    if (!field.options) return;
    const letter = sheet.getColumn(i + 1).letter;
    for (let row = 2; row <= VALIDATION_ROWS; row += 1) {
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
  guide.addRow(['A merchant logo cannot be set from the spreadsheet — add it afterwards by editing the merchant.']);
  guide.addRow(['Names already used in the portal, or repeated in the file, are reported and skipped.']);

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

  headerRow.eachCell((cell, col) => {
    const text = norm(cell.value && typeof cell.value === 'object' ? cell.value.text : cell.value);
    if (text) seen.set(text, col);
  });

  for (const field of MERCHANT_FIELDS) {
    const col = seen.get(norm(field.header)) ?? seen.get(norm(field.key));
    if (col) map.set(field.key, col);
    else if (field.required) missing.push(field.header);
  }
  return { map, missing };
}

/**
 * Reads an uploaded workbook and checks every row against the Add Merchant
 * rules. Returns one entry per row so the admin can see what will happen
 * before anything is written.
 */
export async function analyseWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet(SHEET) || workbook.worksheets[0];
  if (!sheet) {
    throw Object.assign(new Error('That file has no sheets.'), { status: 400, expose: true });
  }

  const { map, missing } = readHeaderMap(sheet);
  if (missing.length) {
    throw Object.assign(
      new Error(
        `The sheet is missing these columns: ${missing.join(', ')}. Download the template and use its headers.`,
      ),
      { status: 400, expose: true },
    );
  }

  const { rows: existing } = await query('SELECT lower(name) AS name FROM merchants');
  const existingNames = new Set(existing.map((r) => r.name));
  const seenNames = new Set();

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

    const { merchant, errors, warnings } = validateRow(raw, { existingNames, seenNames });
    if (!errors.length && merchant.name) seenNames.add(merchant.name.toLowerCase());

    results.push({ row: rowNumber, merchant, errors, warnings, valid: errors.length === 0 });
  });

  return {
    rows: results,
    blankRows: blank,
    valid: results.filter((r) => r.valid).length,
    invalid: results.filter((r) => !r.valid).length,
    warnings: results.filter((r) => r.valid && r.warnings.length).length,
    truncated: results.length >= MAX_ROWS,
  };
}

/** Writes the valid rows using the same insert the Add Merchant form uses. */
export async function importRows(rows) {
  const valid = rows.filter((r) => r.valid).map((r) => r.merchant);
  if (!valid.length) return [];

  return withTransaction(async (client) => {
    const created = [];
    for (const m of valid) {
      const { rows: inserted } = await client.query(
        `INSERT INTO merchants
           (name, category, sub, offer_type, offer_desc, offers, offer_source,
            status, city, logo, reason, expiry_label, archived)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,$10,$11,$12)
         RETURNING *`,
        [
          m.name, m.category, m.sub, m.offerType, m.offerDesc, m.offers, m.offerSource,
          m.status, m.city, m.reason, m.expiryLabel, m.status === 'Inactive',
        ],
      );
      created.push(merchantOut(inserted[0]));
    }
    await client.query(
      'UPDATE kpi SET merchants = (SELECT count(*) FROM merchants WHERE NOT archived) WHERE id = 1',
    );
    return created;
  });
}

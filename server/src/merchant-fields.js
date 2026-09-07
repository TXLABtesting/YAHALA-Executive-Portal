import { CATEGORIES, SOURCES, STATUSES } from './mappers.js';

/**
 * The importable merchant fields, mirroring the Add Merchant form one for one.
 * The Excel template and the import validation are both generated from this
 * list, so a change to the form only has to be reflected here.
 *
 * The form's logo picker has no column: a logo is a file upload, not a cell.
 */
export const CITIES = ['Dubai', 'Abu Dhabi', 'Dubai & Abu Dhabi'];

export const MERCHANT_FIELDS = [
  {
    key: 'name',
    header: 'Merchant Name',
    required: true,
    width: 30,
    note: 'Required. Must be unique.',
  },
  {
    key: 'category',
    header: 'Category',
    required: true,
    options: CATEGORIES,
    width: 22,
    note: 'Required. Pick from the list.',
  },
  { key: 'sub', header: 'Sub Category', width: 20, note: 'Optional free text.' },
  {
    key: 'offerSource',
    header: 'Offer Source',
    required: true,
    options: SOURCES,
    default: 'YAHALA Exclusive',
    width: 20,
    note: 'Required. Pick from the list.',
  },
  {
    key: 'status',
    header: 'Status',
    required: true,
    options: STATUSES,
    default: 'Live',
    width: 16,
    note: 'Required. Inactive merchants go straight to the archive.',
  },
  {
    key: 'offerType',
    header: 'Offer Type',
    width: 26,
    note: 'Optional. e.g. 25% Off, Buy 1 Get 1.',
  },
  { key: 'offerDesc', header: 'Offer Description', width: 46, note: 'Optional.' },
  {
    key: 'offers',
    header: 'Number of Offers',
    type: 'number',
    default: 1,
    width: 18,
    note: 'Optional whole number, defaults to 1.',
  },
  {
    key: 'city',
    header: 'City',
    options: CITIES,
    width: 20,
    note: 'Optional. Pick from the list or leave blank.',
  },
  {
    key: 'reason',
    header: 'Reason',
    width: 22,
    note: 'Only used when Status is Inactive.',
  },
  {
    key: 'expiryLabel',
    header: 'Expired On',
    width: 18,
    note: 'Only used when Status is Inactive. e.g. 29 Apr 2026.',
  },
  {
    key: 'logoUrl',
    header: 'Logo URL',
    width: 46,
    note: "Optional. A direct link to the merchant's logo image (png, jpg, svg, webp). Fetched and stored on import.",
  },
];

export const EXAMPLE_ROW = {
  name: 'Example Boutique',
  logoUrl: 'https://example.com/logo.png',
  category: 'Fashion & Retail',
  sub: 'Fashion',
  offerSource: 'YAHALA Exclusive',
  status: 'Live',
  offerType: '20% Off',
  offerDesc: 'Enjoy 20% Off at Example Boutique.',
  offers: 1,
  city: 'Dubai',
  reason: '',
  expiryLabel: '',
};

/**
 * The export carries this extra column so a re-uploaded sheet matches merchants
 * by identity rather than by name — 32 merchants share a name with another.
 */
export const ID_HEADER = 'Portal ID';

/** Trims a cell and turns everything empty-ish into ''. */
export const cell = (value) => {
  if (value === null || value === undefined) return '';
  // exceljs hands back objects for formulas and rich text.
  const raw =
    typeof value === 'object'
      ? (value.result ?? value.text ?? value.hyperlink ?? '')
      : value;
  return String(raw).trim();
};

/** Matches a value against a field's options, ignoring case and spacing. */
const matchOption = (value, options) =>
  options.find((o) => o.toLowerCase() === value.toLowerCase().replace(/\s+/g, ' '));

/**
 * Validates one spreadsheet row against the same rules the Add Merchant form
 * applies, returning the merchant to create plus any errors and warnings.
 *
 * `match` is the merchant this row was resolved to, by Portal ID or by name;
 * the caller does that lookup because only it can see the whole file.
 */
export function validateRow(raw, { match = null, ambiguous = false, duplicate = false, updateExisting = false }) {
  const errors = [];
  const warnings = [];
  const merchant = {};
  const provided = new Set();

  const isUpdate = updateExisting && Boolean(match);

  for (const field of MERCHANT_FIELDS) {
    const value = cell(raw[field.key]);

    if (!value) {
      // On an update a blank cell means "leave this as it is", so a required
      // field is only demanded when the merchant is being created.
      if (field.required && field.default === undefined && !isUpdate) {
        errors.push(`${field.header} is required.`);
      }
      merchant[field.key] = field.default ?? (field.type === 'number' ? 0 : '');
      continue;
    }

    provided.add(field.key);

    if (field.options) {
      const matched = matchOption(value, field.options);
      if (!matched) {
        errors.push(`${field.header} "${value}" is not one of: ${field.options.join(', ')}.`);
        continue;
      }
      merchant[field.key] = matched;
      continue;
    }

    if (field.type === 'number') {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        errors.push(`${field.header} must be a number of zero or more.`);
        continue;
      }
      merchant[field.key] = Math.trunc(n);
      continue;
    }

    merchant[field.key] = value;
  }

  // A row that only carries a Portal ID and a logo still needs a name to show.
  if (isUpdate && !merchant.name) merchant.name = match.name;
  const name = merchant.name || '';

  if (duplicate) {
    errors.push('This merchant appears more than once in the file.');
  } else if (!updateExisting && (match || ambiguous)) {
    // `ambiguous` means two merchants already carry this name, so it exists twice over.
    errors.push('A merchant with this name already exists in the portal.');
  } else if (ambiguous) {
    errors.push(
      `Two merchants in the portal are called "${name}". Start from Download Current Merchants, which carries a ${ID_HEADER} for each row.`,
    );
  }

  if (merchant.status !== 'Inactive' && (merchant.reason || merchant.expiryLabel)) {
    warnings.push('Reason and Expired On are only shown for Inactive merchants.');
  }
  if (merchant.status === 'Inactive') {
    warnings.push('Inactive — this merchant goes to the archive.');
  }

  if (merchant.logoUrl && !/^https?:\/\//i.test(merchant.logoUrl)) {
    errors.push('Logo URL must start with http:// or https://.');
  }

  return { merchant, errors, warnings, provided: [...provided], updateId: isUpdate ? match.id : null };
}

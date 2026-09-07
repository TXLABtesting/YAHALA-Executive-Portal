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

/** Trims a cell and turns everything empty-ish into ''. */
const cell = (value) => {
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
 */
export function validateRow(raw, { existingNames, seenNames }) {
  const errors = [];
  const warnings = [];
  const merchant = {};

  for (const field of MERCHANT_FIELDS) {
    const value = cell(raw[field.key]);

    if (!value) {
      if (field.required && field.default === undefined) {
        errors.push(`${field.header} is required.`);
      }
      merchant[field.key] = field.default ?? (field.type === 'number' ? 0 : '');
      continue;
    }

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

  const name = merchant.name || '';
  const key = name.toLowerCase();

  if (name) {
    if (existingNames.has(key)) {
      errors.push('A merchant with this name already exists in the portal.');
    } else if (seenNames.has(key)) {
      errors.push('This name appears more than once in the file.');
    }
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

  return { merchant, errors, warnings };
}

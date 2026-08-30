/** Row shapes shared by the API and the frontend (camelCase, no nulls for text). */

export const CATEGORIES = [
  'Fashion & Retail',
  'Food & Drinks',
  'Beauty & Fitness',
  'Hotel & Travel',
  'Everyday Services',
  'Attractions & Leisure',
];

export const STAGES = [
  'Negotiation',
  'Contract Signed',
  'Artwork Received',
  'Offers Uploaded',
  'Ready for Launch',
];

export const STATUSES = ['Live', 'Coming Soon', 'Inactive'];
export const SOURCES = ['YAHALA Exclusive', 'Entertainer'];

const isoDate = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d || '');

export const merchantOut = (r) => ({
  id: r.id,
  name: r.name,
  category: r.category,
  sub: r.sub,
  offerType: r.offer_type,
  offerDesc: r.offer_desc,
  offers: r.offers,
  offerSource: r.offer_source,
  status: r.status,
  city: r.city,
  logo: r.logo,
  reason: r.reason,
  expiryLabel: r.expiry_label,
  archived: r.archived,
});

export const newsletterOut = (r) => ({
  id: r.id,
  title: r.title,
  date: isoDate(r.issue_date),
  desc: r.description,
  thumb: r.thumb,
  pdf: r.pdf,
  pdfName: r.pdf_name,
});

export const launchOut = (r) => ({
  id: r.id,
  name: r.name,
  category: r.category,
  date: isoDate(r.expected_date),
  stage: r.stage,
});

export const updateOut = (r) => ({
  id: r.id,
  type: r.type,
  title: r.title,
  detail: r.detail,
  time: r.time_label,
});

export const redeemerOut = (r) => ({
  id: r.id,
  name: r.name,
  redemptions: r.redemptions,
});

export const kpiOut = (r) => ({
  merchants: r.merchants,
  offers: r.offers,
  categories: r.categories,
  active: r.active,
  newUsers: r.new_users,
  redemptions: r.redemptions,
});

export const accommodationOut = (r) => ({
  total: r.total,
  from: isoDate(r.from_date),
  to: isoDate(r.to_date),
});

/** '' -> null for date columns, so Postgres does not reject an empty string. */
export const dateIn = (v) => {
  const s = String(v ?? '').trim();
  return s ? s : null;
};

export const intIn = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

export const textIn = (v, fallback = '') => {
  if (v === null || v === undefined) return fallback;
  return String(v);
};

/** Keeps a client value inside a known set, falling back to the first entry. */
export const oneOf = (v, allowed) => (allowed.includes(v) ? v : allowed[0]);

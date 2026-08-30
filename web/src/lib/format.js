/** Presentation helpers shared by the dashboard, directory and admin screens. */

export const CATEGORIES = [
  'Fashion & Retail',
  'Food & Drinks',
  'Beauty & Fitness',
  'Hotel & Travel',
  'Everyday Services',
  'Attractions & Leisure',
];

export const CATEGORY_META = {
  'Fashion & Retail': { icon: 'bag', tag: 'Boutiques & Luxury Houses' },
  'Food & Drinks': { icon: 'utensils', tag: 'Dining, Cafés & Chocolatiers' },
  'Beauty & Fitness': { icon: 'sparkles', tag: 'Salon, Spa & Wellness' },
  'Hotel & Travel': { icon: 'plane', tag: 'Stays & Curated Journeys' },
  'Everyday Services': { icon: 'wrench', tag: 'Home, Auto & Education' },
  'Attractions & Leisure': { icon: 'ticket', tag: 'Culture & Experiences' },
};

export const STAGES = [
  ['Negotiation', 20],
  ['Contract Signed', 40],
  ['Artwork Received', 60],
  ['Offers Uploaded', 80],
  ['Ready for Launch', 100],
];

export const STAGE_NAMES = STAGES.map(([name]) => name);

export const UPDATE_TYPES = [
  { value: 'live', label: 'Merchant Went Live' },
  { value: 'merchant', label: 'New Merchant Added' },
  { value: 'offers', label: 'New Offers Added' },
  { value: 'campaign', label: 'Campaign Started' },
  { value: 'update', label: 'Merchant Updated' },
];

export const UPDATE_META = {
  live: { icon: 'trending', bg: 'rgba(31,138,91,.1)', color: '#1F8A5B' },
  offers: { icon: 'tag', bg: 'var(--goldSoft)', color: '#8A6D2E' },
  campaign: { icon: 'bell', bg: 'rgba(60,74,120,.1)', color: '#3A4A78' },
  merchant: { icon: 'store', bg: 'rgba(31,138,91,.1)', color: '#1F8A5B' },
  update: { icon: 'pencil', bg: 'var(--paper)', color: 'var(--ink2)' },
};

const STOP_WORDS = ['&', 'the', 'of', 'de', 'la', 'le', 'al', 'and'];

export function initials(name) {
  const parts = String(name || '')
    .replace(/[^A-Za-z0-9 &]/g, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.includes(w.toLowerCase()));
  let s = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  if (!s) s = String(name || 'Y')[0] || 'Y';
  return s.toUpperCase();
}

export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-US');
}

export function stagePct(stage) {
  const found = STAGES.find(([name]) => name === stage);
  return found ? found[1] : 20;
}

export function stageColor(stage) {
  const p = stagePct(stage);
  if (p >= 100) return '#1F8A5B';
  if (p >= 60) return '#BC9A4F';
  return '#5B6485';
}

export function stageBar(stage) {
  const p = stagePct(stage);
  if (p >= 100) return 'linear-gradient(90deg,#2FA36B,#1F8A5B)';
  if (p >= 60) return 'linear-gradient(90deg,#DFC079,#BC9A4F)';
  return 'linear-gradient(90deg,#3A4A78,#243056)';
}

export const isEntertainer = (source) => source === 'Entertainer';

export function sourceMeta(source) {
  const ent = isEntertainer(source);
  return {
    label: ent ? 'Powered by Entertainer' : 'YAHALA Exclusive',
    entertainer: ent,
    dot: ent ? '#C9A24B' : '#5B82DC',
  };
}

export function shareText(m) {
  if (!m) return '';
  const src = isEntertainer(m.offerSource) ? 'Entertainer' : 'YAHALA Exclusive';
  const body = m.offerDesc?.trim()
    ? m.offerDesc.trim()
    : `Enjoy ${m.offerType || 'an exclusive offer'} at ${m.name}.`;
  return `${src} Offer – ${m.name} (${m.category})\n\n${body}\n\nShared via the YAHALA Executive Portal.`;
}

export function shareLinks(m) {
  const src = isEntertainer(m?.offerSource) ? 'Entertainer' : 'YAHALA Exclusive';
  const body = encodeURIComponent(shareText(m));
  const subject = encodeURIComponent(`${src} Offer – ${m?.name || ''}`);
  return {
    whatsapp: `https://wa.me/?text=${body}`,
    email: `mailto:?subject=${subject}&body=${body}`,
  };
}

export function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Reads a picked file as a data: URI, which the API turns into an upload. */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

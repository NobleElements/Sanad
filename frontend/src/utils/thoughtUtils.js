export const KEEP_COLORS = [
  { id: 'default', name: 'Default', bg: 'bg-white dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700', fade: 'from-white dark:from-slate-800', hex: '#FFFFFF' },
  { id: 'coral', name: 'Coral', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-900/60', fade: 'from-rose-50 dark:from-rose-950', hex: '#FECDD3' },
  { id: 'peach', name: 'Peach', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-900/60', fade: 'from-orange-50 dark:from-orange-950', hex: '#FED7AA' },
  { id: 'sand', name: 'Sand', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-900/60', fade: 'from-amber-50 dark:from-amber-950', hex: '#FEF08A' },
  { id: 'mint', name: 'Mint', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-900/60', fade: 'from-emerald-50 dark:from-emerald-950', hex: '#A7F3D0' },
  { id: 'sage', name: 'Sage', bg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-200 dark:border-teal-900/60', fade: 'from-teal-50 dark:from-teal-950', hex: '#99F6E4' },
  { id: 'fog', name: 'Fog', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-900/60', fade: 'from-blue-50 dark:from-blue-950', hex: '#BFDBFE' },
  { id: 'storm', name: 'Storm', bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-900/60', fade: 'from-indigo-50 dark:from-indigo-950', hex: '#C7D2FE' },
  { id: 'dusk', name: 'Dusk', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-900/60', fade: 'from-purple-50 dark:from-purple-950', hex: '#DDD6FE' },
  { id: 'blossom', name: 'Blossom', bg: 'bg-pink-50 dark:bg-pink-950/40', border: 'border-pink-200 dark:border-pink-900/60', fade: 'from-pink-50 dark:from-pink-950', hex: '#FBCFE8' },
  { id: 'clay', name: 'Clay', bg: 'bg-slate-100 dark:bg-slate-800/80', border: 'border-slate-300 dark:border-slate-700', fade: 'from-slate-100 dark:from-slate-800', hex: '#E2E8F0' },
];

export const getKeepColorStyle = (colorIdOrHex) => {
  if (!colorIdOrHex || colorIdOrHex === 'default') {
    return KEEP_COLORS[0];
  }
  const match = KEEP_COLORS.find(
    (c) => c.id === colorIdOrHex || c.hex.toLowerCase() === colorIdOrHex.toLowerCase()
  );
  return match || KEEP_COLORS[0];
};

export const COLLECTION_PALETTE = [
  '#6366F1', // Indigo
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Purple
];

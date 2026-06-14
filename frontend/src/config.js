export const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
export const API_URL = `${API_BASE}/api`;
export const BYTES_PER_KB = 1000;

/// <reference types="vite/client" />

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();

export const supabaseConfig = { url, key };
const validUrl = /^https:\/\/[^/]+$/.test(url) && !url.includes('YOUR_');
export const formConfigured = validUrl && Boolean(key) &&
  !key.startsWith('sb_secret_') && !key.includes('YOUR_');

// Public bucket and object path are intentionally stable. No signed URL expires.
export function heroVideoUrl(bucket: string, objectPath: string) {
  if (!validUrl) return '';
  return `${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
}

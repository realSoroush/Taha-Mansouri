import { supabaseConfig } from './config';

export function normalizePhone(value: string) {
  let phone = value.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[\s()\-]/g, '');
  if (phone.startsWith('0098')) phone = '+' + phone.slice(2);
  if (/^09\d{9}$/.test(phone)) phone = '+98' + phone.slice(1);
  if (/^98\d{10}$/.test(phone)) phone = '+' + phone;
  return /^\+989\d{9}$/.test(phone) ? phone : null;
}

export function normalizeName(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export async function submitLead(fullName: string, phone: string, requestId: string, website: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json', apikey: supabaseConfig.key,
    };
    // Legacy anon JWTs use Bearer; new publishable keys belong in apikey only.
    if (supabaseConfig.key.startsWith('eyJ')) headers.Authorization = `Bearer ${supabaseConfig.key}`;
    const response = await fetch(`${supabaseConfig.url}/rest/v1/rpc/submit_consultation_request`, {
      method: 'POST', headers, signal: controller.signal,
      body: JSON.stringify({ p_full_name: fullName, p_phone: phone, p_request_id: requestId, p_website: website }),
    });
    if (!response.ok) throw new Error('SUBMIT_FAILED');
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || !('accepted' in result) || result.accepted !== true) {
      throw new Error('INVALID_RESPONSE');
    }
  } finally { clearTimeout(timeout); }
}

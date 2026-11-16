import { createHash, randomBytes, randomUUID } from 'node:crypto';
import product from '../src/customer-objections.json' with { type: 'json' };

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const authorityPattern = /^[A-Za-z0-9]{20,80}$/;
const object = 'course-downloads/customer-objections/guide-v5.pdf';
const apiRoot = 'https://api.zarinpal.com/pg/v4/payment/';
const hash = token => createHash('sha256').update(token).digest('hex');
const cookieName = id => '__Host-taha-order-' + id;
const resultUrl = (id, result) => '/courses/' + product.slug + '/?order=' + id + '&result=' + result;

async function request(url, init) {
  const response = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('UPSTREAM');
  return response.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const send = (status, data) => res.status(status).json(data);
  const redirect = url => { res.setHeader('Location', url); res.status(303).end(); };
  const route = new URL(req.url, 'https://internal.invalid').searchParams;
  const action = route.get('action');
  const id = route.get('order') ?? '';
  const rawOrigin = process.env.COURSE_SITE_URL?.trim();
  const db = process.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const merchant = process.env.ZARINPAL_MERCHANT_ID?.trim();
  const enabled = process.env.COURSE_CHECKOUT_ENABLED === 'true';
  if (!db || !key || !merchant || !rawOrigin) return send(503, { error: 'unavailable' });
  try {
    const origin = new URL(rawOrigin);
    if (origin.protocol !== 'https:' || origin.username || origin.password) throw new Error('CONFIG');
    const tables = db + '/rest/v1/course_orders';
    const common = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
    const dbCall = (url, method, body) => request(url, {
      method, headers: { ...common, Prefer: 'return=representation' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const gateway = (name, params) => request(apiRoot + name + '.json', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant_id: merchant, ...params }),
    });
    async function signDownload() {
      const path = await request(db + '/storage/v1/object/sign/' + object, {
        method: 'POST', headers: common, body: JSON.stringify({ expiresIn: 120 }),
      });
      if (typeof path.signedURL !== 'string' || !path.signedURL.startsWith('/object/sign/' + object + '?')) throw new Error('SIGNING');
      return db + '/storage/v1' + path.signedURL + '&download=customer-objections.pdf';
    }

    if (action === 'start' && req.method === 'POST') {
      if (req.headers.origin !== origin.origin) return send(403, { error: 'origin' });
      if (!enabled) return send(503, { error: 'unavailable' });
      // Do not start a paid order if the private deliverable is missing.
      await signDownload();
      const orderId = randomUUID();
      const token = randomBytes(32).toString('hex');
      const amount = product.priceToman * 10;
      await dbCall(tables, 'POST', {
        id: orderId, product_slug: product.slug, buyer_token_hash: hash(token), amount_rial: amount,
      });
      const callback = new URL('/api/course-purchase', origin);
      callback.searchParams.set('action', 'callback');
      callback.searchParams.set('order', orderId);
      const { data } = await gateway('request', { amount, callback_url: callback.href, description: product.title });
      if (data?.code !== 100 || typeof data.authority !== 'string' || !authorityPattern.test(data.authority)) throw new Error('REQUEST');
      const saved = await dbCall(tables + '?id=eq.' + orderId, 'PATCH', { authority: data.authority });
      if (saved.length !== 1) throw new Error('ORDER');
      res.setHeader('Set-Cookie', cookieName(orderId) + '=' + token + '; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=31536000');
      return send(200, { order: orderId, gateway: 'https://www.zarinpal.com/pg/StartPay/' + data.authority });
    }

    if (!uuid.test(id)) return send(404, { error: 'order' });
    if (!((req.method === 'GET' && ['callback', 'status', 'download'].includes(action)) ||
      (req.method === 'POST' && action === 'recover'))) return send(405, { error: 'method' });
    if (action === 'recover' && req.headers.origin !== origin.origin) return send(403, { error: 'origin' });
    const orderUrl = tables + '?id=eq.' + id + '&product_slug=eq.' + product.slug;
    const [order] = await dbCall(orderUrl, 'GET');
    if (!order) return send(404, { error: 'order' });
    if (action === 'callback') {
      if (!order.authority || route.get('Authority') !== order.authority) return send(404, { error: 'order' });
      if (route.get('Status') !== 'OK') return redirect(resultUrl(id, order.paid_at ? 'paid' : 'pending'));
    } else {
      const token = (req.headers.cookie ?? '').split('; ').find(pair => pair.startsWith(cookieName(id) + '='))?.split('=')[1];
      if (!token || !/^[a-f0-9]{64}$/.test(token) || hash(token) !== order.buyer_token_hash) return send(404, { error: 'order' });
    }

    if ((action === 'callback' || action === 'recover') && !order.paid_at && order.authority) {
      const { data } = await gateway('verify', { amount: order.amount_rial, authority: order.authority });
      if (data?.code === 100 || data?.code === 101) {
        const updated = await dbCall(orderUrl + '&paid_at=is.null', 'PATCH', {
          paid_at: new Date().toISOString(), payment_ref: data.ref_id == null ? null : String(data.ref_id),
        });
        if (!updated.length) {
          const [again] = await dbCall(orderUrl, 'GET');
          if (!again?.paid_at) throw new Error('VERIFY_PERSIST');
        }
        order.paid_at = true;
      }
    }

    if (action === 'callback') return redirect(resultUrl(id, order.paid_at ? 'paid' : 'pending'));
    if (action === 'download') {
      if (!order.paid_at) return send(409, { error: 'unpaid' });
      return redirect(await signDownload());
    }
    return send(200, { paid: Boolean(order.paid_at) });
  } catch {
    if (req.method === 'GET' && action === 'callback' && uuid.test(id)) return redirect(resultUrl(id, 'pending'));
    return send(503, { error: 'unavailable' });
  }
}

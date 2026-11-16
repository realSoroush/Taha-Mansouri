import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/course-purchase.mjs';

test('checkout binds payment and download to the stored order and buyer', async t => {
  const site = 'https://taha.example';
  const db = 'https://storage.example';
  for (const [key, value] of Object.entries({ COURSE_SITE_URL: site, VITE_SUPABASE_URL: db,
    SUPABASE_SERVICE_ROLE_KEY: 'test', ZARINPAL_MERCHANT_ID: 'test', COURSE_CHECKOUT_ENABLED: 'true' })) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  let row, verified = 0, paid = false, missing = true;
  const authority = 'A00000000000000000000000000000000000';
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const parsed = new URL(url);
    const body = init.body ? JSON.parse(init.body) : null;
    const path = parsed.pathname;
    if (path.includes('/object/sign/')) return missing ? new Response(null, { status: 404 })
      : Response.json({ signedURL: '/object/sign/course-downloads/customer-objections/guide-v5.pdf?token=test' });
    if (path.endsWith('/request.json')) {
      assert.equal(body.amount, 20000000);
      assert.equal(new URL(body.callback_url).origin, site);
      return Response.json({ data: { code: 100, authority } });
    }
    if (path.endsWith('/verify.json')) {
      verified++;
      assert.equal(body.amount, row.amount_rial);
      assert.equal(body.authority, authority);
      return Response.json({ data: { code: paid ? 101 : -50, ref_id: 9 } });
    }
    if (path.endsWith('/course_orders')) {
      if (init.method === 'POST') row = { ...body };
      if (init.method === 'PATCH') Object.assign(row, body);
      return Response.json(row ? [row] : []);
    }
    throw new Error('unexpected request');
  });

  async function handle(url, method = 'GET', headers = {}) {
    const out = { headers: {}, code: 0 };
    const res = { setHeader(k, v) { out.headers[k] = v; }, status(v) { out.code = v; return this; },
      json(data) { out.data = data; }, end() {} };
    await handler({ url: '/api/course-purchase?' + url, method, headers }, res);
    return out;
  }
  assert.equal((await handle('action=start', 'POST', { origin: 'https://other.example' })).code, 403);
  assert.equal((await handle('action=start', 'POST', { origin: site })).code, 503);
  assert.equal(row, undefined);
  missing = false;
  const start = await handle('action=start', 'POST', { origin: site });
  assert.equal(start.code, 200);
  const order = '&order=' + start.data.order;
  const cookie = start.headers['Set-Cookie'].split(';')[0];
  assert.equal((await handle('action=download' + order)).code, 404);
  assert.equal((await handle('action=download' + order, 'GET', { cookie })).code, 409);
  assert.equal((await handle('action=callback' + order + '&Status=OK&Authority=wrong')).code, 404);
  assert.equal(verified, 0);
  const callback = 'action=callback' + order + '&Authority=' + authority;
  assert.match((await handle(callback + '&Status=NOK')).headers.Location, /pending$/);
  assert.match((await handle(callback + '&Status=OK')).headers.Location, /pending$/);
  assert.equal(verified, 1);
  paid = true;
  assert.equal((await handle('action=recover' + order, 'POST', { cookie, origin: site })).data.paid, true);
  assert.match((await handle(callback + '&Status=OK')).headers.Location, /paid$/);
  assert.equal(verified, 2);
  assert.equal((await handle('action=download' + order)).code, 404);
  const file = await handle('action=download' + order, 'GET', { cookie });
  assert.equal(file.code, 303);
  assert.match(file.headers.Location, /download=customer-objections.pdf$/);
});

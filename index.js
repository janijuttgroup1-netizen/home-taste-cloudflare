const LEGACY_ADMIN_HASH = 'sha256$c0fff6c2aa577cad31eac5fb716de9b093519518e81191b04431a2ed9206c445';
const encoder = new TextEncoder();

const INITIAL_SETTINGS = {
  businessName: 'Home Taste', tagline: 'Ghar jaisa zaika, dil se tayyar',
  whatsapp: '923719060887', currency: 'PKR',
  kitchen: 'Dera Mian, Near Rangers Colony, Mandi Bahauddin, Punjab, Pakistan',
  deliveryBands: [
    { upto: 3, fee: 0, label: 'Within 3 km' },
    { upto: 5, fee: 100, label: '3–5 km' },
    { upto: 8, fee: 180, label: '5–8 km' },
    { upto: 10, fee: 250, label: '8–10 km' },
    { upto: 999, fee: -1, label: 'Beyond 10 km – confirm with us' }
  ],
  minimumOrder: 300, open: true, openingTime: '10:00', closingTime: '22:00',
  announcement: 'Fresh home-cooked food, prepared with care. Order today!'
};
const INITIAL_CATEGORIES = [
  { id: 'cat1', name: 'Desi Specials', active: true },
  { id: 'cat2', name: 'Rice & Biryani', active: true },
  { id: 'cat3', name: 'BBQ & Grill', active: true },
  { id: 'cat4', name: 'Snacks', active: true },
  { id: 'cat5', name: 'Breakfast', active: true },
  { id: 'cat6', name: 'Desserts & Drinks', active: true }
];
const INITIAL_PRODUCTS = [
  { id: 'p1', name: 'Chicken Biryani', category: 'Rice & Biryani', description: 'Aromatic basmati rice, tender chicken and our homemade masala.', price: 350, active: true, featured: true, emoji: '🍛' },
  { id: 'p2', name: 'Chicken Karahi', category: 'Desi Specials', description: 'Traditional tomato and ginger karahi, freshly cooked to order.', price: 950, active: true, featured: true, emoji: '🍲' },
  { id: 'p3', name: 'Chicken Pulao', category: 'Rice & Biryani', description: 'Fragrant yakhni pulao with tender chicken.', price: 320, active: true, featured: false, emoji: '🍚' },
  { id: 'p4', name: 'Daal Chawal', category: 'Desi Specials', description: 'Comforting daal with steamed rice and salad.', price: 220, active: true, featured: false, emoji: '🥘' },
  { id: 'p5', name: 'Chicken Tikka', category: 'BBQ & Grill', description: 'Smoky, spicy chicken tikka with chutney.', price: 420, active: true, featured: true, emoji: '🍗' },
  { id: 'p6', name: 'Samosa (2 pcs)', category: 'Snacks', description: 'Crispy golden samosas with mint chutney.', price: 100, active: true, featured: false, emoji: '🥟' },
  { id: 'p7', name: 'Aloo Paratha', category: 'Breakfast', description: 'Flaky paratha stuffed with spiced potatoes.', price: 180, active: true, featured: false, emoji: '🫓' },
  { id: 'p8', name: 'Kheer', category: 'Desserts & Drinks', description: 'Traditional creamy rice pudding.', price: 150, active: true, featured: false, emoji: '🍮' }
];
const INITIAL_COUPONS = [{ id: 'c1', code: 'WELCOME10', type: 'percent', value: 10, minOrder: 500, active: true }];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}
function fail(message, status = 400) { return json({ error: message }, status); }
function clean(value, max = 500) { return String(value ?? '').trim().slice(0, max); }
function randomToken(bytes = 32) {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
async function digest(value) {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function makePasswordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 210000 }, key, 256);
  const toHex = a => [...new Uint8Array(a)].map(x => x.toString(16).padStart(2, '0')).join('');
  return `pbkdf2$210000$${toHex(salt)}$${toHex(bits)}`;
}
async function verifyPassword(password, stored) {
  if (stored?.startsWith('sha256$')) return (await digest(password)) === stored.slice(7);
  if (!stored?.startsWith('pbkdf2$')) return false;
  const [, iterations, saltHex, expected] = stored.split('$');
  const hexBytes = h => new Uint8Array((h.match(/.{2}/g) || []).map(x => parseInt(x, 16)));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexBytes(saltHex), iterations: Number(iterations) }, key, 256);
  const actual = [...new Uint8Array(bits)].map(x => x.toString(16).padStart(2, '0')).join('');
  return actual === expected;
}
async function ensureState(db) {
  await db.prepare(`INSERT OR IGNORE INTO app_state
    (id, settings_json, categories_json, products_json, coupons_json, expenses_json, admin_username, admin_password_hash)
    VALUES ('main', ?, ?, ?, ?, '[]', 'admin', ?)`)
    .bind(JSON.stringify(INITIAL_SETTINGS), JSON.stringify(INITIAL_CATEGORIES), JSON.stringify(INITIAL_PRODUCTS), JSON.stringify(INITIAL_COUPONS), LEGACY_ADMIN_HASH).run();
}
async function state(db) {
  await ensureState(db);
  const row = await db.prepare("SELECT * FROM app_state WHERE id='main'").first();
  return {
    settings: JSON.parse(row.settings_json), categories: JSON.parse(row.categories_json),
    products: JSON.parse(row.products_json), coupons: JSON.parse(row.coupons_json),
    expenses: JSON.parse(row.expenses_json), adminUsername: row.admin_username,
    adminPasswordHash: row.admin_password_hash
  };
}
async function saveState(db, s) {
  await db.prepare(`UPDATE app_state SET settings_json=?, categories_json=?, products_json=?, coupons_json=?, expenses_json=? WHERE id='main'`)
    .bind(JSON.stringify(s.settings), JSON.stringify(s.categories), JSON.stringify(s.products), JSON.stringify(s.coupons), JSON.stringify(s.expenses)).run();
}
async function readOrders(db) {
  const rows = await db.prepare('SELECT data_json FROM orders ORDER BY created_at DESC').all();
  return (rows.results || []).map(x => JSON.parse(x.data_json));
}
async function readCustomers(db) {
  const rows = await db.prepare('SELECT data_json FROM customers ORDER BY name COLLATE NOCASE').all();
  return (rows.results || []).map(x => JSON.parse(x.data_json));
}
async function authorized(request, db) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const tokenHash = await digest(token);
  const row = await db.prepare('SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at > ?').bind(tokenHash, new Date().toISOString()).first();
  return !!row;
}
async function route(request, env) {
  const db = env.DB;
  await ensureState(db);
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === 'GET' && path === '/api/store') {
    const s = await state(db);
    return json({ settings: s.settings, categories: s.categories.filter(x => x.active), products: s.products.filter(x => x.active), coupons: s.coupons.filter(x => x.active).map(({ code, type, value, minOrder }) => ({ code, type, value, minOrder })) });
  }
  if (request.method === 'POST' && path === '/api/login') {
    const b = await request.json().catch(() => ({}));
    const s = await state(db);
    const username = clean(b.username, 80), password = String(b.password || '');
    if (username !== s.adminUsername || !(await verifyPassword(password, s.adminPasswordHash))) return fail('Incorrect username or password', 401);
    if (s.adminPasswordHash.startsWith('sha256$')) {
      const upgraded = await makePasswordHash(password);
      await db.prepare("UPDATE app_state SET admin_password_hash=? WHERE id='main'").bind(upgraded).run();
    }
    const token = randomToken();
    const tokenHash = await digest(token);
    const expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    await db.prepare('INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)').bind(tokenHash, expires).run();
    return json({ token });
  }
  if (request.method === 'POST' && path === '/api/orders') {
    const b = await request.json().catch(() => ({}));
    const s = await state(db);
    const customer = b.customer || {};
    if (!clean(customer.name, 100) || !clean(customer.phone, 40) || !clean(customer.address, 500) || !Array.isArray(b.items) || !b.items.length) return fail('Please complete your contact details and cart.');
    const items = []; let subtotal = 0;
    for (const row of b.items.slice(0, 50)) {
      const p = s.products.find(x => x.id === row.id && x.active);
      const qty = Math.max(1, Math.min(50, Math.floor(Number(row.qty) || 1)));
      if (!p) continue;
      items.push({ id: p.id, name: p.name, price: Number(p.price), qty, lineTotal: Number(p.price) * qty });
      subtotal += Number(p.price) * qty;
    }
    if (!items.length) return fail('Your cart is empty.');
    if (subtotal < Number(s.settings.minimumOrder || 0)) return fail(`Minimum order is Rs. ${s.settings.minimumOrder}.`);
    const km = Number(b.distanceKm); let delivery = 0, deliveryLabel = 'Distance to be confirmed';
    if (b.distanceKm !== null && b.distanceKm !== '' && Number.isFinite(km) && km >= 0) {
      const band = s.settings.deliveryBands.find(x => km <= Number(x.upto));
      if (band) { delivery = Number(band.fee); deliveryLabel = delivery < 0 ? 'Admin confirmation required' : band.label; }
    }
    const couponCode = clean(b.coupon, 40).toUpperCase();
    const coupon = s.coupons.find(x => x.active && x.code.toUpperCase() === couponCode);
    let discount = 0;
    if (coupon && subtotal >= Number(coupon.minOrder || 0)) discount = coupon.type === 'percent' ? Math.round(subtotal * Number(coupon.value) / 100) : Math.min(subtotal, Number(coupon.value));
    const total = subtotal - discount + (delivery < 0 ? 0 : delivery);
    const order = {
      id: crypto.randomUUID(), number: 'HT-' + Date.now().toString().slice(-8), createdAt: new Date().toISOString(), status: 'New',
      customer: { name: clean(customer.name, 100), phone: clean(customer.phone, 40), address: clean(customer.address, 500), notes: clean(customer.notes, 1000) },
      items, subtotal, delivery, deliveryLabel, distanceKm: Number.isFinite(km) && b.distanceKm !== null && b.distanceKm !== '' ? km : null,
      discount, coupon: couponCode, total, payment: clean(b.payment || 'Cash on Delivery', 50)
    };
    await db.prepare('INSERT INTO orders (id, created_at, data_json) VALUES (?, ?, ?)').bind(order.id, order.createdAt, JSON.stringify(order)).run();
    const old = await db.prepare('SELECT data_json FROM customers WHERE phone=?').bind(order.customer.phone).first();
    if (old) {
      const c = JSON.parse(old.data_json); c.orders = Number(c.orders || 0) + 1; c.totalSpent = Number(c.totalSpent || 0) + total; c.name = order.customer.name; c.address = order.customer.address;
      await db.prepare('UPDATE customers SET name=?, data_json=? WHERE phone=?').bind(c.name, JSON.stringify(c), order.customer.phone).run();
    } else {
      const c = { id: crypto.randomUUID(), name: order.customer.name, phone: order.customer.phone, address: order.customer.address, orders: 1, totalSpent: total };
      await db.prepare('INSERT INTO customers (phone, name, data_json) VALUES (?, ?, ?)').bind(c.phone, c.name, JSON.stringify(c)).run();
    }
    return json({ order }, 201);
  }
  if (request.method === 'POST' && path === '/api/logout') {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (token) await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();
    return json({ ok: true });
  }
  if (path.startsWith('/api/admin/')) {
    if (!(await authorized(request, db))) return fail('Please sign in again.', 401);
    if (request.method === 'GET' && path === '/api/admin/summary') {
      const s = await state(db);
      return json({ orders: await readOrders(db), products: s.products, categories: s.categories, settings: { ...s.settings, adminUsername: s.adminUsername }, coupons: s.coupons, customers: await readCustomers(db), expenses: s.expenses });
    }
    if (request.method === 'PUT' && path.startsWith('/api/admin/')) {
      const section = path.slice('/api/admin/'.length); const value = await request.json().catch(() => null); const s = await state(db);
      if (section === 'settings') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('Invalid settings');
        s.settings = { ...s.settings, ...value };
        await saveState(db, s); return json({ ok: true });
      }
      if (['products', 'categories', 'coupons', 'expenses'].includes(section)) {
        if (!Array.isArray(value)) return fail('Expected a list');
        const col = { products: 'products_json', categories: 'categories_json', coupons: 'coupons_json', expenses: 'expenses_json' }[section];
        await db.prepare(`UPDATE app_state SET ${col}=? WHERE id='main'`).bind(JSON.stringify(value)).run();
        return json({ ok: true });
      }
      if (section === 'orders') {
        if (!Array.isArray(value)) return fail('Expected a list');
        const statements = [db.prepare('DELETE FROM orders')];
        for (const o of value) statements.push(db.prepare('INSERT INTO orders (id, created_at, data_json) VALUES (?, ?, ?)').bind(String(o.id), String(o.createdAt || new Date().toISOString()), JSON.stringify(o)));
        await db.batch(statements); return json({ ok: true });
      }
      return fail('Unknown section', 404);
    }
    if (request.method === 'POST' && path === '/api/admin/password') {
      const b = await request.json().catch(() => ({})); const s = await state(db);
      if (!(await verifyPassword(String(b.current || ''), s.adminPasswordHash))) return fail('Current password is incorrect');
      if (String(b.next || '').length < 12) return fail('Use at least 12 characters for a stronger password.');
      const hash = await makePasswordHash(String(b.next));
      await db.prepare("UPDATE app_state SET admin_password_hash=? WHERE id='main'").bind(hash).run();
      await db.prepare('DELETE FROM sessions').run();
      return json({ ok: true, message: 'Password changed. Please sign in again.' });
    }
  }
  return fail('Not found', 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await route(request, env);
      let assetRequest = request;
      if (url.pathname === '/admin' || url.pathname === '/admin/') {
        const target = new URL(request.url); target.pathname = '/admin.html';
        assetRequest = new Request(target, request);
      }
      const response = await env.ASSETS.fetch(assetRequest);
      const headers = new Headers(response.headers);
      headers.set('x-content-type-options', 'nosniff');
      headers.set('referrer-policy', 'strict-origin-when-cross-origin');
      headers.set('x-frame-options', 'DENY');
      headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
      return json({ error: 'Server error. Please try again.' }, 500);
    }
  }
};

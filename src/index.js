import { withEnv, readSession, db } from './compat.js';

import account from '../api/account.js';
import addresses from '../api/addresses.js';
import campaigns from '../api/campaigns.js';
import myOrders from '../api/my-orders.js';
import orders from '../api/orders.js';
import payCreate from '../api/payments/create.js';
import payVerify from '../api/payments/verify.js';
import products from '../api/products.js';
import productSlug from '../api/products/[slug].js';
import stories from '../api/stories.js';
import brandLogo from '../api/brand/logo.js';
import adminCampaigns from '../api/admin/campaigns.js';
import adminOrders from '../api/admin/orders.js';
import adminProducts from '../api/admin/products.js';
import adminStories from '../api/admin/stories.js';
import adminStoryUpload from '../api/admin/story-upload.js';
import adminUpload from '../api/admin/upload.js';
import productMedia from '../api/media/product/[id].js';
import productMediaKind from '../api/media/product/[id]/[kind].js';
import authRegister from '../api/auth/register.js';
import authLogin from '../api/auth/login.js';
import authSession from '../api/auth/session.js';
import authLogout from '../api/auth/logout.js';
import storageFile from '../api/storage/[...key].js';
import cleanupStories from '../api/cleanup-stories.js';
import submitStory from '../api/stories/submit.js';

const routes = [
  ['POST', '/api/auth/register', authRegister],
  ['POST', '/api/auth/login', authLogin],
  ['GET', '/api/auth/session', authSession],
  ['POST', '/api/auth/logout', authLogout],
  ['GET', '/api/brand/logo', brandLogo],
  ['GET', '/api/products', products],
  ['GET', '/api/stories', stories],
  ['POST', '/api/stories/submit', submitStory],
  ['GET', '/api/campaigns', campaigns],
  ['GET', '/api/my-orders', myOrders],
  ['GET', '/api/account', account],
  ['PUT', '/api/account', account],
  ['DELETE', '/api/account', account],
  ['GET', '/api/addresses', addresses],
  ['POST', '/api/addresses', addresses],
  ['PUT', '/api/addresses', addresses],
  ['DELETE', '/api/addresses', addresses],
  ['POST', '/api/orders', orders],
  ['POST', '/api/payments/create', payCreate],
  ['POST', '/api/payments/verify', payVerify],
  ['GET', '/api/admin/products', adminProducts],
  ['POST', '/api/admin/products', adminProducts],
  ['PUT', '/api/admin/products', adminProducts],
  ['DELETE', '/api/admin/products', adminProducts],
  ['GET', '/api/admin/orders', adminOrders],
  ['PUT', '/api/admin/orders', adminOrders],
  ['GET', '/api/admin/stories', adminStories],
  ['POST', '/api/admin/stories', adminStories],
  ['PUT', '/api/admin/stories', adminStories],
  ['DELETE', '/api/admin/stories', adminStories],
  ['GET', '/api/admin/campaigns', adminCampaigns],
  ['POST', '/api/admin/campaigns', adminCampaigns],
  ['PUT', '/api/admin/campaigns', adminCampaigns],
  ['DELETE', '/api/admin/campaigns', adminCampaigns],
  ['POST', '/api/admin/upload', adminUpload],
  ['POST', '/api/admin/story-upload', adminStoryUpload],
  ['POST', '/api/cleanup-stories', cleanupStories],
  ['GET', '/api/media/product/:id', productMedia],
  ['GET', '/api/media/product/:id/:kind', productMediaKind]
];

const ACCOUNT_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" type="image/jpeg" href="/api/brand/logo">
  <link rel="apple-touch-icon" href="/api/brand/logo">
  <title>My Account — Alivèra Atelier</title>
  <link rel="stylesheet" href="/styles.css">
  <style>
    .nav .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; font-family: serif; letter-spacing: 1.5px; color: inherit; }
    .nav .brand img { height: 38px; width: auto; object-fit: contain; }
  </style>
</head>
<body>
<header class="nav">
  <a class="brand" href="/">
    <img src="/api/brand/logo" alt="Alivèra Atelier">
    <span>ATELIER</span>
  </a>
  <a href="/">← Continue shopping</a>
</header>
<main class="account section">
  <div id="accountApp"><p>Loading your account…</p></div>
</main>
<script>
const A = {
  getSession: async () => {
    const r = await fetch('/api/auth/session');
    return r.json();
  },
  signOut: async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
  }
};
const API = '/api';
let addresses = [];
let editId = null;
const esc = s => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

async function load() {
  const session = await A.getSession();
  if (!session?.user) {
    location.href = '/login?next=/my-account';
    return;
  }
  const r = await fetch(API + '/account');
  const j = await r.json();
  addresses = j.addresses || [];
  render(j);
}

function render(j) {
  document.getElementById('accountApp').innerHTML = \`
    <p class="eyebrow">MY ACCOUNT</p>
    <h1 class="accounttitle">Hello, \${esc(j.user.name || j.user.email.split('@')[0])}.</h1>
    <div class="accountgrid">
      <section class="accountcard">
        <h2>Contact details</h2>
        <p class="muted">Email · \${esc(j.user.email)}</p>
        <label class="field"><span>Phone number</span><input id="phone" value="\${esc(j.profile.phone)}" inputmode="tel"></label>
        <button class="btn dark" onclick="savePhone()">Save phone number</button>
      </section>
      <section class="accountcard">
        <div class="cardhead">
          <h2>Saved addresses</h2>
          <button class="btn" style="border:1px solid var(--line);background:#fff" onclick="editAddress()">+ Add address</button>
        </div>
        <div id="addresses">\${addresses.length ? addresses.map(addressCard).join('') : '<p class="muted">No saved addresses yet.</p>'}</div>
      </section>
      <section class="accountcard">
        <h2>Share your Alivèra story</h2>
        <p class="muted">Your story will be visible for 24 hours. It is checked automatically before it is published.</p>
        <form id="storyForm">
          <label class="field"><span>Photo</span><input id="storyPhoto" type="file" accept="image/*" required></label>
          <label class="field"><span>Caption</span><textarea id="storyCaption" rows="3" maxlength="500" placeholder="Tell us about your look…"></textarea></label>
          <label class="field"><span>What are you wearing?</span><select id="storyProduct"><option value="">Select a product (optional)</option></select></label>
          <button class="btn dark" type="submit">Share for 24 hours</button>
          <p id="storyMessage" class="muted" style="margin-top:10px"></p>
        </form>
      </section>
      <section class="accountcard danger">
        <h2>Account</h2>
        <p class="muted">Deactivate your Alivèra Atelier account. Your order records may be retained for business and legal records, but they will no longer be linked to your customer profile.</p>
        <button class="btn dangerbtn" onclick="deactivate()">Deactivate account</button>
      </section>
    </div>
    <div id="addressModal" class="modal">
      <div class="modalbox">
        <button class="close" onclick="closeAddress()">×</button>
        <p class="eyebrow">DELIVERY ADDRESS</p>
        <h2 class="checkouttitle">\${editId ? 'Edit address' : 'Add address'}</h2>
        <form id="addressForm">
          <div class="formgrid">
            <div class="field"><label>Label</label><input name="label" value="\${editId ? esc(addresses.find(x => x.id === editId)?.label || 'Home') : 'Home'}"></div>
            <div class="field"><label>Recipient name</label><input name="recipient_name" value="\${editId ? esc(addresses.find(x => x.id === editId)?.recipient_name || '') : ''}" required></div>
            <div class="field"><label>Phone</label><input name="phone" value="\${editId ? esc(addresses.find(x => x.id === editId)?.phone || '') : ''}" required></div>
            <div class="field"><label>Pincode</label><input name="pincode" value="\${editId ? esc(addresses.find(x => x.id === editId)?.pincode || '') : ''}" required></div>
            <div class="field wide"><label>Address</label><textarea name="address" required>\${editId ? esc(addresses.find(x => x.id === editId)?.address || '') : ''}</textarea></div>
            <div class="field"><label>City</label><input name="city" value="\${editId ? esc(addresses.find(x => x.id === editId)?.city || '') : ''}" required></div>
            <div class="field"><label>State</label><input name="state" value="\${editId ? esc(addresses.find(x => x.id === editId)?.state || '') : ''}" required></div>
            <label style="font-size:12px"><input type="checkbox" name="is_default" \${editId && addresses.find(x => x.id === editId)?.is_default ? 'checked' : ''}> Make default address</label>
          </div>
          <button class="btn dark full" style="margin-top:18px">Save address</button>
        </form>
      </div>
    </div>\`;
  
  document.getElementById('addressForm').onsubmit = saveAddress;
  document.getElementById('storyForm').onsubmit = submitStory;
  loadStoryProducts();
}

function addressCard(x) {
  return \`<div class="address"><div><b>\${esc(x.label)} \${x.is_default ? '<small>DEFAULT</small>' : ''}</b><p>\${esc(x.recipient_name)} · \${esc(x.phone)}<br>\${esc(x.address)}, \${esc(x.city)}, \${esc(x.state)} — \${esc(x.pincode)}</p></div><div><button onclick="editAddress('\${x.id}')">Edit</button> <button onclick="deleteAddress('\${x.id}')">Delete</button></div></div>\`;
}

async function savePhone() {
  const r = await fetch(API + '/account', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: document.getElementById('phone').value })
  });
  if (r.ok) alert('Phone number updated.');
  else alert('Could not update phone number.');
}

function editAddress(id = '') {
  editId = id;
  const x = editId ? addresses.find(a => a.id === editId) : null;
  document.getElementById('addressModal')?.remove();
  document.body.insertAdjacentHTML('beforeend', \`<div id="addressModal" class="modal show"><div class="modalbox"><button class="close" onclick="closeAddress()">×</button><p class="eyebrow">DELIVERY ADDRESS</p><h2 class="checkouttitle">\${editId ? 'Edit address' : 'Add address'}</h2><form id="addressForm"><div class="formgrid"><div class="field"><label>Label</label><input name="label" value="\${esc(x?.label || 'Home')}"></div><div class="field"><label>Recipient name</label><input name="recipient_name" value="\${esc(x?.recipient_name || '')}" required></div><div class="field"><label>Phone</label><input name="phone" value="\${esc(x?.phone || '')}" required></div><div class="field"><label>Pincode</label><input name="pincode" value="\${esc(x?.pincode || '')}" required></div><div class="field wide"><label>Address</label><textarea name="address" required>\${esc(x?.address || '')}</textarea></div><div class="field"><label>City</label><input name="city" value="\${esc(x?.city || '')}" required></div><div class="field"><label>State</label><input name="state" value="\${esc(x?.state || '')}" required></div></div><label style="font-size:12px;display:block;margin-top:14px"><input type="checkbox" name="is_default" \${x?.is_default ? 'checked' : ''}> Make default address</label><button class="btn dark full" style="margin-top:18px">Save address</button></form></div></div>\`);
  document.getElementById('addressForm').onsubmit = saveAddress;
}

function closeAddress() {
  document.getElementById('addressModal')?.classList.remove('show');
  editId = null;
}

async function saveAddress(e) {
  e.preventDefault();
  const b = Object.fromEntries(new FormData(e.target));
  b.is_default = e.target.is_default.checked;
  const r = await fetch(API + '/addresses', {
    method: editId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(editId ? { ...b, id: editId } : b)
  });
  if (!r.ok) {
    alert((await r.json()).error || 'Could not save address.');
    return;
  }
  closeAddress();
  load();
}

async function deleteAddress(id) {
  if (!confirm('Delete this saved address?')) return;
  await fetch(API + '/addresses', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  load();
}

async function deactivate() {
  const word = prompt('This will deactivate your Alivèra Atelier account. Type DELETE to confirm.');
  if (word !== 'DELETE') return;
  const r = await fetch(API + '/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: 'DELETE' })
  });
  if (r.ok) {
    await A.signOut();
    location.href = '/';
  } else alert((await r.json()).error || 'Could not deactivate account.');
}

async function loadStoryProducts() {
  try {
    const r = await fetch(API + '/products');
    const ps = await r.json();
    document.getElementById('storyProduct').innerHTML = '<option value="">Select a product (optional)</option>' + ps.filter(p => p.active !== false).map(p => \`<option value="\${esc(p.id)}">\${esc(p.name)}</option>\`).join('');
  } catch {}
}

async function submitStory(e) {
  e.preventDefault();
  const msg = document.getElementById('storyMessage');
  const file = document.getElementById('storyPhoto').files[0];
  if (!file) {
    msg.textContent = 'Please choose a photo.';
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    msg.textContent = 'Please keep your photo under 4MB.';
    return;
  }
  msg.textContent = 'Checking your story…';
  const fd = new FormData();
  fd.append('photo', file);
  fd.append('caption', document.getElementById('storyCaption').value);
  fd.append('product_id', document.getElementById('storyProduct').value);
  try {
    const r = await fetch(API + '/stories/submit', { method: 'POST', body: fd });
    const j = await r.json();
    if (!r.ok) {
      msg.textContent = (j.error || 'Could not share your story.') + (j.warning ? ' ' + j.warning : '');
      return;
    }
    msg.textContent = j.message || 'Your story is live for 24 hours.';
    e.target.reset();
  } catch {
    msg.textContent = 'Could not share your story. Please try again.';
  }
}

load();
</script>
</body>
</html>`;

function matchPath(pattern, path) {
  const pp = pattern.split('/').filter(Boolean), xp = path.split('/').filter(Boolean); 
  if (pp.length !== xp.length) return null;
  const params = {}; 
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(xp[i]); 
    else if (pp[i] !== xp[i]) return null;
  } 
  return params;
}

function findRoute(method, path) {
  for (const [m, p, h] of routes) {
    if (m === method) {
      const params = matchPath(p, path);
      if (params) return { handler: h, params };
    }
  }
  if (method === 'GET' && path.startsWith('/api/storage/')) return { handler: storageFile, params: { key: path.slice('/api/storage/'.length) } };
  if (method === 'GET' && path.startsWith('/api/products/')) return { handler: productSlug, params: { slug: decodeURIComponent(path.slice('/api/products/'.length)) } };
  return null;
}

function makeResponse() {
  let status = 200, headers = new Headers();
  const out = {
    statusCode: () => status,
    setHeader(k, v) { headers.set(k, String(v)); },
    status(n) { status = n; return out; },
    json(obj) { return new Response(JSON.stringify(obj), { status, headers: new Headers([...headers, ['Content-Type', 'application/json; charset=utf-8']]) }); },
    send(body) { return new Response(body, { status, headers }); }
  }; 
  return out;
}

async function parseRequestBody(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await request.json().catch(() => ({}));
  if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
    const fd = await request.formData(); const body = {}; const files = [];
    for (const [k, v] of fd.entries()) {
      if (typeof v === 'string') body[k] = v;
      else if (v && typeof v.arrayBuffer === 'function') files.push({ fieldname: k, filename: v.name, contentType: v.type, buffer: new Uint8Array(await v.arrayBuffer()) });
    }
    return { __form: true, body, files };
  }
  return {};
}

async function getUser(request) {
  const session = await readSession(request); 
  if (!session?.id) return null;
  const r = await db.query('SELECT id,email,name,active FROM users WHERE id=$1 LIMIT 1', [session.id]);
  const u = r.rows[0]; 
  return u && u.active ? u : null;
}

function isAdmin(user, env) {
  if (!user) return false; 
  const list = String(env.ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean); 
  return list.includes(String(user.email).toLowerCase());
}

async function dispatch(request, env) {
  const url = new URL(request.url), path = url.pathname.replace(/\/$/, '') || '/';
  
  // Serve the account page directly at /my-account
  if (request.method === 'GET' && path === '/my-account') {
    return new Response(ACCOUNT_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  const route = findRoute(request.method, path);
  if (route) {
    const user = await getUser(request);
    const access = route.handler.access || 'public';
    if (access === 'user' && !user) return new Response(JSON.stringify({ error: 'Please sign in first.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    if (access === 'admin' && !isAdmin(user, env)) return new Response(JSON.stringify({ error: 'Owner access required.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    if (route.handler.methods && !route.handler.methods.includes(request.method)) return new Response('Method not allowed', { status: 405 });
    const parsed = await parseRequestBody(request);
    const req = { method: request.method, headers: Object.fromEntries(request.headers.entries()), body: parsed.__form ? parsed.body : parsed, files: parsed.__form ? parsed.files : [], params: route.params, user, member: user, query: Object.fromEntries(url.searchParams.entries()), env };
    const res = makeResponse();
    try { 
      const result = await route.handler(req, res); 
      return result instanceof Response ? result : res.json(result ?? { ok: true }); 
    }
    catch (e) { 
      console.error(e); 
      return res.status(500).json({ error: e?.message || 'Server error.' }); 
    }
  }
  if (env.ASSETS) {
    let assetPath = path;
    if (path === '/login') assetPath = '/login.html';
    if (path === '/admin' || path === '/admin/') assetPath = '/admin/index.html';

    const assetReq = new Request(new URL(assetPath, request.url), request);
    const r = await env.ASSETS.fetch(assetReq);
    if (r.status !== 404) return r;
    return env.ASSETS.fetch(request);
  }
  return new Response('Not found', { status: 404 });
}

export default {
  async fetch(request, env, ctx) {
    return withEnv(env, () => dispatch(request, env));
  },
  async scheduled(event, env, ctx) {
    return withEnv(env, async () => {
      const req = {
        method: 'POST',
        headers: { 'x-hatchable-trigger': 'cron' },
        body: {},
        files: [],
        params: {},
        user: null,
        member: null,
        query: {}
      };
      const res = makeResponse();
      try {
        const result = await cleanupStories(req, res);
        return result instanceof Response ? result : res.json(result ?? { ok: true });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e?.message || 'Story cleanup failed.' });
      }
    });
  }
};  ['GET', '/api/stories', stories],
  ['POST', '/api/stories/submit', submitStory],
  ['GET', '/api/campaigns', campaigns],
  ['GET', '/api/my-orders', myOrders],
  ['GET', '/api/account', account],
  ['PUT', '/api/account', account],
  ['DELETE', '/api/account', account],
  ['GET', '/api/addresses', addresses],
  ['POST', '/api/addresses', addresses],
  ['PUT', '/api/addresses', addresses],
  ['DELETE', '/api/addresses', addresses],
  ['POST', '/api/orders', orders],
  ['POST', '/api/payments/create', payCreate],
  ['POST', '/api/payments/verify', payVerify],
  ['GET', '/api/admin/products', adminProducts],
  ['POST', '/api/admin/products', adminProducts],
  ['PUT', '/api/admin/products', adminProducts],
  ['DELETE', '/api/admin/products', adminProducts],
  ['GET', '/api/admin/orders', adminOrders],
  ['PUT', '/api/admin/orders', adminOrders],
  ['GET', '/api/admin/stories', adminStories],
  ['POST', '/api/admin/stories', adminStories],
  ['PUT', '/api/admin/stories', adminStories],
  ['DELETE', '/api/admin/stories', adminStories],
  ['GET', '/api/admin/campaigns', adminCampaigns],
  ['POST', '/api/admin/campaigns', adminCampaigns],
  ['PUT', '/api/admin/campaigns', adminCampaigns],
  ['DELETE', '/api/admin/campaigns', adminCampaigns],
  ['POST', '/api/admin/upload', adminUpload],
  ['POST', '/api/admin/story-upload', adminStoryUpload],
  ['POST', '/api/cleanup-stories', cleanupStories],
  ['GET', '/api/media/product/:id', productMedia],
  ['GET', '/api/media/product/:id/:kind', productMediaKind]
];

const ACCOUNT_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" type="image/jpeg" href="/api/brand/logo">
  <link rel="apple-touch-icon" href="/api/brand/logo">
  <title>My Account — Alivèra Atelier</title>
  <link rel="stylesheet" href="/styles.css">
  <style>
    .nav .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; font-family: serif; letter-spacing: 1.5px; color: inherit; }
    .nav .brand img { height: 38px; width: auto; object-fit: contain; }
  </style>
</head>
<body>
<header class="nav">
  <a class="brand" href="/">
    <img src="/api/brand/logo" alt="Alivèra Atelier">
    <span>ATELIER</span>
  </a>
  <a href="/">← Continue shopping</a>
</header>
<main class="account section">
  <div id="accountApp"><p>Loading your account…</p></div>
</main>
<script>
const A = {
  getSession: async () => {
    const r = await fetch('/api/auth/session');
    return r.json();
  },
  signOut: async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
  }
};
const API = '/api';
let addresses = [];
let editId = null;
const esc = s => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

async function load() {
  const session = await A.getSession();
  if (!session?.user) {
    location.href = '/login?next=/account';
    return;
  }
  const r = await fetch(API + '/account');
  const j = await r.json();
  addresses = j.addresses || [];
  render(j);
}

function render(j) {
  document.getElementById('accountApp').innerHTML = \`
    <p class="eyebrow">MY ACCOUNT</p>
    <h1 class="accounttitle">Hello, \${esc(j.user.name || j.user.email.split('@')[0])}.</h1>
    <div class="accountgrid">
      <section class="accountcard">
        <h2>Contact details</h2>
        <p class="muted">Email · \${esc(j.user.email)}</p>
        <label class="field"><span>Phone number</span><input id="phone" value="\${esc(j.profile.phone)}" inputmode="tel"></label>
        <button class="btn dark" onclick="savePhone()">Save phone number</button>
      </section>
      <section class="accountcard">
        <div class="cardhead">
          <h2>Saved addresses</h2>
          <button class="btn" style="border:1px solid var(--line);background:#fff" onclick="editAddress()">+ Add address</button>
        </div>
        <div id="addresses">\${addresses.length ? addresses.map(addressCard).join('') : '<p class="muted">No saved addresses yet.</p>'}</div>
      </section>
      <section class="accountcard">
        <h2>Share your Alivèra story</h2>
        <p class="muted">Your story will be visible for 24 hours. It is checked automatically before it is published.</p>
        <form id="storyForm">
          <label class="field"><span>Photo</span><input id="storyPhoto" type="file" accept="image/*" required></label>
          <label class="field"><span>Caption</span><textarea id="storyCaption" rows="3" maxlength="500" placeholder="Tell us about your look…"></textarea></label>
          <label class="field"><span>What are you wearing?</span><select id="storyProduct"><option value="">Select a product (optional)</option></select></label>
          <button class="btn dark" type="submit">Share for 24 hours</button>
          <p id="storyMessage" class="muted" style="margin-top:10px"></p>
        </form>
      </section>
      <section class="accountcard danger">
        <h2>Account</h2>
        <p class="muted">Deactivate your Alivèra Atelier account. Your order records may be retained for business and legal records, but they will no longer be linked to your customer profile.</p>
        <button class="btn dangerbtn" onclick="deactivate()">Deactivate account</button>
      </section>
    </div>
    <div id="addressModal" class="modal">
      <div class="modalbox">
        <button class="close" onclick="closeAddress()">×</button>
        <p class="eyebrow">DELIVERY ADDRESS</p>
        <h2 class="checkouttitle">\${editId ? 'Edit address' : 'Add address'}</h2>
        <form id="addressForm">
          <div class="formgrid">
            <div class="field"><label>Label</label><input name="label" value="\${editId ? esc(addresses.find(x => x.id === editId)?.label || 'Home') : 'Home'}"></div>
            <div class="field"><label>Recipient name</label><input name="recipient_name" value="\${editId ? esc(addresses.find(x => x.id === editId)?.recipient_name || '') : ''}" required></div>
            <div class="field"><label>Phone</label><input name="phone" value="\${editId ? esc(addresses.find(x => x.id === editId)?.phone || '') : ''}" required></div>
            <div class="field"><label>Pincode</label><input name="pincode" value="\${editId ? esc(addresses.find(x => x.id === editId)?.pincode || '') : ''}" required></div>
            <div class="field wide"><label>Address</label><textarea name="address" required>\${editId ? esc(addresses.find(x => x.id === editId)?.address || '') : ''}</textarea></div>
            <div class="field"><label>City</label><input name="city" value="\${editId ? esc(addresses.find(x => x.id === editId)?.city || '') : ''}" required></div>
            <div class="field"><label>State</label><input name="state" value="\${editId ? esc(addresses.find(x => x.id === editId)?.state || '') : ''}" required></div>
            <label style="font-size:12px"><input type="checkbox" name="is_default" \${editId && addresses.find(x => x.id === editId)?.is_default ? 'checked' : ''}> Make default address</label>
          </div>
          <button class="btn dark full" style="margin-top:18px">Save address</button>
        </form>
      </div>
    </div>\`;
  
  document.getElementById('addressForm').onsubmit = saveAddress;
  document.getElementById('storyForm').onsubmit = submitStory;
  loadStoryProducts();
}

function addressCard(x) {
  return \`<div class="address"><div><b>\${esc(x.label)} \${x.is_default ? '<small>DEFAULT</small>' : ''}</b><p>\${esc(x.recipient_name)} · \${esc(x.phone)}<br>\${esc(x.address)}, \${esc(x.city)}, \${esc(x.state)} — \${esc(x.pincode)}</p></div><div><button onclick="editAddress('\${x.id}')">Edit</button> <button onclick="deleteAddress('\${x.id}')">Delete</button></div></div>\`;
}

async function savePhone() {
  const r = await fetch(API + '/account', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: document.getElementById('phone').value })
  });
  if (r.ok) alert('Phone number updated.');
  else alert('Could not update phone number.');
}

function editAddress(id = '') {
  editId = id;
  const x = editId ? addresses.find(a => a.id === editId) : null;
  document.getElementById('addressModal')?.remove();
  document.body.insertAdjacentHTML('beforeend', \`<div id="addressModal" class="modal show"><div class="modalbox"><button class="close" onclick="closeAddress()">×</button><p class="eyebrow">DELIVERY ADDRESS</p><h2 class="checkouttitle">\${editId ? 'Edit address' : 'Add address'}</h2><form id="addressForm"><div class="formgrid"><div class="field"><label>Label</label><input name="label" value="\${esc(x?.label || 'Home')}"></div><div class="field"><label>Recipient name</label><input name="recipient_name" value="\${esc(x?.recipient_name || '')}" required></div><div class="field"><label>Phone</label><input name="phone" value="\${esc(x?.phone || '')}" required></div><div class="field"><label>Pincode</label><input name="pincode" value="\${esc(x?.pincode || '')}" required></div><div class="field wide"><label>Address</label><textarea name="address" required>\${esc(x?.address || '')}</textarea></div><div class="field"><label>City</label><input name="city" value="\${esc(x?.city || '')}" required></div><div class="field"><label>State</label><input name="state" value="\${esc(x?.state || '')}" required></div></div><label style="font-size:12px;display:block;margin-top:14px"><input type="checkbox" name="is_default" \${x?.is_default ? 'checked' : ''}> Make default address</label><button class="btn dark full" style="margin-top:18px">Save address</button></form></div></div>\`);
  document.getElementById('addressForm').onsubmit = saveAddress;
}

function closeAddress() {
  document.getElementById('addressModal')?.classList.remove('show');
  editId = null;
}

async function saveAddress(e) {
  e.preventDefault();
  const b = Object.fromEntries(new FormData(e.target));
  b.is_default = e.target.is_default.checked;
  const r = await fetch(API + '/addresses', {
    method: editId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(editId ? { ...b, id: editId } : b)
  });
  if (!r.ok) {
    alert((await r.json()).error || 'Could not save address.');
    return;
  }
  closeAddress();
  load();
}

async function deleteAddress(id) {
  if (!confirm('Delete this saved address?')) return;
  await fetch(API + '/addresses', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  load();
}

async function deactivate() {
  const word = prompt('This will deactivate your Alivèra Atelier account. Type DELETE to confirm.');
  if (word !== 'DELETE') return;
  const r = await fetch(API + '/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: 'DELETE' })
  });
  if (r.ok) {
    await A.signOut();
    location.href = '/';
  } else alert((await r.json()).error || 'Could not deactivate account.');
}

async function loadStoryProducts() {
  try {
    const r = await fetch(API + '/products');
    const ps = await r.json();
    document.getElementById('storyProduct').innerHTML = '<option value="">Select a product (optional)</option>' + ps.filter(p => p.active !== false).map(p => \`<option value="\${esc(p.id)}">\${esc(p.name)}</option>\`).join('');
  } catch {}
}

async function submitStory(e) {
  e.preventDefault();
  const msg = document.getElementById('storyMessage');
  const file = document.getElementById('storyPhoto').files[0];
  if (!file) {
    msg.textContent = 'Please choose a photo.';
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    msg.textContent = 'Please keep your photo under 4MB.';
    return;
  }
  msg.textContent = 'Checking your story…';
  const fd = new FormData();
  fd.append('photo', file);
  fd.append('caption', document.getElementById('storyCaption').value);
  fd.append('product_id', document.getElementById('storyProduct').value);
  try {
    const r = await fetch(API + '/stories/submit', { method: 'POST', body: fd });
    const j = await r.json();
    if (!r.ok) {
      msg.textContent = (j.error || 'Could not share your story.') + (j.warning ? ' ' + j.warning : '');
      return;
    }
    msg.textContent = j.message || 'Your story is live for 24 hours.';
    e.target.reset();
  } catch {
    msg.textContent = 'Could not share your story. Please try again.';
  }
}

load();
</script>
</body>
</html>`;

function matchPath(pattern, path) {
  const pp = pattern.split('/').filter(Boolean), xp = path.split('/').filter(Boolean); 
  if (pp.length !== xp.length) return null;
  const params = {}; 
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(xp[i]); 
    else if (pp[i] !== xp[i]) return null;
  } 
  return params;
}

function findRoute(method, path) {
  for (const [m, p, h] of routes) {
    if (m === method) {
      const params = matchPath(p, path);
      if (params) return { handler: h, params };
    }
  }
  if (method === 'GET' && path.startsWith('/api/storage/')) return { handler: storageFile, params: { key: path.slice('/api/storage/'.length) } };
  if (method === 'GET' && path.startsWith('/api/products/')) return { handler: productSlug, params: { slug: decodeURIComponent(path.slice('/api/products/'.length)) } };
  return null;
}

function makeResponse() {
  let status = 200, headers = new Headers();
  const out = {
    statusCode: () => status,
    setHeader(k, v) { headers.set(k, String(v)); },
    status(n) { status = n; return out; },
    json(obj) { return new Response(JSON.stringify(obj), { status, headers: new Headers([...headers, ['Content-Type', 'application/json; charset=utf-8']]) }); },
    send(body) { return new Response(body, { status, headers }); }
  }; 
  return out;
}

async function parseRequestBody(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await request.json().catch(() => ({}));
  if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
    const fd = await request.formData(); const body = {}; const files = [];
    for (const [k, v] of fd.entries()) {
      if (typeof v === 'string') body[k] = v;
      else if (v && typeof v.arrayBuffer === 'function') files.push({ fieldname: k, filename: v.name, contentType: v.type, buffer: new Uint8Array(await v.arrayBuffer()) });
    }
    return { __form: true, body, files };
  }
  return {};
}

async function getUser(request) {
  const session = await readSession(request); 
  if (!session?.id) return null;
  const r = await db.query('SELECT id,email,name,active FROM users WHERE id=$1 LIMIT 1', [session.id]);
  const u = r.rows[0]; 
  return u && u.active ? u : null;
}

function isAdmin(user, env) {
  if (!user) return false; 
  const list = String(env.ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean); 
  return list.includes(String(user.email).toLowerCase());
}

async function dispatch(request, env) {
  const url = new URL(request.url), path = url.pathname.replace(/\/$/, '') || '/';
  
  // Directly serve the account page from memory, bypassing asset folder lookups
  if (request.method === 'GET' && path === '/account') {
    return new Response(ACCOUNT_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  const route = findRoute(request.method, path);
  if (route) {
    const user = await getUser(request);
    const access = route.handler.access || 'public';
    if (access === 'user' && !user) return new Response(JSON.stringify({ error: 'Please sign in first.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    if (access === 'admin' && !isAdmin(user, env)) return new Response(JSON.stringify({ error: 'Owner access required.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    if (route.handler.methods && !route.handler.methods.includes(request.method)) return new Response('Method not allowed', { status: 405 });
    const parsed = await parseRequestBody(request);
    const req = { method: request.method, headers: Object.fromEntries(request.headers.entries()), body: parsed.__form ? parsed.body : parsed, files: parsed.__form ? parsed.files : [], params: route.params, user, member: user, query: Object.fromEntries(url.searchParams.entries()), env };
    const res = makeResponse();
    try { 
      const result = await route.handler(req, res); 
      return result instanceof Response ? result : res.json(result ?? { ok: true }); 
    }
    catch (e) { 
      console.error(e); 
      return res.status(500).json({ error: e?.message || 'Server error.' }); 
    }
  }
  if (env.ASSETS) {
    let assetPath = path;
    if (path === '/login') assetPath = '/login.html';
    if (path === '/admin' || path === '/admin/') assetPath = '/admin/index.html';

    const assetReq = new Request(new URL(assetPath, request.url), request);
    const r = await env.ASSETS.fetch(assetReq);
    if (r.status !== 404) return r;
    return env.ASSETS.fetch(request);
  }
  return new Response('Not found', { status: 404 });
}

export default {
  async fetch(request, env, ctx) {
    return withEnv(env, () => dispatch(request, env));
  },
  async scheduled(event, env, ctx) {
    return withEnv(env, async () => {
      const req = {
        method: 'POST',
        headers: { 'x-hatchable-trigger': 'cron' },
        body: {},
        files: [],
        params: {},
        user: null,
        member: null,
        query: {}
      };
      const res = makeResponse();
      try {
        const result = await cleanupStories(req, res);
        return result instanceof Response ? result : res.json(result ?? { ok: true });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e?.message || 'Story cleanup failed.' });
      }
    });
  }
};

import { db } from '../src/compat.js';
import { emailAssets, shell, sendResend } from '../lib/order-email.js';

export const access = 'public';
export const methods = ['POST'];

const clean = v => String(v ?? '').trim();
const esc = s => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export default async function(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items : [];
  if (!items.length) return res.status(400).json({ error: 'Your bag is empty.' });

  const name = clean(b.customer_name);
  const mail = clean(b.email).toLowerCase();
  const phone = clean(b.phone);
  const address = clean(b.address);
  const city = clean(b.city);
  const state = clean(b.state);
  const pincode = clean(b.pincode);

  if (!name || !mail || !phone || !address || !city || !state || !pincode) {
    return res.status(400).json({ error: 'Please complete all delivery details (Name, Phone, Address, City, State, Pincode).' });
  }

  const ids = [...new Set(items.map(x => x.product_id).filter(Boolean))];
  let products = [];
  
  if (ids.length) {
    const { rows } = await db.query("SELECT id, name, price, stock, active FROM products WHERE id = ANY($1::uuid[])", [ids]);
    products = rows;
  }

  const byId = new Map(products.map(p => [String(p.id), p]));
  let subtotal = 0;
  const checked = [];

  for (const item of items) {
    const p = byId.get(String(item.product_id));
    const qty = Math.max(1, Math.min(10, Number(item.quantity) || 1));
    
    // Fallback pricing if item isn't matched directly by UUID in DB
    const unitPrice = p ? Number(p.price) : (Number(item.price) || 0);
    const productName = p ? p.name : (item.name || 'Couture Piece');
    const size = clean(item.size) || 'M';
    const line = unitPrice * qty;
    
    subtotal += line;
    checked.push({ id: item.product_id, name: productName, price: unitPrice, qty, size, customFit: !!item.custom_fit, line });
  }

  const shipping = 49;
  const total = subtotal + shipping;
  const payment = clean(b.payment_method) || 'online';
  const orderNumber = 'ALV-' + Date.now().toString(36).toUpperCase();

  // Save order to SQL 'orders' table
  const { rows: orderRows } = await db.query(
    `INSERT INTO orders (order_number, customer_name, email, phone, address, city, state, pincode, subtotal, shipping, total, payment_method, status, payment_status, created_at) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'confirmed', 'paid', CURRENT_TIMESTAMP) 
     RETURNING id, order_number, total, status`,
    [orderNumber, name, mail, phone, address, city, state, pincode, subtotal, shipping, total, payment]
  );
  
  const order = orderRows[0];

  // Save items to 'order_items' table
  for (const x of checked) {
    await db.query(
      `INSERT INTO order_items (order_id, product_name, size, quantity, unit_price, line_total, custom_fit) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [order.id, x.name, x.size, x.qty, x.price, x.line, x.customFit]
    );
  }

  // Send automated email notifications
  try {
    const assets = await emailAssets(checked.map(x => ({ product_name: x.name, size: x.size, quantity: x.qty, line_total: x.line, custom_fit: x.customFit })), req);
    const ownerBody = `<p style="font-size:11px;letter-spacing:2px;color:#846f8a">NEW ORDER · ACTION REQUIRED</p><h1 style="font:500 30px Georgia,serif;margin:5px 0 12px">${esc(order.order_number)}</h1><p><b>${esc(name)}</b><br>${esc(mail)} · ${esc(phone)}<br>${esc(address)}, ${esc(city)}, ${esc(state)} ${esc(pincode)}</p><div style="margin-top:20px">${assets.cards}</div><p style="margin-top:18px">Total Paid: <b>₹${total.toFixed(0)}</b></p>`;
    
    await sendResend('contact@aliveraatelier.in', `NEW ORDER RECEIVED — ${order.order_number}`, shell(ownerBody), assets.attachments);
  } catch (e) {
    console.log('Notification email failed:', e?.message);
  }

  return res.json({ ok: true, order: order.order_number, total });
}

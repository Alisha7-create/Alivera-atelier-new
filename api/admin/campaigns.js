import { db } from '../../src/compat.js';
import { emailAssets, shell, sendResend } from '../../lib/order-email.js';

export const access = 'admin';
export const methods = ['GET', 'PUT'];

const esc = s => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const titles = {
  confirmed: 'ORDER CONFIRMED',
  processing: 'ORDER BEING PREPARED',
  shipped: 'ORDER SHIPPED',
  delivered: 'ORDER DELIVERED',
  cancelled: 'ORDER CANCELLED'
};

const messages = {
  confirmed: o => `Your Alivèra Atelier order <b>${esc(o.order_number)}</b> has been confirmed by our atelier. We are now preparing your pieces with care.`,
  processing: o => `Your Alivèra Atelier order <b>${esc(o.order_number)}</b> is now being prepared. We are carefully getting your pieces ready for dispatch.`,
  shipped: o => `Your Alivèra Atelier order <b>${esc(o.order_number)}</b> has been shipped. It is now on its way to you.`,
  delivered: o => `Your Alivèra Atelier order <b>${esc(o.order_number)}</b> has been marked as delivered. We hope you love your pieces.`,
  cancelled: o => `Your Alivèra Atelier order <b>${esc(o.order_number)}</b> has been cancelled. If you believe this was unexpected, please contact us at contact@aliveraatelier.in.`
};

export default async function(req, res) {
  if (req.method === 'GET') {
    const { rows } = await db.query("SELECT * FROM orders ORDER BY created_at DESC");
    for (const o of rows) {
      const r = await db.query("SELECT product_name AS name, size, quantity, line_total, custom_fit FROM order_items WHERE order_id=$1 ORDER BY id", [o.id]);
      o.items = r.rows;
    }
    return res.json(rows);
  }

  const b = req.body || {};
  const { rows: before } = await db.query('SELECT * FROM orders WHERE id=$1 LIMIT 1', [b.id]);
  const previous = before[0];

  const { rows } = await db.query(
    "UPDATE orders SET status=COALESCE($1, status), payment_status=COALESCE($2, payment_status) WHERE id=$3 RETURNING *",
    [b.status || null, b.payment_status || null, b.id]
  );
  const order = rows[0];
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (previous && previous.status !== order.status && titles[order.status]) {
    const { rows: items } = await db.query('SELECT i.*, p.id AS product_id FROM order_items i JOIN products p ON p.id=i.product_id WHERE i.order_id=$1', [order.id]);
    const assets = await emailAssets(items, req);
    
    const body = `<p style="font-size:11px;letter-spacing:2px;color:#846f8a">${titles[order.status]}</p><h1 style="font:500 30px Georgia,serif;margin:5px 0 12px">${order.status === 'cancelled' ? 'We’re sorry, ' + esc(order.customer_name) + '.' : 'Hello, ' + esc(order.customer_name) + '.'}</h1><p>${messages[order.status](order)}</p><div style="margin-top:18px">${assets.cards}</div><div style="background:#fbf7f3;padding:18px;margin-top:22px;line-height:1.8">Subtotal: ₹${Number(order.subtotal).toFixed(0)}<br>${order.promo_code ? `Discount (${esc(order.promo_code)})<br>` : ''}Shipping: ₹${Number(order.shipping).toFixed(0)}<br><b style="font-size:17px">Total: ₹${Number(order.total).toFixed(0)}</b></div><div style="margin-top:22px;padding:16px;border:1px solid #e8ddd4"><b>Deliver to</b><br>${esc(order.address)}, ${esc(order.city)}, ${esc(order.state)} ${esc(order.pincode)}<br>${esc(order.phone)}</div>${order.status === 'shipped' ? '<p style="font-size:12px;color:#6e656d;margin-top:18px">We will send tracking details here as soon as they are available.</p>' : ''}`;

    try {
      await sendResend(order.email, `${titles[order.status]} · ${order.order_number} · Alivèra Atelier`, shell(body), assets.attachments);
    } catch (e) {
      console.log(`Status email (${order.status}) failed`, e?.message);
    }
  }

  return res.json(order);
}

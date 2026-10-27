import { db } from '../src/compat.js';

export const access = 'public';
export const methods = ['POST'];

export default async function(req, res) {
  if (req.method === 'POST') {
    try {
      const b = req.body || {};
      const orderNumber = 'ALV-' + Math.floor(100000 + Math.random() * 900000);
      
      // Insert into your SQL D1 'orders' table
      const orderRes = await db.query(
        `INSERT INTO orders (order_number, email, customer_name, phone, address, city, state, pincode, subtotal, shipping, total, payment_status, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP) RETURNING *`,
        [
          orderNumber, 
          b.email, 
          b.name, 
          b.phone, 
          b.address || 'Standard Atelier Address', 
          b.city || 'City', 
          b.state || 'State', 
          b.pincode || '000000', 
          b.bill?.baseSubtotal || 0, 
          b.bill?.deliveryCharge || 49, 
          b.bill?.finalTotal || 0, 
          'paid', 
          'confirmed'
        ]
      );
      
      const newOrder = orderRes.rows[0];

      // Insert items into 'order_items' table
      if (b.items && Array.isArray(b.items)) {
        for (const item of b.items) {
          await db.query(
            `INSERT INTO order_items (order_id, product_name, size, quantity, line_total, custom_fit) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [newOrder.id, item.name, item.size, 1, item.price, item.notes || 'None']
          );
        }
      }

      return res.status(200).json({ success: true, orderNumber });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

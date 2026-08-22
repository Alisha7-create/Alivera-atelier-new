import { db } from '../../src/compat.js';

export const access = 'admin';
export const methods = ['POST'];

export default async function(req, res) {
  const b = req.body || {};
  const { data, contentType, type, productId } = b;

  if (!data || !contentType) {
    return res.status(400).json({ error: 'Missing file data or content type.' });
  }

  // Format as a Data URL to store directly in the D1 TEXT column
  const base64Url = `data:${contentType};base64,${data}`;

  if (type === 'size_chart' && productId) {
    await db.query('UPDATE products SET size_chart_url=$1 WHERE id=$2', [base64Url, productId]);
    return res.json({ success: true, url: base64Url });
  }

  if (type === 'product' && productId) {
    await db.query('UPDATE products SET image_url=$1 WHERE id=$2', [base64Url, productId]);
    return res.json({ success: true, url: base64Url });
  }

  return res.json({ success: true, url: base64Url });
}

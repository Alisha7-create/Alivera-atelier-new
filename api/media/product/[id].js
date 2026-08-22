import { db } from '../../../src/compat.js';

export const access = 'public';
export const methods = ['GET'];

export default async function(req, res) {
  const { rows } = await db.query('SELECT image_url FROM products WHERE id=$1 LIMIT 1', [req.params.id]);
  const base64Data = rows[0]?.image_url;

  if (!base64Data || !base64Data.startsWith('data:image/')) {
    return res.status(404).send('Not found');
  }

  // Split "data:image/png;base64,iVBORw0KG..."
  const parts = base64Data.split(',');
  const contentType = parts[0].split(':')[1].split(';')[0];
  const buffer = Buffer.from(parts[1], 'base64');

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(buffer);
}

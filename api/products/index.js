import { db } from '../../src/compat.js';

export const access = 'public';
export const methods = ['GET'];

export default async function(req, res) {
  try {
    const { rows } = await db.query(
      "SELECT id, name, slug, description, price, sizes, stock, active FROM products WHERE active = 1 OR active = true ORDER BY id DESC"
    );
    
    const base = `https://${req.headers.host || 'aliveraatelier.in'}`;
    
    // Ensure we always return a clean array
    const productList = (rows || []).map(p => ({
      ...p,
      image: `${base}/api/media/product/${p.id}`,
      image_url: `${base}/api/media/product/${p.id}`,
      size_chart_url: `${base}/api/media/product/${p.id}/chart`
    }));

    return res.json(productList);
  } catch (e) {
    // If anything fails, return an empty array instead of an error object so the frontend .map() doesn't crash
    return res.json([]);
  }
}

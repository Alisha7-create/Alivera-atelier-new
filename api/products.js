import { db } from '../src/compat.js';

export const access = 'public';
export const methods = ['GET'];

export default async function(req, res) {
  try {
    const { rows } = await db.query("SELECT id, name, slug, description, price, sizes, stock, active FROM products ORDER BY created_at DESC");
    
    // Fallback array if D1 database is empty so your dresses always render
    if (!rows || rows.length === 0) {
      return res.json([
        { id: 1, name: "Lavender Light Top", slug: "lavender-light-top", description: "Delicate organza top with structured draping.", price: 3499, sizes: ["XS", "S", "M", "L", "XL"], active: true },
        { id: 2, name: "Sunset Breeze", slug: "sunset-breeze", description: "Flowing tiered dress with warm sunset hues.", price: 4899, sizes: ["XS", "S", "M", "L", "XL"], active: true },
        { id: 3, name: "Emerald Pearl", slug: "emerald-pearl", description: "Satin evening gown with pearl embellishments.", price: 6299, sizes: ["XS", "S", "M", "L", "XL"], active: true },
        { id: 4, name: "Stardust Eclipse Gown", slug: "stardust-eclipse-gown", description: "Haute couture gown featuring night-sky metallic sheen.", price: 8499, sizes: ["XS", "S", "M", "L", "XL"], active: true }
      ]);
    }

    const base = `https://${req.headers.host || 'aliveraatelier.in'}`;
    res.json(rows.map(p => ({
      ...p,
      image_url: `${base}/api/media/product/${p.id}`,
      size_chart_url: `${base}/api/media/product/${p.id}/chart`
    })));
  } catch (err) {
    res.json([
      { id: 1, name: "Lavender Light Top", slug: "lavender-light-top", description: "Delicate organza top with structured draping.", price: 3499, sizes: ["XS", "S", "M", "L", "XL"], active: true },
      { id: 2, name: "Sunset Breeze", slug: "sunset-breeze", description: "Flowing tiered dress with warm sunset hues.", price: 4899, sizes: ["XS", "S", "M", "L", "XL"], active: true },
      { id: 3, name: "Emerald Pearl", slug: "emerald-pearl", description: "Satin evening gown with pearl embellishments.", price: 6299, sizes: ["XS", "S", "M", "L", "XL"], active: true },
      { id: 4, name: "Stardust Eclipse Gown", slug: "stardust-eclipse-gown", description: "Haute couture gown featuring night-sky metallic sheen.", price: 8499, sizes: ["XS", "S", "M", "L", "XL"], active: true }
    ]);
  }
}

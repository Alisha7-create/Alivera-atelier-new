export const access = 'public';
export const methods = ['GET'];

function generateProductUrls(name, baseUrl = 'https://aliveraatelier.in') {
  const slug = (name || 'dress')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  return {
    slug: slug,
    image: `${baseUrl}/assets/${slug}.jpg`,
    image_url: `${baseUrl}/assets/${slug}.jpg`,
    size_chart_url: `${baseUrl}/assets/${slug}-size-chart.jpg`
  };
}

export default async function(req, res) {
  try {
    const base = `https://${req.headers.host || 'aliveraatelier.in'}`;
    let rows = [];
    
    if (typeof env !== 'undefined' && env && env.DB) {
      try {
        const { results } = await env.DB.prepare(
          `SELECT id, name, description, price, sizes, stock, active FROM "atelier-dresses" ORDER BY id DESC`
        ).all();
        rows = results || [];
      } catch (dbErr) {
        // Table might not exist locally yet; log it quietly and move on
        console.log("Local D1 table note:", dbErr.message);
      }
    }

    const products = rows.map(p => {
      const generated = generateProductUrls(p.name, base);
      return {
        ...p,
        slug: p.slug || generated.slug,
        image: p.image || generated.image,
        image_url: p.image_url || generated.image_url,
        size_chart_url: p.size_chart_url || generated.size_chart_url
      };
    });

    return res.json(products);
  } catch (e) {
    return res.json([]);
  }
}

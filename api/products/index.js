export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const url = new URL(request.url);
    const base = `${url.protocol}//${url.host}`;
    
    let rows = [];
    
    if (env && env.DB) {
      try {
        const { results } = await env.DB.prepare(
          `SELECT id, name, description, price, sizes, stock, active FROM "atelier-dresses" ORDER BY id DESC`
        ).all();
        rows = results || [];
      } catch (dbErr) {
        console.log("Database note:", dbErr.message);
      }
    }

    const products = rows.map(p => {
      const slug = (p.name || 'dress')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      return {
        ...p,
        slug: p.slug || slug,
        image: p.image || `${base}/assets/${slug}.jpg`,
        image_url: p.image_url || `${base}/assets/${slug}.jpg`,
        size_chart_url: p.size_chart_url || `${base}/assets/${slug}-size-chart.jpg`
      };
    });

    return new Response(JSON.stringify(products), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    // Always return a safe empty array wrapped in a valid Response
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

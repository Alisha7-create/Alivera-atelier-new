export const access = 'public';
export const methods = ['GET'];

export default async function(req, res) {
  try {
    let rows = [];

    const firebaseProjectId = 'alivera-atelier';
    const apiKey = 'AIzaSyAAcUmpfEF0MVo8OTe87VAlZGSU2VB_7yc';
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/atelier_dresses?key=${apiKey}`;

    try {
      const response = await fetch(firestoreUrl);
      if (response.ok) {
        const data = await response.json();
        if (data && data.documents) {
          rows = data.documents.map(doc => {
            const fields = doc.fields || {};
            const id = doc.name ? doc.name.split('/').pop() : Math.random().toString();
            
            return {
              id: id,
              name: fields.name?.stringValue || '',
              description: fields.description?.stringValue || '',
              price: fields.price?.stringValue || '',
              stock: fields.stock?.integerValue || fields.stock?.stringValue || 0,
              active: fields.active?.booleanValue ?? true
            };
          });
        }
      }
    } catch (firebaseErr) {
      console.log("Firebase fetch error:", firebaseErr.message);
    }

    const host = (req && req.headers && (req.headers.host || (typeof req.headers.get === 'function' ? req.headers.get('host') : ''))) || 'aliveraatelier.in';
    const base = `https://${host}`;

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

    if (res && typeof res.json === 'function') {
      return res.json(products);
    }
    
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    if (res && typeof res.json === 'function') {
      return res.json([]);
    }
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

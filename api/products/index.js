export const access = 'public';
export const methods = ['GET'];

export default async function(req, res) {
  // Helper function to safely send a JSON array response
  const sendJSON = (data) => {
    if (res && typeof res.json === 'function') {
      return res.json(data);
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  };

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

    // Determine base URL dynamically
    let host = 'aliveraatelier.in';
    if (req && req.headers) {
      if (typeof req.headers.get === 'function') {
        host = req.headers.get('host') || host;
      } else if (req.headers.host) {
        host = req.headers.host;
      }
    }
    const base = `https://${host}`;

    // Map rows to clean dynamic asset URLs
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

    // Send the valid products array (even if empty, it's an array so .map() won't crash)
    return sendJSON(products);

  } catch (e) {
    // Ultimate safety net: guarantees a valid array is sent back so frontend never crashes
    return sendJSON([]);
  }
}

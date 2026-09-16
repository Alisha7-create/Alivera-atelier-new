export const access = 'public';
export const methods = ['GET'];

export default async function(req, res) {
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
              price: fields.price?.integerValue || fields.price?.doubleValue || fields.price?.stringValue || 0,
              // Check for imageUrl or image fields stored from the admin dashboard
              imageUrl: fields.imageUrl?.stringValue || fields.image?.stringValue || '',
              sizeChart: fields.sizeChart?.stringValue || fields.size_chart_url?.stringValue || '',
              active: fields.active?.booleanValue ?? true
            };
          });
        }
      }
    } catch (firebaseErr) {
      console.log("Firebase fetch error:", firebaseErr.message);
    }

    let host = 'aliveraatelier.in';
    if (req && req.headers) {
      if (typeof req.headers.get === 'function') {
        host = req.headers.get('host') || host;
      } else if (req.headers.host) {
        host = req.headers.host;
      }
    }
    const base = `https://${host}`;

    // Map rows and ensure image links are fully populated for web and app
    const products = rows.map(p => {
      const slug = (p.name || 'dress')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      const defaultImg = `${base}/assets/${slug}.jpg`;
      const defaultChart = `${base}/assets/${slug}-size-chart.jpg`;

      return {
        ...p,
        slug: p.slug || slug,
        image: p.imageUrl || defaultImg,
        image_url: p.imageUrl || defaultImg,
        size_chart_url: p.sizeChart || defaultChart
      };
    });

    return sendJSON(products);

  } catch (e) {
    return sendJSON([]);
  }
}

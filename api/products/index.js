export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const base = `${url.protocol}//${url.host}`;
    
    let rows = [];

    try {
      const firebaseProjectId = (env && env.FIREBASE_PROJECT_ID) || 'alivera-atelier'; 
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/atelier_dresses`;

      const response = await fetch(firestoreUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.documents) {
          rows = data.documents.map(doc => {
            const fields = doc.fields || {};
            const id = doc.name.split('/').pop();
            
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

    // Map rows to dynamic URLs for Web & App
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
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // Allows your app and website to fetch data freely
      }
    });
  } catch (e) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

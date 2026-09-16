export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const base = `${url.protocol}//${url.host}`;
      
      let rows = [];

      // Fetch directly from your Firebase Firestore REST endpoint for 'atelier-dresses'
      // Replace YOUR_FIREBASE_PROJECT_ID with your actual Firebase project ID if not using environment variables
      const firebaseProjectId = (env && env.FIREBASE_PROJECT_ID) || 'alivera-atelier'; 
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/atelier-dresses`;

      const response = await fetch(firestoreUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.documents) {
          rows = data.documents.map(doc => {
            // Firestore REST API returns fields wrapped in type objects (e.g. { stringValue: "..." })
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

      // Map rows to dynamic URLs
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

      return Response.json(products, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      // Guaranteed safe fallback so the frontend receives [] instead of a 500 error
      return Response.json([], {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

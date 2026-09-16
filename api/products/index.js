import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

export const access = 'public';
export const methods = ['GET'];

export default async function(req, res) {
  try {
    // Fetch all products directly from your Firebase Firestore 'products' collection
    const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
    
    if (snapshot.empty) {
      return res.json([]);
    }

    const products = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      products.push({
        id: doc.id,
        ...data
      });
    });

    return res.json(products);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch products from Firebase', details: e.message });
  }
}

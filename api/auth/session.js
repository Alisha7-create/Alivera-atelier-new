import { readSession } from '../../src/compat.js';

export const access = 'public'; // or 'admin' depending on how your router handles it
export const methods = ['GET'];

export default async function(req, res) {
  try {
    const user = await readSession(req);

    // Check if a valid session exists
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }

    // Verify admin privileges (make sure 'role' matches what you stored in the session token)
    if (user.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Access denied: Admin role required' });
    }

    // Return the authorized admin user details
    return res.json({ ok: true, user });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

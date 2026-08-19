import { readSession } from '../../src/compat.js';

export const access = 'public'; 
export const methods = ['GET'];

export default async function(req, res) {
  try {
    const user = await readSession(req);

    // If no user is logged in, return 401 cleanly
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // If it's not your admin email, return 404 so it looks like the page doesn't exist to customers
    if (user.email.toLowerCase() !== 'hello@aliveraatelier.in') {
      return res.status(404).json({ error: 'Not found' });
    }

    // Return the user object directly if your frontend expects res.json(user) or res.json({ user })
    return res.json({ 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: 'admin' 
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

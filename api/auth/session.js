import { readSession } from '../../src/compat.js';

export const access = 'public'; 
export const methods = ['GET'];

export default async function(req, res) {
  try {
    const user = await readSession(req);

    // If not logged in, or if the email is NOT yours, pretend the route doesn't exist entirely (404)
    // This keeps the admin panel completely hidden from regular customers.
    if (!user || user.email.toLowerCase() !== 'hello@aliveraatelier.in') {
      return res.status(404).json({ ok: false, error: 'Not found' });
    }

    return res.json({ ok: true, user });
  } catch (err) {
    return res.status(404).json({ ok: false, error: 'Not found' });
  }
}

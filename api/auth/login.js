import { db, verifyPassword, signSession, sessionCookie } from '../../src/compat.js';

export const access = 'public'; 
export const methods = ['POST'];

export default async function(req, res) {
  const b = req.body || {};
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');

  // 1. Added 'role' to the selected columns so we know if they are an admin
  const r = await db.query(
    'SELECT id, email, name, password_salt, password_hash, active, role FROM users WHERE lower(email) = lower($1) LIMIT 1', 
    [email]
  );
  
  const u = r.rows[0]; 
  
  if (!u || !u.active || !(await verifyPassword(password, u.password_salt, u.password_hash))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  // 2. Added 'role' to the session token payload so your admin checks pass successfully
  const token = await signSession({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role, // <-- Crucial for admin authorization
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000
  });

  res.setHeader('Set-Cookie', sessionCookie(token)); 
  res.json({ ok: true, user: { id: u.id, email: u.email, name: u.name, role: u.role } });
}

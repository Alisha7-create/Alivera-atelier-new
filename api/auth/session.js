import { readSession } from '../../src/compat.js';

export const access = 'public';
export const methods = ['GET'];

export default async function(req, res) {
  const user = await readSession(req);
  res.json({ user });
}

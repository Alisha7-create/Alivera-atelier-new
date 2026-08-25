export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    // TODO: Connect your database check & creation here
    // Example: 
    // const existing = await db.findUserByEmail(email);
    // if (existing) return res.status(400).json({ success: false, error: 'Email is already registered.' });
    // await db.createUser({ name, email, password });

    return res.status(200).json({ success: true, message: 'Account created successfully!' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, error: 'Server error during sign up.' });
  }
}

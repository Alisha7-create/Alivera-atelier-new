export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    // TODO: Connect your database query here to verify the user
    // Example: const user = await db.findUser(email, password);
    // if (!user) return res.status(400).json({ success: false, error: 'Invalid email or password.' });

    return res.status(200).json({ success: true, message: 'Signed in successfully!' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Server error during login.' });
  }
}

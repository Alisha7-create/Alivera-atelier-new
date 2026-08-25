export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Clear any cookies or session tokens here if needed
    // res.setHeader('Set-Cookie', 'token=; Max-Age=0; path=/;');

    return res.status(200).json({ success: true, message: 'Signed out successfully!' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ success: false, error: 'Server error during logout.' });
  }
}

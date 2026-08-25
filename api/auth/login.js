export default async function handler(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, error: 'Email and password are required.' }), { status: 400 });
    }

    // Safety check if D1 database binding is configured
    if (!env || !env.DB) {
      return new Response(JSON.stringify({ success: false, error: 'Database configuration missing on server.' }), { status: 500 });
    }

    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?').bind(email, password).first();
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid email or password.' }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, message: 'Signed in successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Login backend error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Server error during login.' }), { status: 500 });
  }
}

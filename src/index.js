export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- AUTHENTICATION API ROUTES ---
    if (path === '/api/auth/login' && request.method === 'POST') {
      try {
        const { email, password } = await request.json();
        
        // Admin credentials check (Change these if needed)
        if (email.trim().toLowerCase() === 'hello@aliveraatelier.in' && password === 'Alivera@123') {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Set-Cookie': `auth_session=admin_active; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
            }
          });
        } else {
          return new Response(JSON.stringify({ success: false, error: 'Invalid administrator credentials.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: 'Malformed request.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (path === '/api/auth/session') {
      const cookieHeader = request.headers.get('Cookie') || '';
      const isAuthenticated = cookieHeader.includes('auth_session=admin_active');
      return new Response(JSON.stringify({ isAuthenticated }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path === '/api/auth/logout' && request.method === 'POST') {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `auth_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
        }
      });
    }

    // --- STATIC ASSETS & ADMIN ROUTING ---
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response('Resource not found', { status: 404 });
    }
  }
};

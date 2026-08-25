export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- AUTHENTICATION API ROUTES ---
    if (path === '/api/auth/login' && request.method === 'POST') {
      try {
        const { email } = await request.json();
        if (email && email.trim().toLowerCase() === 'hello@aliveraatelier.in') {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Set-Cookie': `auth_session=admin_active; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
            }
          });
        }
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized email.' }), { status: 401 });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid request.' }), { status: 400 });
      }
    }

    if (path === '/api/auth/session') {
      const cookieHeader = request.headers.get('Cookie') || '';
      const isAuthenticated = cookieHeader.includes('auth_session=admin_active');
      return new Response(JSON.stringify({ isAuthenticated }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === '/api/auth/logout' && request.method === 'POST') {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Set-Cookie': `auth_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`, 'Content-Type': 'application/json' }
      });
    }

    // --- PROTECTED ADMIN ROUTE GUARD ---
    if (path.startsWith('/admin')) {
      const cookieHeader = request.headers.get('Cookie') || '';
      if (!cookieHeader.includes('auth_session=admin_active')) {
        // Redirect unauthorized users trying to access admin panel to login page
        return Response.redirect(`${url.origin}/login.html`, 302);
      }
    }

    // --- STATIC ASSETS & PUBLIC PAGES (Storefront, Login, Logo, etc.) ---
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response('Not found', { status: 404 });
    }
  }
};

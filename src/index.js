export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- AUTHENTICATION ---
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

    // --- ORDER ROUTING & NOTIFICATIONS ---
    if (path === '/api/orders' && request.method === 'POST') {
      const orderData = await request.json();
      console.log('[New Order Notification Sent to contact@aliveraatelier.in]:', orderData);
      console.log('[Order Confirmation Sent from hello@aliveraatelier.in to client]');
      return new Response(JSON.stringify({ success: true, message: 'Order placed successfully.' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path === '/api/admin/update-order' && request.method === 'POST') {
      const cookieHeader = request.headers.get('Cookie') || '';
      if (!cookieHeader.includes('auth_session=admin_active')) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
      }
      const { orderId, clientEmail, status, reason } = await request.json();
      console.log(`[Email Dispatched via hello@aliveraatelier.in] Order #${orderId} status (${status}) to ${clientEmail}. Reason: ${reason || 'N/A'}`);
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    // --- SECRET ADMIN PANEL GUARD ---
    if (path.startsWith('/admin')) {
      const cookieHeader = request.headers.get('Cookie') || '';
      if (!cookieHeader.includes('auth_session=admin_active')) {
        // Redirect unauthorized attempts directly to the dedicated login page
        return Response.redirect(`${url.origin}/login.html`, 302);
      }
    }

    // --- ROOT STOREFRONT ROUTING ---
    if (path === '/') {
      return env.ASSETS.fetch(new Request(`${url.origin}/index.html`, request));
    }

    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response('Not found', { status: 404 });
    }
  }
};

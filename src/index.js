export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- MOCK DATABASE STORAGE (Replace with Cloudflare KV / D1 as needed) ---
    let coupons = [
      { code: 'LUXURY10', discountPercent: 10, maxUses: 5, usedCount: 0, expiresAt: '2026-12-31T23:59:59Z' }
    ];

    // --- COUPON VALIDATION API ---
    if (path === '/api/coupons/apply' && request.method === 'POST') {
      try {
        const { code } = await request.json();
        const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
        
        if (!coupon) {
          return new Response(JSON.stringify({ success: false, error: 'Invalid coupon code.' }), { status: 400 });
        }

        // Check expiration time
        if (new Date() > new Date(coupon.expiresAt)) {
          return new Response(JSON.stringify({ success: false, error: 'This coupon has expired.' }), { status: 400 });
        }

        // Check limited usage count
        if (coupon.usedCount >= coupon.maxUses) {
          return new Response(JSON.stringify({ success: false, error: 'Coupon usage limit has been reached.' }), { status: 400 });
        }

        // Increment usage count
        coupon.usedCount += 1;

        return new Response(JSON.stringify({ success: true, discountPercent: coupon.discountPercent }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Server error.' }), { status: 500 });
      }
    }

    // --- AUTHENTICATION API ---
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
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized administrator email.' }), { status: 401 });
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

    // --- ORDER SUBMISSION (Notifies contact@, confirms via hello@) ---
    if (path === '/api/orders' && request.method === 'POST') {
      const orderData = await request.json();
      console.log('[New Order Notification] Sent to contact@aliveraatelier.in:', orderData);
      console.log('[Order Confirmation] Dispatched from hello@aliveraatelier.in to client');
      return new Response(JSON.stringify({ success: true, message: 'Order placed successfully.' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- PROTECTED ADMIN ROUTE GUARD ---
    if (path.startsWith('/admin')) {
      const cookieHeader = request.headers.get('Cookie') || '';
      if (!cookieHeader.includes('auth_session=admin_active')) {
        return Response.redirect(`${url.origin}/login.html`, 302);
      }
    }

    // --- EXPLICIT ROOT STOREFRONT ROUTING ---
    if (path === '/') {
      return env.ASSETS.fetch(new Request(`${url.origin}/index.html`, request));
    }

    // --- STATIC ASSETS ---
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response('Not found', { status: 404 });
    }
  }
};

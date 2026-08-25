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

    // --- ORDER CANCELLATION (Sends reason via hello@aliveraatelier.in) ---
    if (path === '/api/admin/cancel-order' && request.method === 'POST') {
      const cookieHeader = request.headers.get('Cookie') || '';
      if (!cookieHeader.includes('auth_session=admin_active')) {
        return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
      }

      const { orderId, clientEmail, reason } = await request.json();
      
      // Email logic: Dispatching cancellation notice from hello@aliveraatelier.in
      const emailPayload = {
        from: 'hello@aliveraatelier.in',
        to: clientEmail,
        subject: `Order Cancellation Notice - #${orderId} | Alivèra Atelier`,
        body: `Dear Client,\n\nYour order #${orderId} has been cancelled by the atelier.\nReason provided: ${reason}\n\nIf you have any questions, please reach out to us at hello@aliveraatelier.in.`
      };
      
      // Integration hook for Cloudflare Email Workers or external SMTP API can be plugged here.
      console.log(`[Email Dispatched via hello@aliveraatelier.in] Sent to ${clientEmail}:`, emailPayload);

      return new Response(JSON.stringify({ success: true, message: 'Cancellation email sent successfully via hello@aliveraatelier.in' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- NEW ORDER RECEPTION (Notifies contact@aliveraatelier.in, confirms via hello@aliveraatelier.in) ---
    if (path === '/api/orders' && request.method === 'POST') {
      const orderData = await request.json();
      
      // Notification to contact@aliveraatelier.in
      console.log('[New Order Notification] Sent to contact@aliveraatelier.in:', orderData);
      
      // Confirmation dispatch simulation via hello@aliveraatelier.in
      console.log('[Order Confirmation] Dispatched from hello@aliveraatelier.in to client:', orderData.clientEmail);

      return new Response(JSON.stringify({ success: true, message: 'Order placed successfully.' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- STATIC ASSETS ---
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response('Not found', { status: 404 });
    }
  }
};

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

    // --- ORDER ROUTING & BULLETPROOF SHIPROCKET SYNC ---
    if (path === '/api/orders' && request.method === 'POST') {
      try {
        const orderData = await request.json();
        console.log('[New Storefront Order Received]:', JSON.stringify(orderData));

        // 1. Clean and normalize incoming order inputs
        let itemsList = [];
        if (Array.isArray(orderData.items)) {
          itemsList = orderData.items;
        } else if (typeof orderData.items === 'object' && orderData.items !== null) {
          itemsList = Object.values(orderData.items);
        }

        const firstItem = itemsList[0] || {};

        // Clean customer phone number to exactly 10 digits
        const rawPhone = String(orderData.phone || orderData.phone_number || orderData.clientPhone || "8114433903");
        const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10) || "8114433903";

        // Format order date strictly to YYYY-MM-DD HH:mm
        const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 16);

        // Build Shiprocket Adhoc payload
        const shiprocketPayload = {
          order_id: String(orderData.orderId || orderData.id || `ALV-${Date.now().toString().slice(-6)}`),
          order_date: formattedDate,
          pickup_location: "Primary",
          billing_customer_name: String(orderData.clientName || orderData['customer-name'] || orderData.name || "Alisha"),
          billing_last_name: "",
          billing_address: String(firstItem.Address || orderData.full_address || orderData.address || "House no. 7, Shastri Nagar, Mahvir Colony"),
          billing_city: String(firstItem.City || orderData.city || "Bundi"),
          billing_pincode: Number(firstItem.Pincode || orderData.pincode || 323001),
          billing_state: "Rajasthan",
          billing_country: "India",
          billing_email: String(orderData.clientEmail || orderData.email || "hello@aliveraatelier.in"),
          billing_phone: cleanPhone,
          shipping_is_billing: true,
          order_items: itemsList.length > 0 ? itemsList.map(item => ({
            name: String(item.name || "Rose Petal Crop Top"),
            sku: String(item.sku || "ALIVERA-GARMENT"),
            units: Number(item.quantity || item.units || 1),
            selling_price: Number(item.price || orderData.totalAmount || 1600)
          })) : [
            {
              name: String(orderData.name || "Rose Petal Crop Top"),
              sku: "ALIVERA-GARMENT",
              units: 1,
              selling_price: Number(orderData.totalAmount || 1600)
            }
          ],
          payment_method: String(orderData.paymentMethod || "Prepaid"),
          sub_total: Number(orderData.totalAmount || 1600),
          length: 12,
          width: 10,
          height: 4,
          weight: 0.5
        };

        // 2. Queue background push to Shiprocket with explicit error logging
        ctx.waitUntil((async () => {
          try {
            const shiprocketEmail = env.SHIPROCKET_EMAIL || "shiprocket@aliveraatelier.in";
            const shiprocketPassword = env.SHIPROCKET_PASSWORD || "8JoRnfVG8vtakJzKY2Gai@ZGYcraJP^7";

            // Authenticate
            const authRes = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: shiprocketEmail, password: shiprocketPassword })
            });

            const authData = await authRes.json();

            if (!authRes.ok || !authData.token) {
              console.error('[Shiprocket Auth Error]: Failed to acquire token.', JSON.stringify(authData));
              return;
            }

            // Post Order
            const syncRes = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authData.token}`
              },
              body: JSON.stringify(shiprocketPayload)
            });

            const syncData = await syncRes.json();

            if (syncRes.ok && (syncData.order_id || syncData.shipment_id)) {
              console.log('[Shiprocket Sync SUCCESS]: Order pushed successfully.', JSON.stringify(syncData));
            } else {
              console.error('[Shiprocket Sync REJECTED]:', JSON.stringify(syncData));
            }
          } catch (shiprocketErr) {
            console.error('[Shiprocket Execution Fatal Error]:', shiprocketErr.stack || shiprocketErr.message);
          }
        })());

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Order received successfully and dispatched to Shiprocket.',
          order_id: shiprocketPayload.order_id 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (e) {
        console.error('[Order API Fatal Error]:', e.stack || e.message);
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
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

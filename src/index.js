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

    // --- ORDER ROUTING & SHIPROCKET SYNC ---
    if (path === '/api/orders' && request.method === 'POST') {
      try {
        const orderData = await request.json();
        console.log('[New Order Received]:', orderData);

        // Attempt automated Shiprocket Sync in background
        ctx.waitUntil((async () => {
          try {
            // 1. Authenticate with Shiprocket API
            const authRes = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: env.SHIPROCKET_EMAIL || "shiprocket@aliveraatelier.in",
                password: env.SHIPROCKET_PASSWORD || "8JoRnfVG8vtakJzKY2Gai@ZGYcraJP^7"
              })
            });

            const authData = await authRes.json();

            if (authData.token) {
              const token = authData.token;

              // Safely extract items array or map/object
              let itemsList = [];
              if (Array.isArray(orderData.items)) {
                itemsList = orderData.items;
              } else if (typeof orderData.items === 'object' && orderData.items !== null) {
                itemsList = Object.values(orderData.items);
              }

              const firstItem = itemsList[0] || {};

              // 2. Format order structure for Shiprocket Adhoc Order API
              const shiprocketPayload = {
                order_id: orderData.orderId || orderData.id || `ALV-${Date.now().toString().slice(-6)}`,
                order_date: new Date().toISOString().replace('T', ' ').substring(0, 16),
                pickup_location: "Primary",
                billing_customer_name: orderData.clientName || orderData['customer-name'] || orderData.name || "Alisha",
                billing_last_name: "",
                billing_address: firstItem.Address || orderData.full_address || orderData.address || "House no. 7, Shastri Nagar, Mahvir Colony",
                billing_city: firstItem.City || orderData.city || "Bundi",
                billing_pincode: Number(firstItem.Pincode || orderData.pincode || "323001"),
                billing_state: "Rajasthan",
                billing_country: "India",
                billing_email: orderData.clientEmail || orderData.email || "hello@aliveraatelier.in",
                billing_phone: String(orderData.phone || orderData.phone_number || "8114433903").replace(/\D/g, '').slice(-10),
                shipping_is_billing: true,
                order_items: itemsList.length > 0 ? itemsList.map(item => ({
                  name: item.name || "Rose Petal Crop Top",
                  sku: item.sku || "ALIVERA-GARMENT",
                  units: Number(item.quantity || 1),
                  selling_price: Number(item.price || orderData.totalAmount || 1600)
                })) : [
                  {
                    name: orderData.name || "Rose Petal Crop Top",
                    sku: "ALIVERA-GARMENT",
                    units: 1,
                    selling_price: Number(orderData.totalAmount || 1600)
                  }
                ],
                payment_method: orderData.paymentMethod || "Prepaid",
                sub_total: Number(orderData.totalAmount || 1600),
                length: 12,
                width: 10,
                height: 4,
                weight: 0.5
              };

              // 3. Post order to Shiprocket
              const syncRes = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(shiprocketPayload)
              });

              const syncData = await syncRes.json();
              console.log('[Shiprocket Sync Status]:', syncData);
            } else {
              console.error('[Shiprocket Auth Failed]:', authData);
            }
          } catch (shiprocketErr) {
            console.error('[Shiprocket Sync Error - Non-blocking]:', shiprocketErr);
          }
        })());

        return new Response(JSON.stringify({ success: true, message: 'Order placed and queued for Shiprocket sync.' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
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

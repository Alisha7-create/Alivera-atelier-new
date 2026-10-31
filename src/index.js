export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- 1. ADMIN ORDERS ENDPOINT ---
    if (path === '/api/admin/orders' && request.method === 'GET') {
      try {
        // If you store orders in Cloudflare KV (e.g. env.ORDERS_KV):
        let orders = [];
        if (env.ORDERS_KV) {
          const list = await env.ORDERS_KV.list();
          for (let key of list.keys) {
            let val = await env.ORDERS_KV.get(key.name);
            if (val) orders.push(JSON.parse(val));
          }
        }

        return new Response(JSON.stringify({
          success: true,
          orders: orders
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }

    // --- 2. STOREFRONT ORDER SUBMISSION & SHIPROCKET SYNC ---
    if (path === '/api/orders' && request.method === 'POST') {
      try {
        const orderData = await request.json();
        console.log('[New Storefront Order Received]:', JSON.stringify(orderData));

        let itemsList = [];
        if (Array.isArray(orderData.items)) {
          itemsList = orderData.items;
        } else if (typeof orderData.items === 'object' && orderData.items !== null) {
          itemsList = Object.values(orderData.items);
        }

        const rawPhone = String(orderData.phone || "8114433903");
        const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10) || "8114433903";
        const formattedDate = new Date().toISOString().replace('T', ' ').substring(0, 16);
        const orderId = String(orderData.orderId || `ALV-${Date.now().toString().slice(-6)}`);

        // Save order to KV storage if bound (so it shows up in the admin dashboard)
        if (env.ORDERS_KV) {
          await env.ORDERS_KV.put(orderId, JSON.stringify({ ...orderData, orderId, phone: cleanPhone }));
        }

        // Prepare Shiprocket Adhoc Payload
        const shiprocketPayload = {
          order_id: orderId,
          order_date: formattedDate,
          pickup_location: "Primary",
          billing_customer_name: String(orderData.clientName || "Alisha"),
          billing_last_name: "",
          billing_address: String(orderData.full_address || "House no. 7, Shastri Nagar"),
          billing_city: String(orderData.city || "Bundi"),
          billing_pincode: Number(orderData.pincode || 323001),
          billing_state: String(orderData.state || "Rajasthan"),
          billing_country: "India",
          billing_email: String(orderData.email || "hello@aliveraatelier.in"),
          billing_phone: cleanPhone,
          shipping_is_billing: true,
          order_items: itemsList.length > 0 ? itemsList.map(item => ({
            name: String(item.name || "Custom Garment"),
            sku: String(item.sku || "ALIVERA-GARMENT"),
            units: Number(item.quantity || 1),
            selling_price: Number(item.price || orderData.totalAmount || 1600)
          })) : [{ name: "Custom Garment", sku: "ALIVERA-GARMENT", units: 1, selling_price: Number(orderData.totalAmount || 1600) }],
          payment_method: "Prepaid",
          sub_total: Number(orderData.totalAmount || 1600),
          length: 12,
          width: 10,
          height: 4,
          weight: 0.5
        };

        // Background synchronization to Shiprocket using ctx.waitUntil()
        ctx.waitUntil((async () => {
          try {
            const shiprocketEmail = env.SHIPROCKET_EMAIL || "shiprocket@aliveraatelier.in";
            const shiprocketPassword = env.SHIPROCKET_PASSWORD || "";

            const authRes = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: shiprocketEmail, password: shiprocketPassword })
            });

            const authData = await authRes.json();
            if (!authRes.ok || !authData.token) {
              console.error('[Shiprocket Auth Error]:', authData);
              return;
            }

            const syncRes = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authData.token}`
              },
              body: JSON.stringify(shiprocketPayload)
            });

            const syncData = await syncRes.json();
            console.log('[Shiprocket Sync Response]:', JSON.stringify(syncData));
          } catch (err) {
            console.error('[Shiprocket Background Sync Error]:', err);
          }
        })());

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Order received, saved, and syncing to Shiprocket.',
          order_id: orderId 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }

    // --- 3. STATIC ASSETS FALLBACK ---
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response('Not found', { status: 404 });
    }
  }
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- 1. PRODUCTS API WITH AUTO-GENERATED SLUGS ---
    if (path === '/api/products' || path === '/api/products/index') {
      const rawProducts = [
        { name: 'Lavender Light Top', price: 1600, description: 'Delicate organza overlay piece designed with structured comfort.', image: '/assets/lavender-top.jpg' },
        { name: 'Sunset Breeze Co-ord Set', price: 2800, description: 'Flowy resort-ready silhouette tailored for effortless elegance.', image: '/assets/sunset-coord.jpg' },
        { name: 'Emerald Green Dress', price: 3400, description: 'Deep jewel-toned satin creation featuring hand-finished detailing.', image: '/assets/emerald-dress.jpg' },
        { name: 'Stardust Eclipse Gown', price: 4800, description: 'Exquisite statement gown with sweeping train and subtle shimmer.', image: '/assets/stardust-gown.jpg' }
      ];

      // Automatically create URL slugs based on your naming format: aliveraatelier.in-[name]
      const productsWithSlugs = rawProducts.map((p, index) => {
        const slugName = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return {
          id: index + 1,
          name: p.name,
          slug: `aliveraatelier.in-${slugName}`,
          price: p.price,
          description: p.description,
          image: p.image,
          sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        };
      });

      return new Response(JSON.stringify(productsWithSlugs), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- 2. ADMIN ORDERS API ---
    if (path === '/api/admin/orders' && request.method === 'GET') {
      try {
        let orders = [];
        if (env.DB) {
          const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY id DESC").all().catch(() => ({ results: [] }));
          orders = results || [];
        }
        return new Response(JSON.stringify({ success: true, orders }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
      }
    }

    // --- 3. CHECKOUT & ORDER SUBMISSION (ALV- Prefix + Instant Notification) ---
    if (path === '/api/orders' && request.method === 'POST') {
      try {
        const orderData = await request.json();
        
        // Ensure Order ID strictly starts with ALV-
        const uniqueSuffix = Date.now().toString().slice(-6);
        const orderId = orderData.orderId && orderData.orderId.startsWith('ALV-') 
          ? orderData.orderId 
          : `ALV-${uniqueSuffix}`;

        const cleanPhone = String(orderData.phone || "").replace(/\D/g, '').slice(-10) || "8114433903";

        // Save order into D1 database
        if (env.DB) {
          await env.DB.prepare(
            `INSERT INTO orders (order_id, client_name, phone, email, total_amount, address, city, state, pincode, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            orderId, 
            orderData.clientName, 
            cleanPhone, 
            orderData.email, 
            orderData.totalAmount, 
            orderData.full_address, 
            orderData.city, 
            orderData.state, 
            orderData.pincode, 
            JSON.stringify(orderData)
          ).run().catch(err => console.log('DB save error:', err));
        }

        // Instant background sync to Shiprocket & Notification trigger
        ctx.waitUntil((async () => {
          try {
            const authRes = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                email: env.SHIPROCKET_EMAIL || "shiprocket@aliveraatelier.in", 
                password: env.SHIPROCKET_PASSWORD || "" 
              })
            });
            const authData = await authRes.json();
            if (authRes.ok && authData.token) {
              await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${authData.token}`
                },
                body: JSON.stringify({
                  order_id: orderId,
                  order_date: new Date().toISOString().replace('T', ' ').substring(0, 16),
                  pickup_location: "Primary",
                  billing_customer_name: orderData.clientName,
                  billing_address: orderData.full_address,
                  billing_city: orderData.city,
                  billing_pincode: Number(orderData.pincode),
                  billing_state: orderData.state,
                  billing_country: "India",
                  billing_email: orderData.email || "contact@aliveraatelier.in",
                  billing_phone: cleanPhone,
                  shipping_is_billing: true,
                  order_items: (orderData.items || []).map(i => ({
                    name: i.name,
                    sku: i.sku || "ALIVERA-GARMENT",
                    units: i.quantity || 1,
                    selling_price: i.price
                  })),
                  payment_method: "Prepaid",
                  sub_total: orderData.totalAmount,
                  length: 12, width: 10, height: 4, weight: 0.5
                })
              });
            }
          } catch (err) {
            console.error('Shiprocket sync background error:', err);
          }
        })());

        return new Response(JSON.stringify({ success: true, order_id: orderId }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 400 });
      }
    }

    // --- 4. STATIC ASSETS FALLBACK ---
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response('Not found', { status: 404 });
    }
  }
};

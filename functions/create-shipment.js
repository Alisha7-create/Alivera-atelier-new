export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const orderData = await request.json();

    if (!env.SHIPROCKET_API_KEY) {
      throw new Error("Shiprocket API Key is not configured in Cloudflare environment variables.");
    }

    // 1. Format the order payload for Shiprocket
    const shipmentPayload = {
      order_id: orderData.orderId,
      order_date: new Date().toISOString().slice(0, 10),
      pickup_location: "Primary", // Update this if your warehouse location has a different name in Shiprocket
      billing_customer_name: orderData.customerName,
      billing_last_name: "",
      billing_address: orderData.address,
      billing_city: orderData.city,
      billing_pincode: orderData.pincode,
      billing_state: orderData.state,
      billing_country: "India",
      billing_email: orderData.customerEmail,
      billing_phone: orderData.phone,
      shipping_is_billing: true,
      order_items: orderData.items.map(item => ({
        name: item.name,
        sku: item.sku || "ALV-DRESS",
        units: item.quantity || 1,
        selling_price: item.price
      })),
      payment_method: orderData.paymentMethod || "Prepaid",
      sub_total: orderData.totalAmount,
      length: 10,
      breadth: 10,
      height: 5,
      weight: 0.5
    };

    // 2. Push order directly to Shiprocket using your API Key
    const orderResponse = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.SHIPROCKET_API_KEY}`
      },
      body: JSON.stringify(shipmentPayload)
    });

    const orderResult = await orderResponse.json();
    if (!orderResponse.ok) throw new Error("Failed to create shipment: " + JSON.stringify(orderResult));

    return new Response(JSON.stringify({ success: true, shipment: orderResult }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

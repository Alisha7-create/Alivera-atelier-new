export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      customerDetails, 
      cartItems, 
      finalAmount 
    } = body;

    // 1. Verify Razorpay Signature securely using Web Crypto API
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(env.RAZORPAY_KEY_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(text));
    const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (generatedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ success: false, error: "Invalid payment signature verification failed." }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Prepare unified order payload
    const dressSummary = cartItems.map(i => `${i.name} (Qty: ${i.quantity})`).join(', ');
    const orderPayload = {
      orderId: razorpay_payment_id,
      customerName: customerDetails.name,
      to: customerDetails.email,
      phone: customerDetails.phone,
      address: customerDetails.address,
      city: customerDetails.city,
      pincode: customerDetails.pincode,
      state: customerDetails.state || "Rajasthan",
      dressDetails: dressSummary,
      status: "Under Production",
      totalAmount: finalAmount,
      items: cartItems.map(item => ({
        name: item.name,
        sku: item.sku || "ALV-DRESS",
        quantity: item.quantity || 1,
        price: item.price
      }))
    };

    // 2. Automatically dispatch order to Shiprocket
    const shiprocketPayload = {
      order_id: razorpay_payment_id,
      order_date: new Date().toISOString().slice(0, 10),
      pickup_location: "Primary",
      billing_customer_name: customerDetails.name,
      billing_last_name: "",
      billing_address: customerDetails.address,
      billing_city: customerDetails.city,
      billing_pincode: customerDetails.pincode,
      billing_state: customerDetails.state || "Rajasthan",
      billing_country: "India",
      billing_email: customerDetails.email,
      billing_phone: customerDetails.phone,
      shipping_is_billing: true,
      order_items: orderPayload.items,
      payment_method: "Prepaid",
      sub_total: finalAmount,
      length: 10,
      breadth: 10,
      height: 5,
      weight: 0.5
    };

    const shiprocketRes = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.SHIPROCKET_API_KEY}`
      },
      body: JSON.stringify(shiprocketPayload)
    });

    const shiprocketResult = await shiprocketRes.json();

    // 3. Trigger Email Dispatch (Customer + Admin Notification)
    await sendEmailsInternal(env, orderPayload);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Payment verified, fulfillment triggered, and emails dispatched successfully.",
      orderId: razorpay_payment_id,
      shipment: shiprocketResult
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}

// Internal email runner
async function sendEmailsInternal(env, orderData) {
  const { to, customerName, orderId, dressDetails, totalAmount, phone, address, city, pincode } = orderData;
  const firstName = customerName ? customerName.split(' ')[0] : 'Valued Client';
  const shortId = orderId ? orderId.slice(0, 6).toUpperCase() : 'ALV-001';

  const customerHtmlBody = `
  <div style="background-color: #050505; color: #f5f5f4; font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(191, 149, 63, 0.3);">
      <div style="text-align: center; border-bottom: 1px solid rgba(191, 149, 63, 0.3); padding-bottom: 20px; margin-bottom: 24px;">
          <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #fcf6ba; font-size: 24px; margin: 0; letter-spacing: 2px;">ALIVÈRA ATELIER</h1>
          <p style="font-size: 10px; color: #a8a29e; text-transform: uppercase; letter-spacing: 3px; margin-top: 5px;">#${shortId}</p>
      </div>
      <p style="font-size: 14px; color: #d6d3d1;">Dear ${firstName},</p>
      <p style="font-size: 14px; color: #e7e5e4; line-height: 1.6;">Your bespoke dress is currently under creation!<br>Your selection: <strong>${dressDetails}</strong>.<br><br>Estimated delivery: 5-7 business days.</p>
      <div style="background-color: #0c0a09; border: 1px solid rgba(191, 149, 63, 0.3); padding: 16px; margin: 24px 0; font-size: 12px;">
          <p style="color: #fcf6ba; font-weight: bold; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 1px;">--- Pricing Breakdown ---</p>
          <p style="margin: 4px 0; color: #d6d3d1;"><strong>Total Paid (incl. Delivery & GST):</strong> ₹${totalAmount}</p>
      </div>
      <p style="font-size: 13px; color: #a8a29e; margin-top: 30px; text-align: center;">
          Thank you for choosing Alivèra Atelier.<br><br>
          <em style="font-family: 'Playfair Display', Georgia, serif; color: #fcf6ba; font-size: 14px; letter-spacing: 1px;">Beautiful. The way you are...</em>
      </p>
  </div>`;

  // 1. Send confirmation to customer
  await env.EMAIL.send({
    to: to,
    from: "hello@aliveraatelier.in",
    subject: `Order Confirmation #${shortId} — Alivèra Atelier`,
    html: customerHtmlBody,
  });

  // 2. Send notification to admin from customer email
  await env.EMAIL.send({
    to: "contact@aliveraatelier.in",
    from: to,
    subject: `[New Order Alert] #${shortId} - ₹${totalAmount}`,
    html: `
      <div style="background-color: #050505; color: #f5f5f4; font-family: sans-serif; padding: 20px; border: 1px solid #bf953f; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #fcf6ba; margin-top: 0; font-family: serif; letter-spacing: 1px;">New Atelier Order Received</h2>
        <p><strong>Order ID:</strong> #${shortId}</p>
        <p><strong>Client Name:</strong> ${customerName}</p>
        <p><strong>Client Email:</strong> ${to}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Shipping Address:</strong> ${address}, ${city} - ${pincode}</p>
        <p><strong>Total Paid:</strong> ₹${totalAmount}</p>
        <hr style="border-color: rgba(191,149,63,0.3);">
        <p style="font-size: 12px; color: #a8a29e;">This order has been securely verified, pushed to Shiprocket, and emailed directly from ${to}.</p>
      </div>
    `,
  });
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

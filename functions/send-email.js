export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const orderData = await request.json();

    const { 
      to, 
      customerName, 
      orderId, 
      dressDetails, 
      status, 
      totalAmount, 
      trackingId, 
      phone, 
      address, 
      city, 
      pincode 
    } = orderData;

    if (!to || !status) {
      return new Response(JSON.stringify({ error: "Missing required fields (to, status)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const firstName = customerName ? customerName.split(' ')[0] : 'Valued Client';
    const shortId = orderId ? orderId.slice(0, 6).toUpperCase() : 'ALV-001';
    const trackingRef = trackingId || 'Pending Creation';
    
    // Financial calculations: Base amount, ₹49 delivery charge, and calculated GST (e.g. 5% or standard breakdown)
    const subTotal = Number(totalAmount) || 0;
    const deliveryFee = 49;
    const estimatedGst = Math.round(subTotal * 0.05); // Standard 5% garment GST tier estimate
    const finalTotal = subTotal + deliveryFee + estimatedGst;

    let subject = "";
    let messageBody = "";

    // Editorial messaging logic matching your design standards
    if (status === 'Under Production') {
      subject = `Order Confirmation #${shortId} — Alivèra Atelier`;
      messageBody = `Your bespoke dress is currently under creation!<br>Your selection: <strong>${dressDetails || 'Custom Garment'}</strong>.<br><br>Please confirm these details within 24 hours. Estimated delivery: 5-7 business days.`;
    } else if (status === 'Refund Processed') {
      subject = `Refund Processed: Important Information #${shortId} — Alivèra Atelier`;
      messageBody = `A refund of ₹${finalTotal} for your order of <strong>${dressDetails || 'Custom Garment'}</strong> has been processed and should reflect in your account within 5-7 business days.`;
    } else if (status === 'Request Denied') {
      subject = `Important: Order Request Denial #${shortId} — Alivèra Atelier`;
      messageBody = `Unfortunately, we cannot fulfill your request for <strong>${dressDetails || 'Custom Garment'}</strong> at this time. We apologize for the inconvenience.`;
    } else {
      subject = `Order Update #${shortId} — Alivèra Atelier`;
      messageBody = `Your order status has been updated to: <strong>${status}</strong>.`;
    }

    // High-fashion editorial email template for the customer (GSTIN removed from footer)
    const customerHtmlBody = `
    <div style="background-color: #050505; color: #f5f5f4; font-family: 'Plus Jakarta Sans', Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(191, 149, 63, 0.3);">
        <div style="text-align: center; border-bottom: 1px solid rgba(191, 149, 63, 0.3); padding-bottom: 20px; margin-bottom: 24px;">
            <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #fcf6ba; font-size: 24px; margin: 0; letter-spacing: 2px;">ALIVÈRA ATELIER</h1>
            <p style="font-size: 10px; color: #a8a29e; text-transform: uppercase; letter-spacing: 3px; margin-top: 5px;">#${shortId}</p>
        </div>
        
        <p style="font-size: 14px; color: #d6d3d1;">Dear ${firstName},</p>
        <p style="font-size: 14px; color: #e7e5e4; line-height: 1.6;">${messageBody}</p>
        
        <div style="background-color: #0c0a09; border: 1px solid rgba(191, 149, 63, 0.3); padding: 16px; margin: 24px 0; font-size: 12px;">
            <p style="color: #fcf6ba; font-weight: bold; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 1px;">--- Bill & Pricing Breakdown ---</p>
            <p style="margin: 4px 0; color: #d6d3d1;"><strong>Garment Subtotal:</strong> ₹${subTotal}</p>
            <p style="margin: 4px 0; color: #d6d3d1;"><strong>Delivery Charges:</strong> ₹${deliveryFee}</p>
            <p style="margin: 4px 0; color: #d6d3d1;"><strong>Estimated GST:</strong> ₹${estimatedGst}</p>
            <p style="margin: 8px 0 4px 0; color: #fcf6ba; font-size: 13px;"><strong>Total Amount:</strong> ₹${finalTotal}</p>
            <p style="margin: 4px 0; color: #d6d3d1;"><strong>Tracking ID:</strong> ${trackingRef}</p>
        </div>
        
        <p style="font-size: 13px; color: #a8a29e; margin-top: 30px; text-align: center;">
            Thank you for choosing Alivèra Atelier.<br><br>
            <em style="font-family: 'Playfair Display', Georgia, serif; color: #fcf6ba; font-size: 14px; letter-spacing: 1px;">Beautiful. The way you are...</em>
        </p>
    </div>`;

    // 1. Send confirmation to the customer
    await env.EMAIL.send({
      to: to,
      from: "hello@aliveraatelier.in",
      subject: subject,
      html: customerHtmlBody,
    });

    // 2. Send the notification to your atelier inbox (from customer email)
    await env.EMAIL.send({
      to: "contact@aliveraatelier.in",
      from: to,
      subject: `[New Order Alert] #${shortId} - ₹${finalTotal}`,
      html: `
        <div style="background-color: #050505; color: #f5f5f4; font-family: sans-serif; padding: 20px; border: 1px solid #bf953f; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #fcf6ba; margin-top: 0; font-family: serif; letter-spacing: 1px;">New Atelier Order Received</h2>
          <p><strong>Order ID:</strong> #${shortId}</p>
          <p><strong>Client Name:</strong> ${customerName || 'N/A'}</p>
          <p><strong>Client Email:</strong> ${to}</p>
          <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
          <p><strong>Shipping Address:</strong> ${address || ''}, ${city || ''} - ${pincode || ''}</p>
          <p><strong>Subtotal:</strong> ₹${subTotal}</p>
          <p><strong>Delivery Fee:</strong> ₹${deliveryFee}</p>
          <p><strong>GST:</strong> ₹${estimatedGst}</p>
          <p><strong>Final Total:</strong> ₹${finalTotal}</p>
          <p><strong>Status:</strong> ${status}</p>
          <hr style="border-color: rgba(191,149,63,0.3);">
          <p style="font-size: 12px; color: #a8a29e;">This notification was sent directly from the customer's email address (${to}).</p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true, finalTotal, message: "Customer and admin emails sent successfully" }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
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

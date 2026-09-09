export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { items, customerDetails } = body;

    // 1. Calculate base subtotal from cart items
    const subTotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);

    // 2. Add fixed delivery charges (₹49) and estimated GST (5%)
    const deliveryFee = 49;
    const estimatedGst = Math.round(subTotal * 0.05); 
    const finalAmount = subTotal + deliveryFee + estimatedGst;

    // 3. Create Razorpay Order (Razorpay expects amount in paise, multiply by 100)
    const razorpayKeyId = env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = env.RAZORPAY_KEY_SECRET;

    const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${credentials}`
      },
      body: JSON.stringify({
        amount: finalAmount * 100, // Total in paise (Subtotal + Delivery + GST)
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          customerName: customerDetails.name,
          email: customerDetails.email
        }
      })
    });

    const order = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      throw new Error(order.error?.description || "Failed to create Razorpay order");
    }

    // Return order ID and the precise financial breakdown back to your frontend
    return new Response(JSON.stringify({
      success: true,
      orderId: order.id,
      amount: finalAmount,
      subTotal,
      deliveryFee,
      estimatedGst
    }), {
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

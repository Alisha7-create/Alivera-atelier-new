export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { items, customerDetails, userId } = body; // Expecting userId or email from frontend

    // 1. Calculate base subtotal from cart items
    const rawSubTotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);

    // 2. Check if this is their first order (10% discount logic)
    // Note: If you store user order status in Firestore, you can fetch it here, 
    // or determine it via customerDetails.email. For now, we apply a flag check:
    let isFirstOrder = false;
    let subTotal = rawSubTotal;

    // Optional: If you want to check user history via Firestore REST API or a flag passed from frontend:
    // (If customerDetails indicates a first-time guest or you pass a verification flag)
    if (customerDetails && customerDetails.isFirstTimeCustomer === true) {
      isFirstOrder = true;
      subTotal = rawSubTotal * 0.90; // Apply 10% discount to subtotal
    }

    // 3. Add fixed delivery charges (₹49) and estimated GST (5% on discounted subTotal)
    const deliveryFee = 49;
    const estimatedGst = Math.round(subTotal * 0.05); 
    const finalAmount = subTotal + deliveryFee + estimatedGst;

    // 4. Create Razorpay Order (Razorpay expects amount in paise, multiply by 100)
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
        amount: Math.round(finalAmount * 100), // Total in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          customerName: customerDetails.name,
          email: customerDetails.email,
          isFirstOrder: isFirstOrder.toString()
        }
      })
    });

    const order = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      throw new Error(order.error?.description || "Failed to create Razorpay order");
    }

    // Return order ID and financial breakdown back to your frontend
    return new Response(JSON.stringify({
      success: true,
      orderId: order.id,
      amount: finalAmount,
      subTotal,
      rawSubTotal,
      discountApplied: rawSubTotal - subTotal,
      deliveryFee,
      estimatedGst,
      isFirstOrder
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

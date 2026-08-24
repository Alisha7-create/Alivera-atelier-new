var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/payments/create.js
var clean3 = /* @__PURE__ */ __name((v) => String(v ?? "").trim(), "clean");

async function quote(b) {
  const items = Array.isArray(b.items) ? b.items : [];
  if (!items.length) throw new Error("Your bag is empty.");
  
  const name = clean3(b.customer_name);
  const mail = clean3(b.email).toLowerCase();
  const phone = clean3(b.phone);
  const address = clean3(b.address);
  const city = clean3(b.city);
  const state = clean3(b.state);
  const pincode = clean3(b.pincode);
  
  if (!name || !mail || !phone || !address || !city || !state || !pincode) {
    throw new Error("Please complete all delivery details.");
  }
  
  const ids = [...new Set(items.map((x) => x.product_id).filter(Boolean))];
  if (!ids.length) throw new Error("Invalid bag.");
  
  const { rows: products } = await db.query(
    "SELECT id, name, price, stock, active FROM products WHERE id = ANY($1::uuid[])", 
    [ids]
  );
  const byId = new Map(products.map((p) => [String(p.id), p]));
  
  let subtotal = 0;
  const checked = [];
  
  for (const item of items) {
    const p = byId.get(String(item.product_id));
    const qty = Math.max(1, Math.min(10, Number(item.quantity) || 1));
    if (!p || !p.active) throw new Error("A product in your bag is unavailable.");
    if (Number(p.stock) > 0 && Number(p.stock) < qty) {
      throw new Error(`Only ${p.stock} available for ${p.name}.`);
    }
    const size = clean3(item.size);
    const line = Number(p.price) * qty;
    subtotal += line;
    checked.push({ p, qty, size, customFit: !!item.custom_fit, line });
  }
  
  const promoCode = clean3(b.promo_code).toUpperCase();
  let discount = 0;
  let campaign = null;
  
  if (promoCode) {
    const { rows } = await db.query(
      "SELECT * FROM campaigns WHERE code=$1 AND active=true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()) AND (max_uses IS NULL OR used_count < max_uses) LIMIT 1", 
      [promoCode]
    );
    campaign = rows[0];
    if (!campaign) throw new Error("That discount code is not active or has expired.");
    if (subtotal < Number(campaign.min_subtotal || 0)) {
      throw new Error(`This code requires a minimum order of \u20B9${Number(campaign.min_subtotal).toFixed(0)}.`);
    }
    if (campaign.max_uses_per_customer) {
      const { rows: uc } = await db.query(
        "SELECT COUNT(*)::int AS count FROM orders WHERE lower(email)=lower($1) AND upper(coalesce(promo_code,''))=$2 AND payment_status IN ('paid','pending')", 
        [mail, promoCode]
      );
      if (Number(uc[0].count) >= Number(campaign.max_uses_per_customer)) {
        throw new Error("This discount has reached its limit for this customer.");
      }
    }
    discount = campaign.discount_type === "fixed" 
      ? Math.min(subtotal, Number(campaign.discount_value)) 
      : Math.min(subtotal, subtotal * Number(campaign.discount_value) / 100);
  }
  
  const shipping = 49;
  const total = Math.max(0, subtotal - discount + shipping);

  return {
    subtotal,
    discount,
    shipping,
    total,
    campaign,
    checked,
    mail,
    name,
    phone,
    address,
    city,
    state,
    pincode,
    notes: clean3(b.notes),
    promoCode
  };
}
__name(quote, "quote");

export default async function payments_create_default(req, res) {
  try {
    const b = req.body || {};
    const q = await quote(b);

    if (q.total <= 0) {
      return res.status(400).json({ error: "Invalid order total." });
    }

    if (q.campaign) {
      await db.query(
        "UPDATE campaigns SET used_count = used_count + 1, updated_at = now() WHERE id = $1", 
        [q.campaign.id]
      );
    }

    const orderNumber = "ALV-" + Date.now().toString(36).toUpperCase();
    
    const { rows: orderRows } = await db.query(
      `INSERT INTO orders (order_number, customer_name, email, phone, address, city, state, pincode, notes, subtotal, shipping, total, payment_method, payment_status, promo_code) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'online', 'pending', $13) RETURNING id, order_number, total`,
      [orderNumber, q.name, q.mail, q.phone, q.address, q.city, q.state, q.pincode, q.notes, q.subtotal, q.shipping, q.total, q.promoCode]
    );
    const order = orderRows[0];

    for (const x of q.checked) {
      await db.query(
        "INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price, line_total, custom_fit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [order.id, x.p.id, x.p.name, x.size, x.qty, x.p.price, x.line, x.customFit]
      );
      if (Number(x.p.stock) > 0) {
        await db.query(
          "UPDATE products SET stock = GREATEST(stock - $1, 0), updated_at = now() WHERE id = $2", 
          [x.qty, x.p.id]
        );
      }
    }

    return res.json({
      ok: true,
      order: order.order_number,
      subtotal: q.subtotal,
      discount: q.discount,
      shipping: q.shipping,
      total: q.total,
      currency: "INR"
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Failed to create payment session." });
  }
}

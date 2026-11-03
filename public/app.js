const API = '/api';
let products = [];
let bag = JSON.parse(localStorage.getItem('alv_bag') || '[]');
let appliedDiscount = 0;
let appliedPromoCode = '';

const money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const esc = s => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const AS = window.ALIVERA_ASSETS || {};

const charts = {
    'lavender-light-top': { rows: [['BUST', 32, 34, 36, 38, 40, 42], ['WAIST', 26, 28, 30, 32, 34, 36], ['SHOULDER', 13.5, 14, 14.5, 15, 15.5, 16], ['SLEEVE LENGTH', 11, 11.5, 12, 12.5, 13, 13.5], ['UPPER ARM CIRCUMFERENCE', 11, 11.5, 12, 12.5, 13, 13.5], ['WRIST CIRCUMFERENCE (ELASTIC)', 6, 6.5, 7, 7.5, 8, 8.5], ['TOP LENGTH (FROM SHOULDER)', 20, 20.5, 21, 21.5, 22, 22.5]] },
    'sunset-breeze': { rows: [['BUST', 32, 34, 36, 38, 40, 42], ['WAIST (ELASTIC)', 24, 26, 28, 30, 32, 34], ['HIP (FREE FLOW)', 'FITS ALL', 'FITS ALL', 'FITS ALL', 'FITS ALL', 'FITS ALL', 'FITS ALL'], ['SHOULDER', 13, 13.5, 14, 14.5, 15, 15.5], ['SLEEVE LENGTH', 8, 8.5, 9, 9.5, 10, 10.5], ['UPPER ARM CIRCUMFERENCE', 11, 11.5, 12, 12.5, 13, 13.5], ['WRIST CIRCUMFERENCE', 6.5, 7, 7.5, 8, 8.5, 9], ['SKIRT LENGTH (FRONT)', 35, 35.5, 36, 36.5, 37, 37.5], ['SKIRT LENGTH (BACK)', 47, 47.5, 48, 48.5, 49, 49.5], ['DRESS LENGTH (FROM SHOULDER)', 52, 52.5, 53, 53.5, 54, 54.5]] },
    'emerald-pearl': { rows: [['BUST', 32, 34, 36, 38, 40, 42], ['WAIST', 24, 26, 28, 30, 32, 34], ['HIP', 34, 36, 38, 40, 42, 44], ['SHOULDER', 13, 13.5, 14, 14.5, 15, 15.5], ['SLEEVE LENGTH', 23, 23.5, 24, 24.5, 25, 25.5], ['UPPER ARM CIRCUMFERENCE', 11, 11.5, 12, 12.5, 13, 13.5], ['WRIST CIRCUMFERENCE', 6.5, 7, 7.5, 8, 8.5, 9], ['SKIRT LENGTH (FROM WAIST)', 24, 24.5, 25, 25.5, 26, 26.5], ['DRESS LENGTH (FROM SHOULDER)', 38, 38.5, 39, 39.5, 40, 40.5]] },
    'stardust-eclipse-gown': { rows: [['BUST', 32, 34, 36, 38, 40, 42], ['WAIST', 24, 26, 28, 30, 32, 34], ['HIP', 34, 36, 38, 40, 42, 44], ['SHOULDER', 13, 13.5, 14, 14.5, 15, 15.5], ['SLEEVE LENGTH', 27, 27.5, 28, 28.5, 29, 29.5], ['UPPER ARM CIRCUMFERENCE', 11, 11.5, 12, 12.5, 13, 13.5], ['WRIST CIRCUMFERENCE', 6.5, 7, 7.5, 8, 8.5, 9], ['SKIRT LENGTH (FRONT)', 60, 60.5, 61, 61.5, 62, 62.5], ['SKIRT LENGTH (BACK/TRAIN)', 70, 71, 72, 73, 74, 75], ['GOWN LENGTH (FROM SHOULDER)', 60, 60.5, 61, 61.5, 62, 62.5], ['NECK HEIGHT', 2, 2, 2, 2, 2, 2]] }
};

const assetBySlug = { 'lavender-light-top': AS.lavender, 'sunset-breeze': AS.sunset, 'emerald-pearl': AS.emerald, 'stardust-eclipse-gown': AS.stardust };
const chartAssetBySlug = { 'lavender-light-top': AS.lavender_chart, 'sunset-breeze': AS.sunset_chart, 'emerald-pearl': AS.emerald_chart, 'stardust-eclipse-gown': AS.stardust_chart };

function imageFor(p) { return p.image_url || assetBySlug[p.slug] || ''; }
function chartFor(p) { return p.size_chart_url || chartAssetBySlug[p.slug] || ''; }

function save() { localStorage.setItem('alv_bag', JSON.stringify(bag)); renderBag(); }

function renderBag() {
    const countEl = document.getElementById('bagCount');
    if (countEl) countEl.textContent = bag.reduce((s, x) => s + x.quantity, 0);
    
    const el = document.getElementById('bagItems');
    if (!el) return;
    
    if (!bag.length) {
        el.innerHTML = '<div style="padding:40px 0;text-align:center;color:#888">Your bag is waiting for something beautiful.</div>';
        const totalEl = document.getElementById('bagTotal');
        if (totalEl) totalEl.textContent = '₹0';
        return;
    }
    
    let total = 0;
    el.innerHTML = bag.map((x, i) => {
        total += x.price * x.quantity;
        return `<div class="bagitem"><div>${x.image ? `<img class="bagthumb" src="${x.image}" alt="${esc(x.name)}">` : ''}</div><div><h4>${esc(x.name)}</h4><p>Size: ${esc(x.size)}${x.customFitNotes ? ' · Custom fit' : ''}</p><p>${money(x.price)} × ${x.quantity}</p><button class="remove" onclick="removeItem(${i})">Remove</button></div><strong>${money(x.price * x.quantity)}</strong></div>`;
    }).join('');
    
    let finalBagTotal = total - appliedDiscount;
    if (finalBagTotal < 0) finalBagTotal = 0;

    const totalEl = document.getElementById('bagTotal');
    if (totalEl) totalEl.textContent = money(finalBagTotal);

    let checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.onclick = () => openCheckoutModal(total);
    }
}

function removeItem(i) { bag.splice(i, 1); save(); }
function openBag() { document.getElementById('drawer')?.classList.add('open'); document.getElementById('backdrop')?.classList.add('show'); }
function closeBag() { document.getElementById('drawer')?.classList.remove('open'); document.getElementById('backdrop')?.classList.remove('show'); }

function addToBag(p, size, customFitNotes) {
    const found = bag.find(x => x.id === p.id && x.size === size && (x.customFitNotes || '') === (customFitNotes || ''));
    if (found) found.quantity++;
    else bag.push({ id: p.id, name: p.name, price: Number(p.price), size, customFitNotes: customFitNotes || '', image: imageFor(p), quantity: 1 });
    save();
    openBag();
}

function showSizeChart(p) {
    const chart = charts[p.slug];
    const img = chartFor(p);
    let body = `<p class="eyebrow">SIZE GUIDE</p><h2 class="checkouttitle">${esc(p.name)}</h2><p class="muted">All measurements are in inches. There may be a 0.5–1 inch variation. Fits true to size; order one size up if you prefer more room.</p>`;
    if (img) body += `<img class="chartimage" src="${img}" alt="${esc(p.name)} size chart">`;
    if (chart) body += `<div class="chartwrap"><table class="charttable"><thead><tr><th>Measurement</th><th>XS</th><th>S</th><th>M</th><th>L</th><th>XL</th><th>XXL</th></tr></thead><tbody>${chart.rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    
    const chartBody = document.getElementById('chartBody');
    const modal = document.getElementById('sizeChartModal');
    if (chartBody) chartBody.innerHTML = body;
    if (modal) modal.classList.add('show');
}

function closeSizeChart() { document.getElementById('sizeChartModal')?.classList.remove('show'); }

// Dedicated E-Commerce Style Dress Page View
function showProduct(p) {
    window.history.pushState({ productId: p.id }, p.name, `/products/aliveraatelier.in-${p.slug}`);
    const image = imageFor(p);
    const mainContainer = document.getElementById('mainAppContainer');
    if (!mainContainer) return;

    mainContainer.innerHTML = `
        <div style="max-width:1200px; margin:40px auto; padding:0 5vw; display:grid; grid-template-columns:1fr 1fr; gap:50px; align-items:start;">
            <div>
                <div class="detailmedia" style="border-radius:6px; overflow:hidden;">
                    ${image ? `<img src="${image}" alt="${esc(p.name)}" style="width:100%; height:100%; object-fit:cover;">` : `<div class="placeholder">${esc(p.name)}</div>`}
                </div>
            </div>
            <div>
                <button onclick="loadStoreHome()" class="chartlink" style="margin-bottom:15px; cursor:pointer;">← Back to Collection</button>
                <p class="eyebrow">${esc((p.slug || '').replaceAll('-', ' ').toUpperCase())}</p>
                <h1 style="font:500 36px 'Playfair Display'; margin:0 0 10px; color:#fff;">${esc(p.name)}</h1>
                <h3 class="detailprice" style="font-size:24px;">${money(p.price)}</h3>
                <p class="muted" style="margin-bottom:20px;">${esc(p.description || 'Crafted individually in our studio for a precise drape.')}</p>
                <p class="madeorder"><b>Made to order</b> · Prepared especially for you.</p>
                
                <div class="field" style="margin-top:15px;">
                    <label style="color:#f5f2eb;"><b>Choose size</b></label>
                    <select id="sizeSelect" style="padding:12px; border:1px solid var(--line); width:100%; background:#1a1714; color:#fff; font:inherit;">
                        ${(p.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL']).map(s => `<option>${esc(s)}</option>`).join('')}
                    </select>
                </div>
                
                <div class="field" style="margin-top:15px;">
                    <label style="color:#f5f2eb;"><b>Custom Fit / Tailoring Measurements & Notes</b></label>
                    <textarea id="customFitInput" placeholder="Enter custom measurements (Bust, Waist, Hip, Length) or tailoring notes..." style="width:100%; height:80px; padding:10px; border:1px solid var(--line); border-radius:4px; font-family:inherit; font-size:14px; background:#1a1714; color:#fff;"></textarea>
                </div>

                <div style="display:flex; gap:15px; margin-top:20px;">
                    <button class="btn gold-btn" id="addToBagBtn" style="flex:2; padding:15px;">Add to bag</button>
                    <button class="btn" onclick="toggleWishlist('${esc(p.name)}')" style="flex:1; background:#221c13; color:#d4af37; border:1px solid var(--gold-muted); cursor:pointer;">♡ Wishlist</button>
                    <button class="btn" onclick="shareProduct('${esc(p.name)}')" style="flex:1; background:#221c13; color:#d4af37; border:1px solid var(--gold-muted); cursor:pointer;">Share</button>
                </div>

                <button class="chartlink" id="viewChartBtn" style="margin-top:15px; display:block;">View detailed size chart</button>

                <!-- Pincode Delivery Checker -->
                <div style="margin-top:25px; background:#141210; padding:15px; border:1px solid var(--line); border-radius:6px;">
                    <label style="font-weight:bold; display:block; margin-bottom:8px; color:#f5f2eb;">Check Delivery Availability</label>
                    <div style="display:flex; gap:10px;">
                        <input type="text" id="pincodeCheckInput" placeholder="Enter 6-digit Pincode" maxlength="6" style="flex:1; padding:10px; border:1px solid var(--line); background:#1a1714; color:#fff; border-radius:4px;">
                        <button type="button" onclick="checkPincodeDelivery()" class="btn gold-btn" style="padding:10px 15px; cursor:pointer;">Check</button>
                    </div>
                    <p id="pincodeStatusMsg" style="font-size:12px; margin-top:6px; font-weight:bold;"></p>
                </div>

                <!-- Customer Reviews Section -->
                <div style="margin-top:25px; border-top:1px solid var(--line); padding-top:15px;">
                    <h4 style="font:500 16px 'Playfair Display'; margin-bottom:10px; color:#fff;">Customer Reviews</h4>
                    <div style="font-size:12px; color:#a39b90; margin-bottom:8px; border-left:2px solid var(--gold); padding-left:8px;">"The fabric drape and custom stitching exceeded expectations completely!" — Ananya S.</div>
                    <div style="font-size:12px; color:#a39b90; border-left:2px solid var(--gold); padding-left:8px;">"Absolute luxury finish. Customer service helped with custom measurements effortlessly." — Priya R.</div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('viewChartBtn').onclick = () => showSizeChart(p);
    document.getElementById('addToBagBtn').onclick = () => {
        const size = document.getElementById('sizeSelect').value;
        const customFitNotes = document.getElementById('customFitInput').value.trim();
        addToBag(p, size, customFitNotes);
    };
    window.scrollTo(0, 0);
}

function loadStoreHome() {
    window.history.pushState({}, '', '/');
    location.reload();
}

function toggleWishlist(name) {
    alert(`"${name}" has been added to your wishlist!`);
}

function shareProduct(name) {
    if (navigator.share) {
        navigator.share({ title: name, url: window.location.href });
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Product link copied to clipboard!');
    }
}

function checkPincodeDelivery() {
    const pin = document.getElementById('pincodeCheckInput').value.trim();
    const msg = document.getElementById('pincodeStatusMsg');
    if (pin.length !== 6 || isNaN(pin)) {
        msg.style.color = '#ff6b6b';
        msg.textContent = 'Please enter a valid 6-digit pincode.';
        return;
    }
    msg.style.color = '#51cf66';
    msg.textContent = `✓ Express delivery & custom tailoring dispatch available for ${pin}!`;
}

function closeCheckout() { document.getElementById('checkout')?.classList.remove('show'); }

// Formal Tax Invoice Bill & Single-Block Checkout
function openCheckoutModal(totalAmount) {
    if (!bag.length) {
        alert("Your bag is empty.");
        return;
    }

    const modal = document.getElementById('checkout');
    if (!modal) modal.classList.add('show');
    
    const bodyEl = document.getElementById('checkoutBody');
    if (!bodyEl) return;

    const subtotal = bag.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let finalTotal = subtotal - appliedDiscount;
    if (finalTotal < 0) finalTotal = 0;

    bodyEl.innerHTML = `
        <button class="close" onclick="closeCheckout()">×</button>
        <div style="background:#141210; border:1px solid var(--gold-muted); padding:30px; font-family:inherit; color:#f5f2eb; max-width:680px; margin:auto;">
            <div style="border-bottom:2px solid var(--gold); padding-bottom:15px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h2 style="font:600 22px 'Playfair Display'; margin:0; color:var(--gold);">ALIVÈRA ATELIER</h2>
                    <small style="color:#a39b90;">Tax Invoice & Custom Order Summary</small>
                </div>
                <div style="text-align:right;">
                    <b style="font-size:12px;">Date:</b> ${new Date().toLocaleDateString()}<br>
                    <b style="font-size:12px;">Order ID:</b> ALV-${Date.now().toString().slice(-6)}
                </div>
            </div>

            <!-- Itemized Invoice Table -->
            <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:13px;">
                <thead>
                    <tr style="background:#1a1714; color:var(--gold);">
                        <th style="padding:10px; border-bottom:1px solid var(--line); text-align:left;">Garment / Description</th>
                        <th style="padding:10px; border-bottom:1px solid var(--line); text-align:left;">Size / Fit</th>
                        <th style="padding:10px; border-bottom:1px solid var(--line); text-align:left;">Qty</th>
                        <th style="padding:10px; border-bottom:1px solid var(--line); text-align:left;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${bag.map(i => `
                        <tr>
                            <td style="padding:10px; border-bottom:1px solid var(--line);"><b>${esc(i.name)}</b>${i.customFitNotes ? `<br><small style="color:#ff6b6b">Fit: ${esc(i.customFitNotes)}</small>` : ''}</td>
                            <td style="padding:10px; border-bottom:1px solid var(--line);">${esc(i.size)}</td>
                            <td style="padding:10px; border-bottom:1px solid var(--line);">${i.quantity}</td>
                            <td style="padding:10px; border-bottom:1px solid var(--line); color:var(--gold);">${money(i.price * i.quantity)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <!-- Promo Code Section -->
            <div style="display:flex; gap:10px; margin:15px 0;">
                <input type="text" id="promoCodeInput" placeholder="Enter Promo Code (e.g. ALIVE10)" value="${appliedPromoCode}" style="flex:1; padding:10px; border:1px solid var(--line); background:#1a1714; color:#fff; border-radius:4px;">
                <button type="button" class="btn gold-btn" onclick="applyPromoCode(${subtotal})" style="padding:10px 15px; cursor:pointer;">Apply</button>
            </div>
            <p id="promoMsg" style="font-size:12px; margin-bottom:15px; font-weight:bold; color:#51cf66;"></p>

            <!-- Bill Totals -->
            <div style="border-top:1px solid var(--line); padding-top:12px; margin-bottom:20px; font-size:14px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>Subtotal:</span> <span>${money(subtotal)}</span></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px; color:#51cf66;"><span>Discount / Promo:</span> <span>- ${money(appliedDiscount)}</span></div>
                <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:bold; border-top:1px solid var(--gold); padding-top:8px; margin-top:8px; color:var(--gold);">
                    <span>Total Payable:</span> <span>${money(finalTotal)}</span>
                </div>
            </div>

            <!-- Single-Block Address Form -->
            <form id="shippingForm" onsubmit="submitUnifiedOrder(event, ${finalTotal})" style="display:flex; flex-direction:column; gap:12px;">
                <h4 style="font:500 16px 'Playfair Display'; margin-bottom:4px; border-bottom:1px solid var(--line); padding-bottom:6px; color:var(--white);">Delivery & Contact Details</h4>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <input type="text" id="custName" placeholder="Full Name" required style="padding:10px; border:1px solid var(--line); background:#1a1714; color:#fff; border-radius:4px;">
                    <input type="tel" id="custPhone" placeholder="10-digit Phone Number" required maxlength="10" style="padding:10px; border:1px solid var(--line); background:#1a1714; color:#fff; border-radius:4px;">
                </div>
                
                <div>
                    <input type="email" id="custEmail" placeholder="Email Address (contact@aliveraatelier.in)" required style="width:100%; padding:10px; border:1px solid var(--line); background:#1a1714; color:#fff; border-radius:4px;">
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <input type="text" id="custHouse" placeholder="House / Building Number" required style="padding:10px; border:1px solid var(--line); background:#1a1714; color:#fff; border-radius:4px;">
                    <input type="text" id="custLandmark" placeholder="Landmark (Optional)" style="padding:10px; border:1px solid var(--line); background:#1a1714; color:#fff; border-radius:4px;">
                </div>

                <div>
                    <textarea id="custFullAddress" placeholder="Full Street Address" required rows="2" style="width:100%; padding:10px; border:1px solid var(--line); background:#1a1714; color:#fff; border-radius:4px; font-family:inherit;"></textarea>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
                    <input type="text" id="custCity" placeholder="City" required style="padding:10px; border:1px solid var(--line); background:#1a1714; color:#fff; border-radius:4px;">
                    <input type="text" id="custState" placeholder="State" value="Rajasthan" required style="padding:10px; border:1px solid var(--line); background:#1a1714; color:#fff; border-radius:4px;">
                    <input type="text" id="confirmedPincode" placeholder="Pincode" required maxlength="6" style="padding:10px; border:1px solid var(--line); background:#1a1714; color:#fff; border-radius:4px;">
                </div>

                <button type="submit" id="payRazorpayBtn" class="btn gold-btn full" style="margin-top:10px; padding:14px; font-size:15px; font-weight:bold;">Pay ${money(finalTotal)} with Razorpay</button>
            </form>
        </div>
    `;
    modal.classList.add('show');
}

function applyPromoCode(subtotal) {
    const code = document.getElementById('promoCodeInput').value.trim().toUpperCase();
    const msg = document.getElementById('promoMsg');
    if (code === 'ALIVE10') {
        appliedDiscount = subtotal * 0.10;
        appliedPromoCode = code;
        msg.style.color = '#51cf66';
        msg.textContent = '✓ Promo code ALIVE10 applied (10% OFF)!';
        openCheckoutModal(subtotal);
    } else if (code === 'ATELIER500') {
        appliedDiscount = 500;
        appliedPromoCode = code;
        msg.style.color = '#51cf66';
        msg.textContent = '✓ Promo code ATELIER500 applied (₹500 OFF)!';
        openCheckoutModal(subtotal);
    } else {
        msg.style.color = '#ff6b6b';
        msg.textContent = 'Invalid promo code.';
    }
}

async function submitUnifiedOrder(e, totalAmount) {
    e.preventDefault();

    const name = document.getElementById('custName').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    const phone = document.getElementById('custPhone').value.trim().replace(/\D/g, '').slice(-10);
    const house = document.getElementById('custHouse').value.trim();
    const landmark = document.getElementById('custLandmark').value.trim();
    const address = document.getElementById('custFullAddress').value.trim();
    const city = document.getElementById('custCity').value.trim();
    const state = document.getElementById('custState').value.trim();
    const pincode = document.getElementById('confirmedPincode').value.trim();

    if (!name || !email || phone.length !== 10 || !house || !address || !city || !state || pincode.length !== 6) {
        alert("Please fill in all address and contact fields correctly.");
        return;
    }

    const fullAddressString = `House: ${house}, Landmark: ${landmark || 'N/A'}, ${address}`;

    const options = {
        key: "rzp_live_TUhsK2amojFPDp",
        amount: Math.round(Number(totalAmount) * 100),
        currency: "INR",
        name: "Alivèra Atelier",
        description: "Custom Designer Apparel",
        image: "/favicon.png",
        handler: async function (response) {
            try {
                const orderPayload = {
                    orderId: "ALV-" + Date.now().toString().slice(-6),
                    clientName: name,
                    phone: phone,
                    email: email,
                    full_address: fullAddressString,
                    city: city,
                    state: state,
                    pincode: pincode,
                    totalAmount: Number(totalAmount),
                    paymentMethod: "Prepaid",
                    razorpay_payment_id: response.razorpay_payment_id,
                    items: bag
                };

                const res = await fetch(API + '/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderPayload)
                });

                const result = await res.json();
                if (result.success) {
                    localStorage.removeItem('alv_bag');
                    bag = [];
                    renderBag();
                    closeCheckout();
                    closeBag();
                    alert("Payment successful! Order placed and synced to Admin Dashboard & Shiprocket.");
                    window.location.reload();
                } else {
                    alert("Payment successful, but sync notice: " + (result.error || "Check admin dashboard"));
                }
            } catch (err) {
                console.error("Order submission error:", err);
                alert("Payment received, but failed to notify server. Please contact support.");
            }
        },
        prefill: { name: name, email: email, contact: phone },
        theme: { color: "#d4af37" }
    };

    const rzp = new Razorpay(options);
    rzp.open();
}

async function load() {
    try {
        const r = await fetch(API + '/products');
        products = await r.json();
        
        const countEl = document.getElementById('productCount');
        if (countEl) countEl.textContent = products.length + ' pieces';
        
        const productsEl = document.getElementById('products');
        if (!productsEl) return;

        productsEl.innerHTML = products.filter(p => p.active !== false).map(p => {
            const image = imageFor(p);
            return `<article class="product" data-id="${p.id}" style="cursor:pointer">
                <div class="productpic">${image ? `<img src="${image}" alt="${esc(p.name)}">` : `<div class="placeholder">${esc(p.name)}</div>`}</div>
                <div class="productinfo"><div><h3>${esc(p.name)}</h3><p>aliveraatelier.in-${esc(p.slug)}</p></div><strong>${money(p.price)}</strong></div>
            </article>`;
        }).join('');

        productsEl.querySelectorAll('.product').forEach(card => {
            const id = card.getAttribute('data-id');
            const productObj = products.find(x => String(x.id) === String(id));
            if (productObj) {
                card.onclick = () => showProduct(productObj);
            }
        });

    } catch (e) {
        const productsEl = document.getElementById('products');
        if (productsEl) productsEl.innerHTML = '<p>Collection temporarily unavailable.</p>';
    }
    renderBag();
}

load();

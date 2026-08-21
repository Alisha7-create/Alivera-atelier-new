const API = '/api';
let products = [];
let bag = JSON.parse(localStorage.getItem('alv_bag') || '[]');

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
        el.innerHTML = '<div style="padding:40px 0;text-align:center;color:#777">Your bag is waiting for something beautiful.</div>';
        const totalEl = document.getElementById('bagTotal');
        if (totalEl) totalEl.textContent = '₹0';
        return;
    }
    
    let total = 0;
    el.innerHTML = bag.map((x, i) => {
        total += x.price * x.quantity;
        return `<div class="bagitem"><div>${x.image ? `<img class="bagthumb" src="${x.image}" alt="${esc(x.name)}">` : ''}</div><div><h4>${esc(x.name)}</h4><p>Size: ${esc(x.size)}${x.customFit ? ' · Custom fit' : ''}</p><p>${money(x.price)} × ${x.quantity}</p><button class="remove" onclick="removeItem(${i})">Remove</button></div><strong>${money(x.price * x.quantity)}</strong></div>`;
    }).join('');
    
    const totalEl = document.getElementById('bagTotal');
    if (totalEl) totalEl.textContent = money(total);
}

function removeItem(i) { bag.splice(i, 1); save(); }
function openBag() { document.getElementById('drawer')?.classList.add('open'); document.getElementById('backdrop')?.classList.add('show'); }
function closeBag() { document.getElementById('drawer')?.classList.remove('open'); document.getElementById('backdrop')?.classList.remove('show'); }

function addToBag(p, size, customFit) {
    const found = bag.find(x => x.id === p.id && x.size === size && !!x.customFit === !!customFit);
    if (found) found.quantity++;
    else bag.push({ id: p.id, name: p.name, price: Number(p.price), size, customFit: !!customFit, image: imageFor(p), quantity: 1 });
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

function showProduct(p) {
    const modal = document.getElementById('checkout');
    const image = imageFor(p);
    if (!modal) return;
    modal.classList.add('show');
    
    const bodyEl = document.getElementById('checkoutBody');
    if (!bodyEl) return;

    bodyEl.innerHTML = `
        <button class="close" onclick="closeCheckout()">×</button>
        <p class="eyebrow">${esc((p.slug || '').replaceAll('-', ' ').toUpperCase())}</p>
        <div class="productdetail">
            <div class="detailmedia">${image ? `<img src="${image}" alt="${esc(p.name)}">` : `<div class="placeholder">${esc(p.name)}</div>`}</div>
            <div>
                <h2 class="checkouttitle">${esc(p.name)}</h2>
                <h3 class="detailprice">${money(p.price)}</h3>
                <p>${esc(p.description || 'Made with care by Alivèra Atelier.')}</p>
                <p class="madeorder"><b>Made to order</b> · Prepared especially for you.</p>
                <div class="field"><label>Choose size</label><select id="sizeSelect">${(p.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL']).map(s => `<option>${esc(s)}</option>`).join('')}</select></div>
                <label class="customfit"><input id="customFit" type="checkbox"> I want custom fit / tailoring</label>
                <button class="chartlink" id="viewChartBtn">View size chart</button>
                <button class="btn dark full" id="addToBagBtn" style="margin-top:18px">Add to bag</button>
            </div>
        </div>`;

    document.getElementById('viewChartBtn').onclick = () => showSizeChart(p);
    document.getElementById('addToBagBtn').onclick = () => {
        const size = document.getElementById('sizeSelect').value;
        const customFit = document.getElementById('customFit').checked;
        addToBag(p, size, customFit);
        closeCheckout();
    };
}

function closeCheckout() { document.getElementById('checkout')?.classList.remove('show'); }

async function load() {
    try {
        const r = await fetch(API + '/products');
        products = await r.json();
        
        const countEl = document.getElementById('productCount');
        if (countEl) countEl.textContent = products.length + ' pieces';
        
        const productsEl = document.getElementById('products') || document.getElementById('store-catalog');
        if (!productsEl) return;

        productsEl.innerHTML = products.filter(p => p.active !== false).map(p => {
            const image = imageFor(p);
            return `<article class="product" data-id="${p.id}" style="cursor:pointer">
                <div class="productpic">${image ? `<img src="${image}" alt="${esc(p.name)}">` : `<div class="placeholder">${esc(p.name)}</div>`}</div>
                <div class="productinfo"><div><h3>${esc(p.name)}</h3><p>Made to order · XS–XXL</p></div><strong>${money(p.price)}</strong></div>
            </article>`;
        }).join('');

        // Attach click handlers cleanly via JavaScript to avoid apostrophe and escaping bugs
        productsEl.querySelectorAll('.product').forEach(card => {
            const id = card.getAttribute('data-id');
            const productObj = products.find(x => String(x.id) === String(id));
            if (productObj) {
                card.onclick = () => showProduct(productObj);
            }
        });

    } catch (e) {
        const productsEl = document.getElementById('products') || document.getElementById('store-catalog');
        if (productsEl) productsEl.innerHTML = '<p>Collection temporarily unavailable.</p>';
    }
    renderBag();
}

load();

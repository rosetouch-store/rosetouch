/* ============================================================
   Rose Touch — منطق المتجر
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const state = {
    cat: 'all',
    q: '',
    sort: 'featured',
    favOnly: false,
    checkoutStep: 0,
    searchTimer: null,
    deliveryArea: ''
  };

  const els = {
    grid: $('#productGrid'),
    empty: $('#productsEmpty'),
    chips: $('#filterChips'),
    cats: $('#categoriesGrid'),
    cart: $('#cartDrawer'),
    cartItems: $('#cartItems'),
    cartEmpty: $('#cartEmpty'),
    cartFoot: $('#cartFoot'),
    shipProgress: $('#shipProgress'),
    toast: $('#toast')
  };

  let toastTimer = null;
  let lastFocused = null;

  /* ---------- أدوات ---------- */
  function toast(message, isError) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.toggle('is-error', !!isError);
    els.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('is-visible'), 3200);
  }

  function money(n) { return RT.money(n); }

  function productById(id) { return RT.db().products.find(p => p.id === id); }

  function artFor(p) { return RT.productImage(p); }

  function isOut(p) { return (Number(p.stock) || 0) <= 0; }

  function statusText(p) {
    const stock = Number(p.stock) || 0;
    if (stock <= 0) return '<span class="stock-note stock-note--out">نفدت الكمية</span>';
    if (stock <= 6) return `<span class="stock-note">آخر ${stock} قطع</span>`;
    return '';
  }

  function lockBody(lock) {
    document.body.classList.toggle('is-locked', lock);
  }

  function anyOverlayOpen() {
    return !!$('.modal.is-open') || (els.cart && els.cart.classList.contains('is-open')) || ($('#searchOverlay') && $('#searchOverlay').classList.contains('is-open'));
  }

  /* ---------- الإعدادات ---------- */
  function applySettings() {
    const s = RT.settings();
    const set = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };

    set('#brandName', s.storeName || 'Rose Touch');
    set('#announcementText', s.announcement);
    const marqueeTrack = $('#marqueeTrack');
    if (marqueeTrack && s.marqueeText != null) {
      const items = String(s.marqueeText).split('|').map(x => x.trim()).filter(Boolean);
      if (items.length) {
        const doubled = items.concat(items);
        marqueeTrack.innerHTML = doubled.map((t, i) => `<span>${esc(t)}</span>` + (i < doubled.length - 1 ? '<i>✦</i>' : '')).join('');
      }
    }
    set('#heroBadge', s.heroBadge);
    set('#heroTitle', s.heroTitle);
    set('#heroAccent', s.heroAccent);
    set('#heroText', s.heroText);
    set('#heroCta', s.heroCta);
    set('#aboutTitle', s.aboutTitle);
    set('#aboutText', s.aboutText);
    set('#contactAddress', s.address);
    set('#contactHours', s.workingHours);
    set('#year', new Date().getFullYear());
    document.title = (s.storeName || 'Rose Touch') + ' — ' + (s.tagline || 'شموع فاخرة مصبوبة يدويًا');

    const wa = String(s.whatsapp || '').replace(/\D/g, '');
    const tel = String(s.phone || '').replace(/[^\d+]/g, '');
    const waHref = wa ? `https://wa.me/${wa}` : '#contact';
    if ($('#contactPhone')) {
      $('#contactPhone').textContent = s.phone || '';
      $('#contactPhone').href = tel ? `tel:${tel}` : '#contact';
    }
    if ($('#contactWhatsapp')) {
      $('#contactWhatsapp').textContent = s.phone || '';
      $('#contactWhatsapp').href = waHref;
    }
    if ($('#faqWhatsapp')) $('#faqWhatsapp').href = wa ? `${waHref}?text=${encodeURIComponent('مرحبًا Rose Touch، لدي استفسار 🌹')}` : '#contact';
    if ($('#favorCall')) {
      $('#favorCall').textContent = s.phone || '';
      $('#favorCall').href = tel ? `tel:${tel}` : '#contact';
    }
    if ($('#whatsappLink')) $('#whatsappLink').href = waHref;
    if ($('#instagramLink')) $('#instagramLink').href = s.instagram ? `https://instagram.com/${String(s.instagram).replace('@', '')}` : '#contact';

    // عرض خاص
    const offerProduct = productById('p7') || RT.db().products.find(p => p.compareAt);
    if (offerProduct && $('#offerPrice')) {
      $('#offerPrice').textContent = money(offerProduct.price);
      const old = $('#offerPrice').nextElementSibling;
      if (old) old.textContent = money(offerProduct.compareAt || offerProduct.price);
    }

    // بيانات واتساب/الهاتف القابلة للنسخ
    const phoneEl = $('#contactPhone');
    if (phoneEl) phoneEl.style.direction = 'ltr';
  }

  /* ---------- صور الفن ---------- */
  function injectArt() {
    $$('[data-art-product]').forEach(box => {
      const p = productById(box.getAttribute('data-art-product'));
      if (!p) return;
      const img = document.createElement('img');
      img.src = artFor(p);
      img.alt = p.name;
      img.loading = 'lazy';
      box.appendChild(img);
    });
  }

  /* ---------- التصنيفات ---------- */
  function renderCategories() {
    const db = RT.db();
    const active = db.products.filter(p => p.active);
    els.cats.innerHTML = db.categories.map(c => {
      const count = active.filter(p => p.category === c.id).length;
      const sample = active.find(p => p.category === c.id) || db.products.find(p => p.category === c.id);
      const img = sample ? artFor(sample) : RT.candleArt(c.palette, c.id);
      return `<a class="category-card" href="#products" data-cat="${esc(c.id)}">
        <img src="${img}" alt="${esc(c.name)}" loading="lazy">
        <span class="category-card__arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 12H5m6-6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <div class="category-card__body">
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.desc)}</p>
          <span class="category-card__count">${count} منتج</span>
        </div>
      </a>`;
    }).join('');
  }

  function renderChips() {
    const db = RT.db();
    const items = [{ id: 'all', name: 'كل الشموع' }].concat(db.categories);
    els.chips.innerHTML = items.map(c =>
      `<button class="chip${state.cat === c.id ? ' is-active' : ''}" data-cat="${esc(c.id)}">${esc(c.name)}</button>`
    ).join('');
  }

  /* ---------- شبكة المنتجات ---------- */
  function filteredProducts() {
    const db = RT.db();
    const favs = RT.favorites();
    let list = db.products.filter(p => p.active);
    if (state.cat !== 'all') list = list.filter(p => p.category === state.cat);
    if (state.favOnly) list = list.filter(p => favs.includes(p.id));

    const q = state.q.trim().toLowerCase();
    if (q) {
      list = list.filter(p => {
        const hay = [p.name, p.en, p.scent, p.desc, RT.categoryName(p.category), (p.notes || []).join(' ')].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }

    const byNew = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    switch (state.sort) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'bestseller': list.sort((a, b) => (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0) || byNew(a, b)); break;
      case 'new': list.sort(byNew); break;
      default:
        list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0) || byNew(a, b));
    }
    return list;
  }

  function productCard(p) {
    const out = isOut(p);
    const favs = RT.favorites();
    const isFav = favs.includes(p.id);
    const sale = p.compareAt && p.compareAt > p.price;
    const badges = [];
    if (out) badges.push('<span class="badge badge--out">نفدت الكمية</span>');
    else {
      if (sale) badges.push('<span class="badge badge--sale">خصم</span>');
      if (p.bestseller) badges.push('<span class="badge">الأكثر مبيعًا</span>');
      else if (p.featured) badges.push('<span class="badge badge--gold">مميز</span>');
    }
    return `<article class="product-card${out ? ' is-out' : ''}" data-id="${esc(p.id)}">
      <div class="product-card__media" data-quick="${esc(p.id)}" role="button" tabindex="0" aria-label="عرض ${esc(p.name)}">
        <img src="${artFor(p)}" alt="${esc(p.name)}" loading="lazy">
        <div class="product-card__badges">${badges.join('')}</div>
        <div class="product-card__actions">
          <button class="mini-btn${isFav ? ' is-fav' : ''}" data-fav="${esc(p.id)}" aria-label="${isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 6.5 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" stroke-linejoin="round"/></svg>
          </button>
          <button class="mini-btn" data-quick="${esc(p.id)}" aria-label="عرض سريع">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>
          </button>
        </div>
        <div class="product-card__add">
          <button data-add="${esc(p.id)}" ${out ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
            ${out ? 'غير متوفر' : 'أضيفي للسلة'}
          </button>
        </div>
      </div>
      <div class="product-card__body">
        <span class="product-card__cat">${esc(RT.categoryName(p.category))}</span>
        <h3 class="product-card__name"><a href="#" data-quick="${esc(p.id)}">${esc(p.name)}</a></h3>
        <p class="product-card__scent">${esc(p.scent)}</p>
        <div class="product-card__foot">
          <div class="price">
            <strong>${money(p.price)}</strong>
            ${sale ? `<s>${money(p.compareAt)}</s>` : ''}
          </div>
          ${statusText(p)}
        </div>
      </div>
    </article>`;
  }

  function renderProducts() {
    const list = filteredProducts();
    els.grid.innerHTML = list.map(productCard).join('');
    els.empty.hidden = list.length > 0;
    els.grid.hidden = list.length === 0;
  }

  /* ---------- مناطق التوصيل ---------- */
  function deliveryAreas() {
    return (RT.deliveryAreas ? RT.deliveryAreas() : []) || [];
  }

  function currentDeliveryArea() {
    const sel = $('#deliveryAreaSelect');
    if (sel && sel.value) return sel.value;
    return state.deliveryArea || '';
  }

  function renderDeliveryOptions() {
    const sel = $('#deliveryAreaSelect');
    if (!sel) return;
    const areas = deliveryAreas().filter(a => a && a.enabled !== false);
    const prev = sel.value || state.deliveryArea || '';
    const opts = ['<option value="">اختاري المنطقة…</option>']
      .concat(areas.map(a => `<option value="${esc(a.name)}">${esc(a.name)} — ${money(Number(a.fee) || 0)}</option>`))
      .concat(['<option value="__other__">منطقة أخرى…</option>']);
    sel.innerHTML = opts.join('');
    if (prev && (prev === '__other__' || areas.some(a => a.name === prev))) sel.value = prev;
  }

  function syncDeliveryCityField() {
    const sel = $('#deliveryAreaSelect');
    const wrap = $('#deliveryCityWrap');
    const input = $('#deliveryCityInput');
    const hint = $('#deliveryFeeHint');
    if (!sel || !wrap) return;
    const other = sel.value === '__other__';
    wrap.hidden = !other;
    if (input) input.required = other;
    if (hint) {
      if (!sel.value) {
        hint.textContent = 'اختاري منطقة التوصيل لحساب رسوم الشحن تلقائيًا.';
      } else if (other) {
        hint.textContent = 'اكتبي اسم منطقتك، وسنحدد رسوم التوصيل ونتواصل معك للتأكيد.';
      } else {
        const cart = RT.activeCart(false);
        const totals = RT.cartTotals(cart, sel.value);
        const area = deliveryAreas().find(a => a.name === sel.value);
        hint.textContent = totals.subtotal === 0
          ? `رسوم التوصيل إلى ${sel.value}: ${money(Number(area && area.fee) || 0)}.`
          : (totals.shipping === 0
            ? `توصيل مجاني إلى ${sel.value} 🎉`
            : `رسوم التوصيل إلى ${sel.value}: ${money(totals.shipping)}.`);
      }
    }
  }

  /* ---------- السلة ---------- */
  function paintCart() {
    const cart = RT.activeCart(false);
    const area = currentDeliveryArea();
    const totals = RT.cartTotals(cart, area === '__other__' ? '' : area);
    const items = (cart && cart.items) || [];

    $('#cartCount').textContent = totals.count;
    $('#cartCount').hidden = totals.count === 0;
    $('#drawerCount').textContent = '(' + totals.count + ')';

    els.cartEmpty.classList.toggle('is-visible', items.length === 0);
    els.cartItems.hidden = items.length === 0;
    els.cartFoot.hidden = items.length === 0;
    els.shipProgress.hidden = items.length === 0;

    if (items.length) {
      els.cartItems.innerHTML = items.map(i => {
        const p = productById(i.productId);
        const img = p ? artFor(p) : RT.candleArt(i.palette, i.productId);
        const stock = p ? Number(p.stock) || 0 : 99;
        return `<div class="cart-item">
          <div class="cart-item__img"><img src="${img}" alt="${esc(i.name)}"></div>
          <div>
            <div class="cart-item__name">${esc(i.name)}</div>
            <div class="cart-item__price">${money(i.price)}</div>
            <div class="qty">
              <button data-qty="dec" data-id="${esc(i.productId)}" aria-label="تقليل" ${i.qty <= 1 ? 'disabled' : ''}>−</button>
              <span>${i.qty}</span>
              <button data-qty="inc" data-id="${esc(i.productId)}" aria-label="زيادة" ${i.qty >= stock ? 'disabled' : ''}>+</button>
            </div>
          </div>
          <button class="cart-item__remove" data-qty="rm" data-id="${esc(i.productId)}">إزالة</button>
        </div>`;
      }).join('');

      $('#cartSubtotal').textContent = money(totals.subtotal);
      $('#cartShipping').textContent = totals.shipping === 0 ? 'مجاني' : money(totals.shipping);
      $('#cartTotal').textContent = money(totals.total);

      const free = Number(RT.settings().freeShipping) || 0;
      const pct = free ? Math.min(100, (totals.subtotal / free) * 100) : 100;
      $('#shipBar').style.width = pct + '%';
      els.shipProgress.classList.toggle('is-done', pct >= 100);
      $('#shipText').textContent = pct >= 100
        ? 'مبروك! حصلتِ على شحن مجاني 🌹'
        : `أضيفي ${money(Math.max(0, free - totals.subtotal))} للحصول على شحن مجاني`;
    }
  }

  function openCart() {
    closeAllOverlays(true);
    paintCart();
    lastFocused = document.activeElement;
    els.cart.classList.add('is-open');
    els.cart.setAttribute('aria-hidden', 'false');
    lockBody(true);
    $('#drawerBackdrop').hidden = false;
    setTimeout(() => { const b = els.cart.querySelector('button'); if (b) b.focus({ preventScroll: true }); }, 120);
  }

  function closeCart() {
    els.cart.classList.remove('is-open');
    els.cart.setAttribute('aria-hidden', 'true');
    $('#drawerBackdrop').hidden = true;
    if (!anyOverlayOpen()) lockBody(false);
    if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
  }

  function addToCart(id, qty) {
    const p = productById(id);
    if (!p) return;
    if (isOut(p)) { toast('هذا المنتج غير متوفر حاليًا', true); return; }
    const cart = RT.activeCart(false);
    const line = cart && cart.items.find(i => i.productId === id);
    const current = line ? line.qty : 0;
    if (current + (qty || 1) > (Number(p.stock) || 0)) {
      toast(`الكمية المتاحة ${p.stock} فقط`, true);
      return;
    }
    RT.addToCart(id, qty || 1);
    paintCart();
    renderProducts();
    toast('أُضيفت «' + p.name + '» إلى السلة 🌹');
  }

  /* ---------- تفاصيل المنتج ---------- */
  function openProduct(id) {
    const p = productById(id);
    if (!p) return;
    RT.track('product_view', { productId: id, name: p.name });
    const out = isOut(p);
    const sale = p.compareAt && p.compareAt > p.price;
    $('#productDetail').innerHTML = `
      <div class="product-detail__media">
        <img src="${artFor(p)}" alt="${esc(p.name)}">
      </div>
      <div class="product-detail__body">
        <span class="product-detail__cat">${esc(RT.categoryName(p.category))}</span>
        <h3>${esc(p.name)}</h3>
        <span class="product-detail__scent">${esc(p.scent)}</span>
        <div class="product-detail__price">
          <strong>${money(p.price)}</strong>
          ${sale ? `<s>${money(p.compareAt)}</s>` : ''}
        </div>
        <p class="product-detail__desc">${esc(p.desc)}</p>
        <div class="notes">${(p.notes || []).map(n => `<span class="note-chip">${esc(n)}</span>`).join('')}</div>
        <div class="product-detail__meta">
          <div><small>الوزن</small><strong>${esc(p.weight)}</strong></div>
          <div><small>مدة الاحتراق</small><strong>${esc(p.burnTime)}</strong></div>
          <div><small>الرمز</small><strong>${esc(p.sku)}</strong></div>
          <div><small>التوفر</small><strong>${out ? 'غير متوفر' : p.stock + ' قطعة'}</strong></div>
        </div>
        <span class="product-detail__stock ${out ? 'is-out' : ''}">${out ? 'سنعلمك عند توفره مجددًا' : 'شمع صويا ١٠٠٪ · فتيل قطني · تغليف هدايا'}</span>
        <div class="product-detail__buy">
          <div class="qty">
            <button data-pqty="dec" aria-label="تقليل">−</button>
            <span id="modalQty">1</span>
            <button data-pqty="inc" aria-label="زيادة">+</button>
          </div>
          <button class="btn btn--primary" data-modal-add="${esc(p.id)}" ${out ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M6 8h12l-1.2 11a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 8Z" stroke-linejoin="round"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>
            ${out ? 'غير متوفر' : 'أضيفي للسلة'}
          </button>
        </div>
      </div>`;
    window.__modalQty = 1;
    window.__modalMax = Number(p.stock) || 0;
    openModal('#productModal');
  }

  /* ---------- النوافذ ---------- */
  function openModal(sel) {
    const m = $(sel);
    if (!m) return;
    lastFocused = document.activeElement;
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    lockBody(true);
    setTimeout(() => {
      const focusable = m.querySelector('button, input, [href]');
      if (focusable) focusable.focus({ preventScroll: true });
    }, 80);
  }

  function closeModal(m) {
    if (!m) return;
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    if (!anyOverlayOpen()) lockBody(false);
  }

  function closeAllOverlays(keepLock) {
    $$('.modal.is-open').forEach(closeModal);
    if (els.cart.classList.contains('is-open')) closeCart();
    const overlay = $('#searchOverlay');
    if (overlay.classList.contains('is-open')) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (!keepLock && !anyOverlayOpen()) lockBody(false);
  }

  /* ---------- إتمام الطلب ---------- */
  function paintCheckout() {
    const cart = RT.activeCart(false);
    const area = (() => {
      const sel = $('#deliveryAreaSelect');
      if (!sel) return currentDeliveryArea();
      if (sel.value === '__other__') return ($('#deliveryCityInput') && $('#deliveryCityInput').value.trim()) || '';
      return sel.value || currentDeliveryArea();
    })();
    const totals = RT.cartTotals(cart, area);
    const items = (cart && cart.items) || [];
    $('#checkoutItems').innerHTML = items.map(i => {
      const p = productById(i.productId);
      return `<div class="co-item">
        <div class="co-item__img"><img src="${p ? artFor(p) : RT.candleArt(i.palette, i.productId)}" alt=""></div>
        <span class="co-item__name">${esc(i.name)} <span class="co-item__qty">× ${i.qty}</span></span>
        <strong>${money(i.price * i.qty)}</strong>
      </div>`;
    }).join('');
    $('#coSubtotal').textContent = money(totals.subtotal);
    $('#coShipping').textContent = totals.shipping === 0 ? 'مجاني' : money(totals.shipping);
    $('#coTotal').textContent = money(totals.total);
    const hint = $('#loyaltyEarnHint');
    if (hint) {
      const s = RT.settings();
      const loy = s.loyalty || {};
      if (loy.enabled !== false && totals.subtotal > 0) {
        const rate = Math.max(1, Number(loy.pointsRate) || 10);
        const pts = Math.floor(totals.subtotal / rate);
        hint.hidden = false;
        hint.textContent = `نظام الولاء: ستحصلين على ${pts} نقطة تقريبًا من هذا الطلب (كل ${rate} ${RT.currency()} = نقطة).`;
      } else {
        hint.hidden = true;
      }
    }
    syncDeliveryCityField();
  }

  function openCheckout() {
    if (!RT.cartTotals(RT.activeCart(false)).count) { toast('السلة فارغة', true); return; }
    if (els.cart.classList.contains('is-open')) closeCart();
    renderDeliveryOptions();
    paintCheckout();
    openModal('#checkoutModal');
    RT.saveCheckoutContact({});
    const form = $('#checkoutForm');
    try {
      const saved = JSON.parse(localStorage.getItem('rosetouch_checkout') || '{}');
      ['name', 'phone', 'address'].forEach(k => {
        if (saved[k] && form.elements[k] && !form.elements[k].value) form.elements[k].value = saved[k];
      });
      if (saved.deliveryArea || saved.city) {
        const sel = $('#deliveryAreaSelect');
        const areas = deliveryAreas();
        const val = saved.deliveryArea || saved.city;
        if (sel) {
          if (areas.some(a => a.name === val)) sel.value = val;
          else sel.value = '__other__';
          state.deliveryArea = sel.value;
        }
        if ($('#deliveryCityInput')) $('#deliveryCityInput').value = saved.city || val || '';
      }
    } catch (e) { /* ignore */ }
    syncDeliveryCityField();
    paintCheckout();
    if (form.elements.name && !form.elements.name.value) setTimeout(() => form.elements.name.focus(), 250);
  }

  function validateCheckout(form) {
    const v = (name) => (form.elements[name] ? form.elements[name].value.trim() : '');
    if (v('name').length < 2) return { field: 'name', message: 'اكتبي الاسم الكامل' };
    const phone = v('phone').replace(/[\s-]/g, '');
    if (phone.replace(/\D/g, '').length < 9) return { field: 'phone', message: 'رقم الجوال غير صحيح' };
    const sel = $('#deliveryAreaSelect');
    if (sel && !sel.value) return { field: 'deliveryArea', message: 'اختاري منطقة التوصيل' };
    const city = (sel && sel.value === '__other__') ? v('city') : (sel ? sel.value : v('city'));
    if (String(city || '').trim().length < 2) return { field: sel && sel.value === '__other__' ? 'city' : 'deliveryArea', message: 'حددي منطقة/مدينة التوصيل' };
    if (v('address').length < 5) return { field: 'address', message: 'اكتبي العنوان التفصيلي' };
    return null;
  }

  /* ---------- المفضلة ---------- */
  function paintFavorites() {
    const favs = RT.favorites();
    $('#favCount').textContent = favs.length;
    $('#favCount').hidden = favs.length === 0;

    const items = favs.map(productById).filter(Boolean);
    $('#favItems').innerHTML = items.length
      ? items.map(p => `<div class="fav-item">
          <div class="fav-item__img"><img src="${artFor(p)}" alt="${esc(p.name)}"></div>
          <div><h4>${esc(p.name)}</h4><span>${money(p.price)}</span></div>
          <button class="mini-btn is-fav" data-fav="${esc(p.id)}" aria-label="إزالة">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" stroke="currentColor" stroke-width="1.4"><path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 6.5 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" stroke-linejoin="round"/></svg>
          </button>
        </div>`).join('')
      : '<p class="fav-empty">لم تضيفي أي شمعة للمفضلة بعد. اضغطي على القلب في أي منتج ليُحفظ هنا.</p>';
  }

  /* ---------- البحث ---------- */
  function searchProducts(q) {
    q = q.trim().toLowerCase();
    if (!q) {
      $('#searchResults').innerHTML = '<p class="search-hint">جرّبي: ورد، عنبر، فانيلا، هدايا…</p>';
      return;
    }
    const results = RT.db().products.filter(p => p.active && [p.name, p.en, p.scent, p.desc, RT.categoryName(p.category)].join(' ').toLowerCase().includes(q)).slice(0, 8);
    $('#searchResults').innerHTML = results.length
      ? results.map(p => `<a class="search-result" href="#" data-quick="${esc(p.id)}">
          <img src="${artFor(p)}" alt="">
          <div><h4>${esc(p.name)}</h4><span>${esc(p.scent)}</span></div>
          <strong>${money(p.price)}</strong>
        </a>`).join('')
      : '<p class="search-hint">لا توجد نتائج مطابقة. جرّبي كلمة أخرى مثل «ورد» أو «عنبر».</p>';
  }

  /* ---------- ساعة العرض ---------- */
  function startCountdown() {
    const KEY = 'rosetouch_offer_end';
    let end = Number(localStorage.getItem(KEY) || 0);
    if (!end || end < Date.now()) {
      end = Date.now() + (2 * 24 * 60 * 60 + 14 * 60 * 60 + 35 * 60) * 1000;
      try { localStorage.setItem(KEY, String(end)); } catch (e) { /* ignore */ }
    }
    const pad = (n) => String(n).padStart(2, '0');
    function tick() {
      let diff = Math.max(0, end - Date.now());
      const d = Math.floor(diff / 86400000); diff -= d * 86400000;
      const h = Math.floor(diff / 3600000); diff -= h * 3600000;
      const m = Math.floor(diff / 60000); diff -= m * 60000;
      const s = Math.floor(diff / 1000);
      const set = (id, v) => { const el = $(id); if (el) el.textContent = pad(v); };
      set('#cdD', d); set('#cdH', h); set('#cdM', m); set('#cdS', s);
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- الاستجابة ---------- */
  function bindEvents() {
    window.addEventListener('scroll', () => {
      $('#siteHeader').classList.toggle('is-scrolled', window.scrollY > 12);
    }, { passive: true });

    $('#menuBtn').addEventListener('click', () => {
      const nav = $('#mainNav');
      const open = nav.classList.toggle('is-open');
      $('#menuBtn').setAttribute('aria-expanded', String(open));
    });

    $$('#mainNav a').forEach(a => a.addEventListener('click', () => {
      $('#mainNav').classList.remove('is-open');
      $('#menuBtn').setAttribute('aria-expanded', 'false');
    }));

    $('#searchBtn').addEventListener('click', () => {
      $('#searchOverlay').classList.add('is-open');
      $('#searchOverlay').setAttribute('aria-hidden', 'false');
      lockBody(true);
      setTimeout(() => $('#searchField').focus(), 120);
    });

    $('#searchField').addEventListener('input', (e) => {
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => {
        searchProducts(e.target.value);
        if (e.target.value.trim().length >= 2) RT.track('search', { q: e.target.value.trim() });
      }, 220);
    });

    $('#cartBtn').addEventListener('click', openCart);
    $('#checkoutBtn').addEventListener('click', openCheckout);
    $('#favBtn').addEventListener('click', () => { paintFavorites(); openModal('#favModal'); });
    $('#favFilterBtn').addEventListener('click', () => {
      state.favOnly = !state.favOnly;
      $('#favFilterBtn').classList.toggle('is-active', state.favOnly);
      renderProducts();
    });

    $('#shopSearch').addEventListener('input', (e) => {
      state.q = e.target.value;
      renderProducts();
      clearTimeout(state.searchTimer);
      if (state.q.trim().length >= 3) {
        state.searchTimer = setTimeout(() => RT.track('search', { q: state.q.trim() }), 700);
      }
    });

    $('#sortSelect').addEventListener('change', (e) => { state.sort = e.target.value; renderProducts(); });

    $('#clearFiltersBtn').addEventListener('click', () => {
      state.cat = 'all'; state.q = ''; state.sort = 'featured'; state.favOnly = false;
      $('#shopSearch').value = '';
      $('#sortSelect').value = 'featured';
      $('#favFilterBtn').classList.remove('is-active');
      renderChips(); renderProducts();
    });

    els.chips.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-cat]');
      if (!chip) return;
      state.cat = chip.getAttribute('data-cat');
      renderChips();
      renderProducts();
      if (state.cat !== 'all') RT.track('category_view', { categoryId: state.cat });
    });

    els.cats.addEventListener('click', (e) => {
      const card = e.target.closest('[data-cat]');
      if (!card) return;
      state.cat = card.getAttribute('data-cat');
      state.favOnly = false;
      $('#favFilterBtn').classList.remove('is-active');
      renderChips();
      renderProducts();
      RT.track('category_view', { categoryId: state.cat });
    });

    // تفويض عام للأزرار
    document.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) { e.preventDefault(); addToCart(add.getAttribute('data-add'), 1); return; }

      const addOffer = e.target.closest('[data-add-product]');
      if (addOffer) { e.preventDefault(); addToCart(addOffer.getAttribute('data-add-product'), 1); return; }

      const fav = e.target.closest('[data-fav]');
      if (fav) {
        e.preventDefault();
        const id = fav.getAttribute('data-fav');
        const list = RT.toggleFavorite(id);
        const p = productById(id);
        toast(list.includes(id) ? 'أُضيفت «' + (p ? p.name : '') + '» إلى المفضلة' : 'أُزيلت من المفضلة');
        renderProducts(); paintFavorites();
        return;
      }

      const quick = e.target.closest('[data-quick]');
      if (quick) {
        e.preventDefault();
        const overlay = $('#searchOverlay');
        if (overlay.classList.contains('is-open')) {
          overlay.classList.remove('is-open');
          overlay.setAttribute('aria-hidden', 'true');
        }
        openProduct(quick.getAttribute('data-quick'));
        return;
      }

      const qty = e.target.closest('[data-qty]');
      if (qty) {
        e.preventDefault();
        const id = qty.getAttribute('data-id');
        const act = qty.getAttribute('data-qty');
        const cart = RT.activeCart(false);
        const line = cart && cart.items.find(i => i.productId === id);
        if (!line) return;
        if (act === 'rm') { RT.removeFromCart(id); toast('أُزيل المنتج من السلة'); }
        if (act === 'inc') RT.setCartQty(id, line.qty + 1);
        if (act === 'dec') RT.setCartQty(id, line.qty - 1);
        paintCart(); renderProducts();
        return;
      }

      const pqty = e.target.closest('[data-pqty]');
      if (pqty) {
        e.preventDefault();
        const act = pqty.getAttribute('data-pqty');
        const max = window.__modalMax || 99;
        window.__modalQty = Math.max(1, Math.min(max, (window.__modalQty || 1) + (act === 'inc' ? 1 : -1)));
        $('#modalQty').textContent = window.__modalQty;
        return;
      }

      const modalAdd = e.target.closest('[data-modal-add]');
      if (modalAdd) {
        e.preventDefault();
        addToCart(modalAdd.getAttribute('data-modal-add'), window.__modalQty || 1);
        closeModal($('#productModal'));
        openCart();
        return;
      }

      if (e.target.closest('[data-close-drawer]')) { closeCart(); return; }
      if (e.target.closest('[data-close-modal]')) { closeModal(e.target.closest('.modal')); return; }
      if (e.target.closest('[data-close-search]')) {
        $('#searchOverlay').classList.remove('is-open');
        $('#searchOverlay').setAttribute('aria-hidden', 'true');
        if (!anyOverlayOpen()) lockBody(false);
        return;
      }

      // إغلاق عند الضغط على خلفية البحث
      if (e.target.id === 'searchOverlay') {
        $('#searchOverlay').classList.remove('is-open');
        $('#searchOverlay').setAttribute('aria-hidden', 'true');
        if (!anyOverlayOpen()) lockBody(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModalEl = $('.modal.is-open');
        if (openModalEl) { closeModal(openModalEl); return; }
        if (els.cart.classList.contains('is-open')) { closeCart(); return; }
        const overlay = $('#searchOverlay');
        if (overlay.classList.contains('is-open')) {
          overlay.classList.remove('is-open');
          overlay.setAttribute('aria-hidden', 'true');
          if (!anyOverlayOpen()) lockBody(false);
        }
      }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-quick][role="button"]')) {
        e.preventDefault();
        openProduct(e.target.getAttribute('data-quick'));
      }
    });

    // نموذج إتمام الطلب
    $('#checkoutForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const err = validateCheckout(form);
      if (err) {
        toast(err.message, true);
        const field = form.elements[err.field];
        if (field) { field.focus(); field.style.borderColor = 'var(--rose)'; setTimeout(() => { field.style.borderColor = ''; }, 2200); }
        return;
      }
      const btn = $('#placeOrderBtn');
      btn.disabled = true;
      btn.textContent = 'جارٍ تأكيد الطلب…';
      const sel = $('#deliveryAreaSelect');
      const deliveryArea = sel ? (sel.value === '__other__' ? (form.elements.city.value.trim() || 'منطقة أخرى') : (sel.value || form.elements.city.value.trim())) : form.elements.city.value.trim();
      const cityVal = sel && sel.value !== '__other__' ? sel.value : form.elements.city.value.trim();
      const customer = {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        city: cityVal,
        deliveryArea: deliveryArea,
        address: form.elements.address.value.trim(),
        notes: form.elements.notes.value.trim()
      };
      try {
        const paymentRadio = form.querySelector('input[name="payment"]:checked');
        const order = RT.placeOrder(customer, paymentRadio ? paymentRadio.value : 'الدفع عند الاستلام');
        const waUrl = (RT.whatsappUrl && RT.orderText) ? RT.whatsappUrl(RT.orderText(order)) : '';
        if (RT.pushRemote) { try { RT.pushRemote('order', RT.orderRemotePayload ? RT.orderRemotePayload(order) : {}); } catch (e3) { /* ignore */ } }
        try { localStorage.setItem('rosetouch_checkout', JSON.stringify({ name: customer.name, phone: customer.phone, city: customer.city, address: customer.address, deliveryArea: deliveryArea })); } catch (e2) { /* ignore */ }
        closeModal($('#checkoutModal'));
        $('#successOrderNumber').textContent = order.number;
        const successWa = $('#successWhatsapp');
        if (successWa) { if (waUrl) { successWa.href = waUrl; successWa.hidden = false; } else { successWa.hidden = true; } }
        openModal('#successModal');
        if (waUrl) { try { window.open(waUrl, '_blank', 'noopener'); } catch (e4) { /* ignore */ } }
        form.reset();
        $$('.pay-option').forEach(o => o.classList.remove('is-active'));
        const first = $('.pay-option'); if (first) first.classList.add('is-active');
        paintCart(); renderProducts(); renderCategories();
      } catch (ex) {
        toast(ex.message || 'تعذّر إتمام الطلب', true);
      } finally {
        btn.disabled = false;
        btn.textContent = 'تأكيد الطلب';
      }
    });

    $('#checkoutForm').addEventListener('change', (e) => {
      if (e.target.name === 'payment') {
        $$('.pay-option').forEach(o => o.classList.toggle('is-active', o.contains(e.target)));
      }
      if (e.target.name === 'deliveryArea' || e.target.id === 'deliveryCityInput') {
        const sel = $('#deliveryAreaSelect');
        const area = sel ? (sel.value === '__other__' ? ($('#deliveryCityInput').value.trim() || '') : sel.value) : '';
        state.deliveryArea = sel ? sel.value : '';
        if (sel && sel.value !== '__other__' && $('#deliveryCityInput')) $('#deliveryCityInput').value = sel.value;
        syncDeliveryCityField();
        paintCheckout();
        paintCart();
        RT.saveCheckoutContact({ deliveryArea: area, city: $('#deliveryCityInput') ? $('#deliveryCityInput').value.trim() : area });
      }
    });
    $('#checkoutForm').addEventListener('input', (e) => {
      if (e.target.id === 'deliveryCityInput' && $('#deliveryAreaSelect') && $('#deliveryAreaSelect').value === '__other__') {
        syncDeliveryCityField();
        paintCheckout();
      }
    });

    $('#checkoutForm').addEventListener('focusout', (e) => {
      if (e.target.name === 'phone' && e.target.value.trim()) {
        RT.saveCheckoutContact({ phone: e.target.value.trim() });
      }
    });

    // التواصل
    $('#contactForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const name = form.elements.name.value.trim();
      const phone = form.elements.phone.value.trim();
      const message = form.elements.message.value.trim();
      const digits = phone.replace(/\D/g, '');
      if (name.length < 2) { toast('اكتبي اسمك من فضلك', true); return; }
      if (digits.length < 9 || digits.length > 15) { toast('رقم الهاتف غير صحيح', true); return; }
      if (message.length < 5) { toast('اكتبي رسالتك أولًا', true); return; }
      RT.contactMessage(name, phone, message);
      if (RT.pushRemote) { try { RT.pushRemote('message', { name: name, phone: phone, message: message }); } catch (e3) { /* ignore */ } }
      const waUrl = RT.whatsappUrl ? RT.whatsappUrl(RT.messageText ? RT.messageText({ name: name, phone: phone, message: message }) : '') : '';
      if (waUrl) { try { window.open(waUrl, '_blank', 'noopener'); } catch (e4) { /* ignore */ } }
      form.reset();
      toast('وصلتنا رسالتك، سنرد عليك قريبًا 🌹');
    });

    // أسئلة متكررة — أكورديون
    $$('.faq').forEach(d => d.addEventListener('toggle', () => {
      if (d.open) $$('.faq').forEach(o => { if (o !== d) o.open = false; });
    }));

    // شهادة العملاء
    const track = $('#testimonialTrack');
    const step = () => Math.min(400, track.clientWidth * 0.8);
    const go = (dir) => track.scrollBy({ left: dir * step(), behavior: 'smooth' });
    if ($('#testNext')) $('#testNext').addEventListener('click', () => go(-1));
    if ($('#testPrev')) $('#testPrev').addEventListener('click', () => go(1));

    // لوحة المفاتيح في البحث
    $('#searchField').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = $('#searchResults [data-quick]');
        if (first) { e.preventDefault(); first.click(); }
      }
    });

    // مزامنة بين التبويبات: تحديث فوري عند تعديل لوحة التحكم
    window.addEventListener('rosetouch:change', (e) => {
      if (!e.detail || e.detail.source !== 'external') return;
      applySettings();
      renderCategories();
      renderChips();
      renderProducts();
      paintCart();
      paintFavorites();
      toast('تم تحديث بيانات المتجر');
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'rosetouch_favorites') { paintFavorites(); renderProducts(); }
    });
  }

  /* ---------- توزيعات الشموع ---------- */
  function initFavorForm() {
    const form = $('#favorForm');
    if (!form) return;

    const eventSel = $('#favorEvent');
    RT.FAVOR_EVENTS.forEach(ev => {
      eventSel.insertAdjacentHTML('beforeend', `<option value="${esc(ev)}">${esc(ev)}</option>`);
    });

    const sizeSel = $('#favorSize');
    RT.FAVOR_SIZES.forEach((s, i) => {
      sizeSel.insertAdjacentHTML('beforeend', `<option value="${s.id}"${i === 1 ? ' selected' : ''}>${esc(s.label)} — ${money(s.price)}</option>`);
    });

    const packSel = $('#favorPackaging');
    RT.FAVOR_PACKAGING.forEach(p => {
      packSel.insertAdjacentHTML('beforeend', `<option value="${p.id}">${esc(p.label)} — ${money(p.price)}</option>`);
    });

    const colorBox = $('#favorColors');
    RT.FAVOR_COLORS.forEach((c, i) => {
      colorBox.insertAdjacentHTML('beforeend',
        `<label class="opt-chip${i === 0 ? ' is-active' : ''}"><input type="radio" name="color" value="${c.id}"${i === 0 ? ' checked' : ''}><i class="opt-chip__dot" style="background:${c.hex}"></i>${esc(c.label)}</label>`);
    });

    const scentBox = $('#favorScents');
    RT.FAVOR_SCENTS.forEach((s, i) => {
      scentBox.insertAdjacentHTML('beforeend',
        `<label class="opt-chip${i === 0 ? ' is-active' : ''}"><input type="checkbox" name="scents" value="${esc(s)}"${i === 0 ? ' checked' : ''}>${esc(s)}</label>`);
    });

    function readFavor() {
      return {
        event: eventSel.value,
        quantity: Math.max(RT.FAVOR_MIN_QTY, Math.floor(Number($('#favorQty').value) || 0)),
        size: sizeSel.value,
        packaging: packSel.value,
        color: (form.querySelector('input[name="color"]:checked') || {}).value || 'rose',
        scents: $$('input[name="scents"]:checked', form).map(x => x.value),
        labelText: ($('#favorLabel').value || '').trim()
      };
    }

    function updateEstimate() {
      const data = readFavor();
      $('#favorQtyOut').textContent = data.quantity + ' قطعة';
      $('#favorTotalOut').textContent = money(RT.favorEstimate(data));
    }

    function syncChips() {
      $$('.opt-chip', form).forEach(chip => {
        const input = chip.querySelector('input');
        chip.classList.toggle('is-active', !!input && input.checked);
      });
    }

    form.addEventListener('change', () => { syncChips(); updateEstimate(); });
    form.addEventListener('input', (e) => {
      if (e.target.name === 'quantity' || e.target.name === 'labelText') updateEstimate();
    });
    $('#favorQty').addEventListener('blur', (e) => {
      const v = Math.floor(Number(e.target.value) || 0);
      e.target.value = Math.max(RT.FAVOR_MIN_QTY, v || RT.FAVOR_MIN_QTY);
      updateEstimate();
    });

    $('#favorNew').addEventListener('click', () => {
      form.reset();
      $('#favorQty').value = RT.FAVOR_MIN_QTY;
      sizeSel.value = 'medium';
      packSel.value = 'kraft';
      const firstColor = form.querySelector('input[name="color"]');
      if (firstColor) firstColor.checked = true;
      $$('input[name="scents"]', form).forEach((x, i) => { x.checked = i === 0; });
      syncChips();
      updateEstimate();
      $('#favorSuccess').hidden = true;
      form.querySelector('button[type="submit"]').hidden = false;
      $('#favorForm [name="name"]').focus();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.elements.name.value.trim();
      const phone = form.elements.phone.value.trim();
      const digits = phone.replace(/\D/g, '');
      if (name.length < 2) { toast('اكتبي اسمك من فضلك', true); return; }
      if (digits.length < 9 || digits.length > 15) { toast('رقم الهاتف غير صحيح', true); return; }
      const rawQty = Math.floor(Number(form.elements.quantity.value) || 0);
      if (rawQty < RT.FAVOR_MIN_QTY) { toast('الحد الأدنى لطلب التوزيعات ٢٠ قطعة', true); form.elements.quantity.focus(); return; }

      const data = readFavor();
      data.name = name;
      data.phone = phone;
      data.city = form.elements.city.value.trim();
      data.neededBy = form.elements.neededBy.value;
      data.notes = form.elements.notes.value.trim();
      if (!data.scents.length) data.scents = ['بدون رائحة'];

      const req = RT.submitFavorRequest(data);
      if (RT.pushRemote) { try { RT.pushRemote('favor', { number: req.number, name: req.name, phone: req.phone, event: req.event, quantity: req.quantity, estimate: req.estimate, city: req.city, notes: req.notes, createdAt: req.createdAt }); } catch (e3) { /* ignore */ } }
      const wa = String(RT.settings().whatsapp || '').replace(/\D/g, '');
      const text = `مرحبًا Rose Touch 🌹\nطلب توزيعات رقم: ${req.number}\nالمناسبة: ${req.event}\nالكمية: ${req.quantity} قطعة\nالحجم: ${RT.favorSize(req.size).label}\nالتغليف: ${RT.favorPackaging(req.packaging).label}\nاللون: ${RT.favorColor(req.color).label}\nالروائح: ${req.scents.join('، ')}\nالسعر التقديري: ${money(req.estimate)}\nالاسم: ${req.name}\nالمدينة: ${req.city || '—'}`;
      if (wa && $('#favorWhatsapp')) {
        $('#favorWhatsapp').href = `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
      }
      $('#favorSuccessTitle').textContent = 'تم استلام طلبك 🌹';
      $('#favorSuccessText').innerHTML = `رقم طلبك <strong>${esc(req.number)}</strong> — سنتواصل معك على ${esc(phone)} لتأكيد التفاصيل والسعر النهائي. السعر التقديري الحالي ${esc(money(req.estimate))}.`;
      $('#favorSuccess').hidden = false;
      form.querySelector('button[type="submit"]').hidden = true;
      toast('وصلنا طلب التوزيعات، سنتواصل معك قريبًا 🌹');
      $('#favorSuccess').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    updateEstimate();
  }

  /* ---------- حركات الظهور ---------- */
  function initReveal() {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(i => i.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px' });
    items.forEach(i => io.observe(i));
  }

  /* ---------- سكرول سباي ---------- */
  function initScrollSpy() {
    const links = $$('#mainNav a');
    const sections = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
        if (en.target.id === 'home') links[0].classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50%' });
    sections.forEach(s => io.observe(s));
  }

  /* ---------- التشغيل ---------- */
  function init() {
    // خلفية السلة
    const backdrop = document.createElement('div');
    backdrop.id = 'drawerBackdrop';
    backdrop.className = 'drawer-backdrop';
    backdrop.hidden = true;
    backdrop.addEventListener('click', closeCart);
    document.body.appendChild(backdrop);

    applySettings();
    injectArt();
    renderCategories();
    renderChips();
    renderProducts();
    initFavorForm();
    paintCart();
    paintFavorites();
    startCountdown();
    bindEvents();
    initReveal();
    initScrollSpy();

    RT.getVisitorId();
    RT.track('page', { page: location.pathname.split('/').pop() || 'index.html' });

    // إعادة رسم عند تغيّر حجم الشاشة لتفادي بقاء القائمة مفتوحة
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) {
        $('#mainNav').classList.remove('is-open');
        $('#menuBtn').setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

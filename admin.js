(function () {
  "use strict";
  if (typeof RT === "undefined") { alert("تعذر تحميل بيانات المتجر (store-data.js)"); return; }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = (name) => `<svg class="icon"><use href="#${name}"></use></svg>`;
  const money = (n) => RT.money(n);
  const fmtDate = (d) => { try { return RT.fmtDate(d, true); } catch(e){ return d || "—"; } };
  const uid = (p) => RT.uid(p || 'id');
  const db = () => RT.db();

  const NAV = [
    { group: "الرئيسية", items: [
      { id: "dashboard", label: "نظرة عامة", icon: "i-dashboard" },
    ]},
    { group: "المتجر", items: [
      { id: "products", label: "المنتجات", icon: "i-box" },
      { id: "productOptions", label: "خيارات المنتجات", icon: "i-spark" },
      { id: "orders", label: "الطلبات", icon: "i-cart", badge: "orders" },
      { id: "carts", label: "السلات المتروكة", icon: "i-clock", badge: "carts" },
      { id: "favors", label: "التوزيعات", icon: "i-star", badge: "favors" },
      { id: "messages", label: "الرسائل", icon: "i-send", badge: "messages" },
      { id: "categories", label: "المجموعات", icon: "i-tags" },
      { id: "offers", label: "العروض", icon: "i-spark" },
      { id: "reviews", label: "آراء العملاء", icon: "i-star" },
      { id: "promo", label: "شريط الإعلان", icon: "i-spark" },
    ]},
    { group: "النظام", items: [
      { id: "shipping", label: "الشحن والتوصيل", icon: "i-chart" },
      { id: "loyalty", label: "نظام الولاء", icon: "i-star" },
      { id: "settings", label: "إعدادات الموقع", icon: "i-settings" },
      { id: "account", label: "الحساب والأمان", icon: "i-user" },
      { id: "backup", label: "النسخ الاحتياطي والنشر", icon: "i-database" },
    ]},
  ];

  const TITLES = {
    dashboard:["لوحة التحكم","نظرة عامة"], products:["المتجر","المنتجات"], productOptions:["المتجر","خيارات المنتجات"], orders:["المتجر","الطلبات"],
    carts:["المتجر","السلات المتروكة"], favors:["المتجر","التوزيعات"], messages:["المتجر","الرسائل"],
    categories:["المتجر","المجموعات"], offers:["المتجر","العروض"], reviews:["المتجر","آراء العملاء"],
    promo:["المتجر","شريط الإعلان"], shipping:["النظام","الشحن والتوصيل"], loyalty:["النظام","نظام الولاء"], settings:["النظام","إعدادات الموقع"],
    account:["النظام","الحساب والأمان"], backup:["النظام","النسخ الاحتياطي والنشر"],
  };

  const state = {
    view: "dashboard",
    productQuery: "", productCat: "all",
    orderStatus: "all", orderQuery: "",
    msgStatus: "all", msgQuery: "",
    remoteOrders: [], remoteOrdersV2: false, remoteOrdersError: false,
    remoteMessages: [], remoteMessagesV3: false, remoteMessagesError: false,
    loyaltyRemoteOrders: [], loyaltyRemoteLoading: false, loyaltyRemoteError: false,
  };

  const REMOTE_ORDER_STATUSES = ["جديد", "مقروء", "قيد التجهيز", "تم الشحن", "مكتمل", "ملغي"];
  const REMOTE_STATUS_TONE = { "جديد": "gold", "مقروء": "blue", "قيد التجهيز": "warn", "تم الشحن": "blue", "مكتمل": "green", "ملغي": "red" };
  const LOCAL_ORDER_KEYS = ["new", "processing", "shipped", "completed", "cancelled"];
  const ALL_ORDER_FILTERS = [["all","الكل"],["new","جديد"],["read","مقروء"],["processing","قيد التجهيز"],["shipped","تم الشحن"],["completed","مكتمل"],["cancelled","ملغي"]];
  const ALL_MSG_FILTERS = [["all","الكل"],["new","جديد"],["read","مقروء"]];
  const UNIFIED_TONE = { new:"gold", read:"blue", processing:"warn", shipped:"blue", completed:"green", cancelled:"red" };

  function remoteStatus(row) {
    const v = String((row && row.status) || "").trim();
    return REMOTE_ORDER_STATUSES.indexOf(v) >= 0 ? v : "جديد";
  }
  const REMOTE_MSG_STATUSES = ["جديد", "مقروء"];
  function remoteMsgStatus(row) {
    return String((row && row.status) || "").trim() === "مقروء" ? "مقروء" : "جديد";
  }
  function remoteMsgKey(row) {
    return String((row && row.createdAt) || "") + "|" + String((row && row.phone) || "");
  }

  /* توحيد المصادر في جدول واحد */
  function orderNumber(o) { return String((o && (o.number || o.id)) || ""); }
  function localOrderKey(o) { const s = String((o && o.status) || "new"); return LOCAL_ORDER_KEYS.indexOf(s) >= 0 ? s : "new"; }
  function remoteOrderKey(r) {
    return { "جديد":"new", "مقروء":"read", "قيد التجهيز":"processing", "تم الشحن":"shipped", "مكتمل":"completed", "ملغي":"cancelled" }[remoteStatus(r)] || "new";
  }
  function rowOrderKey(row) { return row.source === "remote" ? remoteOrderKey(row.data) : localOrderKey(row.data); }
  function rowOrderLabel(row) { return row.source === "remote" ? remoteStatus(row.data) : statusLabel(localOrderKey(row.data)); }
  function rowOrderTone(row) { return UNIFIED_TONE[rowOrderKey(row)] || "gray"; }
  function orderSearchText(row) {
    const o = row.data || {};
    if (row.source === "remote") return [o.number, o.name, o.phone, o.area, o.address, o.itemsText].join(" ");
    const c = o.customer || {};
    return [o.number, o.id, c.name, c.phone, c.deliveryArea || c.city, c.address, (o.items || []).map(i => i.name).join(" ")].join(" ");
  }
  function mergedOrderRows() {
    const remote = (state.remoteOrders || []).map(r => ({ source: "remote", data: r, id: String(r.number || "") }));
    const remoteNumbers = new Set(remote.map(x => x.id));
    const local = (db().orders || [])
      .filter(o => !remoteNumbers.has(orderNumber(o)))
      .map(o => ({ source: "local", data: o, id: String(o.id) }));
    return remote.concat(local).sort((a, b) => new Date(b.data.createdAt || 0) - new Date(a.data.createdAt || 0));
  }
  function localMsgRead(m) { return !!(m && (m.read || String(m.status || "") === "مقروء")); }
  function rowMsgKey(row) { return row.source === "remote" ? (remoteMsgStatus(row.data) === "مقروء" ? "read" : "new") : (localMsgRead(row.data) ? "read" : "new"); }
  function rowMsgTone(row) { return UNIFIED_TONE[rowMsgKey(row)] || "gold"; }
  function msgSearchText(row) {
    const m = row.data || {};
    return row.source === "remote" ? [m.name, m.phone, m.message].join(" ") : [m.name, m.phone, m.message].join(" ");
  }
  function mergedMessageRows() {
    const remote = (state.remoteMessages || []).map(r => ({ source: "remote", data: r, id: remoteMsgKey(r) }));
    const remoteKeys = new Set(remote.map(x => x.id));
    const local = (db().messages || [])
      .filter(m => !remoteKeys.has(String(m.createdAt || "") + "|" + String(m.phone || "")))
      .map(m => ({ source: "local", data: m, id: String(m.id) }));
    return remote.concat(local).sort((a, b) => new Date(b.data.createdAt || 0) - new Date(a.data.createdAt || 0));
  }
  function sourceTag(source) {
    return source === "remote"
      ? `<small class="source-tag source-tag--remote">Google Sheets</small>`
      : `<small class="source-tag">هذا المتصفح</small>`;
  }
  function unifiedSaveLocal(msg) {
    RT.commit();
    if (msg) toast(msg, "success");
    saveState(true);
    renderNav();
  }

  function toast(message, type) {
    const wrap = $("#toasts"); if (!wrap) return;
    const node = document.createElement("div");
    node.className = "toast" + (type ? " toast--" + type : "");
    node.innerHTML = icon(type === "error" ? "i-alert" : "i-check") + "<span>" + esc(message) + "</span>";
    wrap.appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }
  function saveState(show) {
    const el = $("#saveState"); if (!el) return;
    el.hidden = !show;
    if (show) { clearTimeout(saveState._t); saveState._t = setTimeout(()=>{ el.hidden = true; }, 2200); }
  }
  function commit(msg) { RT.commit(); if (msg) toast(msg, "success"); saveState(true); renderNav(); renderView(); }

  function openModal(html, opts={}) {
    const card = $("#modalCard");
    card.className = "modal__card" + (opts.wide ? " modal__card--wide" : opts.narrow ? " modal__card--narrow" : "");
    $("#modalContent").innerHTML = html;
    $("#modal").classList.add("is-open");
    $("#modal").setAttribute("aria-hidden","false");
    document.body.classList.add("no-scroll");
  }
  function closeModal() {
    $("#modal").classList.remove("is-open");
    $("#modal").setAttribute("aria-hidden","true");
    document.body.classList.remove("no-scroll");
    $("#modalContent").innerHTML = "";
  }

  function isAuthed(){ return sessionStorage.getItem("rosetouch_admin_auth") === "1"; }
  function showApp(){ $("#loginScreen").hidden = true; $("#adminApp").hidden = false; }
  function showLogin(){ $("#adminApp").hidden = true; $("#loginScreen").hidden = false; }

  function bindAuth(){
    const passToggle = $("#passToggle");
    if (passToggle) passToggle.addEventListener("click", ()=>{
      const inp = $("#loginPass"); if(!inp) return;
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      passToggle.textContent = show ? "إخفاء" : "إظهار";
    });
    $("#loginForm").addEventListener("submit", (e)=>{
      e.preventDefault();
      const s = RT.settings();
      const u = ($("#loginUser").value || "").trim();
      const p = $("#loginPass").value || "";
      if (u === (s.adminUsername || "admin") && p === (s.adminPassword || "admin123")) {
        sessionStorage.setItem("rosetouch_admin_auth","1");
        $("#loginError").hidden = true;
        boot();
      } else {
        $("#loginError").hidden = false;
      }
    });
    $("#logoutBtn").addEventListener("click", ()=>{ sessionStorage.removeItem("rosetouch_admin_auth"); showLogin(); });
  }

  function badgeCount(id){
    const d = db();
    if (id === "orders") return (d.orders||[]).filter(o=>o.status==="new").length || (d.orders||[]).length || 0;
    if (id === "carts") return (d.carts||[]).filter(c=>c.state==="checkout"||c.state==="active").length || 0;
    if (id === "favors") return (d.favors||[]).filter(f=>f.status==="new"||f.status==="review").length || (d.favors||[]).length || 0;
    if (id === "messages") return (d.messages||[]).filter(m=>!m.read).length || 0;
    return 0;
  }

  function renderNav(){
    const nav = $("#sidebarNav"); if(!nav) return;
    nav.innerHTML = NAV.map(group =>
      `<div class="sidebar__section">${esc(group.group)}</div>` +
      group.items.map(item => {
        const b = item.badge ? badgeCount(item.badge) : 0;
        return `<button class="nav-item${state.view===item.id?' is-active':''}" type="button" data-view="${item.id}">
          ${icon(item.icon)}<span>${esc(item.label)}</span>${b?`<span class="nav-item__count">${b}</span>`:''}
        </button>`;
      }).join("")
    ).join("");
    $$("[data-view]", nav).forEach(btn => btn.addEventListener("click", ()=> setView(btn.dataset.view)));
  }

  function setView(view){
    state.view = view;
    renderNav();
    renderView();
    closeSidebar();
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function renderView(){
    const t = TITLES[state.view] || TITLES.dashboard;
    $("#pageCrumb").textContent = t[0];
    $("#pageTitle").textContent = t[1];
    const map = {
      dashboard: renderDashboard, products: renderProducts, productOptions: renderProductOptions, orders: renderOrders, carts: renderCarts,
      favors: renderFavors, messages: renderMessages, categories: renderCategories, offers: renderOffers,
      reviews: renderReviews, promo: renderPromo, shipping: renderShipping, loyalty: renderLoyalty, settings: renderSettings,
      account: renderAccount, backup: renderBackup,
    };
    (map[state.view] || renderDashboard)();
  }

  function pageHead(title, desc, actions=''){
    return `<section class="page-head"><div class="page-head__text"><h2>${esc(title)}</h2><p>${esc(desc||'')}</p></div><div class="page-head__actions">${actions}</div></section>`;
  }
  function emptyState(ic, title, text){
    return `<div class="empty">${icon(ic)}<h3>${esc(title)}</h3><p>${esc(text||'')}</p></div>`;
  }

  /* Dashboard */
  function renderDashboard(){
    const d = db();
    const orders = d.orders||[], favors = d.favors||[], msgs = d.messages||[], carts = d.carts||[], visitors = d.visitors||[], products = d.products||[];
    const revenue = orders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+(Number(o.total)||0),0);
    const newOrders = orders.filter(o=>o.status==="new").length;
    const unread = msgs.filter(m=>!m.read).length;
    const abandoned = carts.filter(c=>c.state==="checkout"||c.state==="active").length;
    const totalVisits = visitors.reduce((s,v)=>s+(Number(v.visits)||0),0);
    const latest = orders.slice(0,6);
    $("#content").innerHTML =
      pageHead("مرحبًا، " + esc((RT.settings().adminUsername)||"admin") + " 👋", "ملخص متجر Rose Touch الحالي.", `<button class="btn btn--gold" type="button" data-goto="products">${icon('i-plus')} منتج جديد</button>`) +
      `<div class="stats">
        ${stat("إجمالي الزيارات", totalVisits, "زيارات مسجلة", "i-chart")}
        ${stat("الطلبات الجديدة", newOrders, (orders.length)+" إجمالي", "i-cart", true)}
        ${stat("الإيرادات", money(revenue), "غير الملغاة", "i-money")}
        ${stat("المنتجات", products.length, "منتج في المتجر", "i-box")}
        ${stat("السلات المتروكة", abandoned, "بحاجة متابعة", "i-clock")}
        ${stat("التوزيعات / الرسائل", favors.length + " / " + msgs.length, unread?("رسائل جديدة "+unread):"لا رسائل جديدة", "i-star")}
      </div>
      <div class="dash-grid">
        <div class="card"><div class="card__head"><h2>أحدث الطلبات</h2><span class="spacer"></span><button class="btn btn--ghost btn--sm" type="button" data-goto="orders">عرض الكل</button></div>
          <div class="card__body card__body--flush">${latest.length ? ordersTable(latest,true) : emptyState('i-cart','لا توجد طلبات بعد','أول طلب يوصل من الموقع سيظهر هنا.')}</div>
        </div>
        <div class="dash-side">
          <div class="card"><div class="card__head"><h3>إجراءات سريعة</h3></div><div class="card__body"><div class="backup-list">
            ${quick("إدارة المنتجات","i-box","products")}
            ${quick("شريط الإعلان","i-spark","promo")}
            ${quick("العروض","i-star","offers")}
            ${quick("الشحن والتوصيل","i-chart","shipping")}
            ${quick("نظام الولاء","i-star","loyalty")}
            ${quick("النسخ الاحتياطي والنشر","i-database","backup")}
          </div></div></div>
          <div class="card"><div class="card__head"><h3>تنبيهات</h3></div><div class="card__body">
            <div class="note ${unread||newOrders||abandoned?'':'note--warn'}" style="margin-bottom:10px">${icon('i-alert')}<span>${unread?`لديك ${unread} رسالة جديدة. `:''}${newOrders?`لديك ${newOrders} طلب جديد. `:''}${abandoned?`لديك ${abandoned} سلة غير مكتملة. `:''}${!(unread||newOrders||abandoned)?'لا توجد تنبيهات حالياً.':''}</span></div>
            <div class="note">${icon('i-database')}<span>التعديلات تُحفظ محليًا. للنشر لكل الزوار نزّل <b>store-data.js محدث</b> من النسخ الاحتياطي والنشر.</span></div>
          </div></div>
        </div>
      </div>`;
    bindGoto();
    bindOrdersTable();
  }
  function stat(label, value, meta, ic, gold){ return `<article class="stat${gold?' stat--gold':''}"><div class="stat__top"><span class="stat__label">${esc(label)}</span><span class="stat__icon">${icon(ic)}</span></div><div class="stat__value">${esc(value)}</div><div class="stat__meta">${esc(meta||'')}</div></article>`; }
  function quick(label, ic, view){ return `<button class="backup-row" type="button" data-goto="${view}" style="width:100%;text-align:start">${icon(ic)}<b>${esc(label)}</b>${icon('i-chevron')}</button>`; }
  function bindGoto(){ $$('[data-goto]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.goto))); }

  function statusLabel(s, map){ const m = map||RT.ORDER_STATUS||{}; return (m[s]||{}).label || s || '-'; }
  function statusBadge(s){
    const cls = s==='completed'||s==='delivered'?'green':(s==='cancelled'?'red':(s==='processing'||s==='shipped'||s==='review'?'blue':'gold'));
    return `<span class="badge badge--${cls}">${esc(statusLabel(s))}</span>`;
  }
  function ordersTable(orders, compact){
    return `<div class="table-wrap"><table class="data"><thead><tr><th>الطلب</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>الحالة</th>${compact?'':'<th></th>'}</tr></thead><tbody>`+
      orders.map(o=>`<tr data-order="${esc(o.id)}">
        <td><span class="order-number">${esc(o.number||o.id)}</span></td>
        <td class="muted num">${esc(fmtDate(o.createdAt))}</td>
        <td><div class="customer-cell"><b>${esc(o.customer?.name||'-')}</b><small>${esc(o.customer?.phone||'')}</small></div></td>
        <td class="num strong">${money(o.total)}</td>
        <td>${statusBadge(o.status||'new')}</td>
        ${compact?'':`<td class="cell-actions"><div class="row-actions"><button class="icon-btn" type="button" data-view-order="${esc(o.id)}" aria-label="عرض">${icon('i-eye')}</button></div></td>`}
      </tr>`).join('') + `</tbody></table></div>`;
  }
  function bindOrdersTable(){
    $$('[data-view-order]').forEach(btn=>btn.addEventListener('click',(e)=>{e.stopPropagation(); openOrderModal(btn.dataset.viewOrder);}));
    $$('tr[data-order]').forEach(tr=>tr.addEventListener('click',()=>openOrderModal(tr.dataset.order)));
  }

  /* Orders */
  function renderOrders(){
    $("#content").innerHTML =
      pageHead('الطلبات','جدول واحد لكل الطلبات: طلبات Google Sheets والطلبات المحلية، مع البحث والتصفية وتغيير الحالة.', `<button class="btn btn--ghost" type="button" id="exportOrdersBtn">${icon('i-download')} تصدير CSV</button>`) +
      `<div class="card"><div class="card__head"><h2>${icon('i-database')} جميع الطلبات</h2><span class="badge badge--green" id="ordersCountBadge">…</span><span class="spacer"></span>${RT.settings().sheetsSheetUrl?`<a class="btn btn--ghost btn--sm" href="${esc(RT.settings().sheetsSheetUrl)}" target="_blank" rel="noopener">${icon('i-external')} فتح الجدول</a>`:''}<button class="btn btn--ghost btn--sm" type="button" id="refreshOrdersBtn">${icon('i-refresh')} تحديث</button></div>
        <div class="card__body card__body--flush"><div id="ordersBox"></div></div></div>`;
    $('#refreshOrdersBtn')?.addEventListener('click', loadRemoteOrders);
    $('#exportOrdersBtn')?.addEventListener('click', exportOrdersCSV);
    paintUnifiedOrders();
    loadRemoteOrders();
  }
  function openOrderModal(id){
    const o = (db().orders||[]).find(x=>x.id===id); if(!o) return;
    const statuses = ['new','processing','shipped','completed','cancelled'];
    openModal(`<div class="modal__head"><h2>تفاصيل الطلب ${esc(o.number||o.id)}</h2><p>${esc(fmtDate(o.createdAt))} · ${statusLabel(o.status)}</p></div>
      <div class="order-detail-grid" style="margin-bottom:16px">
        <div class="detail-block"><h4>العميل</h4><p><b>${esc(o.customer?.name||'-')}</b></p><p dir="ltr">${esc(o.customer?.phone||'-')}</p><p>${esc(o.customer?.city||'')} — ${esc(o.customer?.address||'')}</p></div>
        <div class="detail-block"><h4>الدفع والحالة</h4><p>الدفع: ${esc(o.payment||'-')}</p><p>الشحن: ${money(o.shipping||0)}</p><p>الإجمالي: <b>${money(o.total||0)}</b></p><label class="field" style="margin-top:8px"><span>تغيير الحالة</span><select id="omStatus">${statuses.map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${esc(statusLabel(s))}</option>`).join('')}</select></label></div>
      </div>
      <div class="table-wrap"><table class="items-table"><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead><tbody>
        ${(o.items||[]).map(i=>`<tr><td>${esc(i.name)}</td><td class="num">${esc(i.qty)}</td><td class="num">${money(i.price)}</td><td class="num strong">${money((Number(i.price)||0)*(Number(i.qty)||0))}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">لا توجد عناصر</td></tr>'}
      </tbody><tfoot><tr><td colspan="3">الإجمالي</td><td class="num">${money(o.total||0)}</td></tr></tfoot></table></div>
      ${o.note?`<div class="note mt-14">${icon('i-alert')}<span><b>ملاحظة:</b> ${esc(o.note)}</span></div>`:''}
      <div class="modal__actions">
        <button class="btn btn--gold" type="button" id="omSave">${icon('i-save')} حفظ الحالة</button>
        ${o.customer?.phone?`<a class="btn btn--ghost" href="https://wa.me/${esc(String(o.customer.phone).replace(/[^0-9]/g,''))}" target="_blank" rel="noopener">${icon('i-whatsapp')} واتساب</a>`:''}
        <button class="btn btn--soft-danger" type="button" id="omDel">${icon('i-trash')} حذف</button>
        <span class="spacer"></span><button class="btn btn--ghost" type="button" data-close>إغلاق</button>
      </div>`);
    $("#omSave").onclick=()=>{ o.status=$("#omStatus").value; o.updatedAt=new Date().toISOString(); commit('تم تحديث حالة الطلب'); closeModal(); };
    $("#omDel").onclick=()=>{ if(!confirm('حذف هذا الطلب؟')) return; const d=db(); d.orders=d.orders.filter(x=>x.id!==id); commit('تم حذف الطلب'); closeModal(); };
    $('[data-close]', $("#modalContent")).onclick=closeModal;
  }
  function exportOrdersCSV(){
    const rows=[["number","date","customer","phone","area","total","status","payment","source"]];
    mergedOrderRows().forEach(row=>{
      const o=row.data||{}, c=o.customer||{};
      rows.push([o.number||o.id, o.createdAt||'', row.source==='remote'?(o.name||''):(c.name||''), row.source==='remote'?(o.phone||''):(c.phone||''), row.source==='remote'?(o.area||''):(c.deliveryArea||c.city||''), o.total||0, rowOrderLabel(row), o.payment||'', row.source==='remote'?'Google Sheets':'local']);
    });
    const csv = rows.map(r=>r.map(v=>`"${String(v==null?'':v).replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadFile('orders.csv', '\ufeff'+csv, 'text/csv;charset=utf-8');
  }

  /* Remote orders/messages via Google Sheets (JSONP) — جدول موحّد للمصادر */
  function loadRemoteOrders(){
    const box = $('#ordersBox'); if (!box) return;
    const s = RT.settings();
    const badge = $('#ordersCountBadge');
    if (!s.sheetsApiUrl) {
      state.remoteOrders = []; state.remoteOrdersError = false;
      if (badge) badge.textContent = 'محلية فقط';
      paintUnifiedOrders(); return;
    }
    if (badge) badge.textContent = 'جارٍ التحديث…';
    RT.fetchRemote('orders').then(res=>{
      state.remoteOrdersV2 = !!(res && Number(res.v) >= 2);
      state.remoteOrders = ((res && res.rows) || []).slice().reverse();
      state.remoteOrdersError = false;
      paintUnifiedOrders();
    }).catch(()=>{
      state.remoteOrders = [];
      state.remoteOrdersError = true;
      paintUnifiedOrders();
    });
  }

  function orderStatusControl(row){
    if (row.source === 'remote' && !state.remoteOrdersV2) {
      return `<span class="badge badge--${REMOTE_STATUS_TONE[remoteStatus(row.data)] || 'gray'}">${esc(remoteStatus(row.data))}</span>`;
    }
    const options = row.source === 'remote'
      ? REMOTE_ORDER_STATUSES.map(x => `<option value="${esc(x)}" ${x === remoteStatus(row.data) ? 'selected' : ''}>${esc(x)}</option>`).join('')
      : LOCAL_ORDER_KEYS.map(x => `<option value="${x}" ${x === localOrderKey(row.data) ? 'selected' : ''}>${esc(statusLabel(x))}</option>`).join('');
    return `<select class="status-select status-select--${rowOrderTone(row)}" data-u-order-status="${esc(row.source)}" data-u-order-id="${esc(row.id)}" aria-label="حالة الطلب">${options}</select>`;
  }

  function paintUnifiedOrders(focusSearch){
    const box = $('#ordersBox'); if (!box) return;
    const all = mergedOrderRows();
    const badge = $('#ordersCountBadge');
    if (badge) badge.textContent = all.length ? all.length + ' طلب' : 'لا طلبات';
    const counts = { all: all.length };
    ALL_ORDER_FILTERS.slice(1).forEach(([k]) => { counts[k] = 0; });
    all.forEach(row => { const k = rowOrderKey(row); counts[k] = (counts[k] || 0) + 1; });
    const filter = state.orderStatus || 'all';
    const q = (state.orderQuery || '').trim().toLowerCase();
    const searched = q ? all.filter(row => orderSearchText(row).toLowerCase().includes(q)) : all;
    const list = filter === 'all' ? searched : searched.filter(row => rowOrderKey(row) === filter);
    const chips = ALL_ORDER_FILTERS.map(([k, l]) => `<button class="chip ${filter === k ? 'is-active' : ''}" type="button" data-u-order-filter="${esc(k)}">${esc(l)}<b>${counts[k] || 0}</b></button>`).join('');
    const s = RT.settings();
    const notes = [];
    if (!s.sheetsApiUrl) notes.push('لم يتم ربط Google Sheets — تظهر الطلبات المحلية لهذا المتصفح فقط. أضف الرابط من «إعدادات الموقع».');
    else if (state.remoteOrdersError) notes.push('تعذر جلب طلبات Google Sheets؛ تظهر البيانات المحلية فقط. تأكد من نشر Apps Script بصلاحية «Anyone».');
    else if (!state.remoteOrdersV2) notes.push('النسخة المنشورة من Apps Script للقراءة فقط؛ حدّثها إلى الإصدار v3 لتفعيل تغيير الحالة والحذف.');
    box.innerHTML =
      `<div class="toolbar" style="padding:12px 16px">
        <div class="toolbar__search">${icon('i-search')}<input type="search" id="unifiedOrderSearch" placeholder="رقم الطلب، الاسم، الهاتف…" value="${esc(state.orderQuery || '')}"></div>
        <div class="chips">${chips}</div>
      </div>` +
      notes.map(n => `<div class="note" style="margin:12px 16px">${icon('i-alert')}<span>${esc(n)}</span></div>`).join('') +
      (list.length
        ? `<div class="table-wrap"><table class="data"><thead><tr>
            <th>التاريخ</th><th>الرقم</th><th>العميل</th><th>المنطقة</th><th>المنتجات</th><th>الإجمالي</th><th>الحالة</th><th></th>
          </tr></thead><tbody>` +
          list.map(row => {
            const o = row.data || {};
            const remote = row.source === 'remote';
            const customer = remote ? (o.name || '—') : ((o.customer && o.customer.name) || '—');
            const phone = remote ? (o.phone || '') : ((o.customer && o.customer.phone) || '');
            const area = remote ? (o.area || '—') : (((o.customer && (o.customer.deliveryArea || o.customer.city)) || '—'));
            const items = remote ? (o.itemsText || '—') : ((o.items || []).map(i => `${i.name} ×${i.qty || 1}`).join('، ') || '—');
            const number = remote ? (o.number || '—') : (o.number || o.id || '—');
            const canDelete = remote ? state.remoteOrdersV2 : true;
            return `<tr>
              <td class="muted num">${esc(o.createdAt ? fmtDate(o.createdAt) : '')}</td>
              <td><span class="order-number">${esc(number)}</span>${sourceTag(row.source)}</td>
              <td><div class="customer-cell"><b>${esc(customer)}</b><small dir="ltr">${esc(phone)}</small></div></td>
              <td>${esc(area)}</td>
              <td class="muted">${esc(items)}</td>
              <td class="num strong">${money(o.total || 0)}</td>
              <td>${orderStatusControl(row)}</td>
              <td class="cell-actions"><div class="row-actions">
                <button class="icon-btn" type="button" data-u-order-view="${esc(row.source)}:${esc(row.id)}" title="تفاصيل الطلب">${icon('i-eye')}</button>
                ${phone ? `<a class="icon-btn" href="https://wa.me/${esc(String(phone).replace(/[^0-9]/g,''))}" target="_blank" rel="noopener" title="واتساب">${icon('i-whatsapp')}</a>` : ''}
                ${canDelete
                  ? `<button class="icon-btn danger" type="button" data-u-order-del="${esc(row.source)}:${esc(row.id)}" title="حذف الطلب">${icon('i-trash')}</button>`
                  : `<button class="icon-btn" type="button" disabled title="حدّث كود Apps Script لتفعيل الحذف">${icon('i-trash')}</button>`}
              </div></td>
            </tr>`;
          }).join('') +
          `</tbody></table></div>`
        : `<div class="empty" style="padding:26px"><h3>لا توجد طلبات مطابقة</h3><p>جرّبي كلمة بحث أخرى أو اختاري «الكل».</p></div>`);
    $$('[data-u-order-filter]', box).forEach(b => b.addEventListener('click', () => { state.orderStatus = b.dataset.uOrderFilter; paintUnifiedOrders(); }));
    const search = $('#unifiedOrderSearch', box);
    if (search) {
      search.addEventListener('input', () => { state.orderQuery = search.value; paintUnifiedOrders(true); });
      if (focusSearch) { search.focus(); const v = search.value; try { search.setSelectionRange(v.length, v.length); } catch (e) { /* ignore */ } }
    }
    $$('[data-u-order-status]', box).forEach(sel => sel.addEventListener('change', () => updateUnifiedOrderStatus(sel.dataset.uOrderStatus, sel.dataset.uOrderId, sel.value)));
    $$('[data-u-order-view]', box).forEach(b => b.addEventListener('click', () => {
      const [source, id] = b.dataset.uOrderView.split(/:(.*)/);
      showUnifiedOrder(source, id);
    }));
    $$('[data-u-order-del]', box).forEach(b => b.addEventListener('click', () => {
      const [source, id] = b.dataset.uOrderDel.split(/:(.*)/);
      deleteUnifiedOrder(source, id);
    }));
  }

  function updateUnifiedOrderStatus(source, id, value){
    if (source === 'remote') { updateRemoteOrderStatus(id, value); return; }
    const o = (db().orders || []).find(x => String(x.id) === String(id));
    if (!o) return;
    o.status = value;
    o.updatedAt = new Date().toISOString();
    unifiedSaveLocal('تم تحديث حالة الطلب إلى «' + statusLabel(value) + '»');
    paintUnifiedOrders();
  }

  function deleteUnifiedOrder(source, id){
    if (source === 'remote') { deleteRemoteOrder(id); return; }
    if (!confirm('حذف هذا الطلب من هذا المتصفح؟')) return;
    const d = db();
    d.orders = (d.orders || []).filter(x => String(x.id) !== String(id));
    unifiedSaveLocal('تم حذف الطلب');
    paintUnifiedOrders();
  }

  function showUnifiedOrder(source, id){
    if (source === 'remote') showRemoteOrder(id);
    else openOrderModal(id);
  }

  function updateRemoteOrderStatus(number, status){
    if (!state.remoteOrdersV2) { toast('حدّث كود Apps Script وأعد النشر لتفعيل تغيير الحالة', 'error'); return; }
    const row = (state.remoteOrders || []).find(r => String(r.number) === String(number));
    if (row) row.status = status;
    if (RT.pushRemote) { try { RT.pushRemote('updateOrder', { number: number, status: status }); } catch (e) { /* ignore */ } }
    paintUnifiedOrders();
    toast('تم تحديث حالة الطلب إلى «' + status + '»');
    setTimeout(() => { if ($('#ordersBox')) loadRemoteOrders(); }, 2600);
  }

  function deleteRemoteOrder(number){
    if (!state.remoteOrdersV2) { toast('حدّث كود Apps Script وأعد النشر لتفعيل الحذف', 'error'); return; }
    if (!confirm('حذف الطلب ' + number + ' من جدول Google نهائيًا؟\nلا يمكن التراجع عن الحذف.')) return;
    state.remoteOrders = (state.remoteOrders || []).filter(r => String(r.number) !== String(number));
    if (RT.pushRemote) { try { RT.pushRemote('deleteOrder', { number: number }); } catch (e) { /* ignore */ } }
    paintUnifiedOrders();
    toast('تم حذف الطلب من الجدول');
    setTimeout(() => { if ($('#ordersBox')) loadRemoteOrders(); }, 2600);
  }

  function showRemoteOrder(number){
    const r = (state.remoteOrders || []).find(x => String(x.number) === String(number));
    if (!r) return;
    const st = remoteStatus(r);
    const items = String(r.itemsText || '').split('|').map(s => s.trim()).filter(Boolean);
    const line = (k, v) => v ? `<div class="detail-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>` : '';
    openModal(`
      <div class="modal__head">
        <div><h2 style="font-size:1.2rem">تفاصيل الطلب ${esc(r.number || '')}</h2><p class="muted" style="margin-top:4px">${esc(r.createdAt ? fmtDate(r.createdAt) : '')}</p></div>
        <span class="badge badge--${REMOTE_STATUS_TONE[st] || 'gray'}">${esc(st)}</span>
      </div>
      <div class="detail-list">
        ${line('العميل', r.name)}
        ${line('الجوال', r.phone)}
        ${line('المنطقة', r.area)}
        ${line('العنوان', r.address)}
        ${line('طريقة الدفع', r.payment)}
      </div>
      <div class="detail-list">
        <div class="detail-row"><span>المنتجات</span><b>${items.length ? items.map(esc).join('<br>') : '—'}</b></div>
        ${line('المجموع الفرعي', money(r.subtotal || 0))}
        ${line('الشحن', Number(r.shipping) ? money(r.shipping) : 'مجاني')}
        ${line('الإجمالي', money(r.total || 0))}
        ${line('ملاحظات', r.notes)}
      </div>
      <div class="modal__actions">
        ${state.remoteOrdersV2
          ? `<select class="status-select status-select--${REMOTE_STATUS_TONE[st] || 'gray'}" id="modalRemoteStatus" data-num="${esc(r.number || '')}">${REMOTE_ORDER_STATUSES.map(o => `<option value="${esc(o)}" ${o === st ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
          : `<span class="badge badge--${REMOTE_STATUS_TONE[st] || 'gray'}">${esc(st)}</span>`}
        ${r.phone ? `<a class="btn btn--gold" href="https://wa.me/${esc(String(r.phone).replace(/[^0-9]/g,''))}" target="_blank" rel="noopener">${icon('i-whatsapp')} واتساب</a>` : ''}
        <button class="btn btn--ghost" type="button" data-close-modal>إغلاق</button>
      </div>
    `);
    $('#modalRemoteStatus')?.addEventListener('change', (e) => { updateRemoteOrderStatus(e.target.dataset.num, e.target.value); closeModal(); });
  }
  function loadRemoteMessages(){
    const box = $('#messagesBox'); if (!box) return;
    const s = RT.settings();
    const badge = $('#messagesCountBadge');
    if (!s.sheetsApiUrl) {
      state.remoteMessages = []; state.remoteMessagesError = false;
      if (badge) badge.textContent = 'محلية فقط';
      paintUnifiedMessages(); return;
    }
    if (badge) badge.textContent = 'جارٍ التحديث…';
    RT.fetchRemote('messages').then(res=>{
      state.remoteMessagesV3 = !!(res && Number(res.v) >= 3);
      state.remoteMessages = ((res && res.rows) || []).slice().reverse();
      state.remoteMessagesError = false;
      paintUnifiedMessages();
    }).catch(()=>{
      state.remoteMessages = [];
      state.remoteMessagesError = true;
      paintUnifiedMessages();
    });
  }

  function msgStatusControl(row){
    const key = rowMsgKey(row);
    if (row.source === 'remote' && !state.remoteMessagesV3) {
      return `<span class="badge badge--${key === 'read' ? 'blue' : 'gold'}">${key === 'read' ? 'مقروء' : 'جديد'}</span>`;
    }
    const options = row.source === 'remote'
      ? `<option value="جديد" ${key === 'new' ? 'selected' : ''}>جديد</option><option value="مقروء" ${key === 'read' ? 'selected' : ''}>مقروء</option>`
      : `<option value="new" ${key === 'new' ? 'selected' : ''}>جديد</option><option value="read" ${key === 'read' ? 'selected' : ''}>مقروء</option>`;
    return `<select class="status-select status-select--${rowMsgTone(row)}" data-u-msg-status="${esc(row.source)}" data-u-msg-id="${esc(row.id)}" aria-label="حالة الرسالة">${options}</select>`;
  }

  function paintUnifiedMessages(focusSearch){
    const box = $('#messagesBox'); if (!box) return;
    const all = mergedMessageRows();
    const badge = $('#messagesCountBadge');
    if (badge) badge.textContent = all.length ? all.length + ' رسالة' : 'لا رسائل';
    const counts = { all: all.length, new: 0, read: 0 };
    all.forEach(row => { counts[rowMsgKey(row)]++; });
    const filter = state.msgStatus || 'all';
    const q = (state.msgQuery || '').trim().toLowerCase();
    const searched = q ? all.filter(row => msgSearchText(row).toLowerCase().includes(q)) : all;
    const list = filter === 'all' ? searched : searched.filter(row => rowMsgKey(row) === filter);
    const chips = ALL_MSG_FILTERS.map(([k, l]) => `<button class="chip ${filter === k ? 'is-active' : ''}" type="button" data-u-msg-filter="${esc(k)}">${esc(l)}<b>${counts[k] || 0}</b></button>`).join('');
    const s = RT.settings();
    const notes = [];
    if (!s.sheetsApiUrl) notes.push('لم يتم ربط Google Sheets — تظهر الرسائل المحلية لهذا المتصفح فقط. أضف الرابط من «إعدادات الموقع».');
    else if (state.remoteMessagesError) notes.push('تعذر جلب رسائل Google Sheets؛ تظهر البيانات المحلية فقط. تأكد من نشر Apps Script بصلاحية «Anyone».');
    else if (!state.remoteMessagesV3) notes.push('النسخة المنشورة من Apps Script للقراءة فقط؛ حدّثها إلى الإصدار v3 لتفعيل تعليم الرسائل كمقروءة وحذفها.');
    box.innerHTML =
      `<div class="toolbar" style="padding:12px 16px">
        <div class="toolbar__search">${icon('i-search')}<input type="search" id="unifiedMsgSearch" placeholder="الاسم، الهاتف، نص الرسالة…" value="${esc(state.msgQuery || '')}"></div>
        <div class="chips">${chips}</div>
      </div>` +
      notes.map(n => `<div class="note" style="margin:12px 16px">${icon('i-alert')}<span>${esc(n)}</span></div>`).join('') +
      (list.length
        ? `<div class="table-wrap"><table class="data"><thead><tr>
            <th>التاريخ</th><th>المرسل</th><th>الرسالة</th><th>الحالة</th><th></th>
          </tr></thead><tbody>` +
          list.map(row => {
            const m = row.data || {};
            const remote = row.source === 'remote';
            const canDelete = remote ? state.remoteMessagesV3 : true;
            return `<tr>
              <td class="muted num">${esc(m.createdAt ? fmtDate(m.createdAt) : '')}</td>
              <td><div class="customer-cell"><b>${esc(m.name || '—')}</b><small dir="ltr">${esc(m.phone || '')}</small>${sourceTag(row.source)}</div></td>
              <td class="msg-preview">${esc(m.message || '—')}</td>
              <td>${msgStatusControl(row)}</td>
              <td class="cell-actions"><div class="row-actions">
                <button class="icon-btn" type="button" data-u-msg-view="${esc(row.source)}:${esc(row.id)}" title="قراءة الرسالة كاملة">${icon('i-eye')}</button>
                ${m.phone ? `<a class="icon-btn" href="https://wa.me/${esc(String(m.phone).replace(/[^0-9]/g,''))}" target="_blank" rel="noopener" title="واتساب">${icon('i-whatsapp')}</a>` : ''}
                ${canDelete
                  ? `<button class="icon-btn danger" type="button" data-u-msg-del="${esc(row.source)}:${esc(row.id)}" title="حذف الرسالة">${icon('i-trash')}</button>`
                  : `<button class="icon-btn" type="button" disabled title="حدّث كود Apps Script لتفعيل الحذف">${icon('i-trash')}</button>`}
              </div></td>
            </tr>`;
          }).join('') +
          `</tbody></table></div>`
        : `<div class="empty" style="padding:26px"><h3>لا توجد رسائل مطابقة</h3><p>جرّبي كلمة بحث أخرى أو اختاري «الكل».</p></div>`);
    $$('[data-u-msg-filter]', box).forEach(b => b.addEventListener('click', () => { state.msgStatus = b.dataset.uMsgFilter; paintUnifiedMessages(); }));
    const search = $('#unifiedMsgSearch', box);
    if (search) {
      search.addEventListener('input', () => { state.msgQuery = search.value; paintUnifiedMessages(true); });
      if (focusSearch) { search.focus(); const v = search.value; try { search.setSelectionRange(v.length, v.length); } catch (e) { /* ignore */ } }
    }
    $$('[data-u-msg-status]', box).forEach(sel => sel.addEventListener('change', () => updateUnifiedMessageStatus(sel.dataset.uMsgStatus, sel.dataset.uMsgId, sel.value)));
    $$('[data-u-msg-view]', box).forEach(b => b.addEventListener('click', () => {
      const [source, id] = b.dataset.uMsgView.split(/:(.*)/);
      showUnifiedMessage(source, id);
    }));
    $$('[data-u-msg-del]', box).forEach(b => b.addEventListener('click', () => {
      const [source, id] = b.dataset.uMsgDel.split(/:(.*)/);
      deleteUnifiedMessage(source, id);
    }));
  }

  function updateUnifiedMessageStatus(source, id, value){
    if (source === 'remote') { updateRemoteMessageStatus(id, value); return; }
    const m = (db().messages || []).find(x => String(x.id) === String(id));
    if (!m) return;
    m.read = value === 'read';
    m.status = m.read ? 'مقروء' : 'جديد';
    unifiedSaveLocal(m.read ? 'تم تعليم الرسالة كمقروءة' : 'تم تعليم الرسالة كجديدة');
    paintUnifiedMessages();
  }

  function deleteUnifiedMessage(source, id){
    if (source === 'remote') { deleteRemoteMessage(id); return; }
    if (!confirm('حذف هذه الرسالة من هذا المتصفح؟')) return;
    const d = db();
    d.messages = (d.messages || []).filter(x => String(x.id) !== String(id));
    unifiedSaveLocal('تم حذف الرسالة');
    paintUnifiedMessages();
  }

  function showUnifiedMessage(source, id){
    if (source === 'remote') showRemoteMessage(id);
    else showLocalMessage(id);
  }

  function showLocalMessage(id){
    const m = (db().messages || []).find(x => String(x.id) === String(id));
    if (!m) return;
    const read = localMsgRead(m);
    openModal(`
      <div class="modal__head">
        <div><h2 style="font-size:1.18rem">رسالة ${esc(m.name || 'زبون')}</h2><p class="muted" style="margin-top:4px">${esc(m.createdAt ? fmtDate(m.createdAt) : '')}</p></div>
        <span class="badge badge--${read ? 'blue' : 'gold'}">${read ? 'مقروء' : 'جديد'}</span>
      </div>
      <div class="detail-list">
        <div class="detail-row"><span>المرسل</span><b>${esc(m.name || '—')}</b></div>
        <div class="detail-row"><span>الجوال</span><b dir="ltr">${esc(m.phone || '—')}</b></div>
      </div>
      <div class="msg-full">${esc(m.message || '—')}</div>
      <div class="modal__actions">
        <select class="status-select status-select--${read ? 'blue' : 'gold'}" id="modalLocalMsgStatus" data-id="${esc(m.id)}">
          <option value="new" ${read ? '' : 'selected'}>جديد</option>
          <option value="read" ${read ? 'selected' : ''}>مقروء</option>
        </select>
        ${m.phone ? `<a class="btn btn--gold" href="https://wa.me/${esc(String(m.phone).replace(/[^0-9]/g,''))}" target="_blank" rel="noopener">${icon('i-whatsapp')} رد واتساب</a>` : ''}
        <button class="btn btn--soft-danger" type="button" id="modalLocalMsgDel">${icon('i-trash')} حذف</button>
        <button class="btn btn--ghost" type="button" data-close-modal>إغلاق</button>
      </div>
    `);
    $('#modalLocalMsgStatus')?.addEventListener('change', (e) => { updateUnifiedMessageStatus('local', e.target.dataset.id, e.target.value); closeModal(); });
    $('#modalLocalMsgDel')?.addEventListener('click', () => { deleteUnifiedMessage('local', m.id); closeModal(); });
    if (!read) updateUnifiedMessageStatus('local', m.id, 'read');
  }

  function updateRemoteMessageStatus(key, status){
    if (!state.remoteMessagesV3) { toast('حدّث كود Apps Script وأعد النشر لتفعيل حالة الرسالة', 'error'); return; }
    const row = (state.remoteMessages || []).find(r => remoteMsgKey(r) === String(key));
    if (row) row.status = status;
    if (RT.pushRemote) { try { RT.pushRemote('updateMessage', { createdAt: row ? row.createdAt : '', phone: row ? row.phone : '', status: status }); } catch (e) { /* ignore */ } }
    paintUnifiedMessages();
    toast('تم تحديث حالة الرسالة إلى «' + status + '»');
    setTimeout(() => { if ($('#messagesBox')) loadRemoteMessages(); }, 2600);
  }

  function deleteRemoteMessage(key){
    if (!state.remoteMessagesV3) { toast('حدّث كود Apps Script وأعد النشر لتفعيل الحذف', 'error'); return; }
    const row = (state.remoteMessages || []).find(r => remoteMsgKey(r) === String(key));
    if (!row) return;
    if (!confirm('حذف رسالة ' + (row.name || row.phone || '') + ' من جدول Google نهائيًا؟\nلا يمكن التراجع عن الحذف.')) return;
    state.remoteMessages = (state.remoteMessages || []).filter(r => remoteMsgKey(r) !== String(key));
    if (RT.pushRemote) { try { RT.pushRemote('deleteMessage', { createdAt: row.createdAt, phone: row.phone }); } catch (e) { /* ignore */ } }
    paintUnifiedMessages();
    toast('تم حذف الرسالة من الجدول');
    setTimeout(() => { if ($('#messagesBox')) loadRemoteMessages(); }, 2600);
  }

  function showRemoteMessage(key){
    const r = (state.remoteMessages || []).find(x => remoteMsgKey(x) === String(key));
    if (!r) return;
    const st = remoteMsgStatus(r);
    openModal(`
      <div class="modal__head">
        <div><h2 style="font-size:1.18rem">رسالة ${esc(r.name || 'زبون')}</h2><p class="muted" style="margin-top:4px">${esc(r.createdAt ? fmtDate(r.createdAt) : '')}</p></div>
        <span class="badge badge--${st === 'مقروء' ? 'blue' : 'gold'}">${esc(st)}</span>
      </div>
      <div class="detail-list">
        <div class="detail-row"><span>المرسل</span><b>${esc(r.name || '—')}</b></div>
        <div class="detail-row"><span>الجوال</span><b dir="ltr">${esc(r.phone || '—')}</b></div>
      </div>
      <div class="msg-full">${esc(r.message || '—')}</div>
      <div class="modal__actions">
        ${state.remoteMessagesV3
          ? `<select class="status-select status-select--${st === 'مقروء' ? 'blue' : 'gold'}" id="modalMsgStatus" data-key="${esc(key)}">${REMOTE_MSG_STATUSES.map(o => `<option value="${esc(o)}" ${o === st ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
          : `<span class="badge badge--${st === 'مقروء' ? 'blue' : 'gold'}">${esc(st)}</span>`}
        ${r.phone ? `<a class="btn btn--gold" href="https://wa.me/${esc(String(r.phone).replace(/[^0-9]/g,''))}" target="_blank" rel="noopener">${icon('i-whatsapp')} رد واتساب</a>` : ''}
        <button class="btn btn--ghost" type="button" data-close-modal>إغلاق</button>
      </div>
    `);
    $('#modalMsgStatus')?.addEventListener('change', (e) => { updateRemoteMessageStatus(e.target.dataset.key, e.target.value); closeModal(); });
    if (state.remoteMessagesV3 && st === 'جديد') updateRemoteMessageStatus(key, 'مقروء');
  }

  /* Carts */
  function renderCarts(){
    const carts = db().carts||[];
    const abandoned = carts.filter(c=>c.state==='checkout'||c.state==='active');
    const value = abandoned.reduce((s,c)=>s + (c.items||[]).reduce((a,i)=>a+(Number(i.price||i.total)||0)*(Number(i.qty)||1),0), 0);
    $("#content").innerHTML =
      pageHead('السلات المتروكة','عملاء أضافوا منتجات ولم يكملوا الطلب — تابع وراجع السلات.') +
      `<div class="stats">
        ${stat('سلات متروكة', abandoned.length, 'بحاجة متابعة', 'i-clock', true)}
        ${stat('قيمة السلات', money(value), 'تقديرية', 'i-money')}
        ${stat('إجمالي السلات', carts.length, 'مسجلة بالنظام', 'i-cart')}
      </div>
      <div class="card"><div class="card__body card__body--flush">${carts.length?`<div class="table-wrap"><table class="data"><thead><tr><th>السلة</th><th>العميل/الهاتف</th><th>المنتجات</th><th>القيمة</th><th>آخر تحديث</th><th>الحالة</th><th></th></tr></thead><tbody>
        ${carts.map(c=>{ const total=(c.items||[]).reduce((a,i)=>a+(Number(i.price)||0)*(Number(i.qty)||1),0); return `<tr><td><span class="order-number">${esc(c.id)}</span></td><td><div class="customer-cell"><b>${esc(c.customer?.name||c.name||'زائر')}</b><small>${esc(c.phone||c.customer?.phone||'—')}</small></div></td><td class="muted">${esc((c.items||[]).map(i=>`${i.name} ×${i.qty||1}`).join('، ')||'—')}</td><td class="num strong">${money(total)}</td><td class="muted num">${esc(fmtDate(c.updatedAt||c.createdAt))}</td><td><span class="badge ${c.state==='completed'?'badge--green':'badge--warn'}">${esc(c.state||'نشطة')}</span></td><td class="cell-actions"><div class="row-actions"><button class="icon-btn danger" type="button" data-del-cart="${esc(c.id)}" title="حذف">${icon('i-trash')}</button></div></td></tr>`; }).join('')}
      </tbody></table></div>`:emptyState('i-clock','لا توجد سلات','لا توجد سلات مسجلة حالياً.')}</div></div>`;
    $$('[data-del-cart]').forEach(b=>b.addEventListener('click',()=>{ if(!confirm('حذف السلة؟')) return; const d=db(); d.carts=d.carts.filter(x=>x.id!==b.dataset.delCart); commit('تم حذف السلة'); }));
  }

  /* Favors / distributions */
  function renderFavors(){
    const favors = db().favors||[];
    $("#content").innerHTML =
      pageHead('التوزيعات','طلبات التوزيعات المخصصة الواردة من الموقع (المناسبة، الكمية، التفاصيل).') +
      `<div class="card"><div class="card__body card__body--flush">${favors.length?`<div class="table-wrap"><table class="data"><thead><tr><th>الطلب</th><th>التاريخ</th><th>العميل</th><th>المناسبة/الكمية</th><th>التقدير</th><th>الحالة</th><th></th></tr></thead><tbody>
        ${favors.map(f=>`<tr data-favor="${esc(f.id)}"><td><span class="order-number">${esc(f.number||f.id)}</span></td><td class="muted num">${esc(fmtDate(f.createdAt))}</td><td><div class="customer-cell"><b>${esc(f.name||'-')}</b><small>${esc(f.phone||'')}</small></div></td><td class="muted">${esc(f.event||'-')} · ${esc(f.quantity||'-')}</td><td class="num strong">${money(f.estimate||0)}</td><td><span class="badge badge--gold">${esc((RT.FAVOR_STATUS?.[f.status]||{}).label||f.status||'-')}</span></td><td class="cell-actions"><div class="row-actions"><button class="icon-btn" data-view-favor="${esc(f.id)}">${icon('i-eye')}</button></div></td></tr>`).join('')}
      </tbody></table></div>`:emptyState('i-star','لا توجد طلبات توزيعات','طلبات التوزيعات المرسلة من الموقع ستظهر هنا.')}</div></div>`;
    $$('[data-view-favor]').forEach(b=>b.addEventListener('click',(e)=>{e.stopPropagation(); openFavorModal(b.dataset.viewFavor);}));
    $$('tr[data-favor]').forEach(tr=>tr.addEventListener('click',()=>openFavorModal(tr.dataset.favor)));
  }
  function openFavorModal(id){
    const f=(db().favors||[]).find(x=>x.id===id); if(!f) return;
    const statuses = Object.keys(RT.FAVOR_STATUS||{new:'جديد',review:'قيد المراجعة',quoted:'تم التسعير',confirmed:'مؤكد',done:'منجز',cancelled:'ملغي'});
    openModal(`<div class="modal__head"><h2>طلب توزيعة ${esc(f.number||f.id)}</h2><p>${esc(fmtDate(f.createdAt))}</p></div>
      <div class="order-detail-grid" style="margin-bottom:16px">
        <div class="detail-block"><h4>العميل</h4><p><b>${esc(f.name||'-')}</b></p><p dir="ltr">${esc(f.phone||'-')}</p><p>${esc(f.city||'-')}</p></div>
        <div class="detail-block"><h4>التفاصيل</h4><p>المناسبة: ${esc(f.event||'-')}</p><p>الكمية: ${esc(f.quantity||'-')}</p><p>المقاس: ${esc((RT.favorSize?.(f.size)||{}).label||f.size||'-')}</p><p>التغليف: ${esc((RT.favorPackaging?.(f.packaging)||{}).label||f.packaging||'-')}</p><p>اللون: ${esc((RT.favorColor?.(f.color)||{}).label||f.color||'-')}</p><p>التقدير: <b>${money(f.estimate||0)}</b></p>
          <label class="field" style="margin-top:8px"><span>الحالة</span><select id="fmStatus">${statuses.map(s=>`<option value="${s}" ${f.status===s?'selected':''}>${esc((RT.FAVOR_STATUS[s]||{}).label||s)}</option>`).join('')}</select></label></div>
      </div>
      ${f.scents?.length?`<p><b>الروائح:</b> ${esc(f.scents.join('، '))}</p>`:''}
      ${f.labelText?`<p><b>نص البطاقة:</b> ${esc(f.labelText)}</p>`:''}
      ${f.notes?`<div class="note mt-14">${icon('i-alert')}<span><b>ملاحظات:</b> ${esc(f.notes)}</span></div>`:''}
      <div class="modal__actions"><button class="btn btn--gold" id="fmSave">${icon('i-save')} حفظ</button>${f.phone?`<a class="btn btn--ghost" href="https://wa.me/${esc(String(f.phone).replace(/[^0-9]/g,''))}" target="_blank" rel="noopener">${icon('i-whatsapp')} واتساب</a>`:''}<button class="btn btn--soft-danger" id="fmDel">${icon('i-trash')} حذف</button><span class="spacer"></span><button class="btn btn--ghost" data-close>إغلاق</button></div>`);
    $("#fmSave").onclick=()=>{ f.status=$("#fmStatus").value; f.updatedAt=new Date().toISOString(); commit('تم حفظ طلب التوزيعة'); closeModal(); };
    $("#fmDel").onclick=()=>{ if(!confirm('حذف طلب التوزيعة؟')) return; const d=db(); d.favors=d.favors.filter(x=>x.id!==id); commit('تم الحذف'); closeModal(); };
    $('[data-close]', $("#modalContent")).onclick=closeModal;
  }

  /* Messages */
  function renderMessages(){
    $("#content").innerHTML =
      pageHead('الرسائل','جدول واحد لكل الرسائل: رسائل Google Sheets والرسائل المحلية، مع البحث والتصفية والقراءة والحذف.') +
      `<div class="card"><div class="card__head"><h2>${icon('i-database')} جميع الرسائل</h2><span class="badge badge--green" id="messagesCountBadge">…</span><span class="spacer"></span><button class="btn btn--ghost btn--sm" type="button" id="refreshMessagesBtn">${icon('i-refresh')} تحديث</button></div>
        <div class="card__body card__body--flush"><div id="messagesBox"></div></div></div>`;
    $('#refreshMessagesBtn')?.addEventListener('click', loadRemoteMessages);
    paintUnifiedMessages();
    loadRemoteMessages();
  }

  /* Products */
  function filteredProducts(){
    const d=db(); let list=(d.products||[]).slice();
    if (state.productCat!=='all') list=list.filter(p=>p.category===state.productCat);
    const q=(state.productQuery||'').trim().toLowerCase();
    if(q) list=list.filter(p => (p.name||'').toLowerCase().includes(q) || (p.en||'').toLowerCase().includes(q) || (p.desc||'').toLowerCase().includes(q));
    return list;
  }
  function renderProducts(){
    const d=db(); const cats=d.categories||[]; const products=filteredProducts(); const all=(d.products||[]);
    $("#content").innerHTML =
      pageHead('المنتجات','أضف وعدّل الأسعار والكميات والصور والروائح والألوان — التغييرات تُحفظ محليًا ويمكن نشرها للجميع.', `<button class="btn btn--gold" type="button" id="addProductBtn">${icon('i-plus')} منتج جديد</button>`) +
      `<div class="card">
        <div class="toolbar">
          <div class="toolbar__search">${icon('i-search')}<input type="search" id="productSearch" placeholder="ابحث باسم المنتج…" value="${esc(state.productQuery)}"></div>
          <select id="productCatFilter"><option value="all">كل المجموعات (${all.length})</option>${cats.map(c=>`<option value="${esc(c.id)}" ${state.productCat===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
          <span class="toolbar__count">${products.length} منتج</span>
        </div>
        <div class="card__body card__body--flush">${products.length?`<div class="table-wrap"><table class="data"><thead><tr><th>المنتج</th><th>المجموعة</th><th>السعر</th><th>المخزون</th><th>مفعّل</th><th>ظاهر</th><th></th></tr></thead><tbody>
          ${products.map(p=>{ const c=cats.find(x=>x.id===p.category); const imageCount=RT.productImages(p).length; return `<tr><td><div class="cell-product"><img src="${esc(RT.productImage(p))}" alt="" loading="lazy"><div><b>${esc(p.name||'')}</b><small>${esc(p.desc||'')}</small><small class="muted">${imageCount>1?imageCount+' صور · ':''}${(RT.productScentOptions(p).length||0)} روائح · ${(RT.productColorOptions(p).length||0)} ألوان</small></div></div></td><td><span class="badge badge--gray">${esc(c?.name||'-')}</span></td><td class="num strong">${money(p.price)}</td><td class="num"><span class="badge ${(Number(p.stock)||0)>0?'badge--green':'badge--red'}">${esc(p.stock||0)}</span></td><td><label class="switch" title="تفعيل"><input type="checkbox" data-toggle-prod="${esc(p.id)}" ${p.active!==false?'checked':''}><i></i></label></td><td><label class="switch" title="إظهار في المتجر"><input type="checkbox" data-hide-prod="${esc(p.id)}" ${p.hidden===true?'':'checked'}><i></i></label></td><td class="cell-actions"><div class="row-actions"><button class="icon-btn" data-edit-prod="${esc(p.id)}" title="تعديل">${icon('i-edit')}</button><button class="icon-btn danger" data-del-prod="${esc(p.id)}" title="حذف">${icon('i-trash')}</button></div></td></tr>`; }).join('')}
        </tbody></table></div>`:emptyState('i-box','لا توجد منتجات','أضف منتجًا جديدًا ليظهر هنا وفي المتجر.')}</div>
      </div>`;
    $('#addProductBtn').onclick=()=>openProductModal(null);
    $('#productSearch').oninput=e=>{ state.productQuery=e.target.value; renderProducts(); };
    $('#productCatFilter').onchange=e=>{ state.productCat=e.target.value; renderProducts(); };
    $$('[data-edit-prod]').forEach(b=>b.addEventListener('click',()=>openProductModal(b.dataset.editProd)));
    $$('[data-del-prod]').forEach(b=>b.addEventListener('click',()=>{ if(!confirm('حذف المنتج؟')) return; const d=db(); d.products=d.products.filter(x=>x.id!==b.dataset.delProd); commit('تم حذف المنتج'); }));
    $$('[data-toggle-prod]').forEach(inp=>inp.addEventListener('change',()=>{ const p=(db().products||[]).find(x=>x.id===inp.dataset.toggleProd); if(p){ p.active=inp.checked; commit(); } }));
    $$('[data-hide-prod]').forEach(inp=>inp.addEventListener('change',()=>{ const p=(db().products||[]).find(x=>x.id===inp.dataset.hideProd); if(p){ p.hidden=!inp.checked; commit(inp.checked?'المنتج ظاهر في المتجر':'المنتج مخفي عن المتجر'); } }));
  }
  function openProductModal(id){
    const d=db(); const cats=d.categories||[];
    const p = id ? (d.products||[]).find(x=>x.id===id) : {
      id:uid('p'),name:'',en:'',category:cats[0]?.id||'c1',price:0,compareAt:0,stock:0,palette:'rose',
      scent:'',desc:'',sku:'',weight:'',burnTime:'',image:'',images:[],scentOptions:[],colorOptions:[],
      hidden:false,active:true,featured:false,bestseller:false,createdAt:new Date().toISOString()
    };
    if(!p) return;
    const isNew=!id;
    const scents = RT.productScents().slice();
    const colors = RT.productColors().slice();
    let images = RT.productImages(p).slice();

    function optChip(kind, o, chosen){
      return `<label class="opt-check${o.hidden?' is-hidden':''}" title="${o.hidden?'مخفي عن العملاء':''}">
        <input type="checkbox" data-pm-${kind}="${esc(o.id)}" ${chosen?'checked':''}>
        ${kind==='color'&&o.hex?`<span class="opt-swatch" style="--swatch:${esc(o.hex)}"></span>`:''}
        <span>${esc(o.label)}</span>${o.hidden?'<small>مخفي</small>':''}
      </label>`;
    }
    function renderImages(){
      const host=$('#pmImages'); if(!host) return;
      host.innerHTML = images.length ? images.map((src,i)=>`<div class="option-img-row">
        ${src?`<img src="${esc(src)}" alt="صورة ${i+1}">`:`<div class="option-img-row__placeholder">${icon('i-image')}</div>`}
        <div class="option-img-row__fields">
          ${/^data:image/.test(src)?`<small class="muted">صورة مرفوعة ${i+1} (محفوظة داخل المتصفح)</small>`:`<input type="text" data-pm-img="${i}" value="${esc(src)}" placeholder="رابط الصورة أو assets/img/...">`}
          <div class="row-actions">
            <button class="btn btn--ghost btn--sm" type="button" data-pm-img-first="${i}" ${i===0?'disabled':''}>${icon('i-arrow-up')} الصورة الرئيسية</button>
            <button class="icon-btn danger" type="button" data-pm-img-del="${i}" title="حذف الصورة">${icon('i-trash')}</button>
          </div>
        </div>
      </div>`).join('') : `<p class="muted">لا توجد صور — سيظهر رسم الشمعة التوليدي. أضف رابطًا أو ارفع صورًا.</p>`;
      $$('[data-pm-img-first]',host).forEach(b=>b.onclick=()=>{ syncImages(); const i=Number(b.dataset.pmImgFirst); const item=images.splice(i,1)[0]; if(item) images.unshift(item); renderImages(); });
      $$('[data-pm-img-del]',host).forEach(b=>b.onclick=()=>{ syncImages(); images.splice(Number(b.dataset.pmImgDel),1); renderImages(); });
    }
    function syncImages(){
      $$('[data-pm-img]', $('#modalContent')).forEach(inp=>{ const i=Number(inp.dataset.pmImg); if(images[i]!=null) images[i]=inp.value.trim(); });
    }

    openModal(`<div class="modal__head"><h2>${isNew?'إضافة منتج':'تعديل المنتج'}</h2><p>السعر والكمية والصور والروائح والألوان والظهور في المتجر.</p></div>
      <div class="form-grid">
        <label class="field"><span>الاسم</span><input id="pmName" value="${esc(p.name||'')}"></label>
        <label class="field"><span>الاسم (EN)</span><input id="pmEn" value="${esc(p.en||'')}"></label>
        <label class="field"><span>السعر (${esc(RT.currency())})</span><input id="pmPrice" type="number" step="0.01" value="${esc(p.price||0)}"></label>
        <label class="field"><span>سعر قبل الخصم</span><input id="pmCompare" type="number" step="0.01" value="${esc(p.compareAt||0)}"></label>
        <label class="field"><span>الكمية بالمخزون</span><input id="pmStock" type="number" step="1" value="${esc(p.stock||0)}"></label>
        <label class="field"><span>المجموعة</span><select id="pmCat">${cats.map(c=>`<option value="${esc(c.id)}" ${p.category===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
        <label class="field"><span>لوحة الألوان (للرسم التوليدي)</span><select id="pmPalette">${(RT.paletteKeys||['rose']).map(k=>`<option value="${esc(k)}" ${p.palette===k?'selected':''}>${esc(k)}</option>`).join('')}</select></label>
        <label class="field"><span>SKU</span><input id="pmSku" value="${esc(p.sku||'')}"></label>
        <label class="field"><span>الرائحة (نص تعريفي)</span><input id="pmScent" value="${esc(p.scent||'')}"></label>
        <label class="field"><span>الوزن</span><input id="pmWeight" value="${esc(p.weight||'')}"></label>
        <label class="field"><span>مدة الاحتراق</span><input id="pmBurn" value="${esc(p.burnTime||'')}"></label>
        <div class="field full"><span>صور المنتج — الأولى هي الصورة الرئيسية في المتجر</span>
          <div class="option-images" id="pmImages"></div>
          <div class="row-actions" style="margin-top:8px">
            <button class="btn btn--ghost btn--sm" type="button" id="pmAddImage">${icon('i-plus')} إضافة رابط صورة</button>
            <label class="btn btn--ghost btn--sm" style="cursor:pointer">${icon('i-upload')} رفع صور متعددة<input type="file" id="pmUpload" accept="image/*" multiple hidden></label>
          </div>
        </div>
        <div class="field full"><span>روائح الشمع المتاحة للاختيار</span>
          <div class="option-picker">${scents.map(o=>optChip('scent',o,(p.scentOptions||[]).indexOf(o.id)>=0)).join('')||'<small class="muted">لا توجد روائح — أضفها من «خيارات المنتجات».</small>'}</div>
        </div>
        <div class="field full"><span>ألوان الشمع المتاحة للاختيار</span>
          <div class="option-picker">${colors.map(o=>optChip('color',o,(p.colorOptions||[]).indexOf(o.id)>=0)).join('')||'<small class="muted">لا توجد ألوان — أضفها من «خيارات المنتجات».</small>'}</div>
          <small class="muted">الخيارات الموسومة «مخفي» لا تظهر للعميل حتى لو كانت محددة هنا.</small>
        </div>
        <label class="field full"><span>الوصف</span><textarea id="pmDesc">${esc(p.desc||'')}</textarea></label>
        <div class="full option-flags">
          <label class="checkbox-row"><input type="checkbox" id="pmActive" ${p.active!==false?'checked':''}> مفعّل</label>
          <label class="checkbox-row"><input type="checkbox" id="pmHidden" ${p.hidden===true?'checked':''}> مخفي عن المتجر</label>
          <label class="checkbox-row"><input type="checkbox" id="pmFeatured" ${p.featured?'checked':''}> مميز</label>
          <label class="checkbox-row"><input type="checkbox" id="pmBest" ${p.bestseller?'checked':''}> الأكثر مبيعًا</label>
        </div>
      </div>
      <div class="modal__actions"><button class="btn btn--gold" id="pmSave">${icon('i-save')} حفظ المنتج</button><span class="spacer"></span><button class="btn btn--ghost" data-close>إلغاء</button></div>`, {wide:true});
    renderImages();
    $('#pmAddImage').onclick=()=>{ syncImages(); images.push(''); renderImages(); const last=$$('[data-pm-img]', $('#modalContent')).pop(); if(last) last.focus(); };
    $('#pmUpload').onchange = e=>{
      const files=Array.from(e.target.files||[]); if(!files.length) return;
      let left=files.length;
      files.forEach(file=>{ const r=new FileReader(); r.onload=()=>{ syncImages(); images.push(String(r.result)); left--; if(!left){ renderImages(); toast('تم تحميل الصور','success'); } }; r.readAsDataURL(file); });
      e.target.value='';
    };
    $('#pmSave').onclick=()=>{
      syncImages();
      const cleanImages=images.filter(x=>typeof x==='string'&&x.trim());
      const obj = {
        ...p,
        name: $('#pmName').value.trim(), en: $('#pmEn').value.trim(),
        price: Number($('#pmPrice').value||0), compareAt: Number($('#pmCompare').value||0), stock: Number($('#pmStock').value||0),
        category: $('#pmCat').value, palette: $('#pmPalette').value, sku: $('#pmSku').value.trim(),
        scent: $('#pmScent').value.trim(), weight: $('#pmWeight').value.trim(), burnTime: $('#pmBurn').value.trim(),
        images: cleanImages, image: cleanImages[0]||'',
        scentOptions: $$('[data-pm-scent]:checked', $('#modalContent')).map(x=>x.dataset.pmScent),
        colorOptions: $$('[data-pm-color]:checked', $('#modalContent')).map(x=>x.dataset.pmColor),
        desc: $('#pmDesc').value.trim(),
        hidden: $('#pmHidden').checked,
        active: $('#pmActive').checked, featured: $('#pmFeatured').checked, bestseller: $('#pmBest').checked,
      };
      if(!obj.name){ toast('الرجاء إدخال اسم المنتج','error'); return; }
      const arr = db().products || (db().products=[]);
      const idx = arr.findIndex(x=>x.id===obj.id);
      if(idx>=0) arr[idx]=obj; else arr.unshift(obj);
      commit(isNew?'تمت إضافة المنتج':'تم حفظ المنتج'); closeModal();
    };
    $('[data-close]', $("#modalContent")).onclick=closeModal;
  }

  /* خيارات المنتجات: مكتبة الروائح والألوان + إظهار/إخفاء */
  function renderProductOptions(){
    const s=RT.settings();
    const allOptions = RT.productScents().map(o=>({kind:'scent', option:o}))
      .concat(RT.productColors().map(o=>({kind:'color', option:o})));

    $("#content").innerHTML =
      pageHead('خيارات المنتجات','أنشئ قوائم الروائح والألوان في جدول واحد، وحدّد لكل منتج ما يناسبه، وأخفِ أي خيار أو منتج دون حذفه.') +
      `<div class="note" style="margin-bottom:14px">${icon('i-alert')}<span>الخيار المخفي يختفي فورًا من نافذة المنتج في المتجر، ويبقى محفوظًا هنا ليعود عند تفعيله. احفظ ثم انشر <code>store-data.js</code> ليظهر للجميع.</span></div>
      <div class="card"><div class="card__head"><h2>مكتبة الخيارات</h2><span class="badge badge--gray">${allOptions.length}</span><span class="spacer"></span>
        <button class="btn btn--ghost btn--sm" type="button" data-add-opt="scent">${icon('i-plus')} رائحة</button>
        <button class="btn btn--gold btn--sm" type="button" data-add-opt="color">${icon('i-plus')} لون</button>
      </div>
      <div class="card__body card__body--flush">${allOptions.length?`<div class="table-wrap"><table class="data"><thead><tr>
        <th>الخيار</th><th>النوع</th><th>المعرّف / اللون</th><th>ظاهر للعملاء</th><th></th>
      </tr></thead><tbody>
        ${allOptions.map(({kind,option:o})=>`<tr>
          <td><input type="text" data-opt-label="${kind}:${esc(o.id)}" value="${esc(o.label||'')}" style="max-width:220px"></td>
          <td><span class="badge badge--${kind==='color'?'blue':'gold'}">${kind==='color'?'لون':'رائحة'}</span></td>
          <td>${kind==='color'?`<input type="color" data-opt-hex="${kind}:${esc(o.id)}" value="${esc(o.hex||'#c47786')}" style="width:56px;height:34px;padding:2px;border:1px solid var(--line);border-radius:8px;background:var(--surface)"> `:''}<code class="muted" dir="ltr">${esc(o.id)}</code></td>
          <td><label class="switch"><input type="checkbox" data-opt-hidden="${kind}:${esc(o.id)}" ${o.hidden===true?'':'checked'}><i></i></label></td>
          <td class="cell-actions"><div class="row-actions"><button class="icon-btn" data-opt-save="${kind}:${esc(o.id)}" title="حفظ">${icon('i-save')}</button><button class="icon-btn danger" data-opt-del="${kind}:${esc(o.id)}" title="حذف">${icon('i-trash')}</button></div></td>
        </tr>`).join('')}
      </tbody></table></div>`:emptyState('i-spark','لا توجد خيارات','أضف رائحة أو لونًا جديدًا ليختار منه العملاء.')}</div></div>`;

    function arrFor(kind){ return kind==='color' ? (s.productColors=RT.productColors()) : (s.productScents=RT.productScents()); }
    $$('[data-add-opt]').forEach(b=>b.onclick=()=>{ const kind=b.dataset.addOpt; const list=arrFor(kind); const id=uid(kind==='color'?'color':'scent'); list.push({id,label:kind==='color'?'لون جديد':'رائحة جديدة',hex:kind==='color'?'#c47786':'',hidden:false}); commit('تمت إضافة الخيار'); });
    $$('[data-opt-save]').forEach(b=>b.onclick=()=>{ const [kind,id]=b.dataset.optSave.split(':'); const o=arrFor(kind).find(x=>String(x.id)===id); if(!o) return; const label=$(`[data-opt-label="${kind}:${id}"]`)?.value.trim(); if(label) o.label=label; const hex=$(`[data-opt-hex="${kind}:${id}"]`)?.value; if(hex) o.hex=hex; const vis=$(`[data-opt-hidden="${kind}:${id}"]`); if(vis) o.hidden=!vis.checked; commit('تم حفظ الخيار'); });
    $$('[data-opt-hidden]').forEach(inp=>inp.onchange=()=>{ const [kind,id]=inp.dataset.optHidden.split(':'); const o=arrFor(kind).find(x=>String(x.id)===id); if(o){ o.hidden=!inp.checked; commit(inp.checked?'الخيار ظاهر للعملاء':'الخيار مخفي عن العملاء'); } });
    $$('[data-opt-del]').forEach(b=>b.onclick=()=>{ const [kind,id]=b.dataset.optDel.split(':'); if(!confirm('حذف هذا الخيار من كل المنتجات؟')) return; const list=arrFor(kind); s[kind==='color'?'productColors':'productScents']=list.filter(x=>String(x.id)!==id); (db().products||[]).forEach(p=>{ const key=kind==='color'?'colorOptions':'scentOptions'; if(Array.isArray(p[key])) p[key]=p[key].filter(x=>String(x)!==id); }); commit('تم حذف الخيار'); });
  }

  /* Categories */
  function renderCategories(){
    const d=db(); const cats=d.categories||[]; const products=d.products||[];
    $("#content").innerHTML =
      pageHead('المجموعات','إدارة تصنيفات/مجموعات المنتجات الظاهرة في المتجر.') +
      `<div class="settings-grid">
        <div class="card span-2"><div class="card__head"><h2>المجموعات الحالية</h2><span class="spacer"></span><button class="btn btn--gold btn--sm" id="addCatBtn">${icon('i-plus')} إضافة مجموعة</button></div>
          <div class="card__body card__body--flush">${cats.length?`<div class="table-wrap"><table class="data"><thead><tr><th>الاسم</th><th>المعرّف</th><th>الوصف</th><th>المنتجات</th><th>ظاهر</th><th></th></tr></thead><tbody>
            ${cats.map(c=>{ const count=products.filter(p=>p.category===c.id).length; return `<tr><td><input type="text" value="${esc(c.name||'')}" data-cat-name="${esc(c.id)}" style="max-width:220px"></td><td><code class="muted" dir="ltr">${esc(c.id)}</code></td><td><input type="text" value="${esc(c.desc||'')}" data-cat-desc="${esc(c.id)}"></td><td class="num">${count}</td><td><label class="switch" title="إظهار في المتجر"><input type="checkbox" data-cat-hidden="${esc(c.id)}" ${c.hidden===true?'':'checked'}><i></i></label></td><td class="cell-actions"><div class="row-actions"><button class="icon-btn" data-cat-save="${esc(c.id)}" title="حفظ">${icon('i-save')}</button><button class="icon-btn danger" data-cat-del="${esc(c.id)}" title="${count?'انقل المنتجات أولًا':'حذف'}" ${count?'disabled':''}>${icon('i-trash')}</button></div></td></tr>`; }).join('')}
          </tbody></table></div>`:emptyState('i-tags','لا توجد مجموعات','أضف مجموعة لتنظيم المنتجات.')}</div></div>
      </div>`;
    $('#addCatBtn').onclick=()=>{ db().categories.push({id:uid('c'),name:'مجموعة جديدة',slug:'new',desc:'',palette:'rose',hidden:false}); commit('تمت إضافة مجموعة'); };
    $$('[data-cat-save]').forEach(b=>b.addEventListener('click',()=>{ const id=b.dataset.catSave; const c=(db().categories||[]).find(x=>x.id===id); if(!c) return; c.name=$(`[data-cat-name="${id}"]`).value.trim()||c.name; c.desc=$(`[data-cat-desc="${id}"]`).value.trim(); const vis=$(`[data-cat-hidden="${id}"]`); if(vis) c.hidden=!vis.checked; commit('تم حفظ المجموعة'); }));
    $$('[data-cat-hidden]').forEach(inp=>inp.addEventListener('change',()=>{ const c=(db().categories||[]).find(x=>x.id===inp.dataset.catHidden); if(c){ c.hidden=!inp.checked; commit(inp.checked?'المجموعة ظاهرة في المتجر':'المجموعة مخفية عن المتجر'); } }));
    $$('[data-cat-del]').forEach(b=>b.addEventListener('click',()=>{ if(b.disabled) return; if(!confirm('حذف المجموعة؟')) return; const d=db(); d.categories=d.categories.filter(x=>x.id!==b.dataset.catDel); commit('تم حذف المجموعة'); }));
  }

  /* Offers */
  function renderOffers(){
    const d=db(); const offers=d.offers||[];
    $("#content").innerHTML =
      pageHead('العروض','إدارة العروض المميزة والخصومات (إضافة/تعديل/حذف/مدة).', `<button class="btn btn--gold" type="button" id="addOfferBtn">${icon('i-plus')} عرض جديد</button>`) +
      `<div class="card"><div class="card__body card__body--flush">${offers.length?`<div class="table-wrap"><table class="data"><thead><tr><th>العرض</th><th>السعر</th><th>قبل الخصم</th><th>المدة/ينتهي</th><th>مفعّل</th><th>ظاهر</th><th></th></tr></thead><tbody>
        ${offers.map(o=>`<tr><td><div class="cell-product">${o.image?`<img src="${esc(o.image)}" alt="">`:''}<div><b>${esc(o.title||o.name||'-')}</b><small>${esc(o.desc||o.short||'')}</small></div></div></td><td class="num strong">${money(o.price||0)}</td><td class="num muted">${o.compareAt?money(o.compareAt):'—'}</td><td class="muted">${esc(o.endsAt?fmtDate(o.endsAt):(o.duration||'—'))}</td><td><label class="switch"><input type="checkbox" data-toggle-offer="${esc(o.id)}" ${o.active!==false?'checked':''}><i></i></label></td><td><label class="switch"><input type="checkbox" data-hide-offer="${esc(o.id)}" ${o.hidden===true?'':'checked'}><i></i></label></td><td class="cell-actions"><div class="row-actions"><button class="icon-btn" data-edit-offer="${esc(o.id)}">${icon('i-edit')}</button><button class="icon-btn danger" data-del-offer="${esc(o.id)}">${icon('i-trash')}</button></div></td></tr>`).join('')}
      </tbody></table></div>`:emptyState('i-spark','لا توجد عروض','أضف عرضًا مميزًا ليظهر في المتجر.')}</div></div>`;
    $('#addOfferBtn').onclick=()=>openOfferModal(null);
    $$('[data-edit-offer]').forEach(b=>b.addEventListener('click',()=>openOfferModal(b.dataset.editOffer)));
    $$('[data-del-offer]').forEach(b=>b.addEventListener('click',()=>{ if(!confirm('حذف العرض؟')) return; const d=db(); d.offers=d.offers.filter(x=>x.id!==b.dataset.delOffer); commit('تم حذف العرض'); }));
    $$('[data-toggle-offer]').forEach(inp=>inp.addEventListener('change',()=>{ const o=(db().offers||[]).find(x=>x.id===inp.dataset.toggleOffer); if(o){ o.active=inp.checked; commit(); } }));
    $$('[data-hide-offer]').forEach(inp=>inp.addEventListener('change',()=>{ const o=(db().offers||[]).find(x=>x.id===inp.dataset.hideOffer); if(o){ o.hidden=!inp.checked; commit(); } }));
  }
  function openOfferModal(id){
    const d=db(); const o = id ? (d.offers||[]).find(x=>x.id===id) : {id:uid('offer'),title:'عرض جديد',desc:'',price:0,compareAt:0,image:'',active:true,endsAt:'',duration:''};
    if(!o) return; const isNew=!id;
    openModal(`<div class="modal__head"><h2>${isNew?'إضافة عرض':'تعديل العرض'}</h2><p>السعر، الصورة، المدة/تاريخ الانتهاء، والتفعيل.</p></div>
      <div class="form-grid">
        <label class="field span-2"><span>عنوان العرض</span><input id="ofTitle" value="${esc(o.title||o.name||'')}"></label>
        <label class="field span-2"><span>الوصف</span><textarea id="ofDesc">${esc(o.desc||o.short||'')}</textarea></label>
        <label class="field"><span>السعر (${esc(RT.currency())})</span><input id="ofPrice" type="number" step="0.01" value="${esc(o.price||0)}"></label>
        <label class="field"><span>السعر قبل الخصم</span><input id="ofCompare" type="number" step="0.01" value="${esc(o.compareAt||o.oldPrice||0)}"></label>
        <label class="field"><span>ينتهي في (تاريخ/وقت)</span><input id="ofEnds" type="datetime-local" value="${esc(o.endsAt?new Date(o.endsAt).toISOString().slice(0,16):'')}"></label>
        <label class="field"><span>مدة/ملاحظة</span><input id="ofDur" value="${esc(o.duration||'')}"></label>
        <label class="field span-2"><span>صورة العرض (رابط)</span><input id="ofImg" value="${/^data:image/.test(o.image||'')?'':esc(o.image||'')}"></label>
        <div class="full option-flags"><label class="checkbox-row"><input type="checkbox" id="ofActive" ${o.active!==false?'checked':''}> العرض مفعّل</label><label class="checkbox-row"><input type="checkbox" id="ofHidden" ${o.hidden===true?'checked':''}> مخفي عن المتجر</label></div>
      </div>
      <div class="modal__actions"><button class="btn btn--gold" id="ofSave">${icon('i-save')} حفظ</button><span class="spacer"></span><button class="btn btn--ghost" data-close>إلغاء</button></div>`, {wide:true});
    $('#ofSave').onclick=()=>{
      const obj={...o, title:$('#ofTitle').value.trim()||'عرض', desc:$('#ofDesc').value.trim(), price:Number($('#ofPrice').value||0), compareAt:Number($('#ofCompare').value||0), endsAt: $('#ofEnds').value?new Date($('#ofEnds').value).toISOString():'', duration:$('#ofDur').value.trim(), image:$('#ofImg').value.trim(), active:$('#ofActive').checked, hidden:$('#ofHidden').checked};
      const arr=db().offers||(db().offers=[]); const idx=arr.findIndex(x=>x.id===obj.id); if(idx>=0) arr[idx]=obj; else arr.unshift(obj); commit(isNew?'تمت إضافة العرض':'تم حفظ العرض'); closeModal();
    };
    $('[data-close]', $("#modalContent")).onclick=closeModal;
  }

  /* Reviews */
  function renderReviews(){
    const d=db(); const reviews=d.reviews||[];
    $("#content").innerHTML =
      pageHead('آراء العملاء','إضافة وتعديل وحذف تقييمات وآراء العملاء.', `<button class="btn btn--gold" type="button" id="addReviewBtn">${icon('i-plus')} رأي جديد</button>`) +
      `<div class="card"><div class="card__body card__body--flush">${reviews.length?`<div class="table-wrap"><table class="data"><thead><tr><th>العميل</th><th>التقييم</th><th>النص</th><th>مفعّل</th><th>ظاهر</th><th></th></tr></thead><tbody>
        ${reviews.map(r=>`<tr><td class="strong">${esc(r.name||'-')}</td><td class="num">${'★'.repeat(Math.max(1,Math.min(5,Number(r.rating)||5)))}${'☆'.repeat(5-Math.max(1,Math.min(5,Number(r.rating)||5)))}</td><td class="muted">${esc(r.text||r.comment||'')}</td><td><label class="switch"><input type="checkbox" data-toggle-review="${esc(r.id)}" ${r.active!==false?'checked':''}><i></i></label></td><td><label class="switch"><input type="checkbox" data-hide-review="${esc(r.id)}" ${r.hidden===true?'':'checked'}><i></i></label></td><td class="cell-actions"><div class="row-actions"><button class="icon-btn" data-edit-review="${esc(r.id)}">${icon('i-edit')}</button><button class="icon-btn danger" data-del-review="${esc(r.id)}">${icon('i-trash')}</button></div></td></tr>`).join('')}
      </tbody></table></div>`:emptyState('i-star','لا توجد آراء','أضف آراء العملاء لعرضها في الموقع.')}</div></div>`;
    $('#addReviewBtn').onclick=()=>openReviewModal(null);
    $$('[data-edit-review]').forEach(b=>b.addEventListener('click',()=>openReviewModal(b.dataset.editReview)));
    $$('[data-del-review]').forEach(b=>b.addEventListener('click',()=>{ if(!confirm('حذف الرأي؟')) return; const d=db(); d.reviews=d.reviews.filter(x=>x.id!==b.dataset.delReview); commit('تم حذف الرأي'); }));
    $$('[data-toggle-review]').forEach(inp=>inp.addEventListener('change',()=>{ const r=(db().reviews||[]).find(x=>x.id===inp.dataset.toggleReview); if(r){ r.active=inp.checked; commit(); } }));
    $$('[data-hide-review]').forEach(inp=>inp.addEventListener('change',()=>{ const r=(db().reviews||[]).find(x=>x.id===inp.dataset.hideReview); if(r){ r.hidden=!inp.checked; commit(); } }));
  }
  function openReviewModal(id){
    const d=db(); const r = id ? (d.reviews||[]).find(x=>x.id===id) : {id:uid('r'),name:'',rating:5,text:'',active:true};
    if(!r) return; const isNew=!id;
    openModal(`<div class="modal__head"><h2>${isNew?'إضافة رأي':'تعديل الرأي'}</h2><p>اسم العميل، التقييم، والنص.</p></div>
      <div class="form-grid">
        <label class="field"><span>اسم العميل</span><input id="rvName" value="${esc(r.name||'')}"></label>
        <label class="field"><span>التقييم (1-5)</span><input id="rvRating" type="number" min="1" max="5" step="1" value="${esc(r.rating||5)}"></label>
        <label class="field span-2"><span>نص الرأي</span><textarea id="rvText">${esc(r.text||r.comment||'')}</textarea></label>
        <div class="full option-flags"><label class="checkbox-row"><input type="checkbox" id="rvActive" ${r.active!==false?'checked':''}> مفعّل</label><label class="checkbox-row"><input type="checkbox" id="rvHidden" ${r.hidden===true?'checked':''}> مخفي عن المتجر</label></div>
      </div>
      <div class="modal__actions"><button class="btn btn--gold" id="rvSave">${icon('i-save')} حفظ</button><span class="spacer"></span><button class="btn btn--ghost" data-close>إلغاء</button></div>`);
    $('#rvSave').onclick=()=>{
      const obj={...r, name:$('#rvName').value.trim()||'عميل', rating:Math.max(1,Math.min(5,Number($('#rvRating').value||5))), text:$('#rvText').value.trim(), active:$('#rvActive').checked, hidden:$('#rvHidden').checked};
      if(!obj.text){ toast('أدخل نص الرأي','error'); return; }
      const arr=db().reviews||(db().reviews=[]); const idx=arr.findIndex(x=>x.id===obj.id); if(idx>=0) arr[idx]=obj; else arr.unshift(obj); commit(isNew?'تمت الإضافة':'تم الحفظ'); closeModal();
    };
    $('[data-close]', $("#modalContent")).onclick=closeModal;
  }

  /* Promo / announcement bars */
  function renderPromo(){
    const s = RT.settings();
    $("#content").innerHTML =
      pageHead('شريط الإعلان','تحكم في شريط الإعلان العلوي والشريط المتحرك الثاني أسفل الهيرو.') +
      `<div class="settings-grid">
        <div class="card span-2"><div class="card__head"><h2>${icon('i-spark')} أشرطة الإعلانات</h2></div><div class="card__body">
          <label class="field"><span>شريط الإعلان العلوي</span><input id="prTop" value="${esc(s.announcement||'')}"></label>
          <label class="field"><span>الشريط المتحرك الثاني (أسفل الهيرو) — افصل بين العبارات بعلامة |</span><textarea id="prMarquee" rows="3">${esc(s.marqueeText||'')}</textarea></label>
          <div class="promo-preview" id="prPreview"><span>${esc(s.announcement||'')}</span></div>
          <div class="note mt-14">${icon('i-alert')}<span>الشريط الثاني يعرض العبارات بالتناوب/حركة متواصلة. استخدم <b>|</b> للفصل بين العبارات. احفظ ثم انشر <code>store-data.js</code> ليظهر للجميع.</span></div>
          <div class="modal__actions" style="border-top:0;padding-top:10px"><button class="btn btn--gold" id="savePromoBtn">${icon('i-save')} حفظ الأشرطة</button><a class="btn btn--ghost" href="../index.html" target="_blank" rel="noopener">${icon('i-external')} معاينة الموقع</a></div>
        </div></div>
      </div>`;
    $('#savePromoBtn').onclick=()=>{ const s=RT.settings(); s.announcement=$('#prTop').value; s.marqueeText=$('#prMarquee').value; commit('تم حفظ أشرطة الإعلان'); };
  }

  /* Shipping */
  function renderShipping(){
    const s = RT.settings();
    if (!Array.isArray(s.deliveryAreas)) s.deliveryAreas = [{name:'نابلس',fee:Number(s.shippingCost||25),enabled:true}];
    $("#content").innerHTML =
      pageHead('الشحن والتوصيل','إعدادات الشحن العامة ومناطق ورسوم التوصيل داخل الضفة الغربية.', `<button class="btn btn--gold" type="button" id="addAreaBtn">${icon('i-plus')} إضافة منطقة</button>`) +
      `<div class="card"><div class="card__body">
        <div class="form-grid">
          <label class="field"><span>رسوم الشحن الافتراضية (${esc(RT.currency())})</span><input id="shipCost" type="number" step="0.01" value="${esc(s.shippingCost||0)}"></label>
          <label class="field"><span>حد الشحن المجاني (${esc(RT.currency())})</span><input id="shipFree" type="number" step="0.01" value="${esc(s.freeShipping||0)}"></label>
        </div>
      </div></div>
      <div class="card" style="margin-top:18px"><div class="card__head"><h2>مناطق التوصيل</h2></div><div class="card__body card__body--flush">
        <div class="table-wrap"><table class="data"><thead><tr><th>المنطقة</th><th>الرسوم</th><th>ملاحظة</th><th>مفعّلة</th><th></th></tr></thead><tbody id="areasBody">
          ${(s.deliveryAreas||[]).map((a,i)=>`<tr data-ai="${i}"><td><input data-f="name" value="${esc(a.name||'')}"></td><td><input data-f="fee" type="number" step="0.01" value="${esc(a.fee||0)}" style="width:110px"></td><td><input data-f="note" value="${esc(a.note||'')}"></td><td><label class="switch"><input type="checkbox" data-f="enabled" ${a.enabled!==false?'checked':''}><i></i></label></td><td class="cell-actions"><button class="icon-btn danger" data-del-area="${i}">${icon('i-trash')}</button></td></tr>`).join('')}
        </tbody></table></div>
      </div><div class="card__foot"><button class="btn btn--gold" id="saveShipBtn">${icon('i-save')} حفظ الشحن والمناطق</button></div></div>`;
    $('#addAreaBtn').onclick=()=>{ s.deliveryAreas.push({name:'منطقة جديدة',fee:Number(s.shippingCost||0),enabled:true,note:''}); renderShipping(); };
    $$('[data-del-area]').forEach(b=>b.addEventListener('click',()=>{ s.deliveryAreas.splice(Number(b.dataset.delArea),1); renderShipping(); }));
    $('#saveShipBtn').onclick=()=>{
      s.shippingCost=Number($('#shipCost').value||0); s.freeShipping=Number($('#shipFree').value||0);
      $$('#areasBody tr').forEach(tr=>{ const i=Number(tr.dataset.ai); const a=s.deliveryAreas[i]; if(!a) return; $$('[data-f]',tr).forEach(inp=>{ const f=inp.dataset.f; if(inp.type==='checkbox') a[f]=inp.checked; else if(f==='fee') a[f]=Number(inp.value||0); else a[f]=inp.value; }); });
      commit('تم حفظ الشحن والمناطق');
    };
  }

  /* Loyalty */
  function renderLoyalty(){
    const s = RT.settings();
    if (!s.loyalty || typeof s.loyalty !== 'object') s.loyalty = { enabled: true, pointsRate: 10, pointValue: 0.1 };
    $("#content").innerHTML =
      pageHead('نظام الولاء','إدارة نقاط وولاء العملاء (تُحتسب تلقائيًا من الطلبات المحلية وطلبات Google Sheets، ويمكن تعديلها يدويًا).', `<button class="btn btn--gold" type="button" id="saveLoyaltyBtn">${icon('i-save')} حفظ إعدادات الولاء</button>`) +
      `<div class="stats" id="loyaltyStats"></div>
      <div class="card"><div class="card__head"><h2>إعدادات نظام الولاء</h2></div><div class="card__body">
        <div class="form-grid">
          <label class="field"><span>تفعيل النظام</span><select id="lyEnabled"><option value="1" ${s.loyalty.enabled!==false?'selected':''}>مفعّل</option><option value="0" ${s.loyalty.enabled===false?'selected':''}>غير مفعّل</option></select></label>
          <label class="field"><span>كل كم ${esc(RT.currency())} = 1 نقطة</span><input id="lyRate" type="number" step="1" min="1" value="${esc(s.loyalty.pointsRate||10)}"></label>
          <label class="field"><span>قيمة النقطة (${esc(RT.currency())})</span><input id="lyValue" type="number" step="0.01" min="0" value="${esc(s.loyalty.pointValue||0.1)}"></label>
          <div class="field"><span>ملاحظة</span><div class="note" style="margin:0">${icon('i-alert')}<span>النقاط تُحتسب تلقائيًا من إجمالي الطلبات غير الملغاة (حسب رقم الهاتف) — سواء وصلت من المتجر مباشرة أو من Google Sheets. يمكن تعديل نقاط أي عميل يدويًا من الجدول أدناه.</span></div></div>
        </div>
      </div></div>
      <div class="card" style="margin-top:18px"><div class="card__head"><h2>أعضاء الولاء</h2><span class="spacer"></span><span class="badge badge--gray" id="loyaltySourceBadge">…</span><button class="btn btn--ghost btn--sm" type="button" id="syncLoyaltyBtn">${icon('i-refresh')} إعادة احتساب</button></div>
        <div class="card__body card__body--flush" id="loyaltyMembersBody"></div></div>`;
    $('#saveLoyaltyBtn').onclick=()=>{
      s.loyalty = s.loyalty || {};
      s.loyalty.enabled = $('#lyEnabled').value !== '0';
      s.loyalty.pointsRate = Math.max(1, Number($('#lyRate').value||10));
      s.loyalty.pointValue = Math.max(0, Number($('#lyValue').value||0));
      RT.syncLoyaltyMembers && RT.syncLoyaltyMembers();
      RT.commit();
      toast('تم حفظ إعدادات نظام الولاء', 'success');
      saveState(true);
      renderNav();
      paintLoyalty();
    };
    $('#syncLoyaltyBtn').onclick=()=>{
      RT.syncLoyaltyMembers && RT.syncLoyaltyMembers();
      RT.commit();
      toast('تمت إعادة احتساب نقاط الولاء', 'success');
      saveState(true);
      loadLoyaltyRemote();
      paintLoyalty();
    };
    paintLoyalty();
    loadLoyaltyRemote();
  }

  function loyaltyMemberList(){
    if (RT.computeLoyaltyMembers) return RT.computeLoyaltyMembers(state.loyaltyRemoteOrders || []);
    return (db().loyaltyMembers || []);
  }

  function loadLoyaltyRemote(){
    const s = RT.settings();
    if (!s.sheetsApiUrl || !RT.fetchRemote) { state.loyaltyRemoteLoading = false; return; }
    state.loyaltyRemoteLoading = true;
    state.loyaltyRemoteError = false;
    paintLoyalty();
    RT.fetchRemote('orders').then(res=>{
      state.loyaltyRemoteLoading = false;
      state.loyaltyRemoteError = false;
      state.loyaltyRemoteOrders = ((res && res.rows) || []);
      paintLoyalty();
    }).catch(()=>{
      state.loyaltyRemoteLoading = false;
      state.loyaltyRemoteError = true;
      paintLoyalty();
    });
  }

  function paintLoyalty(){
    if (state.view !== 'loyalty') return;
    const s = RT.settings();
    if (!s.loyalty || typeof s.loyalty !== 'object') s.loyalty = { enabled: true, pointsRate: 10, pointValue: 0.1 };
    const members = loyaltyMemberList();
    const hidden = (RT.loyaltyHiddenPhones ? RT.loyaltyHiddenPhones() : []).slice().reverse();
    const totalPoints = members.reduce((a,m)=>a+(Number(m.points)||0),0);

    const statsBox = $('#loyaltyStats');
    if (statsBox) statsBox.innerHTML =
      stat('الأعضاء', members.length, 'عميل مسجل بالنقاط', 'i-user', true) +
      stat('إجمالي النقاط', totalPoints, 'نقطة متراكمة', 'i-star') +
      stat('قاعدة الاحتساب', (s.loyalty.pointsRate||10) + ' ' + esc(RT.currency()), 'لكل نقطة واحدة', 'i-chart') +
      stat('قيمة النقطة', (s.loyalty.pointValue||0.1) + ' ' + esc(RT.currency()), 'تقديرية', 'i-money');

    const sourceBadge = $('#loyaltySourceBadge');
    if (sourceBadge) {
      const remoteCount = (state.loyaltyRemoteOrders || []).length;
      if (state.loyaltyRemoteLoading) sourceBadge.textContent = 'جارٍ جلب طلبات Google…';
      else if (state.loyaltyRemoteError) sourceBadge.textContent = 'تعذر جلب Google Sheets';
      else if (s.sheetsApiUrl) sourceBadge.textContent = remoteCount + ' طلب من Google Sheets';
      else sourceBadge.textContent = 'طلبات محلية فقط';
    }

    const body = $('#loyaltyMembersBody');
    if (body) {
      const norm = p => String(p || '').replace(/\D/g, '');
      const activePhones = new Set(members.map(m => norm(m.phone)));
      const activeRows = members.map(m => {
        const phone = norm(m.phone);
        const level = m.level || RT.loyaltyLevel(m.points || 0);
        return `<tr>
          <td class="strong">${esc(m.name||'عميل')}</td>
          <td dir="ltr" class="num">${esc(m.phone||'—')}</td>
          <td class="num">${esc(m.orders||0)}</td>
          <td class="num">${money(m.spent||0)}</td>
          <td class="num strong">${esc(m.points||0)}${m.manual?' <span class="badge badge--gray">يدوي</span>':''}</td>
          <td><span class="badge ${level==='ذهبي'?'badge--gold':(level==='فضي'?'badge--blue':'badge--gray')}">${esc(level)}</span></td>
          <td><span class="badge badge--green">نشط</span></td>
          <td class="cell-actions"><div class="row-actions">
            <button class="icon-btn" data-edit-ly="${esc(phone)}" title="تعديل النقاط">${icon('i-edit')}</button>
            <button class="icon-btn danger" data-del-ly="${esc(phone)}" title="حذف العميل من نظام الولاء">${icon('i-trash')}</button>
          </div></td>
        </tr>`;
      });
      const hiddenRows = hidden.filter(p => !activePhones.has(norm(p))).map(p => `<tr>
        <td class="strong muted">—</td>
        <td dir="ltr" class="num">${esc(p)}</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td class="num">—</td>
        <td>—</td>
        <td><span class="badge badge--gray">مستبعد</span></td>
        <td class="cell-actions"><button class="btn btn--ghost btn--sm" type="button" data-restore-ly="${esc(p)}">${icon('i-refresh')} استرجاع</button></td>
      </tr>`);
      body.innerHTML = (activeRows.length || hiddenRows.length)
        ? (hiddenRows.length ? `<div class="note" style="margin:14px">${icon('i-alert')}<span>العملاء المحذوفون يظهرون في نفس الجدول بحالة «مستبعد» ولا تُحتسب طلباتهم. استرجعهم من زر «استرجاع».</span></div>` : '') +
          `<div class="table-wrap"><table class="data"><thead><tr>
            <th>العميل</th><th>الهاتف</th><th>الطلبات</th><th>الإنفاق</th><th>النقاط</th><th>المستوى</th><th>الحالة</th><th></th>
          </tr></thead><tbody>${activeRows.join('')}${hiddenRows.join('')}</tbody></table></div>`
        : emptyState('i-star','لا يوجد أعضاء ولاء بعد','ستظهر النقاط تلقائيًا عند وصول طلبات تحتوي على أرقام هواتف — محلية أو من Google Sheets.');
    }

    bindLoyaltyActions();
  }

  function bindLoyaltyActions(){
    $$('[data-edit-ly]').forEach(b=>b.addEventListener('click',()=>{
      const phone = b.dataset.editLy;
      const m = loyaltyMemberList().find(x=>String(x.phone||'').replace(/\D/g,'')===phone);
      if(!m) return;
      openModal(`<div class="modal__head"><h2>تعديل نقاط العميل</h2><p>${esc(m.name||'عميل')} — <span dir="ltr">${esc(m.phone||'')}</span></p></div>
        <div class="form-grid">
          <label class="field"><span>النقاط (يدويًا)</span><input id="lyPts" type="number" step="1" value="${esc(m.points||0)}"></label>
          <div class="field"><span>معلومات</span><div class="note" style="margin:0">${icon('i-alert')}<span>تعيين قيمة هنا يثبّت النقاط يدويًا لهذا العميل (لن تُستبدل باحتساب الطلبات حتى تغيّرها).</span></div></div>
        </div>
        <div class="modal__actions"><button class="btn btn--gold" id="lySavePts">${icon('i-save')} حفظ</button><button class="btn btn--ghost" id="lyAutoPts">إرجاع للاحتساب التلقائي</button><span class="spacer"></span><button class="btn btn--ghost" data-close>إلغاء</button></div>`, {narrow:true});
      const finish = (msg) => { closeModal(); toast(msg, 'success'); saveState(true); renderNav(); paintLoyalty(); };
      $('#lySavePts').onclick=()=>{ RT.setLoyaltyPoints(phone, $('#lyPts').value); finish('تم تحديث نقاط العميل'); };
      $('#lyAutoPts').onclick=()=>{ RT.setLoyaltyPoints(phone, null); finish('تمت إعادة النقاط للاحتساب التلقائي'); };
      $('[data-close]', $('#modalContent')).onclick=closeModal;
    }));
    $$('[data-del-ly]').forEach(b=>b.addEventListener('click',()=>{
      const phone = b.dataset.delLy;
      const m = loyaltyMemberList().find(x=>String(x.phone||'').replace(/\D/g,'')===phone);
      const label = (m && m.name) ? (m.name + ' — ' + phone) : phone;
      if(!confirm('حذف ' + label + ' من نظام الولاء؟\nلن تُحتسب طلباته السابقة، وسيظهر في نفس الجدول بحالة «مستبعد» ويمكنك استرجاعه من زر «استرجاع».')) return;
      RT.deleteLoyaltyMember ? RT.deleteLoyaltyMember(phone) : null;
      toast('تم حذف العميل من نظام الولاء', 'success');
      saveState(true); renderNav(); paintLoyalty();
    }));
    $$('[data-restore-ly]').forEach(b=>b.addEventListener('click',()=>{
      RT.restoreLoyaltyMember ? RT.restoreLoyaltyMember(b.dataset.restoreLy) : null;
      toast('تم استرجاع العميل إلى نظام الولاء', 'success');
      saveState(true); renderNav(); paintLoyalty();
    }));
  }

  /* Settings */
  function renderSettings(){
    const s = RT.settings();
    $("#content").innerHTML =
      pageHead('إعدادات الموقع','الهوية، نصوص الصفحة، التواصل، والإعلانات — تُطبّق على الموقع.') +
      `<div class="settings-grid">
        ${card('هوية المتجر','i-store',`
          <label class="field"><span>اسم المتجر</span><input data-s="storeName" value="${esc(s.storeName||'')}"></label>
          <label class="field"><span>الاسم بالعربية</span><input data-s="storeNameAr" value="${esc(s.storeNameAr||'')}"></label>
          <label class="field"><span>العملة</span><input data-s="currency" value="${esc(s.currency||'₪')}"></label>
          <label class="field"><span>الوصف المختصر (Tagline)</span><input data-s="tagline" value="${esc(s.tagline||'')}"></label>
        `)}
        ${card('قسم الهيرو (الرئيسية)','i-star',`
          <label class="field"><span>شارة الهيرو</span><input data-s="heroBadge" value="${esc(s.heroBadge||'')}"></label>
          <label class="field"><span>عنوان الهيرو</span><input data-s="heroTitle" value="${esc(s.heroTitle||'')}"></label>
          <label class="field"><span>العنوان المميز</span><input data-s="heroAccent" value="${esc(s.heroAccent||'')}"></label>
          <label class="field"><span>نص زر الهيرو</span><input data-s="heroCta" value="${esc(s.heroCta||'')}"></label>
          <label class="field"><span>وصف الهيرو</span><textarea data-s="heroText">${esc(s.heroText||'')}</textarea></label>
        `)}
        ${card('قسم قصتنا','i-image',`
          <label class="field"><span>عنوان القسم</span><input data-s="aboutTitle" value="${esc(s.aboutTitle||'')}"></label>
          <label class="field"><span>نص القصة</span><textarea data-s="aboutText">${esc(s.aboutText||'')}</textarea></label>
        `, '', true)}
        ${card('التواصل والموقع','i-phone',`
          <div class="form-grid">
            <label class="field"><span>الهاتف</span><input data-s="phone" value="${esc(s.phone||'')}"></label>
            <label class="field"><span>واتساب (رقم دولي)</span><input data-s="whatsapp" value="${esc(s.whatsapp||'')}"></label>
            <label class="field"><span>الموقع/العنوان</span><input data-s="address" value="${esc(s.address||'')}"></label>
            <label class="field"><span>أوقات العمل</span><input data-s="workingHours" value="${esc(s.workingHours||'')}"></label>
            <label class="field"><span>إنستغرام</span><input data-s="instagram" value="${esc(s.instagram||'')}"></label>
          </div>
          <div class="note mt-14">${icon('i-alert')}<span>لا يوجد بريد إلكتروني — التواصل عبر الهاتف/واتساب فقط.</span></div>
        `, '', true)}
        ${card('مزامنة الطلبات (Google Sheets)','i-database',`
          <label class="field"><span>رابط تطبيق Apps Script (Web App URL)</span><input data-s="sheetsApiUrl" dir="ltr" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(s.sheetsApiUrl||'')}"></label>
          <label class="field"><span>رابط جدول Google (اختياري للفتح السريع)</span><input data-s="sheetsSheetUrl" dir="ltr" placeholder="https://docs.google.com/spreadsheets/d/..." value="${esc(s.sheetsSheetUrl||'')}"></label>
          <div class="note">${icon('i-alert')}<span>بعد ضبط الرابط تُرسَل الطلبات والرسائل تلقائيًا إلى الجدول وتظهر في «الطلبات» و«الرسائل». خطوات الإعداد كاملة في ملف <b>GOOGLE-SHEETS.md</b>.</span></div>
          <button class="btn btn--ghost btn--sm mt-14" type="button" id="testSheetsBtn">${icon('i-refresh')} اختبار الاتصال</button>
        `, '', true)}
      </div>
      <div class="flex mt-20" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn--gold" id="saveSettingsBtn">${icon('i-save')} حفظ الإعدادات</button><a class="btn btn--ghost" href="../index.html" target="_blank" rel="noopener">${icon('i-external')} معاينة الموقع</a></div>`;
    $('#saveSettingsBtn').onclick=()=>{
      const s=RT.settings();
      $$('[data-s]').forEach(inp=>{ s[inp.dataset.s]=inp.value; });
      s.currency = RT.normalizeCurrency ? RT.normalizeCurrency(s.currency) : (s.currency||'₪');
      commit('تم حفظ إعدادات الموقع');
    };
    $('#testSheetsBtn').onclick=async ()=>{
      const s=RT.settings();
      s.sheetsApiUrl=($('[data-s="sheetsApiUrl"]').value||'').trim();
      s.sheetsSheetUrl=($('[data-s="sheetsSheetUrl"]').value||'').trim();
      RT.commit();
      if(!s.sheetsApiUrl){ toast('أضف رابط Apps Script أولًا','error'); return; }
      try { const res=await RT.fetchRemote('orders'); toast('نجح الاتصال — '+(((res&&res.rows)||[]).length)+' طلب في الجدول','success'); }
      catch(err){ toast('فشل الاتصال: '+(err.message||''),'error'); }
    };
  }
  function card(title, ic, body, extra='', span2=false){ return `<div class="card${span2?' span-2':''}"><div class="card__head"><h2>${ic?icon(ic)+' ':''}${esc(title)}</h2>${extra?`<span class="spacer"></span>${extra}`:''}</div><div class="card__body">${body}</div></div>`; }

  /* Account */
  function renderAccount(){
    const s = RT.settings();
    $("#content").innerHTML =
      pageHead('الحساب والأمان','تغيير بيانات الدخول الخاصة بلوحة الإدارة.') +
      `<div class="settings-grid">
        ${card('بيانات الدخول','i-user',`
          <label class="field"><span>اسم المستخدم</span><input id="accUser" value="${esc(s.adminUsername||'admin')}"></label>
          <label class="field"><span>كلمة المرور الجديدة</span><input id="accPass" type="text" value="${esc(s.adminPassword||'')}" placeholder="أدخل كلمة مرور"></label>
          <p class="form-hint">احفظ البيانات وتذكّرها للدخول القادم. (الدخول محمي على مستوى المتصفح/الإعدادات لهذا الموقع الثابت)</p>
          <button class="btn btn--gold mt-14" id="saveAccBtn">${icon('i-save')} حفظ بيانات الدخول</button>
        `)}
        ${card('نصائح','i-lock',`<div class="backup-list">
          <div class="backup-row">${icon('i-check')}<span>استخدم كلمة مرور قوية ولا تشاركها.</span></div>
          <div class="backup-row">${icon('i-check')}<span>بعد تغيير البيانات، انشر <b>store-data.js</b> المحدث إن أردت اعتمادها كافتراضي للنشر الجديد.</span></div>
          <div class="backup-row">${icon('i-check')}<span>التعديلات تُحفظ في إعدادات المتجر محليًا ويمكن تصديرها.</span></div>
        </div>`)}
      </div>`;
    $('#saveAccBtn').onclick=()=>{ const s=RT.settings(); s.adminUsername=($('#accUser').value||'').trim()||'admin'; s.adminPassword=$('#accPass').value||s.adminPassword||'admin123'; commit('تم حفظ بيانات الدخول'); };
  }

  /* Backup */
  function renderBackup(){
    $("#content").innerHTML =
      pageHead('النسخ الاحتياطي والنشر','تصدير/استيراد البيانات، تنزيل ملف النشر المحدث، وإعادة الضبط.') +
      `<div class="settings-grid">
        <div class="card"><div class="card__head"><h2>${icon('i-download')} تصدير ونسخ احتياطي</h2></div><div class="card__body">
          <p class="muted small">نزّل نسخة JSON كاملة من بيانات المتجر الحالية.</p>
          <div class="row-actions" style="justify-content:flex-start;margin-top:12px;flex-wrap:wrap">
            <button class="btn btn--gold" id="exportBtn">${icon('i-download')} تصدير JSON</button>
            <button class="btn btn--ghost" id="seedBtn">${icon('i-download')} تنزيل data-seed.json</button>
          </div>
        </div></div>
        <div class="card"><div class="card__head"><h2>${icon('i-upload')} استيراد / استرجاع</h2></div><div class="card__body">
          <div class="note note--warn" style="margin-bottom:12px">${icon('i-alert')}<span>الاستيراد يستبدل البيانات الحالية في هذا المتصفح.</span></div>
          <label class="btn btn--ghost" style="cursor:pointer">${icon('i-upload')} استيراد JSON<input type="file" id="importInput" accept="application/json,.json" hidden></label>
          <button class="btn btn--soft-danger mt-14" id="resetBtn">${icon('i-refresh')} إعادة ضبط البيانات الافتراضية</button>
        </div></div>
        <div class="card span-2"><div class="card__head"><h2>${icon('i-database')} النشر لكل الزوار (استضافة ثابتة)</h2></div><div class="card__body">
          <div class="note" style="margin-bottom:14px">${icon('i-alert')}<span><b>مهم:</b> التعديلات في اللوحة تُحفظ محليًا (localStorage). ليشاهدها كل الزوار بعد الرفع، نزّل ملف <b>store-data.js محدث</b> واستبدل <code>assets/js/store-data.js</code> على الاستضافة ثم ارفع الملفات.</span></div>
          <button class="btn btn--gold" id="publishBtn">${icon('i-save')} تنزيل store-data.js محدث للنشر</button>
          <label class="field full mt-20"><span>معاينة JSON (للمراجعة/النسخ)</span><textarea id="jsonPreview" style="min-height:220px;direction:ltr;text-align:left;font-family:ui-monospace,monospace;font-size:12px"></textarea></label>
          <div class="row-actions" style="justify-content:flex-start"><button class="btn btn--ghost btn--sm" id="applyJsonBtn">${icon('i-check')} تطبيق JSON من المعاينة</button></div>
        </div></div>
      </div>`;
    const preview = $('#jsonPreview'); if (preview) preview.value = RT.exportJSON();
    $('#exportBtn').onclick=()=>downloadFile('rosetouch-export.json', RT.exportJSON(), 'application/json');
    $('#seedBtn').onclick=()=>{ downloadFile('data-seed.json', RT.exportJSON(), 'application/json'); toast('تم تنزيل data-seed.json','success'); };
    $('#importInput').onchange=async (e)=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; try{ RT.importJSON(await f.text()); toast('تم الاستيراد بنجاح','success'); renderNav(); renderView(); }catch(err){ alert('فشل الاستيراد: '+err.message); } e.target.value=''; };
    $('#resetBtn').onclick=()=>{ if(!confirm('سيتم إعادة جميع البيانات للحالة الافتراضية. هل أنت متأكد؟')) return; RT.reset(); toast('تمت إعادة الضبط','success'); renderNav(); renderView(); };
    $('#applyJsonBtn').onclick=()=>{ try{ RT.importJSON($('#jsonPreview').value); toast('تم تطبيق البيانات','success'); renderNav(); renderView(); }catch(err){ alert('JSON غير صالح: '+err.message); } };
    $('#publishBtn').onclick=async ()=>{
      try {
        const res = await fetch('../assets/js/store-data.js', {cache:'no-store'});
        let src = await res.text();
        const current = JSON.stringify(db());
        const inject = `  let cache = null;\n\n  function initialDB(){\n    try {\n      const raw = localStorage.getItem(KEY);\n      if (!raw) {\n        const fresh = normalize(${current});\n        try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch (e) { memoryDB = fresh; }\n        return fresh;\n      }\n      const parsed = JSON.parse(raw);\n      const before = parsed && parsed.settings ? parsed.settings.currency : null;\n      const data = normalize(parsed);\n      if (before != null && String(before) !== data.settings.currency) {\n        try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}\n      }\n      return data;\n    } catch (e) {\n      lastError = e.message;\n      if (memoryDB) return memoryDB;\n      memoryDB = normalize(${current});\n      return memoryDB;\n    }\n  }\n\n  function db() {\n    if (!cache) cache = initialDB();\n    return cache;\n  }\n`;
        const re = /  let cache = null;\n\n  function db\(\) \{\n    if \(!cache\) cache = load\(\);\n    return cache;\n  \}\n/;
        if (re.test(src)) src = src.replace(re, inject); else throw new Error('تعذر تحديث القالب تلقائياً');
        downloadFile('store-data.js', src, 'application/javascript');
        toast('تم تنزيل store-data.js محدث للنشر','success');
      } catch (err) {
        alert('تعذر إنشاء ملف store-data.js تلقائياً: ' + err.message + '\nيمكنك تنزيل JSON واستخدامه كتحديث يدوي.');
      }
    };
  }

  function downloadFile(name, content, type){
    const b=new Blob([content],{type:type||'application/octet-stream'});
    const u=URL.createObjectURL(b); const a=document.createElement('a');
    a.href=u; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(u),1500);
  }

  function closeSidebar(){ $('#sidebar')?.classList.remove('is-open'); $('#sidebarOverlay')?.classList.remove('is-open'); document.body.classList.remove('no-scroll'); }
  function openSidebar(){ $('#sidebar')?.classList.add('is-open'); $('#sidebarOverlay')?.classList.add('is-open'); document.body.classList.add('no-scroll'); }

  function boot(){
    showApp();
    $("#userName").textContent = RT.settings().adminUsername || 'admin';
    $("#userAvatar").textContent = (RT.settings().adminUsername || 'A').slice(0,1).toUpperCase();
    renderNav();
    setView(state.view);
  }

  // global bindings
  $("#menuBtn")?.addEventListener('click', openSidebar);
  $("#sidebarClose")?.addEventListener('click', closeSidebar);
  $("#sidebarOverlay")?.addEventListener('click', closeSidebar);
  $("#quickSaveBtn")?.addEventListener('click', ()=>{ RT.commit(); toast('تم الحفظ','success'); saveState(true); });
  $("#modalClose")?.addEventListener('click', closeModal);
  $("#modal")?.addEventListener('click', (e)=>{ if(e.target && e.target.hasAttribute('data-close-modal')) closeModal(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });

  bindAuth();
  if (isAuthed()) boot(); else showLogin();
})();
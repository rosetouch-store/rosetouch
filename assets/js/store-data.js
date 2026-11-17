/* ============================================================
   Rose Touch — طبقة البيانات المشتركة بين المتجر ولوحة التحكم
   تعمل بالكامل داخل المتصفح (localStorage) بدون أي تنصيب.
   ============================================================ */
(function (global) {
  'use strict';

  const KEY = 'rosetouch_db_v1';
  const VISITOR_KEY = 'rosetouch_visitor_id';
  const SESSION_KEY = 'rosetouch_session_id';
  const CART_KEY = 'rosetouch_cart_map';

  const CURRENCY_FALLBACK = '₪';

  // تحويل أي عملة قديمة محفوظة في المتصفح (مثل الريال) إلى الشيكل تلقائيًا
  function normalizeCurrency(value) {
    const c = String(value == null ? '' : value).trim();
    if (!c) return CURRENCY_FALLBACK;
    if (/^(ر\.?\s*س\.?|ريال(\s*سعودي)?|SAR|SR)$/i.test(c)) return CURRENCY_FALLBACK;
    return c;
  }

  /* ---------- توزيعات الشموع (طلبات حسب الطلب) ---------- */
  const FAVOR_MIN_QTY = 20;
  const FAVOR_LABEL_PRICE = 1;

  const FAVOR_SIZES = [
    { id: 'small', label: 'صغيرة · ٤٠ جم', price: 8 },
    { id: 'medium', label: 'متوسطة · ٨٠ جم', price: 11 },
    { id: 'large', label: 'كبيرة · ١٢٠ جم', price: 15 }
  ];

  const FAVOR_PACKAGING = [
    { id: 'kraft', label: 'علبة كرافت بسيطة', price: 1.5 },
    { id: 'organza', label: 'كيس أورجانزا مع شريط', price: 2 },
    { id: 'clear', label: 'علبة شفافة', price: 1 },
    { id: 'luxury', label: 'علبة فاخرة مع بطاقة', price: 4 }
  ];

  const FAVOR_COLORS = [
    { id: 'rose', label: 'وردي', hex: '#c47786' },
    { id: 'ivory', label: 'عاجي', hex: '#e9ddcc' },
    { id: 'amber', label: 'عنبري', hex: '#d0a35f' },
    { id: 'gold', label: 'ذهبي', hex: '#c9a227' },
    { id: 'sage', label: 'أخضر مريمي', hex: '#9fae90' },
    { id: 'lavender', label: 'لافندر', hex: '#ab94c6' }
  ];

  const FAVOR_EVENTS = ['عرس', 'خطوبة', 'عقيقة', 'تخرج', 'عيد ميلاد', 'مناسبة شركة', 'حفل خاص', 'أخرى'];
  const FAVOR_SCENTS = ['ورد', 'ياسمين', 'لافندر', 'عنبر', 'فانيلا', 'قرفة', 'ليمون', 'بدون رائحة'];

  const FAVOR_STATUS = {
    new: { label: 'جديد', color: '#c47786', bg: '#fbeaee' },
    contacted: { label: 'تم التواصل', color: '#a97614', bg: '#fbf1d9' },
    confirmed: { label: 'مؤكد', color: '#2f6f8f', bg: '#e4f0f6' },
    completed: { label: 'مكتمل', color: '#3f7a52', bg: '#e6f2e9' },
    cancelled: { label: 'ملغي', color: '#8a8a8a', bg: '#efefef' }
  };

  function favorSize(id) { return FAVOR_SIZES.find(s => s.id === id) || FAVOR_SIZES[1]; }
  function favorPackaging(id) { return FAVOR_PACKAGING.find(p => p.id === id) || FAVOR_PACKAGING[0]; }
  function favorColor(id) { return FAVOR_COLORS.find(c => c.id === id) || FAVOR_COLORS[0]; }
  function favorStatus(id) { return FAVOR_STATUS[id] || FAVOR_STATUS.new; }

  // تقدير سعر التوزيعات: الكمية × (سعر المقاس + سعر التغليف + بطاقة مخصصة إن وجدت)
  function favorEstimate(opts) {
    opts = opts || {};
    const qty = Math.max(0, Math.floor(Number(opts.quantity) || 0));
    const size = favorSize(opts.size);
    const pack = favorPackaging(opts.packaging);
    const perPiece = size.price + pack.price + (opts.labelText ? FAVOR_LABEL_PRICE : 0);
    return Math.round(qty * perPiece * 100) / 100;
  }

  /* ---------- لوحات ألوان فن الشموع ---------- */
  const palettes = {
    rose: { bg: ['#f9e7e8', '#eec6cb'], wax: '#f3d9d2', waxLight: '#fdf2ed', ink: '#7d3a49', accent: '#c47786', flame: '#ffbf6b', label: '#fffaf6' },
    blush: { bg: ['#fbeceb', '#f3d3d0'], wax: '#f7e4dd', waxLight: '#fff8f3', ink: '#8a4a4a', accent: '#d59a97', flame: '#ffc879', label: '#fffdfa' },
    amber: { bg: ['#f7e9d6', '#e6c9a0'], wax: '#f0d9b8', waxLight: '#fdf4e4', ink: '#7a4a1f', accent: '#c08c4c', flame: '#ffb352', label: '#fffaf0' },
    ivory: { bg: ['#f8f2e9', '#e9ddcc'], wax: '#f6ead7', waxLight: '#fffdf8', ink: '#7b6a52', accent: '#cbb79b', flame: '#ffc478', label: '#fffdf9' },
    sage: { bg: ['#eef1e8', '#cdd6c3'], wax: '#eae9d8', waxLight: '#fbfbf3', ink: '#54614a', accent: '#9fae90', flame: '#ffc471', label: '#fdfcf5' },
    charcoal: { bg: ['#efe6e4', '#cbb6b3'], wax: '#e5d7d2', waxLight: '#f8f1ec', ink: '#4a3a3c', accent: '#a98a86', flame: '#ffb45e', label: '#fffaf5' },
    lavender: { bg: ['#f1ecf7', '#d5c8e6'], wax: '#eee3f2', waxLight: '#fbf7fd', ink: '#5e4a76', accent: '#ab94c6', flame: '#ffc06a', label: '#fffcff' },
    citrus: { bg: ['#fbf0dc', '#f2d8a8'], wax: '#fbeacc', waxLight: '#fffaf0', ink: '#8a5a1f', accent: '#e2b35f', flame: '#ffb44f', label: '#fffdf7' },
    fig: { bg: ['#f0e8e1', '#d3bda9'], wax: '#e9d8c6', waxLight: '#fbf4ec', ink: '#5b4536', accent: '#a97d5f', flame: '#ffbe67', label: '#fffcf7' },
    pearl: { bg: ['#f6f1ee', '#e3d9d5'], wax: '#f4ece7', waxLight: '#fffdfc', ink: '#6b5b57', accent: '#c9b8b1', flame: '#ffc87d', label: '#fffefd' },
    terracotta: { bg: ['#f8e8dc', '#e7c3ab'], wax: '#f1d9c4', waxLight: '#fdf3e9', ink: '#7c4a30', accent: '#c8825c', flame: '#ffb45c', label: '#fffbf6' },
    wood: { bg: ['#f1e8de', '#d9c3ac'], wax: '#eeddc8', waxLight: '#fcf6ee', ink: '#6a4a32', accent: '#b3885f', flame: '#ffbd66', label: '#fffcf8' },
    gold: { bg: ['#f7edda', '#e6d0a4'], wax: '#f3e2c1', waxLight: '#fefaf0', ink: '#7a5a22', accent: '#ccaa60', flame: '#ffb454', label: '#fffdf6' }
  };

  const paletteKeys = Object.keys(palettes);

  /* ---------- أدوات مساعدة ---------- */
  function hash(str) {
    let h = 2166136261;
    str = String(str || 'rose');
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function todayISO(offsetDays) {
    const d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    return d.toISOString();
  }

  /* ---------- توليد صور الشموع (SVG محلي يعمل بلا إنترنت) ---------- */
  function candleArt(paletteKey, seedText) {
    const p = palettes[paletteKey] || palettes.rose;
    const rnd = rng(hash(seedText || paletteKey));
    const variant = Math.floor(rnd() * 3);
    const petalCount = 5 + Math.floor(rnd() * 5);
    const arch = rnd() > 0.45;

    let petals = '';
    for (let i = 0; i < petalCount; i++) {
      const x = 60 + rnd() * 480;
      const y = 620 + rnd() * 80;
      const r = -40 + rnd() * 80;
      const s = 0.6 + rnd() * 0.9;
      petals += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(24 * s).toFixed(0)}" ry="${(10 * s).toFixed(0)}" fill="${p.accent}" opacity="${(0.25 + rnd() * 0.35).toFixed(2)}" transform="rotate(${r.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
    }

    const backCandles = variant === 0 ? '' : `
      <g opacity=".92">
        <rect x="118" y="360" width="54" height="272" rx="16" fill="${p.wax}"/>
        <rect x="424" y="395" width="54" height="237" rx="16" fill="${p.wax}"/>
        <ellipse cx="145" cy="360" rx="27" ry="9" fill="${p.waxLight}"/>
        <ellipse cx="451" cy="395" rx="27" ry="9" fill="${p.waxLight}"/>
        <line x1="145" y1="360" x2="145" y2="341" stroke="#3c2a26" stroke-width="3" stroke-linecap="round"/>
        <line x1="451" y1="395" x2="451" y2="376" stroke="#3c2a26" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="145" cy="322" rx="16" ry="26" fill="url(#flame)" opacity=".85"/>
        <ellipse cx="451" cy="357" rx="13" ry="21" fill="url(#flame)" opacity=".8"/>
        <ellipse cx="145" cy="324" rx="6" ry="11" fill="#fff6d8"/>
        <ellipse cx="451" cy="359" rx="5" ry="9" fill="#fff6d8"/>
      </g>`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="600" height="750" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.45" r="0.5">
      <stop offset="0" stop-color="${p.flame}" stop-opacity=".5"/>
      <stop offset=".5" stop-color="${p.flame}" stop-opacity=".14"/>
      <stop offset="1" stop-color="${p.flame}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wax" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.waxLight}"/><stop offset="1" stop-color="${p.wax}"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".6"/>
      <stop offset=".18" stop-color="#ffffff" stop-opacity=".08"/>
      <stop offset=".5" stop-color="#ffffff" stop-opacity=".04"/>
      <stop offset=".84" stop-color="#ffffff" stop-opacity=".16"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity=".5"/>
    </linearGradient>
    <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff6cf"/><stop offset=".45" stop-color="${p.flame}"/><stop offset="1" stop-color="#e8703a"/>
    </linearGradient>
    <filter id="blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="26"/></filter>
    <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>

  <rect width="600" height="750" fill="url(#bg)"/>
  ${arch ? `<path d="M120 700V330a180 180 0 0 1 360 0v370Z" fill="#ffffff" opacity=".3"/>` : `<circle cx="300" cy="340" r="225" fill="#ffffff" opacity=".28"/>`}
  <ellipse cx="300" cy="352" rx="230" ry="250" fill="url(#halo)"/>
  ${backCandles}
  <ellipse cx="300" cy="652" rx="180" ry="26" fill="${p.ink}" opacity=".10" filter="url(#shadow)"/>

  <g>
    <rect x="212" y="392" width="176" height="262" rx="24" fill="url(#glass)" stroke="#ffffff" stroke-opacity=".7" stroke-width="2"/>
    <rect x="222" y="404" width="156" height="238" rx="18" fill="url(#wax)"/>
    <ellipse cx="300" cy="412" rx="78" ry="13" fill="${p.waxLight}"/>
    <ellipse cx="300" cy="412" rx="78" ry="13" fill="none" stroke="${p.ink}" stroke-opacity=".12"/>
    <line x1="300" y1="410" x2="300" y2="386" stroke="#3c2a26" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="300" cy="360" rx="26" ry="42" fill="url(#flame)"/>
    <ellipse cx="300" cy="366" rx="11" ry="20" fill="#fff8dd" opacity=".9"/>
    <ellipse cx="300" cy="404" rx="54" ry="12" fill="${p.flame}" opacity=".22" filter="url(#blur)"/>

    <rect x="232" y="470" width="136" height="112" rx="8" fill="${p.label}" opacity=".94"/>
    <rect x="232" y="470" width="136" height="112" rx="8" fill="none" stroke="${p.ink}" stroke-opacity=".14"/>
    <text x="300" y="512" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="17" letter-spacing="4.5" fill="${p.ink}">ROSE TOUCH</text>
    <line x1="266" y1="527" x2="334" y2="527" stroke="${p.accent}" stroke-width="1.4"/>
    <text x="300" y="550" text-anchor="middle" font-family="Georgia,serif" font-size="10" letter-spacing="3.2" fill="${p.ink}" opacity=".62">HAND POURED</text>
    <text x="300" y="569" text-anchor="middle" font-family="Georgia,serif" font-size="9" letter-spacing="2.4" fill="${p.accent}">SOY WAX · 220G</text>
  </g>

  <rect x="238" y="398" width="10" height="210" rx="5" fill="#ffffff" opacity=".38"/>
  ${petals}
</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function productImage(product) {
    if (!product) return candleArt('rose', 'fallback');
    if (product.image && /^(https?:|data:image)/.test(product.image)) return product.image;
    return candleArt(product.palette, product.id || product.name);
  }

  /* ---------- البيانات الافتراضية ---------- */
  function seed() {
    const cats = [
      { id: 'c1', name: 'شموع معطّرة', slug: 'scented', desc: 'شموع صويا بزيوت عطرية فاخرة', palette: 'rose' },
      { id: 'c2', name: 'شموع ديكور', slug: 'decor', desc: 'قطع فنية تزيّن المساحات', palette: 'ivory' },
      { id: 'c3', name: 'مجموعات هدايا', slug: 'gifts', desc: 'علب هدايا جاهزة بتغليف أنيق', palette: 'gold' },
      { id: 'c4', name: 'إكسسوارات', slug: 'accessories', desc: 'قواعد، فتائل، وأدوات العناية', palette: 'wood' }
    ];

    const P = (id, name, en, category, price, compareAt, stock, palette, scent, notes, desc, flags) => Object.assign({
      id, name, en, category, price, compareAt: compareAt || 0, stock, palette,
      scent, notes, desc, sku: 'RT-' + id.replace('p', ''),
      weight: '220 جم', burnTime: '45–55 ساعة', image: '', active: true,
      featured: false, bestseller: false, createdAt: todayISO(-40)
    }, flags || {});

    const products = [
      P('p1', 'شمعة ورد دمشقي', 'Rose Damask', 'c1', 145, 175, 24, 'rose',
        'ورد دمشقي، عنبر، مسك أبيض',
        ['ورد', 'عنبر', 'مسك'],
        'شمعة صويا مصبوبة يدويًا برائحة الورد الدمشقي الأصيل، تملأ الغرفة بدفء ناعم يدوم لساعات.',
        { featured: true, bestseller: true }),
      P('p2', 'شمعة العنبر الذهبي', 'Amber Noir', 'c1', 165, 0, 16, 'amber',
        'عنبر، بخور، أخشاب دافئة',
        ['عنبر', 'بخور', 'خشب'],
        'مزيج شرقي غامق من العنبر والبخور، مثالي لأمسيات الشتاء والإضاءة الخافتة.',
        { featured: true }),
      P('p3', 'شمعة الفانيلا واللوز', 'Vanilla Almond', 'c1', 120, 0, 38, 'ivory',
        'فانيلا بوربون، لوز محمص، كراميل',
        ['فانيلا', 'لوز', 'كراميل'],
        'حلوى دافئة في كوب زجاجي: فانيلا كريمية مع لمسة لوز محمّص.',
        { bestseller: true }),
      P('p4', 'شمعة الياسمين الليلي', 'Night Jasmine', 'c1', 135, 0, 9, 'sage',
        'ياسمين، أوراق خضراء، مسك',
        ['ياسمين', 'أخضر', 'مسك'],
        'ياسمين ليلي منعش مع نفحة خضراء، يمنح هدوءًا فوريًا للمساء.',
        {}),
      P('p5', 'شمعة الفانيلا المدخّنة', 'Smoked Vanilla', 'c1', 155, 0, 3, 'charcoal',
        'فانيلا مدخّنة، تبغ، خشب الصندل',
        ['فانيلا', 'تبغ', 'صندل'],
        'فانيلا غنية مع دخان خفيف وخشب صندل — رائحة جريئة وأنيقة.',
        { featured: true }),
      P('p6', 'شمعة زهر البرتقال', 'Neroli Blossom', 'c1', 130, 150, 21, 'citrus',
        'زهر البرتقال، برغموت، عسل',
        ['حمضيات', 'زهر', 'عسل'],
        'انتعاش الحمضيات مع حلاوة العسل، مناسب للمطبخ والصباحات.',
        {}),
      P('p7', 'طقم الهدايا الثلاثي', 'Trio Gift Set', 'c3', 320, 390, 12, 'blush',
        'ورد، عنبر، فانيلا',
        ['ورد', 'عنبر', 'فانيلا'],
        'ثلاث شموع صغيرة في علبة هدايا فاخرة مع بطاقة إهداء مخصصة.',
        { featured: true, bestseller: true }),
      P('p8', 'شمعة اللافندر الهادئ', 'Lavender Calm', 'c1', 125, 0, 30, 'lavender',
        'لافندر، بابونج، خشب أبيض',
        ['لافندر', 'بابونج', 'خشب'],
        'لافندر فرنسي مع بابونج مهدئ، رفيق مثالي قبل النوم.',
        {}),
      P('p9', 'شمعة التين البري', 'Wild Fig', 'c1', 150, 0, 14, 'fig',
        'تين، ورق التين، حليب جوز الهند',
        ['تين', 'أخضر', 'جوز الهند'],
        'تين ناضج مع أوراق خضراء وحلاوة جوز الهند — عطر عصري مميز.',
        { featured: true }),
      P('p10', 'شمعة المسك الأبيض', 'White Musk', 'c1', 140, 0, 18, 'pearl',
        'مسك أبيض، قطن، زهر البرتقال',
        ['مسك', 'قطن', 'زهر'],
        'نظافة ونعومة في عطر واحد: مسك أبيض نقي مع لمسة قطنية.',
        {}),
      P('p11', 'شمعة القرفة والبرتقال', 'Spiced Orange', 'c1', 128, 0, 0, 'terracotta',
        'قرفة، برتقال، قرنفل',
        ['قرفة', 'برتقال', 'توابل'],
        'دفء الأعياد: قرفة وقرنفل مع برتقال طازج. إصدار موسمي محدود.',
        {}),
      P('p12', 'شمعة خشب الصندل', 'Sandalwood', 'c1', 160, 0, 11, 'wood',
        'خشب الصندل، فيتيفر، كاكاو',
        ['صندل', 'كاكاو', 'خشب'],
        'خشب صندل كريمي مع كاكاو خفيف — فخامة هادئة تدوم.',
        {}),
      P('p13', 'شمعة ديكور «الوردة»', 'Rose Sculpture', 'c2', 210, 0, 7, 'blush',
        'بدون عطر',
        ['ديكور'],
        'شمعة نحتية على شكل وردة، قطعة فنية للطاولات وخزائن العرض.',
        { featured: true }),
      P('p14', 'شمعة ديكور «العمود»', 'Pillar Candle', 'c2', 95, 0, 26, 'ivory',
        'فانيلا خفيفة',
        ['ديكور', 'فانيلا'],
        'شمعة عمود أسطوانية بلمسة مات، تناسب طاولات السفرة والمناسبات.',
        {}),
      P('p15', 'قاعدة شمعة نحاسية', 'Brass Holder', 'c4', 75, 0, 34, 'gold',
        '—',
        ['إكسسوار'],
        'قاعدة نحاسية مصقولة تناسب الشموع العمودية والقصيرة.',
        {}),
      P('p16', 'طقم الشتاء الدافئ', 'Warm Winter Set', 'c3', 285, 340, 5, 'amber',
        'عنبر، قرفة، فانيلا',
        ['عنبر', 'قرفة', 'فانيلا'],
        'شمعتان كبيرتان + شمعة صغيرة في علبة كرافت مع أعواد ثقاب.',
        {})
    ];

    const mirror = Object.fromEntries(products.map(p => [p.id, p]));
    const item = (id, qty) => ({
      productId: id, name: mirror[id].name, price: mirror[id].price,
      qty, palette: mirror[id].palette, image: ''
    });

    const customer = (name, phone, city, address) => ({
      name, phone, city, address, notes: ''
    });

    const mkOrder = (num, status, daysAgo, cust, items, extra) => {
      const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
      const ship = sub >= 250 ? 0 : 25;
      return Object.assign({
        id: 'o' + num, number: 'RT-' + num, customer: cust, items,
        subtotal: sub, shipping: ship, discount: 0, total: sub + ship,
        payment: 'الدفع عند الاستلام', status,
        createdAt: todayISO(-daysAgo), updatedAt: todayISO(-daysAgo),
        note: ''
      }, extra || {});
    };

    const orders = [
      mkOrder(1042, 'completed', 22, customer('رهف شاهين', '0599 123 456', 'نابلس', 'حي رفيديا، شارع 12'), [item('p1', 2), item('p8', 1)]),
      mkOrder(1043, 'completed', 19, customer('مريم قاسم', '0598 765 432', 'رام الله', 'حي الطيرة، بناء 4'), [item('p7', 1)]),
      mkOrder(1044, 'completed', 16, customer('أحمد جبارين', '0592 334 455', 'جنين', 'حي الزهراء'), [item('p2', 1), item('p15', 2)]),
      mkOrder(1045, 'shipped', 11, customer('دينا خليل', '0567 778 899', 'نابلس', 'حي المخفية'), [item('p3', 3)]),
      mkOrder(1046, 'shipped', 8, customer('هبة سليمان', '0541 112 233', 'طولكرم', 'حي الشويكة'), [item('p13', 1), item('p10', 1)]),
      mkOrder(1047, 'processing', 5, customer('سلمى دراغمة', '0593 222 334', 'طوباس', 'حي العزيزية'), [item('p5', 2), item('p9', 1)]),
      mkOrder(1048, 'processing', 3, customer('معاذ عودة', '0598 887 766', 'نابلس', 'حي عصيرة'), [item('p16', 1)]),
      mkOrder(1049, 'new', 2, customer('لجين حمدان', '0595 666 778', 'الخليل', 'حي عين سارة'), [item('p1', 1), item('p6', 1)]),
      mkOrder(1050, 'new', 1, customer('يوسف أبو زيد', '0590 998 877', 'بيت لحم', 'حي المهد'), [item('p12', 2)]),
      mkOrder(1051, 'new', 0, customer('رنا عمرو', '0594 555 677', 'نابلس', 'حي بلاطة'), [item('p4', 1), item('p14', 2)]),
      mkOrder(1039, 'cancelled', 26, customer('خالد ياسين', '0591 113 344', 'القدس', 'حي الطور'), [item('p3', 1)], { note: 'تم الإلغاء بطلب من العميل' }),
      mkOrder(1040, 'completed', 25, customer('أمل زهران', '0597 776 655', 'نابلس', 'حي حوارة'), [item('p7', 2), item('p10', 2)])
    ];

    const carts = [
      { id: 'c_ab1', visitorId: 'v3', items: [item('p5', 1), item('p8', 1)], state: 'checkout', phone: '0599 123 090', createdAt: todayISO(-0.6), updatedAt: todayISO(-0.4) },
      { id: 'c_ab2', visitorId: 'v5', items: [item('p7', 1)], state: 'active', phone: '', createdAt: todayISO(-1.2), updatedAt: todayISO(-0.9) },
      { id: 'c_ab3', visitorId: 'v8', items: [item('p13', 1), item('p15', 1)], state: 'checkout', phone: '0565 551 122', createdAt: todayISO(-2.3), updatedAt: todayISO(-2.1) },
      { id: 'c_ab4', visitorId: 'v11', items: [item('p1', 1), item('p3', 1), item('p6', 1)], state: 'active', phone: '', createdAt: todayISO(-3.4), updatedAt: todayISO(-3.2) }
    ];

    const devices = ['desktop', 'mobile', 'mobile', 'mobile', 'tablet'];
    const sources = ['direct', 'instagram', 'instagram', 'google', 'snapchat', 'tiktok', 'direct', 'twitter'];
    const pagesPool = ['/', '/#products', '/#about', '/#contact', '/#products?cat=c3'];
    const visitors = [];
    for (let i = 0; i < 26; i++) {
      const r = rng(hash('visitor' + i));
      const days = Math.floor(r() * 21);
      const vcat = products[Math.floor(r() * products.length)];
      const vcat2 = products[Math.floor(r() * products.length)];
      const seen = 1 + Math.floor(r() * 9);
      const converted = i % 7 === 0;
      visitors.push({
        id: 'v' + i,
        firstSeen: todayISO(-days - 1),
        lastSeen: todayISO(-days + (r() * 0.6)),
        visits: seen,
        device: devices[Math.floor(r() * devices.length)],
        source: sources[Math.floor(r() * sources.length)],
        pages: pagesPool.slice(0, 1 + Math.floor(r() * pagesPool.length)),
        interests: {
          categories: { [vcat.category]: 1 + Math.floor(r() * 4), [vcat2.category]: 1 + Math.floor(r() * 2) },
          products: { [vcat.id]: 1 + Math.floor(r() * 5), [vcat2.id]: 1 + Math.floor(r() * 3) },
          searches: r() > 0.6 ? ['شمعة ورد', 'هدية'] : [],
          favorites: r() > 0.7 ? [vcat.id] : [],
          maxPrice: Math.round((80 + r() * 220) / 5) * 5
        },
        orders: converted ? 1 : 0,
        revenue: converted ? 145 + Math.floor(r() * 200) : 0
      });
    }

    const messages = [
      { id: 'm1', name: 'شهد العلي', phone: '0599 123 090', message: 'هل تتوفر خدمة تغليف هدايا مع بطاقة إهداء؟ أرغب بطلب طقم الشتاء كهدية.', createdAt: todayISO(-1.5), read: false },
      { id: 'm2', name: 'محمد باحمد', phone: '0598 445 566', message: 'أبحث عن شموع بكميات كبيرة لمناسبة زفاف، هل لديكم أسعار جملة؟', createdAt: todayISO(-4), read: true },
      { id: 'm3', name: 'هيا المالكي', phone: '0569 882 211', message: 'شمعة الورد الدمشقي رائعة! متى يعود توفر شمعة القرفة والبرتقال؟', createdAt: todayISO(-6), read: true }
    ];

    const favors = [
      {
        id: 'fv1', number: 'FT-1001', name: 'لينا أبو صالح', phone: '0599 456 789',
        event: 'عرس', quantity: 120, size: 'small', scents: ['ورد', 'ياسمين'],
        packaging: 'organza', color: 'rose', labelText: 'ليان & أحمد',
        city: 'نابلس', neededBy: todayISO(19).slice(0, 10),
        notes: 'توزيعات حفل زفاف مع بطاقة شكر صغيرة.',
        estimate: favorEstimate({ quantity: 120, size: 'small', packaging: 'organza', labelText: 'ليان & أحمد' }),
        status: 'contacted', createdAt: todayISO(-4), updatedAt: todayISO(-2)
      },
      {
        id: 'fv2', number: 'FT-1002', name: 'سائد دراغمة', phone: '0598 223 344',
        event: 'عقيقة', quantity: 60, size: 'medium', scents: ['فانيلا', 'عنبر'],
        packaging: 'kraft', color: 'ivory', labelText: 'عقيقة يوسف',
        city: 'طوباس', neededBy: todayISO(30).slice(0, 10),
        notes: 'يفضّل التسليم قبل المناسبة بأسبوع.',
        estimate: favorEstimate({ quantity: 60, size: 'medium', packaging: 'kraft', labelText: 'عقيقة يوسف' }),
        status: 'new', createdAt: todayISO(-1), updatedAt: todayISO(-1)
      }
    ];

    return {
      version: 1,
      settings: {
        storeName: 'Rose Touch',
        storeNameAr: 'روز تاتش',
        tagline: 'شموع صويا مصبوبة يدويًا',
        announcement: 'للطلب والاستفسار: 0593979592 · توصيل مجاني للطلبات فوق ٢٥٠ ₪',
        marqueeText: 'شمع صويا ١٠٠٪ | صناعة يدوية بكميات صغيرة | توصيل لكل مدن فلسطين | تغليف هدايا مجاني | خالٍ من السموم',
        heroBadge: 'صناعة يدوية · شموع صويا ١٠٠٪',
        heroTitle: 'أضئي لحظاتك',
        heroAccent: 'برائحة الورد',
        heroText: 'شموع فاخرة مصبوبة يدويًا من شمع الصويا الطبيعي وزيوت عطرية مختارة، لتمنح منزلك دفئًا وأناقة تدوم.',
        heroCta: 'تسوّقي الآن',
        aboutTitle: 'قصة روز تاتش',
        aboutText: 'بدأت روز تاتش من نابلس، من شغف كبير بالروائح وصناعة الشموع. نختار كل زيت عطري بعناية، ونصبّ كل شمعة يدويًا على دفعات صغيرة، لنمنحك قطعة فريدة تحمل أثرًا دافئًا في يومك، ونوصلها لكل مدن فلسطين.',
        stat1: 'شموع مصبوبة',
        stat2: 'عميل سعيد',
        stat3: 'تقييم العملاء',
        stat4: 'ساعة احتراق',
        currency: '₪',
        shippingCost: 25,
        freeShipping: 250,
        phone: '+972593979592',
        whatsapp: '972593979592',
        address: 'فلسطين، نابلس',
        instagram: '@rosetouch.ps',
        workingHours: 'السبت – الخميس · 10 صباحًا – 8 مساءً',
        adminUsername: 'admin',
        adminPassword: 'admin123',
        sheetsApiUrl: 'https://script.google.com/macros/s/AKfycbzj25Y35cBvMD5xPppM45VY9ephLWpxnh8LjvV3CGAR6cdaBcv8QQiJTo7rthrwMnQvEw/exec',
        sheetsSheetUrl: '',
        loyalty: { enabled: true, pointsRate: 10, pointValue: 0.1, hiddenPhones: [] },
        deliveryAreas: [
          { name: 'نابلس', fee: 25, enabled: true, note: '' },
          { name: 'رام الله', fee: 30, enabled: true, note: '' },
          { name: 'جنين', fee: 30, enabled: true, note: '' },
          { name: 'طولكرم', fee: 30, enabled: true, note: '' },
          { name: 'قلقيلية', fee: 30, enabled: true, note: '' },
          { name: 'سلفيت', fee: 30, enabled: true, note: '' },
          { name: 'طوباس', fee: 35, enabled: true, note: '' },
          { name: 'أريحا', fee: 40, enabled: true, note: '' },
          { name: 'بيت لحم', fee: 35, enabled: true, note: '' },
          { name: 'الخليل', fee: 35, enabled: true, note: '' },
          { name: 'القدس (الضفة)', fee: 35, enabled: true, note: '' }
        ]
      },
      categories: cats,
      products,
      orders,
      carts,
      visitors,
      messages,
      favors,
      loyaltyMembers: [
        { id: 'lm1', name: 'رهف شاهين', phone: '0599123456', points: 52, orders: 1, spent: 520, level: 'فضي', updatedAt: todayISO(-22) },
        { id: 'lm2', name: 'مريم قاسم', phone: '0598765432', points: 32, orders: 1, spent: 320, level: 'برونزي', updatedAt: todayISO(-19) },
        { id: 'lm3', name: 'أمل زهران', phone: '0597776655', points: 94, orders: 1, spent: 940, level: 'ذهبي', updatedAt: todayISO(-25) }
      ],
      events: []
    };
  }

  /* ---------- الخزن ---------- */
  let memoryDB = null;
  let lastError = '';

  function normalize(db) {
    if (!db || typeof db !== 'object') return seed();
    const fresh = seed();
    db.settings = Object.assign(fresh.settings, db.settings || {});
    db.settings.currency = normalizeCurrency(db.settings.currency);
    if (!db.settings.loyalty || typeof db.settings.loyalty !== 'object') db.settings.loyalty = Object.assign({}, fresh.settings.loyalty);
    db.settings.loyalty = Object.assign({}, fresh.settings.loyalty, db.settings.loyalty);
    if (!Array.isArray(db.settings.deliveryAreas) || !db.settings.deliveryAreas.length) db.settings.deliveryAreas = fresh.settings.deliveryAreas.slice();
    ['categories', 'products', 'orders', 'carts', 'visitors', 'messages', 'favors', 'events', 'loyaltyMembers'].forEach(k => {
      if (!Array.isArray(db[k])) db[k] = (Array.isArray(fresh[k]) ? fresh[k].slice() : []);
    });
    return db;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const fresh = seed();
        try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch (e) { memoryDB = fresh; }
        return fresh;
      }
      const parsed = JSON.parse(raw);
      const before = parsed && parsed.settings ? parsed.settings.currency : null;
      const data = normalize(parsed);
      if (before != null && String(before) !== data.settings.currency) {
        try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
      }
      return data;
    } catch (e) {
      lastError = e.message;
      if (memoryDB) return memoryDB;
      memoryDB = seed();
      return memoryDB;
    }
  }

  let cache = null;

  function db() {
    if (!cache) cache = load();
    return cache;
  }

  function commit(broadcast) {
    const data = db();
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      lastError = '';
    } catch (e) {
      lastError = e && e.name === 'QuotaExceededError'
        ? 'مساحة التخزين ممتلئة. استخدمي روابط صور بدل الملفات المرفوعة أو احذفي صورًا قديمة.'
        : ('تعذّر حفظ البيانات: ' + e.message);
    }
    try {
      window.dispatchEvent(new CustomEvent('rosetouch:change', { detail: { source: 'self' } }));
    } catch (e) { /* ignore */ }
    return lastError;
  }

  function replace(next) {
    cache = normalize(next);
    commit();
    return cache;
  }

  function reset() {
    cache = seed();
    commit();
    return cache;
  }

  function storageError() { return lastError; }

  function exportJSON() {
    const data = JSON.parse(JSON.stringify(db()));
    data.exportedAt = new Date().toISOString();
    return JSON.stringify(data, null, 2);
  }

  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.products)) throw new Error('الملف لا يحتوي على بيانات متجر صالحة');
    cache = normalize(parsed);
    commit();
    return cache;
  }

  /* ---------- إعدادات ومساعدات عرض ---------- */
  function settings() { return db().settings; }
  function currency() { return normalizeCurrency(settings().currency); }

  function money(n) {
    const v = Number(n) || 0;
    const rounded = Math.round(v * 100) / 100;
    return rounded.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + currency();
  }

  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  function fmtDate(iso, withTime) {
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    let out = d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    if (withTime) {
      const h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      out += ' · ' + (h % 12 === 0 ? 12 : h % 12) + ':' + m + ' ' + (h < 12 ? 'ص' : 'م');
    }
    return out;
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    if (isNaN(diff)) return '—';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return 'منذ ' + mins + ' دقيقة';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return 'منذ ' + hrs + ' ساعة';
    const days = Math.floor(hrs / 24);
    if (days < 30) return 'منذ ' + days + ' يوم';
    return fmtDate(iso);
  }

  const ORDER_STATUS = {
    new: { label: 'جديد', color: '#c47786', bg: '#fbeaee' },
    processing: { label: 'قيد التجهيز', color: '#a97614', bg: '#fbf1d9' },
    shipped: { label: 'تم الشحن', color: '#2f6f8f', bg: '#e4f0f6' },
    completed: { label: 'مكتمل', color: '#3f7a52', bg: '#e6f2e9' },
    cancelled: { label: 'ملغي', color: '#8a8a8a', bg: '#efefef' }
  };

  const SOURCE_LABELS = {
    direct: 'مباشر', instagram: 'إنستغرام', google: 'جوجل',
    snapchat: 'سناب شات', tiktok: 'تيك توك', twitter: 'تويتر / X',
    whatsapp: 'واتساب', other: 'أخرى'
  };

  const DEVICE_LABELS = { mobile: 'جوال', desktop: 'سطح المكتب', tablet: 'تابلت' };

  function categoryName(id) {
    const c = db().categories.find(x => x.id === id);
    return c ? c.name : 'غير مصنّف';
  }

  /* ---------- السلة ---------- */
  function getVisitorId() {
    try {
      let id = localStorage.getItem(VISITOR_KEY);
      if (!id) {
        id = uid('v');
        localStorage.setItem(VISITOR_KEY, id);
        const d = db();
        d.visitors.push({
          id, firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(),
          visits: 1, device: detectDevice(), source: detectSource(), pages: [],
          interests: { categories: {}, products: {}, searches: [], favorites: [], maxPrice: 0 },
          orders: 0, revenue: 0, sessionStart: new Date().toISOString()
        });
        commit();
      }
      return id;
    } catch (e) {
      return 'v_local';
    }
  }

  function getSessionId() {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = uid('s');
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch (e) { return 's_local'; }
  }

  function detectDevice() {
    const ua = navigator.userAgent || '';
    if (/iPad|Tablet/i.test(ua)) return 'tablet';
    if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function detectSource() {
    const ref = (document.referrer || '').toLowerCase();
    if (!ref) return 'direct';
    if (ref.includes('instagram')) return 'instagram';
    if (ref.includes('tiktok')) return 'tiktok';
    if (ref.includes('snapchat')) return 'snapchat';
    if (ref.includes('t.co') || ref.includes('twitter') || ref.includes('x.com')) return 'twitter';
    if (ref.includes('whatsapp')) return 'whatsapp';
    if (ref.includes('google')) return 'google';
    return 'other';
  }

  function visitor() {
    const id = getVisitorId();
    return db().visitors.find(v => v.id === id) || null;
  }

  function touchVisitor(patch) {
    const d = db();
    const id = getVisitorId();
    let v = d.visitors.find(x => x.id === id);
    if (!v) {
      v = {
        id, firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(),
        visits: 1, device: detectDevice(), source: detectSource(), pages: [],
        interests: { categories: {}, products: {}, searches: [], favorites: [], maxPrice: 0 },
        orders: 0, revenue: 0
      };
      d.visitors.push(v);
    }
    v.lastSeen = new Date().toISOString();
    if (patch) patch(v);
    commit();
    return v;
  }

  function track(type, payload) {
    payload = payload || {};
    try {
      const d = db();
      const id = getVisitorId();
      const v = d.visitors.find(x => x.id === id);
      if (!v) return;
      v.lastSeen = new Date().toISOString();
      if (v.lastVisitDate !== new Date().toDateString()) {
        v.visits = (v.visits || 1) + 1;
        v.lastVisitDate = new Date().toDateString();
      }
      const ints = v.interests || (v.interests = { categories: {}, products: {}, searches: [], favorites: [], maxPrice: 0 });
      ints.categories = ints.categories || {};
      ints.products = ints.products || {};
      ints.searches = ints.searches || [];
      ints.favorites = ints.favorites || [];

      if (type === 'page') {
        const page = payload.page || '/';
        v.pages = v.pages || [];
        if (!v.pages.includes(page)) v.pages.push(page);
        if (v.pages.length > 12) v.pages.shift();
      } else if (type === 'product_view' && payload.productId) {
        ints.products[payload.productId] = (ints.products[payload.productId] || 0) + 1;
        const prod = d.products.find(p => p.id === payload.productId);
        if (prod) {
          ints.categories[prod.category] = (ints.categories[prod.category] || 0) + 1;
          ints.maxPrice = Math.max(ints.maxPrice || 0, prod.price);
        }
      } else if (type === 'category_view' && payload.categoryId) {
        ints.categories[payload.categoryId] = (ints.categories[payload.categoryId] || 0) + 1;
      } else if (type === 'search' && payload.q) {
        const q = String(payload.q).trim();
        if (q && !ints.searches.includes(q)) ints.searches.unshift(q);
        ints.searches = ints.searches.slice(0, 8);
      } else if (type === 'favorite' && payload.productId) {
        if (!ints.favorites.includes(payload.productId)) ints.favorites.push(payload.productId);
      } else if (type === 'unfavorite' && payload.productId) {
        ints.favorites = ints.favorites.filter(x => x !== payload.productId);
      } else if (type === 'purchase') {
        v.orders = (v.orders || 0) + 1;
        v.revenue = (v.revenue || 0) + (payload.total || 0);
      }

      d.events.push({ t: new Date().toISOString(), type, data: payload, visitorId: id });
      if (d.events.length > 600) d.events.splice(0, d.events.length - 600);
      commit();
    } catch (e) { /* التحليلات لا يجب أن تعطل المتجر */ }
  }

  function activeCart(create) {
    const d = db();
    const vid = getVisitorId();
    let cart = d.carts.find(c => c.visitorId === vid && c.state !== 'converted');
    if (!cart && create) {
      cart = { id: uid('c'), visitorId: vid, items: [], state: 'active', phone: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      d.carts.push(cart);
    }
    return cart || null;
  }

  function deliveryAreas() {
    const s = settings();
    const arr = Array.isArray(s.deliveryAreas) ? s.deliveryAreas.filter(a => a && a.name) : [];
    return arr.length ? arr : [{ name: 'نابلس', fee: Number(s.shippingCost) || 25, enabled: true, note: '' }];
  }
  function selectedDeliveryAreaName(cart) {
    if (cart && cart.deliveryArea) return String(cart.deliveryArea);
    try {
      const saved = JSON.parse(localStorage.getItem('rosetouch_checkout') || '{}');
      return saved.deliveryArea || saved.city || '';
    } catch (e) { return ''; }
  }
  function resolveDeliveryFee(areaName, subtotal) {
    const s = settings();
    const sub = Number(subtotal) || 0;
    const free = Number(s.freeShipping) || 0;
    if (sub === 0 || (free && sub >= free)) return 0;
    const name = String(areaName || '').trim();
    const areas = deliveryAreas();
    if (name) {
      const area = areas.find(a => String(a.name || '').trim() === name && a.enabled !== false);
      if (area) return Number(area.fee) || 0;
    }
    const first = areas.find(a => a.enabled !== false);
    if (first) return Number(first.fee) || 0;
    return Number(s.shippingCost) || 0;
  }
  function cartTotals(cart, areaName) {
    if (!cart) cart = activeCart(false);
    const items = (cart && cart.items) || [];
    const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
    const ship = resolveDeliveryFee(areaName != null ? areaName : selectedDeliveryAreaName(cart), subtotal);
    return { count: items.reduce((s, i) => s + (Number(i.qty) || 0), 0), subtotal, shipping: ship, total: subtotal + ship };
  }

  function addToCart(productId, qty) {
    const d = db();
    const product = d.products.find(p => p.id === productId);
    if (!product) return activeCart(true);
    qty = Math.max(1, Number(qty) || 1);
    const cart = activeCart(true);
    const line = cart.items.find(i => i.productId === productId);
    const max = Math.max(0, Number(product.stock) || 0);
    if (line) {
      line.qty = Math.min(max, line.qty + qty);
    } else {
      cart.items.push({
        productId, name: product.name, price: product.price, qty: Math.min(max, qty),
        palette: product.palette, image: product.image && /^https?:/.test(product.image) ? product.image : ''
      });
    }
    cart.state = 'active';
    cart.updatedAt = new Date().toISOString();
    commit();
    touchVisitor(v => { v.cartStartedAt = v.cartStartedAt || new Date().toISOString(); });
    track('add_to_cart', { productId, qty });
    return cart;
  }

  function setCartQty(productId, qty) {
    const cart = activeCart(true);
    const line = cart.items.find(i => i.productId === productId);
    if (!line) return cart;
    const product = db().products.find(p => p.id === productId);
    const max = product ? Math.max(0, Number(product.stock) || 0) : 99;
    line.qty = Math.min(max, Math.max(0, Number(qty) || 0));
    if (line.qty === 0) cart.items = cart.items.filter(i => i.productId !== productId);
    cart.updatedAt = new Date().toISOString();
    cart.state = cart.items.length ? 'active' : 'active';
    commit();
    return cart;
  }

  function removeFromCart(productId) {
    const cart = activeCart(true);
    cart.items = cart.items.filter(i => i.productId !== productId);
    cart.updatedAt = new Date().toISOString();
    commit();
    return cart;
  }

  function clearCart() {
    const cart = activeCart(true);
    cart.items = [];
    cart.updatedAt = new Date().toISOString();
    commit();
    return cart;
  }

  function saveCheckoutContact(patch) {
    const cart = activeCart(true);
    const p = Object.assign({}, patch || {});
    // support persisting selected delivery area for smoother shipping calculation
    if (p.deliveryArea != null) cart.deliveryArea = String(p.deliveryArea || '');
    if (p.city != null && !cart.deliveryArea) cart.deliveryArea = String(p.city || '');
    if (p.customer && typeof p.customer === 'object') {
      cart.customer = Object.assign({}, cart.customer || {}, p.customer);
      if (p.customer.deliveryArea != null) cart.deliveryArea = String(p.customer.deliveryArea || '');
    }
    const simple = {};
    ['name','phone','city','address','notes'].forEach(k => { if (p[k] != null) simple[k] = p[k]; });
    if (Object.keys(simple).length) Object.assign(cart, simple);
    cart.state = 'checkout';
    cart.updatedAt = new Date().toISOString();
    commit();
    track('begin_checkout', { value: cartTotals(cart, cart.deliveryArea).total });
    return cart;
  }

  function placeOrder(customer, payment) {
    const d = db();
    const cart = activeCart(true);
    if (!cart || !cart.items.length) throw new Error('السلة فارغة');
    const deliveryArea = String((customer && (customer.deliveryArea || customer.city)) || cart.deliveryArea || selectedDeliveryAreaName(cart) || '').trim();
    const totals = cartTotals(cart, deliveryArea);
    const nums = d.orders.map(o => parseInt(String(o.number).replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
    const number = 'RT-' + (nums.length ? Math.max.apply(null, nums) + 1 : 1001);
    const order = {
      id: uid('o'), number,
      customer: Object.assign({ name: '', phone: '', city: '', address: '', notes: '', deliveryArea: deliveryArea }, customer, { deliveryArea }),
      items: cart.items.map(i => Object.assign({}, i)),
      subtotal: totals.subtotal, shipping: totals.shipping, discount: 0, total: totals.total,
      payment: payment || 'الدفع عند الاستلام', status: 'new',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), note: ''
    };
    d.orders.unshift(order);
    d.products.forEach(p => {
      const line = cart.items.find(i => i.productId === p.id);
      if (line) p.stock = Math.max(0, (Number(p.stock) || 0) - line.qty);
    });
    cart.state = 'converted';
    cart.convertedOrder = order.number;
    cart.items = [];
    cart.deliveryArea = '';
    cart.updatedAt = new Date().toISOString();
    // sync loyalty points from orders (realistic, derived) after adding order
    try { syncLoyaltyMembers(); } catch (e) { /* ignore */ }
    commit();
    track('purchase', { order: number, total: totals.total, area: deliveryArea });
    return order;
  }

  function favorites() {
    try { return JSON.parse(localStorage.getItem('rosetouch_favorites') || '[]'); } catch (e) { return []; }
  }

  function toggleFavorite(productId) {
    const list = favorites();
    const i = list.indexOf(productId);
    if (i > -1) {
      list.splice(i, 1);
      track('unfavorite', { productId });
    } else {
      list.push(productId);
      track('favorite', { productId });
    }
    try { localStorage.setItem('rosetouch_favorites', JSON.stringify(list)); } catch (e) { /* ignore */ }
    return list;
  }

  function contactMessage(name, phone, message) {
    const d = db();
    d.messages.unshift({
      id: uid('m'), name: String(name || '').trim(), phone: String(phone || '').trim(),
      message: String(message || '').trim(), createdAt: new Date().toISOString(), read: false
    });
    commit();
    return true;
  }

  function submitFavorRequest(input) {
    const d = db();
    input = input || {};
    const nums = d.favors.map(f => parseInt(String(f.number).replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
    const number = 'FT-' + (nums.length ? Math.max.apply(null, nums) + 1 : 1001);
    const req = {
      id: uid('f'),
      number,
      name: String(input.name || '').trim(),
      phone: String(input.phone || '').trim(),
      event: input.event || FAVOR_EVENTS[0],
      quantity: Math.max(FAVOR_MIN_QTY, Math.floor(Number(input.quantity) || FAVOR_MIN_QTY)),
      size: favorSize(input.size).id,
      scents: Array.isArray(input.scents) ? input.scents.slice(0, 4) : [],
      packaging: favorPackaging(input.packaging).id,
      color: favorColor(input.color).id,
      labelText: String(input.labelText || '').trim(),
      city: String(input.city || '').trim(),
      neededBy: String(input.neededBy || '').trim(),
      notes: String(input.notes || '').trim(),
      estimate: favorEstimate(input),
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    d.favors.unshift(req);
    commit();
    try { track('favor_request', { number, quantity: req.quantity, estimate: req.estimate }); } catch (e) { /* ignore */ }
    return req;
  }

  /* ---------- مستمعو التغيير ---------- */
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) {
      cache = null;
      try {
        window.dispatchEvent(new CustomEvent('rosetouch:change', { detail: { source: 'external' } }));
      } catch (err) { /* ignore */ }
    }
  });

  function loyaltyLevel(points) {
    const p = Number(points) || 0;
    if (p >= 80) return 'ذهبي';
    if (p >= 25) return 'فضي';
    return 'برونزي';
  }
  function loyaltyHiddenPhones() {
    const s = settings();
    const list = (s && s.loyalty && Array.isArray(s.loyalty.hiddenPhones)) ? s.loyalty.hiddenPhones : [];
    return list.map(p => String(p || '').replace(/\D/g, '')).filter(Boolean);
  }
  function loyaltySetHidden(phone, hidden) {
    const s = settings();
    if (!s.loyalty || typeof s.loyalty !== 'object') s.loyalty = {};
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return [];
    const list = loyaltyHiddenPhones().filter(p => p !== digits);
    if (hidden) list.push(digits);
    s.loyalty.hiddenPhones = list;
    commit();
    return syncLoyaltyMembers();
  }
  function deleteLoyaltyMember(phone) { return loyaltySetHidden(phone, true); }
  function restoreLoyaltyMember(phone) { return loyaltySetHidden(phone, false); }

  function loyaltyOverrides() {
    const s = settings();
    if (!s.loyalty || typeof s.loyalty !== 'object') s.loyalty = {};
    if (!s.loyalty.overrides || typeof s.loyalty.overrides !== 'object') s.loyalty.overrides = {};
    return s.loyalty.overrides;
  }
  function setLoyaltyPoints(phone, points) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return [];
    const ov = loyaltyOverrides();
    if (points === null || points === undefined || points === '') delete ov[digits];
    else ov[digits] = Math.max(0, Math.floor(Number(points) || 0));
    commit();
    return computeLoyaltyMembers();
  }

  /* يحسب نقاط الولاء من طلبات المتجر المحلية + أي طلبات إضافية (مثل طلبات Google Sheets) */
  function computeLoyaltyMembers(extraOrders) {
    const d = db();
    const s = settings();
    const rate = Math.max(1, Number(s.loyalty && s.loyalty.pointsRate) || 10); // each X ₪ = 1 point
    const hidden = loyaltyHiddenPhones();
    const overrides = (s.loyalty && s.loyalty.overrides) || {};
    const existing = Array.isArray(d.loyaltyMembers) ? d.loyaltyMembers : [];
    const byPhone = {};
    const seen = {};

    function addOrders(list) {
      (list || []).forEach(function (o) {
        if (!o) return;
        const status = String(o.status || '').trim();
        if (status === 'cancelled' || status === 'ملغي') return;
        const phone = String((o.customer && o.customer.phone) || o.phone || '').replace(/\D/g, '');
        if (!phone || hidden.indexOf(phone) >= 0) return;
        // منع احتساب نفس الطلب مرتين (محلي + Google Sheets)
        const key = String(o.number || o.id || (String(o.createdAt || '') + '|' + phone)).trim();
        if (key && seen[key]) return;
        if (key) seen[key] = true;
        const name = (o.customer && o.customer.name) || o.name || 'عميل';
        const total = Number(o.total) || 0;
        if (!byPhone[phone]) byPhone[phone] = { name: name, phone: phone, points: 0, orders: 0, spent: 0, updatedAt: o.createdAt || todayISO() };
        const m = byPhone[phone];
        m.orders += 1;
        m.spent += total;
        m.points += Math.floor(total / rate);
        if (o.createdAt && String(o.createdAt) > String(m.updatedAt)) {
          m.updatedAt = o.createdAt;
          if (name) m.name = name;
        } else if (name && m.name === 'عميل') {
          m.name = name;
        }
      });
    }
    addOrders(d.orders);
    addOrders(extraOrders);

    // أعضاء مضافون يدويًا (بدون طلبات) — نحتفظ بهم
    existing.forEach(function (m) {
      const phone = String(m.phone || '').replace(/\D/g, '');
      if (!phone || hidden.indexOf(phone) >= 0 || byPhone[phone]) return;
      if (!(Number(m.orders) > 0) && !(Number(m.points) > 0)) return;
      byPhone[phone] = { name: m.name || 'عميل', phone: phone, points: Number(m.points) || 0, orders: Number(m.orders) || 0, spent: Number(m.spent) || 0, updatedAt: m.updatedAt || todayISO() };
    });

    const list = Object.keys(byPhone).map(function (phone) {
      const m = byPhone[phone];
      const prev = existing.find(function (x) { return String(x.phone || '').replace(/\D/g, '') === phone; });
      if (overrides[phone] != null) m.points = Number(overrides[phone]) || 0;
      else if (prev && prev.manualPoints != null) m.points = Number(prev.manualPoints) || 0;
      m.manual = overrides[phone] != null;
      m.level = loyaltyLevel(m.points);
      return m;
    });
    list.sort(function (a, b) { return (Number(b.points) || 0) - (Number(a.points) || 0); });
    return list;
  }

  function syncLoyaltyMembers(extraOrders) {
    const d = db();
    d.loyaltyMembers = computeLoyaltyMembers(extraOrders);
    return d.loyaltyMembers;
  }

  /* ---------- مزامنة الطلبات والرسائل (Google Sheets) ---------- */
  function sheetsApiUrl() {
    const s = settings();
    return String((s && s.sheetsApiUrl) || '').trim();
  }

  // إرسال طلب/رسالة إلى تطبيق Apps Script (fire-and-forget)
  function pushRemote(type, data) {
    const url = sheetsApiUrl();
    if (!url) return Promise.resolve(false);
    const payload = Object.assign({ type: type }, data || {});
    try {
      return fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).then(function () { return true; }).catch(function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  // قراءة الطلبات/الرسائل من الجدول عبر JSONP (يتجاوز قيود CORS)
  function fetchRemote(type) {
    const url = sheetsApiUrl();
    if (!url) return Promise.reject(new Error('لم يتم ضبط رابط مزامنة Google Sheets'));
    return new Promise(function (resolve, reject) {
      const cb = 'rtjsonp_' + Math.random().toString(36).slice(2);
      const sep = url.indexOf('?') >= 0 ? '&' : '?';
      const src = url + sep + 'type=' + encodeURIComponent(type || 'orders') + '&callback=' + cb;
      const script = document.createElement('script');
      let done = false;
      const timer = setTimeout(function () {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error('انتهت مهلة الاتصال'));
      }, 20000);
      function cleanup() {
        clearTimeout(timer);
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      window[cb] = function (data) {
        if (done) return;
        done = true;
        cleanup();
        resolve(data);
      };
      script.onerror = function () {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error('تعذر الوصول إلى رابط المزامنة'));
      };
      script.src = src;
      document.head.appendChild(script);
    });
  }

  function orderText(order) {
    const c = (order && order.customer) || {};
    const lines = [];
    lines.push('طلب جديد من Rose Touch 🌹');
    lines.push('رقم الطلب: ' + (order.number || ''));
    lines.push('الاسم: ' + (c.name || ''));
    lines.push('الجوال: ' + (c.phone || ''));
    lines.push('المنطقة: ' + (c.deliveryArea || c.city || ''));
    if (c.address) lines.push('العنوان: ' + c.address);
    if (order.payment) lines.push('الدفع: ' + order.payment);
    lines.push('— المنتجات —');
    (order.items || []).forEach(function (i) {
      lines.push('• ' + i.name + ' × ' + i.qty + ' = ' + money((Number(i.price) || 0) * (Number(i.qty) || 0)));
    });
    lines.push('المجموع الفرعي: ' + money(order.subtotal || 0));
    lines.push('الشحن: ' + (Number(order.shipping) ? money(order.shipping) : 'مجاني'));
    lines.push('الإجمالي: ' + money(order.total || 0));
    if (c.notes) lines.push('ملاحظات: ' + c.notes);
    return lines.join('\n');
  }

  function orderRemotePayload(order) {
    const c = (order && order.customer) || {};
    return {
      number: order.number || '',
      name: c.name || '',
      phone: c.phone || '',
      area: c.deliveryArea || c.city || '',
      address: c.address || '',
      payment: order.payment || '',
      itemsText: (order.items || []).map(function (i) { return i.name + ' × ' + i.qty; }).join(' | '),
      subtotal: Number(order.subtotal) || 0,
      shipping: Number(order.shipping) || 0,
      total: Number(order.total) || 0,
      notes: c.notes || '',
      createdAt: order.createdAt || new Date().toISOString()
    };
  }

  function messageText(msg) {
    return ['رسالة جديدة من موقع Rose Touch 🌹',
      'الاسم: ' + (msg.name || ''),
      'الجوال: ' + (msg.phone || ''),
      'الرسالة: ' + (msg.message || '')].join('\n');
  }

  function whatsappUrl(text) {
    const wa = String(settings().whatsapp || '').replace(/\D/g, '');
    if (!wa) return '';
    return 'https://wa.me/' + wa + '?text=' + encodeURIComponent(text || '');
  }

  /* ---------- التصدير ---------- */
  global.RT = {
    KEY, palettes, paletteKeys, candleArt, productImage,
    db, commit, replace, reset, exportJSON, importJSON, storageError,
    settings, currency, money, fmtDate, timeAgo, categoryName,
    ORDER_STATUS, SOURCE_LABELS, DEVICE_LABELS,
    FAVOR_MIN_QTY, FAVOR_LABEL_PRICE, FAVOR_SIZES, FAVOR_PACKAGING, FAVOR_COLORS,
    FAVOR_EVENTS, FAVOR_SCENTS, FAVOR_STATUS,
    favorSize, favorPackaging, favorColor, favorStatus, favorEstimate, submitFavorRequest,
    normalizeCurrency,
    uid, todayISO,
    getVisitorId, getSessionId, visitor, touchVisitor, track,
    activeCart, cartTotals, addToCart, setCartQty, removeFromCart, clearCart, saveCheckoutContact, placeOrder,
    favorites, toggleFavorite, contactMessage, detectDevice, detectSource,
    deliveryAreas, selectedDeliveryAreaName, resolveDeliveryFee,
    loyaltyLevel, syncLoyaltyMembers, loyaltyHiddenPhones, deleteLoyaltyMember, restoreLoyaltyMember,
    computeLoyaltyMembers, setLoyaltyPoints, loyaltyOverrides,
    sheetsApiUrl, pushRemote, fetchRemote, orderText, orderRemotePayload, messageText, whatsappUrl
  };
})(window);

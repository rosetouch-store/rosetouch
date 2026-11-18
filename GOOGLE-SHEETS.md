# ربط الطلبات والرسائل بـ Google Sheets

هذا الدليل يشرح كيف تجعل طلبات الزبائن ورسائلهم تصل إليك فعليًا:

- **واتساب:** يفتح الزبون واتسابك مباشرة بتفاصيل الطلب/الرسالة (يعمل فورًا بدون إعداد).
- **Google Sheets:** يُحفظ الطلب/الرسالة في جدول Google، وتظهر داخل لوحة التحكم من أي جهاز.

> ملاحظة: رابط Apps Script يُوضع في إعدادات الموقع داخل لوحة التحكم، ثم **يجب نشر `store-data.js`** ليصل الرابط إلى متصفحات الزوار.
>
> اختيارات الرائحة واللون الجديدة لا تحتاج أعمدة إضافية؛ تظهر ضمن `itemsText` بصيغة `المنتج (رائحة: ...، لون: ...) × الكمية` في واتساب وGoogle Sheets.

---

## 1) إنشاء الجدول

1. افتح [sheets.google.com](https://sheets.google.com) وأنشئ جدولًا جديدًا باسم مثل: `Rose Touch`.
2. من القائمة: **Extensions (إضافات) → Apps Script**.
3. احذف الكود الافتراضي، والصق الكود الموجود في قسم «كود Apps Script» بالأسفل.
4. اضغط **Save** (أيقونة الحفظ).

## 2) نشر التطبيق

1. اضغط **Deploy (نشر) → New deployment (نشر جديد)**.
2. اضغط أيقونة الترس ⚙️ بجانب «Select type» واختر **Web app**.
3. الإعدادات:
   - **Description:** `Rose Touch`
   - **Execute as:** `Me (أنت)`
   - **Who has access:** `Anyone (أي شخص)`
4. اضغط **Deploy**.
5. ستظهر رسالة صلاحيات: **Authorize access** → اختر حسابك → **Advanced** → **Go to … (unsafe)** → **Allow**.
6. انسخ **Web app URL** (ينتهي بـ `/exec`).

## 3) ربط الرابط بلوحة التحكم

1. افتح لوحة التحكم: `.../admin/admin.html` وسجّل الدخول.
2. اذهب إلى **إعدادات الموقع** → بطاقة **مزامنة الطلبات (Google Sheets)**.
3. الصق رابط **Web app URL** في الحقل الأول.
4. (اختياري) الصق رابط الجدول نفسه في الحقل الثاني (يُستخدم لزر «فتح الجدول»).
5. اضغط **حفظ الإعدادات**، ثم **اختبار الاتصال**.
6. اذهب إلى **النسخ الاحتياطي والنشر** → **تنزيل store-data.js محدث**.
7. ارفع الملف إلى `assets/js/store-data.js` في GitHub (Commit)، وانتظر دقيقة.
8. إن كانت الطلبات تصل لكن أزرار تغيير الحالة أو الحذف معطّلة، فالنسخة المنشورة قديمة: استبدل الكود بالنسخة `v3` في أسفل هذا الملف، ثم **Deploy → Manage deployments → ✏️ → New version → Deploy**. الرابط `/exec` نفسه يبقى يعمل.

الآن كل طلب جديد:
- يفتح واتسابك بتفاصيل الطلب.
- يُضاف تلقائيًا إلى جدول Google.
- يظهر في لوحة التحكم → **الطلبات** → قسم «طلبات الزبائن — Google Sheets» أعلى الصفحة.

---

## 4) إدارة الطلبات من اللوحة

داخل قسم **طلبات الزبائن — Google Sheets** تستطيع:

| الإجراء | كيف |
|---|---|
| **البحث** | حقل البحث أعلى الجدول (رقم الطلب، الاسم، الهاتف، المنطقة، العنوان، المنتجات). |
| **تصفية الطلبات** | أزرار الحالة أعلى الجدول (الكل / جديد / مقروء / قيد التجهيز / تم الشحن / مكتمل / ملغي) مع عدد الطلبات في كل حالة. |
| **تغيير حالة الطلب** | من القائمة المنسدلة في عمود **الحالة** — يُحفظ فورًا في Google Sheets. |
| **عرض التفاصيل الكاملة** | زر العين 👁 (الاسم، الجوال، المنطقة، العنوان، الدفع، المنتجات، الملاحظات). |
| **مراسلة العميل** | زر واتساب في نفس الصف. |
| **حذف الطلب** | زر السلة 🗑 (مع تأكيد) — يحذف الصف من جدول Google نهائيًا. |

> الحالة الافتراضية لكل طلب جديد هي **جديد**. اجعلها **مقروء** بعد أن تراه، ثم **قيد التجهيز** وهكذا.
>
> تظهر رائحة الشمع ولونه المختاران داخل عمود `itemsText` مع اسم المنتج، مثل: `شمعة ورد دمشقي (رائحة: عنبر، لون: وردي) × 1`. لا حاجة إلى أعمدة جديدة في الجدول.

---

## 5) إدارة الرسائل من اللوحة

داخل قسم **الرسائل** → بطاقة «رسائل الزبائن — Google Sheets» (أعلى الصفحة) تستطيع:

| الإجراء | كيف |
|---|---|
| **البحث** | حقل البحث أعلى الجدول (الاسم، الهاتف، نص الرسالة). |
| **تصفية الرسائل** | أزرار (الكل / جديد / مقروء) مع عدد الرسائل في كل حالة. |
| **تعليم كمقروءة** | القائمة المنسدلة في عمود **الحالة** — تُحفظ فورًا في عمود `status` بجدول Google. تتحوّل تلقائيًا إلى **مقروء** عند فتح الرسالة. |
| **قراءة الرسالة كاملة** | زر العين 👁 — يفتح نص الرسالة كاملًا مع بيانات المرسل. |
| **الرد** | زر واتساب يفتح محادثة مع رقم المرسل. |
| **حذف الرسالة** | زر السلة 🗑 (مع تأكيد) — يحذف الصف من جدول Google نهائيًا. |

> إذا ظهر تنبيه «حدّث كود Apps Script» فمعناه أن النسخة المنشورة قديمة؛ حدّثها بالخطوات في القسم التالي ثم اضغط «تحديث».

---

## 6) حذف عميل من نظام الولاء

من لوحة التحكم → **نظام الولاء** → جدول **أعضاء الولاء**:

- زر السلة 🗑 بجانب العميل يحذفه من قائمة الولاء (مع تأكيد).
- ينتقل إلى قسم **عملاء مستبعدون** في الأسفل، ولا تُحتسب طلباته السابقة.
- زر **استرجاع** يعيده إلى القائمة ويُعاد احتساب نقاطه من طلباته.

> **احتساب النقاط:** يجمع النظام تلقائيًا كل الطلبات غير الملغاة حسب رقم الهاتف — طلبات المتجر المحلية **وطلبات Google Sheets** معًا (مع منع احتساب نفس رقم الطلب مرتين). تظهر شارة «X طلب من Google Sheets» في بطاقة الأعضاء، ويمكنك تعديل نقاط أي عميل يدويًا من زر القلم ✏️.
>
> الاستبعاد يُحفظ محليًا في `store-data.js` (قائمة `loyalty.hiddenPhones`) وينتقل مع النسخ الاحتياطي والنشر كبقية الإعدادات.

---

## 7) تتبّع الطلب عند الزبون

قسم **«تتبّعي حالة طلبك»** في المتجر (وفي القائمة والتذييل، وزر «تتبّع طلبي» بعد إتمام الطلب) يقرأ حالة الطلب من Google Sheets مباشرة:

- يُدخل الزبون **رقم الطلب + رقم الهاتف** فقط (يُقبل الرقم مع/بدون `RT-` ومع/بدون مقدمة الدولة).
- لا يظهر إلا الطلب المطابق — لا تُكشف بيانات أي زبون آخر.
- يعرض: الحالة الحالية (جديد / قيد التجهيز / تم الشحن / مكتمل أو ملغي)، شريط تقدّم، التاريخ، المنطقة، المنتجات، الإجمالي، وزر استفسار عبر واتساب.
- إن لم يتوفر اتصال بالجدول، يبحث في الطلبات المحلية لنفس المتصفح كخطة بديلة.
- أي تغيير للحالة من اللوحة (أو من الجدول مباشرة) ينعكس على صفحة التتبّع بعد التحديث.

### بعد تعديل كود Apps Script

إن كان الجدول منشورًا مسبقًا وحدّثت الكود (مثل إضافة الحالات والحذف، أو تفعيل إجراءات الرسائل في الإصدار `v3`):

1. في Apps Script: **Deploy → Manage deployments**.
2. اضغط أيقونة القلم ✏️ على النشر الحالي.
3. في **Version** اختر **New version**.
4. اضغط **Deploy**.

> لا يتغير الرابط عند إعادة النشر بنفس النشر — نفس `/exec` يبقى يعمل. لو أنشأت **New deployment** جديدًا فستحصل على رابط جديد يجب تحديثه في إعدادات الموقع.
>
> الكود في هذا الملف يُعيد `v: 3`. إن ظهرت أزرار الرسائل (تعليم كمقروءة / حذف) معطّلة، فالنشر الحالي ما زال `v2`؛ انسخ الكود كاملًا ثم أعد النشر بالخطوات أعلاه.

---

## كود Apps Script

```javascript
/**
 * Rose Touch — استقبال الطلبات والرسائل في Google Sheets
 * الصق هذا الكود داخل Apps Script المرتبط بالجدول، ثم انشره كـ Web App.
 */

const SHEET_ORDERS = 'الطلبات';
const SHEET_MESSAGES = 'الرسائل';
const SHEET_FAVORS = 'التوزيعات';

const HEADERS_ORDERS = ['createdAt','number','name','phone','area','address','payment','itemsText','subtotal','shipping','total','notes','status'];
const HEADERS_MESSAGES = ['createdAt','name','phone','message','status'];
const HEADERS_FAVORS = ['createdAt','number','name','phone','event','quantity','estimate','city','notes'];

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/* يضيف أي عمود ناقص في الصف الأول (مثل status) ويعيد رقمه (0-based) */
function ensureColumn_(sh, name) {
  const lastCol = Math.max(1, sh.getLastColumn());
  const head = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  let idx = head.indexOf(name);
  if (idx >= 0) return idx;
  idx = head.length;
  sh.getRange(1, idx + 1).setValue(name);
  return idx;
}

/* يضيف صفًا بحيث يُطابق كل قيمة اسمها في رأس الجدول (آمن لو تغيّر ترتيب الأعمدة) */
function appendRowByKeys_(sh, keys) {
  const lastCol = Math.max(1, sh.getLastColumn());
  const head = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  Object.keys(keys).forEach(function (k) {
    if (head.indexOf(k) < 0) {
      head.push(k);
      sh.getRange(1, head.length).setValue(k);
    }
  });
  sh.appendRow(head.map(function (h) {
    return keys[h] !== undefined ? keys[h] : '';
  }));
}

function normPhone_(p) {
  return String(p || '').replace(/\D/g, '');
}

function sameMoment_(a, b) {
  if (String(a) === String(b)) return true;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (!isNaN(ta) && !isNaN(tb)) return Math.abs(ta - tb) < 3000;
  return false;
}

/* رقم الصف (1-based) لرسالة تُطابق وقت الإنشاء + الهاتف، أو -1 */
function findMessageRow_(sh, createdAt, phone) {
  if (sh.getLastRow() < 2) return -1;
  const values = sh.getDataRange().getValues();
  const head = values[0].map(String);
  let dateCol = head.indexOf('createdAt'); if (dateCol < 0) dateCol = 0;
  let phoneCol = head.indexOf('phone'); if (phoneCol < 0) phoneCol = 2;
  const target = normPhone_(phone);
  for (let i = 1; i < values.length; i++) {
    if (sameMoment_(values[i][dateCol], createdAt) && normPhone_(values[i][phoneCol]) === target) {
      return i + 1;
    }
  }
  return -1;
}

/* رقم الصف (1-based) الذي يحمل رقم الطلب، أو -1 */
function findOrderRow_(sh, number) {
  if (sh.getLastRow() < 2) return -1;
  const values = sh.getDataRange().getValues();
  const head = values[0].map(String);
  let numCol = head.indexOf('number');
  if (numCol < 0) numCol = 1; // العمود B افتراضيًا
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][numCol]) === String(number)) return i + 1;
  }
  return -1;
}

function appendOrder_(data, now) {
  const sh = getSheet_(SHEET_ORDERS, HEADERS_ORDERS);
  appendRowByKeys_(sh, {
    createdAt: data.createdAt || now,
    number: data.number || '',
    name: data.name || '',
    phone: data.phone || '',
    area: data.area || '',
    address: data.address || '',
    payment: data.payment || '',
    itemsText: data.itemsText || '',
    subtotal: data.subtotal || 0,
    shipping: data.shipping || 0,
    total: data.total || 0,
    notes: data.notes || '',
    status: data.status || 'جديد'
  });
}

function appendMessage_(data, now) {
  const sh = getSheet_(SHEET_MESSAGES, HEADERS_MESSAGES);
  appendRowByKeys_(sh, {
    createdAt: data.createdAt || now,
    name: data.name || '',
    phone: data.phone || '',
    message: data.message || '',
    status: data.status || 'جديد'
  });
}

function updateOrderStatus_(number, status) {
  const sh = getSheet_(SHEET_ORDERS, HEADERS_ORDERS);
  const row = findOrderRow_(sh, number);
  if (row < 0) return false;
  const col = ensureColumn_(sh, 'status');
  sh.getRange(row, col + 1).setValue(status || 'جديد');
  return true;
}

function updateMessageStatus_(createdAt, phone, status) {
  const sh = getSheet_(SHEET_MESSAGES, HEADERS_MESSAGES);
  const row = findMessageRow_(sh, createdAt, phone);
  if (row < 0) return false;
  const col = ensureColumn_(sh, 'status');
  sh.getRange(row, col + 1).setValue(status || 'جديد');
  return true;
}

function deleteOrder_(number) {
  const sh = getSheet_(SHEET_ORDERS, HEADERS_ORDERS);
  const row = findOrderRow_(sh, number);
  if (row < 0) return false;
  sh.deleteRow(row);
  return true;
}

function deleteMessage_(createdAt, phone) {
  const sh = getSheet_(SHEET_MESSAGES, HEADERS_MESSAGES);
  const row = findMessageRow_(sh, createdAt, phone);
  if (row < 0) return false;
  sh.deleteRow(row);
  return true;
}

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const now = new Date().toISOString();

    if (data.type === 'message') {
      appendMessage_(data, now);
    } else if (data.type === 'favor') {
      const sh = getSheet_(SHEET_FAVORS, HEADERS_FAVORS);
      sh.appendRow([data.createdAt || now, data.number || '', data.name || '', data.phone || '', data.event || '', data.quantity || '', data.estimate || 0, data.city || '', data.notes || '']);
    } else if (data.type === 'updateOrder') {
      const ok = updateOrderStatus_(data.number, data.status);
      return json_({ ok: ok, type: 'updateOrder', number: data.number, status: data.status });
    } else if (data.type === 'deleteOrder') {
      const ok = deleteOrder_(data.number);
      return json_({ ok: ok, type: 'deleteOrder', number: data.number });
    } else if (data.type === 'updateMessage') {
      const ok = updateMessageStatus_(data.createdAt, data.phone, data.status);
      return json_({ ok: ok, type: 'updateMessage', phone: data.phone, status: data.status });
    } else if (data.type === 'deleteMessage') {
      const ok = deleteMessage_(data.createdAt, data.phone);
      return json_({ ok: ok, type: 'deleteMessage', phone: data.phone });
    } else {
      appendOrder_(data, now);
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  const type = (e && e.parameter && e.parameter.type) || 'orders';

  let name = SHEET_ORDERS;
  let headers = HEADERS_ORDERS;
  if (type === 'messages') { name = SHEET_MESSAGES; headers = HEADERS_MESSAGES; }
  if (type === 'favors') { name = SHEET_FAVORS; headers = HEADERS_FAVORS; }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name);
  let rows = [];

  if (sh && sh.getLastRow() > 1) {
    const values = sh.getDataRange().getValues();
    const head = values[0].map(String);
    rows = values.slice(1).map(function (r) {
      const o = {};
      head.forEach(function (h, i) { o[h] = r[i]; });
      return o;
    });
  }

  const payload = JSON.stringify({ ok: true, v: 3, type: type, rows: rows });
  const cb = e && e.parameter && e.parameter.callback;
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + payload + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## أعمدة ورقة «الطلبات»

| العمود | المعنى |
|---|---|
| `createdAt` | وقت الطلب (ISO) |
| `number` | رقم الطلب مثل `RT-1052` |
| `name` / `phone` | اسم العميل وجواله |
| `area` / `address` | منطقة التوصيل والعنوان |
| `payment` | طريقة الدفع |
| `itemsText` | المنتجات مختصرة مع الرائحة واللون المختارين إن وُجدا |
| `subtotal` / `shipping` / `total` | المبالغ بالشيكل |
| `notes` | ملاحظات العميل |
| `status` | حالة الطلب: جديد / مقروء / قيد التجهيز / تم الشحن / مكتمل / ملغي |

---

## أعمدة ورقة «الرسائل»

| العمود | المعنى |
|---|---|
| `createdAt` | وقت الرسالة (ISO) — يُستخدم مع الهاتف لتحديد الصف عند التعديل/الحذف |
| `name` / `phone` | اسم المرسل وجواله |
| `message` | نص الرسالة |
| `status` | حالة الرسالة: جديد / مقروء |

> لو كانت ورقة «الرسائل» موجودة قبل التحديث، سيضيف الكود عمود `status` تلقائيًا أول مرة تُعدَّل فيها رسالة.

---

## ملاحظات أمان

- رابط Web App يكون ظاهرًا في كود الصفحة (لأن الزوار يستخدمونه لإرسال الطلبات). هذا طبيعي في المواقع الثابتة.
- من يعرف الرابط يمكنه نظريًا إرسال طلبات مزيفة أو تعديل/حذف صفوف. إن أردت حماية أقوى، أضف مفتاحًا سريًا داخل Apps Script وتحقّق منه قبل تنفيذ أوامر التعديل والحذف.
- لا تعتمد على حماية لوحة التحكم كحماية بنكية؛ فهي حماية بسيطة من جهة المتصفح.

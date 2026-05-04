/* =============================================================
   I18n — Bilingual support (Hebrew / English)
   ============================================================= */
var I18n = (function () {
  'use strict';

  var STORAGE_KEY = 'yashir_lang';
  var REMEMBER_KEY = 'yashir_lang_remember';
  var _lang = 'he';

  function init() {
    var remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered === 'true') {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'he') _lang = saved;
    }
    _applyDir();
  }

  function getLang() { return _lang; }

  function setLang(lang, remember) {
    if (lang !== 'he' && lang !== 'en') return;
    _lang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    if (remember !== undefined) {
      localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
    }
    _applyDir();
  }

  function isRemembered() {
    return localStorage.getItem(REMEMBER_KEY) === 'true';
  }

  function _applyDir() {
    var html = document.documentElement;
    if (_lang === 'en') {
      html.setAttribute('lang', 'en');
      html.setAttribute('dir', 'ltr');
    } else {
      html.setAttribute('lang', 'he');
      html.setAttribute('dir', 'rtl');
    }
  }

  function t(key) {
    var dict = _lang === 'en' ? _en : _he;
    return dict[key] !== undefined ? dict[key] : key;
  }

  function pLang(product, field) {
    if (!product) return '';
    if (_lang === 'en') {
      var enKey = field + '_en';
      if (product[enKey] !== undefined && product[enKey] !== null && product[enKey] !== '') {
        return product[enKey];
      }
    }
    return product[field] !== undefined ? product[field] : '';
  }

  /* ==============================
     HEBREW DICTIONARY
     ============================== */
  var _he = {
    /* --- Language Selector --- */
    'lang.btn': 'עברית / English',
    'lang.title': 'בחר שפה / Choose Language',
    'lang.hebrew': 'עברית',
    'lang.english': 'English',
    'lang.remember': 'זכור את הבחירה שלי',
    'lang.remember_en': 'Remember my choice',
    'lang.save': 'אישור',

    /* --- Common --- */
    'common.save': 'שמור',
    'common.cancel': 'ביטול',
    'common.close': 'סגור',
    'common.delete': 'מחק',
    'common.edit': 'ערוך',
    'common.add': 'הוסף',
    'common.send': 'שלח',
    'common.confirm': 'אישור',
    'common.back': 'חזרה',
    'common.search': 'חיפוש',
    'common.loading': 'טוען...',
    'common.error': 'שגיאה',
    'common.yes': 'כן',
    'common.no': 'לא',
    'common.total': 'סה"כ',
    'common.sku': 'מק"ט',
    'common.price': 'מחיר',
    'common.qty': 'כמות',
    'common.date': 'תאריך',
    'common.status': 'סטטוס',
    'common.actions': 'פעולות',
    'common.notes': 'הערות',
    'common.description': 'תיאור',
    'common.name': 'שם',
    'common.phone': 'טלפון',
    'common.email': 'מייל',
    'common.currency': '₪',
    'common.units': 'יח׳',
    'common.products': 'מוצרים',
    'common.all': 'הכל',
    'common.noData': 'אין נתונים',
    'common.lastUpdate': 'תאריך עדכון אחרון',

    /* --- Header --- */
    'header.admin': 'מנהל',
    'header.adminPanel': 'פאנל ניהול',
    'header.hello': 'שלום, ',
    'header.logout': 'התנתק',
    'header.login': 'כניסה',
    'header.logoMark': 'י',
    'header.logoName': 'ישיר',
    'header.logoTagline': 'שיווק והפצה',
    'header.cart': 'עגלה',

    /* --- Floating Buttons --- */
    'float.startOrder': 'התחלת הזמנה',
    'float.catalog': 'הקטלוג שלנו',
    'float.requestProduct': 'בקשת מוצר חדש',
    'float.fullCatalog': 'קטלוג מלא',
    'float.home': 'דף הבית',

    /* --- Landing --- */
    'landing.companyName': 'ישיר שיווק והפצה',
    'landing.toCatalog': 'לקטלוג המוצרים',
    'landing.startOrder': 'התחלת הזמנה',
    'landing.quality': 'מוצרים איכותיים',
    'landing.shipping': 'משלוח מהיר',
    'landing.service': 'שירות אישי',

    /* --- Login --- */
    'login.title': 'כניסה ללקוחות',
    'login.subtitle': 'הזן את מספר ח.פ שלך',
    'login.hpLabel': 'מספר ח.פ / עוסק מורשה',
    'login.hpPlaceholder': '123456789',
    'login.passwordLabel': 'סיסמה',
    'login.passwordPlaceholder': 'הזן סיסמה אם יש',
    'login.passwordHint': 'אם הלקוח לא הגדיר סיסמה, ניתן להתחבר באמצעות ח.פ בלבד',
    'login.remember': 'זכור אותי למשך 30 יום',
    'login.loginBtn': 'כניסה',
    'login.guest': 'אורח?',
    'login.toCatalog': 'לקטלוג',
    'login.missingHp': 'יש להזין מספר ח.פ',
    'login.notFound': 'מספר ח.פ לא נמצא במערכת',
    'login.welcome': 'ברוכים הבאים לישיר.',
    'login.freeShipping': 'משלוח חינם בהזמנות מעל',
    'login.adminWrong': 'קוד מנהל שגוי',

    /* --- Catalog --- */
    'catalog.searchPlaceholder': 'חיפוש לפי שם מוצר או מק"ט...',
    'catalog.categories': 'קטגוריות',
    'catalog.subcategories': 'תתי-קטגוריות',
    'catalog.clearFilters': 'נקה סינון',
    'catalog.adminView': 'תצוגת מנהל — כל המחירים',
    'catalog.personalProducts': 'המוצרים שלך — מחירים אישיים',
    'catalog.fullCatalog': 'קטלוג מלא',
    'catalog.backToPersonal': 'חזרה למוצרים שלי',
    'catalog.noProducts': 'לא נמצאו מוצרים',
    'catalog.inStock': 'במלאי',
    'catalog.outOfStock': 'חסר',
    'catalog.specialPrice': 'מחיר מיוחד בשבילך',
    'catalog.unitsInPack': 'יח׳ בחבילה',
    'catalog.soldBy': 'נמכר ב',
    'catalog.unitsIn': 'יח׳ ב',
    'catalog.bulkDiscount': 'הנחת כמות:',
    'catalog.from': 'מ-',
    'catalog.personalQuote': 'מחיר בהצעה אישית',
    'catalog.loginToOrder': 'התחבר בכדי להזמין',
    'catalog.requestQuote': 'בקש הצעת מחיר',
    'catalog.inCart': 'בעגלה',
    'catalog.update': 'עדכן',
    'catalog.addToCart': 'הוסף',
    'catalog.oosDelay': 'עלול להתעכב — חסר במלאי',
    'catalog.loginToOrderBtn': 'כניסה להזמנה',
    'catalog.lineTotal': 'סה"כ',
    'catalog.bulkDiscountLabel': 'הנחת כמות',
    'catalog.moreFor': 'עוד',
    'catalog.toGet': 'לקבלת הנחת',
    'catalog.order': 'הזמן',
    'catalog.toFullCatalog': 'לקטלוג המלא',
    'catalog.quoteModalTitle': 'בקשת הצעת מחיר',
    'catalog.quoteModalText': 'האם לשלוח בקשת הצעת מחיר עבור:',
    'catalog.quoteModalNote': 'הנציג שלנו יחזור אליך עם מחיר אישי בהקדם.',
    'catalog.sendRequest': 'שלח בקשה',
    'catalog.requestSent': 'הבקשה נשלחה! ניצור איתך קשר בהקדם',
    'catalog.quoteDuplicateMerged': 'עודכנה בקשה קיימת לאותו מוצר (ללא כפילות)',
    'catalog.newProductTitle': 'בקשת מוצר חדש',
    'catalog.newProductText': 'לא מצאת מה שחיפשת? תכתוב לנו ונשלח הצעת מחיר.',
    'catalog.productNameLabel': 'שם המוצר / תיאור',
    'catalog.productNamePlaceholder': 'לדוגמה: כוס נייר 6 אונ׳ לבנה',
    'catalog.estQtyLabel': 'כמות משוערת (רשות)',
    'catalog.estQtyPlaceholder': 'לדוגמה: 500',
    'catalog.extraNotesLabel': 'הערות נוספות (רשות)',
    'catalog.extraNotesPlaceholder': 'פרטים נוספים...',
    'catalog.enterProductName': 'נא להזין שם מוצר',
    'catalog.loginFirst': 'יש להתחבר תחילה',
    'catalog.qtyUpdated': 'כמות עודכנה ✓',
    'catalog.removedFromCart': 'הפריט הוסר מהעגלה',

    /* --- Cart --- */
    'cart.empty': 'העגלה ריקה',
    'cart.toCatalog': 'לקטלוג',
    'cart.personalDiscount': 'הנחה אישית',
    'cart.bulkDiscount': 'הנחת כמות',
    'cart.discount': 'הנחה',
    'cart.oosNote': 'חסר במלאי — עלול להתעכב',
    'cart.shippingFee': 'דמי משלוח',
    'cart.backToEdit': 'חזרה לעריכה',
    'cart.title': 'עגלת קניות',
    'cart.items': 'פריטים',
    'cart.subtotal': 'סה"כ לפני מע"מ',
    'cart.vat': 'מע"מ (18%)',
    'cart.totalWithVat': 'סה"כ כולל מע"מ',
    'cart.savings': 'חסכת בהזמנה זו:',
    'cart.moreForFreeShipping': 'עוד',
    'cart.forFreeShipping': 'למשלוח חינם (לפני מע"מ)',
    'cart.freeShipping': 'משלוח חינם!',
    'cart.orderNotes': 'הערות להזמנה',
    'cart.notesPlaceholder': 'הערות אופציונליות...',
    'cart.submitOrder': 'שלח הזמנה',
    'cart.oosWarningTitle': 'שים לב — מוצרים חסרים במלאי',
    'cart.oosWarningText': 'ייתכן עיכוב של יום בהמשלוח עבור מוצרים אלו.',
    'cart.confirmAnyway': 'אישור ושליחה בכל זאת',
    'cart.shippingWarningTitle': 'שים לב — ייתווספו דמי משלוח',
    'cart.orderLessThan': 'ההזמנה פחות מ-₪',
    'cart.beforeVat': '(לפני מע"מ)',
    'cart.shippingAdded': 'יתווספו דמי משלוח:',
    'cart.confirmSend': 'אישור ושליחה',
    'cart.perUnit': '/יח׳',
    'cart.addedToCart': 'נוסף לעגלה ✓',
    'cart.addedOos': 'נוסף לעגלה ✓ (חסר במלאי)',
    'cart.oosToast': 'מוצר חסר במלאי — ייתכן עיכוב ביום',
    'cart.orderSaveFailed': 'לא ניתן לשמור את ההזמנה. בדוק את החיבור לרשת ונסה שוב.',
    'cart.priceMismatchRepriced': 'המחירים עודכנו — בדקו את העגלה ונסו שוב.',
    'cart.priceUpdatedPerPriceList': 'מחיר מוצר עודכן לפי המחירון העדכני',
    'cart.pricePlanIntro': 'מחירי המוצרים עודכנו לפי המחירון העדכני',
    'cart.pricePlanQty': 'כמות:',
    'cart.pricePlanLineImpact': 'השפעה בשורה:',
    'cart.pricePlanTotalImpact': 'סה״כ שינוי בעגלה (לפני מע״מ):',
    'cart.pricePlanTotalNote': 'לפי הכמויות בעגלה',
    'cart.priceAckTitle': 'עדכון מחיר',
    'cart.priceAckProduct': 'המוצר:',
    'cart.priceAckOld': 'מחיר קודם:',
    'cart.priceAckNew': 'מחיר חדש:',
    'cart.priceAckDiff': 'שינוי:',
    'cart.priceAckContinue': 'הבנתי / המשך',
    'cart.productMissing': 'מוצר כבר לא זמין. רעננו את הקטלוג.',

    /* --- Success --- */
    'success.title': 'הזמנתך ב\'ישיר\' התקבלה בהצלחה!',
    'success.subtitle': 'תודה שקנית ב\'ישיר\' וסמכת עלינו,<br>ההזמנה שלך נכנסה עכשיו לטיפול והמשלוח ייצא אליך בהקדם.',
    'success.orderNum': 'מספר הזמנה:',
    'success.newOrder': 'הזמנה חדשה',
    'success.orderNotFound': 'לא נמצאו פרטי הזמנה',
    'success.companyName': 'ישיר שיווק והפצה',
    'success.deliveryNote': 'תעודת משלוח',
    'success.customer': 'לקוח:',
    'success.orderNumber': 'מספר הזמנה:',
    'success.dateLabel': 'תאריך:',
    'success.productName': 'שם מוצר',
    'success.unitPrice': 'מחיר יחי\'',
    'success.subtotalLabel': 'סה"כ לפני מע"מ:',
    'success.vatLabel': 'מע"מ (18%):',
    'success.grandTotal': 'סה"כ סופי לתשלום:',
    'success.popupBlocked': 'חלון נחסם — אפשר חלונות קופצים בדפדפן',
    'success.totalCol': 'סה"כ',
    'success.discountCol': 'הנחה',
    'success.totalPayCol': 'סה"כ לתשלום',

    /* --- System Messages --- */
    'sys.title': 'הודעת מערכת',
    'sys.understood': 'הבנתי, תודה',
    'sys.adminAccess': 'ניהול מערכת',
    'sys.accessCode': 'קוד גישה',
    'sys.wrongCode': 'קוד שגוי',
    'sys.lowStockAlert': 'התראת מלאי נמוך',
    'sys.lowStockTitle': 'מלאי נמוך!',
    'sys.lowStockMsg': 'נשארו',
    'sys.unitsOnly': 'יחידות בלבד.',

    /* --- Admin Common --- */
    'admin.panelTitle': 'פאנל ניהול — ישיר',
    'admin.orders': 'הזמנות',
    'admin.customers': 'לקוחות',
    'admin.productsTab': 'מוצרים',
    'admin.suppliers': 'ספקים',
    'admin.quoteRequests': 'הצעות מחיר',
    'admin.productRequests': 'בקשות מוצרים',
    'admin.profit': 'רווח',
    'admin.stats': 'סטטיסטיקות',
    'admin.financial': 'פיננסי',
    'admin.settingsTab': 'הגדרות',

    /* --- Admin Orders --- */
    'admin.statusNew': 'חדש',
    'admin.statusProcessing': 'בטיפול',
    'admin.statusReady': 'מוכן למשלוח',
    'admin.statusShipped': 'יצא למשלוח',
    'admin.statusDelivered': 'הגיע ללקוח',
    'admin.newOrders': 'חדשות',
    'admin.totalOrders': 'סה"כ',
    'admin.orderNumber': 'מספר',
    'admin.customerCol': 'לקוח',
    'admin.dateCol': 'תאריך',
    'admin.totalCol': 'סה"כ',
    'admin.statusCol': 'סטטוס',
    'admin.paymentCol': 'תשלום',
    'admin.actionsCol': 'פעולות',
    'admin.noOrders': 'אין הזמנות עדיין',
    'admin.beforeVat': 'לפני מע"מ:',
    'admin.withVat': 'כולל מע"מ:',
    'admin.paid': '✅ שולם',
    'admin.pending': '⏳ ממתין',
    'admin.view': 'צפה',
    'admin.deliveryNote': 'תעודה',
    'admin.deleteOrder': 'מחק הזמנה',
    'admin.statusUpdated': 'סטטוס עודכן',
    'admin.markedPaid': 'סומן כשולם ✅',
    'admin.markedPending': 'סומן כממתין',
    'admin.newOrdersWaiting': 'הזמנות חדשות ממתינות!',
    'admin.pendingOrdersMsg': 'ישנן הזמנות חדשות שטרם טופלו.',
    'admin.viewOrders': 'צפה בהזמנות',
    'admin.later': 'לאחר כך',
    'admin.deleteConfirm': 'למחוק הזמנה #',
    'admin.cannotRestore': '? לא ניתן לשחזר.',
    'admin.orderDeleted': 'ההזמנה נמחקה',
    'admin.orderNotFound': 'הזמנה לא נמצאה',
    'admin.order': 'הזמנה',
    'admin.product': 'מוצר',
    'admin.qtyCol': 'כמות',
    'admin.discountCol': 'הנחה',
    'admin.savingsLabel': 'חסכון:',
    'admin.notesLabel': 'הערות:',
    'admin.printDelivery': 'תעודת משלוח',

    /* --- Admin Customers --- */
    'admin.addCustomer': 'הוסף לקוח',
    'admin.hpCol': 'ח.פ',
    'admin.nameCol': 'שם',
    'admin.phoneCol': 'טלפון',
    'admin.discountColCust': 'הנחה',
    'admin.paymentTerms': 'תנאי תשלום',
    'admin.existingDebt': 'חוב קיים',
    'admin.pricesCol': 'מחירים',
    'admin.personalPrices': 'מחירים אישיים',
    'admin.addNewCustomer': 'הוסף לקוח חדש',
    'admin.editCustomer': 'עריכת',
    'admin.hpField': 'ח.פ / עוסק מורשה',
    'admin.hpChangeWarning': '⚠️ שינוי ח.פ ישנה את מזהה הלקוח בכל המערכת',
    'admin.hpChangeConfirm': 'הח.פ. החדש יעודכן בכל ההזמנות הישנות אז אם זה לא טעות שורשית עדיף לפתוח לקוח חדש. האם להמשיך?',
    'admin.passwordField': 'סיסמה ללקוח',
    'admin.passwordHint': 'אם מוגדרת סיסמה, הלקוח יידרש להזין אותה בכניסה. אם לא - כניסה לפי ח.פ בלבד',
    'admin.businessName': 'שם עסק',
    'admin.address': 'כתובת',
    'admin.shippingContact': 'איש קשר למשלוח',
    'admin.shippingAddress': 'כתובת למשלוח',
    'admin.generalDiscount': 'הנחה כללית (%)',
    'admin.personalShipping': 'דמי משלוח אישיים (₪)',
    'admin.existingDebtField': 'חוב קיים (₪)',
    'admin.paymentTermsField': 'תנאי תשלום',
    'admin.cash': 'מזומן',
    'admin.hpNameRequired': 'ח.פ ושם חובה',
    'admin.hpExists': 'כבר קיים במערכת',
    'admin.customerSaved': 'הלקוח נשמר ✅',
    'admin.deleteCustomerConfirm': 'למחוק לקוח',
    'admin.customerDeleted': 'הלקוח נמחק',
    'admin.personalPricesTitle': 'מחירים אישיים —',
    'admin.priceInstr': 'הזן מחיר ב-₪ <strong>או</strong> הנחה ב-%. הלקוח יראה את ההנחה באחוזים.',
    'admin.generalLabel': 'כללי:',
    'admin.savePrices': 'שמור מחירים',
    'admin.pricesSaved': 'המחירים האישיים נשמרו ✅',

    /* --- Admin Products --- */
    'admin.addProduct': 'הוסף מוצר',
    'admin.importJson': 'ייבוא JSON',
    'admin.skuCol': 'מק"ט',
    'admin.nameProductCol': 'שם',
    'admin.categoryCol': 'קטגוריה',
    'admin.priceCol': 'מחיר',
    'admin.packagingCol': 'אריזה',
    'admin.bulkDiscountCol': 'הנחת כמות',
    'admin.stockCol': 'מלאי',
    'admin.uploadPhoto': 'העלה תמונה',
    'admin.deleteProduct': 'מחק מוצר',
    'admin.uploading': 'מעלה תמונה...',
    'admin.uploaded': '✓ התמונה הועלתה בהצלחה',
    'admin.editProductTitle': 'עריכת מוצר —',
    'admin.productName': 'שם מוצר',
    'admin.priceBeforeVat': 'מחיר כללי (₪) — לפני מע"מ',
    'admin.stock': 'מלאי',
    'admin.lowStockThreshold': 'סף מלאי נמוך',
    'admin.category': 'קטגוריה',
    'admin.subcategory': 'תת-קטגוריה',
    'admin.newCategory': '➕ קטגוריה חדשה...',
    'admin.newSubcategory': '➕ תת-קטגוריה חדשה...',
    'admin.enterCatName': 'שם הקטגוריה החדשה',
    'admin.enterSubcatName': 'שם תת-הקטגוריה החדשה',
    'admin.enterNewSubcat': 'נא להזין שם תת-קטגוריה חדשה',
    'admin.subcategoryCol': 'תת-קטגוריה',
    'admin.selectSubcategory': '-- בחר תת-קטגוריה --',
    'admin.noSubcategory': 'ללא תת-קטגוריה',
    'admin.packagingDetails': 'פרטי אריזה ומכירה',
    'admin.unitsInPack': 'כמה יחידות בחבילה',
    'admin.soldBy': 'נמכר ב...',
    'admin.selectSoldBy': '-- בחר --',
    'admin.unitsInContainer': 'כמה יחידות בקרטון/מארז/שק',
    'admin.bulkDiscountEditor': 'הנחת כמות',
    'admin.addBulkStep': 'הוסף שלב הנחה',
    'admin.fromQty': 'מ-',
    'admin.unitsDiscount': 'יח׳ הנחה',
    'admin.productImage': 'תמונת מוצר',
    'admin.noImageYet': 'אין תמונה עדיין',
    'admin.chooseImage': 'בחר תמונה מהמחשב',
    'admin.saveDetails': 'שמור פרטים',
    'admin.uploadedLinked': '✓ התמונה הועלתה וחוברה למוצר',
    'admin.enterNewCat': 'נא להזין שם קטגוריה חדשה',
    'admin.productUpdated': 'המוצר עודכן',
    'admin.deleteProductConfirm': 'למחוק את המוצר "',
    'admin.cannotRestoreProduct': '"? לא ניתן לשחזר.',
    'admin.productDeleted': 'המוצר נמחק',
    'admin.addNewProduct': 'הוסף מוצר חדש',
    'admin.skuNumber': 'מק"ט (מספר)',
    'admin.priceBeforeVatShort': 'מחיר (₪) — לפני מע"מ',
    'admin.minimumPrice': 'מחיר מינימלי מותר (₪)',
    'admin.minimumPriceHint': 'המחיר הנמוך ביותר שניתן להגדיר ללקוח עבור מוצר זה',
    'admin.priceError': 'זה פחות מהמחיר המותר למוצר',
    'admin.skuNameRequired': 'מק"ט ושם חובה',
    'admin.productAdded': 'המוצר נוסף',
    'admin.importTitle': 'ייבוא מוצרים מרשימה',
    'admin.importText': 'הדבק כאן רשימת מוצרים בפורמט JSON. שדות חובה: <strong>sku, name, category, price, stock</strong>',
    'admin.importBtn': 'ייבא מוצרים',
    'admin.importError': 'שגיאה בפורמט ה-JSON',
    'admin.importMissing': 'חסרים שדות חובה',
    'admin.imported': 'יובאו',
    'admin.importedProducts': 'מוצרים',
    'admin.hasBulk': '✓ יש',
    'admin.outOfStockLabel': '0 — חסר',
    'admin.soldByCarton': 'קרטון',
    'admin.soldBySack': 'שק',
    'admin.soldByPack': 'מארז',
    'admin.soldByBundle': 'חבילה',
    'admin.soldByCrate': 'ארגז',
    'admin.soldByPallet': 'פלטה',

    /* --- Admin Quote Requests --- */
    'admin.quoteRequestsTitle': 'בקשות להצעות מחיר',
    'admin.quoteWaiting': 'ממתינות',
    'admin.quoteApproved': 'אושר',
    'admin.quotePending': 'ממתין',
    'admin.quoteRequestedProduct': 'מוצר',
    'admin.approvedPrice': 'מחיר שאושר',
    'admin.action': 'פעולה',
    'admin.approvePrice': 'אשר מחיר',
    'admin.noQuoteRequests': 'אין בקשות עדיין',
    'admin.firestoreNotConnected': 'Firestore לא מחובר',
    'admin.loadError': 'שגיאה בטעינת הבקשות',
    'admin.approveQuoteTitle': 'אשר הצעת מחיר',
    'admin.personalPriceLabel': 'מחיר אישי ללקוח (₪, לפני מע"מ)',
    'admin.enterPrice': 'הזן מחיר',
    'admin.confirmApprove': 'אשר ועדכן מחיר',
    'admin.enterValidPrice': 'נא להזין מחיר תקין',
    'admin.priceApproved': 'המחיר אושר ועודכן ללקוח ✅',

    /* --- Admin Product Requests --- */
    'admin.productRequestsTitle': 'בקשות למוצרים חדשים',
    'admin.newRequests': 'חדשות',
    'admin.handled': 'טופל',
    'admin.requestedProduct': 'מוצר מבוקש',
    'admin.estQty': 'כמות משוערת:',
    'admin.markHandled': 'סמן כטופל',
    'admin.noProductRequests': 'אין בקשות עדיין',
    'admin.markedHandled': 'סומן כטופל',

    /* --- Admin Stats --- */
    'admin.statsTitle': 'סטטיסטיקות',
    'admin.thisMonth': 'החודש הנוכחי',
    'admin.allTime': 'כל הזמנים',
    'admin.monthlyIncome': 'הכנסות החודש',
    'admin.topProduct': 'מוצר מוביל',
    'admin.topCustomer': 'לקוח מוביל',
    'admin.totalIncome': 'סה"כ הכנסות',
    'admin.ordersCount': 'הזמנות',
    'admin.productSalesReport': 'דוח מכירות מוצרים',
    'admin.qtySold': 'כמות נמכרה',
    'admin.revenue': 'הכנסות',
    'admin.initialStock': 'מלאי התחלתי',
    'admin.currentStock': 'מלאי נוכחי',
    'admin.salesStockRatio': 'יחס מכירות/מלאי',
    'admin.noData': 'אין נתונים לתקופה זו',
    'admin.biDashboardTitle': 'BI Dashboard',
    'admin.biOrdersOnlyNote': 'כל המדדים מחושבים משורות הזמנה בלבד',
    'admin.daily': 'יומי',
    'admin.weekly': 'שבועי',
    'admin.monthly': 'חודשי',
    'admin.quantitySold': 'כמות נמכרה',
    'admin.stockMovement': 'תנועת מלאי',
    'admin.productUnitsOnly': 'מוצרי מכירה בלבד',
    'admin.fromOrderItems': 'מתוך פריטי הזמנה',
    'admin.periodComparison': 'השוואה לתקופה קודמת',
    'admin.revenueChange': 'שינוי הכנסות',
    'admin.salesChange': 'שינוי מכירות',
    'admin.revenueOverTime': 'הכנסות לאורך זמן',
    'admin.salesQuantityOverTime': 'כמות מכירות לאורך זמן',
    'admin.profitTrend': 'מגמת רווח',
    'admin.top10ByRevenue': '10 מוצרים מובילים לפי הכנסות',
    'admin.top10ByQuantity': '10 מוצרים מובילים לפי כמות',
    'admin.trend': 'מגמה',
    'admin.stockMovementReport': 'דוח תנועת מלאי לפי הזמנות',
    'admin.notDerivable': 'לא ניתן לחישוב',
    'admin.fromOrderCosts': 'לפי עלויות בתוך ההזמנות',
    'admin.missingOrderCosts': 'חסר נתון עלות בפריטי הזמנה',
    'admin.unknownProduct': 'מוצר לא מזוהה',

    /* --- Admin Low Stock --- */
    'admin.lowStock': 'מלאי נמוך',
    'admin.lowStockTitle': 'מוצרים עם מלאי נמוך',
    'admin.minThreshold': 'סף מינימום',
    'admin.shortage': 'חסר',
    'admin.noLowStockProducts': 'אין מוצרים עם מלאי נמוך 😊',
    'admin.negativeStock': 'מלאי שלילי',

    /* --- Admin Settings --- */
    'admin.settingsTitle': 'הגדרות מערכת',
    'admin.minOrder': 'מינימום הזמנה למשלוח חינם (₪, לפני מע"מ)',
    'admin.defaultShipping': 'דמי משלוח ברירת מחדל (₪)',
    'admin.systemMsg': 'הודעת מערכת (מוצגת ללקוחות אחרי כניסה)',
    'admin.landingTitle': 'כותרת ראשית בדף נחיתה',
    'admin.landingSubtitle': 'תת-כותרת / תיאור בדף נחיתה',
    'admin.adminPin': 'קוד מנהל (PIN)',
    'admin.saveSettings': 'שמור הגדרות',
    'admin.pinTooShort': 'קוד מנהל חייב להכיל לפחות 4 תווים',
    'admin.settingsSaved': 'ההגדרות נשמרו',

    /* --- Admin Financial --- */
    'admin.financialTitle': 'ניהול פיננסי',
    'admin.addRecord': 'הוסף רשומה',
    'admin.addIncomeExpense': 'הוסף הכנסה / הוצאה',
    'admin.expense': 'הוצאה',
    'admin.extraIncome': 'הכנסה נוספת',
    'admin.catPlaceholder': 'שכירות, שיווק, ציוד...',
    'admin.amount': 'סכום (₪)',
    'admin.amountEnteredAs': 'הסכום מוזן',
    'admin.withVatOption': 'כולל מע"מ (אחרי מע"מ)',
    'admin.withoutVatOption': 'לא כולל מע"מ (לפני מע"מ)',
    'admin.descAmountRequired': 'תיאור וסכום חובה',
    'admin.savedSuccess': 'נשמר בהצלחה',
    'admin.saveError': 'שגיאה בשמירה',
    'admin.deleted': 'נמחק',
    'admin.deleteRecordConfirm': 'למחוק רשומה זו?',
    'admin.salesRevenue': 'הכנסות ממכירות',
    'admin.expenses': 'הוצאות נלוות',
    'admin.manualIncome': 'הכנסות ידניות נוספות',
    'admin.beforeVatLabel': 'לפני מע"מ',
    'admin.afterVatLabel': 'אחרי מע"מ',
    'admin.profitSummary': 'סיכום רווחיות',
    'admin.salesProfit': 'רווח ממכירות (הכנסות פחות הוצאות)',
    'admin.manualProfit': 'רווח/הפסד — הכנסות והוצאות ידניות',
    'admin.netProfit': 'סה"כ רווח נקי',
    'admin.manualTransactions': 'הכנסות / הוצאות ידניות',
    'admin.typeCol': 'סוג',
    'admin.categoryColFin': 'קטגוריה',
    'admin.beforeVatCol': 'לפני מע"מ',
    'admin.afterVatCol': 'אחרי מע"מ',
    'admin.deleteCol': 'מחק',
    'admin.noRecordsInPeriod': 'אין רשומות בתקופה זו',
    'admin.incomeType': '▲ הכנסה',
    'admin.expenseType': '▼ הוצאה',
    'admin.periodMonth': 'חודש נוכחי',
    'admin.periodQuarter': 'רבעון',
    'admin.periodHalfYear': 'חצי שנה',
    'admin.periodYear': 'שנה נוכחית',
    'admin.periodAll': 'מתחילת העסק',
    'admin.incomeOrders': 'הכנסות (הזמנות)',
    'admin.expensesLabel': 'הוצאות',
    'admin.profitLabel': 'רווח',
    'admin.lossLabel': 'הפסד',
    'admin.noRecords': 'אין רשומות עדיין',

    /* --- Admin Suppliers --- */
    'admin.suppliersTitle': 'ספקים',
    'admin.addSupplier': 'הוסף ספק',
    'admin.supplierName': 'שם ספק',
    'admin.supplierHp': 'ח.פ',
    'admin.noSuppliers': 'אין ספקים עדיין',
    'admin.editSupplier': 'עריכת ספק',
    'admin.addNewSupplier': 'הוסף ספק חדש',
    'admin.supplierVatId': 'ח.פ / עוסק מורשה',
    'admin.supplierNotes': 'הערות',
    'admin.supplierNameRequired': 'שם ספק חובה',
    'admin.supplierSaved': 'הספק נשמר',
    'admin.deleteSupplierConfirm': 'למחוק ספק זה?',
    'admin.supplierDeleted': 'הספק נמחק',
    'admin.supplierCosts': 'עלויות מספק —',
    'admin.costInstr': 'הזן את עלות הקנייה לכל מוצר מספק זה',
    'admin.salePrice': 'מחיר מכירה:',
    'admin.costPlaceholder': 'עלות',
    'admin.saveCosts': 'שמור עלויות',
    'admin.costsSaved': 'עלויות נשמרו',
    'admin.cannotLoadSuppliers': 'לא ניתן לטעון ספקים. וודא שהגדרת Firestore.',
    'admin.supplierProducts': 'מוצרים',
    'admin.supplierCostsBtn': 'עלויות מוצרים',

    /* --- Admin Profit --- */
    'admin.profitTitle': 'רווח לפי מוצרים',
    'admin.profitSubtitle': 'מחיר מכירה מול עלות ספק',
    'admin.profitNote': 'לעדכון עלויות ספק — עבור ללשונית "ספקים" ↑',
    'admin.priceWithVat': 'מחיר (כולל מע"מ)',
    'admin.priceBeforeVatCol': 'מחיר (לפני מע"מ)',
    'admin.supplierCost': 'עלות ספק',
    'admin.profitWithVat': 'רווח (כולל מע"מ)',
    'admin.profitBeforeVat': 'רווח (לפני מע"מ)',
    'admin.profitPct': '% רווח',
    'admin.supplierCol': 'ספק',
    'admin.notDefined': 'לא הוגדר',

    /* --- Admin English Fields --- */
    'admin.productNameEn': 'שם מוצר (אנגלית)',
    'admin.descriptionEn': 'תיאור (אנגלית)',
    'admin.categoryLabelEn': 'קטגוריה (אנגלית)',
    'admin.subcategoryLabelEn': 'תת-קטגוריה (אנגלית)',
    'admin.soldByEn': 'נמכר ב... (אנגלית)',
    'admin.englishSection': 'שדות באנגלית (לתצוגה דו-שפתית)',
    'admin.translateAll': 'תרגם הכל לאנגלית',
    'admin.translateBtn': 'תרגם',
    'admin.translateDone': 'התרגום הושלם ✓',
    'admin.translateNoText': 'אין טקסט לתרגום',
    'admin.translateError': 'שגיאה בתרגום — נסה שוב',
    'admin.customerNameEn': 'שם עסק (אותיות לטיניות — תעתיק, לא תרגום)',
    'admin.transliterateBtn': 'תעתיק',
    'admin.transliterateDone': 'הותעתק לאותיות לטיניות ✓',
    'admin.settingsOpeningEn': 'משפטי פתיחה באנגלית (דף נחיתה + הודעת מערכת)',
    'admin.translateOpeningAll': 'תרגם הכל לאנגלית',
    'admin.systemMsgEn': 'הודעת מערכת (אנגלית)',
    'admin.landingTitleEn': 'כותרת נחיתה (אנגלית)',
    'admin.landingSubtitleEn': 'תת-כותרת נחיתה (אנגלית)',

    /* --- Error page --- */
    'error.oops': 'אופס, משהו השתבש.',
    'error.refresh': 'לחץ כאן כדי לרענן'
  };

  /* ==============================
     ENGLISH DICTIONARY
     ============================== */
  var _en = {
    /* --- Language Selector --- */
    'lang.btn': 'עברית / English',
    'lang.title': 'Choose Language / בחר שפה',
    'lang.hebrew': 'עברית',
    'lang.english': 'English',
    'lang.remember': 'Remember my choice',
    'lang.remember_en': 'Remember my choice',
    'lang.save': 'Confirm',

    /* --- Common --- */
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.send': 'Send',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.total': 'Total',
    'common.sku': 'SKU',
    'common.price': 'Price',
    'common.qty': 'Qty',
    'common.date': 'Date',
    'common.status': 'Status',
    'common.actions': 'Actions',
    'common.notes': 'Notes',
    'common.description': 'Description',
    'common.name': 'Name',
    'common.phone': 'Phone',
    'common.email': 'Email',
    'common.currency': '₪',
    'common.units': 'units',
    'common.products': 'products',
    'common.all': 'All',
    'common.noData': 'No data',
    'common.lastUpdate': 'Last updated',

    /* --- Header --- */
    'header.admin': 'Admin',
    'header.adminPanel': 'Admin Panel',
    'header.hello': 'Hello, ',
    'header.logout': 'Logout',
    'header.login': 'Login',
    'header.logoMark': 'Y',
    'header.logoName': 'Yashir',
    'header.logoTagline': 'Marketing & Distribution',
    'header.cart': 'Cart',

    /* --- Floating Buttons --- */
    'float.startOrder': 'Start Order',
    'float.catalog': 'Our Catalog',
    'float.requestProduct': 'Request New Product',
    'float.fullCatalog': 'Full Catalog',
    'float.home': 'Home',

    /* --- Landing --- */
    'landing.companyName': 'Yashir Marketing & Distribution',
    'landing.toCatalog': 'Product Catalog',
    'landing.startOrder': 'Start Order',
    'landing.quality': 'Quality Products',
    'landing.shipping': 'Fast Delivery',
    'landing.service': 'Personal Service',

    /* --- Login --- */
    'login.title': 'Customer Login',
    'login.subtitle': 'Enter your business ID',
    'login.hpLabel': 'Business ID / Tax Number',
    'login.hpPlaceholder': '123456789',
    'login.passwordLabel': 'Password',
    'login.passwordPlaceholder': 'Enter password if set',
    'login.passwordHint': 'If customer has no password, you can login with Business ID only',
    'login.remember': 'Remember me for 30 days',
    'login.loginBtn': 'Login',
    'login.guest': 'Guest?',
    'login.toCatalog': 'Catalog',
    'login.missingHp': 'Please enter business ID',
    'login.notFound': 'Business ID not found',
    'login.welcome': 'Welcome to Yashir.',
    'login.freeShipping': 'Free shipping on orders above',
    'login.adminWrong': 'Wrong admin code',

    /* --- Catalog --- */
    'catalog.searchPlaceholder': 'Search by product name or SKU...',
    'catalog.categories': 'Categories',
    'catalog.subcategories': 'Subcategories',
    'catalog.clearFilters': 'Clear Filters',
    'catalog.adminView': 'Admin View — All Prices',
    'catalog.personalProducts': 'Your Products — Personal Prices',
    'catalog.fullCatalog': 'Full Catalog',
    'catalog.backToPersonal': 'Back to My Products',
    'catalog.noProducts': 'No products found',
    'catalog.inStock': 'In Stock',
    'catalog.outOfStock': 'Out of Stock',
    'catalog.specialPrice': 'Special price for you',
    'catalog.unitsInPack': 'units/pack',
    'catalog.soldBy': 'Sold by',
    'catalog.unitsIn': 'units per',
    'catalog.bulkDiscount': 'Bulk discount:',
    'catalog.from': 'From ',
    'catalog.personalQuote': 'Price on request',
    'catalog.loginToOrder': 'Login to order',
    'catalog.requestQuote': 'Request a Quote',
    'catalog.inCart': 'in cart',
    'catalog.update': 'Update',
    'catalog.addToCart': 'Add',
    'catalog.oosDelay': 'May be delayed — Out of stock',
    'catalog.loginToOrderBtn': 'Login to Order',
    'catalog.lineTotal': 'Total',
    'catalog.bulkDiscountLabel': 'Bulk discount',
    'catalog.moreFor': 'More',
    'catalog.toGet': 'to get',
    'catalog.order': 'Order',
    'catalog.toFullCatalog': 'Full Catalog',
    'catalog.quoteModalTitle': 'Request a Quote',
    'catalog.quoteModalText': 'Send a quote request for:',
    'catalog.quoteModalNote': 'Our representative will get back to you with a personal price soon.',
    'catalog.sendRequest': 'Send Request',
    'catalog.requestSent': 'Request sent! We\'ll contact you soon',
    'catalog.quoteDuplicateMerged': 'Existing request for this product was updated (no duplicate)',
    'catalog.newProductTitle': 'Request New Product',
    'catalog.newProductText': 'Couldn\'t find what you\'re looking for? Write to us and we\'ll send a quote.',
    'catalog.productNameLabel': 'Product Name / Description',
    'catalog.productNamePlaceholder': 'E.g.: 6oz white paper cup',
    'catalog.estQtyLabel': 'Estimated Quantity (optional)',
    'catalog.estQtyPlaceholder': 'E.g.: 500',
    'catalog.extraNotesLabel': 'Additional Notes (optional)',
    'catalog.extraNotesPlaceholder': 'More details...',
    'catalog.enterProductName': 'Please enter product name',
    'catalog.loginFirst': 'Please log in first',
    'catalog.qtyUpdated': 'Quantity updated ✓',
    'catalog.removedFromCart': 'Removed from cart',

    /* --- Cart --- */
    'cart.empty': 'Cart is empty',
    'cart.toCatalog': 'Catalog',
    'cart.personalDiscount': 'Personal discount',
    'cart.bulkDiscount': 'Bulk discount',
    'cart.discount': 'Discount',
    'cart.oosNote': 'Out of stock — may be delayed',
    'cart.shippingFee': 'Shipping Fee',
    'cart.backToEdit': 'Back to Edit',
    'cart.title': 'Shopping Cart',
    'cart.items': 'items',
    'cart.subtotal': 'Subtotal (before VAT)',
    'cart.vat': 'VAT (18%)',
    'cart.totalWithVat': 'Total (incl. VAT)',
    'cart.savings': 'You saved on this order:',
    'cart.moreForFreeShipping': 'More',
    'cart.forFreeShipping': 'for free shipping (before VAT)',
    'cart.freeShipping': 'Free shipping!',
    'cart.orderNotes': 'Order Notes',
    'cart.notesPlaceholder': 'Optional notes...',
    'cart.submitOrder': 'Submit Order',
    'cart.oosWarningTitle': 'Attention — Items out of stock',
    'cart.oosWarningText': 'There may be a one-day delay in shipping for these items.',
    'cart.confirmAnyway': 'Confirm & Send Anyway',
    'cart.shippingWarningTitle': 'Attention — Shipping fee will be added',
    'cart.orderLessThan': 'Order is less than ₪',
    'cart.beforeVat': '(before VAT)',
    'cart.shippingAdded': 'Shipping fee will be added:',
    'cart.confirmSend': 'Confirm & Send',
    'cart.perUnit': '/unit',
    'cart.addedToCart': 'Added to cart ✓',
    'cart.addedOos': 'Added to cart ✓ (out of stock)',
    'cart.oosToast': 'Product out of stock — may be delayed by a day',
    'cart.orderSaveFailed': 'Could not save your order. Check your connection and try again.',
    'cart.priceMismatchRepriced': 'Prices were updated — please review your cart and try again.',
    'cart.priceUpdatedPerPriceList': 'Product price was updated to match the current price list.',
    'cart.pricePlanIntro': 'Product prices were updated to match the current price list.',
    'cart.pricePlanQty': 'Qty:',
    'cart.pricePlanLineImpact': 'Line impact:',
    'cart.pricePlanTotalImpact': 'Estimated cart change (excl. VAT):',
    'cart.pricePlanTotalNote': 'Based on quantities in your cart',
    'cart.priceAckTitle': 'Price update',
    'cart.priceAckProduct': 'Product:',
    'cart.priceAckOld': 'Previous price:',
    'cart.priceAckNew': 'New price:',
    'cart.priceAckDiff': 'Change:',
    'cart.priceAckContinue': 'Got it / Continue',
    'cart.productMissing': 'A product is no longer available. Refresh the catalog.',

    /* --- Success --- */
    'success.title': 'Your order at Yashir has been received!',
    'success.subtitle': 'Thank you for choosing Yashir and trusting us,<br>Your order is now being processed and will be shipped soon.',
    'success.orderNum': 'Order number:',
    'success.newOrder': 'New Order',
    'success.orderNotFound': 'Order details not found',
    'success.companyName': 'Yashir Marketing & Distribution',
    'success.deliveryNote': 'Delivery Note',
    'success.customer': 'Customer:',
    'success.orderNumber': 'Order number:',
    'success.dateLabel': 'Date:',
    'success.productName': 'Product Name',
    'success.unitPrice': 'Unit Price',
    'success.subtotalLabel': 'Subtotal (before VAT):',
    'success.vatLabel': 'VAT (18%):',
    'success.grandTotal': 'Grand Total:',
    'success.popupBlocked': 'Popup blocked — please allow popups in your browser',
    'success.totalCol': 'Total',
    'success.discountCol': 'Discount',
    'success.totalPayCol': 'Total to Pay',

    /* --- System Messages --- */
    'sys.title': 'System Message',
    'sys.understood': 'Got it, thanks',
    'sys.adminAccess': 'System Management',
    'sys.accessCode': 'Access Code',
    'sys.wrongCode': 'Wrong code',
    'sys.lowStockAlert': 'Low Stock Alert',
    'sys.lowStockTitle': 'Low Stock!',
    'sys.lowStockMsg': 'Remaining:',
    'sys.unitsOnly': 'units only.',

    /* --- Admin Common --- */
    'admin.panelTitle': 'Admin Panel — Yashir',
    'admin.orders': 'Orders',
    'admin.customers': 'Customers',
    'admin.productsTab': 'Products',
    'admin.suppliers': 'Suppliers',
    'admin.quoteRequests': 'Quote Requests',
    'admin.productRequests': 'Product Requests',
    'admin.profit': 'Profit',
    'admin.stats': 'Statistics',
    'admin.financial': 'Financial',
    'admin.settingsTab': 'Settings',

    /* --- Admin Orders --- */
    'admin.statusNew': 'New',
    'admin.statusProcessing': 'Processing',
    'admin.statusReady': 'Ready to Ship',
    'admin.statusShipped': 'Shipped',
    'admin.statusDelivered': 'Delivered',
    'admin.newOrders': 'new',
    'admin.totalOrders': 'total',
    'admin.orderNumber': 'Number',
    'admin.customerCol': 'Customer',
    'admin.dateCol': 'Date',
    'admin.totalCol': 'Total',
    'admin.statusCol': 'Status',
    'admin.paymentCol': 'Payment',
    'admin.actionsCol': 'Actions',
    'admin.noOrders': 'No orders yet',
    'admin.beforeVat': 'Before VAT:',
    'admin.withVat': 'Incl. VAT:',
    'admin.paid': '✅ Paid',
    'admin.pending': '⏳ Pending',
    'admin.view': 'View',
    'admin.deliveryNote': 'Note',
    'admin.deleteOrder': 'Delete Order',
    'admin.statusUpdated': 'Status updated',
    'admin.markedPaid': 'Marked as paid ✅',
    'admin.markedPending': 'Marked as pending',
    'admin.newOrdersWaiting': 'new orders waiting!',
    'admin.pendingOrdersMsg': 'There are new orders that haven\'t been processed yet.',
    'admin.viewOrders': 'View Orders',
    'admin.later': 'Later',
    'admin.deleteConfirm': 'Delete order #',
    'admin.cannotRestore': '? Cannot be undone.',
    'admin.orderDeleted': 'Order deleted',
    'admin.orderNotFound': 'Order not found',
    'admin.order': 'Order',
    'admin.product': 'Product',
    'admin.qtyCol': 'Qty',
    'admin.discountCol': 'Discount',
    'admin.savingsLabel': 'Savings:',
    'admin.notesLabel': 'Notes:',
    'admin.printDelivery': 'Delivery Note',

    /* --- Admin Customers --- */
    'admin.addCustomer': 'Add Customer',
    'admin.hpCol': 'Business ID',
    'admin.nameCol': 'Name',
    'admin.phoneCol': 'Phone',
    'admin.discountColCust': 'Discount',
    'admin.paymentTerms': 'Payment Terms',
    'admin.existingDebt': 'Existing Debt',
    'admin.pricesCol': 'Prices',
    'admin.personalPrices': 'Personal Prices',
    'admin.addNewCustomer': 'Add New Customer',
    'admin.editCustomer': 'Edit',
    'admin.hpField': 'Business ID / Tax Number',
    'admin.hpChangeWarning': '⚠️ Changing Business ID will update the customer ID across the system',
    'admin.hpChangeConfirm': 'The new Business ID will update all old orders. If this is not a root mistake, better to open a new customer. Continue?',
    'admin.passwordField': 'Customer Password',
    'admin.passwordHint': 'If password is set, customer must enter it to login. If not - login by Business ID only',
    'admin.businessName': 'Business Name',
    'admin.address': 'Address',
    'admin.shippingContact': 'Shipping Contact',
    'admin.shippingAddress': 'Shipping Address',
    'admin.generalDiscount': 'General Discount (%)',
    'admin.personalShipping': 'Personal Shipping Cost (₪)',
    'admin.existingDebtField': 'Existing Debt (₪)',
    'admin.paymentTermsField': 'Payment Terms',
    'admin.cash': 'Cash',
    'admin.hpNameRequired': 'Business ID and Name are required',
    'admin.hpExists': 'already exists in the system',
    'admin.customerSaved': 'Customer saved ✅',
    'admin.deleteCustomerConfirm': 'Delete customer',
    'admin.customerDeleted': 'Customer deleted',
    'admin.personalPricesTitle': 'Personal Prices —',
    'admin.priceInstr': 'Enter price in ₪ <strong>or</strong> discount in %. Customer will see discount percentage.',
    'admin.generalLabel': 'General:',
    'admin.savePrices': 'Save Prices',
    'admin.pricesSaved': 'Personal prices saved ✅',

    /* --- Admin Products --- */
    'admin.addProduct': 'Add Product',
    'admin.importJson': 'Import JSON',
    'admin.skuCol': 'SKU',
    'admin.nameProductCol': 'Name',
    'admin.categoryCol': 'Category',
    'admin.priceCol': 'Price',
    'admin.packagingCol': 'Packaging',
    'admin.bulkDiscountCol': 'Bulk Discount',
    'admin.stockCol': 'Stock',
    'admin.uploadPhoto': 'Upload Photo',
    'admin.deleteProduct': 'Delete Product',
    'admin.uploading': 'Uploading image...',
    'admin.uploaded': '✓ Image uploaded successfully',
    'admin.editProductTitle': 'Edit Product —',
    'admin.productName': 'Product Name',
    'admin.priceBeforeVat': 'Base Price (₪) — before VAT',
    'admin.stock': 'Stock',
    'admin.lowStockThreshold': 'Low Stock Threshold',
    'admin.category': 'Category',
    'admin.subcategory': 'Subcategory',
    'admin.newCategory': '➕ New Category...',
    'admin.newSubcategory': '➕ New Subcategory...',
    'admin.enterCatName': 'New category name',
    'admin.enterSubcatName': 'New subcategory name',
    'admin.enterNewSubcat': 'Please enter new subcategory name',
    'admin.subcategoryCol': 'Subcategory',
    'admin.selectSubcategory': '-- Select Subcategory --',
    'admin.noSubcategory': 'No Subcategory',
    'admin.packagingDetails': 'Packaging & Sales Details',
    'admin.unitsInPack': 'Units per Package',
    'admin.soldBy': 'Sold By...',
    'admin.selectSoldBy': '-- Select --',
    'admin.unitsInContainer': 'Units per Carton/Pack/Sack',
    'admin.bulkDiscountEditor': 'Bulk Discount',
    'admin.addBulkStep': 'Add Discount Tier',
    'admin.fromQty': 'From ',
    'admin.unitsDiscount': 'units discount',
    'admin.productImage': 'Product Image',
    'admin.noImageYet': 'No image yet',
    'admin.chooseImage': 'Choose Image from Computer',
    'admin.saveDetails': 'Save Details',
    'admin.uploadedLinked': '✓ Image uploaded and linked to product',
    'admin.enterNewCat': 'Please enter new category name',
    'admin.productUpdated': 'Product updated',
    'admin.deleteProductConfirm': 'Delete product "',
    'admin.cannotRestoreProduct': '"? Cannot be undone.',
    'admin.productDeleted': 'Product deleted',
    'admin.addNewProduct': 'Add New Product',
    'admin.skuNumber': 'SKU (number)',
    'admin.priceBeforeVatShort': 'Price (₪) — before VAT',
    'admin.minimumPrice': 'Minimum Allowed Price (₪)',
    'admin.minimumPriceHint': 'The lowest price that can be set for a customer for this product',
    'admin.priceError': 'This is less than the allowed price for the product',
    'admin.skuNameRequired': 'SKU and Name are required',
    'admin.productAdded': 'Product added',
    'admin.importTitle': 'Import Products from List',
    'admin.importText': 'Paste product list in JSON format. Required fields: <strong>sku, name, category, price, stock</strong>',
    'admin.importBtn': 'Import Products',
    'admin.importError': 'JSON format error',
    'admin.importMissing': 'Missing required fields',
    'admin.imported': 'Imported',
    'admin.importedProducts': 'products',
    'admin.hasBulk': '✓ Yes',
    'admin.outOfStockLabel': '0 — Out',
    'admin.soldByCarton': 'Carton',
    'admin.soldBySack': 'Sack',
    'admin.soldByPack': 'Pack',
    'admin.soldByBundle': 'Bundle',
    'admin.soldByCrate': 'Crate',
    'admin.soldByPallet': 'Pallet',

    /* --- Admin Quote Requests --- */
    'admin.quoteRequestsTitle': 'Quote Requests',
    'admin.quoteWaiting': 'waiting',
    'admin.quoteApproved': 'Approved',
    'admin.quotePending': 'Pending',
    'admin.quoteRequestedProduct': 'Product',
    'admin.approvedPrice': 'Approved Price',
    'admin.action': 'Action',
    'admin.approvePrice': 'Approve Price',
    'admin.noQuoteRequests': 'No requests yet',
    'admin.firestoreNotConnected': 'Firestore not connected',
    'admin.loadError': 'Error loading requests',
    'admin.approveQuoteTitle': 'Approve Quote',
    'admin.personalPriceLabel': 'Personal price for customer (₪, before VAT)',
    'admin.enterPrice': 'Enter price',
    'admin.confirmApprove': 'Approve & Update Price',
    'admin.enterValidPrice': 'Please enter a valid price',
    'admin.priceApproved': 'Price approved and updated ✅',

    /* --- Admin Product Requests --- */
    'admin.productRequestsTitle': 'New Product Requests',
    'admin.newRequests': 'new',
    'admin.handled': 'Handled',
    'admin.requestedProduct': 'Requested Product',
    'admin.estQty': 'Est. Qty:',
    'admin.markHandled': 'Mark as Handled',
    'admin.noProductRequests': 'No requests yet',
    'admin.markedHandled': 'Marked as handled',

    /* --- Admin Stats --- */
    'admin.statsTitle': 'Statistics',
    'admin.thisMonth': 'This Month',
    'admin.allTime': 'All Time',
    'admin.monthlyIncome': 'Monthly Revenue',
    'admin.topProduct': 'Top Product',
    'admin.topCustomer': 'Top Customer',
    'admin.totalIncome': 'Total Revenue',
    'admin.ordersCount': 'orders',
    'admin.productSalesReport': 'Product Sales Report',
    'admin.qtySold': 'Qty Sold',
    'admin.revenue': 'Revenue',
    'admin.initialStock': 'Initial Stock',
    'admin.currentStock': 'Current Stock',
    'admin.salesStockRatio': 'Sales/Stock Ratio',
    'admin.noData': 'No data for this period',
    'admin.biDashboardTitle': 'BI Dashboard',
    'admin.biOrdersOnlyNote': 'All metrics are calculated from order line items only',
    'admin.daily': 'Daily',
    'admin.weekly': 'Weekly',
    'admin.monthly': 'Monthly',
    'admin.quantitySold': 'Quantity Sold',
    'admin.stockMovement': 'Stock Movement',
    'admin.productUnitsOnly': 'Sale products only',
    'admin.fromOrderItems': 'From order items',
    'admin.periodComparison': 'Previous Period Comparison',
    'admin.revenueChange': 'Revenue change',
    'admin.salesChange': 'Sales change',
    'admin.revenueOverTime': 'Revenue Over Time',
    'admin.salesQuantityOverTime': 'Sales Quantity Over Time',
    'admin.profitTrend': 'Profit Trend',
    'admin.top10ByRevenue': 'Top 10 Products by Revenue',
    'admin.top10ByQuantity': 'Top 10 Products by Quantity',
    'admin.trend': 'Trend',
    'admin.stockMovementReport': 'Stock Movement Report by Orders',
    'admin.notDerivable': 'Not derivable',
    'admin.fromOrderCosts': 'From costs stored in orders',
    'admin.missingOrderCosts': 'Missing cost data in order items',
    'admin.unknownProduct': 'Unknown Product',

    /* --- Admin Low Stock --- */
    'admin.lowStock': 'Low Stock',
    'admin.lowStockTitle': 'Low Stock Products',
    'admin.minThreshold': 'Min Threshold',
    'admin.shortage': 'Shortage',
    'admin.noLowStockProducts': 'No low stock products 😊',
    'admin.negativeStock': 'Negative Stock',

    /* --- Admin Settings --- */
    'admin.settingsTitle': 'System Settings',
    'admin.minOrder': 'Minimum order for free shipping (₪, before VAT)',
    'admin.defaultShipping': 'Default shipping cost (₪)',
    'admin.systemMsg': 'System message (shown to customers after login)',
    'admin.landingTitle': 'Main title on landing page',
    'admin.landingSubtitle': 'Subtitle / description on landing page',
    'admin.adminPin': 'Admin Code (PIN)',
    'admin.saveSettings': 'Save Settings',
    'admin.pinTooShort': 'Admin code must be at least 4 characters',
    'admin.settingsSaved': 'Settings saved',

    /* --- Admin Financial --- */
    'admin.financialTitle': 'Financial Management',
    'admin.addRecord': 'Add Record',
    'admin.addIncomeExpense': 'Add Income / Expense',
    'admin.expense': 'Expense',
    'admin.extraIncome': 'Additional Income',
    'admin.catPlaceholder': 'Rent, Marketing, Equipment...',
    'admin.amount': 'Amount (₪)',
    'admin.amountEnteredAs': 'Amount entered as',
    'admin.withVatOption': 'Including VAT (after VAT)',
    'admin.withoutVatOption': 'Excluding VAT (before VAT)',
    'admin.descAmountRequired': 'Description and amount required',
    'admin.savedSuccess': 'Saved successfully',
    'admin.saveError': 'Error saving',
    'admin.deleted': 'Deleted',
    'admin.deleteRecordConfirm': 'Delete this record?',
    'admin.salesRevenue': 'Sales Revenue',
    'admin.expenses': 'Expenses',
    'admin.manualIncome': 'Additional Manual Income',
    'admin.beforeVatLabel': 'Before VAT',
    'admin.afterVatLabel': 'After VAT',
    'admin.profitSummary': 'Profitability Summary',
    'admin.salesProfit': 'Sales Profit (revenue minus expenses)',
    'admin.manualProfit': 'Profit/Loss — manual income & expenses',
    'admin.netProfit': 'Total Net Profit',
    'admin.manualTransactions': 'Manual Income / Expenses',
    'admin.typeCol': 'Type',
    'admin.categoryColFin': 'Category',
    'admin.beforeVatCol': 'Before VAT',
    'admin.afterVatCol': 'After VAT',
    'admin.deleteCol': 'Delete',
    'admin.noRecordsInPeriod': 'No records in this period',
    'admin.incomeType': '▲ Income',
    'admin.expenseType': '▼ Expense',
    'admin.periodMonth': 'This Month',
    'admin.periodQuarter': 'Quarter',
    'admin.periodHalfYear': 'Half Year',
    'admin.periodYear': 'This Year',
    'admin.periodAll': 'All Time',
    'admin.incomeOrders': 'Revenue (Orders)',
    'admin.expensesLabel': 'Expenses',
    'admin.profitLabel': 'Profit',
    'admin.lossLabel': 'Loss',
    'admin.noRecords': 'No records yet',

    /* --- Admin Suppliers --- */
    'admin.suppliersTitle': 'Suppliers',
    'admin.addSupplier': 'Add Supplier',
    'admin.supplierName': 'Supplier Name',
    'admin.supplierHp': 'Tax ID',
    'admin.noSuppliers': 'No suppliers yet',
    'admin.editSupplier': 'Edit Supplier',
    'admin.addNewSupplier': 'Add New Supplier',
    'admin.supplierVatId': 'Business ID / Tax Number',
    'admin.supplierNotes': 'Notes',
    'admin.supplierNameRequired': 'Supplier name is required',
    'admin.supplierSaved': 'Supplier saved',
    'admin.deleteSupplierConfirm': 'Delete this supplier?',
    'admin.supplierDeleted': 'Supplier deleted',
    'admin.supplierCosts': 'Supplier Costs —',
    'admin.costInstr': 'Enter purchase cost for each product from this supplier',
    'admin.salePrice': 'Sale price:',
    'admin.costPlaceholder': 'Cost',
    'admin.saveCosts': 'Save Costs',
    'admin.costsSaved': 'Costs saved',
    'admin.cannotLoadSuppliers': 'Cannot load suppliers. Make sure Firestore is configured.',
    'admin.supplierProducts': 'products',
    'admin.supplierCostsBtn': 'Product costs',

    /* --- Admin Profit --- */
    'admin.profitTitle': 'Profit by Product',
    'admin.profitSubtitle': 'Sale price vs. supplier cost',
    'admin.profitNote': 'To update supplier costs — go to "Suppliers" tab ↑',
    'admin.priceWithVat': 'Price (incl. VAT)',
    'admin.priceBeforeVatCol': 'Price (before VAT)',
    'admin.supplierCost': 'Supplier Cost',
    'admin.profitWithVat': 'Profit (incl. VAT)',
    'admin.profitBeforeVat': 'Profit (before VAT)',
    'admin.profitPct': '% Profit',
    'admin.supplierCol': 'Supplier',
    'admin.notDefined': 'Not set',

    /* --- Admin English Fields --- */
    'admin.productNameEn': 'Product Name (English)',
    'admin.descriptionEn': 'Description (English)',
    'admin.categoryLabelEn': 'Category (English)',
    'admin.subcategoryLabelEn': 'Subcategory (English)',
    'admin.soldByEn': 'Sold By (English)',
    'admin.englishSection': 'English Fields (bilingual display)',
    'admin.translateAll': 'Translate All to English',
    'admin.translateBtn': 'Translate',
    'admin.translateDone': 'Translation complete ✓',
    'admin.translateNoText': 'No text to translate',
    'admin.translateError': 'Translation error — try again',
    'admin.customerNameEn': 'Business name (Latin letters — transliteration, not translation)',
    'admin.transliterateBtn': 'Transliterate',
    'admin.transliterateDone': 'Transliterated to Latin letters ✓',
    'admin.settingsOpeningEn': 'Opening texts in English (landing + system message)',
    'admin.translateOpeningAll': 'Translate all to English',
    'admin.systemMsgEn': 'System message (English)',
    'admin.landingTitleEn': 'Landing title (English)',
    'admin.landingSubtitleEn': 'Landing subtitle (English)',

    /* --- Error page --- */
    'error.oops': 'Oops, something went wrong.',
    'error.refresh': 'Click here to refresh'
  };

  init();

  return {
    t: t,
    pLang: pLang,
    getLang: getLang,
    setLang: setLang,
    isRemembered: isRemembered,
    init: init
  };
})();

function t(key) { return I18n.t(key); }
function pLang(product, field) { return I18n.pLang(product, field); }

var AutoTranslate = (function () {
  'use strict';

  function translate(text, onSuccess, onError) {
    if (!text || !text.trim()) { onSuccess && onSuccess(''); return; }
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=he&tl=en&dt=t&q=' + encodeURIComponent(text);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          var result = '';
          if (data && data[0]) {
            data[0].forEach(function (seg) { if (seg[0]) result += seg[0]; });
          }
          onSuccess && onSuccess(result);
        } catch (e) { onError && onError(e); }
      } else { onError && onError(xhr.status); }
    };
    xhr.onerror = function () { onError && onError('network'); };
    xhr.send();
  }

  function translateField(heFieldId, enFieldId) {
    var heInp = document.getElementById(heFieldId);
    var enInp = document.getElementById(enFieldId);
    if (!heInp || !enInp) return;
    var text = heInp.value.trim();
    if (!text) { App.toast(t('admin.translateNoText'), 'warning'); return; }
    enInp.value = '...';
    enInp.style.opacity = '0.5';
    translate(text, function (result) {
      enInp.value = result;
      enInp.style.opacity = '1';
    }, function () {
      enInp.value = '';
      enInp.style.opacity = '1';
      App.toast(t('admin.translateError'), 'error');
    });
  }

  function translateAll(pairs) {
    var pending = pairs.length;
    var anyText = false;
    pairs.forEach(function (pair) {
      var heInp = document.getElementById(pair[0]);
      var enInp = document.getElementById(pair[1]);
      if (!heInp || !enInp || !heInp.value.trim()) { pending--; return; }
      anyText = true;
      enInp.value = '...';
      enInp.style.opacity = '0.5';
      translate(heInp.value.trim(), function (result) {
        enInp.value = result;
        enInp.style.opacity = '1';
        pending--;
        if (pending <= 0) App.toast(t('admin.translateDone'), 'success');
      }, function () {
        enInp.value = '';
        enInp.style.opacity = '1';
        pending--;
      });
    });
    if (!anyText) App.toast(t('admin.translateNoText'), 'warning');
  }

  return { translate: translate, translateField: translateField, translateAll: translateAll };
})();

var AutoTransliterate = (function () {
  'use strict';

  var MAP = {
    'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'ch', 'ט': 't',
    'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's',
    'ע': 'a', 'פ': 'p', 'ף': 'p', 'צ': 'tz', 'ץ': 'tz', 'ק': 'q', 'ר': 'r', 'ש': 'sh', 'ת': 't',
    '׳': "'", '״': '"', '־': '-', ' ': ' ', '\t': '\t', '\n': '\n', '\r': '\n'
  };

  function stripMarks(s) {
    return s.replace(/[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C7\u200E\u200F\u202A-\u202E]/g, '');
  }

  function capitalizeWords(s) {
    return s.split(/\s+/).map(function (w) {
      if (!w) return '';
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).filter(Boolean).join(' ');
  }

  function hebrewToLatin(text) {
    if (!text) return '';
    var s = stripMarks(text);
    var out = '';
    var punct = ' .,;:!?–—()-/&+"\'@#$%*+=[]{}|<>';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      var rep = MAP[ch];
      if (rep !== undefined) {
        out += rep;
        continue;
      }
      if (ch >= '0' && ch <= '9') { out += ch; continue; }
      if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z')) { out += ch; continue; }
      if (punct.indexOf(ch) >= 0) { out += ch; continue; }
    }
    return capitalizeWords(out.replace(/\s+/g, ' ').trim());
  }

  function fillField(heFieldId, enFieldId) {
    var heInp = document.getElementById(heFieldId);
    var enInp = document.getElementById(enFieldId);
    if (!heInp || !enInp) return;
    if (!heInp.value.trim()) { App.toast(t('admin.translateNoText'), 'warning'); return; }
    enInp.value = hebrewToLatin(heInp.value);
    App.toast(t('admin.transliterateDone'), 'success');
  }

  return { hebrewToLatin: hebrewToLatin, fillField: fillField };
})();

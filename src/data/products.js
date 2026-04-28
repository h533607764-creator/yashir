// נתונים סטטיים — משמשים כ-fallback אם Firestore לא זמין
var PRODUCTS_STATIC = [
  {
    id:'cup-001', sku:'1001', name:"כוס קפה חד-פעמית 8 אונ׳", category:'cups', categoryLabel:'כוסות',
    subcategory:'hot', subcategoryLabel:'שתייה חמה',
    name_en:'8oz Disposable Coffee Cup', categoryLabel_en:'Cups',
    subcategoryLabel_en:'Hot Drinks', description_en:'Cardboard cup with PE coating for hot drinks up to 85°C',
    soldBy_en:'Carton',
    price:89, stock:150, icon:'☕', bgColor:'#2d1e14',
    description:"כוס קרטון עם ציפוי PE לשתייה חמה עד 85°",
    image:null,
    unitsPerPackage:100, soldBy:'קרטון', unitsPerContainer:1000,
    bulkDiscounts:[{minQty:5,discountPct:5},{minQty:10,discountPct:10}]
  },
  {
    id:'cup-002', sku:'1002', name:"כוס קפה חד-פעמית 12 אונ׳", category:'cups', categoryLabel:'כוסות',
    subcategory:'hot', subcategoryLabel:'שתייה חמה',
    name_en:'12oz Disposable Coffee Cup', categoryLabel_en:'Cups',
    subcategoryLabel_en:'Hot Drinks', description_en:'Large size for Americano, Latte and iced coffee',
    soldBy_en:'Carton',
    price:99, stock:80, icon:'☕', bgColor:'#2d1e14',
    description:"גדולה לאמריקנו, לאטה וקפה קר",
    image:null,
    unitsPerPackage:100, soldBy:'קרטון', unitsPerContainer:800,
    bulkDiscounts:[]
  },
  {
    id:'cup-003', sku:'1003', name:"כוס שתייה קרה 9 אונ׳", category:'cups', categoryLabel:'כוסות',
    subcategory:'cold', subcategoryLabel:'שתייה קרה',
    name_en:'9oz Cold Drink Cup', categoryLabel_en:'Cups',
    subcategoryLabel_en:'Cold Drinks', description_en:'Clear plastic cup for cold drinks and juice',
    soldBy_en:'Carton',
    price:79, stock:0, icon:'🥤', bgColor:'#141e2d',
    description:"כוס פלסטיק שקופה לשתייה קרה ומיץ",
    image:null,
    unitsPerPackage:100, soldBy:'קרטון', unitsPerContainer:1200,
    bulkDiscounts:[]
  },
  {
    id:'plt-001', sku:'2001', name:'צלחת מקרטון עגולה 7"', category:'plates', categoryLabel:'צלחות',
    subcategory:'cardboard', subcategoryLabel:'קרטון',
    name_en:'7" Round Cardboard Plate', categoryLabel_en:'Plates',
    subcategoryLabel_en:'Cardboard', description_en:'Strong white cardboard plate for hot and cold food',
    soldBy_en:'Carton',
    price:69, stock:200, icon:'🍽️', bgColor:'#142d1e',
    description:"צלחת קרטון לבנה חזקה לאוכל חם וקר",
    image:null,
    unitsPerPackage:100, soldBy:'קרטון', unitsPerContainer:1000,
    bulkDiscounts:[{minQty:5,discountPct:7}]
  },
  {
    id:'plt-002', sku:'2002', name:'צלחת מקרטון מחולקת 9"', category:'plates', categoryLabel:'צלחות',
    subcategory:'cardboard', subcategoryLabel:'קרטון',
    name_en:'9" Divided Cardboard Plate', categoryLabel_en:'Plates',
    subcategoryLabel_en:'Cardboard', description_en:'3 separate compartments for events and food with sides',
    soldBy_en:'Sack',
    price:89, stock:45, icon:'🍱', bgColor:'#142d1e',
    description:"3 תאים נפרדים לאירועים ואוכל עם תוספות",
    image:null,
    unitsPerPackage:100, soldBy:'שק', unitsPerContainer:500,
    bulkDiscounts:[]
  },
  {
    id:'plt-003', sku:'2003', name:'צלחת פלסטיק חזקה 9"', category:'plates', categoryLabel:'צלחות',
    subcategory:'plastic', subcategoryLabel:'פלסטיק',
    name_en:'9" Heavy Duty Plastic Plate', categoryLabel_en:'Plates',
    subcategoryLabel_en:'Plastic', description_en:'American-style rigid heat-resistant plastic',
    soldBy_en:'Pack',
    price:119, stock:0, icon:'🍽️', bgColor:'#142d1e',
    description:"פלסטיק קשיח אמריקאי עמיד לחום",
    image:null,
    unitsPerPackage:50, soldBy:'מארז', unitsPerContainer:500,
    bulkDiscounts:[]
  },
  {
    id:'nap-001', sku:'3001', name:"מפית נייר לבנה 33×33", category:'napkins', categoryLabel:'מפיות',
    subcategory:'table', subcategoryLabel:'שולחן',
    name_en:'White Paper Napkin 33x33', categoryLabel_en:'Napkins',
    subcategoryLabel_en:'Table', description_en:'2-ply napkin for table and events',
    soldBy_en:'Carton',
    price:49, stock:300, icon:'🗒️', bgColor:'#1e142d',
    description:"מפית 2 שכבות לשולחן ואירועים",
    image:null,
    unitsPerPackage:100, soldBy:'קרטון', unitsPerContainer:3000,
    bulkDiscounts:[{minQty:10,discountPct:8}]
  },
  {
    id:'nap-002', sku:'3002', name:"מפית נייר צבעונית 25×25", category:'napkins', categoryLabel:'מפיות',
    subcategory:'color', subcategoryLabel:'צבעוניות',
    name_en:'Colored Paper Napkin 25x25', categoryLabel_en:'Napkins',
    subcategoryLabel_en:'Colorful', description_en:'Seasonal colorful designs',
    soldBy_en:'Carton',
    price:59, stock:120, icon:'🎨', bgColor:'#2d1420',
    description:"עיצובים עונתיים צבעוניים",
    image:null,
    unitsPerPackage:100, soldBy:'קרטון', unitsPerContainer:2500,
    bulkDiscounts:[]
  },
  {
    id:'nap-003', sku:'3003', name:"מפית קוקטייל 25×25", category:'napkins', categoryLabel:'מפיות',
    subcategory:'cocktail', subcategoryLabel:'קוקטייל',
    name_en:'Cocktail Napkin 25x25', categoryLabel_en:'Napkins',
    subcategoryLabel_en:'Cocktail', description_en:'Small and elegant for bars and parties',
    soldBy_en:'Carton',
    price:39, stock:60, icon:'🍹', bgColor:'#1e142d',
    description:"קטנה ומהודרת לבר ומסיבות",
    image:null,
    unitsPerPackage:200, soldBy:'קרטון', unitsPerContainer:4000,
    bulkDiscounts:[]
  }
];

// המערך הפעיל — מתעדכן מ-Firestore בזמן טעינה
var PRODUCTS = PRODUCTS_STATIC.slice();

/** Keeps global PRODUCTS and window.PRODUCTS identical (localStorage + Firestore paths). */
function setYashirProductsList(arr) {
  if (!arr || !arr.length) return;
  PRODUCTS = arr.slice();
  window.PRODUCTS = PRODUCTS;
}
window.setYashirProductsList = setYashirProductsList;

var SHIPPING_PRODUCT = {
  id:'ship-1000', sku:'1000', name:'דמי משלוח', category:'shipping',
  categoryLabel:'משלוח', price:45, stock:999, icon:'🚚', bgColor:'#141414', description:'',
  name_en:'Shipping Fee', categoryLabel_en:'Shipping', description_en:'',
  bulkDiscounts:[]
};

/* Addon: detect catalog price changes before Cart._repriceAll (does not replace Pricing). */
var _productSnapshotPassIndex = 0;

function _notifyCartIfEffectivePriceChangedFromCatalog(previousProducts, incomingLoaded) {
  if (!window.App || !App.Auth || !App.Auth.isCustomer()) return;
  if (!App.state || !App.state.cart || !App.state.cart.length) return;
  if (!previousProducts || !previousProducts.length || !incomingLoaded || !incomingLoaded.length) return;
  if (_productSnapshotPassIndex < 2) return;

  var customer = App.state.currentUser.customer;
  var pricing = App.Pricing;
  var threshold = 0.01;
  var lineChanged = false;

  for (var i = 0; i < App.state.cart.length; i++) {
    var item = App.state.cart[i];
    var pid = item.product && item.product.id;
    if (!pid) continue;
    var oldP = previousProducts.find(function (x) { return x.id === pid; });
    var newP = incomingLoaded.find(function (x) { return x.id === pid; });
    if (!oldP || !newP) continue;
    var q = parseInt(item.qty, 10);
    if (isNaN(q) || q < 1) q = 1;
    q = Math.min(999, q);
    var epOld = pricing.getEffectiveUnitPrice(oldP, customer, q);
    var epNew = pricing.getEffectiveUnitPrice(newP, customer, q);
    if (epOld === null || epNew === null) continue;
    if (Math.abs(epOld - epNew) > threshold) {
      lineChanged = true;
      break;
    }
  }

  if (lineChanged && typeof App.toast === 'function' && typeof t === 'function') {
    App.toast(t('cart.priceUpdatedPerPriceList'), 'warning');
  }
}

/* ===================================================
   טעינת מוצרים מ-Firestore
   אם הקולקציה ריקה — מזרים את הנתונים הסטטיים אוטומטית
   =================================================== */
function loadProductsFromFirestore(onSuccess, onError) {
  var TIMEOUT_MS = 6000;
  var done = false;
  var seeding = false;

  var timer = setTimeout(function () {
    if (!done) { done = true; onError && onError(); }
  }, TIMEOUT_MS);

  /* No orderBy: Firestore excludes docs missing the ordered field; cart/catalog need every product. */
  window.DB.collection('products').onSnapshot(function (snapshot) {
      if (!done) { done = true; clearTimeout(timer); }

      if (snapshot.empty) {
        if (!seeding) {
          seeding = true;
          var batch = window.DB.batch();
          PRODUCTS_STATIC.forEach(function (p) {
            batch.set(window.DB.collection('products').doc(p.id), p);
          });
          batch.commit().catch(function () { seeding = false; });
        }
        return;
      }

      var loaded = [];
      snapshot.forEach(function (doc) { loaded.push(doc.data()); });
      loaded.sort(function (a, b) { return String(a.sku || '').localeCompare(String(b.sku || ''), undefined, { numeric: true }); });
      var previousProductsShallow =
        window.PRODUCTS && window.PRODUCTS.length ? window.PRODUCTS.slice() : [];
      setYashirProductsList(loaded);
      try { localStorage.setItem('yashir_products', JSON.stringify(loaded)); } catch (e) {}
      _productSnapshotPassIndex += 1;
      _notifyCartIfEffectivePriceChangedFromCatalog(previousProductsShallow, loaded);
      if (window.App && App.Cart && App.Cart._repriceAll) App.Cart._repriceAll();
      onSuccess && onSuccess();
      if (
        window.App &&
        App.state &&
        App.state.currentView === 'admin' &&
        window.AdminView &&
        AdminView._tab === 'products'
      ) {
        var avc = document.getElementById('av-content');
        if (avc && typeof AdminView._products === 'function') AdminView._products(avc);
      }
    },
    function (err) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      console.warn('Firestore error, using static data:', err);
      setYashirProductsList(PRODUCTS_STATIC);
      onError && onError();
    });
}

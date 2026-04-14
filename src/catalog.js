/* ======================================================
   ישיר – לוגיקת קטלוג מוצרים
   מבנה הנתונים מוכן להחלפה ב-Firebase בעתיד.
   כדי לחבר Firebase: החלף את PRODUCTS_DATA בקריאה ל:
     db.collection('products').get().then(snapshot => ...)
   ====================================================== */

/* ===== נתוני מוצרים ===== */
const PRODUCTS_DATA = [
  /* -------- כוסות -------- */
  {
    id: 'cup-001',
    name: "כוס קפה חד-פעמית 8 אונ׳",
    category: 'cups',
    categoryLabel: 'כוסות',
    price: 89,
    unit: "קרטון 100 יח׳",
    stock: 150,
    icon: '☕',
    bgColor: '#FFF8F0',
    description: "כוס קרטון עם ציפוי PE, מתאימה לשתייה חמה עד 85°",
  },
  {
    id: 'cup-002',
    name: "כוס קפה חד-פעמית 12 אונ׳",
    category: 'cups',
    categoryLabel: 'כוסות',
    price: 99,
    unit: "קרטון 100 יח׳",
    stock: 80,
    icon: '☕',
    bgColor: '#FFF8F0',
    description: "כוס גדולה לאמריקנו, לאטה וקפה קר – עם כיסוי מתאים",
  },
  {
    id: 'cup-003',
    name: "כוס שתייה קרה 9 אונ׳",
    category: 'cups',
    categoryLabel: 'כוסות',
    price: 79,
    unit: "קרטון 100 יח׳",
    stock: 0,
    icon: '🥤',
    bgColor: '#F0F7FF',
    description: "כוס פלסטיק שקופה לשתייה קרה, מיץ ומשקאות מוגזים",
  },

  /* -------- צלחות -------- */
  {
    id: 'plate-001',
    name: 'צלחת קרטון עגולה 7"',
    category: 'plates',
    categoryLabel: 'צלחות',
    price: 69,
    unit: "קרטון 100 יח׳",
    stock: 200,
    icon: '🍽️',
    bgColor: '#F0FFF4',
    description: "צלחת קרטון לבנה חזקה, מתאימה לאוכל חם וקר",
  },
  {
    id: 'plate-002',
    name: 'צלחת קרטון מחולקת 9"',
    category: 'plates',
    categoryLabel: 'צלחות',
    price: 89,
    unit: "קרטון 100 יח׳",
    stock: 45,
    icon: '🍱',
    bgColor: '#F0FFF4',
    description: "3 תאים נפרדים – מושלמת לאירועים ואוכל עם תוספות",
  },
  {
    id: 'plate-003',
    name: 'צלחת פלסטיק חזקה 9"',
    category: 'plates',
    categoryLabel: 'צלחות',
    price: 119,
    unit: "קרטון 50 יח׳",
    stock: 0,
    icon: '🍽️',
    bgColor: '#F0FFF4',
    description: "פלסטיק קשיח אמריקאי – נראה כמו פורצלן, עמיד לחום",
  },

  /* -------- מפיות -------- */
  {
    id: 'napkin-001',
    name: "מפית נייר לבנה 33×33",
    category: 'napkins',
    categoryLabel: 'מפיות',
    price: 49,
    unit: "חבילה 100 יח׳",
    stock: 300,
    icon: '🗒️',
    bgColor: '#F5F0FF',
    description: "מפית 2 שכבות בפולד 1/4, מתאימה לשולחן ולאירועים",
  },
  {
    id: 'napkin-002',
    name: "מפית נייר צבעונית 25×25",
    category: 'napkins',
    categoryLabel: 'מפיות',
    price: 59,
    unit: "חבילה 100 יח׳",
    stock: 120,
    icon: '🎨',
    bgColor: '#FFF0F5',
    description: "עיצובים עונתיים צבעוניים – מתחדש בכל עונה",
  },
  {
    id: 'napkin-003',
    name: "מפית קוקטייל 25×25",
    category: 'napkins',
    categoryLabel: 'מפיות',
    price: 39,
    unit: "חבילה 200 יח׳",
    stock: 60,
    icon: '🍹',
    bgColor: '#F5F0FF',
    description: "קטנה ומהודרת לבר, מסיבות וקבלת פנים",
  },
];

/* ===== STATE ===== */
let activeCategory = 'all';

/* ===== ELEMENTS ===== */
const productGrid  = document.getElementById('productGrid');
const resultsBar   = document.getElementById('resultsBar');
const errorState   = document.getElementById('errorState');
const emptyState   = document.getElementById('emptyState');
const toast        = document.getElementById('toast');
let toastTimer     = null;

/* ===== LAZY LOAD / INTERSECTION OBSERVER ===== */
const cardObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        cardObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
);

/* ===== HELPERS ===== */
function showSkeletons(count = 6) {
  productGrid.innerHTML = Array.from({ length: count })
    .map(() => `<div class="skeleton-card" role="presentation"></div>`)
    .join('');
}

function showToast(message, type = '') {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast show${type ? ' ' + type : ''}`;
  toastTimer = setTimeout(() => {
    toast.className = 'toast hidden';
  }, 2800);
}

/* ===== RENDER CARD ===== */
function renderCard(product) {
  const inStock      = product.stock > 0;
  const badgeClass   = inStock ? 'in-stock'     : 'out-of-stock';
  const badgeLabel   = inStock ? 'במלאי'         : 'חסר במלאי';
  const cardClass    = inStock ? 'product-card' : 'product-card out-of-stock';

  return `
    <article class="${cardClass}" role="listitem" data-id="${product.id}">
      <div class="card-image" style="background:${product.bgColor};">
        <span aria-hidden="true">${product.icon}</span>
        <span class="stock-badge ${badgeClass}">${badgeLabel}</span>
      </div>

      <div class="card-body">
        <span class="card-category">${product.categoryLabel}</span>
        <h2 class="card-name">${product.name}</h2>
        <p class="card-desc">${product.description}</p>

        <div class="card-price-row">
          <span class="card-price-symbol">₪</span>
          <span class="card-price">${product.price}</span>
          <span class="card-unit">/ ${product.unit}</span>
        </div>

        <div class="card-order-row">
          <div class="qty-wrap" aria-label="כמות">
            <button class="qty-btn"
              onclick="changeQty('${product.id}', -1)"
              aria-label="הפחת כמות"
              ${!inStock ? 'disabled' : ''}>−</button>
            <input
              class="qty-input"
              type="number"
              id="qty-${product.id}"
              value="1"
              min="1"
              max="999"
              aria-label="כמות להזמנה"
              ${!inStock ? 'disabled' : ''}
            >
            <button class="qty-btn"
              onclick="changeQty('${product.id}', 1)"
              aria-label="הוסף כמות"
              ${!inStock ? 'disabled' : ''}>+</button>
          </div>
          <button
            class="btn-add"
            onclick="addToOrder('${product.id}')"
            aria-label="הוסף ${product.name} להזמנה"
            ${!inStock ? 'disabled' : ''}>
            ${inStock ? 'הוסף להזמנה' : 'חסר במלאי'}
          </button>
        </div>
      </div>
    </article>`;
}

/* ===== FILTER & RENDER ===== */
function renderProducts(products) {
  if (!products || products.length === 0) {
    productGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    resultsBar.textContent = '';
    return;
  }

  emptyState.classList.add('hidden');
  productGrid.innerHTML = products.map(renderCard).join('');
  resultsBar.textContent = `מציג ${products.length} מוצר${products.length !== 1 ? 'ים' : ''}`;

  productGrid.querySelectorAll('.product-card').forEach(card => {
    cardObserver.observe(card);
  });
}

function filterProducts(category) {
  activeCategory = category;
  const filtered = category === 'all'
    ? PRODUCTS_DATA
    : PRODUCTS_DATA.filter(p => p.category === category);
  renderProducts(filtered);
}

/* ===== MAIN LOAD ===== */
function loadProducts() {
  errorState.classList.add('hidden');
  emptyState.classList.add('hidden');
  showSkeletons(6);

  /* סימולציה של טעינה – להחלפה ב-Firebase: */
  setTimeout(() => {
    try {
      filterProducts(activeCategory);
    } catch (err) {
      productGrid.innerHTML = '';
      errorState.classList.remove('hidden');
      resultsBar.textContent = '';
      console.error('שגיאה בטעינת מוצרים:', err);
    }
  }, 400);
}

/* ===== QUANTITY ===== */
function changeQty(productId, delta) {
  const input = document.getElementById(`qty-${productId}`);
  if (!input) return;
  const newVal = Math.max(1, Math.min(999, parseInt(input.value || 1, 10) + delta));
  input.value = newVal;
}

/* ===== ADD TO ORDER ===== */
function addToOrder(productId) {
  const product = PRODUCTS_DATA.find(p => p.id === productId);
  if (!product || product.stock === 0) return;

  const input = document.getElementById(`qty-${productId}`);
  const qty   = input ? parseInt(input.value, 10) : 1;

  showToast(`✔ ${product.name} × ${qty} נוסף!`, 'success');

  /* TODO: כאן לשלוח להזמנה / Firebase / WhatsApp */
  console.log('הזמנה:', { productId, qty, product });
}

/* ===== CATEGORY BUTTONS ===== */
document.getElementById('categoryNav').addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;

  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  filterProducts(btn.dataset.category);
});

/* ===== INIT ===== */
loadProducts();

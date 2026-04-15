// Firebase-ready: replace with db.collection('products').get()
var PRODUCTS = [
  { id:'cup-001', sku:'1001', name:"כוס קפה חד-פעמית 8 אונ׳",   category:'cups',    categoryLabel:'כוסות',  price:89,  unit:"ל-100 יח׳", stock:150, icon:'☕',   bgColor:'#2d1e14', description:"כוס קרטון עם ציפוי PE לשתייה חמה עד 85°", image:null },
  { id:'cup-002', sku:'1002', name:"כוס קפה חד-פעמית 12 אונ׳",  category:'cups',    categoryLabel:'כוסות',  price:99,  unit:"ל-100 יח׳", stock:80,  icon:'☕',   bgColor:'#2d1e14', description:"גדולה לאמריקנו, לאטה וקפה קר",               image:null },
  { id:'cup-003', sku:'1003', name:"כוס שתייה קרה 9 אונ׳",      category:'cups',    categoryLabel:'כוסות',  price:79,  unit:"ל-100 יח׳", stock:0,   icon:'🥤',   bgColor:'#141e2d', description:"כוס פלסטיק שקופה לשתייה קרה ומיץ",            image:null },
  { id:'plt-001', sku:'2001', name:'צלחת מקרטון עגולה 7"',       category:'plates',  categoryLabel:'צלחות',  price:69,  unit:"ל-100 יח׳", stock:200, icon:'🍽️',  bgColor:'#142d1e', description:"צלחת קרטון לבנה חזקה לאוכל חם וקר",           image:null },
  { id:'plt-002', sku:'2002', name:'צלחת מקרטון מחולקת 9"',      category:'plates',  categoryLabel:'צלחות',  price:89,  unit:"ל-100 יח׳", stock:45,  icon:'🍱',   bgColor:'#142d1e', description:"3 תאים נפרדים לאירועים ואוכל עם תוספות",       image:null },
  { id:'plt-003', sku:'2003', name:'צלחת פלסטיק חזקה 9"',        category:'plates',  categoryLabel:'צלחות',  price:119, unit:"ל-50 יח׳",  stock:0,   icon:'🍽️',  bgColor:'#142d1e', description:"פלסטיק קשיח אמריקאי עמיד לחום",               image:null },
  { id:'nap-001', sku:'3001', name:"מפית נייר לבנה 33×33",       category:'napkins', categoryLabel:'מפיות',  price:49,  unit:"ל-100 יח׳", stock:300, icon:'🗒️',  bgColor:'#1e142d', description:"מפית 2 שכבות לשולחן ואירועים",                 image:null },
  { id:'nap-002', sku:'3002', name:"מפית נייר צבעונית 25×25",    category:'napkins', categoryLabel:'מפיות',  price:59,  unit:"ל-100 יח׳", stock:120, icon:'🎨',   bgColor:'#2d1420', description:"עיצובים עונתיים צבעוניים",                      image:null },
  { id:'nap-003', sku:'3003', name:"מפית קוקטייל 25×25",         category:'napkins', categoryLabel:'מפיות',  price:39,  unit:"ל-200 יח׳", stock:60,  icon:'🍹',   bgColor:'#1e142d', description:"קטנה ומהודרת לבר ומסיבות",                     image:null }
];

var SHIPPING_PRODUCT = {
  id:'ship-1000', sku:'1000', name:'דמי משלוח', category:'shipping',
  categoryLabel:'משלוח', price:45, unit:'לחבילה', stock:999, icon:'🚚', bgColor:'#141414', description:''
};

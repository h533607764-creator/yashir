// Firebase-ready: replace with db.collection('customers').get()
var CUSTOMERS_DB = [
  {
    id: '123456789',
    name: 'מסעדת הים',
    email: 'haym@example.com',
    phone: '054-1111111',
    address: 'שד׳ הרצל 10, תל אביב',
    contactPerson: 'דוד לוי',
    shippingAddress: 'שד׳ הרצל 10, תל אביב',
    generalDiscount: 0,
    shippingCost: 35,
    paymentTerms: 'שוטף 30',
    existingDebt: 0,
    personalPrices: { 'cup-001': 75, 'cup-002': 85, 'plt-001': 55 }
  },
  {
    id: '987654321',
    name: 'קפה עיר',
    email: 'kafair@example.com',
    phone: '052-2222222',
    address: 'דיזנגוף 50, תל אביב',
    contactPerson: 'מירי כהן',
    shippingAddress: 'דיזנגוף 50, תל אביב',
    generalDiscount: 10,
    shippingCost: 45,
    paymentTerms: 'מזומן',
    existingDebt: 0,
    personalPrices: {}
  },
  {
    id: '555666777',
    name: 'גן אירועים אורכיד',
    email: 'orchid@example.com',
    phone: '058-3333333',
    address: 'כביש 4, קיבוץ שפיים',
    contactPerson: 'שרה גרין',
    shippingAddress: 'כביש 4, קיבוץ שפיים',
    generalDiscount: 5,
    shippingCost: 60,
    paymentTerms: 'שוטף 60',
    existingDebt: 0,
    personalPrices: { 'nap-001': 40, 'nap-002': 49, 'plt-002': 78 }
  }
];

// Admin: managed via settings panel (PIN-based)
var ADMIN_CREDENTIALS = { pin: '1234' };

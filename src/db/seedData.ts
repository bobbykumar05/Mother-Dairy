import { Product, Route, Party, AppSettings, User } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    name: 'Rajesh Kumar (Sales Manager)',
    email: 'admin@motherdairyranchi.com',
    role: 'ADMIN',
    phone: '9835123456',
    active: true,
  },
  {
    id: 'usr_sales1',
    username: 'sales',
    name: 'Amit Sharma (Field Executive)',
    email: 'amit@motherdairyranchi.com',
    role: 'SALES',
    phone: '9835987654',
    active: true,
  },
];

export const INITIAL_SETTINGS: AppSettings = {
  businessName: 'HR Trader',
  distributorName: 'HR Trader - Mother Dairy Authorised Distributor',
  phone: '9431102938',
  whatsappNumber: '9431102938',
  upiId: 'hrtrader@upi',
  payeeName: 'HR Trader',
  invoiceFooter: 'Quality & Freshness Guaranteed. Please check goods on delivery.',
  currency: 'INR',
  defaultRouteId: 'rt_mon',
};

export const INITIAL_ROUTES: Route[] = [
  { id: 'rt_mon', name: 'Morabadi', day: 'Monday', sequence: 1, active: true, totalShops: 8, createdAt: new Date().toISOString() },
  { id: 'rt_tue', name: 'Harmu', day: 'Tuesday', sequence: 2, active: true, totalShops: 7, createdAt: new Date().toISOString() },
  { id: 'rt_wed', name: 'Kanke Road', day: 'Wednesday', sequence: 3, active: true, totalShops: 6, createdAt: new Date().toISOString() },
  { id: 'rt_thu', name: 'Burdwan Compound', day: 'Thursday', sequence: 4, active: true, totalShops: 5, createdAt: new Date().toISOString() },
  { id: 'rt_fri', name: 'Main Road', day: 'Friday', sequence: 5, active: true, totalShops: 9, createdAt: new Date().toISOString() },
  { id: 'rt_sat', name: 'Mixed Retailers', day: 'Saturday', sequence: 6, active: true, totalShops: 5, createdAt: new Date().toISOString() },
];

/**
 * EXACT PRODUCTS FROM THE SUPPLIED MOTHER DAIRY PRICE LIST IMAGE
 */
export const INITIAL_PRODUCTS: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // GHEE
  { sku: 'MD-GHEE-1000', name: 'COW GHEE 1 L PET JAR', category: 'GHEE', packSize: '1 L', imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2021/5/BW/WZ/DN/93887037/mother-dairy-cow-ghee-jar-one-litre-.jpg', piecesPerCase: 12, mrp: 750, ptr: 685, ptrMargin: 9.49, casePtr: 8220, active: true },
  { sku: 'MD-GHEE-500', name: 'COW GHEE 500 ML PET JAR', category: 'GHEE', packSize: '500 ML', imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2021/1/SW/QB/GR/18386536/500-ml-mother-dairy-ghee.jpg', piecesPerCase: 24, mrp: 380, ptr: 345, ptrMargin: 10.14, casePtr: 8280, active: true },
  { sku: 'MD-GHEE-200', name: 'COW GHEE 200 ML PET JAR', category: 'GHEE', packSize: '200 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40161167_1-mother-dairy-cow-ghee.jpg', piecesPerCase: 30, mrp: 184, ptr: 165, ptrMargin: 11.52, casePtr: 4950, active: true },

  // COOKIES
  { sku: 'MD-COOK-KP', name: 'KAJU PISTA 200GM', category: 'COOKIES', packSize: '200 GM', imageUrl: 'https://milkkart.in/wp-content/uploads/2025/01/51pJ1qTkZFL._SL1000_.jpg', piecesPerCase: 24, mrp: 95, ptr: 85, ptrMargin: 11.76, casePtr: 2040, active: true },
  { sku: 'MD-COOK-COC', name: 'COCOUNT 150GM', category: 'COOKIES', packSize: '150 GM', imageUrl: 'https://milkkart.in/wp-content/uploads/2025/01/51kq1XB8mqL._SL1000_-1.jpg', piecesPerCase: 24, mrp: 65, ptr: 58, ptrMargin: 12.07, casePtr: 1392, active: true },
  { sku: 'MD-COOK-JEE', name: 'JEERA 150GM', category: 'COOKIES', packSize: '150 GM', imageUrl: 'https://milkkart.in/wp-content/uploads/2025/01/Jeera.jpg', piecesPerCase: 24, mrp: 55, ptr: 49, ptrMargin: 12.24, casePtr: 1176, active: true },
  { sku: 'MD-COOK-ATT', name: 'ATTA 150GM', category: 'COOKIES', packSize: '150 GM', imageUrl: 'https://milkkart.in/wp-content/uploads/2025/01/51e-2hIu6-L._SL1000_.jpg', piecesPerCase: 24, mrp: 55, ptr: 49, ptrMargin: 12.24, casePtr: 1176, active: true },

  // FL.MILK
  { sku: 'MD-FLM-CHOC-B', name: 'CHOCOLATE 180 ML(BOTTLE)', category: 'FL.MILK', packSize: '180 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40362855_1-mother-dairy-chocolate-flavoured-milk.jpg', piecesPerCase: 15, mrp: 30, ptr: 27, ptrMargin: 11.11, casePtr: 405, active: true },
  { sku: 'MD-FLM-COFF-B', name: 'COLDCOFFEE 180 ML(BOTTLE)', category: 'FL.MILK', packSize: '180 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40039250_2-mother-dairy-cold-coffee-flavoured-milk.jpg', piecesPerCase: 15, mrp: 30, ptr: 27, ptrMargin: 11.11, casePtr: 405, active: true },
  { sku: 'MD-FLM-KESR-B', name: 'KESAR ELAICHI 180ML(BOTTLE)', category: 'FL.MILK', packSize: '180 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40039252_2-mother-dairy-kesar-elaichi-flavoured-milk.jpg', piecesPerCase: 15, mrp: 30, ptr: 27, ptrMargin: 11.11, casePtr: 405, active: true },
  { sku: 'MD-FLM-BADM-P', name: 'BADAM 180ML (PET BOTTLE)', category: 'FL.MILK', packSize: '180 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/xl/40327718_1-mother-dairy-badam-flavoured-milk.jpg', piecesPerCase: 30, mrp: 30, ptr: 27, ptrMargin: 11.11, casePtr: 810, active: true },
  { sku: 'MD-FLM-PIST-P', name: 'PISTA 180ML (PET BOTTLE)', category: 'FL.MILK', packSize: '180 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40362854_1-mother-dairy-pista-flavoured-milk.jpg', piecesPerCase: 30, mrp: 30, ptr: 27, ptrMargin: 11.11, casePtr: 810, active: true },
  { sku: 'MD-FLM-KELA-P', name: 'K.ELAICHI 180ML (PET BOTTLE)', category: 'FL.MILK', packSize: '180 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40039252_2-mother-dairy-kesar-elaichi-flavoured-milk.jpg', piecesPerCase: 30, mrp: 30, ptr: 27, ptrMargin: 11.11, casePtr: 810, active: true },
  { sku: 'MD-FLM-CHOC-P', name: 'CHOCLATE 180ML (PET BOTTLE)', category: 'FL.MILK', packSize: '180 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40362855_1-mother-dairy-chocolate-flavoured-milk.jpg', piecesPerCase: 30, mrp: 30, ptr: 27, ptrMargin: 11.11, casePtr: 810, active: true },
  { sku: 'MD-FLM-COFF-P', name: 'COFFE 180ML (PET BOTTLE)', category: 'FL.MILK', packSize: '180 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40362856_1-mother-dairy-coffee-flavoured-milk.jpg', piecesPerCase: 30, mrp: 30, ptr: 27, ptrMargin: 11.11, casePtr: 810, active: true },

  // MILKSHAKE
  { sku: 'MD-MS-STRAW-T', name: 'STRAWBERRY 180ML (Tetra Pack)', category: 'MILKSHAKE', packSize: '180 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/xl/30010297_4-mother-dairy-milk-shake-strawberry.jpg', piecesPerCase: 30, mrp: 28, ptr: 25, ptrMargin: 12.00, casePtr: 750, active: true },
  { sku: 'MD-MS-MANGO-T', name: 'MANGO 180ML (Tetra Pack)', category: 'MILKSHAKE', packSize: '180 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/xl/30010296_5-mother-dairy-milk-shake-mango.jpg', piecesPerCase: 30, mrp: 28, ptr: 25, ptrMargin: 12.00, casePtr: 750, active: true },
  { sku: 'MD-MS-CHOC-T', name: 'CHOCOLATE 180ML (Tetra Pack)', category: 'MILKSHAKE', packSize: '180 ML', imageUrl: 'https://milkkart.in/wp-content/uploads/2025/01/mother-dairy-milk-shake-chocolate-01.webp', piecesPerCase: 30, mrp: 28, ptr: 25, ptrMargin: 12.00, casePtr: 750, active: true },

  // CHACH
  { sku: 'MD-CH-MASALA-T', name: 'MASALA CHACH 180ML (Tetra Pack)', category: 'CHACH', packSize: '180 ML', imageUrl: 'https://rukmini1.flixcart.com/image/1500/1500/xif0q/butter-milk/c/i/z/-original-imahfmchjgdhnhpg.jpeg?q=70', piecesPerCase: 30, mrp: 15, ptr: 13, ptrMargin: 15.38, casePtr: 390, active: true },

  // LASSI
  { sku: 'MD-LS-SWEET-T', name: 'SWEET LASSI 180ML (Tetra Pack)', category: 'LASSI', packSize: '180 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40004523_10-mother-dairy-lassi-sweetened-asli-refreshment.jpg', piecesPerCase: 30, mrp: 20, ptr: 17.50, ptrMargin: 14.29, casePtr: 525, active: true },

  // COFFE
  { sku: 'MD-COFF-LATTE', name: 'COLD COFFE LATTE 200ML', category: 'COFFE', packSize: '200 ML', imageUrl: 'https://cdn.grofers.com/da/cms-assets/cms/product/2b2d7f0f-8800-48f3-8c0a-9edccb9523d4.jpg', piecesPerCase: 24, mrp: 35, ptr: 31, ptrMargin: 12.90, casePtr: 744, active: true },
  { sku: 'MD-COFF-CAPPU', name: 'COLD COFFE CAPPUCCINO 200ML', category: 'COFFE', packSize: '200 ML', imageUrl: 'https://m.media-amazon.com/images/I/51BmVqhKSiL.jpg', piecesPerCase: 24, mrp: 35, ptr: 31, ptrMargin: 12.90, casePtr: 744, active: true },

  // BUTTER & CHEESE
  { sku: 'MD-BC-BUT-100', name: 'BUTTER 100 GMS', category: 'BUTTER & CHEESE', packSize: '100 GM', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/30007663_4-mother-dairy-butter.jpg', piecesPerCase: 150, mrp: 63, ptr: 58.50, ptrMargin: 7.69, casePtr: 8775, active: true },
  { sku: 'MD-BC-BUT-500', name: 'BUTTER 500 GMS', category: 'BUTTER & CHEESE', packSize: '500 GM', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/30007664_6-mother-dairy-butter.jpg', piecesPerCase: 30, mrp: 310, ptr: 289, ptrMargin: 7.27, casePtr: 8670, active: true },
  { sku: 'MD-BC-CHS-200B', name: 'CHEESE 200GM BLOCK', category: 'BUTTER & CHEESE', packSize: '200 GM', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40124644_3-mother-dairy-cheese-block.jpg', piecesPerCase: 60, mrp: 140, ptr: 125, ptrMargin: 12.00, casePtr: 7500, active: true },
  { sku: 'MD-BC-CHS-180C', name: 'CHEESE CUBES 180GM', category: 'BUTTER & CHEESE', packSize: '180 GM', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40124646_3-mother-dairy-cheese-cubes.jpg', piecesPerCase: 60, mrp: 135, ptr: 120, ptrMargin: 12.50, casePtr: 7200, active: true },
  {
    sku: 'MD-BC-CHS-200S',
    name: 'CHEESE SLICE 200 GM',
    category: 'BUTTER & CHEESE',
    packSize: '200 GM',
    imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40124645_3-mother-dairy-cheese-slice.jpg',
    piecesPerCase: 60,
    mrp: 160,
    ptr: 140,
    ptrMargin: 14.29,
    casePtr: 8400,
    active: true,
    hasOffer: true,
    offerTitle: 'BULK OFFER: ₹100/PC ON 10+ PCS',
    offerType: 'SPECIAL_PRICE',
    offerDetails: 'Special Price Promo: Regular PTR ₹140/pc, buy 10 or more pieces at ₹100/pc!',
    offerMinQty: 10,
    offerMinUnit: 'PIECE',
    offerSpecialPrice: 100,
  },

  // DAIRY WHITENER
  { sku: 'MD-DW-500P', name: 'DAIRY WHITENER 500 GM POUCH', category: 'DAIRY WHITENER', packSize: '500 GM', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/70000736_6-mother-dairy-dairy-whitener-dailycious.jpg', piecesPerCase: 24, mrp: 235, ptr: 215, ptrMargin: 9.30, casePtr: 5160, active: true },
  { sku: 'MD-DW-1KGP', name: 'DAIRY WHITENER 1 KG POUCH', category: 'DAIRY WHITENER', packSize: '1 KG', imageUrl: 'https://www.mystore.in/s/62ea2c599d1398fa16dbae0a/c/2fbf289ef2db4b33bf7444cba716ed23/102093310-2022-06-15-13-08.png', piecesPerCase: 12, mrp: 445, ptr: 415, ptrMargin: 7.23, casePtr: 4980, active: true },
  { sku: 'MD-DW-20GP', name: 'DAIRY WHITENER 20G POUCH', category: 'DAIRY WHITENER', packSize: '20 GM', imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2021/1/LY/GB/AJ/18386536/25-gm-mother-dairy-dailycious-dairy-whitener-500x500.jpg', piecesPerCase: 336, mrp: 10, ptr: 9, ptrMargin: 11.11, casePtr: 3024, active: true },

  // ESL MILK
  { sku: 'MD-ESL-450', name: 'ESL 450 ML', category: 'ESL MILK', packSize: '450 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/70000731_8-mother-dairy-milk-live-lite.jpg', piecesPerCase: 24, mrp: 32, ptr: 29, ptrMargin: 10.34, casePtr: 696, active: true },
  { sku: 'MD-ESL-DTM-125', name: 'ESL DTM MILK 125 ML', category: 'ESL MILK', packSize: '125 ML', imageUrl: 'https://m.media-amazon.com/images/I/71BRmRcVckS._AC_UF894,1000_QL80_.jpg', piecesPerCase: 30, mrp: 10, ptr: 9, ptrMargin: 11.11, casePtr: 270, active: true },

  // UHT MILK
  { sku: 'MD-UHT-TM-180', name: 'UHT TONED MILK 180 ML', category: 'UHT MILK', packSize: '180 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40343323_1-mother-dairy-uht-milk.jpg', piecesPerCase: 30, mrp: 16, ptr: 14.60, ptrMargin: 9.59, casePtr: 438, active: true },
  { sku: 'MD-UHT-TM-500', name: 'UHT TONED MILK 500ML', category: 'UHT MILK', packSize: '500 ML', imageUrl: 'https://www.bbassets.com/media/uploads/p/l/40362851_1-mother-dairy-uht-sterilized-homogenised-toned-milk.jpg', piecesPerCase: 24, mrp: 40, ptr: 36, ptrMargin: 10.00, casePtr: 864, active: true },
  { sku: 'MD-UHT-TM-1LTR', name: 'UHT TONED MILK(TB)1LTR', category: 'UHT MILK', packSize: '1 L', imageUrl: 'https://www.jiomart.com/images/product/original/490066079/mother-dairy-toned-milk-1-l-tetra-pak-product-images-o490066079-p490066079-0-202304261732.jpg?im=Resize=(1000,1000)', piecesPerCase: 12, mrp: 77, ptr: 72, ptrMargin: 6.94, casePtr: 864, active: true },

  // UHT CREAM
  { sku: 'MD-CREAM-200', name: 'CREAM TETRAPACK 200 ML', category: 'UHT CREAM', packSize: '200 ML', imageUrl: 'https://instamart-media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto/NI_CATALOG/IMAGES/ciw/2025/12/17/4223a5fc-264a-48c9-89a2-18b3a909a8dd_S5NL2J65B6_MN_16122025.png', piecesPerCase: 30, mrp: 65, ptr: 60, ptrMargin: 8.33, casePtr: 1800, active: true },
  { sku: 'MD-CREAM-1000', name: 'CREAM TETRAPACK 1000 ML', category: 'UHT CREAM', packSize: '1 L', imageUrl: 'https://m.media-amazon.com/images/I/51XN19YKGOL.jpg', piecesPerCase: 12, mrp: 240, ptr: 225, ptrMargin: 6.67, casePtr: 2700, active: true },

  // SAFAL
  { sku: 'MD-SAF-COCO-200', name: 'SAFAL COCONUT WATER 200ML', category: 'SAFAL', packSize: '200 ML', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQir-FfIsUWP1rOX0buXLYwgyeiVyN1witi5Q&s', piecesPerCase: 48, mrp: 55, ptr: 40, ptrMargin: 37.50, casePtr: 1920, active: true },
  { sku: 'MD-SAF-JAM-500', name: 'SAFAL MIX FRUIT JAM 500GM', category: 'SAFAL', packSize: '500 GM', imageUrl: 'https://tiimg.tistatic.com/fp/1/003/078/mixed-fruit-jam-069.jpg', piecesPerCase: 12, mrp: 165, ptr: 147, ptrMargin: 12.24, casePtr: 1764, active: true },
  { sku: 'MD-SAF-TOM-200', name: 'SAFAL TOMATO PUREE 200GM', category: 'SAFAL', packSize: '200 GM', imageUrl: 'https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=1080/da/cms-assets/cms/product/233027fa-030d-41ab-8f7e-fb2fa6bef457.png?bg_token=color.background.quaternary', piecesPerCase: 30, mrp: 25, ptr: 22, ptrMargin: 13.64, casePtr: 660, active: true },
  { sku: 'MD-SAF-PIC-CHILLI', name: 'SAFAL GCHILLY PICKLE 400GM(1+1)', category: 'SAFAL', packSize: '400 GM', imageUrl: 'https://m.media-amazon.com/images/I/51ev6F6quOL.jpg', piecesPerCase: 4, mrp: 145, ptr: 122, ptrMargin: 18.85, casePtr: 488, active: true },
  { sku: 'MD-SAF-PIC-MIX', name: 'SAFAL MIX PICKLE 400GM(1+1)', category: 'SAFAL', packSize: '400 GM', imageUrl: 'https://f.nooncdn.com/p/pzsku/ZEEC9DCF54E947AF91BC1Z/45/1754506154/16b57584-8dcd-4077-b1f5-d15d366e92b7.jpg?width=320', piecesPerCase: 4, mrp: 145, ptr: 122, ptrMargin: 18.85, casePtr: 488, active: true },
  { sku: 'MD-SAF-PIC-LIME', name: 'SAFAL LIME PICKLE 400GM(1+1)', category: 'SAFAL', packSize: '400 GM', imageUrl: 'https://m.media-amazon.com/images/I/516gRjHfZFL.jpg', piecesPerCase: 4, mrp: 145, ptr: 122, ptrMargin: 18.85, casePtr: 488, active: true },
  { sku: 'MD-SAF-PIC-MANGO', name: 'SAFAL MANGO PICKLE 400GM(1+1)', category: 'SAFAL', packSize: '400 GM', imageUrl: 'https://jsdagro.com/assets/images/product_image/package_inventory_20240326134737.jpg', piecesPerCase: 4, mrp: 145, ptr: 122, ptrMargin: 18.85, casePtr: 488, active: true },
];

export const INITIAL_PARTIES: Omit<Party, 'id' | 'createdAt'>[] = [];

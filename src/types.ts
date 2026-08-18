export type UserRole = 'ADMIN' | 'MANAGER' | 'SALES' | 'SALES_REP';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  active: boolean;
}

export type OfferType = 'FREE_BONUS' | 'SPECIAL_PRICE' | 'CUSTOM';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  packSize: string;
  imageUrl: string;
  piecesPerCase: number;
  mrp: number;
  ptr: number;
  ptrMargin: number;
  casePtr: number;
  active: boolean;
  hsnCode?: string;

  // Special Offer Fields
  hasOffer?: boolean;
  offerTitle?: string; // e.g. "BUY 1 BOX GET 30 PCS FREE" or "BULK OFFER: ₹100/PC FOR 10+ PCS"
  offerType?: OfferType; // 'FREE_BONUS' | 'SPECIAL_PRICE' | 'CUSTOM'
  offerDetails?: string; // Full description e.g. "Buy 1 Box Cheese Tube & get 30 pieces extra cheese free!"
  offerMinQty?: number; // e.g., 1 case or 10 pieces
  offerMinUnit?: 'CASE' | 'PIECE'; // 'CASE' or 'PIECE'
  offerBonusQty?: number; // e.g., 30 extra free pieces
  offerBonusUnit?: 'PIECE' | 'CASE';
  offerSpecialPrice?: number; // Special PTR price per piece e.g. ₹100 instead of ₹140

  createdAt: string;
  updatedAt: string;
}

export interface PriceHistory {
  id: string;
  productId: string;
  productName: string;
  oldMrp: number;
  newMrp: number;
  oldPtr: number;
  newPtr: number;
  changedBy: string;
  changedAt: string;
}

export interface Route {
  id: string;
  name: string;
  day: string;
  sequence: number;
  active: boolean;
  totalShops: number;
  createdAt: string;
}

export interface Party {
  id: string;
  shopNumber: string;
  shopName: string;
  ownerName: string;
  phone: string;
  altPhone?: string;
  address: string;
  landmark?: string;
  routeId: string;
  routeName: string;
  area: string;
  notes?: string;
  active: boolean;
  lifetimeOrders: number;
  lifetimeValue: number;
  lastVisitDate?: string;
  lastOrderDate?: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  category: string;
  packSize: string;
  piecesPerCase: number;
  mrpAtOrder: number;
  ptrAtOrder: number;
  caseQty: number;
  pieceQty: number;
  totalPieces: number;
  lineTotal: number;
  hsnCode?: string;
  appliedOfferTitle?: string;
  appliedOfferBonusPieces?: number;
  appliedOfferSavings?: number;
}

export type DeliveryStatus = 'NEW' | 'CONFIRMED' | 'PROCESSING' | 'DISPATCHED' | 'MANUAL_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type DeliveryType = 'STANDARD' | 'MANUAL';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface Order {
  id: string;
  orderNumber: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  salespersonId: string;
  salespersonName: string;
  partyId: string;
  shopNumber: string;
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  routeId: string;
  routeName: string;
  items: OrderItem[];
  totalCases: number;
  totalPieces: number;
  subtotal: number;
  discount: number;
  grandTotal: number;
  deliveryStatus: DeliveryStatus;
  deliveryType?: DeliveryType;
  isManualDelivery?: boolean;
  deliveredAt?: string;
  deliveredBy?: string;
  manualDeliveryNotes?: string;
  manualDeliveryAssignedTo?: string;
  manualDeliveryDate?: string;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  pendingAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Visit {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  salespersonId: string;
  salespersonName: string;
  partyId: string;
  partyName: string;
  routeId: string;
  routeName: string;
  orderReceived: boolean;
  orderId?: string;
  noOrderReason?: 'No Requirement' | 'Stock Available' | 'Shop Closed' | 'Owner Unavailable' | 'Payment Issue' | 'Price Issue' | 'Competitor' | 'Other';
  notes?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  partyId: string;
  partyName: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: 'UPI' | 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';
  referenceNo?: string;
  recordedBy: string;
  notes?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  action: string;
  entity?: string;
  entityId?: string;
  module?: string;
  details: string;
  timestamp: string;
}

export type ExpenseCategory = 'Travel' | 'Food' | 'Office' | 'Vehicle Repair' | 'Marketing' | 'Misc';

export interface ExpenseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: number;
  description: string;
  createdBy: string;
  createdById: string;
  createdAt: string;
  updatedAt?: string;
}

export type SalaryStatus = 'Credited' | 'Pending' | 'Processing';

export interface SalaryRecord {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  creditDate: string; // YYYY-MM-DD
  month: string; // e.g. "July 2026"
  status: SalaryStatus;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface FuelExpenseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  notes?: string;
  recordedBy: string;
  recordedById: string;
  createdAt: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Holiday';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: string; // HH:mm
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AppSettings {
  businessName: string;
  distributorName: string;
  phone: string;
  whatsappNumber: string;
  upiId: string;
  payeeName: string;
  invoiceFooter: string;
  currency: string;
  defaultRouteId: string;
}

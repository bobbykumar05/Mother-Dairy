import { OrderItem, Product } from '../types';

/**
 * Calculates Case PTR value = PTR per piece * Pieces per case
 */
export function calculateCaseValue(ptrPerPiece: number, piecesPerCase: number): number {
  return Number((ptrPerPiece * piecesPerCase).toFixed(2));
}

/**
 * Calculates an order line total with special offer evaluation
 */
export function calculateOfferForProduct(
  product: Product,
  caseQty: number,
  pieceQty: number
) {
  const totalCases = Math.max(0, caseQty || 0);
  const totalLoosePieces = Math.max(0, pieceQty || 0);
  const totalPieces = (totalCases * product.piecesPerCase) + totalLoosePieces;

  if (totalPieces <= 0) {
    return {
      caseQty: 0,
      pieceQty: 0,
      totalPieces: 0,
      lineTotal: 0,
      effectivePtr: product.ptr,
      appliedOfferTitle: undefined,
      appliedOfferBonusPieces: 0,
      appliedOfferSavings: 0,
    };
  }

  let effectivePtr = product.ptr;
  let appliedOfferTitle: string | undefined = undefined;
  let appliedOfferBonusPieces = 0;
  let appliedOfferSavings = 0;

  if (product.hasOffer) {
    const minQty = product.offerMinQty || 1;
    const minUnit = product.offerMinUnit || 'CASE';
    const isMinQtyMet = minUnit === 'CASE' ? totalCases >= minQty : totalPieces >= minQty;

    if (isMinQtyMet) {
      if (
        product.offerType === 'SPECIAL_PRICE' &&
        product.offerSpecialPrice &&
        product.offerSpecialPrice < product.ptr
      ) {
        effectivePtr = product.offerSpecialPrice;
        const standardTotal = totalPieces * product.ptr;
        const discountedTotal = totalPieces * effectivePtr;
        appliedOfferSavings = Number((standardTotal - discountedTotal).toFixed(2));
        appliedOfferTitle =
          product.offerTitle ||
          `Special Bulk Rate ₹${effectivePtr}/pc (Saved ₹${appliedOfferSavings})`;
      } else if (product.offerType === 'FREE_BONUS' && product.offerBonusQty) {
        const multiplier =
          minUnit === 'CASE' ? Math.floor(totalCases / minQty) : Math.floor(totalPieces / minQty);
        const bonusPerMult =
          product.offerBonusUnit === 'CASE'
            ? product.offerBonusQty * product.piecesPerCase
            : product.offerBonusQty;
        appliedOfferBonusPieces = Math.max(1, multiplier) * bonusPerMult;
        appliedOfferTitle =
          product.offerTitle || `Buy Offer: +${appliedOfferBonusPieces} Free Extra Pieces!`;
      } else if (product.offerTitle) {
        appliedOfferTitle = product.offerTitle;
      }
    }
  }

  const lineTotal = Number((totalPieces * effectivePtr).toFixed(2));

  return {
    caseQty: totalCases,
    pieceQty: totalLoosePieces,
    totalPieces,
    lineTotal,
    effectivePtr,
    appliedOfferTitle,
    appliedOfferBonusPieces,
    appliedOfferSavings,
  };
}

/**
 * Calculates an order line total
 * Formula: totalPieces = (caseQty * pcsPerCase) + pieceQty
 * lineTotal = totalPieces * ptrPerPiece
 */
export function calculateOrderLine(
  ptrPerPiece: number,
  pcsPerCase: number,
  caseQty: number,
  pieceQty: number
) {
  const totalCases = Math.max(0, caseQty || 0);
  const totalLoosePieces = Math.max(0, pieceQty || 0);
  const totalPieces = (totalCases * pcsPerCase) + totalLoosePieces;
  const lineTotal = Number((totalPieces * ptrPerPiece).toFixed(2));

  return {
    caseQty: totalCases,
    pieceQty: totalLoosePieces,
    totalPieces,
    lineTotal,
  };
}

/**
 * Calculates overall order totals
 */
export function calculateOrderTotal(items: OrderItem[], discount: number = 0) {
  let totalCases = 0;
  let totalPieces = 0;
  let subtotal = 0;

  for (const item of items) {
    totalCases += item.caseQty || 0;
    totalPieces += item.pieceQty || 0;
    subtotal += item.lineTotal || 0;
  }

  const cleanSubtotal = Number(subtotal.toFixed(2));
  const cleanDiscount = Math.min(cleanSubtotal, Math.max(0, discount || 0));
  const grandTotal = Number((cleanSubtotal - cleanDiscount).toFixed(2));

  return {
    totalCases,
    totalPieces,
    subtotal: cleanSubtotal,
    discount: cleanDiscount,
    grandTotal,
  };
}

/**
 * Calculates pending balance = Grand Total - Paid Amount
 */
export function calculatePendingAmount(grandTotal: number, paidAmount: number): number {
  return Math.max(0, Number((grandTotal - (paidAmount || 0)).toFixed(2)));
}

/**
 * Calculates margin percentage based on MRP & PTR
 * PTR Margin % = ((MRP - PTR) / MRP) * 100
 */
export function calculateMargin(mrp: number, ptr: number): number {
  if (!mrp || mrp <= 0) return 0;
  return Number((((mrp - ptr) / mrp) * 100).toFixed(2));
}

/**
 * Calculates salesperson productivity %
 * Productivity % = (Productive Visits / Total Visits) * 100
 */
export function calculateProductivity(totalVisits: number, productiveVisits: number): number {
  if (!totalVisits || totalVisits <= 0) return 0;
  return Number(((productiveVisits / totalVisits) * 100).toFixed(1));
}

/**
 * Calculates Average Order Value (AOV)
 */
export function calculateAverageOrderValue(totalRevenue: number, totalOrders: number): number {
  if (!totalOrders || totalOrders <= 0) return 0;
  return Number((totalRevenue / totalOrders).toFixed(2));
}

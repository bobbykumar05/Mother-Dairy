import { Order, AppSettings } from '../types';

/**
 * Formats a clean WhatsApp bill message for a party/shop order
 */
export function generateWhatsAppBillMessage(order: Order, settings?: AppSettings): string {
  const businessName = settings?.businessName || 'Mother Dairy Authorized Distributor';
  const phone = order.phone.replace(/[^0-9]/g, '');
  
  const text = `*${businessName.toUpperCase()}*
*INVOICE / BILL DETAILS*

*Shop Name:* ${order.shopName}
*Owner:* ${order.ownerName}
*Invoice No:* #${order.orderNumber}
*Date:* ${order.date}

*Order Summary:*
${order.items.map(item => `• ${item.productName} (${item.packSize}) - ${item.caseQty > 0 ? `${item.caseQty} Cse` : ''}${item.caseQty > 0 && item.pieceQty > 0 ? ' + ' : ''}${item.pieceQty > 0 ? `${item.pieceQty} Pcs` : ''} = ₹${item.lineTotal.toLocaleString('en-IN')}${item.appliedOfferTitle ? ` [🎁 ${item.appliedOfferTitle}]` : ''}`).join('\n')}

*Total Amount:* ₹${order.grandTotal.toLocaleString('en-IN')}
*Paid Amount:* ₹${order.paidAmount.toLocaleString('en-IN')}
*Pending Amount:* ₹${order.pendingAmount.toLocaleString('en-IN')}

${order.pendingAmount > 0 && settings?.upiId ? `*Payment UPI ID:* ${settings.upiId} (${settings.payeeName || 'Mother Dairy Sales'})` : ''}

Thank you for your business! For any query, call ${settings?.phone || 'our sales desk'}.`;

  return `https://api.whatsapp.com/send?phone=${phone.startsWith('91') ? phone : '91' + phone}&text=${encodeURIComponent(text)}`;
}

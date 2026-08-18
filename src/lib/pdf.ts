import { jsPDF } from 'jspdf';
import { Order, Party, Route, AppSettings } from '../types';

/**
 * PDF Generation Utilities for Mother Dairy Sales System
 * Generates exact match Tax Invoice PDF matching official Mother Dairy distributor invoice layout.
 */

function formatInvoiceDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

function getHsnForCategory(category?: string, productName?: string): string {
  const p = (productName || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (p.includes('milk') || c.includes('milk')) return '040299';
  if (p.includes('ghee') || c.includes('ghee')) return '040510';
  if (p.includes('butter') || c.includes('butter')) return '040510';
  if (p.includes('cheese') || c.includes('cheese')) return '040610';
  if (p.includes('paneer') || c.includes('paneer')) return '040610';
  if (p.includes('lassi') || p.includes('chaach') || c.includes('curd')) return '040390';
  if (p.includes('cookie') || c.includes('cookie')) return '190531';
  return '040299';
}

function drawPhoneIcon(doc: jsPDF, x: number, y: number) {
  doc.setFillColor(0, 43, 102);
  doc.circle(x + 2.5, y + 2.5, 2.2, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(x + 1.5, y + 1.8, x + 2.2, y + 1.8);
  doc.line(x + 2.2, y + 1.8, x + 3.2, y + 3.2);
  doc.line(x + 3.2, y + 3.2, x + 2.5, y + 3.5);
}

function drawMailIcon(doc: jsPDF, x: number, y: number) {
  doc.setFillColor(0, 43, 102);
  doc.roundedRect(x, y + 0.5, 5, 3.8, 0.5, 0.5, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(x, y + 0.5, x + 2.5, y + 2.3);
  doc.line(x + 5, y + 0.5, x + 2.5, y + 2.3);
}

export function generateInvoicePdf(order: Order, settings?: AppSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navyDark = [0, 43, 102]; // #002b66
  const textDark = [15, 23, 42]; // #0f172a
  const textMuted = [51, 65, 85]; // #334155
  const borderGray = [148, 163, 184]; // #94a3b8

  // Outer Page Border Frame (Matches professional invoice boundary)
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.3);
  doc.rect(8, 8, 194, 281);

  // ==========================================
  // 1. TOP HEADER SECTION
  // ==========================================

  // --- MOTHER DAIRY LOGO (Top Left) ---
  const logoX = 12;
  const logoY = 12;

  // Blue Shield Container
  doc.setFillColor(11, 133, 198);
  doc.roundedRect(logoX, logoY, 38, 22, 3, 3, 'F');

  // White inner rounded border line
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.6);
  doc.roundedRect(logoX + 1.2, logoY + 1.2, 35.6, 19.6, 2, 2, 'D');

  // Text inside logo
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('MOTHER', logoX + 19, logoY + 9, { align: 'center' });
  doc.setFontSize(11);
  doc.text('DAIRY', logoX + 19, logoY + 16, { align: 'center' });

  // Slogan under logo
  doc.setTextColor(28, 160, 216);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('happy food', logoX + 19, logoY + 26, { align: 'center' });
  doc.text('happy people', logoX + 19, logoY + 29.5, { align: 'center' });

  // --- DISTRIBUTOR DETAILS (Top Center) ---
  const headerCenterX = 102;
  let topY = 15;

  doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('MOTHER DAIRY', headerCenterX, topY, { align: 'center' });

  topY += 6;
  doc.setFontSize(13);
  const distributorTitle = settings?.businessName?.toUpperCase() || 'H R TRADER';
  doc.text(distributorTitle, headerCenterX, topY, { align: 'center' });

  topY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('KISHORGANJ. ROAD NO.2 BESIDE PRAGATI PRATIK CLUB', headerCenterX, topY, { align: 'center' });

  topY += 3.5;
  doc.text('KISHORGANJ, HARMU ROAD, RANCHI', headerCenterX, topY, { align: 'center' });

  topY += 3.5;
  doc.text('FASSI NO. 21125016001259', headerCenterX, topY, { align: 'center' });

  topY += 3.5;
  doc.text('GSTIN/UIN : 20ANLPP0362N2ZV', headerCenterX, topY, { align: 'center' });

  topY += 3.5;
  doc.text('State Name : Jharkhand, Code : 20', headerCenterX, topY, { align: 'center' });

  topY += 3.5;
  const phoneNo = settings?.phone || '9534159048';
  doc.text(`Contact : ${phoneNo}`, headerCenterX, topY, { align: 'center' });

  topY += 3.5;
  doc.text('E-Mail : deepakkomal4568@gmail.com', headerCenterX, topY, { align: 'center' });

  // --- INVOICE METADATA BOX (Top Right) ---
  let rightY = 14;

  doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TAX INVOICE', 198, rightY, { align: 'right' });

  rightY += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Invoice No.', 198, rightY, { align: 'right' });

  rightY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const formattedInvoiceNo = order.orderNumber.startsWith('HR/') ? order.orderNumber : `HR/${order.orderNumber}/26-27`;
  doc.text(formattedInvoiceNo, 198, rightY, { align: 'right' });

  // Dotted separator
  rightY += 3;
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(152, rightY, 198, rightY);
  doc.setLineDashPattern([], 0);

  rightY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Invoice Date', 198, rightY, { align: 'right' });

  rightY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(formatInvoiceDate(order.date), 198, rightY, { align: 'right' });

  // Dotted separator
  rightY += 3;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(152, rightY, 198, rightY);
  doc.setLineDashPattern([], 0);

  rightY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Place of Supply', 198, rightY, { align: 'right' });

  rightY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Jharkhand', 198, rightY, { align: 'right' });

  // ==========================================
  // 2. BUYER DETAILS SECTION
  // ==========================================
  const buyerBoxY = 52;
  const buyerBoxHeight = 33;

  // Outer Box
  doc.setDrawColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(12, buyerBoxY, 186, buyerBoxHeight, 2, 2, 'D');

  // Badge "Buyer Details"
  doc.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.roundedRect(12, buyerBoxY, 36, 6.5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Buyer Details', 30, buyerBoxY + 4.5, { align: 'center' });

  // Left Content Inside Buyer Box
  let bY = buyerBoxY + 11;
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(order.shopName.toUpperCase(), 16, bY);

  bY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const addrText = order.address || 'NEAR HOLLY CROSS SCHOOL, LOMER BURDWAN COMPOUND';
  const splitAddr = doc.splitTextToSize(addrText, 85);
  doc.text(splitAddr, 16, bY);

  bY += (splitAddr.length * 3.8);
  doc.text(`RANCHI (${order.phone})`, 16, bY);

  bY += 4;
  doc.text('State : Jharkhand, Code : 20', 16, bY);

  // Vertical Divider inside Buyer Box
  doc.setDrawColor(226, 232, 240);
  doc.line(108, buyerBoxY + 3, 108, buyerBoxY + buyerBoxHeight - 3);

  // Right Content Inside Buyer Box
  let rY = buyerBoxY + 13;

  drawPhoneIcon(doc, 114, rY - 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(order.phone || '9534159048', 123, rY);

  rY += 8;
  drawMailIcon(doc, 114, rY - 3);
  doc.text('deepakkomal4568@gmail.com', 123, rY);

  // ==========================================
  // 3. PRODUCT TABLE
  // ==========================================
  const tableTopY = 89;
  const tableHeaderHeight = 8;

  // Columns definition (Width sum = 186mm)
  const cols = [
    { id: 'sr', name: 'Sr. No.', width: 14, align: 'center', x: 12 },
    { id: 'desc', name: 'Description of Goods', width: 68, align: 'left', x: 26 },
    { id: 'hsn', name: 'HSN/SAC', width: 22, align: 'center', x: 94 },
    { id: 'mrp', name: 'MRP', width: 20, align: 'center', x: 116 },
    { id: 'qty', name: 'Qty', width: 20, align: 'center', x: 136 },
    { id: 'rate', name: 'Rate', width: 20, align: 'right', x: 156 },
    { id: 'amount', name: 'Total Amount', width: 22, align: 'right', x: 176 },
  ];

  // Header Background Fill (Navy)
  doc.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.rect(12, tableTopY, 186, tableHeaderHeight, 'F');

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  cols.forEach((c) => {
    let textX = c.x;
    if (c.align === 'center') textX = c.x + c.width / 2;
    if (c.align === 'right') textX = c.x + c.width - 2;
    if (c.align === 'left') textX = c.x + 2;

    doc.text(c.name, textX, tableTopY + 5.2, { align: c.align as any });
  });

  // Table Body Rows
  let currentY = tableTopY + tableHeaderHeight;
  let totalQtySum = 0;
  let totalAmountSum = 0;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  const rowMinHeight = 8.5;
  const tableMinBottomY = 222;

  order.items.forEach((item, index) => {
    const qtyPcs = item.totalPieces || item.caseQty * item.piecesPerCase + item.pieceQty;
    const mrp = item.mrpAtOrder || 0;
    const ptr = item.ptrAtOrder || 0;
    const lineAmount = qtyPcs * ptr;

    totalQtySum += qtyPcs;
    totalAmountSum += lineAmount;

    const hsnCode = item.hsnCode || getHsnForCategory(item.category, item.productName);
    const prodName = item.productName.toUpperCase();
    const qtyStr = `${qtyPcs} Pcs`;

    const yVal = currentY + 5.5;

    // Sr No.
    doc.text(`${index + 1}`, cols[0].x + cols[0].width / 2, yVal, { align: 'center' });

    // Description of Goods
    doc.text(prodName.substring(0, 36), cols[1].x + 2, yVal, { align: 'left' });

    // HSN/SAC
    doc.text(hsnCode, cols[2].x + cols[2].width / 2, yVal, { align: 'center' });

    // MRP (formatted 2 decimals)
    doc.text(mrp.toFixed(2), cols[3].x + cols[3].width / 2, yVal, { align: 'center' });

    // Qty (e.g. 15 Pcs)
    doc.text(qtyStr, cols[4].x + cols[4].width / 2, yVal, { align: 'center' });

    // Rate (PTR e.g. 25.71)
    doc.text(ptr.toFixed(2), cols[5].x + cols[5].width - 2, yVal, { align: 'right' });

    // Total Amount (Quantity x PTR)
    doc.text(lineAmount.toFixed(2), cols[6].x + cols[6].width - 2, yVal, { align: 'right' });

    currentY += rowMinHeight;
  });

  const tableBottomY = Math.max(currentY, tableMinBottomY);

  // Outer table frame & vertical column grid lines
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.2);

  doc.rect(12, tableTopY, 186, tableBottomY - tableTopY, 'D');

  let curX = 12;
  cols.forEach((c, i) => {
    if (i < cols.length - 1) {
      curX += c.width;
      doc.line(curX, tableTopY, curX, tableBottomY);
    }
  });

  // Table horizontal grid lines
  let hY = tableTopY + tableHeaderHeight;
  while (hY < tableBottomY) {
    doc.line(12, hY, 198, hY);
    hY += rowMinHeight;
  }

  // ==========================================
  // 4. TABLE TOTAL FOOTER ROW
  // ==========================================
  const totalRowY = tableBottomY;
  const totalRowHeight = 8.5;

  doc.setFillColor(255, 255, 255);
  doc.rect(12, totalRowY, 186, totalRowHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  doc.text('Total', 16, totalRowY + 5.5);
  doc.text(`${totalQtySum} Pcs`, cols[4].x + cols[4].width / 2, totalRowY + 5.5, { align: 'center' });

  const formattedGrandTotal = totalAmountSum.toFixed(2);
  doc.text(formattedGrandTotal, cols[6].x + cols[6].width - 2, totalRowY + 5.5, { align: 'right' });

  // ==========================================
  // 5. GRAND TOTAL SUMMARY BOX (Bottom Right)
  // ==========================================
  const summaryY = totalRowY + totalRowHeight + 6;
  const boxWidthLeft = 38;
  const boxWidthRight = 36;
  const summaryBoxHeight = 11;
  const summaryXLeft = 198 - boxWidthLeft - boxWidthRight; // 124mm
  const summaryXRight = summaryXLeft + boxWidthLeft; // 162mm

  // Left Navy Box "TOTAL AMOUNT"
  doc.setFillColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.rect(summaryXLeft, summaryY, boxWidthLeft, summaryBoxHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TOTAL AMOUNT', summaryXLeft + boxWidthLeft / 2, summaryY + 7, { align: 'center' });

  // Right White Box "₹ 771.30"
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.setLineWidth(0.4);
  doc.rect(summaryXRight, summaryY, boxWidthRight, summaryBoxHeight, 'FD');

  doc.setTextColor(navyDark[0], navyDark[1], navyDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`₹ ${formattedGrandTotal}`, summaryXRight + boxWidthRight / 2, summaryY + 7.2, { align: 'center' });

  const fileName = `Invoice_${formattedInvoiceNo.replace(/[^a-zA-Z0-9]/g, '_')}_${order.shopName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  saveOrOpenPdf(doc, fileName);
}

/**
 * Route Party List Export (Includes EVERY store assigned to that route)
 */
export function generateRouteStoresPdf(route: Route, parties: Party[]) {
  const doc = new jsPDF();
  const routeParties = parties.filter(p => p.routeId === route.id || p.routeName === route.name);

  // Header Banner
  doc.setFillColor(15, 41, 66);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`MOTHER DAIRY SALES - ROUTE MASTER REPORT`, 14, 11);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`ROUTE: ${route.name.toUpperCase()} (${route.day || 'Scheduled Route'}) | TOTAL RETAILERS: ${routeParties.length}`, 14, 18);

  let y = 30;

  if (routeParties.length === 0) {
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.text('No active shops assigned to this route.', 14, y);
    saveOrOpenPdf(doc, `Route_${route.name}_Stores.pdf`);
    return;
  }

  routeParties.forEach((party, index) => {
    const ownerText = party.ownerName ? party.ownerName : 'N/A';
    const areaText = party.area ? party.area : (party.routeName || 'N/A');
    const fullAddressText = party.address ? party.address : 'N/A';

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const wrappedAddress = doc.splitTextToSize(`Full Address: ${fullAddressText}`, 175);
    const addressHeight = wrappedAddress.length * 3.8;
    const cardHeight = 16 + addressHeight;

    if (y + cardHeight > 275) {
      doc.addPage();
      y = 20;
    }

    // Card background box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, 182, cardHeight, 'FD');

    // Title Row
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 41, 66);
    doc.text(`${index + 1}. ${party.shopName} (${party.shopNumber || 'S-' + (index + 101)})`, 18, y + 5.5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 116, 144);
    doc.text(`Route: ${party.routeName || route.name}`, 145, y + 5.5);

    // Metadata Row
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`Owner: ${ownerText}`, 18, y + 10);
    doc.text(`Phone: ${party.phone || 'N/A'}`, 80, y + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Area: ${areaText}`, 140, y + 10);

    // Full Address Row
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(wrappedAddress, 18, y + 14.5);

    y += cardHeight + 4;
  });

  saveOrOpenPdf(doc, `Route_${route.name.replace(/[^a-zA-Z0-9]/g, '_')}_Parties.pdf`);
}

/**
 * Single Party Full Details PDF Export
 */
export function generateSinglePartyPdf(party: Party, orders: Order[] = []) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(15, 41, 66);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`MOTHER DAIRY RETAIL PARTY PROFILE`, 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Shop Number: ${party.shopNumber} | Generated on ${new Date().toLocaleDateString('en-IN')}`, 14, 19);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`SHOP & OWNER INFORMATION`, 14, 34);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const infoRows = [
    [`Shop Name: ${party.shopName}`, `Owner Name: ${party.ownerName}`],
    [`Shop Number: ${party.shopNumber}`, `Primary Phone: ${party.phone}`],
    [`Alt Phone: ${party.altPhone || 'N/A'}`, `Route Name: ${party.routeName}`],
    [`Area: ${party.area || 'N/A'}`, `Landmark: ${party.landmark || 'N/A'}`],
    [`Address: ${party.address}`, `Status: ${party.active ? 'Active Retailer' : 'Inactive'}`],
    [`Lifetime Orders: ${party.lifetimeOrders}`, `Lifetime Sales Value: ₹${party.lifetimeValue.toLocaleString('en-IN')}`]
  ];

  let y = 40;
  infoRows.forEach(row => {
    doc.text(row[0], 14, y);
    doc.text(row[1], 110, y);
    y += 6;
  });

  // Order history
  y += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`ORDER HISTORY (${orders.length} Records)`, 14, y);

  y += 6;
  if (orders.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('No historical orders found for this party.', 14, y);
  } else {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFontSize(8);
    doc.text('ORDER #', 16, y + 5);
    doc.text('DATE', 50, y + 5);
    doc.text('ITEMS', 80, y + 5);
    doc.text('CASES / PCS', 110, y + 5);
    doc.text('TOTAL AMOUNT', 150, y + 5);
    doc.text('STATUS', 180, y + 5);

    y += 7;
    doc.setFont('helvetica', 'normal');

    orders.forEach((o) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 5, 196, y + 5);

      doc.text(`#${o.orderNumber}`, 16, y + 4);
      doc.text(o.date, 50, y + 4);
      doc.text(`${o.items.length} Products`, 80, y + 4);
      doc.text(`${o.totalCases} Cse / ${o.totalPieces} Pcs`, 110, y + 4);
      doc.text(`₹${o.grandTotal.toLocaleString('en-IN')}`, 150, y + 4);
      doc.text(o.deliveryStatus, 180, y + 4);

      y += 6;
    });
  }

  saveOrOpenPdf(doc, `Party_${party.shopName.replace(/[^a-zA-Z0-9]/g, '_')}_Profile.pdf`);
}

/**
 * Helper to handle PDF downloads reliably across Browsers, PWA, Mobile, and WebIntoApp / Android WebViews
 */
export async function saveOrOpenPdf(doc: jsPDF, fileName: string) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isWebView =
    /wv|Android.*Version\/[0-9.]+/i.test(navigator.userAgent) ||
    /WebIntoApp|Website2APK|gonative|median|cordova|capacitor/i.test(navigator.userAgent) ||
    !!(window as any).Android;

  let pdfBlob: Blob;
  try {
    pdfBlob = doc.output('blob');
  } catch {
    const arrayBuffer = doc.output('arraybuffer');
    pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
  }

  const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(pdfBlob);

  // 1. For desktop browsers: use doc.save and blob link
  if (!isMobile && !isWebView) {
    try {
      doc.save(fileName);
      return;
    } catch {
      // fallback to blob download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 5000);
      return;
    }
  }

  // 2. On Mobile / Android WebView App:
  // Trigger direct download without raw base64 dataURI
  try {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.target = '_self';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 1000);
  } catch (err) {
    console.warn('Blob link download attempt:', err);
  }

  // 3. Always show clean In-App PDF action modal on Android App / Mobile to guarantee 100% reliable saving / sharing
  showPdfOverlayModal(blobUrl, fileName, pdfBlob, file);
}

/**
 * Creates a clean in-app overlay modal for Android WebViews & Mobile
 * Completely eliminates raw datauristring alerts and provides native Android file saving / sharing
 */
function showPdfOverlayModal(blobUrl: string, fileName: string, blob: Blob, file: File) {
  const existing = document.getElementById('pdf-webview-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'pdf-webview-modal';
  modal.style.cssText =
    'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

  const container = document.createElement('div');
  container.style.cssText =
    'background:#ffffff;border-radius:20px;max-width:420px;width:100%;padding:24px 20px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);border:1px solid #e2e8f0;text-align:center;box-sizing:border-box;max-height:90vh;overflow-y:auto;';

  const sizeKb = (blob.size / 1024).toFixed(1);

  container.innerHTML = `
    <div style="width:54px;height:54px;background:#e0f2fe;color:#0284c7;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:26px;box-shadow:0 2px 6px rgba(2,132,199,0.15);">
      📄
    </div>
    <h3 style="font-weight:800;font-size:18px;color:#0f172a;margin:0 0 6px 0;">PDF Document Ready</h3>
    <p style="font-size:12px;color:#475569;margin:0 0 16px 0;line-height:1.4;">
      <strong style="color:#0f172a;word-break:break-all;">${fileName}</strong><br/>
      <span style="font-size:11px;color:#64748b;">Size: ${sizeKb} KB • PDF Document</span>
    </p>

    <div style="display:flex;flex-direction:column;gap:10px;">
      <!-- Native Android Share / Save to Phone Button -->
      <button id="modal-share-btn" type="button"
         style="width:100%;padding:13px 16px;background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%);color:#ffffff;font-weight:700;font-size:13px;border-radius:14px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 12px rgba(2,132,199,0.25);">
        <span>📲</span>
        <span>Save to Phone Storage / Share</span>
      </button>

      <!-- Direct Download Button -->
      <button id="modal-direct-download-btn" type="button"
         style="width:100%;padding:12px 16px;background:#f8fafc;color:#0f172a;font-weight:700;font-size:12px;border-radius:14px;border:1px solid #cbd5e1;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
        <span>📥</span>
        <span>Download File to Device</span>
      </button>

      <!-- View / Print Button -->
      <button id="modal-view-btn" type="button"
         style="width:100%;padding:11px 16px;background:#f1f5f9;color:#334155;font-weight:700;font-size:12px;border-radius:14px;border:1px solid #e2e8f0;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
        <span>👁️</span>
        <span>Open / Print Document Preview</span>
      </button>

      <!-- Close Button -->
      <button id="modal-close-btn" type="button"
         style="width:100%;padding:10px 16px;background:transparent;color:#64748b;font-weight:600;font-size:12px;border-radius:14px;border:none;cursor:pointer;margin-top:2px;">
        Dismiss
      </button>
    </div>
  `;

  modal.appendChild(container);
  document.body.appendChild(modal);

  const cleanup = () => {
    modal.remove();
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 10000);
  };

  // Close handler
  document.getElementById('modal-close-btn')?.addEventListener('click', cleanup);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cleanup();
  });

  // Native Android Share / Save handler
  document.getElementById('modal-share-btn')?.addEventListener('click', async () => {
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: fileName,
          text: `Mother Dairy Document - ${fileName}`,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('Share error:', err);
      }
    }

    // Fallback if native share is not available
    const dlLink = document.createElement('a');
    dlLink.href = blobUrl;
    dlLink.download = fileName;
    document.body.appendChild(dlLink);
    dlLink.click();
    setTimeout(() => {
      if (document.body.contains(dlLink)) document.body.removeChild(dlLink);
    }, 1000);
  });

  // Direct Download handler
  document.getElementById('modal-direct-download-btn')?.addEventListener('click', () => {
    const dlLink = document.createElement('a');
    dlLink.href = blobUrl;
    dlLink.download = fileName;
    document.body.appendChild(dlLink);
    dlLink.click();
    setTimeout(() => {
      if (document.body.contains(dlLink)) document.body.removeChild(dlLink);
    }, 1000);
  });

  // Open / Print preview handler
  document.getElementById('modal-view-btn')?.addEventListener('click', () => {
    try {
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        window.location.href = blobUrl;
      }
    } catch {
      window.location.href = blobUrl;
    }
  });
}



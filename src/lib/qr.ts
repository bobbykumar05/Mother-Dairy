import QRCode from 'qrcode';

/**
 * Generates UPI deep link and QR Code Data URL
 * format: upi://pay?pa=[UPI_ID]&pn=[PAYEE]&am=[AMOUNT]&cu=INR
 */
export async function generateUpiQrDataUrl(
  upiId: string,
  payeeName: string,
  amount: number,
  note?: string
): Promise<string> {
  if (!upiId) return '';
  
  const cleanUpi = upiId.trim();
  const cleanPayee = encodeURIComponent(payeeName.trim() || 'Mother Dairy Sales');
  const cleanAmount = amount > 0 ? amount.toFixed(2) : '0.00';
  const cleanNote = encodeURIComponent(note || 'Mother Dairy Bill Payment');

  const upiUrl = `upi://pay?pa=${cleanUpi}&pn=${cleanPayee}&am=${cleanAmount}&cu=INR&tn=${cleanNote}`;

  try {
    const dataUrl = await QRCode.toDataURL(upiUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#0f2942',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}

// src/services/receiptService.js
import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from '../utils/formatters';

export const receiptService = {
  /**
   * Generates a formal A4 vector PDF Sales Invoice/Receipt.
   */
  generateOfficialPDF(order, storeInfo = {}) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const storeName = storeInfo.name || 'PETRON SAN PEDRO STATION';
    const storeAddress = storeInfo.address || 'National Highway, San Pedro, Laguna';
    const storePhone = storeInfo.phone || '+63 (02) 8123-4567';
    const storeTin = storeInfo.tin || 'TIN: 123-456-789-00000';

    const orderNum = String(order.id || '').slice(0, 8).toUpperCase();
    const orderDate = order.created_at ? formatDate(order.created_at) : formatDate(new Date());
    const customerName = order.profiles?.full_name || order.customer_name || 'Valued Customer';
    const customerPhone = order.profiles?.phone_number || order.phone_number || 'N/A';
    const deliveryAddress = order.delivery_address || order.address || 'Store Pickup';
    const paymentMethod = (order.payment_method || 'Cash on Delivery').toUpperCase();

    // Primary Colors
    doc.setFillColor(0, 51, 160); // #0033A0 Petron Blue
    doc.rect(0, 0, 210, 28, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(storeName, 15, 14);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL SALES INVOICE / RECEIPT', 15, 22);

    // Right header tag
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`INVOICE #${orderNum}`, 195, 14, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${orderDate}`, 195, 22, { align: 'right' });

    // Store & Customer Info Section
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ISSUER / STORE DETAILS:', 15, 38);
    doc.setFont('helvetica', 'normal');
    doc.text(storeAddress, 15, 43);
    doc.text(`Contact: ${storePhone} | ${storeTin}`, 15, 48);

    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER / BILL TO:', 120, 38);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${customerName}`, 120, 43);
    doc.text(`Phone: ${customerPhone}`, 120, 48);
    doc.text(`Address: ${deliveryAddress.slice(0, 45)}`, 120, 53);

    // Horizontal Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 58, 195, 58);

    // Table Header
    doc.setFillColor(240, 243, 250);
    doc.rect(15, 62, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 51, 160);
    doc.text('ITEM DESCRIPTION', 18, 67.5);
    doc.text('QTY', 125, 67.5, { align: 'center' });
    doc.text('UNIT PRICE', 155, 67.5, { align: 'right' });
    doc.text('AMOUNT', 190, 67.5, { align: 'right' });

    // Table Rows
    let y = 76;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);

    const items = order.order_items || [];
    items.forEach((item, index) => {
      const name = item.products?.name || item.product_name || `Item #${index + 1}`;
      const qty = Number(item.quantity || 1);
      const price = Number(item.price_per_unit || item.unit_price || item.products?.price || 0);
      const total = qty * price;

      doc.text(name.slice(0, 48), 18, y);
      doc.text(String(qty), 125, y, { align: 'center' });
      doc.text(`PHP ${price.toFixed(2)}`, 155, y, { align: 'right' });
      doc.text(`PHP ${total.toFixed(2)}`, 190, y, { align: 'right' });

      y += 7;
    });

    // Divider after items
    doc.line(15, y + 2, 195, y + 2);
    y += 8;

    // Totals Summary
    const subtotal = Number(order.subtotal || order.total_amount || 0);
    const deliveryFee = Number(order.delivery_fee || 0);
    const grandTotal = Number(order.total_amount || subtotal + deliveryFee);
    const vatableSales = grandTotal / 1.12;
    const vatAmount = grandTotal - vatableSales;

    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 140, y);
    doc.text(`PHP ${subtotal.toFixed(2)}`, 190, y, { align: 'right' });
    y += 5;

    doc.text('Delivery Fee:', 140, y);
    doc.text(`PHP ${deliveryFee.toFixed(2)}`, 190, y, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 160);
    doc.text('TOTAL AMOUNT DUE:', 130, y + 2);
    doc.text(`PHP ${grandTotal.toFixed(2)}`, 190, y + 2, { align: 'right' });
    y += 10;

    // Tax Breakdown Box
    doc.setFillColor(248, 249, 250);
    doc.rect(15, y, 180, 18, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(15, y, 180, 18, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`VATable Sales: PHP ${vatableSales.toFixed(2)}`, 20, y + 6);
    doc.text(`12% VAT Amount: PHP ${vatAmount.toFixed(2)}`, 85, y + 6);
    doc.text(`Payment Method: ${paymentMethod}`, 145, y + 6);
    doc.text(`Payment Status: ${order.status?.toUpperCase() || 'COMPLETED'}`, 20, y + 13);
    doc.text(`Served By: Authorized Admin System`, 85, y + 13);

    // Footer
    y += 26;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Thank you for your business! Official Electronic Invoice generated by Petron & MKC Enterprise Platform.', 105, y, { align: 'center' });

    doc.save(`Official-Invoice-${orderNum}.pdf`);
  },

  /**
   * Opens 80mm POS Thermal Receipt print view in standard browser print engine.
   */
  printThermalPOS(order, storeInfo = {}) {
    const storeName = storeInfo.name || 'PETRON SAN PEDRO STATION';
    const storeAddress = storeInfo.address || 'National Highway, San Pedro, Laguna';
    const storePhone = storeInfo.phone || '+63 (02) 8123-4567';

    const orderNum = String(order.id || '').slice(0, 8).toUpperCase();
    const orderDate = order.created_at ? formatDate(order.created_at) : formatDate(new Date());
    const customerName = order.profiles?.full_name || order.customer_name || 'Customer';
    const paymentMethod = (order.payment_method || 'COD').toUpperCase();

    const items = order.order_items || [];
    const subtotal = Number(order.subtotal || order.total_amount || 0);
    const deliveryFee = Number(order.delivery_fee || 0);
    const grandTotal = Number(order.total_amount || subtotal + deliveryFee);

    const itemsHTML = items.map(item => `
      <tr>
        <td style="padding: 2px 0;">${(item.products?.name || item.product_name || 'Item').slice(0, 20)}</td>
        <td style="text-align: center; padding: 2px 0;">${item.quantity || 1}</td>
        <td style="text-align: right; padding: 2px 0;">₱${Number(item.price_per_unit || item.unit_price || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>POS Receipt #${orderNum}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            width: 76mm;
            margin: 2mm auto;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            color: #000;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="text-center bold" style="font-size: 13px;">${storeName}</div>
        <div class="text-center">${storeAddress}</div>
        <div class="text-center">Tel: ${storePhone}</div>
        <div class="divider"></div>
        <div>ORDER #: ${orderNum}</div>
        <div>DATE: ${orderDate}</div>
        <div>CUSTOMER: ${customerName}</div>
        <div>PAYMENT: ${paymentMethod}</div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left;">ITEM</th>
              <th style="text-align: center;">QTY</th>
              <th style="text-align: right;">PRICE</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between;">
          <span>Subtotal:</span>
          <span>₱${subtotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Delivery Fee:</span>
          <span>₱${deliveryFee.toFixed(2)}</span>
        </div>
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between; font-size: 12px;" class="bold">
          <span>TOTAL DUE:</span>
          <span>₱${grandTotal.toFixed(2)}</span>
        </div>
        <div class="divider"></div>
        <div class="text-center bold" style="margin-top: 8px;">THANK YOU FOR YOUR ORDER!</div>
        <div class="text-center" style="font-size: 9px; margin-top: 4px;">Powered by Petron & MKC Platform</div>
        <script>
          window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=400,height=600');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    }
  }
};

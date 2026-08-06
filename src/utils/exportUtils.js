// src/utils/exportUtils.js
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Downloads raw CSV content with UTF-8 BOM for Excel compatibility.
 */
export function downloadCSV(filename, headers, rows) {
  const csvBody = rows.map((row) =>
    row
      .map((value) => {
        const text = String(value ?? '');
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      })
      .join(',')
  );

  const csvContent = [headers.join(','), ...csvBody].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/**
 * Downloads formatted Excel (.xlsx) file using ExcelJS.
 */
export async function downloadExcel(filename, sheetName, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName || 'Report');

  worksheet.columns = columns;

  // Add rows
  rows.forEach((rowData) => {
    worksheet.addRow(rowData);
  });

  // Header row styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0033A0' },
  };
  headerRow.height = 24;

  // Auto column widths
  worksheet.columns.forEach((column) => {
    let maxLength = column.header ? column.header.length : 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLength) maxLength = len;
    });
    column.width = Math.min(Math.max(maxLength + 4, 12), 40);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Exports order data to CSV or Excel.
 */
export async function exportOrdersData(orders, format = 'csv') {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `orders-export-${dateStr}`;

  const headers = [
    'Order ID',
    'Date & Time',
    'Customer Name',
    'Status',
    'Payment Method',
    'Subtotal (₱)',
    'Delivery Fee (₱)',
    'Total Amount (₱)',
    'Rider',
  ];

  const rows = (orders || []).map((o) => [
    String(o.id || '').slice(0, 8),
    o.created_at ? new Date(o.created_at).toLocaleString() : '',
    o.profiles?.full_name || o.customer_name || 'Customer',
    o.status || '',
    o.payment_method || 'COD',
    Number(o.subtotal || 0).toFixed(2),
    Number(o.delivery_fee || 0).toFixed(2),
    Number(o.total_amount || 0).toFixed(2),
    o.rider?.full_name || 'Unassigned',
  ]);

  if (format === 'excel') {
    const columns = headers.map((h, i) => ({
      header: h,
      key: `col_${i}`,
    }));

    const excelRows = rows.map((r) => {
      const obj = {};
      r.forEach((val, i) => {
        obj[`col_${i}`] = val;
      });
      return obj;
    });

    await downloadExcel(filename, 'Orders Export', columns, excelRows);
  } else {
    downloadCSV(filename, headers, rows);
  }
}

/**
 * Exports rider performance & payout data to CSV or Excel.
 */
export async function exportRiderPayouts(leaderboardData, format = 'csv') {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `rider-payouts-${dateStr}`;

  const headers = [
    'Rank',
    'Rider Name',
    'Phone Number',
    'Vehicle Plate',
    'Status',
    'Total Assigned',
    'Completed Deliveries',
    'Completion Rate (%)',
    'Delivery Fee Earnings (₱)',
    'Avg Delivery Time (mins)',
    'Performance Score',
  ];

  const rows = (leaderboardData || []).map((entry) => [
    entry.rank || '-',
    entry.rider?.full_name || 'Rider',
    entry.rider?.phone_number || '',
    entry.rider?.vehicle_plate || '',
    entry.rider?.is_active ? 'Active' : 'Inactive',
    entry.stats?.total || 0,
    entry.stats?.completed || 0,
    `${entry.stats?.completionRate || 0}%`,
    Number(entry.stats?.earnings || 0).toFixed(2),
    entry.stats?.avgDeliveryTime ? `${entry.stats.avgDeliveryTime} mins` : 'N/A',
    entry.score || 0,
  ]);

  if (format === 'excel') {
    const columns = headers.map((h, i) => ({
      header: h,
      key: `col_${i}`,
    }));

    const excelRows = rows.map((r) => {
      const obj = {};
      r.forEach((val, i) => {
        obj[`col_${i}`] = val;
      });
      return obj;
    });

    await downloadExcel(filename, 'Rider Payouts & Performance', columns, excelRows);
  } else {
    downloadCSV(filename, headers, rows);
  }
}

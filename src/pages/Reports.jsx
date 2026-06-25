// src/pages/Reports.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Download, 
  BarChart3, 
  DollarSign,
  ShoppingCart,
  Users,
  RefreshCw,
  ChevronDown,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import ErrorAlert from '../components/common/ErrorAlert';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatDate } from '../utils/formatters';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

// Skeleton Components
const StatCardSkeleton = () => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 animate-pulse">
    <div className="flex justify-between mb-2">
      <div className="h-4 w-24 bg-gray-200 rounded"></div>
      <div className="w-8 h-8 bg-gray-200 rounded"></div>
    </div>
    <div className="h-8 w-32 bg-gray-300 rounded mb-2"></div>
    <div className="h-3 w-20 bg-gray-200 rounded"></div>
  </div>
);

const CategorySkeleton = () => (
  <div className="space-y-3">
    {[1,2,3,4].map(i => (
      <div key={i} className="animate-pulse">
        <div className="flex justify-between mb-1">
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-gray-300 h-2 rounded-full" style={{ width: `${Math.random() * 100}%` }}></div>
        </div>
      </div>
    ))}
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
    <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
    <div className="space-y-4">
      {[1,2,3,4,5,6,7].map(i => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
          <div className="flex-1 h-8 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

// Export Dropdown Component
const ExportDropdown = ({ onExport, disabled, exporting }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || exporting}
        className="bg-petron-blue text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {exporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Exporting...
          </>
        ) : (
          <>
            <Download size={18} />
            Export
            <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && !exporting && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={() => {
              setIsOpen(false);
              onExport('excel');
            }}
            className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors"
          >
            <FileSpreadsheet size={18} className="text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">Excel (.xlsx)</p>
              <p className="text-xs text-gray-400">Download as spreadsheet</p>
            </div>
          </button>
          
          <button
            onClick={() => {
              setIsOpen(false);
              onExport('pdf');
            }}
            className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors border-t border-gray-100"
          >
            <FileText size={18} className="text-red-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">PDF Document</p>
              <p className="text-xs text-gray-400">Download as printable report</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default function Reports() {
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Memoized date range calculation
  const dateRangeLabel = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch(dateRange) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
      default:
        return 'Custom Range';
    }
  }, [dateRange]);

  const fetchReportData = useCallback(async (isSilent = false, showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else if (!isSilent) {
        setLoading(true);
      }
      setError(null);
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch(dateRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
      }

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_user_id_fkey (
            full_name
          ),
          order_items (
            quantity,
            price_at_order,
            products (
              name,
              category
            )
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;

      const completedOrders = orders?.filter(o => o.status === 'Completed') || [];
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const totalOrders = orders?.length || 0;

      const statusCounts = (orders || []).reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      const categorySales = (orders || []).reduce((acc, order) => {
        order.order_items?.forEach(item => {
          const category = item.products?.category || 'Other';
          if (!acc[category]) {
            acc[category] = { 
              revenue: 0, 
              quantity: 0, 
              orders: new Set() 
            };
          }
          acc[category].revenue += (item.quantity * item.price_at_order) || 0;
          acc[category].quantity += item.quantity || 0;
          acc[category].orders.add(order.id);
        });
        return acc;
      }, {});

      Object.keys(categorySales).forEach(category => {
        categorySales[category].orderCount = categorySales[category].orders.size;
        delete categorySales[category].orders;
      });

      const timeSeriesData = {};
      (orders || []).forEach(order => {
        if (order.status === 'Completed') {
          const date = dateRange === 'year' 
            ? new Date(order.created_at).toLocaleString('default', { month: 'short', year: 'numeric' })
            : formatDate(order.created_at);
          timeSeriesData[date] = (timeSeriesData[date] || 0) + (order.total_amount || 0);
        }
      });

      const customerSpending = (orders || []).reduce((acc, order) => {
        if (order.status === 'Completed' && order.profiles) {
          const customerId = order.user_id;
          if (!acc[customerId]) {
            acc[customerId] = {
              name: order.profiles.full_name || 'Unknown Customer',
              totalSpent: 0,
              orderCount: 0
            };
          }
          acc[customerId].totalSpent += order.total_amount || 0;
          acc[customerId].orderCount += 1;
        }
        return acc;
      }, {});

      const topCustomers = Object.values(customerSpending)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      setReportData({
        summary: {
          totalRevenue,
          totalOrders,
          completedOrders: completedOrders.length,
          pendingOrders: statusCounts['Pending'] || 0,
          processingOrders: statusCounts['Processing'] || 0,
          cancelledOrders: statusCounts['Cancelled'] || 0,
          averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
          uniqueCustomers: new Set((orders || []).map(o => o.user_id)).size
        },
        categorySales,
        timeSeriesData: Object.entries(timeSeriesData).map(([date, amount]) => ({ date, amount })),
        topCustomers,
        dateRange: {
          start: startDate,
          end: endDate,
          label: dateRangeLabel
        }
      });
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, dateRangeLabel]);

  useEffect(() => {
    fetchReportData();

    const subscription = supabase
      .channel('reports-orders-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchReportData(true, false);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchReportData]);

  const handleRefresh = useCallback(() => {
    fetchReportData(true);
  }, [fetchReportData]);

  const handleDateRangeChange = useCallback((e) => {
    setDateRange(e.target.value);
  }, []);

  const getPercentage = useCallback((value, total) => {
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, (value / total) * 100));
  }, []);

  // ================== EXCEL EXPORT ==================
  const exportToExcel = useCallback(async () => {
    if (!reportData) return;
    setExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Petron Admin';
      workbook.created = new Date();

      // Sheet 1: Executive Summary
      const summarySheet = workbook.addWorksheet('Executive Summary', {
        properties: { tabColor: { argb: 'FF0033A0' } }
      });

      summarySheet.mergeCells('A1:D1');
      const titleCell = summarySheet.getCell('A1');
      titleCell.value = 'Petron Admin Report';
      titleCell.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0033A0' }
      };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      summarySheet.getRow(1).height = 40;

      summarySheet.mergeCells('A2:D2');
      const dateCell = summarySheet.getCell('A2');
      dateCell.value = `Report Period: ${reportData.dateRange.label}`;
      dateCell.font = { size: 12, bold: true };
      dateCell.alignment = { horizontal: 'center' };
      summarySheet.getRow(2).height = 30;

      const statsData = [
        ['Metric', 'Value', '', ''],
        ['Total Revenue', formatCurrency(reportData.summary.totalRevenue), '', ''],
        ['Total Orders', reportData.summary.totalOrders, '', ''],
        ['Completed Orders', reportData.summary.completedOrders, '', ''],
        ['Pending Orders', reportData.summary.pendingOrders, '', ''],
        ['Processing Orders', reportData.summary.processingOrders, '', ''],
        ['Cancelled Orders', reportData.summary.cancelledOrders, '', ''],
        ['Average Order Value', formatCurrency(reportData.summary.averageOrderValue), '', ''],
        ['Unique Customers', reportData.summary.uniqueCustomers, '', ''],
        ['Success Rate', `${reportData.summary.totalOrders > 0 ? Math.round((reportData.summary.completedOrders / reportData.summary.totalOrders) * 100) : 0}%`, '', ''],
      ];

      statsData.forEach((row, index) => {
        const rowNum = index + 4;
        const excelRow = summarySheet.addRow(row);
        
        if (index === 0) {
          excelRow.font = { bold: true, size: 11 };
          excelRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE5EEFF' }
          };
        } else {
          excelRow.getCell(2).font = { bold: true, color: { argb: 'FF0033A0' } };
        }
        
        excelRow.height = 25;
        excelRow.getCell(1).border = {
          top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        excelRow.getCell(2).border = {
          top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      summarySheet.getColumn(1).width = 25;
      summarySheet.getColumn(2).width = 25;

      // Sheet 2: Sales Timeline
      const timelineSheet = workbook.addWorksheet('Sales Timeline', {
        properties: { tabColor: { argb: 'FF00A86B' } }
      });

      const timelineHeaders = ['Date', 'Revenue'];
      timelineSheet.addRow(timelineHeaders);
      const headerRow2 = timelineSheet.getRow(1);
      headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00A86B' }
      };
      headerRow2.height = 25;

      reportData.timeSeriesData.forEach(({ date, amount }) => {
        const row = timelineSheet.addRow([date, amount]);
        row.getCell(2).numFmt = '"Php"#,##0.00';
        row.height = 20;
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        });
      });

      const totalRow = timelineSheet.addRow(['TOTAL', reportData.summary.totalRevenue]);
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5EEFF' }
      };
      totalRow.getCell(2).numFmt = '"Php"#,##0.00';

      timelineSheet.getColumn(1).width = 25;
      timelineSheet.getColumn(2).width = 20;

      // Sheet 3: Category Breakdown
      const categorySheet = workbook.addWorksheet('Category Breakdown', {
        properties: { tabColor: { argb: 'FFED1C24' } }
      });

      const categoryHeaders = ['Category', 'Revenue', 'Quantity', 'Orders'];
      categorySheet.addRow(categoryHeaders);
      const headerRow3 = categorySheet.getRow(1);
      headerRow3.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow3.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFED1C24' }
      };
      headerRow3.height = 25;

      Object.entries(reportData.categorySales)
        .sort(([,a], [,b]) => b.revenue - a.revenue)
        .forEach(([category, data]) => {
          const row = categorySheet.addRow([
            category,
            data.revenue,
            data.quantity,
            data.orderCount
          ]);
          row.getCell(2).numFmt = '"Php"#,##0.00';
          row.height = 20;
          row.eachCell(cell => {
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
            };
          });
        });

      categorySheet.getColumn(1).width = 30;
      categorySheet.getColumn(2).width = 20;
      categorySheet.getColumn(3).width = 15;
      categorySheet.getColumn(4).width = 15;

      // Sheet 4: Top Customers
      if (reportData.topCustomers.length > 0) {
        const customerSheet = workbook.addWorksheet('Top Customers', {
          properties: { tabColor: { argb: 'FFFFA500' } }
        });

        const customerHeaders = ['Customer', 'Total Spent', 'Orders'];
        customerSheet.addRow(customerHeaders);
        const headerRow4 = customerSheet.getRow(1);
        headerRow4.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow4.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFA500' }
        };
        headerRow4.height = 25;

        reportData.topCustomers.forEach(customer => {
          const row = customerSheet.addRow([
            customer.name,
            customer.totalSpent,
            customer.orderCount
          ]);
          row.getCell(2).numFmt = '"Php"#,##0.00';
          row.height = 20;
          row.eachCell(cell => {
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
            };
          });
        });

        customerSheet.getColumn(1).width = 35;
        customerSheet.getColumn(2).width = 20;
        customerSheet.getColumn(3).width = 15;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      saveAs(blob, `petron-report-${dateRange}-${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (err) {
      console.error('Excel export error:', err);
      setError('Failed to export Excel: ' + err.message);
    } finally {
      setExporting(false);
    }
  }, [reportData, dateRange]);

  // ================== PDF EXPORT (Document Mode) ==================
  // ================== PDF EXPORT (Document Mode - Fixed) ==================
  // ================== PDF EXPORT (Document Mode - Fully Fixed) ==================
  const exportToPDF = useCallback(async () => {
    if (!reportData) return;
    setExporting(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      // CRITICAL FIX: Sanitize text for jsPDF to prevent &0&.&0&0& issues
      const sanitizeText = (text) => {
        if (text === null || text === undefined) return '';
        let str = String(text);
        
        // Remove ALL special characters that jsPDF might interpret as formatting
        // This includes: &, %, #, @, etc.
        str = str.replace(/[&%#@]/g, '');
        
        // Replace commas with spaces for thousands separators
        str = str.replace(/,/g, ' ');
        
        return str;
      };

      // Format currency WITHOUT the ₱ symbol - use "PHP" instead
      const formatCurrencyForPDF = (amount) => {
        if (typeof amount !== 'number') amount = 0;
        // Use PHP prefix instead of ₱ symbol to avoid special character issues
        return `PHP ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
      };

      // Helper to add new page
      const addNewPage = () => {
        pdf.addPage();
        yPos = margin;
      };

      // Helper to check if we need a new page
      const checkPageBreak = (requiredSpace) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          addNewPage();
          return true;
        }
        return false;
      };

      // ========== TITLE SECTION ==========
      pdf.setFillColor(0, 51, 160);
      pdf.rect(margin, yPos, contentWidth, 40, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Petron Admin Report', margin + 10, yPos + 20);
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Management Dashboard - Sales & Analytics', margin + 10, yPos + 33);
      
      yPos += 50;

      // ========== DATE RANGE ==========
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Report Period: ${reportData.dateRange.label}`, margin, yPos);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 50, yPos);
      yPos += 12;

      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 12;

      // ========== EXECUTIVE SUMMARY ==========
      pdf.setTextColor(0, 51, 160);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Executive Summary', margin, yPos);
      yPos += 10;

      pdf.setDrawColor(0, 51, 160);
      pdf.setLineWidth(1);
      pdf.line(margin, yPos, margin + 60, yPos);
      yPos += 10;

      // Summary Cards (4 columns)
      const cardWidth = (contentWidth - 12) / 4;
      const cardHeight = 40;
      
      const summaryItems = [
        { 
          label: 'Total Revenue', 
          value: formatCurrencyForPDF(reportData.summary.totalRevenue), 
          color: [0, 51, 160] 
        },
        { 
          label: 'Total Orders', 
          value: reportData.summary.totalOrders.toString(), 
          color: [237, 28, 36] 
        },
        { 
          label: 'Avg Order Value', 
          value: formatCurrencyForPDF(reportData.summary.averageOrderValue), 
          color: [22, 163, 74] 
        },
        { 
          label: 'Success Rate', 
          value: `${reportData.summary.totalOrders > 0 ? Math.round((reportData.summary.completedOrders / reportData.summary.totalOrders) * 100) : 0}%`, 
          color: [128, 90, 213] 
        }
      ];

      summaryItems.forEach((item, index) => {
        const x = margin + (index * (cardWidth + 4));
        
        // Card background
        pdf.setFillColor(248, 250, 252);
        pdf.rect(x, yPos, cardWidth, cardHeight, 'F');
        
        // Border
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.5);
        pdf.rect(x, yPos, cardWidth, cardHeight, 'S');
        
        // Label
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(item.label, x + 5, yPos + 8);
        
        // Value - using sanitized text
        pdf.setTextColor(item.color[0], item.color[1], item.color[2]);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(sanitizeText(item.value), x + 5, yPos + 28);
      });

      yPos += cardHeight + 16;

      // ========== STATUS BREAKDOWN ==========
      checkPageBreak(60);
      
      pdf.setTextColor(0, 51, 160);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Order Status Breakdown', margin, yPos);
      yPos += 8;

      pdf.setDrawColor(0, 51, 160);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, margin + 50, yPos);
      yPos += 10;

      // Status table
      const totalOrders = reportData.summary.totalOrders || 1;
      const statusData = [
        ['Status', 'Count', 'Percentage'],
        ['Completed', 
          reportData.summary.completedOrders.toString(),
          `${Math.round((reportData.summary.completedOrders / totalOrders) * 100)}%`],
        ['Pending', 
          reportData.summary.pendingOrders.toString(),
          `${Math.round((reportData.summary.pendingOrders / totalOrders) * 100)}%`],
        ['Processing', 
          reportData.summary.processingOrders.toString(),
          `${Math.round((reportData.summary.processingOrders / totalOrders) * 100)}%`],
        ['Cancelled', 
          reportData.summary.cancelledOrders.toString(),
          `${Math.round((reportData.summary.cancelledOrders / totalOrders) * 100)}%`]
      ];

      const colWidths = [50, 30, 35];
      let xPos = margin;

      statusData.forEach((row, rowIndex) => {
        const isHeader = rowIndex === 0;
        const rowHeight = isHeader ? 10 : 8;

        if (yPos + rowHeight > pageHeight - margin) {
          addNewPage();
          xPos = margin;
        }

        // Draw row background
        if (!isHeader && rowIndex % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(xPos, yPos - 4, colWidths.reduce((a, b) => a + b, 0), rowHeight + 4, 'F');
        }

        row.forEach((cell, cellIndex) => {
          const x = xPos + colWidths.slice(0, cellIndex).reduce((a, b) => a + b, 0);
          
          // Cell border
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.rect(x, yPos - 4, colWidths[cellIndex], rowHeight + 4, 'S');

          // Cell text
          if (isHeader) {
            pdf.setTextColor(0, 51, 160);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
          } else {
            pdf.setTextColor(50, 50, 50);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
          }
          pdf.text(sanitizeText(cell.toString()), x + 3, yPos + 4);
        });

        yPos += rowHeight + 4;
      });

      yPos += 10;

      // ========== CATEGORY BREAKDOWN ==========
      if (Object.keys(reportData.categorySales).length > 0) {
        checkPageBreak(80);
        
        pdf.setTextColor(0, 51, 160);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Sales by Category', margin, yPos);
        yPos += 8;

        pdf.setDrawColor(0, 51, 160);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPos, margin + 50, yPos);
        yPos += 10;

        const sortedCategories = Object.entries(reportData.categorySales)
          .sort(([,a], [,b]) => b.revenue - a.revenue);

        const maxRevenue = sortedCategories[0]?.[1]?.revenue || 1;

        sortedCategories.forEach(([category, data]) => {
          if (yPos + 20 > pageHeight - margin) {
            addNewPage();
            yPos = margin + 10;
          }

          const percentage = (data.revenue / maxRevenue) * 100;
          const barWidth = (percentage / 100) * (contentWidth - 80);

          // Category name
          pdf.setTextColor(50, 50, 50);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.text(category, margin, yPos + 3);

          // Revenue - using sanitized currency
          pdf.setTextColor(0, 51, 160);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.text(sanitizeText(formatCurrencyForPDF(data.revenue)), margin + 60, yPos + 3);

          // Bar background
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin + 65, yPos - 2, contentWidth - 80, 12, 'F');

          // Bar fill
          pdf.setFillColor(0, 51, 160);
          pdf.rect(margin + 65, yPos - 2, barWidth, 12, 'F');

          // Quantity info
          pdf.setTextColor(150, 150, 150);
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${data.quantity} units • ${data.orderCount} orders`, margin + 68, yPos + 14);

          yPos += 22;
        });

        yPos += 10;
      }

      // ========== TOP CUSTOMERS ==========
      if (reportData.topCustomers.length > 0) {
        checkPageBreak(60 + (reportData.topCustomers.length * 12));
        
        pdf.setTextColor(0, 51, 160);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Top Customers', margin, yPos);
        yPos += 8;

        pdf.setDrawColor(0, 51, 160);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPos, margin + 50, yPos);
        yPos += 10;

        const customerCols = [70, 50, 35];
        let cx = margin;

        // Header
        ['Customer', 'Total Spent', 'Orders'].forEach((header, i) => {
          pdf.setTextColor(0, 51, 160);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.text(header, cx + 3, yPos + 3);
          cx += customerCols[i];
        });
        yPos += 8;

        reportData.topCustomers.forEach((customer, index) => {
          if (yPos + 10 > pageHeight - margin) {
            addNewPage();
            yPos = margin + 10;
          }

          cx = margin;
          
          // Row background (alternating)
          if (index % 2 === 0) {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(cx, yPos - 2, customerCols.reduce((a, b) => a + b, 0), 10, 'F');
          }

          pdf.setTextColor(50, 50, 50);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.text(customer.name, cx + 3, yPos + 6);
          cx += customerCols[0];

          pdf.setTextColor(0, 51, 160);
          pdf.setFont('helvetica', 'bold');
          pdf.text(sanitizeText(formatCurrencyForPDF(customer.totalSpent)), cx + 3, yPos + 6);
          cx += customerCols[1];

          pdf.setTextColor(50, 50, 50);
          pdf.setFont('helvetica', 'normal');
          pdf.text(customer.orderCount.toString(), cx + 3, yPos + 6);

          yPos += 12;
        });
      }

      // ========== FOOTER ==========
      if (yPos + 20 > pageHeight - margin) {
        addNewPage();
      }

      // Footer line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);
      
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated by Petron Admin System • ${new Date().toLocaleString()}`, margin, pageHeight - 10);
      pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - margin - 20, pageHeight - 10);

      // ========== SAVE PDF ==========
      pdf.save(`petron-report-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
      console.error('PDF export error:', err);
      setError('Failed to export PDF: ' + err.message);
    } finally {
      setExporting(false);
    }
  }, [reportData, dateRange]);

  const handleExport = useCallback((format) => {
    if (format === 'excel') {
      exportToExcel();
    } else if (format === 'pdf') {
      exportToPDF();
    }
  }, [exportToExcel, exportToPDF]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex gap-3">
            <div className="w-40 h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-24 h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
            <CategorySkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Reports & Analytics</h2>
          {reportData && (
            <p className="text-sm text-gray-500 mt-1">
              <Calendar size={14} className="inline mr-1" />
              {reportData.dateRange.label}
            </p>
          )}
        </div>
        
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={handleDateRangeChange}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#0033A0] outline-none bg-white"
            disabled={refreshing || exporting}
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">Last 12 Months</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing || exporting}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          
          <ExportDropdown 
            onExport={handleExport}
            disabled={!reportData}
            exporting={exporting}
          />
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="text-[#0033A0]" size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(reportData.summary.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {reportData.summary.completedOrders} completed orders
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Total Orders</p>
                <div className="p-2 bg-red-100 rounded-lg">
                  <ShoppingCart className="text-[#ED1C24]" size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalOrders}</p>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-green-600">{reportData.summary.completedOrders} completed</span>
                <span className="text-yellow-600">{reportData.summary.pendingOrders} pending</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Avg Order Value</p>
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="text-green-600" size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(reportData.summary.averageOrderValue)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                per completed order
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Success Rate</p>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="text-purple-600" size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {reportData.summary.totalOrders > 0 
                  ? Math.round((reportData.summary.completedOrders / reportData.summary.totalOrders) * 100) 
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {reportData.summary.uniqueCustomers} unique customers
              </p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Timeline</h3>
              {reportData.timeSeriesData.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {reportData.timeSeriesData.map((item, index) => {
                    const maxAmount = Math.max(...reportData.timeSeriesData.map(d => d.amount));
                    const percentage = (item.amount / maxAmount) * 100;
                    
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24">{item.date}</span>
                        <div className="flex-1">
                          <div className="h-8 bg-gray-100 rounded-lg relative group">
                            <div 
                              className="h-full bg-petron-blue rounded-lg transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            >
                              <div className="opacity-0 group-hover:opacity-100 absolute right-0 -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded transition-opacity">
                                {formatCurrency(item.amount)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-24 text-right">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No sales data available for this period
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales by Category</h3>
              {Object.keys(reportData.categorySales).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(reportData.categorySales)
                    .sort(([,a], [,b]) => b.revenue - a.revenue)
                    .map(([category, data]) => (
                      <div key={category}>
                        <div className="flex justify-between items-center mb-1">
                          <div>
                            <span className="font-medium text-gray-700">{category}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({data.quantity} units)
                            </span>
                          </div>
                          <span className="text-[#0033A0] font-bold">
                            {formatCurrency(data.revenue)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-petron-blue h-2.5 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${getPercentage(data.revenue, reportData.summary.totalRevenue)}%` 
                            }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {data.orderCount} orders
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No category data available
                </div>
              )}
            </div>
          </div>

          {/* Top Customers */}
          {reportData.topCustomers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Customers</h3>
              <div className="space-y-3">
                {reportData.topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-petron-blue rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {customer.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#0033A0]">{formatCurrency(customer.totalSpent)}</p>
                      <p className="text-xs text-gray-500">{customer.orderCount} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
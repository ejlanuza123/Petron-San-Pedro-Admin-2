// src/pages/Reports.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
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
import { analyticsService } from '../services/analyticsService';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

// Skeleton Components
const StatCardSkeleton = ({ isDarkMode }) => (
  <div className={`p-6 rounded-xl border animate-pulse transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
    <div className="flex justify-between mb-2">
      <div className={`h-4 w-24 rounded transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
      <div className={`w-8 h-8 rounded transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
    </div>
    <div className={`h-8 w-32 rounded mb-2 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
    <div className={`h-3 w-20 rounded transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
  </div>
);

const CategorySkeleton = ({ isDarkMode }) => (
  <div className="space-y-3">
    {[1,2,3,4].map(i => (
      <div key={i} className="animate-pulse">
        <div className="flex justify-between mb-1">
          <div className={`h-4 w-24 rounded transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
          <div className={`h-4 w-20 rounded transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
        </div>
        <div className={`w-full rounded-full h-2 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div className={`h-2 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`} style={{ width: `${Math.random() * 100}%` }}></div>
        </div>
      </div>
    ))}
  </div>
);

const ChartSkeleton = ({ isDarkMode }) => (
  <div className={`rounded-xl border p-6 animate-pulse transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
    <div className={`h-6 w-48 rounded mb-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
    <div className="space-y-4">
      {[1,2,3,4,5,6,7].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className={`h-4 w-20 rounded transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
            <div className={`flex-1 h-8 rounded transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
        </div>
      ))}
    </div>
  </div>
);

// Export Dropdown Component
const ExportDropdown = ({ onExport, disabled, exporting }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { isDarkMode } = useTheme();

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
        <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg border py-1 z-50 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <button
            onClick={() => {
              setIsOpen(false);
              onExport('excel');
            }}
            className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-blue-50'}`}
          >
            <FileSpreadsheet size={18} className="text-green-600" />
            <div>
              <p className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Excel (.xlsx)</p>
              <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>Download as spreadsheet</p>
            </div>
          </button>
          
          <button
            onClick={() => {
              setIsOpen(false);
              onExport('csv');
            }}
            className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors border-t ${isDarkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-100 hover:bg-blue-50'}`}
          >
            <FileText size={18} className="text-blue-600" />
            <div>
              <p className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>CSV Raw Data (.csv)</p>
              <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>Download raw comma-separated data</p>
            </div>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onExport('pdf');
            }}
            className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors border-t ${isDarkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-100 hover:bg-blue-50'}`}
          >
            <FileText size={18} className="text-red-600" />
            <div>
              <p className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>PDF Document</p>
              <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>Download as printable report</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default function Reports() {
  const { isDarkMode } = useTheme();
  const [dateRange, setDateRange] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeReportTab, setActiveReportTab] = useState('overview');
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
        case 'custom':
          if (customStartDate) startDate.setTime(new Date(customStartDate).getTime());
          if (customEndDate) endDate.setTime(new Date(customEndDate).getTime());
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
      }

      const res = await analyticsService.getAnalyticsOverview(startDate, endDate);
      if (!res.success) throw new Error(res.error || 'Failed to load report analytics');

      setReportData({
        summary: res.summary,
        paymentMethods: res.paymentMethods,
        statusDistribution: res.statusDistribution,
        topProducts: res.topProducts,
        categorySales: res.categorySales,
        dailyTrend: res.dailyTrend,
        rawOrders: res.allOrders || [],
        dateRange: {
          start: startDate,
          end: endDate,
          label: dateRange === 'custom' ? `${customStartDate || 'Start'} to ${customEndDate || 'End'}` : dateRangeLabel
        }
      });
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, dateRangeLabel, customStartDate, customEndDate]);

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

  // ================== CSV EXPORT ==================
  const exportToCSV = useCallback(async () => {
    if (!reportData) return;
    setExporting(true);

    try {
      const summary = reportData.summary || {};
      const statusDist = reportData.statusDistribution || {};
      
      const csvRows = [
        ['Metric', 'Value'],
        ['Report Period', `"${reportData.dateRange?.label || 'All Time'}"`],
        ['Total Revenue (PHP)', summary.totalSales || 0],
        ['Total Orders', summary.totalOrdersCount || 0],
        ['Completed Orders', summary.completedCount || 0],
        ['Pending Orders', statusDist.Pending || 0],
        ['Processing Orders', statusDist.Processing || 0],
        ['Cancelled Orders', statusDist.Cancelled || 0],
        ['Average Order Value (PHP)', summary.avgOrderValue || 0],
        ['Completion Rate (%)', `${summary.completionRate || 0}%`],
        [],
        ['Category Sales Breakdown'],
        ['Category', 'Revenue (PHP)', 'Quantity Sold']
      ];

      (reportData.categorySales || []).forEach(cat => {
        csvRows.push([`"${cat.category || 'General'}"`, cat.revenue || 0, cat.quantity || 0]);
      });

      if (Array.isArray(reportData.rawOrders) && reportData.rawOrders.length > 0) {
        csvRows.push([]);
        csvRows.push(['Order Records']);
        csvRows.push(['Order ID', 'Order Number', 'Date', 'Total Amount (PHP)', 'Delivery Fee', 'Payment Method', 'Status']);
        reportData.rawOrders.forEach(o => {
          csvRows.push([
            `"${o.id || ''}"`,
            `"${o.order_number || o.id || ''}"`,
            `"${new Date(o.created_at).toLocaleString()}"`,
            o.total_amount || 0,
            o.delivery_fee || 0,
            `"${o.payment_method || 'COD'}"`,
            `"${o.status || 'Pending'}"`
          ]);
        });
      }

      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `petron-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('CSV export error:', err);
      setError('Failed to export CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  }, [reportData, dateRange]);

  // ================== EXCEL EXPORT ==================
  const exportToExcel = useCallback(async () => {
    if (!reportData) return;
    setExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Petron Admin';
      workbook.created = new Date();

      const summary = reportData.summary || {};
      const statusDist = reportData.statusDistribution || {};

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
      dateCell.value = `Report Period: ${reportData.dateRange?.label || 'All Time'}`;
      dateCell.font = { size: 12, bold: true };
      dateCell.alignment = { horizontal: 'center' };
      summarySheet.getRow(2).height = 30;

      const statsData = [
        ['Metric', 'Value', '', ''],
        ['Total Revenue', formatCurrency(summary.totalSales || 0), '', ''],
        ['Total Orders', summary.totalOrdersCount || 0, '', ''],
        ['Completed Orders', summary.completedCount || 0, '', ''],
        ['Pending Orders', statusDist.Pending || 0, '', ''],
        ['Processing Orders', statusDist.Processing || 0, '', ''],
        ['Cancelled Orders', statusDist.Cancelled || 0, '', ''],
        ['Average Order Value', formatCurrency(summary.avgOrderValue || 0), '', ''],
        ['Completion Rate', `${summary.completionRate || 0}%`, '', ''],
      ];

      statsData.forEach((row, index) => {
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
      if (Array.isArray(reportData.dailyTrend) && reportData.dailyTrend.length > 0) {
        const timelineSheet = workbook.addWorksheet('Sales Timeline', {
          properties: { tabColor: { argb: 'FF00A86B' } }
        });

        const timelineHeaders = ['Date', 'Revenue (PHP)', 'Orders'];
        timelineSheet.addRow(timelineHeaders);
        const headerRow2 = timelineSheet.getRow(1);
        headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow2.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF00A86B' }
        };
        headerRow2.height = 25;

        reportData.dailyTrend.forEach(({ date, sales, orders }) => {
          const row = timelineSheet.addRow([date, sales || 0, orders || 0]);
          row.getCell(2).numFmt = '"Php"#,##0.00';
          row.height = 20;
          row.eachCell(cell => {
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
            };
          });
        });

        const totalRow = timelineSheet.addRow(['TOTAL', summary.totalSales || 0, summary.totalOrdersCount || 0]);
        totalRow.font = { bold: true };
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE5EEFF' }
        };
        totalRow.getCell(2).numFmt = '"Php"#,##0.00';

        timelineSheet.getColumn(1).width = 25;
        timelineSheet.getColumn(2).width = 20;
        timelineSheet.getColumn(3).width = 15;
      }

      // Sheet 3: Category Breakdown
      if (Array.isArray(reportData.categorySales) && reportData.categorySales.length > 0) {
        const categorySheet = workbook.addWorksheet('Category Breakdown', {
          properties: { tabColor: { argb: 'FFED1C24' } }
        });

        const categoryHeaders = ['Category', 'Revenue (PHP)', 'Quantity Sold'];
        categorySheet.addRow(categoryHeaders);
        const headerRow3 = categorySheet.getRow(1);
        headerRow3.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow3.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFED1C24' }
        };
        headerRow3.height = 25;

        reportData.categorySales.forEach(data => {
          const row = categorySheet.addRow([
            data.category || 'General',
            data.revenue || 0,
            data.quantity || 0
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
      }

      // Sheet 4: Top Products
      if (Array.isArray(reportData.topProducts) && reportData.topProducts.length > 0) {
        const productSheet = workbook.addWorksheet('Top Products', {
          properties: { tabColor: { argb: 'FFFFA500' } }
        });

        const productHeaders = ['Product Name', 'Category', 'Quantity Sold', 'Revenue (PHP)'];
        productSheet.addRow(productHeaders);
        const headerRow4 = productSheet.getRow(1);
        headerRow4.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow4.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFA500' }
        };
        headerRow4.height = 25;

        reportData.topProducts.forEach(prod => {
          const row = productSheet.addRow([
            prod.name || 'Product',
            prod.category || 'General',
            prod.quantity || 0,
            prod.revenue || 0
          ]);
          row.getCell(4).numFmt = '"Php"#,##0.00';
          row.height = 20;
          row.eachCell(cell => {
            cell.border = {
              top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
            };
          });
        });

        productSheet.getColumn(1).width = 35;
        productSheet.getColumn(2).width = 20;
        productSheet.getColumn(3).width = 15;
        productSheet.getColumn(4).width = 20;
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

  // ================== PDF EXPORT (Document Mode - Robust Fix) ==================
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

      // Safe string converter to prevent 'Cannot read properties of undefined (reading toString)'
      const safeStr = (val, fallback = '0') => {
        if (val === null || val === undefined) return fallback;
        return String(val);
      };

      // CRITICAL FIX: Sanitize text for jsPDF to prevent formatting character issues
      const sanitizeText = (text) => {
        if (text === null || text === undefined) return '';
        let str = typeof text === 'string' ? text : String(text);
        str = str.replace(/[&%#@]/g, '');
        str = str.replace(/,/g, ' ');
        return str;
      };

      // Format currency WITHOUT special symbols - use "PHP" instead
      const formatCurrencyForPDF = (amount) => {
        const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
        return `PHP ${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
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
      pdf.text(`Report Period: ${sanitizeText(reportData.dateRange?.label || 'All Time')}`, margin, yPos);
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
      
      const totalOrdersCount = reportData.summary?.totalOrders || 0;
      const completedOrdersCount = reportData.summary?.completedOrders || 0;

      const summaryItems = [
        { 
          label: 'Total Revenue', 
          value: formatCurrencyForPDF(reportData.summary?.totalRevenue ?? 0), 
          color: [0, 51, 160] 
        },
        { 
          label: 'Total Orders', 
          value: safeStr(totalOrdersCount), 
          color: [237, 28, 36] 
        },
        { 
          label: 'Avg Order Value', 
          value: formatCurrencyForPDF(reportData.summary?.averageOrderValue ?? 0), 
          color: [22, 163, 74] 
        },
        { 
          label: 'Success Rate', 
          value: `${totalOrdersCount > 0 ? Math.round((completedOrdersCount / totalOrdersCount) * 100) : 0}%`, 
          color: [128, 90, 213] 
        }
      ];

      summaryItems.forEach((item, index) => {
        const x = margin + (index * (cardWidth + 4));
        
        pdf.setFillColor(248, 250, 252);
        pdf.rect(x, yPos, cardWidth, cardHeight, 'F');
        
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.5);
        pdf.rect(x, yPos, cardWidth, cardHeight, 'S');
        
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(item.label, x + 5, yPos + 8);

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

      const calcTotal = totalOrdersCount > 0 ? totalOrdersCount : 1;
      const statusData = [
        ['Status', 'Count', 'Percentage'],
        ['Completed', 
          safeStr(reportData.summary?.completedOrders),
          `${Math.round(((reportData.summary?.completedOrders || 0) / calcTotal) * 100)}%`],
        ['Pending', 
          safeStr(reportData.summary?.pendingOrders),
          `${Math.round(((reportData.summary?.pendingOrders || 0) / calcTotal) * 100)}%`],
        ['Processing', 
          safeStr(reportData.summary?.processingOrders),
          `${Math.round(((reportData.summary?.processingOrders || 0) / calcTotal) * 100)}%`],
        ['Cancelled', 
          safeStr(reportData.summary?.cancelledOrders),
          `${Math.round(((reportData.summary?.cancelledOrders || 0) / calcTotal) * 100)}%`]
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

        if (!isHeader && rowIndex % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(xPos, yPos - 4, colWidths.reduce((a, b) => a + b, 0), rowHeight + 4, 'F');
        }

        row.forEach((cell, cellIndex) => {
          const x = xPos + colWidths.slice(0, cellIndex).reduce((a, b) => a + b, 0);
          
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.rect(x, yPos - 4, colWidths[cellIndex], rowHeight + 4, 'S');

          if (isHeader) {
            pdf.setTextColor(0, 51, 160);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
          } else {
            pdf.setTextColor(50, 50, 50);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
          }
          pdf.text(sanitizeText(safeStr(cell, '')), x + 3, yPos + 4);
        });

        yPos += rowHeight + 4;
      });

      yPos += 10;

      // ========== CATEGORY BREAKDOWN ==========
      if (reportData.categorySales && Object.keys(reportData.categorySales).length > 0) {
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
          .sort(([,a], [,b]) => (b?.revenue || 0) - (a?.revenue || 0));

        const maxRevenue = sortedCategories[0]?.[1]?.revenue || 1;

        sortedCategories.forEach(([category, data]) => {
          if (yPos + 20 > pageHeight - margin) {
            addNewPage();
            yPos = margin + 10;
          }

          const catRev = data?.revenue || 0;
          const catQty = data?.quantity || 0;
          const catCount = data?.orderCount || 0;

          const percentage = (catRev / maxRevenue) * 100;
          const barWidth = (percentage / 100) * (contentWidth - 80);

          pdf.setTextColor(50, 50, 50);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.text(sanitizeText(category || 'Uncategorized'), margin, yPos + 3);

          pdf.setTextColor(0, 51, 160);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.text(sanitizeText(formatCurrencyForPDF(catRev)), margin + 60, yPos + 3);

          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin + 65, yPos - 2, contentWidth - 80, 12, 'F');

          pdf.setFillColor(0, 51, 160);
          pdf.rect(margin + 65, yPos - 2, Math.max(1, barWidth), 12, 'F');

          pdf.setTextColor(150, 150, 150);
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${catQty} units • ${catCount} orders`, margin + 68, yPos + 14);

          yPos += 22;
        });

        yPos += 10;
      }

      // ========== TOP CUSTOMERS ==========
      if (Array.isArray(reportData.topCustomers) && reportData.topCustomers.length > 0) {
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
          
          if (index % 2 === 0) {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(cx, yPos - 2, customerCols.reduce((a, b) => a + b, 0), 10, 'F');
          }

          pdf.setTextColor(50, 50, 50);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.text(sanitizeText(customer?.name || 'Anonymous'), cx + 3, yPos + 6);
          cx += customerCols[0];

          pdf.setTextColor(0, 51, 160);
          pdf.setFont('helvetica', 'bold');
          pdf.text(sanitizeText(formatCurrencyForPDF(customer?.totalSpent || 0)), cx + 3, yPos + 6);
          cx += customerCols[1];

          pdf.setTextColor(50, 50, 50);
          pdf.setFont('helvetica', 'normal');
          pdf.text(safeStr(customer?.orderCount), cx + 3, yPos + 6);

          yPos += 12;
        });
      }

      // ========== FOOTER ==========
      if (yPos + 20 > pageHeight - margin) {
        addNewPage();
      }

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
    } else if (format === 'csv') {
      exportToCSV();
    } else if (format === 'pdf') {
      exportToPDF();
    }
  }, [exportToExcel, exportToCSV, exportToPDF]);

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
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} isDarkMode={isDarkMode} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton isDarkMode={isDarkMode} />
          <div className={`rounded-xl border p-6 animate-pulse transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className={`h-6 w-48 rounded mb-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}></div>
            <CategorySkeleton isDarkMode={isDarkMode} />
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
          <h2 className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Reports & Analytics</h2>
          {reportData && (
            <p className={`text-sm mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Calendar size={14} className="inline mr-1" />
              {reportData.dateRange.label}
            </p>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className={`border rounded-lg px-2.5 py-1.5 text-xs outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
              />
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className={`border rounded-lg px-2.5 py-1.5 text-xs outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
              />
            </div>
          )}

          <select
            value={dateRange}
            onChange={handleDateRangeChange}
            className={`border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#0033A0] outline-none transition-colors duration-300 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            disabled={refreshing || exporting}
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">Last 12 Months</option>
            <option value="custom">Custom Date Range</option>
          </select>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing || exporting}
            className={`px-4 py-2 border rounded-lg transition-colors disabled:opacity-50 transition-colors duration-300 ${isDarkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50'}`}
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

      {/* Analytics Navigation Sub-Tabs */}
      <div className={`flex gap-1 p-1 rounded-xl w-fit transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-gray-100'}`}>
        <button
          onClick={() => setActiveReportTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeReportTab === 'overview'
              ? 'bg-[#0033A0] text-white shadow-sm'
              : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
          }`}
        >
          <BarChart3 size={16} /> Executive Overview
        </button>
        <button
          onClick={() => setActiveReportTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeReportTab === 'products'
              ? 'bg-[#0033A0] text-white shadow-sm'
              : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
          }`}
        >
          <ShoppingCart size={16} /> Product Sales Mix
        </button>
        <button
          onClick={() => setActiveReportTab('operations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeReportTab === 'operations'
              ? 'bg-[#0033A0] text-white shadow-sm'
              : (isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
          }`}
        >
          <TrendingUp size={16} /> Delivery & Operations
        </button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {reportData && (
        <>
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-6 rounded-xl shadow-sm border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Revenue</p>
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-950/60 text-blue-400' : 'bg-blue-100 text-[#0033A0]'}`}>
                  <DollarSign size={18} />
                </div>
              </div>
              <p className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatCurrency(reportData.summary.totalSales || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {reportData.summary.completedCount || 0} completed orders
              </p>
            </div>

            <div className={`p-6 rounded-xl shadow-sm border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Orders</p>
                <div className="p-2 bg-red-100 rounded-lg">
                  <ShoppingCart className="text-[#ED1C24]" size={18} />
                </div>
              </div>
              <p className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{reportData.summary.totalOrdersCount || 0}</p>
              <div className="flex gap-2 mt-1 text-xs">
                <span className="text-emerald-600 font-semibold">{reportData.summary.completionRate}% completion rate</span>
              </div>
            </div>

            <div className={`p-6 rounded-xl shadow-sm border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Order Value</p>
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="text-green-600" size={18} />
                </div>
              </div>
              <p className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatCurrency(Number(reportData.summary.avgOrderValue || 0))}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                per completed order
              </p>
            </div>

            <div className={`p-6 rounded-xl shadow-sm border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Delivery Fees</p>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="text-purple-600" size={18} />
                </div>
              </div>
              <p className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatCurrency(reportData.summary.totalDeliveryFees || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Peak Hour: <span className="font-bold text-purple-600">{reportData.summary.peakHourLabel}</span>
              </p>
            </div>
          </div>

          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeReportTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Sales Timeline */}
              <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Daily Sales Timeline</h3>
                {reportData.timeSeriesData && reportData.timeSeriesData.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {reportData.timeSeriesData.map((item, index) => {
                      const maxAmount = Math.max(...reportData.timeSeriesData.map(d => d.sales), 1);
                      const percentage = (item.sales / maxAmount) * 100;
                      
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-24">{item.date}</span>
                          <div className="flex-1">
                            <div className="h-8 bg-gray-100 dark:bg-slate-700 rounded-lg relative group">
                              <div 
                                className="h-full bg-petron-blue rounded-lg transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              >
                                <div className="opacity-0 group-hover:opacity-100 absolute right-0 -top-8 bg-gray-800 text-white text-xs px-2 py-1 rounded transition-opacity shadow">
                                  {formatCurrency(item.sales)} ({item.orders} orders)
                                </div>
                              </div>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 text-right">
                            {formatCurrency(item.sales)}
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

              {/* Payment Methods & Operational Highlights */}
              <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Payment Method Distribution</h3>
                
                <div className="space-y-4 mb-6">
                  {Object.entries(reportData.paymentMethods || {}).map(([method, count]) => {
                    const pct = reportData.summary.totalOrdersCount > 0
                      ? Math.round((count / reportData.summary.totalOrdersCount) * 100)
                      : 0;
                    return (
                      <div key={method} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{method}</span>
                          <span className="text-blue-600">{count} orders ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-blue-50/60 border-blue-100'}`}>
                  <p className="text-xs font-bold text-blue-600 uppercase mb-1">Operational Highlight</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    Peak ordering volume occurs around <strong className="text-blue-600">{reportData.summary.peakHourLabel}</strong>. 
                    {reportData.summary.avgDeliveryMinutes ? ` Average delivery duration is ${reportData.summary.avgDeliveryMinutes} mins.` : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCT SALES MIX */}
          {activeReportTab === 'products' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top 10 Products Table */}
              <div className={`lg:col-span-2 rounded-xl shadow-sm border p-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Top 10 Best Selling Products</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className={`text-xs uppercase border-b ${isDarkMode ? 'bg-slate-700 text-gray-300 border-slate-600' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      <tr>
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3 text-center">Category</th>
                        <th className="px-4 py-3 text-center">Qty Sold</th>
                        <th className="px-4 py-3 text-right">Revenue (₱)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {(reportData.topProducts || []).map((prod, idx) => (
                        <tr key={idx} className={isDarkMode ? 'hover:bg-slate-700/40' : 'hover:bg-gray-50'}>
                          <td className={`px-4 py-3 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{prod.name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                              {prod.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-blue-600">{prod.quantity}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(prod.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Category Sales Distribution</h3>
                <div className="space-y-4">
                  {(reportData.categorySales || []).map((cat) => {
                    const pct = reportData.summary.totalSales > 0
                      ? Math.round((cat.revenue / reportData.summary.totalSales) * 100)
                      : 0;
                    return (
                      <div key={cat.category}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{cat.category}</span>
                          <span className="text-emerald-600">{formatCurrency(cat.revenue)} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div className="bg-emerald-600 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }}></div>
                        </div>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{cat.quantity} items sold</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DELIVERY & OPERATIONS */}
          {activeReportTab === 'operations' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Status Distribution */}
              <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Order Status Distribution</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(reportData.statusDistribution || {}).map(([status, count]) => (
                    <div key={status} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`text-xs font-semibold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{status}</p>
                      <p className="text-2xl font-extrabold text-blue-600 mt-1">{count}</p>
                      <p className="text-xs text-gray-400 mt-1">orders</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Duration & Performance summary */}
              <div className={`rounded-xl shadow-sm border p-6 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Delivery & Dispatch Metrics</h3>
                
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-700/40 border-slate-600' : 'bg-emerald-50 border-emerald-100'}`}>
                    <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Average Delivery Time</p>
                    <p className="text-3xl font-extrabold text-emerald-600">
                      {reportData.summary.avgDeliveryMinutes ? `${reportData.summary.avgDeliveryMinutes} mins` : 'N/A'}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>From dispatch assignment to customer drop-off</p>
                  </div>

                  <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-700/40 border-slate-600' : 'bg-blue-50 border-blue-100'}`}>
                    <p className="text-xs font-bold text-blue-700 uppercase mb-1">Total Delivery Fee Revenue</p>
                    <p className="text-3xl font-extrabold text-blue-600">
                      {formatCurrency(reportData.summary.totalDeliveryFees || 0)}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Collected across all fulfilled deliveries</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>

  );
}
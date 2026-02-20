// Report Service - Real report queries from Supabase
import { supabase } from '../lib/supabase';
import { getOfflineDB, performTransaction } from '../lib/database';
import { isOnline } from './syncService';

export type ReportPeriod = 'day' | 'week' | 'month' | 'year';

export type SalesReport = {
  totalSales: number;
  totalProfit: number;
  transactionCount: number;
  averageTransaction: number;
  cashSales: number;
  debitSales: number;
};

export type ProductReport = {
  productId: string;
  productName: string;
  quantitySold: number;
  totalRevenue: number;
  totalProfit: number;
};

export type DebtReport = {
  totalDebts: number;
  totalPaid: number;
  totalOutstanding: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
};

export type StockReport = {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
};

export type POReport = {
  totalPOs: number;
  pendingPOs: number;
  deliveredPOs: number;
  totalCost: number;
};

export type ExpenseReport = {
  totalExpenses: number;
  count: number;
  byCategory: Array<{ category: string; amount: number }>;
};


// Helper: Get date range for period
export function getDateRange(period: ReportPeriod): { start: string; end: string } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      // Start of week (Monday)
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

// Get sales report
export async function getSalesReport(
  period: ReportPeriod = 'day',
  userId?: string | null,
  isAdmin: boolean = false
): Promise<SalesReport> {
  const online = await isOnline();
  const { start, end } = getDateRange(period);

  if (online) {
    try {
      let salesQuery = supabase
        .from('sales')
        .select('sale_id, total_amount, amount_paid, sale_type')
        .gte('sale_date', start)
        .lte('sale_date', end);

      // Filter by user if staff
      if (!isAdmin && userId) {
        salesQuery = salesQuery.eq('user_id', userId);
      }

      const { data: sales, error } = await salesQuery;

      if (error) throw error;

      const validSales = sales || [];
      const totalSales = validSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const transactionCount = validSales.length;
      const cashSales = validSales.filter(s => s.sale_type === 'cash').reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const debitSales = validSales.filter(s => s.sale_type === 'debit' || s.sale_type === 'pending_debit').reduce((sum, s) => sum + (s.total_amount || 0), 0);

      // EXTRACTED & IMPROVED PROFIT CALCULATION
      // 1. Calculate COGS (Cost of Goods Sold)
      let totalCost = 0;
      if (sales && sales.length > 0) {
        const saleIds = sales.map(s => s.sale_id);
        const { data: saleItems } = await supabase
          .from('saleitems')
          .select('quantity, cost_price')
          .in('sale_id', saleIds);

        if (saleItems && saleItems.length > 0) {
          totalCost = saleItems.reduce((sum, item) => {
            return sum + ((item.cost_price || 0) * (item.quantity || 0));
          }, 0);
        }
      }

      // 2. Fetch Expenses for the period (to calculate Net Profit)
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', start)
        .lte('date', end);

      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // 3. Gross Profit = Sales - COGS
      const grossProfit = totalSales - totalCost;

      // 4. Net Profit = Gross Profit - Expenses
      const totalProfit = grossProfit - totalExpenses;

      return {
        totalSales,
        totalProfit, // This is now NET PROFIT
        transactionCount,
        averageTransaction: transactionCount > 0 ? totalSales / transactionCount : 0,
        cashSales,
        debitSales,
      };

      return {
        totalSales,
        totalProfit,
        transactionCount,
        averageTransaction: transactionCount > 0 ? totalSales / transactionCount : 0,
        cashSales,
        debitSales,
      };
    } catch (error) {
      console.log('Error fetching sales report:', error);
      throw error;
    }
  }

  // Offline: Calculate from local DB
  const db = getOfflineDB();
  if (db) {
    return await performTransaction(async () => {
      let salesQuery = `
        SELECT total_amount, amount_paid, sale_type 
        FROM sales 
        WHERE sale_date >= ? AND sale_date <= ?
      `;
      const params: any[] = [start, end];

      if (!isAdmin && userId) {
        salesQuery += ' AND user_id = ?';
        params.push(userId);
      }

      const sales = await db.getAllAsync<any>(salesQuery, params);
      const salesArray = Array.isArray(sales) ? sales : [];
      // 1. Revenue
      const validSales = salesArray;
      const totalSales = validSales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
      const transactionCount = validSales.length;
      const cashSales = validSales.filter((s: any) => s.sale_type === 'cash').reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
      const debitSales = validSales.filter((s: any) => s.sale_type === 'debit' || s.sale_type === 'pending_debit').reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);

      // 2. COGS (Cost of Goods Sold) - Using historical cost stored in saleitems
      const cogsResult = await db.getAllAsync<any>(`
        SELECT SUM(si.quantity * si.cost_price) as total_cost
        FROM saleitems si
        JOIN sales s ON si.sale_id = s.sale_id
        WHERE s.sale_date >= ? AND s.sale_date <= ?
      `, [start, end]);

      const totalCost = (cogsResult && cogsResult[0]) ? (cogsResult[0].total_cost || 0) : 0;

      // 3. Expenses
      const expensesResult = await db.getAllAsync<any>(`
        SELECT SUM(amount) as total_expenses
        FROM expenses
        WHERE date >= ? AND date <= ?
      `, [start, end]);

      const totalExpenses = (expensesResult && expensesResult[0]) ? (expensesResult[0].total_expenses || 0) : 0;

      // 4. Net Profit
      const totalProfit = totalSales - totalCost - totalExpenses;

      return {
        totalSales,
        totalProfit, // NET PROFIT
        transactionCount,
        averageTransaction: transactionCount > 0 ? totalSales / transactionCount : 0,
        cashSales,
        debitSales,
      };
    });
  }

  return {
    totalSales: 0,
    totalProfit: 0,
    transactionCount: 0,
    averageTransaction: 0,
    cashSales: 0,
    debitSales: 0,
  };
}

// Get hourly sales for a specific date (for Daily report)
export async function getHourlySales(date: Date = new Date()): Promise<Array<{ label: string; value: number }>> {
  const online = await isOnline();
  const db = getOfflineDB();

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const hours = ["8am", "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm"];
  const hourlyMap = new Map<string, number>();
  hours.forEach(h => hourlyMap.set(h, 0));

  if (online) {
    try {
      const { data: sales, error } = await supabase
        .from('sales')
        .select('sale_date, total_amount')
        .gte('sale_date', start.toISOString())
        .lte('sale_date', end.toISOString());

      if (error) throw error;

      if (sales) {
        sales.forEach(sale => {
          const sDate = new Date(sale.sale_date);
          const hour = sDate.getHours();
          let label = "";
          if (hour >= 8 && hour <= 18) {
            if (hour === 12) label = "12pm";
            else if (hour > 12) label = `${hour - 12}pm`;
            else label = `${hour}am`;
            const current = hourlyMap.get(label) || 0;
            hourlyMap.set(label, current + (sale.total_amount || 0));
          }
        });
      }
    } catch (error) {
      console.log('Error fetching hourly sales:', error);
    }
  } else if (db) {
    try {
      await performTransaction(async () => {
        const sales = await db.getAllAsync<any>(
          "SELECT sale_date, total_amount FROM sales WHERE sale_date >= ? AND sale_date <= ?",
          [start.toISOString(), end.toISOString()]
        );
        if (sales) {
          sales.forEach((sale: any) => {
            const sDate = new Date(sale.sale_date);
            const hour = sDate.getHours();
            let label = "";
            if (hour >= 8 && hour <= 18) {
              if (hour === 12) label = "12pm";
              else if (hour > 12) label = `${hour - 12}pm`;
              else label = `${hour}am`;
              const current = hourlyMap.get(label) || 0;
              hourlyMap.set(label, current + (sale.total_amount || 0));
            }
          });
        }
      });
    } catch (error) {
      console.log('Error fetching hourly sales offline:', error);
    }
  }

  return Array.from(hourlyMap.entries()).map(([label, value]) => ({ label, value }));
}

// Get weekly comparison (This Week vs Last Week)
export async function getWeeklyComparisonReport(
  userId?: string | null,
  isAdmin: boolean = false
): Promise<{
  thisWeek: Array<{ label: string; value: number }>;
  lastWeek: Array<{ label: string; value: number }>;
}> {
  const online = await isOnline();
  const db = getOfflineDB();

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Helper to get week data
  const getWeekData = async (weeksAgo: number) => {
    const start = new Date();
    start.setDate(start.getDate() - (start.getDay() + (weeksAgo * 7)));
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const weekMap = new Map<string, number>();
    days.forEach(d => weekMap.set(d, 0));

    if (online) {
      let query = supabase
        .from('sales')
        .select('sale_date, total_amount')
        .gte('sale_date', start.toISOString())
        .lte('sale_date', end.toISOString());

      if (!isAdmin && userId) {
        query = query.eq('user_id', userId);
      }

      const { data: sales } = await query;

      sales?.forEach(s => {
        const d = new Date(s.sale_date);
        const day = days[d.getDay()];
        weekMap.set(day, (weekMap.get(day) || 0) + (s.total_amount || 0));
      });
    } else if (db) {
      await performTransaction(async () => {
        let sql = "SELECT sale_date, total_amount FROM sales WHERE sale_date >= ? AND sale_date <= ?";
        const params: any[] = [start.toISOString(), end.toISOString()];

        if (!isAdmin && userId) {
          sql += " AND user_id = ?";
          params.push(userId);
        }

        const sales = await db.getAllAsync<any>(sql, params);
        sales?.forEach((s: any) => {
          const d = new Date(s.sale_date);
          const day = days[d.getDay()];
          weekMap.set(day, (weekMap.get(day) || 0) + (s.total_amount || 0));
        });
      });
    }

    // Return in order Mon-Sun
    const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return order.map(label => ({ label, value: weekMap.get(label) || 0 }));
  };

  const [thisWeek, lastWeek] = await Promise.all([
    getWeekData(0),
    getWeekData(1)
  ]);

  return { thisWeek, lastWeek };
}

// Get Monthly breakdown by week
export async function getMonthlyPerformanceReport(monthOffset: number = 0): Promise<Array<{ label: string; value: number }>> {
  const online = await isOnline();
  const db = getOfflineDB();

  const start = new Date();
  start.setMonth(start.getMonth() - monthOffset);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(start.getMonth() + 1);
  end.setDate(0);
  end.setHours(23, 59, 59, 999);

  const weeks = ["W1", "W2", "W3", "W4", "W5"];
  const weekMap = new Map<string, number>();
  weeks.forEach(w => weekMap.set(w, 0));

  const processSales = (sales: any[]) => {
    sales.forEach(s => {
      const d = new Date(s.sale_date);
      const day = d.getDate();
      let week = "W1";
      if (day > 28) week = "W5";
      else if (day > 21) week = "W4";
      else if (day > 14) week = "W3";
      else if (day > 7) week = "W2";

      weekMap.set(week, (weekMap.get(week) || 0) + (s.total_amount || 0));
    });
  };

  if (online) {
    const { data: sales } = await supabase
      .from('sales')
      .select('sale_date, total_amount')
      .gte('sale_date', start.toISOString())
      .lte('sale_date', end.toISOString());
    if (sales) processSales(sales);
  } else if (db) {
    await performTransaction(async () => {
      const sales = await db.getAllAsync<any>(
        "SELECT sale_date, total_amount FROM sales WHERE sale_date >= ? AND sale_date <= ?",
        [start.toISOString(), end.toISOString()]
      );
      if (sales) processSales(sales);
    });
  }

  return Array.from(weekMap.entries()).map(([label, value]) => ({ label, value }));
}

// Get Yearly breakdown by month
export async function getYearlyPerformanceReport(year: number = new Date().getFullYear()): Promise<Array<{ label: string; value: number }>> {
  const online = await isOnline();
  const db = getOfflineDB();

  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthMap = new Map<string, number>();
  months.forEach(m => monthMap.set(m, 0));

  const processSales = (sales: any[]) => {
    sales.forEach(s => {
      const d = new Date(s.sale_date);
      const mLabel = months[d.getMonth()];
      monthMap.set(mLabel, (monthMap.get(mLabel) || 0) + (s.total_amount || 0));
    });
  };

  if (online) {
    const { data: sales } = await supabase
      .from('sales')
      .select('sale_date, total_amount')
      .gte('sale_date', start.toISOString())
      .lte('sale_date', end.toISOString());
    if (sales) processSales(sales);
  } else if (db) {
    await performTransaction(async () => {
      const sales = await db.getAllAsync<any>(
        "SELECT sale_date, total_amount FROM sales WHERE sale_date >= ? AND sale_date <= ?",
        [start.toISOString(), end.toISOString()]
      );
      if (sales) processSales(sales);
    });
  }

  return Array.from(monthMap.entries()).map(([label, value]) => ({ label, value }));
}

// Get top selling products
export async function getTopSellingProducts(
  period: ReportPeriod = 'day',
  limit: number = 10
): Promise<ProductReport[]> {
  const online = await isOnline();
  const { start, end } = getDateRange(period);

  if (online) {
    try {
      // Get sales in period
      const { data: sales } = await supabase
        .from('sales')
        .select('sale_id')
        .gte('sale_date', start)
        .lte('sale_date', end);

      if (!sales || sales.length === 0) return [];

      const saleIds = sales.map(s => s.sale_id);

      // Get sale items
      const { data: saleItems } = await supabase
        .from('saleitems')
        .select('part_id, quantity, unit_price, subtotal, cost_price')
        .in('sale_id', saleIds);

      if (!saleItems) return [];

      // Aggregate by product
      const productMap = new Map<string, { quantity: number; revenue: number; cost: number }>();

      for (const item of saleItems) {
        const existing = productMap.get(item.part_id) || { quantity: 0, revenue: 0, cost: 0 };
        productMap.set(item.part_id, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.subtotal,
          cost: existing.cost + ((item.cost_price || 0) * item.quantity),
        });
      }

      // Get product details
      const productIds = Array.from(productMap.keys());
      const { data: products } = await supabase
        .from('spareparts')
        .select('part_id, name, cost_price')
        .in('part_id', productIds);

      // Calculate profit and format results
      const results: ProductReport[] = Array.from(productMap.entries())
        .map(([productId, stats]) => {
          const product = products?.find(p => p.part_id === productId);
          const profit = stats.revenue - stats.cost;

          return {
            productId,
            productName: product?.name || 'Unknown',
            quantitySold: stats.quantity,
            totalRevenue: stats.revenue,
            totalProfit: profit,
          };
        })
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.log('Error fetching top products:', error);
      return [];
    }
  }

  // Offline implementation would be similar but from local DB
  return [];
}

// Get debt report
export async function getDebtReport(): Promise<DebtReport> {
  const online = await isOnline();

  if (online) {
    try {
      const { data: debts, error } = await supabase
        .from('customerdebts')
        .select('total_amount, amount_paid, balance_remaining, status');

      if (error) throw error;

      const totalDebts = debts?.reduce((sum, d) => sum + (d.total_amount || 0), 0) || 0;
      const totalPaid = debts?.reduce((sum, d) => sum + (d.amount_paid || 0), 0) || 0;
      const totalOutstanding = debts?.reduce((sum, d) => sum + (d.balance_remaining || 0), 0) || 0;
      const paidCount = debts?.filter(d => d.status === 'paid').length || 0;
      const partialCount = debts?.filter(d => d.status === 'partial').length || 0;
      const unpaidCount = debts?.filter(d => d.status === 'unpaid').length || 0;

      return {
        totalDebts,
        totalPaid,
        totalOutstanding,
        paidCount,
        partialCount,
        unpaidCount,
      };
    } catch (error) {
      console.log('Error fetching debt report:', error);
      throw error;
    }
  }

  // Offline: Read from local DB
  const db = getOfflineDB();
  if (db) {
    return await performTransaction(async () => {
      const debts = await db.getAllAsync<any>(
        'SELECT total_amount, amount_paid, balance_remaining, status FROM customerdebts'
      );
      const debtsArray = Array.isArray(debts) ? debts : [];

      const totalDebts = debtsArray.reduce((sum: number, d: any) => sum + (d.total_amount || 0), 0);
      const totalPaid = debtsArray.reduce((sum: number, d: any) => sum + (d.amount_paid || 0), 0);
      const totalOutstanding = debtsArray.reduce((sum: number, d: any) => sum + (d.balance_remaining || 0), 0);
      const paidCount = debtsArray.filter((d: any) => d.status === 'paid').length;
      const partialCount = debtsArray.filter((d: any) => d.status === 'partial').length;
      const unpaidCount = debtsArray.filter((d: any) => d.status === 'unpaid').length;

      return {
        totalDebts,
        totalPaid,
        totalOutstanding,
        paidCount,
        partialCount,
        unpaidCount,
      };
    });
  }

  return {
    totalDebts: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,
  };
}

export type DebtAnalytics = {
  totalOutstanding: number;
  overdueAmount: number;
  collectedThisWeek: number;
  overdueCount: number;
  collectionRate: number;
  debtStatusDistribution: Array<{ value: number; label: string; color: string }>;
  collectionTrend: Array<{ value: number; label: string }>;
  overdueDebts: Array<{ customer: string; amount: number; dueDate: string; daysOverdue: number }>;
  recentCollections: Array<{ customer: string; amount: number; date: string; method: string }>;
};

// Get detailed debt analytics
export async function getDebtAnalytics(period: ReportPeriod = 'month'): Promise<DebtAnalytics> {
  const online = await isOnline();
  const { start } = getDateRange('week');

  if (online) {
    try {
      // 1. Get all customer debts
      const { data: debts, error: dError } = await supabase
        .from('customerdebts')
        .select('*');

      if (dError) throw dError;

      // 2. Get recent debt payments for collection trend
      const { data: payments, error: pError } = await supabase
        .from('sales') // Assuming debt payments are recorded as sales with a specific type OR checking amount_paid changes
        .select('customer_name, amount_paid, sale_date, payment_mode')
        .gte('sale_date', start)
        .eq('sale_type', 'sale'); // This might need refinement based on how payments are tracked

      if (pError) throw pError;

      const totalOutstanding = debts?.reduce((sum, d) => sum + (d.balance_remaining || 0), 0) || 0;
      const overdueAmount = debts?.filter(d => d.status !== 'paid').reduce((sum, d) => sum + (d.balance_remaining || 0), 0) || 0;
      const overdueCount = debts?.filter(d => d.status !== 'paid').length || 0;

      const totalDebts = debts?.reduce((sum, d) => sum + (d.total_amount || 0), 0) || 1;
      const totalPaid = debts?.reduce((sum, d) => sum + (d.amount_paid || 0), 0) || 0;
      const collectionRate = Math.round((totalPaid / totalDebts) * 100);

      // Map distribution
      const paid = debts?.filter(d => d.status === 'paid').length || 0;
      const partial = debts?.filter(d => d.status === 'partial').length || 0;
      const unpaid = debts?.filter(d => d.status === 'unpaid').length || 0;
      const totalCount = (paid + partial + unpaid) || 1;

      const debtStatusDistribution = [
        { value: Math.round((unpaid / totalCount) * 100), label: 'Overdue', color: '#DC2626' },
        { value: Math.round((partial / totalCount) * 100), label: 'Active', color: '#D97706' },
        { value: Math.round((paid / totalCount) * 100), label: 'Collected', color: '#16A34A' },
      ];

      // Overdue list (top 5)
      const overdueList = (debts || [])
        .filter(d => d.status !== 'paid')
        .sort((a, b) => (b.balance_remaining || 0) - (a.balance_remaining || 0))
        .slice(0, 5)
        .map(d => ({
          customer: d.customer_name || 'Unknown',
          amount: d.balance_remaining || 0,
          dueDate: new Date(d.created_at || Date.now()).toLocaleDateString(),
          daysOverdue: Math.floor((Date.now() - new Date(d.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24))
        }));

      return {
        totalOutstanding,
        overdueAmount,
        collectedThisWeek: payments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0,
        overdueCount,
        collectionRate,
        debtStatusDistribution,
        collectionTrend: [], // Placeholder for now
        overdueDebts: overdueList,
        recentCollections: (payments || []).slice(0, 5).map(p => ({
          customer: p.customer_name || 'Unknown',
          amount: p.amount_paid || 0,
          date: new Date(p.sale_date).toLocaleDateString(),
          method: p.payment_mode || 'Cash'
        }))
      };
    } catch (error) {
      console.log('Error fetching debt analytics online:', error);
    }
  }

  // Fallback for offline or error
  return {
    totalOutstanding: 0,
    overdueAmount: 0,
    collectedThisWeek: 0,
    overdueCount: 0,
    collectionRate: 0,
    debtStatusDistribution: [],
    collectionTrend: [],
    overdueDebts: [],
    recentCollections: []
  };
}

// Get stock report
export async function getStockReport(): Promise<StockReport> {
  const online = await isOnline();

  if (online) {
    try {
      const { data: products, error } = await supabase
        .from('spareparts')
        .select('quantity_in_stock, reorder_level, cost_price')
        .neq('status', 'archived');

      if (error) throw error;

      const totalProducts = products?.length || 0;
      const lowStockCount = products?.filter(p => p.quantity_in_stock <= p.reorder_level && p.quantity_in_stock > 0).length || 0;
      const outOfStockCount = products?.filter(p => p.quantity_in_stock === 0).length || 0;
      const totalInventoryValue = products?.reduce((sum, p) => sum + (p.quantity_in_stock * (p.cost_price || 0)), 0) || 0;

      return {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalInventoryValue,
      };
    } catch (error) {
      console.log('Error fetching stock report:', error);
      throw error;
    }
  }

  // Offline: Read from local DB
  const db = getOfflineDB();
  if (db) {
    return await performTransaction(async () => {
      const products = await db.getAllAsync<any>(
        "SELECT quantity_in_stock, reorder_level, cost_price FROM spareparts WHERE status != 'archived'"
      );
      const productsArray = Array.isArray(products) ? products : [];

      const totalProducts = productsArray.length;
      const lowStockCount = productsArray.filter((p: any) => p.quantity_in_stock <= p.reorder_level && p.quantity_in_stock > 0).length;
      const outOfStockCount = productsArray.filter((p: any) => p.quantity_in_stock === 0).length;
      const totalInventoryValue = productsArray.reduce((sum: number, p: any) => sum + (p.quantity_in_stock * (p.cost_price || 0)), 0);

      return {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalInventoryValue,
      };
    });
  }

  return {
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalInventoryValue: 0,
  };
}

export type InventoryAnalytics = {
  totalItems: number; // Sum of all units
  totalProductCount: number; // Count of distinct SKUs/Parts
  totalCostValue: number;
  totalSellingValue: number;
  potentialProfit: number;
  totalValue: number; // Legacy, map to totalCostValue
  lowStockCount: number;
  outOfStockCount: number;
  reorderAlerts: Array<{ name: string; urgency: 'critical' | 'warning'; daysLeft: number }>;
  stockDistribution: Array<{ value: number; label: string; color: string }>;
  movementTrend: Array<{ value: number; label: string }>;
  lowStockItems: Array<{ name: string; sku: string; current: number; reorder: number; supplier: string }>;
};

// Get detailed inventory analytics
export async function getInventoryAnalytics(): Promise<InventoryAnalytics> {
  const online = await isOnline();

  if (online) {
    try {
      // 1. Get products and categories
      const { data: products, error: pError } = await supabase
        .from('spareparts')
        .select('*, categories(name), suppliers(name)')
        .neq('status', 'archived');

      if (pError) throw pError;

      const totalItems = products?.reduce((sum, p) => sum + (p.quantity_in_stock || 0), 0) || 0;
      const totalCostValue = products?.reduce((sum, p) => sum + ((p.quantity_in_stock || 0) * (p.cost_price || 0)), 0) || 0;
      const totalSellingValue = products?.reduce((sum, p) => sum + ((p.quantity_in_stock || 0) * (p.selling_price || 0)), 0) || 0;
      const potentialProfit = totalSellingValue - totalCostValue;
      const lowStock = products?.filter(p => p.quantity_in_stock <= p.reorder_level && p.quantity_in_stock > 0) || [];
      const outOfStock = products?.filter(p => p.quantity_in_stock === 0) || [];

      // Category distribution
      const catMap = new Map<string, number>();
      products?.forEach(p => {
        const catName = p.categories?.name || 'Uncategorized';
        catMap.set(catName, (catMap.get(catName) || 0) + 1);
      });

      const colors = ['#007BFF', '#16A34A', '#D97706', '#8B5CF6', '#DC2626'];
      const stockDistribution = Array.from(catMap.entries()).map(([label, count], idx) => ({
        value: Math.round((count / (products?.length || 1)) * 100),
        label,
        color: colors[idx % colors.length]
      }));

      // Stock Movement Trend (Last 7 days)
      const { start: weekStart } = getDateRange('week');
      const { data: recentSaleItems } = await supabase
        .from('saleitems')
        .select('quantity, sales!inner(sale_date)')
        .gte('sales.sale_date', weekStart);

      const movementMap = new Map<string, number>();
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      days.forEach(d => movementMap.set(d, 0));

      recentSaleItems?.forEach((item: any) => {
        if (item.sales?.sale_date) {
          const date = new Date(item.sales.sale_date);
          const dayName = days[(date.getDay() + 6) % 7];
          movementMap.set(dayName, (movementMap.get(dayName) || 0) + (item.quantity || 0));
        }
      });

      const movementTrend = days.map(day => ({
        label: day,
        value: movementMap.get(day) || 0
      }));

      // Reorder alerts
      const reorderAlerts = lowStock.map(p => ({
        name: p.name,
        urgency: p.quantity_in_stock <= (p.reorder_level / 2) ? 'critical' : 'warning' as any,
        daysLeft: Math.max(0, p.quantity_in_stock) // Simplified
      }));

      return {
        totalItems,
        totalProductCount: products?.length || 0,
        totalCostValue,
        totalSellingValue,
        potentialProfit,
        totalValue: totalCostValue,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        reorderAlerts,
        stockDistribution,
        movementTrend,
        lowStockItems: lowStock.slice(0, 5).map(p => ({
          name: p.name,
          sku: p.sku,
          current: p.quantity_in_stock,
          reorder: p.reorder_level,
          supplier: p.suppliers?.name || 'Unknown'
        }))
      };
    } catch (error) {
      console.log('Error fetching inventory analytics online:', error);
    }
  }

  // Offline fallback
  const db = getOfflineDB();
  if (db) {
    try {
      const products = await db.getAllAsync<any>(
        "SELECT * FROM spareparts WHERE status != 'archived'"
      );
      const productsArray = Array.isArray(products) ? products : [];

      const totalItems = productsArray.reduce((sum, p) => sum + (p.quantity_in_stock || 0), 0);
      const totalCostValue = productsArray.reduce((sum, p) => sum + ((p.quantity_in_stock || 0) * (p.cost_price || 0)), 0);
      const totalSellingValue = productsArray.reduce((sum, p) => sum + ((p.quantity_in_stock || 0) * (p.selling_price || 0)), 0);
      const potentialProfit = totalSellingValue - totalCostValue;
      const lowStock = productsArray.filter(p => p.quantity_in_stock <= p.reorder_level && p.quantity_in_stock > 0);
      const outOfStock = productsArray.filter(p => p.quantity_in_stock === 0);

      const catMap = new Map<string, number>();
      productsArray.forEach(p => {
        const catName = p.category_id || 'Uncategorized'; // Simplified for offline
        catMap.set(catName, (catMap.get(catName) || 0) + 1);
      });

      const colors = ['#007BFF', '#16A34A', '#D97706', '#8B5CF6', '#DC2626'];
      const stockDistribution = Array.from(catMap.entries()).map(([label, count], idx) => ({
        value: Math.round((count / (productsArray.length || 1)) * 100),
        label,
        color: colors[idx % colors.length]
      }));

      // Offline Movement Trend
      const { start: weekStart } = getDateRange('week');
      const recentItems = await db.getAllAsync<any>(`
        SELECT si.quantity, s.sale_date 
        FROM saleitems si
        JOIN sales s ON si.sale_id = s.sale_id
        WHERE s.sale_date >= ?
      `, [weekStart]);

      const movementMap = new Map<string, number>();
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      days.forEach(d => movementMap.set(d, 0));

      recentItems.forEach((item: any) => {
        const date = new Date(item.sale_date);
        const dayName = days[(date.getDay() + 6) % 7];
        movementMap.set(dayName, (movementMap.get(dayName) || 0) + (item.quantity || 0));
      });

      const movementTrend = days.map(day => ({
        label: day,
        value: movementMap.get(day) || 0
      }));

      return {
        totalItems,
        totalProductCount: productsArray.length,
        totalCostValue,
        totalSellingValue,
        potentialProfit,
        totalValue: totalCostValue,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        reorderAlerts: [],
        stockDistribution,
        movementTrend,
        lowStockItems: lowStock.slice(0, 5).map(p => ({
          name: p.name,
          sku: p.sku,
          current: p.quantity_in_stock,
          reorder: p.reorder_level,
          supplier: 'Unknown'
        }))
      };
    } catch (e) {
      console.log("Offline inventory analytics error:", e);
    }
  }

  return {
    totalItems: 0,
    totalProductCount: 0,
    totalCostValue: 0,
    totalSellingValue: 0,
    potentialProfit: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    reorderAlerts: [],
    stockDistribution: [],
    movementTrend: [],
    lowStockItems: []
  };
}

// Get purchase order report
export async function getPOReport(): Promise<POReport> {
  const online = await isOnline();

  if (online) {
    try {
      const { data: pos, error } = await supabase
        .from('purchaseorders')
        .select('status, total_cost');

      if (error) throw error;

      const totalPOs = pos?.length || 0;
      const pendingPOs = pos?.filter(po => po.status === 'pending').length || 0;
      const deliveredPOs = pos?.filter(po => po.status === 'delivered').length || 0;
      const totalCost = pos?.reduce((sum, po) => sum + (po.total_cost || 0), 0) || 0;

      return {
        totalPOs,
        pendingPOs,
        deliveredPOs,
        totalCost,
      };
    } catch (error) {
      console.log('Error fetching PO report:', error);
      throw error;
    }
  }

  // Offline: Read from local DB
  const db = getOfflineDB();
  if (db) {
    return await performTransaction(async () => {
      const pos = await db.getAllAsync<any>(
        'SELECT status, total_cost FROM purchaseorders'
      );
      const posArray = Array.isArray(pos) ? pos : [];

      const totalPOs = posArray.length;
      const pendingPOs = posArray.filter((po: any) => po.status === 'pending').length;
      const deliveredPOs = posArray.filter((po: any) => po.status === 'delivered').length;
      const totalCost = posArray.reduce((sum: number, po: any) => sum + (po.total_cost || 0), 0);

      return {
        totalPOs,
        pendingPOs,
        deliveredPOs,
        totalCost,
      };
    });
  }

  return {
    totalPOs: 0,
    pendingPOs: 0,
    deliveredPOs: 0,
    totalCost: 0,
  };
}

// Get return summary
export async function getReturnSummary(
  period: ReportPeriod = 'day'
): Promise<{ totalReturns: number; pending: number; approved: number; rejected: number }> {
  const online = await isOnline();
  const { start, end } = getDateRange(period);

  if (online) {
    try {
      const { data: returns, error } = await supabase
        .from('returns')
        .select('status')
        .gte('date_returned', start)
        .lte('date_returned', end);

      if (error) throw error;

      return {
        totalReturns: returns?.length || 0,
        pending: returns?.filter(r => r.status === 'pending').length || 0,
        approved: returns?.filter(r => r.status === 'approved').length || 0,
        rejected: returns?.filter(r => r.status === 'rejected').length || 0,
      };
    } catch (error) {
      console.log('Error fetching return summary:', error);
      return { totalReturns: 0, pending: 0, approved: 0, rejected: 0 };
    }
  }

  // Offline: Read from local DB
  const db = getOfflineDB();
  if (db) {
    return await performTransaction(async () => {
      const returns = await db.getAllAsync<any>(
        `SELECT status FROM returns WHERE date_returned >= ? AND date_returned <= ?`,
        [start, end]
      );
      const returnsArray = Array.isArray(returns) ? returns : [];

      return {
        totalReturns: returnsArray.length,
        pending: returnsArray.filter((r: any) => r.status === 'pending').length,
        approved: returnsArray.filter((r: any) => r.status === 'approved').length,
        rejected: returnsArray.filter((r: any) => r.status === 'rejected').length,
      };
    });
  }

  return { totalReturns: 0, pending: 0, approved: 0, rejected: 0 };
}


// Get monthly P&L breakdown for the last 6 months
export async function getMonthlyPLBreakdown(): Promise<Array<{
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}>> {
  const online = await isOnline();
  const db = getOfflineDB();
  const months: string[] = [];
  const results: any[] = [];

  // Get last 6 months labels
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
  }

  // Determine function to run based on connection
  if (online) {
    try {
      // For each month, get sales, cogs, and expenses
      for (let i = 5; i >= 0; i--) {
        const start = new Date();
        start.setMonth(start.getMonth() - i);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);

        // 1. Revenue
        const { data: sales } = await supabase
          .from('sales')
          .select('sale_id, total_amount')
          .gte('sale_date', start.toISOString())
          .lte('sale_date', end.toISOString())
          .neq('sale_type', 'pending_debit');

        const revenue = sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

        // 2. COGS
        let cost = 0;
        if (sales && sales.length > 0) {
          const saleIds = sales.map(s => s.sale_id);
          const { data: saleItems } = await supabase
            .from('saleitems')
            .select('part_id, quantity')
            .in('sale_id', saleIds);

          if (saleItems && saleItems.length > 0) {
            const productIds = [...new Set(saleItems.map(si => si.part_id))];
            const { data: products } = await supabase
              .from('spareparts')
              .select('part_id, cost_price')
              .in('part_id', productIds);

            const costMap = new Map(products?.map(p => [p.part_id, p.cost_price]) || []);
            cost = saleItems.reduce((sum, item) => sum + ((costMap.get(item.part_id) || 0) * item.quantity), 0);
          }
        }

        // 3. Expenses
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .gte('date', start.toISOString())
          .lte('date', end.toISOString());

        const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

        // 4. Net Profit
        // Profit currently defined as Net Profit (Revenue - COGS - Expenses)
        // Note: You can split this into Gross and Net if UI supports it, 
        // but for now we subtract expenses from "cost" side or "profit" side.
        // Let's treat "cost" in the UI generic "Costs" which typically implies COGS+Expenses
        // OR we can keep cost as COGS and reduce profit.
        // The UI shows "Costs" (Red) and "Net Profit" (Green). 
        // Best approach: Costs = COGS + Expenses.

        const totalCostsAndExpenses = cost + totalExpenses;
        const netProfit = revenue - totalCostsAndExpenses;
        const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        results.push({
          month: months[5 - i],
          revenue,
          cost: totalCostsAndExpenses, // Display sum of COGS + Expenses as "Costs"
          profit: netProfit,
          margin: parseFloat(margin.toFixed(1))
        });
      }
      return results;
    } catch (error) {
      console.log('Error fetching monthly P&L online:', error);
    }
  } else if (db) {
    // OFFLINE IMPLEMENTATION
    try {
      await performTransaction(async () => {
        for (let i = 5; i >= 0; i--) {
          const start = new Date();
          start.setMonth(start.getMonth() - i);
          start.setDate(1);
          start.setHours(0, 0, 0, 0);

          const end = new Date(start);
          end.setMonth(end.getMonth() + 1);
          end.setDate(0);
          end.setHours(23, 59, 59, 999);

          // 1. Revenue
          const salesResult = await db.getAllAsync<any>(
            `SELECT SUM(total_amount) as total FROM sales WHERE sale_date >= ? AND sale_date <= ? AND sale_type != 'pending_debit'`,
            [start.toISOString(), end.toISOString()]
          );
          const revenue = (salesResult && salesResult[0]) ? (salesResult[0].total || 0) : 0;

          // 2. COGS (Join sales -> items -> parts)
          const cogsResult = await db.getAllAsync<any>(`
            SELECT SUM(si.quantity * sp.cost_price) as total_cost
            FROM saleitems si
            JOIN spareparts sp ON si.part_id = sp.part_id
            JOIN sales s ON si.sale_id = s.sale_id
            WHERE s.sale_date >= ? AND s.sale_date <= ?
          `, [start.toISOString(), end.toISOString()]);
          const cogs = (cogsResult && cogsResult[0]) ? (cogsResult[0].total_cost || 0) : 0;

          // 3. Expenses
          const expResult = await db.getAllAsync<any>(
            `SELECT SUM(amount) as total_exp FROM expenses WHERE date >= ? AND date <= ?`,
            [start.toISOString(), end.toISOString()]
          );
          const expenses = (expResult && expResult[0]) ? (expResult[0].total_exp || 0) : 0;

          const totalCostsAndExpenses = cogs + expenses;
          const netProfit = revenue - totalCostsAndExpenses;
          const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

          results.push({
            month: months[5 - i],
            revenue,
            cost: totalCostsAndExpenses,
            profit: netProfit,
            margin: parseFloat(margin.toFixed(1))
          });
        }
      });
      return results;
    } catch (error) {
      console.log('Error fetching monthly P&L offline:', error);
    }
  }

  // Fallback if DB invalid
  return months.map(m => ({
    month: m,
    revenue: 0,
    cost: 0,
    profit: 0,
    margin: 0
  }));
}

export type StaffPerformance = {
  rank: number;
  id: string;
  name: string;
  role: string;
  revenue: number;
  transactions: number;
  avgSale: number;
  change: number;
  avatar: string;
};

// Get staff performance report
export async function getStaffPerformanceReport(
  period: ReportPeriod = 'month'
): Promise<StaffPerformance[]> {
  const online = await isOnline();
  const { start, end } = getDateRange(period);

  if (online) {
    try {
      // 1. Get all users
      const { data: users, error: pError } = await supabase
        .from('users')
        .select('id, name, role');

      if (pError) throw pError;
      if (!users) return [];

      // 2. Get sales for the period grouped by user
      const { data: sales, error: sError } = await supabase
        .from('sales')
        .select('user_id, total_amount')
        .gte('sale_date', start)
        .lte('sale_date', end)
        .neq('sale_type', 'pending_debit');

      if (sError) throw sError;

      // 3. Aggregate data
      const performanceMap = new Map<string, { revenue: number, transactions: number }>();

      sales?.forEach(sale => {
        if (!sale.user_id) return;
        const current = performanceMap.get(sale.user_id) || { revenue: 0, transactions: 0 };
        performanceMap.set(sale.user_id, {
          revenue: current.revenue + (sale.total_amount || 0),
          transactions: current.transactions + 1
        });
      });

      // 4. Map to final structure and sort
      const results: StaffPerformance[] = users.map(user => {
        const stats = performanceMap.get(user.id) || { revenue: 0, transactions: 0 };
        return {
          rank: 0, // Assigned after sorting
          id: user.id,
          name: user.name || 'Unknown Staff',
          role: user.role || 'Staff',
          revenue: stats.revenue,
          transactions: stats.transactions,
          avgSale: stats.transactions > 0 ? Math.round(stats.revenue / stats.transactions) : 0,
          change: 0, // Placeholder
          avatar: (user.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
        };
      })
        .sort((a, b) => b.revenue - a.revenue)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      return results;
    } catch (error) {
      console.log('Error fetching staff performance online:', error);
      return [];
    }
  }

  // Offline: Read from local DB
  const db = getOfflineDB();
  if (db) {
    try {
      return await performTransaction(async () => {
        // 1. Get users from local DB
        const users = await db.getAllAsync<any>('SELECT id, name, role FROM users');

        // 2. Get sales aggregates from local DB
        const salesAggregates = await db.getAllAsync<any>(
          `SELECT user_id, SUM(total_amount) as revenue, COUNT(*) as transactions 
           FROM sales 
           WHERE sale_date >= ? AND sale_date <= ? AND sale_type != 'pending_debit' 
           GROUP BY user_id`,
          [start, end]
        );

        const statsMap = new Map(salesAggregates?.map((s: any) => [s.user_id, s]) || []);

        const results: StaffPerformance[] = users.map((user: any) => {
          const stats: any = statsMap.get(user.id) || { revenue: 0, transactions: 0 };
          return {
            rank: 0,
            id: user.id,
            name: user.name || 'Unknown Staff',
            role: user.role || 'Staff',
            revenue: stats.revenue || 0,
            transactions: stats.transactions || 0,
            avgSale: stats.transactions > 0 ? Math.round(stats.revenue / stats.transactions) : 0,
            change: 0,
            avatar: (user.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
          };
        })
          .sort((a, b) => b.revenue - a.revenue)
          .map((item, index) => ({ ...item, rank: index + 1 }));

        return results;
      });
    } catch (error) {
      console.log('Error fetching staff performance offline:', error);
    }
  }

  return [];
}

// Get expense report
export async function getExpenseReport(
  period: ReportPeriod = 'day'
): Promise<ExpenseReport> {
  const online = await isOnline();
  const { start, end } = getDateRange(period);

  if (online) {
    try {
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('category, amount')
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;

      const validExpenses = expenses || [];
      const totalExpenses = validExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      const catMap = new Map<string, number>();
      validExpenses.forEach(e => {
        catMap.set(e.category, (catMap.get(e.category) || 0) + (e.amount || 0));
      });

      return {
        totalExpenses,
        count: validExpenses.length,
        byCategory: Array.from(catMap.entries()).map(([category, amount]) => ({ category, amount })),
      };
    } catch (error) {
      console.log('Error fetching expense report:', error);
      throw error;
    }
  }

  // Offline: Read from local DB
  const db = getOfflineDB();
  if (db) {
    return await performTransaction(async () => {
      const expenses = await db.getAllAsync<any>(
        'SELECT category, amount FROM expenses WHERE date >= ? AND date <= ?',
        [start, end]
      );
      const expensesArray = Array.isArray(expenses) ? expenses : [];

      const totalExpenses = expensesArray.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      const catMap = new Map<string, number>();
      expensesArray.forEach((e: any) => {
        catMap.set(e.category, (catMap.get(e.category) || 0) + (e.amount || 0));
      });

      return {
        totalExpenses,
        count: expensesArray.length,
        byCategory: Array.from(catMap.entries()).map(([category, amount]) => ({ category, amount })),
      };
    });
  }

  return {
    totalExpenses: 0,
    count: 0,
    byCategory: [],
  };
}


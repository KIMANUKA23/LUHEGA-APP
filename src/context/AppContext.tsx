// App Context - Updated to use Supabase with offline fallback
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { Platform } from "react-native";
import { useAuth } from "./AuthContext";
import { syncAll, syncAllDebounced, startPeriodicSync, setSyncConfig } from "../services/syncService";
import * as inventoryService from "../services/inventoryService";
import * as salesService from "../services/salesService";
import * as debtService from "../services/debtService";
import * as returnsService from "../services/returnsService";
import * as poService from "../services/poService";
import * as categoryService from "../services/categoryService";
import * as supplierService from "../services/supplierService";
import { Product as ServiceProduct } from "../services/inventoryService";
import { SaleWithItems as ServiceSale } from "../services/salesService";
import { Debt as ServiceDebt } from "../services/debtService";
import { ReturnRequest as ServiceReturn } from "../services/returnsService";
import { POWithItems as ServicePO } from "../services/poService";
import * as expenseService from "../services/expenseService";
import { Expense as ServiceExpense } from "../services/expenseService";

// Legacy types for backward compatibility
export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  supplier: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  quantityInStock: number;
  reorderLevel: number;
  imageUrl?: string;
  status?: string;
};

export type Sale = {
  id: string;
  customerName?: string;
  customerPhone?: string;
  saleType: "cash" | "debit" | "pending_debit";
  totalAmount: number;
  amountPaid: number;
  amountRemaining: number;
  paymentMode: string;
  saleDate: string;
  items: SaleItem[];
  notes?: string;
  staffId?: string;
};

export type SaleItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  returnStatus: "none" | "partial" | "full";
};

export type Debt = {
  id: string;
  saleId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  amountPaid: number;
  balanceRemaining: number;
  status: "unpaid" | "partial" | "paid";
  createdAt: string;
  updatedAt: string;
};

export type ReturnRequest = {
  id: string;
  saleItemId: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  reason: string;
  condition: "good" | "damaged" | "suspected";
  status: "pending" | "approved" | "rejected";
  dateReturned: string;
  notes?: string;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string | null;
  createdBy: string | null;
  status: "pending" | "approved" | "delivered" | "cancelled";
  totalCost: number;
  dateCreated: string;
  expectedDate?: string | null;
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  staffId: string;
  staffName: string;
  date: string;
  synced: boolean;
};


type AppContextType = {
  // State
  products: Product[];
  sales: Sale[];
  debts: Debt[];
  returns: ReturnRequest[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  loading: boolean;
  syncing: boolean;


  // Product/Inventory actions
  getProduct: (id: string) => Product | undefined;
  updateProductStock: (productId: string, quantity: number) => void;
  getLowStockProducts: () => Product[];
  refreshProducts: () => Promise<Product[]>;

  // Sales actions
  createSale: (sale: Omit<Sale, "id">) => Promise<Sale>;
  getSale: (id: string) => Sale | undefined;
  getAllSales: () => Sale[];
  refreshSales: () => Promise<Sale[]>;
  updateSaleType: (saleId: string, type: "cash" | "debit" | "pending_debit") => Promise<void>;

  // Debt actions
  createDebt: (debt: Omit<Debt, "id" | "createdAt" | "updatedAt">) => Promise<Debt>;
  updateDebtPayment: (debtId: string, amount: number) => Promise<void>;
  getDebt: (id: string) => Debt | undefined;
  getAllDebts: () => Debt[];
  refreshDebts: () => Promise<Debt[]>;

  // Return actions
  createReturn: (returnRequest: Omit<ReturnRequest, "id" | "dateReturned">) => Promise<ReturnRequest>;
  approveReturn: (returnId: string) => Promise<void>;
  rejectReturn: (returnId: string) => Promise<void>;
  getReturn: (id: string) => ReturnRequest | undefined;
  getAllReturns: () => ReturnRequest[];
  refreshReturns: () => Promise<ReturnRequest[]>;

  // Purchase Order actions
  createPurchaseOrder: (po: Omit<PurchaseOrder, "id" | "dateCreated">) => Promise<PurchaseOrder>;
  deliverPurchaseOrder: (poId: string) => Promise<void>;
  getPurchaseOrder: (id: string) => PurchaseOrder | undefined;
  getAllPurchaseOrders: () => PurchaseOrder[];
  refreshPurchaseOrders: () => Promise<void>;

  // Expense actions
  createExpense: (expense: Omit<Expense, "id" | "date" | "synced">) => Promise<Expense>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<boolean>;
  deleteExpense: (id: string) => Promise<boolean>;
  getExpense: (id: string) => Expense | undefined;
  getAllExpenses: () => Expense[];
  refreshExpenses: () => Promise<Expense[]>;

  // Sync
  manualSync: () => Promise<void>;

};

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper: Convert service product to legacy format
function serviceProductToLegacy(sp: ServiceProduct, categories: Map<string, string>, suppliers: Map<string, string>): Product {
  return {
    id: sp.part_id,
    sku: sp.sku,
    name: sp.name,
    category: sp.category_id ? categories.get(sp.category_id) || "Unknown" : "Uncategorized",
    supplier: sp.supplier_id ? suppliers.get(sp.supplier_id) || "Unknown" : "Unknown",
    description: sp.description || "",
    costPrice: sp.cost_price,
    sellingPrice: sp.selling_price,
    quantityInStock: sp.quantity_in_stock,
    reorderLevel: sp.reorder_level,
    imageUrl: sp.image_url || undefined,
    status: sp.status || 'active',
  };
}

// Helper: Convert service sale to legacy format
// Helper: Convert service sale to legacy format
function serviceSaleToLegacy(ss: ServiceSale, productsMap?: Map<string, string>): Sale {
  return {
    id: ss.sale_id,
    customerName: ss.customer_name || undefined,
    customerPhone: ss.customer_phone || undefined,
    saleType: (ss.sale_type || "cash").toLowerCase() as "cash" | "debit" | "pending_debit",
    totalAmount: ss.total_amount,
    amountPaid: ss.amount_paid,
    amountRemaining: Number(ss.amount_remaining || 0),
    paymentMode: ss.payment_mode || "",
    saleDate: ss.sale_date,
    notes: ss.notes || undefined,
    staffId: ss.user_id || undefined,
    items: ss.items.map(item => ({
      id: item.sale_item_id,
      productId: item.part_id,
      productName: productsMap?.get(item.part_id) || "Unknown Product",
      quantity: item.quantity,
      unitPrice: item.unit_price,
      subtotal: item.subtotal,
      returnStatus: item.return_status,
    })),
  };
}

// Helper: Convert service debt to legacy format
function serviceDebtToLegacy(sd: ServiceDebt): Debt {
  return {
    id: sd.debt_id,
    saleId: sd.sale_id || "",
    customerName: sd.customer_name,
    customerPhone: sd.customer_phone,
    totalAmount: sd.total_amount,
    amountPaid: sd.amount_paid,
    balanceRemaining: sd.balance_remaining,
    status: sd.status,
    createdAt: sd.created_at,
    updatedAt: sd.updated_at,
  };
}

// Helper: Convert service return to legacy format
function serviceReturnToLegacy(sr: ServiceReturn): ReturnRequest {
  return {
    id: sr.return_id,
    saleItemId: sr.sale_item_id || "",
    saleId: sr.sale_id || "",
    productId: sr.product_id,
    productName: sr.product_name,
    quantity: sr.quantity,
    reason: sr.reason,
    condition: sr.condition,
    status: sr.status,
    dateReturned: sr.date_returned,
    notes: sr.notes || undefined,
  };
}

// Helper: Convert service expense to legacy format
function serviceExpenseToLegacy(se: ServiceExpense): Expense {
  return {
    id: se.id,
    category: se.category,
    amount: se.amount,
    description: se.description,
    staffId: se.staff_id,
    staffName: se.staff_name,
    date: se.date,
    synced: se.synced,
  };
}


export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);


  // Category and Supplier maps for conversion
  const [categoriesMap, setCategoriesMap] = useState<Map<string, string>>(new Map());
  const [suppliersMap, setSuppliersMap] = useState<Map<string, string>>(new Map());

  // Ref[s] to track in-progress refreshes (deduplication)
  const refreshStatus = React.useRef({
    products: false,
    sales: false,
    debts: false,
    returns: false,
    pos: false,
    expenses: false
  });


  // Initialize data on mount and when user changes
  useEffect(() => {
    if (user) {
      setSyncConfig(user.id, isAdmin);
      loadInitialData();
      // Start periodic sync (reduced frequency for better performance)
      const cleanup = startPeriodicSync(60000); // Every 60 seconds (was 30)
      return cleanup;
    }
  }, [user?.id, isAdmin]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load only essential data initially (products and sales)
      // Other data will be loaded on-demand when screens are accessed
      await Promise.all([
        refreshProducts(),
        refreshSales(),
        refreshExpenses(),
      ]);

    } catch (error) {
      console.log("Error loading initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Product actions
  const refreshProducts = useCallback(async () => {
    if (refreshStatus.current.products) return products;
    refreshStatus.current.products = true;

    console.log("DEBUG: refreshProducts started");
    try {
      // Supabase Keep-Alive Ping: prevents project pausing on free tier
      if (Platform.OS !== 'web') {
        const { error: pingError } = await supabase.from('spareparts').select('part_id').limit(1);
        if (pingError) console.warn('Supabase Keep-Alive Ping failed:', pingError.message);
      }

      const serviceProducts = await inventoryService.getProducts();
      console.log(`DEBUG: serviceProducts count: ${serviceProducts.length}`);

      // Also fetch categories and suppliers for mapping
      const [categories, suppliers] = await Promise.all([
        categoryService.getCategories(),
        supplierService.getSuppliers(),
      ]).catch(err => {
        console.log("DEBUG: Failed to fetch categories/suppliers:", err);
        return [[], []];
      });

      const catMap = new Map(categories.map(c => [c.category_id, c.name]));
      const supMap = new Map(suppliers.map(s => [s.supplier_id, s.name]));
      setCategoriesMap(catMap);
      setSuppliersMap(supMap);

      const legacyProducts = serviceProducts.map(sp => serviceProductToLegacy(sp, catMap, supMap));
      console.log(`DEBUG: legacyProducts mapping complete: ${legacyProducts.length}`);
      setProducts(legacyProducts);
      return legacyProducts;
    } catch (error) {
      console.log("Error refreshing products:", error);
      return [];
    } finally {
      refreshStatus.current.products = false;
    }
  }, []);

  const getProduct = useCallback((id: string) => {
    return products.find((p) => p.id === id);
  }, [products]);

  const updateProductStock = useCallback(async (productId: string, quantity: number) => {
    try {
      await inventoryService.updateStock(productId, quantity);
      // Refresh products to get updated stock
      await refreshProducts();
    } catch (error) {
      console.log("Error updating stock:", error);
    }
  }, [refreshProducts]);

  const getLowStockProducts = useCallback(() => {
    return products.filter((p) => p.status !== 'archived' && p.quantityInStock <= p.reorderLevel);
  }, [products]);

  // Sales actions
  const refreshSales = useCallback(async () => {
    if (refreshStatus.current.sales) return sales;
    refreshStatus.current.sales = true;

    console.log("DEBUG: refreshSales started");
    try {
      const serviceSales = await salesService.getSales(user?.id || null, isAdmin);
      console.log(`DEBUG: serviceSales count: ${serviceSales.length}`);
      const productsMap = new Map(products.map(p => [p.id, p.name]));
      const formattedSales = serviceSales
        .map(s => serviceSaleToLegacy(s, productsMap))
        .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
      setSales(formattedSales);
      return formattedSales;
    } catch (error) {
      console.log("Error refreshing sales:", error);
      return [];
    } finally {
      refreshStatus.current.sales = false;
    }
  }, [user?.id, isAdmin, sales]);

  const updateSaleType = useCallback(async (saleId: string, type: "cash" | "debit" | "pending_debit") => {
    try {
      await salesService.updateSaleType(saleId, type);
      await refreshSales();
    } catch (error) {
      console.log("Error updating sale type:", error);
      throw error;
    }
  }, [refreshSales]);

  // Debt actions
  const refreshDebts = useCallback(async () => {
    if (refreshStatus.current.debts) return debts;
    refreshStatus.current.debts = true;

    try {
      const serviceDebts = await debtService.getAllDebts(user?.id || null, isAdmin);
      const legacyDebts = serviceDebts.map(serviceDebtToLegacy);
      setDebts(legacyDebts);
      return legacyDebts;
    } catch (error) {
      console.log("Error refreshing debts:", error);
      return [];
    } finally {
      refreshStatus.current.debts = false;
    }
  }, [user?.id, isAdmin, debts]);

  const createSale = useCallback(async (saleData: Omit<Sale, "id">): Promise<Sale> => {
    try {
      const serviceSale = await salesService.createSale({
        user_id: saleData.staffId || user?.id || null,
        customer_name: saleData.customerName || null,
        customer_phone: saleData.customerPhone || null,
        sale_type: saleData.saleType,
        items: saleData.items.map(item => ({
          part_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
        amount_paid: saleData.amountPaid,
        payment_mode: saleData.paymentMode,
        notes: saleData.notes || null,
      });

      console.log(`DEBUG: createSale service result:`, {
        id: serviceSale.sale_id,
        itemsCount: serviceSale.items?.length,
        synced: serviceSale.synced
      });

      // Map service properties to legacy UI properties
      const legacySale = serviceSaleToLegacy(serviceSale);

      console.log(`DEBUG: createSale converted to legacy:`, {
        id: legacySale.id,
        hasItems: !!legacySale.items
      });

      // Gently request a sync in the background so data is pushed to Supabase
      // and pulled down to other devices, without blocking UI/navigation.
      syncAllDebounced();

      // Refresh sales and products
      // For WEB: No need to wait for all if it's already fast, but let's ensure it doesn't block the return
      if (Platform.OS === 'web') {
        refreshSales();
        refreshProducts();
        refreshDebts();
      } else {
        // On native (APK), avoid blocking the UI on long network/DB work.
        // Fire-and-forget; any errors are logged inside the refresh functions.
        Promise.all([refreshSales(), refreshProducts(), refreshDebts()]).catch((err) => {
          console.log("Background refresh after sale failed:", err);
        });
      }

      return legacySale;
    } catch (error) {
      console.log("Error creating sale:", error);
      throw error;
    }
  }, [user?.id, refreshSales, refreshProducts, refreshDebts]);

  const getSale = useCallback((id: string) => {
    return sales.find((s) => s.id === id);
  }, [sales]);

  const getAllSales = useCallback(() => {
    return sales;
  }, [sales]);

  const createDebt = useCallback(async (debtData: Omit<Debt, "id" | "createdAt" | "updatedAt">): Promise<Debt> => {
    try {
      const serviceDebt = await debtService.createDebt({
        sale_id: debtData.saleId || null,
        customer_name: debtData.customerName,
        customer_phone: debtData.customerPhone,
        total_amount: debtData.totalAmount,
        amount_paid: debtData.amountPaid,
      });

      await refreshDebts();
      syncAllDebounced();
      return serviceDebtToLegacy(serviceDebt);
    } catch (error) {
      console.log("Error creating debt:", error);
      throw error;
    }
  }, [refreshDebts]);

  const updateDebtPayment = useCallback(async (debtId: string, amount: number) => {
    try {
      await debtService.updateDebtPayment(debtId, amount);
      await refreshDebts();
      syncAllDebounced();
    } catch (error) {
      console.log("Error updating debt payment:", error);
      throw error;
    }
  }, [refreshDebts]);

  const getDebt = useCallback((id: string) => {
    return debts.find((d) => d.id === id);
  }, [debts]);

  const getAllDebts = useCallback(() => {
    return debts;
  }, [debts]);

  // Return actions
  const refreshReturns = useCallback(async () => {
    if (refreshStatus.current.returns) return returns;
    refreshStatus.current.returns = true;

    try {
      const serviceReturns = await returnsService.getAllReturns(user?.id || null, isAdmin);
      const legacyReturns = serviceReturns.map(serviceReturnToLegacy);
      setReturns(legacyReturns);
      return legacyReturns;
    } catch (error) {
      console.log("Error refreshing returns:", error);
      return [];
    } finally {
      refreshStatus.current.returns = false;
    }
  }, [user?.id, isAdmin, returns]);

  const createReturn = useCallback(async (returnData: Omit<ReturnRequest, "id" | "dateReturned">): Promise<ReturnRequest> => {
    try {
      const serviceReturn = await returnsService.createReturn({
        sale_item_id: returnData.saleItemId || null,
        sale_id: returnData.saleId || null,
        user_id: user?.id || null,
        product_id: returnData.productId,
        product_name: returnData.productName,
        quantity: returnData.quantity,
        reason: returnData.reason,
        condition: returnData.condition,
        notes: returnData.notes || null,
      });

      if (Platform.OS === 'web') {
        refreshReturns();
        refreshSales();
      } else {
        await Promise.all([refreshReturns(), refreshSales()]);
        syncAllDebounced();
      }
      return serviceReturnToLegacy(serviceReturn);
    } catch (error) {
      console.log("Error creating return:", error);
      throw error;
    }
  }, [user?.id, refreshReturns]);

  const approveReturn = useCallback(async (returnId: string) => {
    try {
      await returnsService.approveReturn(returnId);
      await Promise.all([refreshReturns(), refreshProducts()]);
      syncAllDebounced();
    } catch (error) {
      console.log("Error approving return:", error);
      throw error;
    }
  }, [refreshReturns, refreshProducts]);

  const rejectReturn = useCallback(async (returnId: string) => {
    try {
      await returnsService.rejectReturn(returnId);
      await refreshReturns();
    } catch (error) {
      console.log("Error rejecting return:", error);
      throw error;
    }
  }, [refreshReturns]);

  const getReturn = useCallback((id: string) => {
    return returns.find((r) => r.id === id);
  }, [returns]);

  const getAllReturns = useCallback(() => {
    return returns;
  }, [returns]);

  // Purchase Order actions
  const refreshPurchaseOrders = useCallback(async () => {
    if (refreshStatus.current.pos) return;
    refreshStatus.current.pos = true;

    try {
      const servicePOs = await poService.getAllPurchaseOrders();
      const legacyPOs: PurchaseOrder[] = servicePOs.map(po => ({
        id: po.po_id,
        supplierId: po.supplier_id,
        createdBy: po.created_by,
        status: po.status,
        totalCost: po.total_cost,
        dateCreated: po.date_created,
        expectedDate: po.expected_date || undefined,
      }));
      setPurchaseOrders(legacyPOs);
    } catch (error) {
      console.log("Error refreshing POs:", error);
    } finally {
      refreshStatus.current.pos = false;
    }
  }, []);

  const createPurchaseOrder = useCallback(async (poData: Omit<PurchaseOrder, "id" | "dateCreated">): Promise<PurchaseOrder> => {
    try {
      const servicePO = await poService.createPurchaseOrder({
        supplier_id: poData.supplierId || null,
        created_by: user?.id || null,
        items: [], // Would need items passed in poData
        expected_date: poData.expectedDate || null,
      });

      await refreshPurchaseOrders();
      return {
        id: servicePO.po_id,
        supplierId: servicePO.supplier_id,
        createdBy: servicePO.created_by,
        status: servicePO.status,
        totalCost: servicePO.total_cost,
        dateCreated: servicePO.date_created,
        expectedDate: servicePO.expected_date || undefined,
      };
    } catch (error) {
      console.log("Error creating PO:", error);
      throw error;
    }
  }, [user?.id, refreshPurchaseOrders]);

  const deliverPurchaseOrder = useCallback(async (poId: string) => {
    try {
      await poService.deliverPurchaseOrder(poId);
      await Promise.all([refreshPurchaseOrders(), refreshProducts()]);
      syncAllDebounced();
    } catch (error) {
      console.log("Error delivering PO:", error);
      throw error;
    }
  }, [refreshPurchaseOrders, refreshProducts]);

  const getPurchaseOrder = useCallback((id: string) => {
    return purchaseOrders.find((po) => po.id === id);
  }, [purchaseOrders]);

  const getAllPurchaseOrders = useCallback(() => {
    return purchaseOrders;
  }, [purchaseOrders]);

  // Expense actions
  const refreshExpenses = useCallback(async () => {
    if (refreshStatus.current.expenses) return expenses;
    refreshStatus.current.expenses = true;

    try {
      const serviceExpenses = await expenseService.getAllExpenses();
      const legacyExpenses = serviceExpenses.map(serviceExpenseToLegacy);
      setExpenses(legacyExpenses);
      return legacyExpenses;
    } catch (error) {
      console.log("Error refreshing expenses:", error);
      return [];
    } finally {
      refreshStatus.current.expenses = false;
    }
  }, [expenses]);

  const createExpense = useCallback(async (expenseData: Omit<Expense, "id" | "date" | "synced">): Promise<Expense> => {
    try {
      const serviceExpense = await expenseService.createExpense({
        category: expenseData.category,
        amount: expenseData.amount,
        description: expenseData.description || undefined,
        staff_id: expenseData.staffId,
        staff_name: expenseData.staffName,
      });

      await refreshExpenses();

      // Ensure newly created expenses are synced to Supabase soon after save,
      // without blocking the caller or the UI.
      syncAllDebounced();

      return serviceExpenseToLegacy(serviceExpense);
    } catch (error) {
      console.log("Error creating expense:", error);
      throw error;
    }
  }, [refreshExpenses]);

  const updateExpense = useCallback(async (id: string, expenseData: Partial<Expense>) => {
    try {
      const success = await expenseService.updateExpense(id, {
        category: expenseData.category,
        amount: expenseData.amount,
        description: expenseData.description,
      });
      if (success) {
        await refreshExpenses();
        syncAllDebounced();
      }
      return success;
    } catch (error) {
      console.log("Error updating expense:", error);
      return false;
    }
  }, [refreshExpenses]);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      const success = await expenseService.deleteExpense(id);
      if (success) await refreshExpenses();
      return success;
    } catch (error) {
      console.log("Error deleting expense:", error);
      return false;
    }
  }, [refreshExpenses]);

  const getExpense = useCallback((id: string) => {
    return expenses.find((e) => e.id === id);
  }, [expenses]);

  const getAllExpenses = useCallback(() => {
    return expenses;
  }, [expenses]);

  // Manual sync
  const manualSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncAll();
      // Refresh all data after sync
      await loadInitialData();
    } catch (error) {
      console.log("Error in manual sync:", error);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, []);

  const value: AppContextType = useMemo(() => ({
    products,
    sales,
    debts,
    returns,
    purchaseOrders,
    expenses,
    loading,
    syncing,

    getProduct,
    updateProductStock,
    getLowStockProducts,
    refreshProducts,
    createSale,
    getSale,
    getAllSales,
    refreshSales,
    updateSaleType,
    createDebt,
    updateDebtPayment,
    getDebt,
    getAllDebts,
    refreshDebts,
    createReturn,
    approveReturn,
    rejectReturn,
    getReturn,
    getAllReturns,
    refreshReturns,
    createPurchaseOrder,
    deliverPurchaseOrder,
    getPurchaseOrder,
    getAllPurchaseOrders,
    refreshPurchaseOrders,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpense,
    getAllExpenses,
    refreshExpenses,
    manualSync,

  }), [
    products, sales, debts, returns, purchaseOrders, loading, syncing,
    getProduct, updateProductStock, getLowStockProducts, refreshProducts,
    createSale, getSale, getAllSales, refreshSales, updateSaleType,
    createDebt, updateDebtPayment, getDebt, getAllDebts, refreshDebts,
    createReturn, approveReturn, rejectReturn, getReturn, getAllReturns, refreshReturns,
    createPurchaseOrder, deliverPurchaseOrder, getPurchaseOrder, getAllPurchaseOrders, refreshPurchaseOrders,
    manualSync
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

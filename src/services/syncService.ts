// Sync Service - Handles offline/online data synchronization
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import { getOfflineDB, ensureDatabaseInitialized, performTransaction } from '../lib/database';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncPendingNotifications } from './notificationService';
import { syncExpenses } from './expenseService';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

let syncInProgress = false;
let syncStartTime: number | null = null;
const SYNC_TIMEOUT_MS = 60000 * 2; // 2 minutes timeout
let syncListeners: ((status: SyncStatus) => void)[] = [];

// Account Isolation Config
const SYNC_CONFIG_KEY = 'luhega_sync_config';
let currentSyncConfig = { userId: null as string | null, isAdmin: false };

export async function setSyncConfig(userId: string | null, isAdmin: boolean) {
  currentSyncConfig = { userId, isAdmin };
  console.log(`📡 [Sync] Config updated: UserID=${userId}, IsAdmin=${isAdmin}`);

  // Persist for background/restart reliability
  try {
    await AsyncStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(currentSyncConfig));
  } catch (e) {
    console.error('📡 [Sync] Failed to save sync config:', e);
  }
}

// Load config from storage on service start
export async function initializeSyncConfig() {
  try {
    const savedConfig = await AsyncStorage.getItem(SYNC_CONFIG_KEY);
    if (savedConfig) {
      currentSyncConfig = JSON.parse(savedConfig);
      console.log(`📡 [Sync] Restored config from storage: UserID=${currentSyncConfig.userId}, IsAdmin=${currentSyncConfig.isAdmin}`);
    }
  } catch (e) {
    console.error('📡 [Sync] Failed to restore sync config:', e);
  }
}

// Auto-initialize on import
initializeSyncConfig();

export function onSyncStatusChange(listener: (status: SyncStatus) => void) {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

function notifySyncStatus(status: SyncStatus) {
  syncListeners.forEach(listener => listener(status));
}

/**
 * Returns the total count of unsynced records across all trackable tables.
 */
export async function getUnsyncedCount(): Promise<number> {
  const db = await ensureDatabaseInitialized();
  if (!db) return 0;

  try {
    const tables = [
      'sales', 'returns', 'customerdebts', 'users',
      'purchaseorders', 'customers', 'inventoryaudit',
      'feedback', 'sync_queue'
    ];

    let total = 0;
    for (const table of tables) {
      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${table} WHERE synced = 0`
      );
      total += result?.count || 0;
    }
    return total;
  } catch (error) {
    console.log('Error counting unsynced items:', error);
    return 0;
  }
}

// Check if online
export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable !== false);
  } catch (error) {
    console.log('📡 [Network] error checking status:', error);
    return false;
  }
}

// Auto-Sync Network Listener
if (Platform.OS !== 'web') {
  NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable !== false) {
      console.log('📡 [Network] Connection restored, triggering auto-sync...');
      // Sync using current config automatically
      syncAllDebounced(5000);
    }
  });
}

// Sync pending sales
async function syncPendingSales(): Promise<void> {
  const db = await ensureDatabaseInitialized();
  if (!db) return;

  // 1. Get unsynced sales (read-only, no transaction needed or very short one)
  const result = await db.getAllAsync<{
    sale_id: string;
    user_id: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    sale_type: string;
    total_amount: number;
    amount_paid: number;
    amount_remaining: number;
    payment_mode: string | null;
    sale_date: string;
    notes: string | null;
  }>(`
    SELECT * FROM sales WHERE synced = 0
  `);

  // 2. Process each sale outside the global transaction
  for (const sale of result) {
    try {
      // Insert/Upsert sale to Supabase
      const { error: saleError } = await supabase
        .from('sales')
        .upsert({
          sale_id: sale.sale_id,
          user_id: sale.user_id,
          customer_name: sale.customer_name,
          customer_phone: sale.customer_phone,
          sale_type: sale.sale_type,
          total_amount: sale.total_amount,
          amount_paid: sale.amount_paid,
          amount_remaining: sale.amount_remaining,
          payment_mode: sale.payment_mode,
          sale_date: sale.sale_date,
          notes: sale.notes,
          synced: true,
        });

      if (saleError) throw saleError;

      // 3. Get sale items (read-only, outside transaction)
      const itemsResult = await db.getAllAsync<any>(
        `SELECT * FROM saleitems WHERE sale_id = ?`,
        [sale.sale_id]
      );
      const items = Array.isArray(itemsResult) ? itemsResult : [];

      // 4. Sync each item to Supabase (Network calls outside transaction)
      for (const item of items) {
        const { error: itemErr } = await supabase.from('saleitems').upsert({
          sale_item_id: item.sale_item_id,
          sale_id: item.sale_id,
          part_id: item.part_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          cost_price: item.cost_price || 0,
          return_status: item.return_status,
        });
        if (itemErr) throw itemErr;
      }

      // 5. Mark as synced in local DB only if everything succeeded
      await performTransaction(async () => {
        await db.runAsync(
          'UPDATE sales SET synced = 1 WHERE sale_id = ?',
          [sale.sale_id]
        );
      });
    } catch (error) {
      console.log('Error syncing sale:', error);
    }
  }
}

// Sync pending returns
async function syncPendingReturns(): Promise<void> {
  const db = await ensureDatabaseInitialized();
  if (!db) return;

  const result = await db.getAllAsync<any>(
    `SELECT * FROM returns WHERE synced = 0`
  );

  const returnsArray = Array.isArray(result) ? result : [];
  for (const returnItem of returnsArray) {
    try {
      const { error } = await supabase
        .from('returns')
        .insert({
          return_id: returnItem.return_id,
          sale_item_id: returnItem.sale_item_id,
          sale_id: returnItem.sale_id,
          user_id: returnItem.user_id,
          product_id: returnItem.product_id,
          product_name: returnItem.product_name,
          quantity: returnItem.quantity,
          reason: returnItem.reason,
          condition: returnItem.condition,
          status: returnItem.status,
          date_returned: returnItem.date_returned,
          notes: returnItem.notes,
          synced: true,
        });

      if (!error) {
        await performTransaction(async () => {
          await db.runAsync(
            'UPDATE returns SET synced = 1 WHERE return_id = ?',
            [returnItem.return_id]
          );
        });
      }
    } catch (error) {
      console.log('Error syncing return:', error);
    }
  }
}

// Sync pending debts
async function syncPendingDebts(): Promise<void> {
  const db = await ensureDatabaseInitialized();
  if (!db) return;

  const result = await db.getAllAsync<any>(
    `SELECT * FROM customerdebts WHERE synced = 0`
  );

  const debtsArray = Array.isArray(result) ? result : [];
  for (const debt of debtsArray) {
    try {
      const { error } = await supabase
        .from('customerdebts')
        .upsert({
          debt_id: debt.debt_id,
          sale_id: debt.sale_id,
          customer_name: debt.customer_name,
          customer_phone: debt.customer_phone,
          total_amount: debt.total_amount,
          amount_paid: debt.amount_paid,
          balance_remaining: debt.balance_remaining,
          status: debt.status,
          synced: true,
        });

      if (!error) {
        await performTransaction(async () => {
          await db.runAsync(
            'UPDATE customerdebts SET synced = 1 WHERE debt_id = ?',
            [debt.debt_id]
          );
        });
      }
    } catch (error) {
      console.log('Error syncing debt:', error);
    }
  }
}

// Sync pending users
async function syncPendingUsers(): Promise<void> {
  const db = await ensureDatabaseInitialized();
  if (!db) return;
  const result = await db.getAllAsync<any>('SELECT * FROM users WHERE synced = 0');
  const usersArray = Array.isArray(result) ? result : [];

  for (const user of usersArray) {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          phone: user.phone,
          photo_url: user.photo_url,
          role: user.role,
          status: user.status,
          address: user.address,
          emergency_contact: user.emergency_contact,
        });

      if (!error) {
        await performTransaction(async () => {
          await db.runAsync('UPDATE users SET synced = 1 WHERE id = ?', [user.id]);
        });
      }
    } catch (error) {
      console.log('Error syncing user:', error);
    }
  }
}

// Process generic sync queue
async function processSyncQueue(): Promise<void> {
  const db = await ensureDatabaseInitialized();
  if (!db) return;

  // 1. Get unsynced queue items
  const result = await db.getAllAsync<any>('SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC');
  const queue = Array.isArray(result) ? result : [];

  for (const item of queue) {
    try {
      const data = JSON.parse(item.data);
      let error;

      // 2. Network call outside transaction
      if (item.operation === 'insert') {
        const { error: insertError } = await supabase.from(item.table_name).insert(data);
        error = insertError;
      } else if (item.operation === 'update') {
        const { error: updateError } = await supabase.from(item.table_name).update(data).eq(getIdColumn(item.table_name), item.record_id);
        error = updateError;
      } else if (item.operation === 'delete') {
        const { error: deleteError } = await supabase.from(item.table_name).delete().eq(getIdColumn(item.table_name), item.record_id);
        error = deleteError;
      }

      if (!error) {
        // 3. Mini-transaction for local update
        await performTransaction(async () => {
          await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
          // Also update the source table to synced = 1
          await db.runAsync(`UPDATE ${item.table_name} SET synced = 1 WHERE ${getIdColumn(item.table_name)} = ?`, [item.record_id]);
        });
      }
    } catch (err) {
      console.log(`Error processing sync queue item ${item.id}:`, err);
    }
  }
}

function getIdColumn(tableName: string): string {
  if (tableName === 'spareparts') return 'part_id';
  if (tableName === 'users') return 'id';
  if (tableName === 'categories') return 'category_id';
  if (tableName === 'suppliers') return 'supplier_id';
  if (tableName === 'purchaseorders') return 'po_id';
  if (tableName === 'customers') return 'id';
  if (tableName === 'inventoryaudit') return 'audit_id';
  if (tableName === 'feedback') return 'id';
  return 'id';
}

// Sync pending purchase orders
async function syncPendingPurchaseOrders(): Promise<void> {
  const db = await ensureDatabaseInitialized();
  if (!db) return;
  const result = await db.getAllAsync<any>('SELECT * FROM purchaseorders WHERE synced = 0');
  const posArray = Array.isArray(result) ? result : [];

  for (const po of posArray) {
    try {
      // Get items for this PO (read-only)
      const items = await db.getAllAsync<any>('SELECT * FROM purchaseitems WHERE po_id = ?', [po.po_id]);

      // Network call outside transaction
      const { error: poError } = await supabase
        .from('purchaseorders')
        .upsert({
          po_id: po.po_id,
          supplier_id: po.supplier_id,
          created_by: po.created_by,
          status: po.status,
          total_cost: po.total_cost,
          date_created: po.date_created,
          expected_date: po.expected_date,
          synced: true,
        });

      if (!poError) {
        // Sync items
        for (const item of items) {
          await supabase.from('purchaseitems').upsert({
            po_item_id: item.po_item_id,
            po_id: item.po_id,
            part_id: item.part_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            subtotal: item.subtotal,
          });
        }

        // Mini-transaction for local update
        await performTransaction(async () => {
          await db.runAsync('UPDATE purchaseorders SET synced = 1 WHERE po_id = ?', [po.po_id]);
        });
      }
    } catch (error) {
      console.log('Error syncing PO:', error);
    }
  }
}

// Sync pending customers
async function syncPendingCustomers(): Promise<void> {
  const db = await ensureDatabaseInitialized();
  if (!db) return;
  const result = await db.getAllAsync<any>('SELECT * FROM customers WHERE synced = 0');
  const customersArray = Array.isArray(result) ? result : [];

  for (const customer of customersArray) {
    try {
      const { error } = await supabase
        .from('customers')
        .upsert({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          total_purchases: customer.total_purchases,
          total_orders: customer.total_orders,
          outstanding_debt: customer.outstanding_debt,
          last_visit: customer.last_visit,
          created_at: customer.created_at,
          synced: true,
        });

      if (!error) {
        await performTransaction(async () => {
          await db.runAsync('UPDATE customers SET synced = 1 WHERE id = ?', [customer.id]);
        });
      }
    } catch (error) {
      console.log('Error syncing customer:', error);
    }
  }
}

// Sync pending inventory audit
async function syncPendingInventoryAudit(): Promise<void> {
  const db = await ensureDatabaseInitialized();
  if (!db) return;
  const result = await db.getAllAsync<any>('SELECT * FROM inventoryaudit WHERE synced = 0');
  const auditsArray = Array.isArray(result) ? result : [];

  for (const audit of auditsArray) {
    try {
      const { error } = await supabase
        .from('inventoryaudit')
        .insert({
          audit_id: audit.audit_id,
          performed_by: audit.performed_by,
          part_id: audit.part_id,
          physical_count: audit.physical_count,
          system_count: audit.system_count,
          adjustment: audit.adjustment,
          reason: audit.reason,
          audit_date: audit.audit_date,
          status: audit.status,
          synced: true,
        });

      if (!error) {
        await performTransaction(async () => {
          await db.runAsync('UPDATE inventoryaudit SET synced = 1 WHERE audit_id = ?', [audit.audit_id]);
        });
      }
    } catch (error) {
      console.log('Error syncing inventory audit:', error);
    }
  }
}

// Sync pending feedback
async function syncPendingFeedback(): Promise<void> {
  const db = await ensureDatabaseInitialized();
  if (!db) return;
  const result = await db.getAllAsync<any>('SELECT * FROM feedback WHERE synced = 0');
  const feedbackArray = Array.isArray(result) ? result : [];

  for (const f of feedbackArray) {
    try {
      const feedbackToInsert = {
        id: f.feedback_id,
        user_id: f.user_id,
        type: f.type,
        subject: f.subject,
        message: f.message,
        created_at: f.created_at,
      };

      let { error } = await supabase
        .from('feedback')
        .insert(feedbackToInsert);

      // Fallback: If user_id causes FK error (23503), try as anonymous
      if (error && error.code === '23503') {
        console.warn('Feedback sync FK violation, retrying anonymously...');
        const { error: anonError } = await supabase
          .from('feedback')
          .insert({
            ...feedbackToInsert,
            user_id: null,
          });
        error = anonError;
      }

      if (!error) {
        await performTransaction(async () => {
          await db.runAsync('UPDATE feedback SET synced = 1 WHERE feedback_id = ?', [f.feedback_id]);
        });
      }
    } catch (error) {
      console.log('Error syncing feedback:', error);
    }
  }
}

// Download data from server to local
async function downloadData(userId: string | null = null, isAdmin: boolean = false): Promise<void> {
  const db = await ensureDatabaseInitialized();
  if (!db) return;

  try {
    // 1. Download catalogs (Global - Everyone gets these)
    // Download spareparts
    const { data: products, error: productsError } = await supabase.from('spareparts').select('*');
    if (productsError) throw productsError;
    if (products) {
      await performTransaction(async () => {
        const productIds: string[] = [];
        for (const product of products) {
          productIds.push(product.part_id);
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO spareparts (
                part_id, sku, name, category_id, supplier_id, description,
                cost_price, selling_price, quantity_in_stock, reorder_level,
                image_url, created_at, updated_at, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              product.part_id, product.sku, product.name, product.category_id,
              product.supplier_id, product.description, product.cost_price, product.selling_price,
              product.quantity_in_stock, product.reorder_level, product.image_url,
              product.created_at, product.updated_at || product.created_at,
            ]);
          } catch (err: any) { console.log('Error saving product locally:', err); }
        }
        // Cleanup deleted products
        if (productIds.length > 0) {
          const placeholders = productIds.map(() => '?').join(',');
          await db.runAsync(`DELETE FROM spareparts WHERE synced = 1 AND part_id NOT IN (${placeholders})`, productIds);
        } else {
          await db.runAsync(`DELETE FROM spareparts WHERE synced = 1`);
        }
      });
    }

    // Download suppliers
    const { data: suppliers, error: suppliersError } = await supabase.from('suppliers').select('*');
    if (!suppliersError && suppliers) {
      await performTransaction(async () => {
        const supplierIds: string[] = [];
        for (const supplier of suppliers) {
          supplierIds.push(supplier.supplier_id);
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO suppliers (
                supplier_id, name, contact_name, phone, email, address,
                payment_terms, created_at, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              supplier.supplier_id, supplier.name, supplier.contact_name, supplier.phone,
              supplier.email, supplier.address, supplier.payment_terms, supplier.created_at,
            ]);
          } catch (err: any) { console.log('Error saving supplier locally:', err); }
        }
        if (supplierIds.length > 0) {
          const placeholders = supplierIds.map(() => '?').join(',');
          await db.runAsync(`DELETE FROM suppliers WHERE synced = 1 AND supplier_id NOT IN (${placeholders})`, supplierIds);
        } else {
          await db.runAsync(`DELETE FROM suppliers WHERE synced = 1`);
        }
      });
    }

    // Download categories
    const { data: categories, error: categoriesError } = await supabase.from('categories').select('*');
    if (!categoriesError && categories) {
      await performTransaction(async () => {
        const categoryIds: string[] = [];
        for (const category of categories) {
          categoryIds.push(category.category_id);
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO categories (
                category_id, name, description, created_at, synced
              ) VALUES (?, ?, ?, ?, 1)
            `, [category.category_id, category.name, category.description, category.created_at]);
          } catch (err: any) { console.log('Error saving category locally:', err); }
        }
        if (categoryIds.length > 0) {
          const placeholders = categoryIds.map(() => '?').join(',');
          await db.runAsync(`DELETE FROM categories WHERE synced = 1 AND category_id NOT IN (${placeholders})`, categoryIds);
        } else {
          await db.runAsync(`DELETE FROM categories WHERE synced = 1`);
        }
      });
    }

    // 2. Download Activity Data (Filtered by User if not Admin)

    // Download sales
    let salesQuery = supabase.from('sales').select('*');
    if (!isAdmin && userId) salesQuery = salesQuery.eq('user_id', userId);
    const { data: sales, error: salesError } = await salesQuery;

    if (!salesError && sales) {
      await performTransaction(async () => {
        const saleIds: string[] = [];
        for (const sale of sales) {
          saleIds.push(sale.sale_id);
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO sales (
                sale_id, user_id, customer_name, customer_phone, sale_type,
                total_amount, amount_paid, amount_remaining, payment_mode,
                sale_date, notes, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              sale.sale_id, sale.user_id, sale.customer_name, sale.customer_phone,
              sale.sale_type, sale.total_amount, sale.amount_paid, sale.amount_remaining,
              sale.payment_mode, sale.sale_date, sale.notes,
            ]);
          } catch (err: any) { console.log('Error saving sale locally:', err); }
        }
        // Cleanup: Use the same filter as the query to avoid deleting other users' data on shared device
        const filterClause = isAdmin ? "" : "WHERE user_id = ?";
        const filterParams = isAdmin ? [] : [userId];
        if (saleIds.length > 0) {
          const placeholders = saleIds.map(() => '?').join(',');
          const sql = `DELETE FROM sales ${filterClause ? filterClause + ' AND' : 'WHERE'} synced = 1 AND sale_id NOT IN (${placeholders})`;
          await db.runAsync(sql, [...filterParams, ...saleIds]);
        } else if (filterClause) {
          await db.runAsync(`DELETE FROM sales ${filterClause} AND synced = 1`, filterParams);
        } else {
          await db.runAsync(`DELETE FROM sales WHERE synced = 1`);
        }
      });
    }

    // Download sale items (Filtered by parent sales user_id)
    let itemsQuery = supabase.from('saleitems').select('*, sales!inner(user_id)');
    if (!isAdmin && userId) itemsQuery = itemsQuery.eq('sales.user_id', userId);
    const { data: saleItems, error: itemsError } = await itemsQuery;

    if (!itemsError && saleItems) {
      await performTransaction(async () => {
        const itemIds: string[] = [];
        for (const item of saleItems) {
          itemIds.push(item.sale_item_id);
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO saleitems (
                sale_item_id, sale_id, part_id, quantity, unit_price,
                subtotal, cost_price, return_status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              item.sale_item_id, item.sale_id, item.part_id, item.quantity,
              item.unit_price, item.subtotal, item.cost_price, item.return_status,
            ]);
          } catch (err: any) { console.log('Error saving sale item locally:', err); }
        }
        // Cleanup sale items related to the user's sales
        if (itemIds.length > 0) {
          const placeholders = itemIds.map(() => '?').join(',');
          // Note: saleitems uses cost_price column for synced/safety in some versions, but here it has no synced column.
          // However, for data integrity, we only delete if the parent sale is synced.
          const filterSql = isAdmin
            ? "WHERE sale_id IN (SELECT sale_id FROM sales WHERE synced = 1)"
            : "WHERE sale_id IN (SELECT sale_id FROM sales WHERE user_id = ? AND synced = 1)";
          const filterParams = isAdmin ? [] : [userId];
          const sql = `DELETE FROM saleitems ${filterSql} AND sale_item_id NOT IN (${placeholders})`;
          await db.runAsync(sql, [...filterParams, ...itemIds]);
        }
      });
    }

    // Download expenses
    let expensesQuery = supabase.from('expenses').select('*');
    if (!isAdmin && userId) expensesQuery = expensesQuery.eq('staff_id', userId);
    const { data: expenses, error: expensesError } = await expensesQuery;

    if (!expensesError && expenses) {
      await performTransaction(async () => {
        const expenseIds: string[] = [];
        for (const exp of expenses) {
          expenseIds.push(exp.id);
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO expenses (
                id, category, amount, description, staff_id,
                staff_name, date, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              exp.id, exp.category, exp.amount, exp.description,
              exp.staff_id, exp.staff_name, exp.date,
            ]);
          } catch (err: any) { console.log('Error saving expense locally:', err); }
        }
        const filterClause = isAdmin ? "" : "WHERE staff_id = ?";
        const filterParams = isAdmin ? [] : [userId];
        if (expenseIds.length > 0) {
          const placeholders = expenseIds.map(() => '?').join(',');
          const sql = `DELETE FROM expenses ${filterClause ? filterClause + ' AND' : 'WHERE'} synced = 1 AND id NOT IN (${placeholders})`;
          await db.runAsync(sql, [...filterParams, ...expenseIds]);
        } else if (filterClause) {
          await db.runAsync(`DELETE FROM expenses ${filterClause} AND synced = 1`, filterParams);
        } else {
          await db.runAsync(`DELETE FROM expenses WHERE synced = 1`);
        }
      });
    }

    // Download customer debts
    let debtsQuery = supabase.from('customerdebts').select('*, sales!inner(user_id)');
    if (!isAdmin && userId) debtsQuery = debtsQuery.eq('sales.user_id', userId);
    const { data: debts, error: debtsError } = await debtsQuery;

    if (!debtsError && debts) {
      await performTransaction(async () => {
        const debtIds: string[] = [];
        for (const debt of debts) {
          debtIds.push(debt.debt_id);
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO customerdebts (
                debt_id, sale_id, customer_name, customer_phone, total_amount, 
                amount_paid, balance_remaining, status, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              debt.debt_id, debt.sale_id, debt.customer_name, debt.customer_phone,
              debt.total_amount, debt.amount_paid, debt.balance_remaining, debt.status,
            ]);
          } catch (err: any) { console.log('Error saving debt locally:', err); }
        }
        if (debtIds.length > 0) {
          const placeholders = debtIds.map(() => '?').join(',');
          const filterSql = isAdmin
            ? "WHERE synced = 1"
            : "WHERE synced = 1 AND sale_id IN (SELECT sale_id FROM sales WHERE user_id = ?)";
          const filterParams = isAdmin ? [] : [userId];
          const sql = `DELETE FROM customerdebts ${filterSql} AND debt_id NOT IN (${placeholders})`;
          await db.runAsync(sql, [...filterParams, ...debtIds]);
        }
      });
    }

    // Download returns
    let returnsQuery = supabase.from('returns').select('*');
    if (!isAdmin && userId) returnsQuery = returnsQuery.eq('user_id', userId);
    const { data: returns, error: returnsError } = await returnsQuery;

    if (!returnsError && returns) {
      await performTransaction(async () => {
        const returnIds: string[] = [];
        for (const ret of returns) {
          returnIds.push(ret.return_id);
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO returns (
                return_id, sale_item_id, sale_id, user_id, product_id, 
                product_name, quantity, reason, condition, status, 
                date_returned, notes, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              ret.return_id, ret.sale_item_id, ret.sale_id, ret.user_id,
              ret.product_id, ret.product_name, ret.quantity, ret.reason,
              ret.condition, ret.status, ret.date_returned, ret.notes,
            ]);
          } catch (err: any) { console.log('Error saving return locally:', err); }
        }
        const filterClause = isAdmin ? "" : "WHERE user_id = ?";
        const filterParams = isAdmin ? [] : [userId];
        if (returnIds.length > 0) {
          const placeholders = returnIds.map(() => '?').join(',');
          const sql = `DELETE FROM returns ${filterClause ? filterClause + ' AND' : 'WHERE'} synced = 1 AND return_id NOT IN (${placeholders})`;
          await db.runAsync(sql, [...filterParams, ...returnIds]);
        } else if (filterClause) {
          await db.runAsync(`DELETE FROM returns ${filterClause} AND synced = 1`, filterParams);
        } else {
          await db.runAsync(`DELETE FROM returns WHERE synced = 1`);
        }
      });
    }

    // Download purchase orders
    let posQuery = supabase.from('purchaseorders').select('*');
    if (!isAdmin && userId) posQuery = posQuery.eq('created_by', userId);
    const { data: pos, error: posError } = await posQuery;

    if (!posError && pos) {
      await performTransaction(async () => {
        const poIds: string[] = [];
        for (const po of pos) {
          poIds.push(po.po_id);
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO purchaseorders (
                po_id, supplier_id, created_by, status, total_cost, 
                date_created, expected_date, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              po.po_id, po.supplier_id, po.created_by, po.status,
              po.total_cost, po.date_created, po.expected_date,
            ]);
          } catch (err: any) { console.log('Error saving PO locally:', err); }
        }
        const filterClause = isAdmin ? "" : "WHERE created_by = ?";
        const filterParams = isAdmin ? [] : [userId];
        if (poIds.length > 0) {
          const placeholders = poIds.map(() => '?').join(',');
          const sql = `DELETE FROM purchaseorders ${filterClause ? filterClause + ' AND' : 'WHERE'} synced = 1 AND po_id NOT IN (${placeholders})`;
          await db.runAsync(sql, [...filterParams, ...poIds]);
        } else if (filterClause) {
          await db.runAsync(`DELETE FROM purchaseorders ${filterClause} AND synced = 1`, filterParams);
        } else {
          await db.runAsync(`DELETE FROM purchaseorders WHERE synced = 1`);
        }
      });
    }

    // Download purchase items
    let poItemsQuery = supabase.from('purchaseitems').select('*, purchaseorders!inner(created_by)');
    if (!isAdmin && userId) poItemsQuery = poItemsQuery.eq('purchaseorders.created_by', userId);
    const { data: poItems, error: poItemsError } = await poItemsQuery;

    if (!poItemsError && poItems) {
      await performTransaction(async () => {
        const pItemIds: string[] = [];
        for (const item of poItems) {
          pItemIds.push(item.po_item_id);
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO purchaseitems (
                po_item_id, po_id, part_id, quantity, unit_cost, subtotal
              ) VALUES (?, ?, ?, ?, ?, ?)
            `, [item.po_item_id, item.po_id, item.part_id, item.quantity, item.unit_cost, item.subtotal]);
          } catch (err: any) { console.log('Error saving PO item locally:', err); }
        }
        if (pItemIds.length > 0) {
          const placeholders = pItemIds.map(() => '?').join(',');
          const filterSql = isAdmin
            ? "WHERE po_id IN (SELECT po_id FROM purchaseorders WHERE synced = 1)"
            : "WHERE po_id IN (SELECT po_id FROM purchaseorders WHERE created_by = ? AND synced = 1)";
          const filterParams = isAdmin ? [] : [userId];
          const sql = `DELETE FROM purchaseitems ${filterSql} AND po_item_id NOT IN (${placeholders})`;
          await db.runAsync(sql, [...filterParams, ...pItemIds]);
        }
      });
    }

    // Download customers
    const { data: customers, error: customersError } = await supabase.from('customers').select('*');
    if (!customersError && customers) {
      await performTransaction(async () => {
        const customerIds: string[] = [];
        for (const customer of customers) {
          customerIds.push(customer.id);
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO customers (
                id, name, phone, email, total_purchases, total_orders, 
                outstanding_debt, last_visit, created_at, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              customer.id, customer.name, customer.phone, customer.email,
              customer.total_purchases, customer.total_orders, customer.outstanding_debt,
              customer.last_visit, customer.created_at,
            ]);
          } catch (err: any) { console.log('Error saving customer locally:', err); }
        }
        if (customerIds.length > 0) {
          const placeholders = customerIds.map(() => '?').join(',');
          await db.runAsync(`DELETE FROM customers WHERE synced = 1 AND id NOT IN (${placeholders})`, customerIds);
        } else {
          await db.runAsync(`DELETE FROM customers WHERE synced = 1`);
        }
      });
    }

    // Download inventory audit
    let auditsQuery = supabase.from('inventoryaudit').select('*');
    if (!isAdmin && userId) auditsQuery = auditsQuery.eq('performed_by', userId);
    const { data: audits, error: auditsError } = await auditsQuery;

    if (!auditsError && audits) {
      await performTransaction(async () => {
        const auditIds: string[] = [];
        for (const audit of audits) {
          auditIds.push(audit.audit_id);
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO inventoryaudit (
                audit_id, performed_by, part_id, physical_count, system_count, 
                adjustment, reason, audit_date, status, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              audit.audit_id, audit.performed_by, audit.part_id, audit.physical_count,
              audit.system_count, audit.adjustment, audit.reason, audit.audit_date, audit.status,
            ]);
          } catch (err: any) { console.log('Error saving audit locally:', err); }
        }
        const filterClause = isAdmin ? "" : "WHERE performed_by = ?";
        const filterParams = isAdmin ? [] : [userId];
        if (auditIds.length > 0) {
          const placeholders = auditIds.map(() => '?').join(',');
          const sql = `DELETE FROM inventoryaudit ${filterClause ? filterClause + ' AND' : 'WHERE'} synced = 1 AND audit_id NOT IN (${placeholders})`;
          await db.runAsync(sql, [...filterParams, ...auditIds]);
        } else if (filterClause) {
          await db.runAsync(`DELETE FROM inventoryaudit ${filterClause} AND synced = 1`, filterParams);
        } else {
          await db.runAsync(`DELETE FROM inventoryaudit WHERE synced = 1`);
        }
      });
    }
  } catch (error) {
    console.log('Error downloading data:', error);
    throw error;
  }
}

// Main sync function
export async function syncAll(): Promise<void> {
  const { userId, isAdmin } = currentSyncConfig;
  const now = Date.now();

  // Resilient locking: if sync is in progress but started more than 2 mins ago, assume it's stuck and reset
  if (syncInProgress && syncStartTime && (now - syncStartTime < SYNC_TIMEOUT_MS)) {
    console.log('Sync already in progress (started ' + Math.round((now - syncStartTime) / 1000) + 's ago)');
    return;
  }

  // Sync is not applicable on web
  if (Platform.OS === 'web') return;

  const online = await isOnline();
  if (!online) {
    console.log('Offline - skipping sync');
    return;
  }

  syncInProgress = true;
  syncStartTime = now;
  notifySyncStatus('syncing');

  try {
    console.log('🔄 [Sync] Starting full synchronization...');

    // Supabase Keep-Alive Ping: prevents project pausing on free tier
    try {
      const { error: pingError } = await supabase.from('spareparts').select('part_id').limit(1);
      if (pingError) console.warn('Supabase Keep-Alive Ping failed:', pingError.message);
    } catch (e) {
      console.warn('Keep-alive ping exception:', e);
    }

    // Upload pending changes (in sequence to maintain data integrity)
    await syncPendingSales();
    await syncPendingReturns();
    await syncPendingDebts();
    await syncPendingUsers();
    await syncPendingPurchaseOrders();
    await syncPendingCustomers();
    await syncPendingInventoryAudit();
    await syncPendingFeedback();
    await syncPendingNotifications();
    await syncExpenses();
    await processSyncQueue();

    // Small delay to allow DB to breathe
    await new Promise(r => setTimeout(r, 100));

    // Download latest data
    await downloadData(userId, isAdmin);

    console.log('✅ [Sync] Synchronization completed successfully');
    notifySyncStatus('success');
  } catch (error) {
    console.log('❌ [Sync] Sync error:', error);
    notifySyncStatus('error');
    throw error;
  } finally {
    syncInProgress = false;
    syncStartTime = null;
  }
}

// Debounce sync to prevent rapid triggers
let syncDebounceTimer: NodeJS.Timeout | null = null;
export function syncAllDebounced(delayMs: number = 2000) {
  if (Platform.OS === 'web') return;
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    syncAll().catch(err => console.log('Debounced sync error:', err));
  }, delayMs);
}

// Periodic sync (call every 30 seconds)
export function startPeriodicSync(intervalMs: number = 30000) {
  if (Platform.OS === 'web') return () => { };
  const interval = setInterval(() => {
    syncAll().catch(err => {
      console.log('Periodic sync error:', err);
    });
  }, intervalMs);

  return () => clearInterval(interval);
}


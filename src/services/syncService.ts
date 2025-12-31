// Sync Service - Handles offline/online data synchronization
import { supabase } from '../lib/supabase';
import { getOfflineDB, ensureDatabaseInitialized, performTransaction } from '../lib/database';
import NetInfo from '@react-native-community/netinfo';
import { syncPendingNotifications } from './notificationService';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

let syncInProgress = false;
let syncStartTime: number | null = null;
const SYNC_TIMEOUT_MS = 60000 * 2; // 2 minutes timeout
let syncListeners: ((status: SyncStatus) => void)[] = [];

export function onSyncStatusChange(listener: (status: SyncStatus) => void) {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

function notifySyncStatus(status: SyncStatus) {
  syncListeners.forEach(listener => listener(status));
}

// Check if online
export async function isOnline(): Promise<boolean> {
  try {
    // Add a timeout to prevent hanging if NetInfo.fetch() fails to resolve
    const statePromise = NetInfo.fetch();
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));

    const state = await Promise.race([statePromise, timeoutPromise]);

    if (!state) {
      console.warn('📡 [Network] NetInfo.fetch() timed out, assuming offline for safety.');
      return false;
    }

    // In some dev environments (like certain emulators or local servers), 
    // isInternetReachable can stay null for a long time or be false even when connected.
    // We prioritize isConnected but also check if reachable is NOT explicitly false.
    const online = !!(state.isConnected && state.isInternetReachable !== false);
    return online;
  } catch (error) {
    console.log('📡 [Network] error checking status:', error);
    return false;
  }
}

// Sync pending sales
async function syncPendingSales(): Promise<void> {
  const db = await ensureDatabaseInitialized();

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
      // Insert sale to Supabase
      const { data, error } = await supabase
        .from('sales')
        .insert({
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
        })
        .select()
        .single();

      if (!error && data) {
        // 3. Get sale items (read-only, outside transaction)
        const itemsResult = await db.getAllAsync<any>(
          `SELECT * FROM saleitems WHERE sale_id = ?`,
          [sale.sale_id]
        );
        const items = Array.isArray(itemsResult) ? itemsResult : [];

        // 4. Sync each item to Supabase (Network calls outside transaction)
        for (const item of items) {
          try {
            await supabase.from('saleitems').insert({
              sale_item_id: item.sale_item_id,
              sale_id: item.sale_id,
              part_id: item.part_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
              return_status: item.return_status,
            });
          } catch (itemErr) {
            console.log('Error syncing sale item:', itemErr);
          }
        }

        // 5. Mark as synced in local DB (mini-transaction for local update only)
        await performTransaction(async () => {
          await db.runAsync(
            'UPDATE sales SET synced = 1 WHERE sale_id = ?',
            [sale.sale_id]
          );
        });
      }
    } catch (error) {
      console.log('Error syncing sale:', error);
    }
  }
}

// Sync pending returns
async function syncPendingReturns(): Promise<void> {
  const db = await ensureDatabaseInitialized();

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
async function downloadData(): Promise<void> {
  const db = await ensureDatabaseInitialized();

  try {
    // Download spareparts
    const { data: products, error: productsError } = await supabase
      .from('spareparts')
      .select('*');

    if (productsError) throw productsError;

    if (products) {
      await performTransaction(async () => {
        for (const product of products) {
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO spareparts (
                part_id, sku, name, category_id, supplier_id, description,
                cost_price, selling_price, quantity_in_stock, reorder_level,
                image_url, created_at, updated_at, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              product.part_id,
              product.sku,
              product.name,
              product.category_id,
              product.supplier_id,
              product.description,
              product.cost_price,
              product.selling_price,
              product.quantity_in_stock,
              product.reorder_level,
              product.image_url,
              product.created_at,
              product.updated_at || product.created_at,
            ]);
          } catch (err: any) {
            console.log('Error saving product locally:', err);
          }
        }
      });
    }

    // Download suppliers
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('*');

    if (!suppliersError && suppliers) {
      await performTransaction(async () => {
        for (const supplier of suppliers) {
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO suppliers (
                supplier_id, name, contact_name, phone, email, address,
                payment_terms, created_at, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              supplier.supplier_id,
              supplier.name,
              supplier.contact_name,
              supplier.phone,
              supplier.email,
              supplier.address,
              supplier.payment_terms,
              supplier.created_at,
            ]);
          } catch (err: any) {
            console.log('Error saving supplier locally:', err);
          }
        }
      });
    }

    // Download categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');

    if (!categoriesError && categories) {
      await performTransaction(async () => {
        for (const category of categories) {
          try {
            await db.runAsync(`
              INSERT OR REPLACE INTO categories (
                category_id, name, description, created_at, synced
              ) VALUES (?, ?, ?, ?, 1)
            `, [
              category.category_id,
              category.name,
              category.description,
              category.created_at,
            ]);
          } catch (err: any) {
            console.log('Error saving category locally:', err);
          }
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
  const now = Date.now();

  // Resilient locking: if sync is in progress but started more than 2 mins ago, assume it's stuck and reset
  if (syncInProgress && syncStartTime && (now - syncStartTime < SYNC_TIMEOUT_MS)) {
    console.log('Sync already in progress (started ' + Math.round((now - syncStartTime) / 1000) + 's ago)');
    return;
  }

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
    await processSyncQueue();

    // Small delay to allow DB to breathe
    await new Promise(r => setTimeout(r, 100));

    // Download latest data
    await downloadData();

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
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    syncAll().catch(err => console.log('Debounced sync error:', err));
  }, delayMs);
}

// Periodic sync (call every 30 seconds)
export function startPeriodicSync(intervalMs: number = 30000) {
  const interval = setInterval(() => {
    syncAll().catch(err => {
      console.log('Periodic sync error:', err);
    });
  }, intervalMs);

  return () => clearInterval(interval);
}


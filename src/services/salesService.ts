// Sales Service - Sales management with offline support
import { supabase } from '../lib/supabase';
import { ensureDatabaseInitialized, performTransaction } from '../lib/database';
import { isOnline } from './syncService';
import * as notificationService from './notificationService';
import * as debtService from './debtService';
import * as inventoryService from './inventoryService';
import uuid from 'react-native-uuid';

export type Sale = {
  sale_id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  sale_type: 'cash' | 'debit' | 'pending_debit';
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  payment_mode: string | null;
  sale_date: string;
  notes: string | null;
  synced: boolean;
  created_at: string;
};

export type SaleItem = {
  sale_item_id: string;
  sale_id: string;
  part_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  return_status: 'none' | 'partial' | 'full';
  created_at: string;
};

export type SaleWithItems = Sale & {
  items: SaleItem[];
};

// Generate UUID
function generateId(): string {
  return uuid.v4() as string;
}

// Create sale
export async function createSale(
  saleData: {
    user_id: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    sale_type: 'cash' | 'debit' | 'pending_debit';
    items: Array<{
      part_id: string;
      quantity: number;
      unit_price: number;
    }>;
    amount_paid: number;
    payment_mode: string;
    notes?: string | null;
  }
): Promise<SaleWithItems> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  const saleId = generateId();
  const now = new Date().toISOString();

  // Calculate totals
  const totalAmount = saleData.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const amountRemaining = saleData.sale_type === 'debit'
    ? totalAmount - saleData.amount_paid
    : 0;

  const sale: Sale = {
    sale_id: saleId,
    user_id: saleData.user_id,
    customer_name: saleData.customer_name || null,
    customer_phone: saleData.customer_phone || null,
    sale_type: saleData.sale_type,
    total_amount: totalAmount,
    amount_paid: saleData.amount_paid,
    amount_remaining: amountRemaining,
    payment_mode: saleData.payment_mode,
    sale_date: now,
    notes: saleData.notes || null,
    synced: false,
    created_at: now,
  };

  // Create sale items
  const saleItems: SaleItem[] = saleData.items.map((item) => ({
    sale_item_id: uuid.v4() as string, // Generate UUID for each item
    sale_id: saleId,
    part_id: item.part_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.unit_price * item.quantity,
    return_status: 'none',
    created_at: now,
  }));

  if (online) {
    try {
      // Verify authentication before insert
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please log in to create sales.');
      }

      // Create sale in Supabase
      const { data: saleRecord, error: saleError } = await supabase
        .from('sales')
        .insert({
          ...sale,
          synced: true,
        })
        .select()
        .single();

      if (saleError) {
        console.log('Supabase sale insert error:', saleError);
        if (saleError.code === '42501' || saleError.message?.includes('permission denied') || saleError.message?.includes('policy')) {
          console.log('RLS Policy Error - User may not be authenticated');
          throw new Error('Permission denied. Please ensure you are logged in.');
        }
        throw saleError;
      }

      // Create sale items
      const { error: itemsError } = await supabase
        .from('saleitems')
        .insert(saleItems.map(item => ({
          sale_item_id: item.sale_item_id,
          sale_id: item.sale_id,
          part_id: item.part_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          return_status: item.return_status,
        })));

      if (itemsError) {
        console.log('Supabase sale items insert error:', itemsError);
        if (itemsError.code === '42501' || itemsError.message?.includes('permission denied') || itemsError.message?.includes('policy')) {
          console.log('RLS Policy Error - User may not be authenticated');
          throw new Error('Permission denied. Please ensure you are logged in.');
        }
        throw itemsError;
      }

      // Update stock for each item (stock leaves inventory when the sale is created)
      for (const item of saleData.items) {
        await inventoryService.updateStock(item.part_id, -item.quantity);
      }

      // Save to local DB
      await ensureDatabaseInitialized().then(db => performTransaction(async () => {
        if (!db) return;
        await db.runAsync(`
          INSERT INTO sales (
            sale_id, user_id, customer_name, customer_phone, sale_type,
            total_amount, amount_paid, amount_remaining, payment_mode,
            sale_date, notes, synced, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `, [
          saleRecord.sale_id, saleRecord.user_id, saleRecord.customer_name,
          saleRecord.customer_phone, saleRecord.sale_type, saleRecord.total_amount,
          saleRecord.amount_paid, saleRecord.amount_remaining, saleRecord.payment_mode,
          saleRecord.sale_date, saleRecord.notes, saleRecord.created_at,
        ]);

        for (const item of saleItems) {
          await db.runAsync(`
            INSERT INTO saleitems (
              sale_item_id, sale_id, part_id, quantity, unit_price, subtotal, return_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            item.sale_item_id, item.sale_id, item.part_id, item.quantity,
            item.unit_price, item.subtotal, item.return_status, item.created_at,
          ]);
        }
      }));

      /* 
      // NOTE: Removed automatic debt creation. 
      // Debit sales should remain in a "pending approval" state (debit sale exists but no debt record yet).
      // Approval will be handled by Admin via DebitSaleDetailScreen.
      if (saleData.sale_type === 'debit' && amountRemaining > 0 && saleData.customer_name && saleData.customer_phone) {
        try {
          await debtService.createDebt({
            sale_id: saleId,
            customer_name: saleData.customer_name,
            customer_phone: saleData.customer_phone,
            total_amount: totalAmount,
            amount_paid: saleData.amount_paid,
          });
        } catch (debtError) {
          console.log('Error creating debt record:', debtError);
        }
      }
      */

      return { ...saleRecord, items: saleItems, synced: true };
    } catch (error) {
      console.log('Error creating sale online:', error);
      // Fall through to offline save
    }
  }

  // Offline: Save locally
  await performTransaction(async () => {
    if (!db) return;
    await db.runAsync(`
        INSERT INTO sales (
          sale_id, user_id, customer_name, customer_phone, sale_type,
          total_amount, amount_paid, amount_remaining, payment_mode,
          sale_date, notes, synced, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `, [
      sale.sale_id, sale.user_id, sale.customer_name, sale.customer_phone,
      sale.sale_type, sale.total_amount, sale.amount_paid, sale.amount_remaining,
      sale.payment_mode, sale.sale_date, sale.notes, sale.created_at,
    ]);

    for (const item of saleItems) {
      await db.runAsync(`
          INSERT INTO saleitems (
            sale_item_id, sale_id, part_id, quantity, unit_price, subtotal, return_status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
        item.sale_item_id, item.sale_id, item.part_id, item.quantity,
        item.unit_price, item.subtotal, item.return_status, item.created_at,
      ]);

      // Update stock locally (stock leaves inventory when the sale is created)
      await inventoryService.updateStock(item.part_id, -item.quantity);
    }
  });

  /* 
  // NOTE: Removed automatic debt creation offline as well.
  if (saleData.sale_type === 'debit' && amountRemaining > 0 && saleData.customer_name && saleData.customer_phone) {
    try {
      await debtService.createDebt({
        sale_id: saleId,
        customer_name: saleData.customer_name,
        customer_phone: saleData.customer_phone,
        total_amount: totalAmount,
        amount_paid: saleData.amount_paid,
      });
    } catch (debtError) {
      console.log('Error creating debt record offline:', debtError);
    }
  }
  */

  return { ...sale, items: saleItems };
}

// Get all sales (filtered by user_id for staff)
export async function getSales(userId?: string | null, isAdmin: boolean = false): Promise<SaleWithItems[]> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      let query = supabase
        .from('sales')
        .select('*')
        .order('sale_date', { ascending: false });

      // Staff sees only their sales
      if (!isAdmin && userId) {
        query = query.eq('user_id', userId);
      }

      const { data: sales, error } = await query;

      if (!error && sales) {
        // 1. Fetch all items for these sales from Supabase FIRST (Network call outside transaction)
        const saleIds = sales.map(s => s.sale_id);
        const { data: allItems } = await supabase
          .from('saleitems')
          .select('*')
          .in('sale_id', saleIds);

        // 2. Cache in local DB via transaction (DB lock only for local I/O)
        await performTransaction(async () => {
          for (const sale of sales) {
            await db.runAsync(`
              INSERT OR REPLACE INTO sales (
                sale_id, user_id, customer_name, customer_phone, sale_type,
                total_amount, amount_paid, amount_remaining, payment_mode,
                sale_date, notes, synced, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            `, [
              sale.sale_id, sale.user_id, sale.customer_name,
              sale.customer_phone, sale.sale_type, sale.total_amount,
              sale.amount_paid, sale.amount_remaining, sale.payment_mode,
              sale.sale_date, sale.notes, sale.created_at,
            ]);

            // Cache items for this sale from the already fetched list
            const items = allItems?.filter(i => i.sale_id === sale.sale_id) || [];
            for (const item of items) {
              await db.runAsync(`
                INSERT OR REPLACE INTO saleitems (
                  sale_item_id, sale_id, part_id, quantity, unit_price, subtotal, return_status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                item.sale_item_id, item.sale_id, item.part_id, item.quantity,
                item.unit_price, item.subtotal, item.return_status, item.created_at,
              ]);
            }
          }
        });
      }
    } catch (error) {
      console.log('Error fetching sales online:', error);
      // Fall through to local
    }
  }

  // Always return from local DB to include unsynced sales
  const salesWithItems: SaleWithItems[] = await performTransaction(async () => {
    if (!db) return [];

    let sales;
    if (!isAdmin && userId) {
      sales = await db.getAllAsync<any>(
        'SELECT * FROM sales WHERE user_id = ? ORDER BY sale_date DESC',
        [userId]
      );
    } else {
      sales = await db.getAllAsync<any>(
        'SELECT * FROM sales ORDER BY sale_date DESC'
      );
    }

    // Get items for each sale
    const result: SaleWithItems[] = [];
    for (const sale of sales || []) {
      const items = await db.getAllAsync<any>(
        'SELECT * FROM saleitems WHERE sale_id = ?',
        [sale.sale_id]
      );

      result.push({
        ...sale,
        items: (items || []).map((i: any) => ({
          sale_item_id: i.sale_item_id,
          sale_id: i.sale_id,
          part_id: i.part_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.subtotal,
          return_status: i.return_status,
          created_at: i.created_at,
        })),
      });
    }
    return result;
  });

  return salesWithItems;
}

// Get single sale
export async function getSale(saleId: string): Promise<SaleWithItems | null> {
  const db = await ensureDatabaseInitialized();
  const online = await isOnline();

  if (online) {
    try {
      const { data: sale, error } = await supabase
        .from('sales')
        .select('*')
        .eq('sale_id', saleId)
        .single();

      if (error || !sale) return null;

      const { data: items } = await supabase
        .from('saleitems')
        .select('*')
        .eq('sale_id', saleId);

      return {
        ...sale,
        items: items || [],
      };
    } catch (error) {
      console.log('Error fetching sale online:', error);
    }
  }

  // Offline: Read from local
  if (db) {
    const saleResult = await performTransaction(async () => {
      const sale = await db.getFirstAsync<any>(
        `SELECT * FROM sales WHERE sale_id = ?`,
        [saleId]
      );

      if (!sale) return null;

      const itemsResult = await db.getAllAsync<any>(
        `SELECT * FROM saleitems WHERE sale_id = ?`,
        [saleId]
      );
      const items = Array.isArray(itemsResult) ? itemsResult : [];

      return {
        ...sale,
        items: items.map(item => ({
          sale_item_id: item.sale_item_id,
          sale_id: item.sale_id,
          part_id: item.part_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          return_status: item.return_status,
          created_at: item.created_at,
        })),
      };
    });

    if (saleResult) return saleResult;
  }

  return null;
}

// Update sale type (e.g. from pending_debit to debit)
export async function updateSaleType(saleId: string, newType: 'cash' | 'debit' | 'pending_debit'): Promise<void> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      await supabase
        .from('sales')
        .update({ sale_type: newType, synced: true })
        .eq('sale_id', saleId);
    } catch (error) {
      console.log('Error updating sale type online:', error);
    }
  }

  // Always update local
  await performTransaction(async () => {
    if (!db) return;
    await db.runAsync(
      'UPDATE sales SET sale_type = ?, synced = ? WHERE sale_id = ?',
      [newType, online ? 1 : 0, saleId]
    );
  });
}

// Debt Service - Customer debts with offline support
import { supabase } from '../lib/supabase';
import { ensureDatabaseInitialized, performTransaction } from '../lib/database';
import { isOnline } from './syncService';
import uuid from 'react-native-uuid';

export type Debt = {
  debt_id: string;
  sale_id: string | null;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  amount_paid: number;
  balance_remaining: number;
  status: 'unpaid' | 'partial' | 'paid';
  created_at: string;
  updated_at: string;
  synced: boolean;
};

function generateId(): string {
  return uuid.v4() as string;
}

// Create debt
export async function createDebt(debtData: {
  sale_id: string | null;
  customer_name: string;
  customer_phone?: string | null;
  total_amount: number;
  amount_paid?: number;
}): Promise<Debt> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();
  const debtId = generateId();
  const now = new Date().toISOString();

  const amountPaid = debtData.amount_paid || 0;
  const balanceRemaining = debtData.total_amount - amountPaid;
  const status: 'unpaid' | 'partial' | 'paid' =
    balanceRemaining <= 0 ? 'paid' :
      amountPaid > 0 ? 'partial' : 'unpaid';

  const debt: Debt = {
    debt_id: debtId,
    sale_id: debtData.sale_id,
    customer_name: debtData.customer_name,
    customer_phone: debtData.customer_phone || "",
    total_amount: debtData.total_amount,
    amount_paid: amountPaid,
    balance_remaining: balanceRemaining,
    status,
    created_at: now,
    updated_at: now,
    synced: false,
  };

  if (online) {
    try {
      const { data, error } = await supabase
        .from('customerdebts')
        .insert({
          ...debt,
          synced: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Save to local (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync(`
            INSERT INTO customerdebts (
              debt_id, sale_id, customer_name, customer_phone,
              total_amount, amount_paid, balance_remaining, status,
              created_at, updated_at, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `, [
            data.debt_id, data.sale_id, data.customer_name, data.customer_phone,
            data.total_amount, data.amount_paid, data.balance_remaining, data.status,
            data.created_at, data.updated_at,
          ]);
        });
      }

      return data;
    } catch (error) {
      console.log('Error creating debt online:', error);
    }
  }

  // Offline: Save locally (skip if no database on web)
  if (!db) {
    throw new Error('Cannot create debt offline. Please check your internet connection.');
  }

  await performTransaction(async () => {
    await db.runAsync(`
        INSERT INTO customerdebts (
          debt_id, sale_id, customer_name, customer_phone,
          total_amount, amount_paid, balance_remaining, status,
          created_at, updated_at, synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
      debt.debt_id, debt.sale_id, debt.customer_name, debt.customer_phone,
      debt.total_amount, debt.amount_paid, debt.balance_remaining, debt.status,
      debt.created_at, debt.updated_at,
    ]);
  });

  return debt;
}

// Update debt payment
export async function updateDebtPayment(debtId: string, paymentAmount: number): Promise<Debt | null> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();
  const now = new Date().toISOString();

  // Get current debt
  const currentDebt = await getDebt(debtId);
  if (!currentDebt) return null;

  const newAmountPaid = currentDebt.amount_paid + paymentAmount;
  const newBalanceRemaining = Math.max(0, currentDebt.total_amount - newAmountPaid);
  const newStatus: 'unpaid' | 'partial' | 'paid' =
    newBalanceRemaining <= 0 ? 'paid' :
      newAmountPaid > 0 ? 'partial' : 'unpaid';

  if (online) {
    try {
      const { data, error } = await supabase
        .from('customerdebts')
        .update({
          amount_paid: newAmountPaid,
          balance_remaining: newBalanceRemaining,
          status: newStatus,
          updated_at: now,
          synced: true,
        })
        .eq('debt_id', debtId)
        .select()
        .single();

      if (error) throw error;

      // Update local debt (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync(`
            UPDATE customerdebts SET
              amount_paid = ?, balance_remaining = ?, status = ?,
              updated_at = ?, synced = 1
            WHERE debt_id = ?
          `, [newAmountPaid, newBalanceRemaining, newStatus, now, debtId]);

          // SYNC: Update parent Sale record if linked
          if (currentDebt.sale_id) {
            await db.runAsync(`
              UPDATE sales SET 
                amount_paid = amount_paid + ?,
                amount_remaining = MAX(0, amount_remaining - ?)
              WHERE sale_id = ?
            `, [paymentAmount, paymentAmount, currentDebt.sale_id]);
          }
        });
      }

      // SYNC: Update parent Sale online if linked
      if (currentDebt.sale_id) {
        try {
          const { data: sale } = await supabase
            .from('sales')
            .select('amount_paid, total_amount')
            .eq('sale_id', currentDebt.sale_id)
            .single();

          if (sale) {
            const updatedPaid = (sale.amount_paid || 0) + paymentAmount;
            const updatedRemaining = Math.max(0, (sale.total_amount || 0) - updatedPaid);

            await supabase
              .from('sales')
              .update({
                amount_paid: updatedPaid,
                amount_remaining: updatedRemaining,
                synced: true
              })
              .eq('sale_id', currentDebt.sale_id);
          }
        } catch (err) {
          console.log('Error syncing debt payment to sale online:', err);
        }
      }

      return data;
    } catch (error) {
      console.log('Error updating debt online:', error);
      // Fall through to offline if DB exists
      if (!db) throw error;
    }
  }

  // Offline: Update local (skip if no database on web)
  if (!db) {
    throw new Error('Cannot update debt offline on web platform. Please check your internet connection.');
  }

  await performTransaction(async () => {
    await db.runAsync(`
        UPDATE customerdebts SET
          amount_paid = ?, balance_remaining = ?, status = ?,
          updated_at = ?, synced = 0
        WHERE debt_id = ?
      `, [newAmountPaid, newBalanceRemaining, newStatus, now, debtId]);

    // SYNC: Update parent Sale record locally
    if (currentDebt.sale_id) {
      await db.runAsync(`
        UPDATE sales SET 
          amount_paid = amount_paid + ?,
          amount_remaining = MAX(0, amount_remaining - ?)
        WHERE sale_id = ?
      `, [paymentAmount, paymentAmount, currentDebt.sale_id]);
    }
  });

  return {
    ...currentDebt,
    amount_paid: newAmountPaid,
    balance_remaining: newBalanceRemaining,
    status: newStatus,
    updated_at: now,
  };
}

// Reduce debt balance (e.g. from returns)
export async function reduceDebtBalance(saleId: string, amountToReduce: number): Promise<void> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();
  const now = new Date().toISOString();

  // Find debt for this sale
  if (online) {
    try {
      const { data: debt, error } = await supabase
        .from('customerdebts')
        .select('*')
        .eq('sale_id', saleId)
        .single();

      if (debt) {
        const newTotal = Math.max(0, (debt.total_amount || 0) - amountToReduce);
        const newBalance = Math.max(0, (debt.balance_remaining || 0) - amountToReduce);
        const newStatus: 'unpaid' | 'partial' | 'paid' =
          newBalance <= 0 ? 'paid' :
            (debt.amount_paid || 0) > 0 ? 'partial' : 'unpaid';

        await supabase
          .from('customerdebts')
          .update({
            total_amount: newTotal,
            balance_remaining: newBalance,
            status: newStatus,
            updated_at: now,
            synced: true
          })
          .eq('debt_id', debt.debt_id);
      }
    } catch (error) {
      console.log('Error reducing debt online:', error);
    }
  }

  // Always check local
  if (db) {
    await performTransaction(async () => {
      const debt = await db.getFirstAsync<any>(
        'SELECT * FROM customerdebts WHERE sale_id = ?',
        [saleId]
      );

      if (debt) {
        const newTotal = Math.max(0, (debt.total_amount || 0) - amountToReduce);
        const newBalance = Math.max(0, (debt.balance_remaining || 0) - amountToReduce);
        const newStatus = newBalance <= 0 ? 'paid' :
          (debt.amount_paid || 0) > 0 ? 'partial' : 'unpaid';

        await db.runAsync(`
          UPDATE customerdebts SET
            total_amount = ?, balance_remaining = ?, status = ?,
            updated_at = ?, synced = ?
          WHERE debt_id = ?
        `, [newTotal, newBalance, newStatus, now, online ? 1 : 0, debt.debt_id]);

        // Also update parent Sale record locally to stay in sync
        await db.runAsync(`
          UPDATE sales SET 
            total_amount = MAX(0, total_amount - ?),
            amount_remaining = MAX(0, amount_remaining - ?)
          WHERE sale_id = ?
        `, [amountToReduce, amountToReduce, saleId]);
      }
    });

    // SYNC: Update parent Sale online if linked and we are online
    if (online) {
      try {
        const { data: sale } = await supabase
          .from('sales')
          .select('total_amount, amount_remaining')
          .eq('sale_id', saleId)
          .single();

        if (sale) {
          const updatedTotal = Math.max(0, (sale.total_amount || 0) - amountToReduce);
          const updatedRemaining = Math.max(0, (sale.amount_remaining || 0) - amountToReduce);

          await supabase
            .from('sales')
            .update({
              total_amount: updatedTotal,
              amount_remaining: updatedRemaining,
              synced: true
            })
            .eq('sale_id', saleId);
        }
      } catch (err) {
        console.log('Error syncing debt reduction to sale online:', err);
      }
    }
  }
}

// Get all debts
export async function getAllDebts(userId?: string | null, isAdmin: boolean = false): Promise<Debt[]> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      let query = supabase
        .from('customerdebts')
        .select('*')
        .order('created_at', { ascending: false });

      // If staff, filter by their sales
      if (!isAdmin && userId) {
        // Get sales by this user first
        const { data: userSales } = await supabase
          .from('sales')
          .select('sale_id')
          .eq('user_id', userId);

        if (userSales && userSales.length > 0) {
          const saleIds = userSales.map(s => s.sale_id);
          query = query.in('sale_id', saleIds);
        } else {
          // If no sales online, we skip online debt fetch as they shouldn't have any
          if (!db) return [];
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Cache in local DB (skip if no database on web)
      if (db) {
        const localDB = db;
        await performTransaction(async () => {
          for (const debt of data || []) {
            await localDB.runAsync(`
              INSERT OR REPLACE INTO customerdebts (
                debt_id, sale_id, customer_name, customer_phone,
                total_amount, amount_paid, balance_remaining, status,
                created_at, updated_at, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              debt.debt_id, debt.sale_id, debt.customer_name, debt.customer_phone,
              debt.total_amount, debt.amount_paid, debt.balance_remaining, debt.status,
              debt.created_at, debt.updated_at,
            ]);
          }
        });
      }

      // On web (no db), return the online data directly
      if (!db) {
        return (data || []).map(d => ({
          debt_id: d.debt_id,
          sale_id: d.sale_id,
          customer_name: d.customer_name,
          customer_phone: d.customer_phone,
          total_amount: d.total_amount,
          amount_paid: d.amount_paid,
          balance_remaining: d.balance_remaining,
          status: d.status,
          created_at: d.created_at,
          updated_at: d.updated_at,
          synced: true,
        }));
      }
    } catch (error) {
      console.log('Error fetching debts online:', error);
      // Fall through to local query if DB exists
      if (!db) return [];
    }
  }

  // Offline: Read from local (skip if no database on web)
  if (!db) return [];

  let results: any[] = [];
  await performTransaction(async () => {
    if (!isAdmin && userId) {
      const userSales = await db.getAllAsync<{ sale_id: string }>(
        'SELECT sale_id FROM sales WHERE user_id = ?',
        [userId]
      );
      const saleIds = userSales.map(s => s.sale_id);

      if (saleIds.length === 0) {
        results = [];
        return;
      }

      // Build placeholders
      const placeholders = saleIds.map(() => '?').join(',');
      results = await db.getAllAsync<any>(
        `SELECT * FROM customerdebts WHERE sale_id IN (${placeholders}) ORDER BY created_at DESC`,
        saleIds
      );
    } else {
      results = await db.getAllAsync<any>(
        'SELECT * FROM customerdebts ORDER BY created_at DESC'
      );
    }
  });

  return (results || []).map(d => ({
    debt_id: d.debt_id,
    sale_id: d.sale_id,
    customer_name: d.customer_name,
    customer_phone: d.customer_phone,
    total_amount: d.total_amount,
    amount_paid: d.amount_paid,
    balance_remaining: d.balance_remaining,
    status: d.status,
    created_at: d.created_at,
    updated_at: d.updated_at,
    synced: d.synced === 1,
  }));
}

// Get single debt
export async function getDebt(debtId: string): Promise<Debt | null> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('customerdebts')
        .select('*')
        .eq('debt_id', debtId)
        .single();

      if (!error && data) {
        // Cache locally (skip if no database on web)
        if (db) {
          await performTransaction(async () => {
            await db.runAsync(`
              INSERT OR REPLACE INTO customerdebts (
                debt_id, sale_id, customer_name, customer_phone,
                total_amount, amount_paid, balance_remaining, status,
                created_at, updated_at, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              data.debt_id, data.sale_id, data.customer_name, data.customer_phone,
              data.total_amount, data.amount_paid, data.balance_remaining, data.status,
              data.created_at, data.updated_at,
            ]);
          });
        }
        return { ...data, synced: true };
      }
    } catch (error) {
      console.log('Error fetching debt online:', error);
      // Fall through to local query if DB exists
      if (!db) return null;
    }
  }

  // Offline: Read from local (skip if no database on web)
  if (!db) return null;

  const debt = await performTransaction(async () => {
    return await db.getFirstAsync<any>(
      'SELECT * FROM customerdebts WHERE debt_id = ?',
      [debtId]
    );
  });

  if (debt) {
    return {
      debt_id: debt.debt_id,
      sale_id: debt.sale_id,
      customer_name: debt.customer_name,
      customer_phone: debt.customer_phone,
      total_amount: debt.total_amount,
      amount_paid: debt.amount_paid,
      balance_remaining: debt.balance_remaining,
      status: debt.status,
      created_at: debt.created_at,
      updated_at: debt.updated_at,
      synced: debt.synced === 1,
    };
  }

  return null;
}

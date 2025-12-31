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
  customer_phone: string;
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
    customer_phone: debtData.customer_phone,
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

      // Save to local
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

      return data;
    } catch (error) {
      console.log('Error creating debt online:', error);
    }
  }

  // Offline: Save locally
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

      // Update local
      await performTransaction(async () => {
        await db.runAsync(`
          UPDATE customerdebts SET
            amount_paid = ?, balance_remaining = ?, status = ?,
            updated_at = ?, synced = 1
          WHERE debt_id = ?
        `, [newAmountPaid, newBalanceRemaining, newStatus, now, debtId]);
      });

      return data;
    } catch (error) {
      console.log('Error updating debt online:', error);
    }
  }

  // Offline: Update local
  await performTransaction(async () => {
    await db.runAsync(`
        UPDATE customerdebts SET
          amount_paid = ?, balance_remaining = ?, status = ?,
          updated_at = ?, synced = 0
        WHERE debt_id = ?
      `, [newAmountPaid, newBalanceRemaining, newStatus, now, debtId]);
  });

  return {
    ...currentDebt,
    amount_paid: newAmountPaid,
    balance_remaining: newBalanceRemaining,
    status: newStatus,
    updated_at: now,
  };
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
          // If no sales online, we still check local
        }
      }

      const { data, error } = await query;

      if (!error && data) {
        // Cache in local DB
        await performTransaction(async () => {
          for (const debt of data) {
            await db.runAsync(`
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
    } catch (error) {
      console.log('Error fetching debts online:', error);
      // Fall through to local query
    }
  }

  // Always return from local DB to include unsynced debts
  let results: any[] = [];
  await performTransaction(async () => {
    if (!isAdmin && userId) {
      // Get sale IDs for this user
      if (!db) return;

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
      if (!db) return;
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
        // Cache locally
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
        return data;
      }
    } catch (error) {
      console.log('Error fetching debt online:', error);
    }
  }

  // Offline: Read from local
  const debt = await performTransaction(async () => {
    if (db) {
      return await db.getFirstAsync<any>(
        'SELECT * FROM customerdebts WHERE debt_id = ?',
        [debtId]
      );
    }
    return null;
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

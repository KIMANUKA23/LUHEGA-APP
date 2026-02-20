// Returns Service - Returns with offline support
import { supabase } from '../lib/supabase';
import { ensureDatabaseInitialized, performTransaction } from '../lib/database';
import { isOnline } from './syncService';
import * as inventoryService from './inventoryService';
import * as notificationService from './notificationService';
import * as debtService from './debtService';
import uuid from 'react-native-uuid';

export type ReturnRequest = {
  return_id: string;
  sale_item_id: string | null;
  sale_id: string | null;
  user_id: string | null;
  product_id: string;
  product_name: string;
  quantity: number;
  reason: string;
  condition: 'good' | 'damaged' | 'suspected';
  status: 'pending' | 'approved' | 'rejected';
  date_returned: string;
  notes: string | null;
  synced: boolean;
};

// Create return request
export async function createReturn(returnData: {
  sale_item_id: string | null;
  sale_id: string | null;
  user_id: string | null;
  product_id: string;
  product_name: string;
  quantity: number;
  reason: string;
  condition: 'good' | 'damaged' | 'suspected';
  notes?: string | null;
}): Promise<ReturnRequest> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();
  const now = new Date().toISOString();

  if (online) {
    try {
      // Let Supabase generate the UUID
      const { data, error } = await supabase
        .from('returns')
        .insert({
          sale_item_id: returnData.sale_item_id,
          sale_id: returnData.sale_id,
          user_id: returnData.user_id,
          product_id: returnData.product_id,
          product_name: returnData.product_name,
          quantity: returnData.quantity,
          reason: returnData.reason,
          condition: returnData.condition,
          status: 'pending',
          date_returned: now,
          notes: returnData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Cache in local (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync(`
            INSERT INTO returns (
              return_id, sale_item_id, sale_id, user_id, product_id, product_name,
              quantity, reason, condition, status, date_returned, notes, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `, [
            data.return_id, data.sale_item_id, data.sale_id, data.user_id,
            data.product_id, data.product_name, data.quantity, data.reason,
            data.condition, data.status, data.date_returned, data.notes,
          ]);
        });
      }

      // Create notification for admins about new return request
      await notificationService.createNotification({
        type: 'return_request',
        message: `🔄 New Return Request\n${returnData.product_name}\nQty: ${returnData.quantity} | Reason: ${returnData.reason}\nCondition: ${returnData.condition}`,
      });

      // Update sale item status to prevent double returns (Non-blocking)
      if (returnData.sale_item_id) {
        try {
          console.log('DEBUG: Updating return_status for sale_item_id:', returnData.sale_item_id);

          const { error: updateError } = await supabase
            .from('saleitems')
            .update({ return_status: 'full' })
            .eq('sale_item_id', returnData.sale_item_id);

          if (updateError) {
            console.log('DEBUG: Supabase update error:', updateError);
          } else {
            console.log('DEBUG: Supabase update successful');
          }

          if (db) {
            await performTransaction(async () => {
              await db.runAsync(`
                UPDATE saleitems SET return_status = 'full' WHERE sale_item_id = ?
              `, [returnData.sale_item_id]);
            });
          }

          console.log('DEBUG: Local DB update completed');
        } catch (updateErr) {
          console.log('DEBUG: Failed to update saleitem status:', updateErr);
        }
      }

      return { ...data, synced: true };
    } catch (error) {
      console.log('Error creating return online:', error);
      throw error; // Re-throw to show error to user
    }
  }

  // Offline: Save locally with generated UUID
  const returnId = uuid.v4() as string;
  const returnReq: ReturnRequest = {
    return_id: returnId,
    sale_item_id: returnData.sale_item_id,
    sale_id: returnData.sale_id,
    user_id: returnData.user_id,
    product_id: returnData.product_id,
    product_name: returnData.product_name,
    quantity: returnData.quantity,
    reason: returnData.reason,
    condition: returnData.condition,
    status: 'pending',
    date_returned: now,
    notes: returnData.notes || null,
    synced: false,
  };

  // Offline: Save locally (skip if no database on web)
  if (!db) {
    // If online save already finished, it's fine. 
    // But createReturn on web should probably return the online result early.
    // Wait, the online block already returns data and synced: true.
    // This part only runs if online failed or skip.
    throw new Error('Cannot create return offline on web platform');
  }

  await performTransaction(async () => {
    await db.runAsync(`
      INSERT INTO returns (
        return_id, sale_item_id, sale_id, user_id, product_id, product_name,
        quantity, reason, condition, status, date_returned, notes, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      returnReq.return_id, returnReq.sale_item_id, returnReq.sale_id, returnReq.user_id,
      returnReq.product_id, returnReq.product_name, returnReq.quantity, returnReq.reason,
      returnReq.condition, returnReq.status, returnReq.date_returned, returnReq.notes,
    ]);
  });

  // Create notification for admins about new return request (Offline capable)
  await notificationService.createNotification({
    type: 'return_request',
    message: `🔄 New Return Request\n${returnData.product_name}\nQty: ${returnData.quantity} | Reason: ${returnData.reason}\nCondition: ${returnData.condition}`,
  });

  // Update sale item status locally (Non-blocking)
  if (returnReq.sale_item_id) {
    try {
      await performTransaction(async () => {
        if (!db) return;
        await db.runAsync(`
          UPDATE saleitems SET return_status = 'full' WHERE sale_item_id = ?
        `, [returnReq.sale_item_id]);
      });
    } catch (err) {
      console.log('DEBUG: Failed to update local saleitem status:', err);
    }
  }

  return returnReq;
}

// Approve return (Admin only)
export async function approveReturn(returnId: string): Promise<boolean> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  // Get return
  const returnReq = await getReturn(returnId);
  if (!returnReq || returnReq.status !== 'pending') return false;

  if (online) {
    try {
      // Update return status
      const { error: updateError } = await supabase
        .from('returns')
        .update({ status: 'approved', synced: true })
        .eq('return_id', returnId);

      if (updateError) throw updateError;

      // If condition is 'good', increase stock LOCALLY (server handles remote via trigger)
      if (returnReq.condition === 'good') {
        await inventoryService.updateStockLocal(returnReq.product_id, returnReq.quantity);
      }

      // NEW: Reduce debt balance if sale is linked
      if (returnReq.sale_id) {
        try {
          // Calculate reduction amount (quantity * price from sale item if possible, or just default to 0)
          // For now, we'll need to fetch the sale item to get the price
          const { data: saleItem } = await supabase
            .from('saleitems')
            .select('unit_price')
            .eq('sale_item_id', returnReq.sale_item_id)
            .single();

          if (saleItem) {
            const reductionAmount = returnReq.quantity * saleItem.unit_price;
            await debtService.reduceDebtBalance(returnReq.sale_id, reductionAmount);
          }
        } catch (err) {
          console.log('Error reducing debt on return approval:', err);
        }
      }

      // Update local status if database exists (web handles online only)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync(`
            UPDATE returns SET status = 'approved', synced = 1 WHERE return_id = ?
          `, [returnId]);
        });
      }

      // Notify staff member about approval
      if (returnReq.user_id) {
        await notificationService.createNotification({
          type: 'return_approved',
          message: `✅ Return Approved\n${returnReq.product_name} (${returnReq.quantity}x)\n${returnReq.condition === 'good' ? 'Stock has been updated' : 'Marked as ' + returnReq.condition}`,
          user_id: returnReq.user_id,
        });
      }

      return true;
    } catch (error) {
      console.log('Error approving return online:', error);
      // Fall through to offline if DB exists, otherwise fail
      if (!db) throw error;
    }
  }

  // Offline: Update local (skip if no database on web)
  if (!db) {
    throw new Error('Cannot approve return offline on web platform. Please check your internet connection.');
  }

  await performTransaction(async () => {
    await db.runAsync(`
      UPDATE returns SET status = 'approved', synced = 0 WHERE return_id = ?
    `, [returnId]);

    // Update stock locally
    if (returnReq.condition === 'good') {
      await inventoryService.updateStockLocal(returnReq.product_id, returnReq.quantity);
    }

    // NEW: Reduce debt balance locally if sale is linked
    if (returnReq.sale_id && db) {
      try {
        const saleItem = await db.getFirstAsync<any>(
          'SELECT unit_price FROM saleitems WHERE sale_item_id = ?',
          [returnReq.sale_item_id]
        );
        if (saleItem) {
          const reductionAmount = returnReq.quantity * saleItem.unit_price;
          await debtService.reduceDebtBalance(returnReq.sale_id, reductionAmount);
        }
      } catch (err) {
        console.log('Error reducing debt locally on return approval:', err);
      }
    }
  });

  // Notify staff member about approval
  if (returnReq.user_id) {
    await notificationService.createNotification({
      type: 'return_approved',
      message: `✅ Return Approved\n${returnReq.product_name} (${returnReq.quantity}x)\n${returnReq.condition === 'good' ? 'Stock has been updated' : 'Marked as ' + returnReq.condition}`,
      user_id: returnReq.user_id,
    });
  }

  return true;
}

// Reject return (Admin only)
export async function rejectReturn(returnId: string): Promise<boolean> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      const { error } = await supabase
        .from('returns')
        .update({ status: 'rejected', synced: true })
        .eq('return_id', returnId);

      if (error) throw error;

      if (db) {
        await performTransaction(async () => {
          await db.runAsync(`
            UPDATE returns SET status = 'rejected', synced = 1 WHERE return_id = ?
          `, [returnId]);
        });
      }

      // Notify staff member about rejection
      const returnReq = await getReturn(returnId);
      if (returnReq?.user_id) {
        await notificationService.createNotification({
          type: 'return_rejected',
          message: `❌ Return Rejected\n${returnReq.product_name} (${returnReq.quantity}x)\nPlease contact admin for details`,
          user_id: returnReq.user_id,
        });
      }

      return true;
    } catch (error) {
      console.log('Error rejecting return online:', error);
      // Fall through to offline if DB exists
      if (!db) throw error;
    }
  }

  // Offline/Local: Skip if no database on web
  if (!db) {
    throw new Error('Cannot reject return offline on web platform. Please check your internet connection.');
  }

  await performTransaction(async () => {
    await db.runAsync(`
      UPDATE returns SET status = 'rejected', synced = 0 WHERE return_id = ?
    `, [returnId]);
  });

  // Notify staff member about rejection
  const returnReq = await getReturn(returnId);
  if (returnReq?.user_id) {
    await notificationService.createNotification({
      type: 'return_rejected',
      message: `❌ Return Rejected\n${returnReq.product_name} (${returnReq.quantity}x)\nPlease contact admin for details`,
      user_id: returnReq.user_id,
    });
  }

  return true;
}

// Get all returns
export async function getAllReturns(userId?: string | null, isAdmin: boolean = false): Promise<ReturnRequest[]> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      let query = supabase
        .from('returns')
        .select('*')
        .order('date_returned', { ascending: false });

      // Staff sees only their returns
      if (!isAdmin && userId) {
        query = query.eq('user_id', userId);
      }

      console.log('📦 [Returns] Fetching from Supabase...');
      const { data, error } = await query;
      console.log(`📦 [Returns] Supabase returned ${data?.length || 0} items`);

      if (error) throw error;

      // Cache in local (skip if no database on web)
      if (db) {
        for (const returnReq of data || []) {
          await performTransaction(async () => {
            await db.runAsync(`
              INSERT OR REPLACE INTO returns (
                return_id, sale_item_id, sale_id, user_id, product_id, product_name,
                quantity, reason, condition, status, date_returned, notes, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              returnReq.return_id, returnReq.sale_item_id, returnReq.sale_id, returnReq.user_id,
              returnReq.product_id, returnReq.product_name, returnReq.quantity, returnReq.reason,
              returnReq.condition, returnReq.status, returnReq.date_returned, returnReq.notes,
            ]);
          });
        }
      }

      // On web (no db), return the online data directly
      if (!db) {
        return (data || []).map(r => ({
          return_id: r.return_id,
          sale_item_id: r.sale_item_id,
          sale_id: r.sale_id,
          user_id: r.user_id,
          product_id: r.product_id,
          product_name: r.product_name,
          quantity: r.quantity,
          reason: r.reason,
          condition: r.condition,
          status: r.status,
          date_returned: r.date_returned,
          notes: r.notes,
          synced: true,
        }));
      }
    } catch (error) {
      console.log('Error fetching returns online:', error);
      // Fall through to local query if DB exists
      if (!db) return [];
    }
  }

  // Always return from local DB to include unsynced returns
  const results = await performTransaction(async () => {
    if (!isAdmin && userId) {
      if (!db) return [];
      return await db.getAllAsync<any>(
        'SELECT * FROM returns WHERE user_id = ? ORDER BY date_returned DESC',
        [userId]
      );
    } else {
      if (!db) return [];
      return await db.getAllAsync<any>(
        'SELECT * FROM returns ORDER BY date_returned DESC'
      );
    }
  });

  return (results || []).map(r => ({
    return_id: r.return_id,
    sale_item_id: r.sale_item_id,
    sale_id: r.sale_id,
    user_id: r.user_id,
    product_id: r.product_id,
    product_name: r.product_name,
    quantity: r.quantity,
    reason: r.reason,
    condition: r.condition,
    status: r.status,
    date_returned: r.date_returned,
    notes: r.notes,
    synced: r.synced === 1,
  }));
}

// Get single return
export async function getReturn(returnId: string): Promise<ReturnRequest | null> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select('*')
        .eq('return_id', returnId)
        .single();

      if (!error && data) {
        // Cache locally (skip if no database on web)
        if (db) {
          await performTransaction(async () => {
            await db.runAsync(`
              INSERT OR REPLACE INTO returns (
                return_id, sale_item_id, sale_id, user_id, product_id, product_name,
                quantity, reason, condition, status, date_returned, notes, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              data.return_id, data.sale_item_id, data.sale_id, data.user_id,
              data.product_id, data.product_name, data.quantity, data.reason,
              data.condition, data.status, data.date_returned, data.notes,
            ]);
          });
        }
        return { ...data, synced: true };
      }
    } catch (error) {
      console.log('Error fetching return online:', error);
      // Fall through to local query if DB exists
      if (!db) return null;
    }
  }

  // Offline: Read from local
  const returnReq = await performTransaction(async () => {
    if (!db) return null;
    return await db.getFirstAsync<any>(
      'SELECT * FROM returns WHERE return_id = ?',
      [returnId]
    );
  });

  if (returnReq) {
    return {
      return_id: returnReq.return_id,
      sale_item_id: returnReq.sale_item_id,
      sale_id: returnReq.sale_id,
      user_id: returnReq.user_id,
      product_id: returnReq.product_id,
      product_name: returnReq.product_name,
      quantity: returnReq.quantity,
      reason: returnReq.reason,
      condition: returnReq.condition,
      status: returnReq.status,
      date_returned: returnReq.date_returned,
      notes: returnReq.notes,
      synced: returnReq.synced === 1,
    };
  }

  return null;
}


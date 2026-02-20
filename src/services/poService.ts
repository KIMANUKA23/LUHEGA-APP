// Purchase Order Service with offline support
import { supabase } from '../lib/supabase';
import { getOfflineDB, performTransaction } from '../lib/database';
import { isOnline } from './syncService';
import { updateStock } from './inventoryService';
import uuid from 'react-native-uuid';

export type PurchaseOrder = {
  po_id: string;
  supplier_id: string | null;
  created_by: string | null;
  status: 'pending' | 'approved' | 'delivered' | 'cancelled';
  total_cost: number;
  date_created: string;
  expected_date: string | null;
  synced: boolean;
};

export type POItem = {
  po_item_id: string;
  po_id: string;
  part_id: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  created_at: string;
};

export type POWithItems = PurchaseOrder & {
  items: POItem[];
};

function generateId(): string {
  return uuid.v4();
}

// Create purchase order
export async function createPurchaseOrder(poData: {
  supplier_id: string | null;
  created_by: string | null;
  items: Array<{
    part_id: string;
    quantity: number;
    unit_cost: number;
  }>;
  expected_date?: string | null;
}): Promise<POWithItems> {
  const online = await isOnline();
  const db = getOfflineDB();
  const poId = generateId();
  const now = new Date().toISOString();

  const totalCost = poData.items.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);

  const po: PurchaseOrder = {
    po_id: poId,
    supplier_id: poData.supplier_id,
    created_by: poData.created_by,
    status: 'pending',
    total_cost: totalCost,
    date_created: now,
    expected_date: poData.expected_date || null,
    synced: false,
  };

  const poItems: POItem[] = poData.items.map((item, index) => ({
    po_item_id: uuid.v4(),
    po_id: poId,
    part_id: item.part_id,
    quantity: item.quantity,
    unit_cost: item.unit_cost,
    subtotal: item.unit_cost * item.quantity,
    created_at: now,
  }));

  if (online) {
    try {
      const { data: poRecord, error: poError } = await supabase
        .from('purchaseorders')
        .insert({
          ...po,
          synced: true,
        })
        .select()
        .single();

      if (poError) throw poError;

      const { error: itemsError } = await supabase
        .from('purchaseitems')
        .insert(poItems.map(item => ({
          po_item_id: item.po_item_id,
          po_id: item.po_id,
          part_id: item.part_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          subtotal: item.subtotal,
        })));

      if (itemsError) throw itemsError;

      // Save to local (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync(`
            INSERT INTO purchaseorders (
              po_id, supplier_id, created_by, status, total_cost, date_created, expected_date, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
          `, [
            poRecord.po_id, poRecord.supplier_id, poRecord.created_by, poRecord.status,
            poRecord.total_cost, poRecord.date_created, poRecord.expected_date,
          ]);

          for (const item of poItems) {
            await db.runAsync(`
              INSERT INTO purchaseitems (
                po_item_id, po_id, part_id, quantity, unit_cost, subtotal, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              item.po_item_id, item.po_id, item.part_id, item.quantity,
              item.unit_cost, item.subtotal, item.created_at,
            ]);
          }
        });
      }

      return { ...poRecord, items: poItems, synced: true };
    } catch (error) {
      console.log('Error creating PO online:', error);
    }
  }

  // Offline: Save locally
  if (db) {
    await performTransaction(async () => {
      await db.runAsync(`
        INSERT INTO purchaseorders (
          po_id, supplier_id, created_by, status, total_cost, date_created, expected_date, synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        po.po_id, po.supplier_id, po.created_by, po.status,
        po.total_cost, po.date_created, po.expected_date,
      ]);

      for (const item of poItems) {
        await db.runAsync(`
          INSERT INTO purchaseitems (
            po_item_id, po_id, part_id, quantity, unit_cost, subtotal, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          item.po_item_id, item.po_id, item.part_id, item.quantity,
          item.unit_cost, item.subtotal, item.created_at,
        ]);
      }
    });
  }

  return { ...po, items: poItems };
}

// Deliver purchase order (Admin only - increases stock)
export async function deliverPurchaseOrder(poId: string): Promise<boolean> {
  const online = await isOnline();
  const db = getOfflineDB();

  const po = await getPurchaseOrder(poId);
  if (!po || (po.status !== 'pending' && po.status !== 'approved')) return false;

  if (online) {
    try {
      // Update PO status
      const { error: updateError } = await supabase
        .from('purchaseorders')
        .update({ status: 'delivered', synced: true })
        .eq('po_id', poId);

      if (updateError) throw updateError;

      // Increase stock for each item
      for (const item of po.items) {
        await updateStock(item.part_id, item.quantity);
      }

      // Update local (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync(`
            UPDATE purchaseorders SET status = 'delivered', synced = 1 WHERE po_id = ?
          `, [poId]);

          // Update stock locally
          for (const item of po.items) {
            await updateStock(item.part_id, item.quantity);
          }
        });
      }

      return true;
    } catch (error) {
      console.log('Error delivering PO online:', error);
      return false;
    }
  }

  // Offline: Update local
  if (db) {
    await performTransaction(async () => {
      await db.runAsync(`
        UPDATE purchaseorders SET status = 'delivered', synced = 0 WHERE po_id = ?
      `, [poId]);

      // Update stock locally (will sync later)
      for (const item of po.items) {
        await updateStock(item.part_id, item.quantity);
      }
    });
  }

  return true;
}

// Approve purchase order (Admin only)
export async function approvePurchaseOrder(poId: string): Promise<boolean> {
  const online = await isOnline();
  const db = getOfflineDB();

  const po = await getPurchaseOrder(poId);
  if (!po || po.status !== 'pending') return false;

  if (online) {
    try {
      const { error } = await supabase
        .from('purchaseorders')
        .update({ status: 'approved', synced: true })
        .eq('po_id', poId);

      if (error) throw error;

      if (db) {
        await performTransaction(async () => {
          await db.runAsync(`
            UPDATE purchaseorders SET status = 'approved', synced = 1 WHERE po_id = ?
          `, [poId]);
        });
      }

      return true;
    } catch (error) {
      console.log('Error approving PO online:', error);
      return false;
    }
  }

  // Offline
  if (db) {
    await performTransaction(async () => {
      await db.runAsync(`
        UPDATE purchaseorders SET status = 'approved', synced = 0 WHERE po_id = ?
      `, [poId]);
    });
  }

  return true;
}

// Get all purchase orders
export async function getAllPurchaseOrders(): Promise<POWithItems[]> {
  const online = await isOnline();
  const db = getOfflineDB();

  if (online) {
    try {
      const { data: pos, error } = await supabase
        .from('purchaseorders')
        .select('*')
        .order('date_created', { ascending: false });

      if (error) throw error;

      const posWithItems: POWithItems[] = [];
      for (const po of pos || []) {
        const { data: items } = await supabase
          .from('purchaseitems')
          .select('*')
          .eq('po_id', po.po_id);

        posWithItems.push({
          ...po,
          items: items || [],
        });
      }

      return posWithItems;
    } catch (error) {
      console.log('Error fetching POs online:', error);
    }
  }

  // Offline: Read from local
  if (db) {
    return await performTransaction(async () => {
      const pos = await db.getAllAsync<any>(
        'SELECT * FROM purchaseorders ORDER BY date_created DESC'
      );

      const posWithItems: POWithItems[] = [];
      for (const po of pos) {
        const items = await db.getAllAsync<any>(
          'SELECT * FROM purchaseitems WHERE po_id = ?',
          [po.po_id]
        );

        posWithItems.push({
          ...po,
          items: items.map(item => ({
            po_item_id: item.po_item_id,
            po_id: item.po_id,
            part_id: item.part_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
            subtotal: item.subtotal,
            created_at: item.created_at,
          })),
        });
      }

      return posWithItems;
    });
  }

  return [];
}

// Get single purchase order
export async function getPurchaseOrder(poId: string): Promise<POWithItems | null> {
  const online = await isOnline();
  const db = getOfflineDB();

  if (online) {
    try {
      const { data: po, error } = await supabase
        .from('purchaseorders')
        .select('*')
        .eq('po_id', poId)
        .single();

      if (error || !po) return null;

      const { data: items } = await supabase
        .from('purchaseitems')
        .select('*')
        .eq('po_id', poId);

      return {
        ...po,
        items: items || [],
      };
    } catch (error) {
      console.log('Error fetching PO online:', error);
    }
  }

  // Offline: Read from local
  if (db) {
    return await performTransaction(async () => {
      const po = await db.getFirstAsync<any>(
        'SELECT * FROM purchaseorders WHERE po_id = ?',
        [poId]
      );

      if (!po) return null;

      const items = await db.getAllAsync<any>(
        'SELECT * FROM purchaseitems WHERE po_id = ?',
        [poId]
      );

      return {
        ...po,
        items: items.map(item => ({
          po_item_id: item.po_item_id,
          po_id: item.po_id,
          part_id: item.part_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          subtotal: item.subtotal,
          created_at: item.created_at,
        })),
      };
    });
  }

  return null;
}


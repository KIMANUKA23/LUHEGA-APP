// Inventory Audit Service
import { supabase } from '../lib/supabase';
import { getOfflineDB, ensureDatabaseInitialized, performTransaction } from '../lib/database';
import { isOnline } from './syncService';
import uuid from 'react-native-uuid';
import { updateStock } from './inventoryService';

export type InventoryAudit = {
  audit_id: string;
  performed_by: string | null;
  part_id: string | null;
  physical_count: number;
  system_count: number;
  adjustment: number;
  reason: string | null;
  audit_date: string;
  status: 'in_progress' | 'completed';
  synced: boolean;
};

// Create inventory audit
export async function createInventoryAudit(auditData: {
  part_id: string;
  physical_count: number;
  system_count: number;
  reason?: string | null;
  performed_by: string | null;
}): Promise<InventoryAudit> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  const auditId = uuid.v4() as string;
  const now = new Date().toISOString();

  const adjustment = auditData.physical_count - auditData.system_count;

  const audit: InventoryAudit = {
    audit_id: auditId,
    performed_by: auditData.performed_by,
    part_id: auditData.part_id,
    physical_count: auditData.physical_count,
    system_count: auditData.system_count,
    adjustment,
    reason: auditData.reason || null,
    audit_date: now,
    status: 'in_progress',
    synced: false,
  };

  if (online) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please log in to create audits.');
      }

      const { data, error } = await supabase
        .from('inventoryaudit')
        .insert({
          ...audit,
          synced: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Save to local
      await performTransaction(async () => {
        await db.runAsync(`
          INSERT INTO inventoryaudit (
            audit_id, performed_by, part_id, physical_count, system_count,
            adjustment, reason, audit_date, status, synced
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
          data.audit_id, data.performed_by, data.part_id,
          data.physical_count, data.system_count, data.adjustment,
          data.reason, data.audit_date, data.status,
        ]);
      });

      return data;
    } catch (error) {
      console.log('Error creating audit online:', error);
      // Fall through to offline save
    }
  }

  // Offline: Save locally
  await performTransaction(async () => {
    await db.runAsync(`
      INSERT INTO inventoryaudit (
        audit_id, performed_by, part_id, physical_count, system_count,
        adjustment, reason, audit_date, status, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      audit.audit_id, audit.performed_by, audit.part_id,
      audit.physical_count, audit.system_count, audit.adjustment,
      audit.reason, audit.audit_date, audit.status,
    ]);
  });

  return audit;
}

// Complete audit (finalize and apply stock adjustments)
export async function completeAudit(auditId: string): Promise<boolean> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      // Update status to completed in Supabase
      const { error } = await supabase
        .from('inventoryaudit')
        .update({ status: 'completed' })
        .eq('audit_id', auditId);

      if (error) throw error;

      // Get audit details to apply stock adjustments
      const { data: audit } = await supabase
        .from('inventoryaudit')
        .select('*')
        .eq('audit_id', auditId)
        .single();

      if (audit && audit.adjustment !== 0) {
        try {
          await updateStock(audit.part_id!, audit.adjustment);
        } catch (stockError) {
          console.log('Error updating stock from audit:', stockError);
        }
      }

      // Update local status
      await performTransaction(async () => {
        await db.runAsync(`
          UPDATE inventoryaudit SET status = 'completed', synced = 1 WHERE audit_id = ?
        `, [auditId]);
      });

      return true;
    } catch (error) {
      console.log('Error completing audit online:', error);
      // Fall through to offline
    }
  }

  // Offline: Update local status and queue for sync
  const audit = await performTransaction(async () => {
    await db.runAsync(`
      UPDATE inventoryaudit SET status = 'completed', synced = 0 WHERE audit_id = ?
    `, [auditId]);

    // Get audit details for stock adjustment
    return await db.getFirstAsync<any>(
      'SELECT * FROM inventoryaudit WHERE audit_id = ?',
      [auditId]
    );
  });

  if (audit && audit.adjustment !== 0) {
    try {
      await updateStock(audit.part_id, audit.adjustment);
    } catch (stockError) {
      console.log('Error updating stock from audit offline:', stockError);
    }
  }

  return true;
}

// Get all audits
export async function getAllAudits(userId?: string | null, isAdmin: boolean = false): Promise<InventoryAudit[]> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      let query = supabase
        .from('inventoryaudit')
        .select('*')
        .order('audit_date', { ascending: false });

      // Staff sees only their audits
      if (!isAdmin && userId) {
        query = query.eq('performed_by', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const merged: InventoryAudit[] = [];

      // Cache in local (but don't overwrite a locally-completed audit with stale online in_progress)
      await performTransaction(async () => {
        // 1. Batch fetch existing local status to avoid N+1 queries
        const existingStatusMap = new Map<string, string>();
        if (data && data.length > 0) {
          const ids = data.map(d => d.audit_id).filter(id => id);
          if (ids.length > 0) {
            // Processing in chunks to avoid too many variables in 'IN' clause if list is huge
            const chunkSize = 50;
            for (let i = 0; i < ids.length; i += chunkSize) {
              const chunk = ids.slice(i, i + chunkSize);
              const placeholders = chunk.map(() => '?').join(',');
              const localRows = await db.getAllAsync<{ audit_id: string, status: string }>(
                `SELECT audit_id, status FROM inventoryaudit WHERE audit_id IN (${placeholders})`,
                chunk
              );
              localRows.forEach(row => existingStatusMap.set(row.audit_id, row.status));
            }
          }
        }

        for (const audit of data || []) {
          let status: InventoryAudit['status'] = (audit.status || 'in_progress') as InventoryAudit['status'];
          const localStatus = existingStatusMap.get(audit.audit_id);

          if (localStatus === 'completed' && status !== 'completed') {
            status = 'completed';
          }

          const row: InventoryAudit = {
            audit_id: audit.audit_id,
            performed_by: audit.performed_by ?? null,
            part_id: audit.part_id ?? null,
            physical_count: audit.physical_count,
            system_count: audit.system_count,
            adjustment: audit.adjustment,
            reason: audit.reason ?? null,
            audit_date: audit.audit_date,
            status,
            synced: !!audit.synced,
          };

          merged.push(row);

          await db.runAsync(`
            INSERT OR REPLACE INTO inventoryaudit (
              audit_id, performed_by, part_id, physical_count, system_count,
              adjustment, reason, audit_date, status, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            row.audit_id,
            row.performed_by,
            row.part_id,
            row.physical_count,
            row.system_count,
            row.adjustment,
            row.reason,
            row.audit_date,
            row.status,
            row.synced ? 1 : 0,
          ]);
        }
      });

      return merged;
    } catch (error) {
      console.log('Error fetching audits online:', error);
    }
  }

  // Offline: Read from local
  const audits = await performTransaction(async () => {
    let query = 'SELECT * FROM inventoryaudit ORDER BY audit_date DESC';
    const params: any[] = [];

    if (!isAdmin && userId) {
      query = 'SELECT * FROM inventoryaudit WHERE performed_by = ? ORDER BY audit_date DESC';
      params.push(userId);
    }

    return await db.getAllAsync<any>(query, params);
  });

  return (audits || []).map((a: any) => ({
    audit_id: a.audit_id,
    performed_by: a.performed_by,
    part_id: a.part_id,
    physical_count: a.physical_count,
    system_count: a.system_count,
    adjustment: a.adjustment,
    reason: a.reason,
    audit_date: a.audit_date,
    status: a.status || 'in_progress',
    synced: a.synced === 1,
  }));
}


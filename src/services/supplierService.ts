// Supplier Service with offline support
import { supabase } from '../lib/supabase';
import { getOfflineDB, ensureDatabaseInitialized, performTransaction } from '../lib/database';
import { isOnline } from './syncService';

export type Supplier = {
  supplier_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  payment_terms: string | null;
  created_at: string;
};

// Get all suppliers
export async function getSuppliers(): Promise<Supplier[]> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  console.log('📦 Getting suppliers | Online:', online, '| DB:', !!db);

  if (online) {
    try {
      // Check if authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Session for suppliers:', session ? 'Authenticated' : 'NOT authenticated');

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      console.log('🌐 Supabase suppliers response:', data?.length || 0, 'records', error ? 'ERROR: ' + error.message : '');

      if (error) throw error;

      // Cache in local (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          for (const supplier of data || []) {
            await db.runAsync(`
              INSERT OR REPLACE INTO suppliers (
                supplier_id, name, contact_name, phone, email, address,
                payment_terms, created_at, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              supplier.supplier_id, supplier.name, supplier.contact_name,
              supplier.phone, supplier.email, supplier.address,
              supplier.payment_terms, supplier.created_at,
            ]);
          }
        });
      }

      return data || [];
    } catch (error) {
      console.log('Error fetching suppliers online:', error);
    }
  }

  // Offline: Read from local
  const suppliers = await performTransaction(async () => {
    if (db) {
      return await db.getAllAsync<any>(
        'SELECT * FROM suppliers ORDER BY name ASC'
      );
    }
    return [];
  });

  if (suppliers.length > 0) {
    return suppliers.map(s => ({
      supplier_id: s.supplier_id,
      name: s.name,
      contact_name: s.contact_name,
      phone: s.phone,
      email: s.email,
      address: s.address,
      payment_terms: s.payment_terms,
      created_at: s.created_at,
    }));
  }

  return [];
}

// Get single supplier
export async function getSupplier(id: string): Promise<Supplier | null> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('supplier_id', id)
        .single();

      if (!error && data) {
        // Cache locally
        await performTransaction(async () => {
          if (db) {
            await db.runAsync(`
              INSERT OR REPLACE INTO suppliers (
                supplier_id, name, contact_name, phone, email, address,
                payment_terms, created_at, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              data.supplier_id, data.name, data.contact_name,
              data.phone, data.email, data.address,
              data.payment_terms, data.created_at,
            ]);
          }
        });
        return data;
      }
    } catch (error) {
      console.log('Error fetching supplier online:', error);
    }
  }

  // Offline: Read from local
  const supplier = await performTransaction(async () => {
    if (db) {
      return await db.getFirstAsync<any>(
        'SELECT * FROM suppliers WHERE supplier_id = ?',
        [id]
      );
    }
    return null;
  });

  if (supplier) {
    return {
      supplier_id: supplier.supplier_id,
      name: supplier.name,
      contact_name: supplier.contact_name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      payment_terms: supplier.payment_terms,
      created_at: supplier.created_at,
    };
  }
  return null;
}

// Create supplier
export async function createSupplier(supplierData: {
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  payment_terms?: string | null;
}): Promise<Supplier> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();
  const now = new Date().toISOString();

  console.log('📦 Creating supplier:', supplierData.name, '| Online:', online, '| DB:', !!db);

  if (online) {
    try {
      console.log('🌐 Attempting to save supplier to Supabase...');
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name: supplierData.name,
          contact_name: supplierData.contact_name || null,
          phone: supplierData.phone || null,
          email: supplierData.email || null,
          address: supplierData.address || null,
          payment_terms: supplierData.payment_terms || null,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        console.log('❌ Supabase supplier error:', error);
        throw error;
      }
      console.log('✅ Supplier saved to Supabase:', data.supplier_id);

      // Save to local (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync(`
            INSERT INTO suppliers (
              supplier_id, name, contact_name, phone, email, address,
              payment_terms, created_at, synced
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
          `, [
            data.supplier_id, data.name, data.contact_name,
            data.phone, data.email, data.address,
            data.payment_terms, data.created_at,
          ]);
        });
      }

      return data;
    } catch (error) {
      console.log('Error creating supplier online:', error);
      // Fall through to offline save
    }
  }

  // Offline: Generate temporary ID and save locally
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await performTransaction(async () => {
    if (db) {
      await db.runAsync(`
        INSERT INTO suppliers (
          supplier_id, name, contact_name, phone, email, address,
          payment_terms, created_at, synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        tempId, supplierData.name, supplierData.contact_name || null,
        supplierData.phone || null, supplierData.email || null,
        supplierData.address || null, supplierData.payment_terms || null, now,
      ]);
    }
  });

  return {
    supplier_id: tempId,
    name: supplierData.name,
    contact_name: supplierData.contact_name || null,
    phone: supplierData.phone || null,
    email: supplierData.email || null,
    address: supplierData.address || null,
    payment_terms: supplierData.payment_terms || null,
    created_at: now,
  };
}

// Update supplier
export async function updateSupplier(
  id: string,
  supplierData: {
    name?: string;
    contact_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    payment_terms?: string | null;
  }
): Promise<Supplier | null> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(supplierData)
        .eq('supplier_id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local (skip if no database on web)
      if (db) {
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        if (supplierData.name !== undefined) {
          updateFields.push('name = ?');
          updateValues.push(supplierData.name);
        }
        if (supplierData.contact_name !== undefined) {
          updateFields.push('contact_name = ?');
          updateValues.push(supplierData.contact_name);
        }
        if (supplierData.phone !== undefined) {
          updateFields.push('phone = ?');
          updateValues.push(supplierData.phone);
        }
        if (supplierData.email !== undefined) {
          updateFields.push('email = ?');
          updateValues.push(supplierData.email);
        }
        if (supplierData.address !== undefined) {
          updateFields.push('address = ?');
          updateValues.push(supplierData.address);
        }
        if (supplierData.payment_terms !== undefined) {
          updateFields.push('payment_terms = ?');
          updateValues.push(supplierData.payment_terms);
        }
        updateFields.push('synced = 1');
        updateValues.push(id);

        await performTransaction(async () => {
          await db.runAsync(`
            UPDATE suppliers SET ${updateFields.join(', ')} WHERE supplier_id = ?
          `, updateValues);
        });
      }

      return data;
    } catch (error) {
      console.log('Error updating supplier online:', error);
    }
  }

  // Offline: Update local
  await performTransaction(async () => {
    if (db) {
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (supplierData.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(supplierData.name);
      }
      if (supplierData.contact_name !== undefined) {
        updateFields.push('contact_name = ?');
        updateValues.push(supplierData.contact_name);
      }
      if (supplierData.phone !== undefined) {
        updateFields.push('phone = ?');
        updateValues.push(supplierData.phone);
      }
      if (supplierData.email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(supplierData.email);
      }
      if (supplierData.address !== undefined) {
        updateFields.push('address = ?');
        updateValues.push(supplierData.address);
      }
      if (supplierData.payment_terms !== undefined) {
        updateFields.push('payment_terms = ?');
        updateValues.push(supplierData.payment_terms);
      }
      updateFields.push('synced = 0');
      updateValues.push(id);

      await db.runAsync(`
        UPDATE suppliers SET ${updateFields.join(', ')} WHERE supplier_id = ?
      `, updateValues);
    }
  });

  const updated = await getSupplier(id);
  return updated;
}

// Delete supplier
export async function deleteSupplier(id: string): Promise<boolean> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('supplier_id', id);

      if (error) throw error;

      // Delete from local (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync('DELETE FROM suppliers WHERE supplier_id = ?', [id]);
        });
      }
      return true;
    } catch (error) {
      console.log('Error deleting supplier online:', error);
      // Fall through to offline delete
    }
  }

  // Offline: Delete locally (will be synced later)
  await performTransaction(async () => {
    if (db) {
      await db.runAsync('DELETE FROM suppliers WHERE supplier_id = ?', [id]);
    }
  });

  return true;
}


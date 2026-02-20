// Inventory Service - Product management with offline support
import { supabase } from '../lib/supabase';
import { ensureDatabaseInitialized, performTransaction } from '../lib/database';
import { isOnline } from './syncService';
import * as notificationService from './notificationService';
import uuid from 'react-native-uuid';

export type Product = {
  part_id: string;
  sku: string;
  name: string;
  category_id: string | null;
  supplier_id: string | null;
  description: string | null;
  cost_price: number;
  selling_price: number;
  quantity_in_stock: number;
  reorder_level: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  status: string | null;
};

// Generate UUID
function generateId(): string {
  return uuid.v4() as string;
}

// Log helper
function logProductAction(action: string, details: any) {
  console.log(`📦 [Product] ${action}:`, JSON.stringify(details, null, 2));
}

// Get all products
export async function getProducts(): Promise<Product[]> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('spareparts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      // If no database (web platform), return Supabase data directly
      if (!db) {
        return (data || []).map(p => ({
          part_id: p.part_id,
          sku: p.sku,
          name: p.name,
          category_id: p.category_id,
          supplier_id: p.supplier_id,
          description: p.description,
          cost_price: p.cost_price,
          selling_price: p.selling_price,
          quantity_in_stock: p.quantity_in_stock,
          reorder_level: p.reorder_level,
          image_url: p.image_url,
          created_at: p.created_at,
          updated_at: p.updated_at,
          status: p.status || 'active',
        }));
      }

      // Update local DB cache in background with transaction
      if (data) {
        await performTransaction(async () => {
          for (const product of data) {
            // Use INSERT OR REPLACE
            await db.runAsync(`
              INSERT OR REPLACE INTO spareparts (
                part_id, sku, name, category_id, supplier_id, description,
                cost_price, selling_price, quantity_in_stock, reorder_level,
                image_url, status, created_at, updated_at, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
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
              product.status || 'active',
              product.created_at,
              product.updated_at,
            ]);
          }
        });
      }
    } catch (error) {
      console.log('Error fetching products online:', error);
      // Fall through to local query only if database exists
      if (!db) return [];
    }
  }

  // If no database (web), return empty array
  if (!db) return [];

  // Always return from local DB to ensure that:
  // 1. Unsynced local products are included.
  // 2. Local stock adjustments made while offline are visible.
  const result = await db.getAllAsync<any>(`
    SELECT * FROM spareparts ORDER BY name ASC
  `);
  const products = Array.isArray(result) ? result : [];

  return products.map(p => ({
    part_id: p.part_id,
    sku: p.sku,
    name: p.name,
    category_id: p.category_id,
    supplier_id: p.supplier_id,
    description: p.description,
    cost_price: p.cost_price,
    selling_price: p.selling_price,
    quantity_in_stock: p.quantity_in_stock,
    reorder_level: p.reorder_level,
    image_url: p.image_url,
    created_at: p.created_at,
    updated_at: p.updated_at || p.created_at,
    status: p.status || 'active',
  }));
}

// Get product by SKU/barcode
export async function getProductBySku(sku: string): Promise<Product | null> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('spareparts')
        .select('*')
        .eq('sku', sku)
        .maybeSingle();

      if (!error && data) {
        // Cache in local DB (skip if no database on web)
        if (db) {
          try {
            await performTransaction(async () => {
              await db.runAsync(`
              INSERT OR REPLACE INTO spareparts (
                part_id, sku, name, category_id, supplier_id, description,
                cost_price, selling_price, quantity_in_stock, reorder_level,
                image_url, status, created_at, updated_at, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
                data.part_id, data.sku, data.name, data.category_id, data.supplier_id,
                data.description, data.cost_price, data.selling_price,
                data.quantity_in_stock, data.reorder_level, data.image_url,
                data.status || 'active',
                data.created_at, data.updated_at,
              ]);
            });
          } catch (dbError) {
            console.log('Error caching product locally:', dbError);
            // Continue even if caching fails
          }
        }
        return data;
      } else if (error) {
        console.log('Error fetching product online:', error);
      }
    } catch (onlineError) {
      console.log('Online fetch failed, trying offline:', onlineError);
    }
  }

  // Fallback to offline/local DB
  if (!db) return null;

  try {
    const result = await db.getFirstAsync(`
      SELECT * FROM spareparts WHERE sku = ?
    `, [sku]);

    if (result) {
      const p = result as any;
      return {
        part_id: p.part_id,
        sku: p.sku,
        name: p.name,
        category_id: p.category_id,
        supplier_id: p.supplier_id,
        description: p.description,
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        quantity_in_stock: p.quantity_in_stock,
        reorder_level: p.reorder_level,
        image_url: p.image_url,
        created_at: p.created_at,
        updated_at: p.updated_at || p.created_at,
        status: p.status || 'active',
      };
    }
  } catch (offlineError) {
    console.log('Error fetching product offline:', offlineError);
  }

  return null;
}

// Get single product
export async function getProduct(id: string): Promise<Product | null> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('spareparts')
        .select('*')
        .eq('part_id', id)
        .single();

      if (!error && data) {
        // Cache in local DB
        if (db) {
          await performTransaction(async () => {
            await db.runAsync(`
              INSERT OR REPLACE INTO spareparts (
                part_id, sku, name, category_id, supplier_id, description,
                cost_price, selling_price, quantity_in_stock, reorder_level,
                image_url, status, created_at, updated_at, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              data.part_id, data.sku, data.name, data.category_id, data.supplier_id,
              data.description, data.cost_price, data.selling_price,
              data.quantity_in_stock, data.reorder_level, data.image_url,
              data.status || 'active',
              data.created_at, data.updated_at,
            ]);
          });
        }
        return data;
      }
    } catch (error) {
      console.log('Error fetching product online:', error);
    }
  }

  // Offline: Read from local
  if (!db) return null;

  const result = await db.getFirstAsync<any>(
    `SELECT * FROM spareparts WHERE part_id = ?`,
    [id]
  );
  const product = result || null;

  if (product) {
    return {
      part_id: product.part_id,
      sku: product.sku,
      name: product.name,
      category_id: product.category_id,
      supplier_id: product.supplier_id,
      description: product.description,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      quantity_in_stock: product.quantity_in_stock,
      reorder_level: product.reorder_level,
      image_url: product.image_url,
      created_at: product.created_at,
      updated_at: product.updated_at || product.created_at,
      status: product.status || 'active',
    };
  }

  return null;
}

// Get low stock products
export async function getLowStockProducts(): Promise<Product[]> {
  const products = await getProducts();
  return products.filter(p => p.quantity_in_stock <= p.reorder_level);
}

// Create product (Admin only)
export async function createProduct(product: Omit<Product, 'part_id' | 'created_at' | 'updated_at'>): Promise<Product> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();
  const productId = generateId();
  const now = new Date().toISOString();

  console.log('📦 Creating product:', product.name, '| Online:', online, '| DB:', !!db);

  const newProduct: Product = {
    ...product,
    part_id: productId,
    created_at: now,
    updated_at: now,
  };

  if (online) {
    try {
      // Verify authentication before insert
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Session check:', session ? 'Authenticated' : 'NOT authenticated');
      if (!session) {
        throw new Error('Not authenticated. Please log in to create products.');
      }

      console.log('🌐 Attempting to save product to Supabase...');
      const { data, error } = await supabase
        .from('spareparts')
        .insert({
          part_id: productId,
          ...product,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.log('❌ Supabase product insert error:', error);
        // Log detailed error for debugging
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
          console.log('RLS Policy Error - User may not have permission or not authenticated');
          throw new Error('Permission denied. Please ensure you are logged in and have admin role.');
        }
        throw error;
      }

      // Save to local (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync(`
          INSERT INTO spareparts (
            part_id, sku, name, category_id, supplier_id, description,
            cost_price, selling_price, quantity_in_stock, reorder_level,
            image_url, status, created_at, updated_at, synced
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
            data.part_id, data.sku, data.name, data.category_id, data.supplier_id,
            data.description, data.cost_price, data.selling_price,
            data.quantity_in_stock, data.reorder_level, data.image_url,
            data.status || 'active',
            data.created_at, data.updated_at,
          ]);
        });
      }

      return newProduct;
    } catch (error) {
      console.log('Error creating product online:', error);
      // Fall through to offline save
    }
  }

  // Offline: Save locally (skip if no database on web)
  if (!db) {
    throw new Error('Cannot create product offline on web platform');
  }

  await performTransaction(async () => {
    await db.runAsync(`
        INSERT INTO spareparts (
          part_id, sku, name, category_id, supplier_id, description,
          cost_price, selling_price, quantity_in_stock, reorder_level,
          image_url, status, created_at, updated_at, synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
      productId, product.sku, product.name, product.category_id, product.supplier_id,
      product.description, product.cost_price, product.selling_price,
      product.quantity_in_stock, product.reorder_level, product.image_url,
      'active',
      now, now,
    ]);

    // Queue for sync
    await db.runAsync(`
        INSERT INTO sync_queue (id, table_name, operation, record_id, data, created_at, synced)
        VALUES (?, 'spareparts', 'insert', ?, ?, ?, 0)
      `, [generateId(), productId, JSON.stringify(newProduct), now]);
  });

  return newProduct;
}

// Update product (Admin only)
export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();
  const now = new Date().toISOString();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('spareparts')
        .update({
          ...updates,
          updated_at: now,
        })
        .eq('part_id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local (skip if no database on web)
      if (data && db) {
        await performTransaction(async () => {
          await db.runAsync(`
            UPDATE spareparts SET
              sku = ?, name = ?, category_id = ?, supplier_id = ?,
              description = ?, cost_price = ?, selling_price = ?,
              quantity_in_stock = ?, reorder_level = ?, image_url = ?,
              updated_at = ?, synced = 1
            WHERE part_id = ?
          `, [
            data.sku, data.name, data.category_id, data.supplier_id,
            data.description, data.cost_price, data.selling_price,
            data.quantity_in_stock, data.reorder_level, data.image_url,
            now, id,
          ]);
        });
      }

      return data || null;
    } catch (error) {
      console.log('Error updating product online:', error);
    }
  }

  // Offline: Update local (skip if no database on web)
  if (!db) {
    throw new Error('Cannot update product offline on web platform');
  }

  const current = await getProduct(id);
  if (current) {
    const updated = { ...current, ...updates, updated_at: now };
    await performTransaction(async () => {
      await db.runAsync(`
          UPDATE spareparts SET
            sku = ?, name = ?, category_id = ?, supplier_id = ?,
            description = ?, cost_price = ?, selling_price = ?,
            quantity_in_stock = ?, reorder_level = ?, image_url = ?,
            updated_at = ?, synced = 0
          WHERE part_id = ?
        `, [
        updated.sku, updated.name, updated.category_id, updated.supplier_id,
        updated.description, updated.cost_price, updated.selling_price,
        updated.quantity_in_stock, updated.reorder_level, updated.image_url,
        now, id,
      ]);

      // Queue for sync
      await db.runAsync(`
          INSERT INTO sync_queue (id, table_name, operation, record_id, data, created_at, synced)
          VALUES (?, 'spareparts', 'update', ?, ?, ?, 0)
        `, [generateId(), id, JSON.stringify(updates), now]);
    });

    return updated;
  }

  return null;
}

// Update stock quantity
export async function updateStock(productId: string, quantityChange: number): Promise<boolean> {
  const product = await getProduct(productId);
  if (!product) return false;

  const newQuantity = Math.max(0, product.quantity_in_stock + quantityChange);
  const updated = await updateProduct(productId, {
    quantity_in_stock: newQuantity,
  });

  // Check if stock is low and create notification
  // Only notify if it WAS above reorder level and is NOW at or below it
  if (newQuantity <= product.reorder_level && product.quantity_in_stock > product.reorder_level) {
    await notificationService.createNotification({
      type: 'low_stock',
      message: `Low stock alert: ${product.name} (${newQuantity} units remaining)`,
    });
  }

  return !!updated;
}

// Update stock quantity LOCALLY only (useful when server has triggers)
export async function updateStockLocal(productId: string, quantityChange: number): Promise<boolean> {
  const db = await ensureDatabaseInitialized();
  if (!db) return false;

  const product = await getProduct(productId);
  if (!product) return false;

  const newQuantity = Math.max(0, product.quantity_in_stock + quantityChange);
  const now = new Date().toISOString();

  await performTransaction(async () => {
    await db.runAsync(`
      UPDATE spareparts SET 
        quantity_in_stock = ?, 
        updated_at = ?, 
        synced = 0 
      WHERE part_id = ?
    `, [newQuantity, now, productId]);
  });

  // Check if stock is low
  if (newQuantity <= product.reorder_level && product.quantity_in_stock > product.reorder_level) {
    await notificationService.createNotification({
      type: 'low_stock',
      message: `Low stock alert: ${product.name} (${newQuantity} units remaining)`,
    });
  }

  return true;
}

// Delete product (Admin only)
export async function deleteProduct(productId: string): Promise<boolean> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  logProductAction('DELETE_PRODUCT_START', { productId, online });

  if (online) {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('spareparts')
        .delete()
        .eq('part_id', productId);

      if (error) {
        // Check if it's a foreign key constraint error (e.g., product used in sales)
        if (error.code === '23503') {
          logProductAction('DELETE_REDIRECT_TO_ARCHIVE', { productId, reason: 'referenced_records' });
          return await updateProductStatus(productId, 'archived');
        }
        throw error;
      }

      logProductAction('DELETE_PRODUCT_SUPABASE_SUCCESS', { productId });

      // Delete from local DB (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync('DELETE FROM spareparts WHERE part_id = ?', [productId]);
        });
      }

      logProductAction('DELETE_PRODUCT_LOCAL_SUCCESS', { productId });
      return true;
    } catch (error: any) {
      console.log('Error deleting product online:', error);
      throw error;
    }
  }

  // Offline: Mark for deletion in sync queue (skip if no database on web)
  if (!db) {
    throw new Error('Cannot delete product offline on web platform');
  }

  const now = new Date().toISOString();

  // Delete from local DB
  await performTransaction(async () => {
    await db.runAsync('DELETE FROM spareparts WHERE part_id = ?', [productId]);

    // Queue for sync when online
    await db.runAsync(`
      INSERT INTO sync_queue (id, table_name, operation, record_id, data, created_at, synced)
      VALUES (?, 'spareparts', 'delete', ?, ?, ?, 0)
    `, [generateId(), productId, JSON.stringify({ part_id: productId }), now]);
  });

  logProductAction('DELETE_PRODUCT_OFFLINE_QUEUED', { productId });
  return true;
}

// Update product status (e.g., 'active', 'inactive', 'archived')
export async function updateProductStatus(productId: string, status: string): Promise<boolean> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();
  const now = new Date().toISOString();

  logProductAction('UPDATE_PRODUCT_STATUS_START', { productId, status, online });

  if (online) {
    try {
      const { error } = await supabase
        .from('spareparts')
        .update({ status, updated_at: now })
        .eq('part_id', productId);

      if (error) throw error;

      logProductAction('UPDATE_PRODUCT_STATUS_SUPABASE_SUCCESS', { productId, status });
    } catch (error) {
      console.log('Error updating product status online:', error);
      // If online fails, it will still be updated locally and synced later via the queue
    }
  }

  // Local update (skip if no database on web)
  if (!db) {
    throw new Error('Cannot update product status offline on web platform');
  }

  await performTransaction(async () => {
    await db.runAsync(
      'UPDATE spareparts SET status = ?, updated_at = ?, synced = 0 WHERE part_id = ?',
      [status, now, productId]
    );

    // Queue for sync
    await db.runAsync(`
      INSERT INTO sync_queue (id, table_name, operation, record_id, data, created_at, synced)
      VALUES (?, 'spareparts', 'update', ?, ?, ?, 0)
    `, [generateId(), productId, JSON.stringify({ status, updated_at: now }), now]);
  });

  logProductAction('UPDATE_PRODUCT_STATUS_SUCCESS', { productId, status });
  return true;
}


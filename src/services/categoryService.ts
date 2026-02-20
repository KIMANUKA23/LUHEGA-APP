// Category Service with offline support
import { supabase } from '../lib/supabase';
import { getOfflineDB, ensureDatabaseInitialized, performTransaction } from '../lib/database';
import { isOnline } from './syncService';
import uuid from 'react-native-uuid';

export type Category = {
  category_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

// Get all categories
export async function getCategories(): Promise<Category[]> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  console.log('📦 Getting categories | Online:', online, '| DB:', !!db);

  if (online) {
    try {
      // Check if authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Session for categories:', session ? 'Authenticated' : 'NOT authenticated');

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      console.log('🌐 Supabase categories response:', data?.length || 0, 'records', error ? 'ERROR: ' + error.message : '');

      if (error) throw error;

      // Cache in local (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          for (const category of data || []) {
            await db.runAsync(`
              INSERT OR REPLACE INTO categories (
                category_id, name, description, created_at, synced
              ) VALUES (?, ?, ?, ?, 1)
            `, [
              category.category_id, category.name, category.description || null, category.created_at,
            ]);
          }
        });
      }

      return data || [];
    } catch (error) {
      console.log('Error fetching categories online:', error);
    }
  }

  // Offline: Read from local
  if (db) {
    return await performTransaction(async () => {
      const categories = await db.getAllAsync<any>(
        'SELECT * FROM categories ORDER BY name ASC'
      );

      return categories.map(c => ({
        category_id: c.category_id,
        name: c.name,
        description: c.description,
        created_at: c.created_at,
      }));
    });
  }

  return [];
}

// Get single category
export async function getCategory(id: string): Promise<Category | null> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('category_id', id)
        .single();

      if (!error && data) {
        // Cache locally
        if (db) {
          await performTransaction(async () => {
            await db.runAsync(`
              INSERT OR REPLACE INTO categories (
                category_id, name, description, created_at, synced
              ) VALUES (?, ?, ?, ?, 1)
            `, [
              data.category_id, data.name, data.description, data.created_at,
            ]);
          });
        }
        return data;
      }
    } catch (error) {
      console.log('Error fetching category online:', error);
    }
  }

  // Offline: Read from local
  if (db) {
    return await performTransaction(async () => {
      const category = await db.getFirstAsync<any>(
        'SELECT * FROM categories WHERE category_id = ?',
        [id]
      );

      if (category) {
        return {
          category_id: category.category_id,
          name: category.name,
          description: category.description,
          created_at: category.created_at,
        };
      }
      return null;
    });
  }

  return null;
}

// Create category
export async function createCategory(categoryData: {
  name: string;
  description?: string | null;
}): Promise<Category> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();
  const now = new Date().toISOString();

  console.log('📦 Creating category:', categoryData.name, '| Online:', online, '| DB:', !!db);

  if (online) {
    try {
      console.log('🌐 Attempting to save category to Supabase...');
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: categoryData.name,
          description: categoryData.description || null,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        console.log('❌ Supabase category error:', error);
        throw error;
      }
      console.log('✅ Category saved to Supabase:', data.category_id);

      // Save to local (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync(`
            INSERT INTO categories (
              category_id, name, description, created_at, synced
            ) VALUES (?, ?, ?, ?, 1)
          `, [
            data.category_id, data.name, data.description, data.created_at,
          ]);
        });
      }

      return data;
    } catch (error) {
      console.log('Error creating category online:', error);
      // Fall through to offline save
    }
  }

  // Offline: Generate temporary ID and save locally
  const tempId = uuid.v4() as string;
  if (db) {
    await performTransaction(async () => {
      await db.runAsync(`
        INSERT INTO categories (
          category_id, name, description, created_at, synced
        ) VALUES (?, ?, ?, ?, 0)
      `, [
        tempId, categoryData.name, categoryData.description || null, now,
      ]);
    });
  }

  return {
    category_id: tempId,
    name: categoryData.name,
    description: categoryData.description || null,
    created_at: now,
  };
}

// Update category
export async function updateCategory(
  id: string,
  updates: { name?: string; description?: string | null }
): Promise<Category | null> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('category_id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync(`
            UPDATE categories 
            SET name = ?, description = ?, synced = 1
            WHERE category_id = ?
          `, [
            data.name, data.description, id,
          ]);
        });
      }

      return data;
    } catch (error) {
      console.log('Error updating category online:', error);
      // Fall through to offline update
    }
  }

  // Offline: Update locally
  if (db) {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    updateFields.push('synced = 0');
    values.push(id);

    await performTransaction(async () => {
      await db.runAsync(
        `UPDATE categories SET ${updateFields.join(', ')} WHERE category_id = ?`,
        values
      );
    });

    return await getCategory(id);
  }

  return null;
}

// Delete category
export async function deleteCategory(id: string): Promise<boolean> {
  const online = await isOnline();
  const db = await ensureDatabaseInitialized();

  if (online) {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('category_id', id);

      if (error) throw error;

      // Delete from local (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync('DELETE FROM categories WHERE category_id = ?', [id]);
        });
      }

      return true;
    } catch (error) {
      console.log('Error deleting category online:', error);
      return false;
    }
  }

  // Offline: Mark for deletion (or delete locally)
  if (db) {
    await performTransaction(async () => {
      await db.runAsync('DELETE FROM categories WHERE category_id = ?', [id]);
    });
    return true;
  }

  return false;
}


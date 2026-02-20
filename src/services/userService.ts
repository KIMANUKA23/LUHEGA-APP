// User Service - Fetch staff/users from database
import { supabase } from '../lib/supabase';
import { getOfflineDB } from '../lib/database';
import { isOnline } from './syncService';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phone: string | null;
  photo_url: string | null;
  role: 'admin' | 'staff';
  status: 'active' | 'inactive';
  created_at: string;
  address: string | null;
  emergency_contact: string | null;
  synced?: boolean;
};

function isMissingColumnError(err: unknown, columnName: string): boolean {
  const e: any = err;
  const message = String(e?.message || '');
  return e?.code === '42703' || message.includes(`column users.${columnName} does not exist`) || message.includes(`column "${columnName}" does not exist`);
}

// Get all users (filtered by role if provided)
export async function getUsers(role?: 'admin' | 'staff'): Promise<UserProfile[]> {
  const online = await isOnline();
  const db = getOfflineDB();

  if (online) {
    try {
      let data: any[] | null = null;

      // Try with photo_url first, then fall back if the column doesn't exist.
      let query = supabase
        .from('users')
        .select('id, name, email, username, phone, photo_url, role, status, created_at, address, emergency_contact')
        .order('name', { ascending: true });

      if (role) query = query.eq('role', role);

      const res = await query;
      if (res.error) {
        if (isMissingColumnError(res.error, 'photo_url')) {
          let queryNoPhoto = supabase
            .from('users')
            .select('id, name, email, username, phone, role, status, created_at, address, emergency_contact')
            .order('name', { ascending: true });
          if (role) queryNoPhoto = queryNoPhoto.eq('role', role);
          const res2 = await queryNoPhoto;
          if (res2.error) throw res2.error;
          data = (res2.data || []).map((u: any) => ({ ...u, photo_url: null }));
        } else {
          throw res.error;
        }
      } else {
        data = res.data || [];
      }

      // Sync local cache with Supabase data (skip if no database on web)
      if (db) {
        for (const user of data || []) {
          const localUser = await db.getFirstAsync<any>('SELECT synced FROM users WHERE id = ?', [user.id]);

          if (!localUser || localUser.synced === 1) {
            await db.runAsync(`
              INSERT OR REPLACE INTO users (
                id, name, email, username, phone, photo_url, role, status, created_at, address, emergency_contact, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              user.id, user.name, user.email, user.username, user.phone, user.photo_url ?? null,
              user.role, user.status, user.created_at, user.address ?? null, user.emergency_contact ?? null,
            ]);
          }
        }
      }

      return (data as any) || [];
    } catch (error) {
      console.log('Error fetching users online:', error);
    }
  }

  // Offline: Read from local
  if (db) {
    let query = 'SELECT * FROM users ORDER BY name ASC';
    const params: any[] = [];

    if (role) {
      query = 'SELECT * FROM users WHERE role = ? ORDER BY name ASC';
      params.push(role);
    }

    const users = await db.getAllAsync<any>(query, params);

    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username || u.name,
      phone: u.phone,
      photo_url: u.photo_url,
      role: u.role,
      status: u.status,
      created_at: u.created_at,
      address: u.address,
      emergency_contact: u.emergency_contact,
    }));
  }

  return [];
}

// Get single user
export async function getUser(id: string): Promise<UserProfile | null> {
  const online = await isOnline();
  const db = getOfflineDB();

  if (online) {
    try {
      let data: any = null;

      // Try with photo_url first, then fall back if the column doesn't exist.
      const res = await supabase
        .from('users')
        .select('id, name, email, username, phone, photo_url, role, status, created_at, address, emergency_contact')
        .eq('id', id)
        .single();

      if (res.error) {
        // Handle user not found in Supabase (PGRST116)
        if (res.error.code === 'PGRST116') {
          console.log('User not found in Supabase, checking local DB only');
          // Fall through to check local DB below
        } else if (isMissingColumnError(res.error, 'photo_url')) {
          const res2 = await supabase
            .from('users')
            .select('id, name, email, username, phone, role, status, created_at, address, emergency_contact')
            .eq('id', id)
            .single();
          if (res2.error && res2.error.code !== 'PGRST116') throw res2.error;
          if (res2.data) {
            data = { ...(res2.data as any), photo_url: null };
          }
        } else {
          throw res.error;
        }
      } else {
        data = res.data;
      }

      if (data) {
        // Cache locally if synced
        if (db) {
          const localUser = await db.getFirstAsync<any>('SELECT synced FROM users WHERE id = ?', [id]);
          if (!localUser || localUser.synced === 1) {
            await db.runAsync(`
              INSERT OR REPLACE INTO users (
                id, name, email, username, phone, photo_url, role, status, created_at, address, emergency_contact, synced
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `, [
              data.id, data.name, data.email, data.username, data.phone, data.photo_url ?? null,
              data.role, data.status, data.created_at, data.address ?? null, data.emergency_contact ?? null,
            ]);
          }
        }
        return data;
      }
    } catch (error) {
      console.log('Error fetching user online:', error);
    }
  }

  // Offline: Read from local
  if (db) {
    const user = await db.getFirstAsync<any>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (user) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username || user.name,
        phone: user.phone,
        photo_url: user.photo_url,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
        address: user.address,
        emergency_contact: user.emergency_contact,
        synced: user.synced === 1,
      };
    }
  }

  return null;
}

// Update user profile
export async function updateUser(
  id: string,
  updates: {
    name?: string;
    email?: string;
    phone?: string | null;
    photo_url?: string | null;
    role?: 'admin' | 'staff';
    status?: 'active' | 'inactive';
    address?: string | null;
    emergency_contact?: string | null;
  }
): Promise<UserProfile | null> {
  const online = await isOnline();
  const db = getOfflineDB();

  if (online) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please log in to update profile.');
      }

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.photo_url !== undefined) updateData.photo_url = updates.photo_url;
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.emergency_contact !== undefined) updateData.emergency_contact = updates.emergency_contact;

      console.log('Updating user online:', { id, updateData });

      let data: any = null;

      const res = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (res.error) {
        console.log('Supabase update error:', res.error);

        // Handle missing 'photo_url' column (PGRST204)
        let handled = false;
        if (res.error.code === 'PGRST204' && updateData.photo_url !== undefined) {
          console.log('Column photo_url missing, retrying upsert without it...');
          delete updateData.photo_url;

          const resRetry = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

          if (resRetry.error) {
            console.log('Retry failed:', resRetry.error);
          } else {
            data = resRetry.data;
            handled = true;
          }
        }

        if (!handled) {
          // If update fails due to permissions or other issues, fall back to local DB only
          if (res.error.code === 'PGRST116' || res.error.message?.includes('permission denied') || res.error.message?.includes('policy') || res.error.code === 'PGRST204') {
            console.log('Update failed due to permissions/policy/schema, updating local DB only');

            // Only update local if db exists
            if (db) {
              const updateFields: string[] = [];
              const updateValues: any[] = [];

              if (updates.name !== undefined) {
                updateFields.push('name = ?');
                updateValues.push(updates.name);
              }
              if (updates.phone !== undefined) {
                updateFields.push('phone = ?');
                updateValues.push(updates.phone);
              }
              if (updates.photo_url !== undefined) {
                updateFields.push('photo_url = ?');
                updateValues.push(updates.photo_url);
              }
              if (updates.role !== undefined) {
                updateFields.push('role = ?');
                updateValues.push(updates.role);
              }
              if (updates.status !== undefined) {
                updateFields.push('status = ?');
                updateValues.push(updates.status);
              }
              if (updates.address !== undefined) {
                updateFields.push('address = ?');
                updateValues.push(updates.address);
              }
              if (updates.emergency_contact !== undefined) {
                updateFields.push('emergency_contact = ?');
                updateValues.push(updates.emergency_contact);
              }
              updateValues.push(id);

              if (updateFields.length > 0) {
                console.log('Updating local DB as fallback:', { updateFields, updateValues });
                await db.runAsync(`
                  UPDATE users SET ${updateFields.join(', ')}, synced = 0 WHERE id = ?
                `, updateValues);
              }
              // Return the updated user from local DB
              return await getUser(id);
            }

            throw res.error;
          } else {
            throw res.error;
          }
        }
      } else {
        data = res.data;
      }

      if (data) console.log('User updated successfully in Supabase:', data);

      // Update local DB with the result (skip if no database on web)
      if (db) {
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        if (updates.name !== undefined) {
          updateFields.push('name = ?');
          updateValues.push(updates.name);
        }
        if (updates.phone !== undefined) {
          updateFields.push('phone = ?');
          updateValues.push(updates.phone);
        }
        if (updates.photo_url !== undefined) {
          updateFields.push('photo_url = ?');
          updateValues.push(updates.photo_url);
        }
        if (updates.role !== undefined) {
          updateFields.push('role = ?');
          updateValues.push(updates.role);
        }
        if (updates.status !== undefined) {
          updateFields.push('status = ?');
          updateValues.push(updates.status);
        }
        if (updates.address !== undefined) {
          updateFields.push('address = ?');
          updateValues.push(updates.address);
        }
        if (updates.emergency_contact !== undefined) {
          updateFields.push('emergency_contact = ?');
          updateValues.push(updates.emergency_contact);
        }
        updateValues.push(id);

        if (updateFields.length > 0) {
          console.log('Updating local DB with online result:', { updateFields, updateValues });
          await db.runAsync(`
            UPDATE users SET ${updateFields.join(', ')}, synced = 1 WHERE id = ?
          `, updateValues);
        }
      }

      return data;
    } catch (error) {
      console.log('Error updating user online:', error);
      throw error;
    }
  }

  // Offline: Update local
  if (db) {
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(updates.name);
    }
    if (updates.phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(updates.phone);
    }
    if (updates.photo_url !== undefined) {
      updateFields.push('photo_url = ?');
      updateValues.push(updates.photo_url);
    }
    if (updates.role !== undefined) {
      updateFields.push('role = ?');
      updateValues.push(updates.role);
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(updates.status);
    }
    if (updates.address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(updates.address);
    }
    if (updates.emergency_contact !== undefined) {
      updateFields.push('emergency_contact = ?');
      updateValues.push(updates.emergency_contact);
    }
    updateValues.push(id);

    if (updateFields.length > 0) {
      await db.runAsync(`
        UPDATE users SET ${updateFields.join(', ')}, synced = 0 WHERE id = ?
      `, updateValues);
    }
  }

  return await getUser(id);
}

// Delete user
export async function deleteUser(id: string): Promise<boolean> {
  const online = await isOnline();
  const db = getOfflineDB();

  console.log('Deleting user:', { id, online, hasDb: !!db });

  if (online) {
    try {
      // Try to delete from Supabase
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      console.log('Supabase delete result:', { error });

      // If user doesn't exist in Supabase (PGRST116), that's OK - just delete from local
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (error && error.code === 'PGRST116') {
        console.log('User not in Supabase, deleting from local DB only');
      }

      // Always delete from local DB (skip if no database on web)
      if (db) {
        console.log('Deleting from local DB...');
        await db.runAsync('DELETE FROM users WHERE id = ?', [id]);
        console.log('Local DB delete completed');
      }

      return true;
    } catch (error: any) {
      console.log('Error deleting user online:', error);
      if (error.code === '23503') {
        throw new Error('This staff member cannot be deleted because they have associated records (like sales). Please deactivate them instead.');
      }
      throw error;
    }
  }

  // Offline: Delete from local DB only
  if (db) {
    try {
      await db.runAsync('DELETE FROM users WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.log('Error deleting user offline:', error);
      throw error;
    }
  }

  throw new Error('Failed to delete user');
}

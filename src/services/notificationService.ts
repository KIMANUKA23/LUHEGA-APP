// Notification Service - Fetch notifications from database
import { supabase } from '../lib/supabase';
import { getOfflineDB, performTransaction } from '../lib/database';
import { isOnline } from './syncService';
import uuid from 'react-native-uuid';

export type Notification = {
  notification_id: string;
  user_id: string | null;
  type: string;
  message: string;
  status: 'unread' | 'read';
  created_at: string;
  read_at: string | null;
};

// Get notifications for a user
export async function getNotifications(userId: string | null, isAdmin: boolean = false): Promise<Notification[]> {
  const online = await isOnline();
  const db = getOfflineDB();

  if (online && db) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (isAdmin) {
        // Admin sees everything (including staff-specific if needed, or just system + their own)
        if (userId) {
          query = query.or(`user_id.is.null,user_id.eq."${userId}"`);
        }
      } else if (userId) {
        // Staff sees their own + system notifications
        query = query.or(`user_id.is.null,user_id.eq."${userId}"`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Cache in local DB (Intelligent sync)
      await performTransaction(async () => {
        if (!db) return;

        for (const notif of data || []) {
          await db.runAsync(`
            INSERT OR IGNORE INTO notifications (
              notification_id, user_id, type, message, status, created_at, read_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            notif.notification_id, notif.user_id, notif.type, notif.message,
            notif.status, notif.created_at, notif.read_at,
          ]);

          // Don't overwrite local 'read' status with server 'unread'
          if (notif.status === 'read') {
            await db.runAsync(`
              UPDATE notifications SET status = 'read', read_at = ? 
              WHERE notification_id = ? AND status = 'unread'
            `, [notif.read_at, notif.notification_id]);
          }
        }
      });
    } catch (error) {
      console.log('Error fetching notifications online:', error);
    }
  }

  // Final source of truth is local DB
  if (db) {
    let query = 'SELECT * FROM notifications ORDER BY created_at DESC';
    const params: any[] = [];

    if (!isAdmin && userId) {
      query = 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC';
      params.push(userId);
    } else if (isAdmin && userId) {
      query = 'SELECT * FROM notifications WHERE (user_id IS NULL OR user_id = ?) ORDER BY created_at DESC';
      params.push(userId);
    }
    // Else (no user/not authenticated) - return empty or system only?
    // Current behavior returns everything if no userId provided, let's stick to safe defaults.

    const notifications = await performTransaction(async () => {
      if (!db) return [];
      return await db.getAllAsync<any>(query, params);
    });

    return notifications.map((n: any) => ({
      notification_id: n.notification_id,
      user_id: n.user_id,
      type: n.type,
      message: n.message,
      status: n.status,
      created_at: n.created_at,
      read_at: n.read_at,
    }));
  }

  return [];
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const db = getOfflineDB();
  const now = new Date().toISOString();

  // 1. Update local immediately (Optimistic)
  await performTransaction(async () => {
    if (db) {
      try {
        await db.runAsync(`
          UPDATE notifications SET status = 'read', read_at = ? WHERE notification_id = ?
        `, [now, notificationId]);
      } catch (error) {
        console.log('Error updating local notification:', error);
      }
    }
  });

  // 2. Add to sync queue for reliable cloud sync
  await performTransaction(async () => {
    if (db) {
      try {
        const queueId = uuid.v4() as string;
        await db.runAsync(`
          INSERT INTO sync_queue (id, table_name, operation, record_id, data, created_at, synced)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `, [
          queueId,
          'notifications',
          'update',
          notificationId,
          JSON.stringify({ status: 'read', read_at: now }),
          now
        ]);
      } catch (error) {
        console.log('Error queuing notification read status:', error);
      }
    }
  });

  // 3. Trigger background sync
  const online = await isOnline();
  if (online) {
    supabase
      .from('notifications')
      .update({ status: 'read', read_at: now })
      .eq('notification_id', notificationId)
      .then(({ error }) => {
        if (error) console.log('Error marking notification as read online (background):', error);
      });
  }
}

// Create notification
export async function createNotification(notification: {
  user_id?: string | null;
  type: string;
  message: string;
}): Promise<void> {
  const online = await isOnline();
  const db = getOfflineDB();
  const notificationId = uuid.v4() as string;
  const now = new Date().toISOString();

  const notificationData = {
    notification_id: notificationId,
    user_id: notification.user_id || null,
    type: notification.type,
    message: notification.message,
    status: 'unread' as const,
    created_at: now,
    read_at: null,
  };

  // 1. Save to local DB immediately (Always happens)
  await performTransaction(async () => {
    if (db) {
      try {
        await db.runAsync(`
          INSERT INTO notifications (
            notification_id, user_id, type, message, status, created_at, read_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          notificationData.notification_id, notificationData.user_id, notificationData.type,
          notificationData.message, notificationData.status, notificationData.created_at, notificationData.read_at,
        ]);
      } catch (error) {
        console.log('Error saving local notification:', error);
      }
    }
  });

  // 2. Sync with Supabase if online
  if (online) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert(notificationData);

      if (error) throw error;
    } catch (error) {
      console.log('Error syncing notification online:', error);
      // It will stay in local and potentially sync later if there's a sync queue for notifications
      // For now, at least it's in local DB
    }
  }
}

// Get unread count for a user (PURELY LOCAL - does NOT re-fetch from server)
export async function getUnreadCount(userId: string | null, isAdmin: boolean = false): Promise<number> {
  const db = getOfflineDB();

  // Count from local DB only. getNotifications should be called separately on app init.
  const unreadCount = await performTransaction(async () => {
    if (db) {
      try {
        let query = 'SELECT COUNT(*) as count FROM notifications WHERE status = "unread"';
        const params: any[] = [];

        if (!isAdmin && userId) {
          query += ' AND user_id = ?';
          params.push(userId);
        } else if (isAdmin && userId) {
          query += ' AND (user_id IS NULL OR user_id = ?)';
          params.push(userId);
        }

        const result = await db.getAllAsync<any>(query, params);
        return result[0]?.count || 0;
      } catch (error) {
        console.log('Error getting unread count locally:', error);
        return 0;
      }
    }
    return 0;
  });

  if (db) {
    return unreadCount || 0;
  }

  return 0;
}
// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string | null, isAdmin: boolean = false): Promise<void> {
  const db = getOfflineDB();
  const now = new Date().toISOString();

  // 1. Update local immediately
  await performTransaction(async () => {
    if (db) {
      try {
        let updateQuery = 'UPDATE notifications SET status = ?, read_at = ? WHERE status = ?';
        const params: any[] = ['read', now, 'unread'];

        if (!isAdmin && userId) {
          updateQuery += ' AND user_id = ?';
          params.push(userId);
        } else if (isAdmin && userId) {
          updateQuery += ' AND (user_id IS NULL OR user_id = ?)';
          params.push(userId);
        }

        await db.runAsync(updateQuery, params);
      } catch (error) {
        console.log('Error updating local notifications all:', error);
      }
    }
  });

  // 2. Add to sync queue for reliable cloud sync
  await performTransaction(async () => {
    if (db) {
      try {
        const queueId = uuid.v4() as string;
        // Simplified approach: just queue a specialized operation or multiple items
        // For 'mark all', it's cleaner to sync later via specialized sync function
        // But we can add a flag or just wait for global sync to handle it.
        // For now, let's just make sure the individual ones are queued if we want granular,
        // or just let a 'syncPendingNotifications' handle the mass update.
      } catch (error) {
        console.log('Error queuing all notifications read status:', error);
      }
    }
  });

  // 3. Sync with Supabase if online
  const online = await isOnline();
  if (online && userId) {
    try {
      // Mark user-specific notifications as read
      await supabase
        .from('notifications')
        .update({ status: 'read', read_at: now })
        .eq('user_id', userId)
        .eq('status', 'unread');

      // If Admin, also mark System notifications as read
      if (isAdmin) {
        await supabase
          .from('notifications')
          .update({ status: 'read', read_at: now })
          .is('user_id', null)
          .eq('status', 'unread');
      }
    } catch (error) {
      console.log('Error marking all notifications as read online:', error);
    }
  }
}

// Sync unsynced notification statuses to Supabase
export async function syncPendingNotifications(): Promise<void> {
  const online = await isOnline();
  if (!online) return;

  const db = getOfflineDB();
  if (!db) return;

  // Find notifications that are read locally but might not be on server
  // We'll use the sync_queue mostly, but this is a safety check
  const unsyncedResults = await performTransaction(async () => {
    if (!db) return [];
    return await db.getAllAsync<any>(`
      SELECT notification_id, status, read_at FROM notifications 
      WHERE status = 'read' AND synced = 0
    `);
  });

  for (const notif of unsyncedResults) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read', read_at: notif.read_at })
        .eq('notification_id', notif.notification_id);

      if (!error) {
        await performTransaction(async () => {
          if (db) {
            await db.runAsync(
              'UPDATE notifications SET synced = 1 WHERE notification_id = ?',
              [notif.notification_id]
            );
          }
        });
      }
    } catch (err) {
      console.log('Error syncing notification status:', err);
    }
  }
}

// Clear local notifications (for logout)
export async function clearLocalNotifications(): Promise<void> {
  const db = getOfflineDB();
  if (db) {
    await performTransaction(async () => {
      try {
        await db.runAsync('DELETE FROM notifications');
      } catch (error) {
        console.log('Error clearing local notifications:', error);
      }
    });
  }
}

// Permanently delete all notifications for a user
export async function deleteAllNotifications(userId: string | null, isAdmin: boolean = false): Promise<void> {
  const db = getOfflineDB();

  // 1. FORCE delete ALL local notifications (clears the entire local cache)
  // This is the "Clear All" button - it should wipe everything from the local view.
  if (db) {
    await performTransaction(async () => {
      try {
        await db.runAsync('DELETE FROM notifications');
        console.log('✅ All local notifications deleted');
      } catch (error) {
        console.log('❌ Error deleting local notifications:', error);
      }
    });
  }

  // 2. Delete from Supabase if online
  const online = await isOnline();
  if (online && userId) {
    try {
      // Delete user-specific notifications
      const { error: userError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (userError) {
        console.log('❌ Error deleting user notifications from server:', userError);
      } else {
        console.log('✅ User notifications deleted from server');
      }

      // If Admin, also delete System notifications (user_id is null)
      if (isAdmin) {
        const { error: systemError } = await supabase
          .from('notifications')
          .delete()
          .is('user_id', null);

        if (systemError) {
          console.log('❌ Error deleting system notifications from server:', systemError);
        } else {
          console.log('✅ System notifications deleted from server');
        }
      }

    } catch (error) {
      console.log('❌ Error deleting notifications online:', error);
    }
  }
}


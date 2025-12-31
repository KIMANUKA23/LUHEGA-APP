// Offline SQLite Database Layer
// This handles local data storage when offline
import * as SQLite from 'expo-sqlite';

// Initialize SQLite database
let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function initOfflineDB(): Promise<SQLite.SQLiteDatabase> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync('luhega_offline.db');

      // Add busy_timeout to wait for locks to clear before failing
      // Increased to 10 seconds for better resilience during heavy sync
      await db.execAsync('PRAGMA busy_timeout = 10000;');

      // Enable foreign keys and WAL mode for better concurrency
      await db.execAsync(`
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
      `);

      // Create tables
      await createTables();

      // Migrations
      const migrations = [
        'ALTER TABLE users ADD COLUMN photo_url TEXT;',
        'ALTER TABLE users ADD COLUMN address TEXT;',
        'ALTER TABLE users ADD COLUMN emergency_contact TEXT;',
        "ALTER TABLE inventoryaudit ADD COLUMN status TEXT DEFAULT 'in_progress';",
        'ALTER TABLE users ADD COLUMN synced INTEGER DEFAULT 1;',
        "ALTER TABLE spareparts ADD COLUMN status TEXT DEFAULT 'active';"
      ];

      for (const sql of migrations) {
        try {
          await db.execAsync(sql);
        } catch (e) {
          // ignore - column might already exist
        }
      }

      // Pre-create proxy for ensureDatabaseInitialized and getOfflineDB
      await createProxiedDB(db);

      return db;
    } catch (error) {
      console.log('Error initializing offline DB:', error);
      initPromise = null; // Allow retry on failure
      throw error;
    }
  })();

  return initPromise;
}

async function createTables() {
  if (!db) return;

  // Users table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      clerk_id TEXT,
      name TEXT NOT NULL,
      username TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'staff',
      status TEXT DEFAULT 'active',
      created_at TEXT,
      synced INTEGER DEFAULT 1
    );
  `);

  // Spare Parts table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS spareparts (
      part_id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category_id TEXT,
      supplier_id TEXT,
      description TEXT,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      quantity_in_stock INTEGER DEFAULT 0,
      reorder_level INTEGER DEFAULT 0,
      image_url TEXT,
      created_at TEXT,
      updated_at TEXT,
      status TEXT DEFAULT 'active',
      synced INTEGER DEFAULT 1
    );
  `);

  // Sales table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sales (
      sale_id TEXT PRIMARY KEY,
      user_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      sale_type TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      amount_paid REAL DEFAULT 0,
      amount_remaining REAL DEFAULT 0,
      payment_mode TEXT,
      sale_date TEXT,
      notes TEXT,
      synced INTEGER DEFAULT 0,
      created_at TEXT
    );
  `);

  // Sale Items table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS saleitems (
      sale_item_id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      part_id TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      return_status TEXT DEFAULT 'none',
      created_at TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE
    );
  `);

  // Customer Debts table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS customerdebts (
      debt_id TEXT PRIMARY KEY,
      sale_id TEXT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      total_amount REAL NOT NULL,
      amount_paid REAL DEFAULT 0,
      balance_remaining REAL NOT NULL,
      status TEXT DEFAULT 'unpaid',
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    );
  `);

  // Returns table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS returns (
      return_id TEXT PRIMARY KEY,
      sale_item_id TEXT,
      sale_id TEXT,
      user_id TEXT,
      product_id TEXT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reason TEXT NOT NULL,
      condition TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      date_returned TEXT,
      notes TEXT,
      synced INTEGER DEFAULT 0
    );
  `);

  // Purchase Orders table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS purchaseorders (
      po_id TEXT PRIMARY KEY,
      supplier_id TEXT,
      created_by TEXT,
      status TEXT DEFAULT 'pending',
      total_cost REAL DEFAULT 0,
      date_created TEXT,
      expected_date TEXT,
      synced INTEGER DEFAULT 0
    );
  `);

  // Purchase Items table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS purchaseitems (
      po_item_id TEXT PRIMARY KEY,
      po_id TEXT NOT NULL,
      part_id TEXT,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      subtotal REAL NOT NULL,
      created_at TEXT,
      FOREIGN KEY (po_id) REFERENCES purchaseorders(po_id) ON DELETE CASCADE
    );
  `);

  // Suppliers table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS suppliers (
      supplier_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      payment_terms TEXT,
      created_at TEXT,
      synced INTEGER DEFAULT 1
    );
  `);

  // Customers table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      total_purchases INTEGER DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      outstanding_debt INTEGER DEFAULT 0,
      last_visit TEXT,
      synced INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // Categories table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      category_id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT,
      synced INTEGER DEFAULT 1
    );
  `);

  // Notifications table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      created_at TEXT,
      read_at TEXT,
      synced INTEGER DEFAULT 1
    );
  `);

  // Inventory Audit table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS inventoryaudit (
      audit_id TEXT PRIMARY KEY,
      performed_by TEXT,
      part_id TEXT,
      physical_count INTEGER NOT NULL,
      system_count INTEGER NOT NULL,
      adjustment INTEGER NOT NULL,
      reason TEXT,
      audit_date TEXT,
      status TEXT DEFAULT 'in_progress',
      synced INTEGER DEFAULT 0
    );
  `);

  // Feedback table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS feedback (
      feedback_id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      created_at TEXT,
      synced INTEGER DEFAULT 0
    );
  `);

  // Sync Queue table (for pending operations)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      record_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT,
      synced INTEGER DEFAULT 0
    );
  `);

  // Unauthorized Spares table (Incident Reporting)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS unauthorizedspares (
      incident_id TEXT PRIMARY KEY,
      part_id TEXT,
      reported_by TEXT,
      description TEXT,
      photo_url TEXT,
      action_taken TEXT,
      status TEXT DEFAULT 'open',
      date_reported TEXT,
      synced INTEGER DEFAULT 0
    );
  `);
}




// Queue for all DB operations to prevent "database is locked"
let operationQueue = Promise.resolve();
let inTransaction = false;

// Helper to run any DB operation through the queue
async function runQueued<T>(operation: () => Promise<T>, expectTransaction: boolean = false): Promise<T> {
  // If we're already in a transaction, don't wait on the queue (deadlock prevention)
  if (inTransaction) {
    return await operation();
  }

  const result = operationQueue.then(async () => {
    return await operation();
  });

  // Update queue head, catching errors to keep it moving
  operationQueue = result.then(() => { }, () => { });
  return result;
}

/**
 * Standardized transaction helper that ensures serial execution and prevents deadlocks.
 * It uses a global promise queue to serialize access across different callers.
 */
export async function performTransaction<T>(
  callback: () => Promise<T>
): Promise<T> {
  return await runQueued(async () => {
    const database = await getInternalDB();
    let res: T | undefined;

    // Track transaction state for re-entrancy
    const wasInTransaction = inTransaction;
    inTransaction = true;

    try {
      if (wasInTransaction) {
        // Already in a transaction block, just execute the callback
        return await callback();
      } else {
        // Start a new transaction
        await database.withTransactionAsync(async () => {
          res = await callback();
        });
        return res as T;
      }
    } finally {
      inTransaction = wasInTransaction;
    }
  });
}

// Proxied database object to automatically queue operations
let proxiedDb: SQLite.SQLiteDatabase | null = null;

// Internal helper to create the proxy
async function createProxiedDB(database: SQLite.SQLiteDatabase): Promise<SQLite.SQLiteDatabase> {
  if (proxiedDb) return proxiedDb;

  // Create a proxy that intercepts calls and wraps them in runQueued
  proxiedDb = new Proxy(database, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (typeof value === 'function') {
        // Only proxy specific async methods that touch the DB
        const methodsToProxy = ['runAsync', 'getAllAsync', 'getFirstAsync', 'execAsync', 'prepareAsync', 'withTransactionAsync'];
        if (methodsToProxy.includes(prop as string)) {
          return async (...args: any[]) => {
            return await runQueued(async () => {
              return await value.apply(target, args);
            });
          };
        }
      }
      return value;
    }
  }) as SQLite.SQLiteDatabase;

  return proxiedDb;
}

async function getInternalDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    await initOfflineDB();
  }
  return db!;
}

export async function ensureDatabaseInitialized(): Promise<SQLite.SQLiteDatabase> {
  const database = await getInternalDB();
  return await createProxiedDB(database);
}

export function getOfflineDB(): SQLite.SQLiteDatabase | null {
  // We can't return the proxied one here because getOfflineDB is often used 
  // in contexts where it's assumed to be SYNC for the existence check.
  // But we want people to use ensureDatabaseInitialized anyway.
  return proxiedDb || db;
}

export async function clearOfflineDB() {
  const database = await ensureDatabaseInitialized();

  await database.execAsync(`
    DELETE FROM sales WHERE synced = 1;
    DELETE FROM returns WHERE synced = 1;
    DELETE FROM customerdebts WHERE synced = 1;
    DELETE FROM purchaseorders WHERE synced = 1;
    DELETE FROM inventoryaudit WHERE synced = 1;
    DELETE FROM sync_queue WHERE synced = 1;
  `);
}


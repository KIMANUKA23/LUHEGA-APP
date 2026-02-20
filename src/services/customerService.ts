// Customer Service - Manage customers with offline support
import { supabase } from '../lib/supabase';
import { getOfflineDB, performTransaction } from '../lib/database';
import { isOnline } from './syncService';
import uuid from 'react-native-uuid';

export type Customer = {
  id: string; // phone number or email as ID
  name: string;
  phone: string | null;
  email: string | null;
  totalPurchases: number;
  totalOrders: number;
  outstandingDebt: number;
  lastVisit: string;
};

// Generate UUID
function generateId(): string {
  return uuid.v4() as string;
}

// Create new customer
export async function createCustomer(customerData: {
  name: string;
  phone?: string | null;
  email?: string | null;
}): Promise<Customer> {
  const online = await isOnline();
  const db = getOfflineDB();
  const now = new Date().toISOString();
  const customerId = generateId();

  const customer: Customer = {
    id: customerId,
    name: customerData.name,
    phone: customerData.phone || null,
    email: customerData.email || null,
    totalPurchases: 0,
    totalOrders: 0,
    outstandingDebt: 0,
    lastVisit: now,
  };

  if (online) {
    try {
      // Create in Supabase customers table
      const { data, error } = await supabase
        .from('customers')
        .insert({
          id: customerId,
          name: customerData.name,
          phone: customerData.phone || null,
          email: customerData.email || null,
          total_purchases: 0,
          total_orders: 0,
          outstanding_debt: 0,
          last_visit: now,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        // If the customers table doesn't exist yet, don't block the app.
        if ((error as any)?.code === 'PGRST205' || String((error as any)?.message || '').includes("Could not find the table 'public.customers'")) {
          // Fall back to offline save below
          throw new Error('CUSTOMERS_TABLE_MISSING');
        }
        console.log('Error creating customer online:', error);
        throw error;
      }

      // Save to local DB for offline access (skip if no database on web)
      if (db) {
        await performTransaction(async () => {
          await db.runAsync(`
            INSERT INTO customers (
              id, name, phone, email, total_purchases, total_orders,
              outstanding_debt, last_visit, synced, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          `, [
            customerId, customerData.name, customerData.phone || null, customerData.email || null,
            0, 0, 0, now, now
          ]);
        });
      }

      return customer;
    } catch (error) {
      // If customers table is missing, continue with offline-only record.
      if ((error as Error)?.message === 'CUSTOMERS_TABLE_MISSING') {
        // Fall through to offline save
      } else {
        console.log('Error creating customer online:', error);
        throw error;
      }
    }
  }

  // Offline: Save locally
  if (db) {
    try {
      await performTransaction(async () => {
        if (!db) return;
        await db.runAsync(`
          INSERT INTO customers (
            id, name, phone, email, total_purchases, total_orders,
            outstanding_debt, last_visit, synced, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `, [
          customerId, customerData.name, customerData.phone || null, customerData.email || null,
          0, 0, 0, now, now
        ]);
      });

      return customer;
    } catch (error) {
      console.log('Error creating customer offline:', error);
      throw error;
    }
  }

  throw new Error('Failed to create customer');
}

// Get all customers aggregated from sales and debts
export async function getAllCustomers(): Promise<Customer[]> {
  const online = await isOnline();
  const db = getOfflineDB();

  if (online) {
    try {
      // Load customers table (base) + sales + debts and merge into one list.
      const customerMap = new Map<string, Customer>();

      // 1) Customers table
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (customersError) {
        if ((customersError as any)?.code !== 'PGRST116' && (customersError as any)?.code !== 'PGRST205' && !String((customersError as any)?.message || '').includes("Could not find the table 'public.customers'")) {
          console.log('Error fetching customers table:', customersError);
        }
      } else {
        for (const c of customers || []) {
          const key = (c.phone && String(c.phone).trim()) ? String(c.phone).trim() : String(c.id);
          customerMap.set(key, {
            id: String(c.id),
            name: c.name,
            phone: c.phone ?? null,
            email: c.email ?? null,
            totalPurchases: c.total_purchases || 0,
            totalOrders: c.total_orders || 0,
            outstandingDebt: 0,
            lastVisit: c.last_visit || new Date().toISOString(),
          });

          // Save to local DB
          await performTransaction(async () => {
            if (!db) return;
            await db.runAsync(`
              INSERT OR REPLACE INTO customers (
                id, name, phone, email, total_purchases, total_orders, 
                outstanding_debt, last_visit, synced, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            `, [
              String(c.id), c.name, c.phone || null, c.email || null,
              c.total_purchases || 0, c.total_orders || 0,
              c.outstanding_debt || 0, c.last_visit || new Date().toISOString(),
              c.created_at
            ]);
          });
        }
      }

      // 2) Sales (adds totals/orders/lastVisit)
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('sale_id, customer_name, customer_phone, total_amount, amount_remaining, sale_date')
        .not('customer_name', 'is', null)
        .order('sale_date', { ascending: false });

      if (salesError) throw salesError;

      // 3) Debts (only manual ones, linked ones already counted via sales)
      const { data: debts, error: debtsError } = await supabase
        .from('customerdebts')
        .select('customer_name, customer_phone, balance_remaining, sale_id');

      if (debtsError) throw debtsError;

      // Process sales
      for (const sale of sales || []) {
        const phone = sale.customer_phone?.trim() || '';
        const name = sale.customer_name?.trim() || '';
        const customerKey = phone || name;
        if (!customerKey) continue;

        if (!customerMap.has(customerKey)) {
          customerMap.set(customerKey, {
            id: customerKey,
            name: sale.customer_name || 'Unknown',
            phone: sale.customer_phone || null,
            email: null,
            totalPurchases: 0,
            totalOrders: 0,
            outstandingDebt: 0,
            lastVisit: sale.sale_date || new Date().toISOString(),
          });
        }

        const customer = customerMap.get(customerKey)!;
        customer.totalPurchases += sale.total_amount || 0;
        customer.totalOrders += 1;

        // SOURCE OF TRUTH: Unpaid balance from sale record directly
        customer.outstandingDebt += (sale.amount_remaining || 0);

        if (sale.sale_date && sale.sale_date > customer.lastVisit) {
          customer.lastVisit = sale.sale_date;
        }
      }

      // Process manual debts
      for (const debt of debts || []) {
        if (debt.sale_id) continue; // Linked debts were counted in sales loop

        const phone = debt.customer_phone?.trim() || '';
        const name = debt.customer_name?.trim() || '';
        const key = phone || name;
        if (!key) continue;

        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: key,
            name: name || 'Unknown',
            phone: phone || null,
            email: null,
            totalPurchases: 0,
            totalOrders: 0,
            outstandingDebt: debt.balance_remaining || 0,
            lastVisit: new Date().toISOString(),
          });
        } else {
          const customer = customerMap.get(key)!;
          customer.outstandingDebt += debt.balance_remaining || 0;
        }
      }

      return Array.from(customerMap.values());
    } catch (error) {
      console.log('Error fetching customers online:', error);
    }
  }

  // Offline: Read from local DB
  if (db) {
    try {
      const { sales, debts } = await performTransaction(async () => {
        if (!db) return { sales: [], debts: [] };
        const sales = await db.getAllAsync<any>(
          'SELECT customer_name, customer_phone, total_amount, amount_remaining, sale_id, sale_date FROM sales WHERE customer_name IS NOT NULL ORDER BY sale_date DESC'
        );

        const debts = await db.getAllAsync<any>(
          'SELECT customer_name, customer_phone, balance_remaining, sale_id FROM customerdebts'
        );
        return { sales, debts };
      });

      const customerMap = new Map<string, Customer>();

      // Process sales (offline)
      for (const sale of sales || []) {
        const phone = sale.customer_phone?.trim() || '';
        const name = sale.customer_name?.trim() || '';
        const customerKey = phone || name;
        if (!customerKey) continue;

        if (!customerMap.has(customerKey)) {
          customerMap.set(customerKey, {
            id: customerKey,
            name: sale.customer_name || 'Unknown',
            phone: sale.customer_phone || null,
            email: null,
            totalPurchases: 0,
            totalOrders: 0,
            outstandingDebt: 0,
            lastVisit: sale.sale_date || new Date().toISOString(),
          });
        }

        const customer = customerMap.get(customerKey)!;
        customer.totalPurchases += sale.total_amount || 0;
        customer.totalOrders += 1;

        // SOURCE OF TRUTH (offline)
        customer.outstandingDebt += (sale.amount_remaining || 0);

        if (sale.sale_date && sale.sale_date > customer.lastVisit) {
          customer.lastVisit = sale.sale_date;
        }
      }

      // Process manual debts (offline)
      for (const debt of debts || []) {
        if (debt.sale_id) continue;

        const phone = debt.customer_phone?.trim() || '';
        const name = debt.customer_name?.trim() || '';
        const key = phone || name;
        if (!key) continue;

        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: key,
            name: name || 'Unknown',
            phone: phone || null,
            email: null,
            totalPurchases: 0,
            totalOrders: 0,
            outstandingDebt: debt.balance_remaining || 0,
            lastVisit: new Date().toISOString(),
          });
        } else {
          const customer = customerMap.get(key)!;
          customer.outstandingDebt += debt.balance_remaining || 0;
        }
      }

      return Array.from(customerMap.values());
    } catch (error) {
      console.log('Error fetching customers offline:', error);
    }
  }

  return [];
}

// Get single customer by ID or phone
export async function getCustomer(idOrPhone: string): Promise<Customer | null> {
  const customers = await getAllCustomers();
  return customers.find(c => c.id === idOrPhone || c.phone === idOrPhone) || null;
}


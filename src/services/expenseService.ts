import { supabase } from '../lib/supabase';
import { getOfflineDB, ensureDatabaseInitialized, performTransaction } from '../lib/database';
import { isOnline } from './syncService';
import uuid from 'react-native-uuid';

export type Expense = {
    id: string;
    category: string;
    amount: number;
    description: string | null;
    staff_id: string;
    staff_name: string;
    date: string;
    synced: boolean;
};

export const EXPENSE_CATEGORIES = [
    'Food',
    'Transport',
    'Rent',
    'Electricity',
    'Supplies',
    'Salaries',
    'Other'
];

// Create new expense
export async function createExpense(expenseData: {
    category: string;
    amount: number;
    description?: string;
    staff_id: string;
    staff_name: string;
}): Promise<Expense> {
    const online = await isOnline();
    const db = getOfflineDB();
    const now = new Date().toISOString();
    const expenseId = uuid.v4() as string;

    const expense: Expense = {
        id: expenseId,
        category: expenseData.category,
        amount: expenseData.amount,
        description: expenseData.description || null,
        staff_id: expenseData.staff_id,
        staff_name: expenseData.staff_name,
        date: now,
        synced: false,
    };

    if (online) {
        try {
            const { error } = await supabase
                .from('expenses')
                .insert({
                    id: expenseId,
                    category: expenseData.category,
                    amount: expenseData.amount,
                    description: expenseData.description || null,
                    staff_id: expenseData.staff_id,
                    staff_name: expenseData.staff_name,
                    date: now,
                    synced: true,
                });

            if (!error) {
                expense.synced = true;
            } else {
                console.log('Error creating expense online:', error);
            }
        } catch (error) {
            console.log('Network error creating expense:', error);
        }
    }

    // Save locally regardless (will sync later if online fail)
    if (!db) {
        // On web, if online save succeeded, return the expense
        if (expense.synced) {
            return expense;
        }
        // If online failed and no database, throw error
        throw new Error('Cannot create expense offline. Please check your internet connection.');
    }

    try {
        await performTransaction(async () => {
            await db.runAsync(`
          INSERT INTO expenses (
            id, category, amount, description, staff_id, staff_name, date, synced
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                expense.id, expense.category, expense.amount, expense.description,
                expense.staff_id, expense.staff_name, expense.date, expense.synced ? 1 : 0
            ]);
        });
    } catch (error) {
        console.log('Error saving expense locally:', error);
        throw error;
    }

    return expense;
}

// Get all expenses
export async function getAllExpenses(): Promise<Expense[]> {
    const db = await ensureDatabaseInitialized();
    if (!db) return []; // No database on web

    try {
        const result = await db.getAllAsync<any>('SELECT * FROM expenses ORDER BY date DESC');
        return (result || []).map(row => ({
            id: row.id,
            category: row.category,
            amount: row.amount,
            description: row.description,
            staff_id: row.staff_id,
            staff_name: row.staff_name,
            date: row.date,
            synced: !!row.synced,
        }));
    } catch (error) {
        console.log('Error fetching expenses from DB:', error);
        return [];
    }
}

// Update expense (Admin only)
export async function updateExpense(id: string, expenseData: Partial<Expense>): Promise<boolean> {
    const online = await isOnline();
    const db = getOfflineDB();

    if (online) {
        try {
            const { error } = await supabase
                .from('expenses')
                .update({
                    ...expenseData,
                    synced: true
                })
                .eq('id', id);

            if (error) {
                console.log('Error updating expense online:', error);
                return false;
            }
        } catch (error) {
            console.log('Network error updating expense:', error);
            return false;
        }
    }

    if (db) {
        try {
            await performTransaction(async () => {
                if (!db) return;
                const sets = [];
                const values = [];
                for (const [key, value] of Object.entries(expenseData)) {
                    if (key === 'synced' || key === 'id') continue;
                    sets.push(`${key} = ?`);
                    values.push(value);
                }
                sets.push(`synced = ?`);
                values.push(online ? 1 : 0);
                values.push(id);

                await db.runAsync(`UPDATE expenses SET ${sets.join(', ')} WHERE id = ?`, values);
            });
            return true;
        } catch (error) {
            console.log('Error updating expense locally:', error);
            return false;
        }
    }
    return false;
}

// Delete expense (Admin only)
export async function deleteExpense(id: string): Promise<boolean> {
    const online = await isOnline();
    const db = getOfflineDB();

    if (online) {
        try {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

            if (error) {
                console.log('Error deleting expense online:', error);
                return false;
            }
        } catch (error) {
            console.log('Network error deleting expense:', error);
            return false;
        }
    }

    if (db) {
        try {
            await performTransaction(async () => {
                if (!db) return;
                await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
            });
            return true;
        } catch (error) {
            console.log('Error deleting expense locally:', error);
            return false;
        }
    }
    return false;
}

// Sync unsynced expenses
export async function syncExpenses(): Promise<void> {
    const db = await ensureDatabaseInitialized();
    const online = await isOnline();
    if (!online || !db) return;

    try {
        const unsynced = await db.getAllAsync<any>('SELECT * FROM expenses WHERE synced = 0');
        for (const item of unsynced) {
            const { error } = await supabase
                .from('expenses')
                .upsert({
                    id: item.id,
                    category: item.category,
                    amount: item.amount,
                    description: item.description,
                    staff_id: item.staff_id,
                    staff_name: item.staff_name,
                    date: item.date,
                    synced: true,
                });

            if (!error) {
                await performTransaction(async () => {
                    if (db) {
                        await db.runAsync('UPDATE expenses SET synced = 1 WHERE id = ?', [item.id]);
                    }
                });
            }
        }
    } catch (error) {
        console.log('Error syncing expenses:', error);
    }
}

// Database Inspection Script
// Run with: node scripts/inspect-database.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jfrydmnmbelwxbdsuepo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcnlkbW5tYmVsd3hiZHN1ZXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTQ4OTIsImV4cCI6MjA3OTAzMDg5Mn0.2WMQX3dXZveRj2rEvHFpw0QlHq0O1GveWiUWD5Iiy9k';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectDatabase() {
  console.log('🔍 Inspecting Supabase Database...\n');
  console.log('=' .repeat(60));

  try {
    // Check Users
    console.log('\n📊 USERS TABLE:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(10);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
    } else {
      console.log(`✅ Found ${users.length} users`);
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}, Status: ${user.status}`);
      });
    }

    // Check Categories
    console.log('\n📊 CATEGORIES TABLE:');
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .limit(10);
    
    if (catError) {
      console.error('❌ Error fetching categories:', catError.message);
    } else {
      console.log(`✅ Found ${categories.length} categories`);
      categories.forEach(cat => {
        console.log(`   - ${cat.name}`);
      });
    }

    // Check Suppliers
    console.log('\n📊 SUPPLIERS TABLE:');
    const { data: suppliers, error: suppError } = await supabase
      .from('suppliers')
      .select('*')
      .limit(10);
    
    if (suppError) {
      console.error('❌ Error fetching suppliers:', suppError.message);
    } else {
      console.log(`✅ Found ${suppliers.length} suppliers`);
      suppliers.forEach(sup => {
        console.log(`   - ${sup.name} (${sup.phone || 'No phone'})`);
      });
    }

    // Check Spare Parts
    console.log('\n📊 SPARE PARTS TABLE:');
    const { data: parts, error: partsError } = await supabase
      .from('spareparts')
      .select('*')
      .limit(10);
    
    if (partsError) {
      console.error('❌ Error fetching spare parts:', partsError.message);
    } else {
      console.log(`✅ Found ${parts.length} spare parts`);
      parts.forEach(part => {
        console.log(`   - ${part.name} (SKU: ${part.sku}) - Stock: ${part.quantity_in_stock}, Price: TZS ${part.selling_price}`);
      });
    }

    // Check Sales
    console.log('\n📊 SALES TABLE:');
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .limit(10);
    
    if (salesError) {
      console.error('❌ Error fetching sales:', salesError.message);
    } else {
      console.log(`✅ Found ${sales.length} sales`);
      sales.forEach(sale => {
        console.log(`   - ${sale.sale_type.toUpperCase()} Sale: TZS ${sale.total_amount} (${sale.customer_name || 'No customer'})`);
      });
    }

    // Check Debts
    console.log('\n📊 CUSTOMER DEBTS TABLE:');
    const { data: debts, error: debtsError } = await supabase
      .from('customerdebts')
      .select('*')
      .limit(10);
    
    if (debtsError) {
      console.error('❌ Error fetching debts:', debtsError.message);
    } else {
      console.log(`✅ Found ${debts.length} debts`);
      debts.forEach(debt => {
        console.log(`   - ${debt.customer_name}: TZS ${debt.balance_remaining} remaining (Status: ${debt.status})`);
      });
    }

    // Check Returns
    console.log('\n📊 RETURNS TABLE:');
    const { data: returns, error: returnsError } = await supabase
      .from('returns')
      .select('*')
      .limit(10);
    
    if (returnsError) {
      console.error('❌ Error fetching returns:', returnsError.message);
    } else {
      console.log(`✅ Found ${returns.length} returns`);
      returns.forEach(ret => {
        console.log(`   - ${ret.product_name}: Qty ${ret.quantity}, Condition: ${ret.condition}, Status: ${ret.status}`);
      });
    }

    // Check Purchase Orders
    console.log('\n📊 PURCHASE ORDERS TABLE:');
    const { data: pos, error: posError } = await supabase
      .from('purchaseorders')
      .select('*')
      .limit(10);
    
    if (posError) {
      console.error('❌ Error fetching purchase orders:', posError.message);
    } else {
      console.log(`✅ Found ${pos.length} purchase orders`);
      pos.forEach(po => {
        console.log(`   - PO Total: TZS ${po.total_cost}, Status: ${po.status}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Database inspection complete!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the inspection
inspectDatabase();

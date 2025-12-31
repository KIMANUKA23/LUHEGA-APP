// Centralized dummy data for the app
// This simulates a database with all entities

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  supplier: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  quantityInStock: number;
  reorderLevel: number;
  imageUrl?: string;
};

export type Sale = {
  id: string;
  customerName?: string;
  customerPhone?: string;
  saleType: "cash" | "debit";
  totalAmount: number;
  amountPaid: number;
  amountRemaining: number;
  paymentMode: string;
  saleDate: string;
  items: SaleItem[];
  notes?: string;
  staffId?: string; // Track which staff created the sale
};

export type SaleItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  returnStatus: "none" | "partial" | "full";
};

export type Debt = {
  id: string;
  saleId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  amountPaid: number;
  balanceRemaining: number;
  status: "unpaid" | "partial" | "paid";
  createdAt: string;
  updatedAt: string;
};

export type ReturnRequest = {
  id: string;
  saleItemId: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  reason: string;
  condition: "good" | "damaged" | "suspected";
  status: "pending" | "approved" | "rejected";
  dateReturned: string;
  notes?: string;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  supplierName: string;
  status: "pending" | "approved" | "shipped" | "delivered" | "cancelled";
  totalCost: number;
  dateCreated: string;
  expectedDate?: string;
  items: POItem[];
};

export type POItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
};

// Initial dummy data
export const initialProducts: Product[] = [
  {
    id: "1",
    sku: "SKU-001",
    name: "Oil Filter A3",
    category: "Filters",
    supplier: "Auto Parts Co.",
    description: "High-quality oil filter",
    costPrice: 20000,
    sellingPrice: 30000,
    quantityInStock: 15,
    reorderLevel: 10,
  },
  {
    id: "2",
    sku: "SKU-002",
    name: "Spark Plug NGK-BPR6ES",
    category: "Engine Parts",
    supplier: "NGK Ltd",
    description: "Premium spark plug",
    costPrice: 9000,
    sellingPrice: 13500,
    quantityInStock: 120,
    reorderLevel: 50,
  },
  {
    id: "3",
    sku: "SKU-003",
    name: "Brake Pads Set - Front",
    category: "Brake Systems",
    supplier: "BrakeTech Inc",
    description: "High-performance brake pads",
    costPrice: 80000,
    sellingPrice: 115000,
    quantityInStock: 32,
    reorderLevel: 20,
  },
  {
    id: "4",
    sku: "SKU-004",
    name: "Air Filter - Engine",
    category: "Filters",
    supplier: "AirFlo Co.",
    description: "Efficient air filtration",
    costPrice: 35000,
    sellingPrice: 53750,
    quantityInStock: 50,
    reorderLevel: 25,
  },
  {
    id: "5",
    sku: "SKU-005",
    name: "Synthetic Motor Oil 5W-30",
    category: "Fluids",
    supplier: "Lubricants Pro",
    description: "Premium synthetic oil",
    costPrice: 55000,
    sellingPrice: 81250,
    quantityInStock: 88,
    reorderLevel: 40,
  },
  {
    id: "6",
    sku: "SKU-006",
    name: "Car Battery - 12V 65Ah",
    category: "Electrical",
    supplier: "BatteryMax",
    description: "High-capacity car battery",
    costPrice: 220000,
    sellingPrice: 300000,
    quantityInStock: 15,
    reorderLevel: 10,
  },
  {
    id: "7",
    sku: "SKU-007",
    name: "Wiper Blades Set",
    category: "Electrical",
    supplier: "WiperTech",
    description: "Premium wiper blades",
    costPrice: 25000,
    sellingPrice: 40000,
    quantityInStock: 5, // Low stock - below reorder level
    reorderLevel: 10,
  },
];

export const initialSales: Sale[] = [];

export const initialDebts: Debt[] = [];

export const initialReturns: ReturnRequest[] = [];

export const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: "PO-00123",
    supplierId: "1",
    supplierName: "AutoParts Inc.",
    status: "pending",
    totalCost: 1500000,
    dateCreated: "2023-10-25",
    items: [
      { id: "1", productId: "1", productName: "Oil Filter A3", quantity: 50, unitCost: 20000, subtotal: 1000000 },
      { id: "2", productId: "2", productName: "Spark Plug NGK-BPR6ES", quantity: 20, unitCost: 9000, subtotal: 180000 },
      { id: "3", productId: "3", productName: "Brake Pads Set - Front", quantity: 10, unitCost: 80000, subtotal: 800000 },
    ],
  },
];

// Helper to generate IDs
let saleIdCounter = 1;
let debtIdCounter = 1;
let returnIdCounter = 1;

export const generateSaleId = () => `SALE-${String(saleIdCounter++).padStart(4, "0")}`;
export const generateDebtId = () => `DEBT-${String(debtIdCounter++).padStart(4, "0")}`;
export const generateReturnId = () => `RET-${String(returnIdCounter++).padStart(4, "0")}`;


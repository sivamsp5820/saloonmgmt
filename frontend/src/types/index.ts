export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'billing';
}

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration?: number;
  description?: string;
  is_active?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  visits?: number;
  totalSpent?: number;
  lastVisit?: string | null;
}

export interface TransactionService {
  id?: string;
  name: string;
  price: number;
}

export interface Transaction {
  id: string;
  created_at: string;
  customerName: string;
  customerPhone?: string;
  customerId?: string | null;
  subtotal: number;
  discount_type: 'percent' | 'rupees';
  discount_value: number;
  discount_amount: number;
  total: number;
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Net Banking';
  billedBy: string;
  billedByName: string;
  services: TransactionService[];
}

export interface Expense {
  id: string;
  description: string;
  category: 'Product Purchase' | 'Utilities' | 'Maintenance' | 'Salary' | 'Rent' | 'Marketing' | 'Other';
  amount: number;
  payment_mode: 'Cash' | 'UPI' | 'Card' | 'Net Banking';
  note?: string;
  created_at: string;
  recorded_by: string;
  recordedByName: string;
}

export interface DashboardStats {
  netRevenue: number;
  transactionsCount: number;
  customersCount: number;
  totalServicesCount: number;
  revenueByService: { serviceName: string; value: number }[];
  revenueTrend: { label: string; value: number }[];
  recentTransactions: {
    id: string;
    created_at: string;
    customerName: string;
    services: string;
    billedByName: string;
    total: number;
    paymentMode: string;
  }[];
}

export interface PaymentStats {
  grandTotal: number;
  stats: {
    paymentMode: string;
    total: number;
    count: number;
    percentage: number;
    avg: number;
  }[];
  detailedTx: {
    id: string;
    created_at: string;
    customerName: string;
    services: string;
    total: number;
    paymentMode: string;
    billedByName: string;
  }[];
}

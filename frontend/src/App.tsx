import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminSales } from './pages/AdminSales';
import { AdminCustomers } from './pages/AdminCustomers';
import { AdminExpenses } from './pages/AdminExpenses';
import { AdminPayments } from './pages/AdminPayments';
import { AdminServices } from './pages/AdminServices';
import { AdminStaff } from './pages/AdminStaff';

import { BillingTerminal } from './pages/BillingTerminal';
import { BillingExpenses } from './pages/BillingExpenses';
import { BillingServices } from './pages/BillingServices';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Access */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Administrator routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/sales" element={<AdminSales />} />
              <Route path="/admin/customers" element={<AdminCustomers />} />
              <Route path="/admin/expenses" element={<AdminExpenses />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/services" element={<AdminServices />} />
              <Route path="/admin/staff" element={<AdminStaff />} />
            </Route>
          </Route>

          {/* Protected Billing Staff workstation routes */}
          <Route element={<ProtectedRoute allowedRoles={['billing']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/billing/terminal" element={<BillingTerminal />} />
              <Route path="/billing/expenses" element={<BillingExpenses />} />
              <Route path="/billing/services" element={<BillingServices />} />
            </Route>
          </Route>

          {/* Root Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

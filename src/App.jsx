// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SuccessModalProvider } from './context/SuccessModalContext';
import { ErrorProvider } from './context/ErrorContext';
import { LoadingProvider } from './context/LoadingContext';
import { NotificationProvider } from './context/NotificationContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Riders from './pages/Riders';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Products from './pages/Products';
import Login from './pages/Login';
import Register from './pages/Register';
import LoadingSpinner from './components/common/LoadingSpinner';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { GlobalLoader } from './components/common/GlobalLoader';
import { GlobalErrorDisplay } from './components/common/ErrorDisplay';
// NOTE: Deleted the RouteForce import

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, error, timeoutReached } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage />;
  }
  
  if (timeoutReached || error) {
    return (
      <LoadingSpinner 
        fullPage 
        error={error || "Authentication timeout. Please check your connection and refresh."} 
      />
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <ErrorProvider>
        <LoadingProvider>
          <AuthProvider>
            <NotificationProvider>
              <BrowserRouter>
                <SuccessModalProvider>
                  <GlobalLoader />
                  <GlobalErrorDisplay />
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    <Route path="/" element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }>
                      {/* NOTE: Removed all <RouteForce> wrappers */}
                      <Route index element={<Dashboard />} />
                      <Route path="orders" element={<Orders />} />
                      <Route path="products" element={<Products />} />
                      <Route path="customers" element={<Customers />} />
                      <Route path="riders" element={<Riders />} />
                      <Route path="reports" element={<Reports />} />
                      <Route path="audit-logs" element={<AuditLogs />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </SuccessModalProvider>
              </BrowserRouter>
            </NotificationProvider>
          </AuthProvider>
        </LoadingProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
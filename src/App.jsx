// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SuccessModalProvider } from './context/SuccessModalContext';
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
import RouteForce from './components/RouteForce';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SuccessModalProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={
                  <RouteForce>
                    <Dashboard />
                  </RouteForce>
                } />
                <Route path="orders" element={
                  <RouteForce>
                    <Orders />
                  </RouteForce>
                } />
                <Route path="products" element={
                  <RouteForce>
                    <Products />
                  </RouteForce>
                } />
                <Route path="customers" element={
                  <RouteForce>
                    <Customers />
                  </RouteForce>
                } />
                <Route path="riders" element={
                  <RouteForce>
                    <Riders />
                  </RouteForce>
                } />
                <Route path="reports" element={
                  <RouteForce>
                    <Reports />
                  </RouteForce>
                } />
                <Route path="audit-logs" element={
                  <RouteForce>
                    <AuditLogs />
                  </RouteForce>
                } />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SuccessModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
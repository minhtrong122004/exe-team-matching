import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            border: '4px solid #f26f21', 
            borderTopColor: 'transparent', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px auto' 
          }} />
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Đang tải hệ thống...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>403 — Không có quyền truy cập</h2>
        <p style={{ color: '#64748b' }}>Tài khoản của bạn ({user.role}) không có quyền truy cập vào chức năng này.</p>
      </div>
    );
  }

  return <Outlet />;
};

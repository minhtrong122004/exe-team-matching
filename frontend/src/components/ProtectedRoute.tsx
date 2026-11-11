import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main, #f8fafc)' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            className="spinner-smooth"
            style={{
              width: 38,
              height: 38,
              border: '3.5px solid var(--accent-soft, rgba(242, 111, 33, 0.2))',
              borderTopColor: 'var(--accent-color, #f26f21)',
              borderRadius: '50%',
              margin: '0 auto 12px auto',
            }}
          />
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem', fontWeight: 500 }}>Đang tải hệ thống...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="card" style={{ maxWidth: 480, margin: '3rem auto', padding: '2.25rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem' }}>
          403 — Không có quyền truy cập
        </h2>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.925rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Tài khoản của bạn ({user.role}) không có quyền truy cập vào chức năng này.
        </p>
        <Link to="/" className="btn btn-primary" style={{ borderRadius: 10 }}>
          Quay về trang chính
        </Link>
      </div>
    );
  }

  return <Outlet />;
};

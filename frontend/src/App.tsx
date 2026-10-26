import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/Layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { CandidateDiscoveryPage } from './pages/CandidateDiscoveryPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminAccountsPage } from './pages/AdminAccountsPage';
import {
  GroupsPage,
  MyGroupPage,
  JoinRequestsPage,
  InvitationsPage,
  NotificationsPage,
  ReportsPage,
} from './pages/PlaceholderPages';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Application routes wrapped in MainLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/projects" replace />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/candidates" element={<CandidateDiscoveryPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Student specific routes */}
              <Route element={<ProtectedRoute allowedRoles={['Student']} />}>
                <Route path="/my-group" element={<MyGroupPage />} />
                <Route path="/join-requests" element={<JoinRequestsPage />} />
                <Route path="/invitations" element={<InvitationsPage />} />
              </Route>

              {/* Lecturer and Admin reports */}
              <Route element={<ProtectedRoute allowedRoles={['Lecturer', 'Admin']} />}>
                <Route path="/reports" element={<ReportsPage />} />
              </Route>

              {/* Admin specific accounts management */}
              <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                <Route path="/admin/accounts" element={<AdminAccountsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

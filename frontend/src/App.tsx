import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/Layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { CandidateDiscoveryPage } from './pages/CandidateDiscoveryPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminAccountsPage } from './pages/AdminAccountsPage';
import { ModeratorSpacesPage } from './pages/moderator/ModeratorSpacesPage';
import { ModeratorDistributionPage } from './pages/moderator/ModeratorDistributionPage';
import { ModeratorTransfersPage } from './pages/moderator/ModeratorTransfersPage';
import { LecturerDashboardPage } from './pages/lecturer/LecturerDashboardPage';
import {
  GroupsPage,
  MyGroupPage,
  JoinRequestsPage,
  NotificationsPage,
  ReportsPage,
} from './pages/PlaceholderPages';

const RootRedirect: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'Moderator') {
    return <Navigate to="/moderator/spaces" replace />;
  }
  if (user?.role === 'Lecturer') {
    return <Navigate to="/lecturer/dashboard" replace />;
  }
  return <Navigate to="/groups" replace />;
};

const SpacesRoute: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'Moderator') return <Navigate to="/moderator/spaces" replace />;
  if (user?.role === 'Lecturer') return <Navigate to="/lecturer/dashboard" replace />;
  return <Navigate to="/groups" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <Routes>
            {/* Public Authentication routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/verify-email" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
          <Route path="/reset-password" element={<Navigate to="/login" replace />} />

          {/* Protected Application routes wrapped in MainLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/spaces" element={<SpacesRoute />} />
              <Route path="/candidates" element={<CandidateDiscoveryPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Student specific routes */}
              <Route element={<ProtectedRoute allowedRoles={['Student']} />}>
                <Route path="/my-group" element={<MyGroupPage />} />
                <Route path="/join-requests" element={<JoinRequestsPage />} />
              </Route>

              {/* Lecturer and Moderator reports & dashboard */}
              <Route element={<ProtectedRoute allowedRoles={['Lecturer', 'Moderator']} />}>
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/lecturer/dashboard" element={<LecturerDashboardPage />} />
              </Route>

              {/* Moderator accounts, spaces and distribution */}
              <Route element={<ProtectedRoute allowedRoles={['Moderator']} />}>
                <Route path="/admin/accounts" element={<AdminAccountsPage />} />
                <Route path="/moderator/spaces" element={<ModeratorSpacesPage />} />
                <Route path="/moderator/distribution" element={<ModeratorDistributionPage />} />
                <Route path="/moderator/transfers" element={<ModeratorTransfersPage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </RealtimeProvider>
    </AuthProvider>
  </BrowserRouter>
  );
};

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/Layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { CandidateDiscoveryPage } from './pages/CandidateDiscoveryPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminAccountsPage } from './pages/AdminAccountsPage';
import { CourseSpacesPage } from './pages/CourseSpacesPage';
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
    return <Navigate to="/spaces" replace />;
  }
  if (user?.role === 'Lecturer') {
    return <Navigate to="/spaces" replace />;
  }
  return <Navigate to="/spaces" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application routes wrapped in MainLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/spaces" element={<CourseSpacesPage />} />
              <Route path="/candidates" element={<CandidateDiscoveryPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Student specific routes */}
              <Route element={<ProtectedRoute allowedRoles={['Student']} />}>
                <Route path="/my-group" element={<MyGroupPage />} />
                <Route path="/join-requests" element={<JoinRequestsPage />} />
              </Route>

              {/* Lecturer and Moderator reports */}
              <Route element={<ProtectedRoute allowedRoles={['Lecturer', 'Moderator']} />}>
                <Route path="/reports" element={<ReportsPage />} />
              </Route>

              {/* Moderator accounts and FAP student provisioning */}
              <Route element={<ProtectedRoute allowedRoles={['Moderator']} />}>
                <Route path="/admin/accounts" element={<AdminAccountsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

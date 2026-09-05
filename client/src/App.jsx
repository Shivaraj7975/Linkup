import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import { RequireCompletedProfile } from './components/RequireCompletedProfile';
import { AdminRoute } from './components/AdminRoute';
import { ScrollToTop } from './components/ScrollToTop';
import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { DiscoverMeldsPage } from './pages/DiscoverMeldsPage';
import { CreateMeldPage } from './pages/CreateMeldPage';
import { MeldDetailsPage } from './pages/MeldDetailsPage';
import { ManageMeldPage } from './pages/ManageMeldPage';
import { EditMeldPage } from './pages/EditMeldPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { InvitationsPage } from './pages/InvitationsPage';
import NotificationsPage from './pages/NotificationsPage';
import { AdminPage } from './pages/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ThemeProvider>
        <AuthProvider>
          <Routes>
          <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
          <Route path="/discover" element={<RequireCompletedProfile><DiscoverMeldsPage /></RequireCompletedProfile>} />
          <Route path="/melds/:id" element={<RequireCompletedProfile><MeldDetailsPage /></RequireCompletedProfile>} />
          <Route path="/linkups/:id" element={<RequireCompletedProfile><MeldDetailsPage /></RequireCompletedProfile>} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-melds"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invitations"
            element={
              <ProtectedRoute>
                <InvitationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:userId"
            element={
              <ProtectedRoute>
                <UserProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-meld"
            element={
              <ProtectedRoute>
                <CreateMeldPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-linkup"
            element={
              <ProtectedRoute>
                <CreateMeldPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/melds/:id/manage"
            element={
              <ProtectedRoute>
                <ManageMeldPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/linkups/:id/manage"
            element={
              <ProtectedRoute>
                <ManageMeldPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/melds/:id/edit"
            element={
              <ProtectedRoute>
                <EditMeldPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/linkups/:id/edit"
            element={
              <ProtectedRoute>
                <EditMeldPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

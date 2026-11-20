import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import { RequireCompletedProfile } from './components/RequireCompletedProfile';
import { AdminRoute } from './components/AdminRoute';
import { ScrollToTop } from './components/ScrollToTop';
import { ErrorBoundary } from './components/ErrorBoundary';
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const DiscoverMeldsPage = lazy(() => import('./pages/DiscoverMeldsPage').then((m) => ({ default: m.DiscoverMeldsPage })));
const CreateMeldPage = lazy(() => import('./pages/CreateMeldPage').then((m) => ({ default: m.CreateMeldPage })));
const MeldDetailsPage = lazy(() => import('./pages/MeldDetailsPage').then((m) => ({ default: m.MeldDetailsPage })));
const ManageMeldPage = lazy(() => import('./pages/ManageMeldPage').then((m) => ({ default: m.ManageMeldPage })));
const EditMeldPage = lazy(() => import('./pages/EditMeldPage').then((m) => ({ default: m.EditMeldPage })));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage').then((m) => ({ default: m.UserProfilePage })));
const InvitationsPage = lazy(() => import('./pages/InvitationsPage').then((m) => ({ default: m.InvitationsPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

// Route-level code splitting: each page is loaded on demand so the initial
// bundle only contains the shell (router, auth, theme) plus the visited page.
const PageFallback = () => (
  <div className="page-loader" role="status" aria-live="polite">
    <div className="loader-spinner" />
    <p>Loading...</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ThemeProvider>
        <ErrorBoundary>
          <AuthProvider>
            <Suspense fallback={<PageFallback />}>
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
            </Suspense>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

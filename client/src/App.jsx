import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
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
import { AdminPage } from './pages/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/discover" element={<DiscoverMeldsPage />} />
          <Route path="/melds/:id" element={<MeldDetailsPage />} />
          <Route path="/linkups/:id" element={<MeldDetailsPage />} />
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
    </BrowserRouter>
  );
}

export default App;

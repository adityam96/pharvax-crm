import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import InactiveUserPage from './components/InactiveUserPage';

function AppContent() {
  const { user, userProfile, loading } = useAuth();

  // Debug logging
  console.log('App render - user:', user?.email || 'null', 'loading:', loading, 'userProfile:', userProfile?.role || 'null')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is inactive
  if (user && userProfile && userProfile.is_active === false) {
    return <InactiveUserPage />;
  }
  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
        <Route path="/signup" element={!user ? <SignUpPage /> : <Navigate to="/dashboard" />} />
        <Route path="/forgot-password" element={!user ? <ForgotPasswordPage /> : <Navigate to="/dashboard" />} />
        <Route path="/reset-password" element={!user ? <ResetPasswordPage /> : <Navigate to="/dashboard" />} />
        <Route
          path="/dashboard"
          element={
            user ? (
              <DashboardRouter user={user} userProfile={userProfile} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/dashboard/*" element={
          user ? (
            <DashboardRouter user={user} userProfile={userProfile} />
          ) : (
            <Navigate to="/login" />
          )
        } />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

// Dashboard Router Component
function DashboardRouter({ user, userProfile }: { user: any, userProfile: any }) {
  // Determine user type based on profile or email
  // while (!userProfile) true; // Wait until userProfile is loaded
  const isAdmin = userProfile?.role === 'admin';

  const userData = {
    email: user.email,
    name: userProfile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    role: userProfile?.role || (isAdmin ? 'Administrator' : 'Sales Representative')
  };

  console.log('User data:', userData);
  console.log('Is admin:', isAdmin);
  console.log('User profile:', userProfile);

  return isAdmin ? (
    <AdminDashboard userData={userData} />
  ) : (
    <EmployeeDashboard userData={userData} />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
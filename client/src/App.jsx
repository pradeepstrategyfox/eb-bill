import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import SetupWizard from './pages/SetupWizard';
import Insights from './pages/Insights';
import MeterReading from './pages/MeterReading';
import BillExplanation from './pages/BillExplanation';

// Protected Route Component
function ProtectedRoute({ session, children, loading }) {
  if (loading) return null;
  return session ? children : <Navigate to="/login" />;
}

// Public Route Component
function PublicRoute({ session, children, loading }) {
  if (loading) return null;
  return session ? <Navigate to="/dashboard" /> : children;
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // Determine theme: localStorage > system preference > default 'light'
    const getInitialTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme;
      
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    };
    
    document.documentElement.setAttribute('data-theme', getInitialTheme());

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null; // Or a global spinner
  return (
    <>
    <Toaster position="top-center" reverseOrder={false} />
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute session={session} loading={loading}>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute session={session} loading={loading}>
            <Signup />
          </PublicRoute>
        }
      />
      <Route
        path="/setup"
        element={
          <ProtectedRoute session={session} loading={loading}>
            <SetupWizard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute session={session} loading={loading}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <ProtectedRoute session={session} loading={loading}>
            <Insights />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meter-reading"
        element={
          <ProtectedRoute session={session} loading={loading}>
            <MeterReading />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bill-explanation"
        element={
          <ProtectedRoute session={session} loading={loading}>
            <BillExplanation />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
    </>
  );
}

export default App;

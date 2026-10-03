import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from './ui';
import { supabase } from '../lib/supabase';

/**
 * Protects a route based on authentication and optional role.
 * @param {Object} props
 * @param {React.ReactNode} props.children - The page to render if authorized
 * @param {'teacher'|'student'} [props.role] - Optional required role
 */
const ProtectedRoute = ({ children, role }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <Spinner size={36} />
        <p className="text-muted" style={{ marginTop: '16px' }}>جاري التحميل...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    // If not loading anymore but still no profile, account is corrupted
    if (!loading) {
      return (
        <div className="page-loader flex-col gap-4 text-center">
          <p className="text-danger font-bold">الحساب ده غير مكتمل (البيانات ناقصة)</p>
          <p className="text-muted">حصل مشكلة وقت التسجيل. يرجى تسجيل الخروج وعمل حساب جديد.</p>
          <button 
            className="btn btn-outline" 
            onClick={() => supabase.auth.signOut().then(() => window.location.href='/auth')}
          >
            تسجيل الخروج
          </button>
        </div>
      );
    }

    return (
      <div className="page-loader">
        <Spinner size={36} />
        <p className="text-muted" style={{ marginTop: '16px' }}>جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (role && profile.role !== role) {
    // Redirect to appropriate dashboard
    if (profile.role === 'teacher') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/student" replace />;
  }

  return children;
};

export default ProtectedRoute;

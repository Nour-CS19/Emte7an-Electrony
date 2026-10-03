import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { Spinner } from './components/ui';

// Lazy load pages for better performance (code splitting)
const Landing = React.lazy(() => import('./pages/Landing'));
const Auth = React.lazy(() => import('./pages/Auth'));
const TeacherDashboard = React.lazy(() => import('./pages/TeacherDashboard'));
const CreateExam = React.lazy(() => import('./pages/CreateExam'));
const ExamResults = React.lazy(() => import('./pages/ExamResults'));
const StudentPortal = React.lazy(() => import('./pages/StudentPortal'));
const TakeExam = React.lazy(() => import('./pages/TakeExam'));
const ReviewExam = React.lazy(() => import('./pages/ReviewExam'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const PaymentCallback = React.lazy(() => import('./pages/PaymentCallback'));

const PageLoader = () => (
  <div className="page-loader">
    <Spinner size={36} />
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />

                  {/* Teacher Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute role="teacher">
                        <TeacherDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/create-exam"
                    element={
                      <ProtectedRoute role="teacher">
                        <CreateExam />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/edit-exam/:examId"
                    element={
                      <ProtectedRoute role="teacher">
                        <CreateExam isEditing={true} />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/exam/:examId/results"
                    element={
                      <ProtectedRoute role="teacher">
                        <ExamResults />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payment-callback"
                    element={
                      <ProtectedRoute role="teacher">
                        <PaymentCallback />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Student Routes */}
                  <Route
                    path="/student"
                    element={
                      <ProtectedRoute role="student">
                        <StudentPortal />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/take-exam/:code"
                    element={
                      <ProtectedRoute role="student">
                        <TakeExam />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/review-exam/:submissionId"
                    element={
                      <ProtectedRoute role="student">
                        <ReviewExam />
                      </ProtectedRoute>
                    }
                  />

                  {/* 404 catch-all */}
                  <Route path="*" element={
                    <div className="page-loader">
                      <h2>404 — الصفحة غير موجودة</h2>
                      <p className="text-muted mt-4">الصفحة اللي بتدور عليها مش موجودة.</p>
                    </div>
                  } />
                </Routes>
              </Suspense>
            </main>

            <footer className="footer">
              امتحان أونلاين © {new Date().getFullYear()} — كل الحقوق محفوظة.
            </footer>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

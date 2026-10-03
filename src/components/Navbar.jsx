import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Sun, Moon, LogOut, LayoutDashboard, Menu, X, ShieldCheck, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui';
import SettingsModal from './SettingsModal';

const Navbar = () => {
  const { user, profile, signOut, isTeacher: authIsTeacher, isStudent: authIsStudent } = useAuth();
  const isTeacher = authIsTeacher && !profile?.is_super_admin;
  const isStudent = authIsStudent && !profile?.is_super_admin;
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <BookOpen size={24} className="text-brand" />
        <span>امتحان أونلاين</span>
      </Link>

      {/* Mobile toggle */}
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="القائمة">
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`nav-links ${mobileOpen ? 'nav-links-open' : ''}`}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={darkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}
          title={darkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span className="mobile-text">{darkMode ? 'تفعيل الوضع المضيء' : 'تفعيل الوضع المظلم'}</span>
        </button>

        {user && profile ? (
          <>
            {isTeacher && (
              <Link to="/dashboard" className="nav-link" onClick={() => setMobileOpen(false)}>
                <LayoutDashboard size={18} />
                <span>لوحة التحكم</span>
              </Link>
            )}
            {isStudent && (
              <Link to="/student" className="nav-link" onClick={() => setMobileOpen(false)}>
                <BookOpen size={18} />
                <span>ادخل امتحان</span>
              </Link>
            )}

            {profile.is_super_admin && (
              <Link to="/admin" className="nav-link" onClick={() => setMobileOpen(false)}>
                <ShieldCheck size={18} />
                <span>الإدارة</span>
              </Link>
            )}

            {isStudent && (
              <>
                <button 
                  className="nav-link mobile-only-btn"
                  onClick={() => { setMobileOpen(false); setIsSettingsOpen(true); }}
                  title="إعدادات الحساب"
                >
                  <Settings size={18} />
                  <span>إعدادات الحساب</span>
                </button>
                <button 
                  className="nav-link mobile-only-btn"
                  onClick={handleSignOut} 
                  title="تسجيل الخروج"
                  style={{ color: 'var(--danger)', fontWeight: 'bold' }}
                >
                  <LogOut size={18} style={{ transform: 'rotate(180deg)' }} />
                  <span>تسجيل الخروج</span>
                </button>
              </>
            )}

            <div className="user-pill">
              <img 
                src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.full_name}&backgroundColor=f26b38`} 
                alt="Avatar" 
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div className="user-pill-info">
                <span className="user-pill-name">
                  {profile.full_name}
                </span>
                <span className="user-pill-role">
                  {profile.is_super_admin ? 'مدير عام' : (isTeacher ? 'مدرس' : 'طالب')}
                </span>
              </div>
              {isStudent && (
                <>
                  <button 
                    className="user-pill-logout desktop-only-flex"
                    onClick={() => setIsSettingsOpen(true)} 
                    title="إعدادات الحساب"
                    style={{ marginLeft: '4px', color: 'var(--text-muted)' }}
                  >
                    <Settings size={18} />
                  </button>
                  <button 
                    className="user-pill-logout desktop-only-flex"
                    onClick={handleSignOut} 
                    title="تسجيل الخروج"
                    style={{ color: 'var(--danger)' }}
                  >
                    <LogOut size={18} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/auth" state={{ role: 'teacher' }} className="btn btn-ghost" onClick={() => setMobileOpen(false)}>
              تسجيل الدخول
            </Link>
            <Link to="/auth" state={{ role: 'teacher' }} className="btn btn-primary" onClick={() => setMobileOpen(false)}>
              حساب مجاني
            </Link>
          </>
        )}
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </nav>
  );
};

export default Navbar;

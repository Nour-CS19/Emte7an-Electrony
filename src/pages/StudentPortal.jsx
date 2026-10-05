import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Spinner } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { Search, Clock, FileText, CheckCircle2, History, XCircle, LayoutDashboard, Settings, LogOut, User, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SettingsModal from '../components/SettingsModal';

const StudentPortal = () => {
  const [code, setCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    fetchSubmissions();
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggleMobileSidebar', handleToggle);
    return () => window.removeEventListener('toggleMobileSidebar', handleToggle);
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          total_score,
          max_score,
          submitted_at,
          status,
          exams (
            title
          )
        `)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      toast.error('حدث خطأ أثناء تحميل الامتحانات السابقة.');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleStartExam = async (e) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();

    if (trimmedCode.length !== 6) {
      toast.error('الرجاء إدخال كود صحيح مكون من 6 رموز');
      return;
    }

    setLoadingCode(true);

    try {
      const { data, error } = await supabase.rpc('get_exam_for_student', {
        p_code: trimmedCode,
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (!data?.exam) {
        toast.error('كود الامتحان غير صحيح');
        return;
      }

      navigate(`/take-exam/${trimmedCode}`, {
        state: {
          exam: data.exam,
          questions: data.questions,
        },
      });
    } catch (err) {
      console.error('Error:', err);
      toast.error('حدث خطأ. تحقق من الكود وحاول مرة أخرى.');
    } finally {
      setLoadingCode(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('ar-EG', options);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
        <div style={{ padding: '0 12px 24px', borderBottom: '1px solid var(--border-color)', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <img 
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name}&backgroundColor=f26b38`}
              alt="Avatar"
              style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--border-color)', objectFit: 'cover' }}
            />
            <div className="sidebar-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                لوحة الطالب
                <User size={16} style={{ color: 'var(--brand-primary)' }} />
              </h2>
              <p className="text-muted" style={{ fontSize: '13px', margin: '2px 0 0' }}>{profile?.full_name}</p>
            </div>
          </div>
          
          <div className="sidebar-text" style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{ background: 'var(--info-soft)', color: 'var(--info)', padding: '6px 16px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 'bold', width: '100%', textAlign: 'center' }}>
              حساب طالب
            </span>
          </div>
        </div>

        <button 
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
            background: 'var(--brand-soft)', color: 'var(--brand-primary)', fontWeight: '700',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'right'
          }}
        >
          <LayoutDashboard size={20} />
          <span className="sidebar-text">نظرة عامة</span>
        </button>

        <div className="spacer" style={{ flex: 1 }}></div>

        <button 
          className="nav-link"
          onClick={() => setIsSettingsOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
            background: 'transparent', color: 'var(--text-primary)', fontWeight: '600',
            border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'right'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          <Settings size={18} />
          <span className="sidebar-text">إعدادات الحساب</span>
        </button>

        <button 
          className="nav-link"
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
            background: 'var(--danger-soft)', color: 'var(--danger)', fontWeight: '600',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'right', marginTop: '8px'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--danger-soft)'; e.currentTarget.style.color = 'var(--danger)'; }}
        >
          <LogOut size={18} style={{ transform: 'rotate(180deg)' }} />
          <span className="sidebar-text">تسجيل الخروج</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }} className="animate-fade-in">
          
          {/* Header Actions */}
          <div className="dashboard-header-actions flex justify-between items-center mb-8" style={{ flexWrap: 'wrap', gap: '16px' }}>
            <div className="flex items-center gap-3">
              <button 
                className="btn btn-ghost desktop-only-flex" 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                style={{ padding: '8px', color: 'var(--text-muted)' }}
              >
                <Menu size={24} />
              </button>
              <h1 className="text-2xl font-bold m-0">الرئيسية</h1>
            </div>
          </div>

          <div 
            style={{
              background: 'var(--brand-gradient)',
              borderRadius: '24px',
              padding: '40px',
              color: 'white',
              marginBottom: '32px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <div style={{ position: 'relative', zIndex: 2 }}>
              <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px', color: 'white' }}>
                مرحباً بك يا {profile?.full_name?.split(' ')[0]} 👋
              </h2>
              <p style={{ fontSize: '1.1rem', opacity: 0.9, color: 'white' }}>
                هل أنت مستعد لتحدي جديد؟ أدخل كود الامتحان لتبدأ!
              </p>
            </div>
            {/* Background decorative elements */}
            <div style={{
              position: 'absolute', top: '-20px', left: '-20px', width: '150px', height: '150px',
              background: 'rgba(255,255,255,0.1)', borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute', bottom: '-50px', left: '20%', width: '200px', height: '200px',
              background: 'rgba(255,255,255,0.05)', borderRadius: '50%'
            }} />
          </div>

          <div className="student-grid" style={{ gap: '24px' }}>
            
            {/* Exam Code Entry */}
            <div>
              <Card className="text-center" style={{ padding: '40px 32px' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'var(--brand-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <Search size={32} className="text-brand" />
                </div>

                <h3 className="mb-2" style={{ fontSize: '1.5rem' }}>لديك امتحان؟</h3>
                <p className="text-muted mb-6" style={{ fontSize: '15px' }}>
                  أدخل الكود المكون من 6 رموز الذي أعطاك إياه المدرس.
                </p>

                <form onSubmit={handleStartExam}>
                  <div className="input-group mb-6">
                    <input
                      className="input-field text-center"
                      style={{
                        fontSize: '28px',
                        letterSpacing: '8px',
                        fontWeight: 'bold',
                        padding: '16px',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                      }}
                      placeholder="______"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      dir="ltr"
                    />
                  </div>
                  <Button
                    type="submit"
                    isLoading={loadingCode}
                    size="lg"
                    style={{ width: '100%' }}
                  >
                    بدء الامتحان
                  </Button>
                </form>
              </Card>
            </div>

            {/* Previous Submissions */}
            <div>
              <h3 className="mb-4 flex items-center gap-2" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                <History size={20} className="text-brand" />
                سجل امتحاناتي
              </h3>
              
              {loadingSubmissions ? (
                <div className="flex justify-center p-8">
                  <Spinner size={32} />
                </div>
              ) : submissions.length === 0 ? (
                <Card style={{ padding: '32px', textAlign: 'center' }}>
                  <div style={{ 
                    width: '64px', height: '64px', borderRadius: '50%', 
                    background: 'var(--surface-color)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' 
                  }}>
                    <FileText size={28} className="text-muted" />
                  </div>
                  <h4 className="mb-2" style={{ fontSize: '1.1rem' }}>لا توجد امتحانات سابقة</h4>
                  <p className="text-muted" style={{ fontSize: '14px' }}>لم تقم بإجراء أي امتحانات حتى الآن.</p>
                </Card>
              ) : (
                <div className="flex flex-col gap-4">
                  {submissions.map((sub) => {
                    const percentage = sub.max_score > 0 ? (sub.total_score / sub.max_score) * 100 : 0;
                    const isPassed = percentage >= 50;

                    return (
                      <Card 
                        key={sub.id} 
                        style={{ 
                          padding: '20px', 
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                          borderRight: `4px solid ${isPassed ? 'var(--success)' : 'var(--danger)'}`,
                          cursor: 'pointer',
                          background: 'var(--bg-secondary)'
                        }}
                        onClick={() => navigate(`/review-exam/${sub.id}`)}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '4px' }}>
                              {sub.exams?.title || 'امتحان مغلق'}
                            </h4>
                            <div className="flex items-center gap-2 text-muted" style={{ fontSize: '12px' }}>
                              <Clock size={14} />
                              <span>{formatDate(sub.submitted_at)}</span>
                            </div>
                          </div>
                          <div style={{ 
                            background: isPassed ? 'var(--success-soft)' : 'var(--danger-soft)',
                            color: isPassed ? 'var(--success)' : 'var(--danger)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            {isPassed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            {sub.total_score} / {sub.max_score}
                          </div>
                        </div>
                        
                        <div style={{ 
                          width: '100%', 
                          height: '8px', 
                          background: 'var(--bg-tertiary)', 
                          borderRadius: '4px',
                          overflow: 'hidden',
                          marginTop: '12px'
                        }}>
                          <div style={{ 
                            width: `${percentage}%`, 
                            height: '100%', 
                            background: isPassed ? 'var(--success)' : 'var(--danger)',
                            borderRadius: '4px',
                            transition: 'width 1s ease-out'
                          }} />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default StudentPortal;

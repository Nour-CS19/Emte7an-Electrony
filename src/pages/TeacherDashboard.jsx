import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, Button, Spinner, EmptyState, StatCard, Badge } from '../components/ui';
import { Plus, Copy, Eye, BookOpen, Users, CheckCircle, Trash2, X, CheckCircle2, ShieldCheck, LayoutDashboard, LogOut, ChevronRight, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { createPaymentIntention } from '../services/PaymobService';

const TeacherDashboard = () => {
  const { profile, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalExams: 0, totalSubmissions: 0, avgScore: 0 });
  const [activePlan, setActivePlan] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [examsPage, setExamsPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [payingLoading, setPayingLoading] = useState(false);
  
  const handleSubscribe = async (plan, amount, centerName = null) => {
    try {
      if (plan === 'center_monthly' && !centerName) {
        centerName = window.prompt('من فضلك أدخل اسم السنتر الذي تريد الاشتراك له:');
        if (!centerName || centerName.trim() === '') {
          return; // Cancelled or empty
        }
      }
      
      setPayingLoading(true);
      // Calculate start and end dates (1 month subscription)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      // Create a pending subscription in our DB first to track it
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: profile.id,
          plan: plan,
          amount: amount,
          status: 'pending',
          payment_method: 'paymob',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          center_name: centerName ? centerName.trim() : null
        })
        .select()
        .single();
        
      if (subError) throw subError;

      // Call Paymob Intention API
      const checkoutUrl = await createPaymentIntention(amount, {
        first_name: profile.full_name.split(' ')[0],
        last_name: profile.full_name.split(' ').slice(1).join(' ') || 'NA',
        email: profile.email || 'teacher@exam.com',
        phone: profile.phone || '01000000000'
      });
      
      // Redirect to Paymob checkout
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'حدث خطأ في تجهيز الدفع. تأكد من إعدادات المفاتيح.');
    } finally {
      setPayingLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          questions(count),
          submissions(count)
        `)
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const examsWithCounts = (data || []).map((exam) => ({
        ...exam,
        questionCount: exam.questions?.[0]?.count || 0,
        submissionCount: exam.submissions?.[0]?.count || 0,
      }));

      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });
        
      if (subData && subData.length > 0) {
        // If they have any active plan, we can just set it. 
        // If they have a teacher plan, that overrides everything.
        const teacherPlan = subData.find(s => s.plan === 'teacher_monthly');
        if (teacherPlan) {
          setActivePlan('teacher_monthly');
        } else {
          setActivePlan('center_monthly');
        }
      }

      setExams(examsWithCounts);

      // Calculate stats
      const totalExams = examsWithCounts.length;
      const totalSubmissions = examsWithCounts.reduce((sum, e) => sum + e.submissionCount, 0);
      setStats({ totalExams, totalSubmissions, avgScore: 0 });
    } catch (err) {
      console.error('Error fetching exams:', err);
      toast.error('حدث خطأ في تحميل الامتحانات');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      toast.success('تم نسخ الكود!');
    });
  };

  const toggleExamActive = async (examId, currentState) => {
    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_active: !currentState })
        .eq('id', examId);

      if (error) throw error;

      setExams((prev) =>
        prev.map((e) => (e.id === examId ? { ...e, is_active: !currentState } : e))
      );
      toast.success(!currentState ? 'تم تفعيل الامتحان' : 'تم إيقاف الامتحان');
    } catch (err) {
      toast.error('حدث خطأ');
    }
  };

  const deleteExam = async (examId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الامتحان؟ سيتم حذف كل الأسئلة والتسليمات.')) return;

    try {
      const { error } = await supabase.from('exams').delete().eq('id', examId);
      if (error) throw error;

      setExams((prev) => prev.filter((e) => e.id !== examId));
      toast.success('تم حذف الامتحان');
    } catch (err) {
      toast.error('حدث خطأ في حذف الامتحان');
    }
  };

  if (loading) return <Spinner size={36} />;

  const totalExamsPages = Math.ceil(exams.length / itemsPerPage);
  const currentExams = exams.slice((examsPage - 1) * itemsPerPage, examsPage * itemsPerPage);

  return (
    <div className="dashboard-layout">
      
      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
        <div style={{ padding: '0 12px 24px', borderBottom: '1px solid var(--border-color)', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)' }}>
            <Users size={24} />
            لوحة المعلم
          </h2>
          <p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>{profile?.full_name}</p>
          <div style={{ marginTop: '8px' }}>
            {activePlan ? (
              <span style={{ background: 'var(--brand-primary)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                باقة {activePlan === 'monthly' ? 'شهرية' : activePlan === 'teacher' ? 'المعلم' : activePlan === 'center' ? 'السنتر' : activePlan}
              </span>
            ) : (
              <span style={{ background: 'var(--text-secondary)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                باقة مجانية
              </span>
            )}
          </div>
        </div>

        <button 
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
            background: activeTab === 'overview' ? 'var(--brand-soft)' : 'transparent',
            color: activeTab === 'overview' ? 'var(--brand-primary)' : 'var(--text-primary)',
            fontWeight: activeTab === 'overview' ? '700' : '500',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'right'
          }}
        >
          <LayoutDashboard size={20} />
          نظرة عامة
        </button>

        <button 
          onClick={() => setActiveTab('exams')}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
            background: activeTab === 'exams' ? 'var(--brand-soft)' : 'transparent',
            color: activeTab === 'exams' ? 'var(--brand-primary)' : 'var(--text-primary)',
            fontWeight: activeTab === 'exams' ? '700' : '500',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'right'
          }}
        >
          <BookOpen size={20} />
          امتحاناتي
          <Badge variant="default" style={{ marginRight: 'auto', fontSize: '11px' }}>{exams.length}</Badge>
        </button>

        <div className="spacer" style={{ flex: 1 }}></div>

        <button 
          onClick={() => setIsSubModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
            background: 'var(--brand-primary)', color: 'white', fontWeight: '700',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'center', justifyContent: 'center'
          }}
        >
          ترقية الحساب
        </button>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }} className="animate-fade-in">
          
          {/* Header Actions */}
          <div className="dashboard-header-actions flex justify-between items-center mb-8" style={{ flexWrap: 'wrap', gap: '16px' }}>
            <div className="flex items-center gap-3">
              <button 
                className="btn btn-ghost" 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                style={{ padding: '8px', color: 'var(--text-muted)' }}
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold mb-1 m-0">
                  {activeTab === 'overview' ? 'نظرة عامة' : 'امتحاناتي'}
                </h1>
                <p className="text-muted">أهلاً بك مجدداً يا {profile?.full_name.split(' ')[0]}</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link to="/create-exam" className="btn btn-primary gap-2" style={{ padding: '10px 20px', borderRadius: '12px' }}>
                <Plus size={18} />
                امتحان جديد
              </Link>
            </div>
          </div>

          {activeTab === 'overview' && (
            <>
              {/* Stats */}
              <div className="grid-cols-3 mb-8">
                <StatCard
                  icon={<BookOpen size={24} />}
                  label="عدد الامتحانات"
                  value={stats.totalExams}
                  color="var(--brand-primary)"
                />
                <StatCard
                  icon={<Users size={24} />}
                  label="إجمالي التسليمات"
                  value={stats.totalSubmissions}
                  color="var(--info)"
                />
                <StatCard
                  icon={<CheckCircle size={24} />}
                  label="امتحانات نشطة"
                  value={exams.filter((e) => e.is_active).length}
                  color="var(--success)"
                />
              </div>

              {/* Recent Exams summary or just a tip */}
              <Card style={{ padding: '24px' }}>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <BookOpen size={20} />
                  أحدث الامتحانات
                </h2>
                {exams.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {exams.slice(0, 3).map(exam => (
                      <div key={exam.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                        <div>
                          <h4 style={{ fontWeight: 'bold' }}>{exam.title}</h4>
                          <span className="text-muted" style={{ fontSize: '13px' }}>{exam.submissionCount} تسليم</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/exam/${exam.id}/results`)}>النتائج</Button>
                      </div>
                    ))}
                    <Button variant="ghost" onClick={() => setActiveTab('exams')} style={{ marginTop: '12px' }}>عرض الكل</Button>
                  </div>
                ) : (
                  <p className="text-muted">لا يوجد امتحانات مضافة حتى الآن.</p>
                )}
              </Card>
            </>
          )}

          {activeTab === 'exams' && (
            <>
              {exams.length === 0 ? (
                <EmptyState
                  icon={<BookOpen size={36} />}
                  title="لا توجد امتحانات بعد"
                  description="أنشئ أول امتحان لك وشاركه مع طلابك."
                  action={
                    <Link to="/create-exam" className="btn btn-primary">
                      <Plus size={18} />
                      أنشئ امتحان
                    </Link>
                  }
                />
              ) : (
                <div className="flex flex-col gap-4 stagger-children">
                  {currentExams.map((exam) => (
                    <Card key={exam.id} className="card-interactive">
                      <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{exam.title}</h3>
                            <Badge variant={exam.is_active ? 'success' : 'danger'}>
                              {exam.is_active ? 'نشط' : 'متوقف'}
                            </Badge>
                          </div>
                          <div className="text-muted flex gap-4" style={{ fontSize: '13px', flexWrap: 'wrap' }}>
                            <span>{exam.questionCount} سؤال</span>
                            <span>{exam.submissionCount} تسليم</span>
                            <span>{new Date(exam.created_at).toLocaleDateString('ar-EG')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Exam Code */}
                          <div
                            className="flex items-center gap-2"
                            style={{
                              background: 'var(--bg-tertiary)',
                              padding: '8px 16px',
                              borderRadius: 'var(--radius-md)',
                              fontWeight: 'bold',
                              letterSpacing: '3px',
                              fontFamily: 'monospace',
                              fontSize: '16px',
                            }}
                          >
                            {exam.code}
                          </div>

                          <Button variant="ghost" title="نسخ الكود" onClick={() => copyCode(exam.code)}>
                            <Copy size={18} />
                          </Button>

                          <Button
                            variant="ghost"
                            title="عرض النتائج"
                            onClick={() => navigate(`/exam/${exam.id}/results`)}
                          >
                            <Eye size={18} />
                          </Button>

                          <Button
                            variant="ghost"
                            title={exam.is_active ? 'إيقاف' : 'تفعيل'}
                            onClick={() => toggleExamActive(exam.id, exam.is_active)}
                            style={{ color: exam.is_active ? 'var(--warning)' : 'var(--success)' }}
                          >
                            {exam.is_active ? '⏸' : '▶'}
                          </Button>

                          <Button
                            variant="ghost"
                            title="تعديل الامتحان"
                            onClick={() => navigate(`/edit-exam/${exam.id}`)}
                          >
                            <BookOpen size={18} />
                          </Button>

                          <Button
                            variant="ghost"
                            title="حذف"
                            onClick={() => deleteExam(exam.id)}
                            style={{ color: 'var(--danger)' }}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {totalExamsPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px', marginTop: '16px' }}>
                      <Button 
                        variant="outline" size="sm" 
                        onClick={() => setExamsPage(p => Math.max(1, p - 1))}
                        disabled={examsPage === 1}
                      >
                        <ChevronRight size={16} /> السابق
                      </Button>
                      <span className="text-muted" style={{ fontSize: '14px' }}>
                        صفحة {examsPage} من {totalExamsPages}
                      </span>
                      <Button 
                        variant="outline" size="sm" 
                        onClick={() => setExamsPage(p => Math.min(totalExamsPages, p + 1))}
                        disabled={examsPage === totalExamsPages}
                      >
                        التالي <ChevronLeft size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* Subscription Modal */}
      {isSubModalOpen && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ 
            width: '100%', maxWidth: '850px', background: 'var(--bg-primary)', 
            borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            position: 'relative', display: 'flex', flexDirection: 'column',
            maxHeight: '90vh'
          }}>
            {/* Header Area */}
            <div style={{
              background: 'var(--brand-gradient)', color: '#fff', padding: '32px 24px', 
              textAlign: 'center', position: 'relative'
            }}>
              <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', color: '#fff' }}>ارتقِ بمستوى تعليمك</h2>
              <p style={{ opacity: 0.9, fontSize: '15px', maxWidth: '500px', margin: '0 auto' }}>اختر الباقة التي تناسب احتياجاتك وابدأ في تقديم تجربة امتحانات احترافية لطلابك</p>
              
              <button 
                onClick={() => setIsSubModalOpen(false)}
                style={{
                  position: 'absolute', top: '20px', left: '20px',
                  background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '50%',
                  width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', cursor: 'pointer', transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Pricing Cards - Side by Side */}
            <div style={{ padding: '32px 24px', overflowY: 'auto', background: 'var(--bg-tertiary)' }}>
              <div style={{ 
                display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch'
              }}>
                
                {/* Teacher Package */}
                <div style={{
                  flex: '1 1 300px', background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', borderRadius: '20px', 
                  padding: '32px 24px', display: 'flex', flexDirection: 'column',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>باقة المعلم</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>مثالية للمعلمين المستقلين</p>
                  </div>
                  
                  <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '40px', fontWeight: '800' }}>300</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>ج.م</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ شهرياً</span>
                    </div>
                  </div>
                  
                  <ul style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
                      <span style={{ fontSize: '15px' }}>عدد <strong>لا محدود</strong> من الامتحانات</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
                      <span style={{ fontSize: '15px' }}>عدد <strong>لا محدود</strong> من الطلاب</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
                      <span style={{ fontSize: '15px' }}>تصحيح آلي فوري وإصدار نتائج</span>
                    </li>
                  </ul>
                  
                  {activePlan === 'teacher_monthly' ? (
                    <Button 
                      variant="outline"
                      style={{ width: '100%', padding: '14px', cursor: 'not-allowed', color: 'var(--success)', borderColor: 'var(--success)' }}
                      disabled
                    >
                      باقتك الحالية (مفعلة)
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      style={{ width: '100%', padding: '14px' }}
                      onClick={() => handleSubscribe('teacher_monthly', 300)}
                      isLoading={payingLoading}
                    >
                      اشترك الآن
                    </Button>
                  )}
                </div>
                
                {/* Center Package */}
                <div style={{
                  flex: '1 1 300px', background: 'var(--bg-secondary)', 
                  border: '2px solid var(--brand-primary)', borderRadius: '20px', 
                  padding: '32px 24px', display: 'flex', flexDirection: 'column',
                  position: 'relative', boxShadow: 'var(--shadow-lg)'
                }}>
                  <div style={{
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--brand-primary)', color: '#fff', fontSize: '13px',
                    fontWeight: '800', padding: '6px 20px', borderRadius: '20px',
                    boxShadow: '0 4px 6px -1px rgba(242, 107, 56, 0.3)'
                  }}>
                    الأكثر طلباً
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px', color: 'var(--brand-primary)' }}>باقة السنتر</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>للمراكز التعليمية والمؤسسات</p>
                  </div>
                  
                  <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '40px', fontWeight: '800', color: 'var(--brand-primary)' }}>500</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>ج.م</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ شهرياً</span>
                    </div>
                  </div>
                  
                  <ul style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckCircle2 size={22} style={{ color: 'var(--brand-primary)' }} />
                      <span style={{ fontSize: '15px', fontWeight: '700' }}>جميع مميزات باقة المعلم</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckCircle2 size={22} style={{ color: 'var(--brand-primary)' }} />
                      <span style={{ fontSize: '15px' }}>إدارة حسابات لـ <strong>أكثر من معلم</strong></span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckCircle2 size={22} style={{ color: 'var(--brand-primary)' }} />
                      <span style={{ fontSize: '15px' }}>تقارير وإحصائيات شاملة للمركز</span>
                    </li>
                  </ul>
                  
                  <Button 
                    style={{ width: '100%', padding: '14px', background: 'var(--brand-gradient)', color: '#fff', border: 'none' }}
                    onClick={() => handleSubscribe('center_monthly', 500)}
                    isLoading={payingLoading}
                  >
                    ابدأ مع باقة السنتر
                  </Button>
                </div>
                
              </div>
              
              <div style={{ 
                marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                gap: '8px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600'
              }}>
                <ShieldCheck size={18} style={{ color: 'var(--success)' }} /> 
                <span>جميع المدفوعات آمنة 100% عبر بوابة Paymob</span>
              </div>
            </div>
          </div>
        </div>
      , document.body)}


    </div>
  );
};

export default TeacherDashboard;

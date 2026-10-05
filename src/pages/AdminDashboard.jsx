import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Card, Badge, Button, Spinner, Input, Modal, Select } from '../components/ui';
import { Users, BookOpen, ShieldCheck, CheckCircle, XCircle, Search, DollarSign, LayoutDashboard, Settings, CreditCard, LogOut, ChevronRight, ChevronLeft, Menu, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SettingsModal from '../components/SettingsModal';

const AdminDashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, subscriptions
  
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });
  
  const [usersPage, setUsersPage] = useState(1);
  const [subsPage, setSubsPage] = useState(1);
  const itemsPerPage = 10;
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    activeSubscriptions: 0,
    revenue: 0
  });

  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    if (!profile.is_super_admin) {
      toast.error('غير مصرح لك بالدخول لهذه الصفحة');
      navigate('/');
      return;
    }
    
    fetchDashboardData();

    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggleMobileSidebar', handleToggle);
    return () => window.removeEventListener('toggleMobileSidebar', handleToggle);
  }, [profile?.id, profile?.is_super_admin]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (usersError) throw usersError;
      
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*, profiles(full_name, phone)')
        .order('created_at', { ascending: false });
        
      if (subsError) throw subsError;
      
      setUsers(usersData || []);
      setSubscriptions(subsData || []);
      
      const activeSubs = subsData?.filter(s => s.status === 'active') || [];
      const revenue = activeSubs.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

      setStats({
        totalUsers: usersData?.length || 0,
        totalTeachers: usersData?.filter(u => u.role === 'teacher').length || 0,
        totalStudents: usersData?.filter(u => u.role === 'student').length || 0,
        activeSubscriptions: activeSubs.length,
        revenue
      });
      
    } catch (err) {
      console.error('Error fetching admin data:', err);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSubscription = async (subId) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('id', subId);
        
      if (error) throw error;
      
      toast.success('تم تفعيل الاشتراك بنجاح!');
      fetchDashboardData();
    } catch (err) {
      toast.error('حدث خطأ أثناء التفعيل');
    }
  };

  const handleRejectSubscription = async (subId) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subId);
        
      if (error) throw error;
      
      toast.success('تم رفض الاشتراك.');
      fetchDashboardData();
    } catch (err) {
      toast.error('حدث خطأ أثناء الرفض');
    }
  };

  const openEditUser = (user) => {
    setEditingUser({ ...user });
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editingUser.full_name,
          phone: editingUser.phone,
          role: editingUser.role,
          is_super_admin: editingUser.is_super_admin
        })
        .eq('id', editingUser.id);
        
      if (error) throw error;
      
      toast.success('تم تحديث بيانات المستخدم بنجاح');
      setIsEditUserModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      toast.error('حدث خطأ أثناء حفظ البيانات');
    } finally {
      setSavingUser(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  if (!profile?.is_super_admin) return null;
  if (loading) return <div className="flex justify-center items-center h-screen"><Spinner size={40} /></div>;

  const filteredUsers = users.filter(u => 
    u.full_name?.includes(searchQuery) || 
    u.phone?.includes(searchQuery) ||
    u.role?.includes(searchQuery)
  );

  const totalUsersPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = filteredUsers.slice((usersPage - 1) * itemsPerPage, usersPage * itemsPerPage);

  const totalSubsPages = Math.ceil(subscriptions.length / itemsPerPage);
  const currentSubs = subscriptions.slice((subsPage - 1) * itemsPerPage, subsPage * itemsPerPage);

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
                لوحة الإدارة
                <ShieldCheck size={16} style={{ color: 'var(--brand-primary)' }} />
              </h2>
              <p className="text-muted" style={{ fontSize: '13px', margin: '2px 0 0' }}>{profile?.full_name}</p>
            </div>
          </div>
          
          <div className="sidebar-text" style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{ background: 'var(--success-soft)', color: 'var(--success-color)', padding: '6px 16px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 'bold', width: '100%', textAlign: 'center' }}>
              صلاحيات كاملة
            </span>
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
          <span className="sidebar-text">نظرة عامة</span>
        </button>

        <button 
          onClick={() => setActiveTab('users')}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
            background: activeTab === 'users' ? 'var(--brand-soft)' : 'transparent',
            color: activeTab === 'users' ? 'var(--brand-primary)' : 'var(--text-primary)',
            fontWeight: activeTab === 'users' ? '700' : '500',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'right'
          }}
        >
          <Users size={20} />
          <span className="sidebar-text">المستخدمين</span>
          <Badge className="sidebar-text" variant="default" style={{ marginRight: 'auto', fontSize: '11px' }}>{stats.totalUsers}</Badge>
        </button>

        <button 
          onClick={() => setActiveTab('subscriptions')}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
            background: activeTab === 'subscriptions' ? 'var(--brand-soft)' : 'transparent',
            color: activeTab === 'subscriptions' ? 'var(--brand-primary)' : 'var(--text-primary)',
            fontWeight: activeTab === 'subscriptions' ? '700' : '500',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'right'
          }}
        >
          <CreditCard size={20} />
          <span className="sidebar-text">الاشتراكات والدفع</span>
          {subscriptions.filter(s => s.status === 'pending').length > 0 && (
            <Badge className="sidebar-text" variant="brand" style={{ marginRight: 'auto', fontSize: '11px', background: 'var(--danger)' }}>
              {subscriptions.filter(s => s.status === 'pending').length} جديد
            </Badge>
          )}
        </button>
        <div className="spacer" style={{ flex: 1 }}></div>

        <button 
          className="nav-link"
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px',
            background: 'transparent', color: 'var(--text-primary)', fontWeight: '600',
            border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'right'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          <span className="sidebar-text">{darkMode ? 'الوضع المضيء' : 'الوضع المظلم'}</span>
        </button>

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
          onClick={() => signOut()}
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
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          {activeTab === 'overview' && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <button 
                  className="btn btn-ghost desktop-only-flex" 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  style={{ padding: '8px', color: 'var(--text-muted)' }}
                >
                  <Menu size={24} />
                </button>
                <h1 className="text-2xl font-bold m-0">نظرة عامة على المنصة</h1>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'var(--brand-soft)', padding: '12px', borderRadius: '12px', color: 'var(--brand-primary)' }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '14px' }}>المستخدمين</div>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  </div>
                </Card>
                <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'var(--success-soft)', padding: '12px', borderRadius: '12px', color: 'var(--success-color)' }}>
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '14px' }}>المعلمين</div>
                    <div className="text-2xl font-bold">{stats.totalTeachers}</div>
                  </div>
                </Card>
                <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'var(--warning-soft)', padding: '12px', borderRadius: '12px', color: 'var(--warning-color)' }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '14px' }}>الطلاب</div>
                    <div className="text-2xl font-bold">{stats.totalStudents}</div>
                  </div>
                </Card>
                <Card style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '12px', color: '#22c55e' }}>
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '14px' }}>الأرباح (ج.م)</div>
                    <div className="text-2xl font-bold">{stats.revenue}</div>
                  </div>
                </Card>
              </div>

              <Card style={{ padding: '24px' }}>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CreditCard size={20} />
                  أحدث طلبات الاشتراك
                </h2>
                {subscriptions.filter(s => s.status === 'pending').length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }} className="text-muted">المعلم/السنتر</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }} className="text-muted">الباقة</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }} className="text-muted">المبلغ / الطريقة</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }} className="text-muted">إجراء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscriptions.filter(s => s.status === 'pending').slice(0, 5).map((sub) => (
                          <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }} className="font-medium">{sub.profiles?.full_name}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <Badge variant="brand">{sub.plan === 'teacher_monthly' ? 'معلم (300)' : 'سنتر (500)'}</Badge>
                              {sub.center_name && (
                                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 'bold' }}>
                                  سنتر: {sub.center_name}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>{sub.amount} ج.م <span className="text-muted text-xs">({sub.payment_method})</span></td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleApproveSubscription(sub.id)} style={{ padding: '8px' }}>
                                  <CheckCircle size={16} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 text-center">
                      <Button variant="ghost" onClick={() => setActiveTab('subscriptions')}>عرض كل الطلبات</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted text-center py-8">لا توجد طلبات اشتراك معلقة حالياً.</p>
                )}
              </Card>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
                <div style={{ width: '300px' }}>
                  <Input 
                    placeholder="بحث بالاسم أو التليفون..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search size={16} />}
                  />
                </div>
              </div>

              <Card style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
                  <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>الاسم</th>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>الدور</th>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>الهاتف</th>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>تاريخ الانضمام</th>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentUsers.map((user) => (
                        <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '16px', fontWeight: '500' }}>
                            {user.full_name}
                          </td>
                          <td style={{ padding: '16px' }}>
                            {user.is_super_admin ? (
                              <Badge variant="brand">مدير عام</Badge>
                            ) : (
                              <Badge variant={user.role === 'teacher' ? 'brand' : 'default'}>
                                {user.role === 'teacher' ? 'معلم' : 'طالب'}
                              </Badge>
                            )}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', fontFamily: 'monospace' }}>{user.phone || '-'}</td>
                          <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>{new Date(user.created_at).toLocaleDateString('ar-EG')}</td>
                          <td style={{ padding: '16px' }}>
                            <Button size="sm" variant="outline" style={{ fontSize: '12px' }} onClick={() => openEditUser(user)}>تعديل</Button>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center p-8 text-muted">لا يوجد نتائج للبحث</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {totalUsersPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
                    <Button 
                      variant="outline" size="sm" 
                      onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                      disabled={usersPage === 1}
                    >
                      <ChevronRight size={16} /> السابق
                    </Button>
                    <span className="text-muted" style={{ fontSize: '14px' }}>
                      صفحة {usersPage} من {totalUsersPages}
                    </span>
                    <Button 
                      variant="outline" size="sm" 
                      onClick={() => setUsersPage(p => Math.min(totalUsersPages, p + 1))}
                      disabled={usersPage === totalUsersPages}
                    >
                      التالي <ChevronLeft size={16} />
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold mb-6">إدارة الاشتراكات والدفع</h1>
              
              <Card style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>المعلم/السنتر</th>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>الباقة</th>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>تفاصيل الدفع</th>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>تاريخ الطلب</th>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>الحالة</th>
                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSubs.map((sub) => (
                        <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '16px', fontWeight: '500' }}>{sub.profiles?.full_name}</td>
                          <td style={{ padding: '16px' }}>
                            <Badge variant="default">{sub.plan === 'teacher_monthly' ? 'باقة معلم (300)' : 'باقة سنتر (500)'}</Badge>
                            {sub.center_name && (
                              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--brand-primary)', fontWeight: 'bold' }}>
                                سنتر: {sub.center_name}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 'bold' }}>{sub.amount} ج.م</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub.payment_method}</div>
                            {sub.reference_id && <div style={{ fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>Ref: {sub.reference_id}</div>}
                          </td>
                          <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>{new Date(sub.created_at).toLocaleDateString('ar-EG')}</td>
                          <td style={{ padding: '16px' }}>
                            {sub.status === 'active' ? (
                              <Badge variant="success">نشط</Badge>
                            ) : sub.status === 'pending' ? (
                              <Badge variant="warning">قيد المراجعة</Badge>
                            ) : sub.status === 'cancelled' ? (
                              <Badge variant="danger">مرفوض</Badge>
                            ) : (
                              <Badge variant="default">{sub.status}</Badge>
                            )}
                          </td>
                          <td style={{ padding: '16px' }}>
                            {sub.status === 'pending' && (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <Button size="sm" onClick={() => handleApproveSubscription(sub.id)} style={{ background: 'var(--success)', color: 'white' }}>
                                  <CheckCircle size={16} style={{ marginLeft: '4px' }} /> تفعيل
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => handleRejectSubscription(sub.id)}>
                                  <XCircle size={16} />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {subscriptions.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center p-8 text-muted">لا توجد اشتراكات حتى الآن</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {totalSubsPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
                    <Button 
                      variant="outline" size="sm" 
                      onClick={() => setSubsPage(p => Math.max(1, p - 1))}
                      disabled={subsPage === 1}
                    >
                      <ChevronRight size={16} /> السابق
                    </Button>
                    <span className="text-muted" style={{ fontSize: '14px' }}>
                      صفحة {subsPage} من {totalSubsPages}
                    </span>
                    <Button 
                      variant="outline" size="sm" 
                      onClick={() => setSubsPage(p => Math.min(totalSubsPages, p + 1))}
                      disabled={subsPage === totalSubsPages}
                    >
                      التالي <ChevronLeft size={16} />
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}

        </div>
      </main>

      {/* Edit User Modal */}
      <Modal 
        isOpen={isEditUserModalOpen} 
        onClose={() => setIsEditUserModalOpen(false)} 
        title="تعديل بيانات المستخدم"
      >
        {editingUser && (
          <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="الاسم بالكامل"
              value={editingUser.full_name || ''}
              onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
              required
            />
            <Input
              label="رقم الهاتف"
              value={editingUser.phone || ''}
              onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
              style={{ direction: 'ltr', textAlign: 'left' }}
            />
            <Select
              label="الدور (طالب / معلم)"
              value={editingUser.role}
              onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
              options={[
                { label: 'طالب', value: 'student' },
                { label: 'معلم', value: 'teacher' }
              ]}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', marginTop: '8px' }}>
              <input
                type="checkbox"
                id="is_super_admin"
                checked={editingUser.is_super_admin}
                onChange={(e) => setEditingUser({...editingUser, is_super_admin: e.target.checked})}
                style={{ width: '20px', height: '20px', accentColor: 'var(--brand-primary)' }}
              />
              <label htmlFor="is_super_admin" style={{ fontWeight: 'bold', cursor: 'pointer' }}>منح صلاحية "مدير عام"</label>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <Button type="submit" style={{ flex: 1 }} isLoading={savingUser}>
                حفظ التعديلات
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditUserModalOpen(false)}>
                إلغاء
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

    </div>
  );
};

export default AdminDashboard;

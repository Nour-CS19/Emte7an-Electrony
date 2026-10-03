import React, { useState } from 'react';
import { Input, Button } from '../components/ui';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Eye, EyeOff, GraduationCap, CheckCircle2, User, BookOpen } from 'lucide-react';

const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signUp, signIn, signOut, user, profile } = useAuth();
  const toast = useToast();

  const defaultRole = location.state?.role || 'teacher';

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState(defaultRole);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    parent_phone: '',
    city: '',
    school: '',
    academic_year: '',
    subject: '',
  });

  React.useEffect(() => {
    // If the user lands here logged in, redirect them
    if (user && profile) {
      if (profile.is_super_admin) navigate('/admin', { replace: true });
      else if (profile.role === 'teacher') navigate('/dashboard', { replace: true });
      else navigate('/student', { replace: true });
    }
  }, [user, profile, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { profile: userProfile } = await signIn(formData.email, formData.password);
        toast.success('تم تسجيل الدخول بنجاح! 🎉');
        if (userProfile?.is_super_admin) navigate('/admin', { replace: true });
        else if (userProfile?.role === 'teacher') navigate('/dashboard', { replace: true });
        else if (userProfile?.role === 'student') navigate('/student', { replace: true });
      } else {
        const phoneRegex = /^01[0125][0-9]{8}$/;

        if (!formData.name.trim()) return toast.error('الرجاء إدخال الاسم');
        if (formData.password.length < 6) return toast.error('كلمة المرور قصيرة جداً');
        if (!phoneRegex.test(formData.phone.trim())) return toast.error('الرجاء إدخال رقم هاتف صحيح (11 رقم)');
        if (!formData.city.trim()) return toast.error('الرجاء إدخال المحافظة/المدينة');
        if (!formData.school.trim()) return toast.error('الرجاء إدخال المدرسة أو السنتر');
        
        if (role === 'student') {
          if (!phoneRegex.test(formData.parent_phone.trim())) return toast.error('رقم ولي الأمر غير صحيح');
          if (formData.phone.trim() === formData.parent_phone.trim()) {
            return toast.error('رقم التليفون غير صحيح');
          }
          if (!formData.academic_year.trim()) return toast.error('الرجاء إدخال السنة الدراسية');
        } else if (role === 'teacher') {
          if (!formData.subject.trim()) return toast.error('الرجاء إدخال المادة');
        }

        const { profile: userProfile } = await signUp(
          formData.email, 
          formData.password, 
          formData.name.trim(), 
          role,
          {
            phone: formData.phone.trim(),
            parent_phone: role === 'student' ? formData.parent_phone.trim() : null,
            city: formData.city.trim(),
            school: formData.school.trim(),
            academic_year: role === 'student' ? formData.academic_year.trim() : null,
            subject: role === 'teacher' ? formData.subject.trim() : null,
          }
        );
        
        toast.success('تم إنشاء الحساب بنجاح! أهلاً بك 🚀');
        if (userProfile?.role === 'teacher') navigate('/dashboard', { replace: true });
        else if (userProfile?.role === 'student') navigate('/student', { replace: true });
      }
    } catch (err) {
      const msgs = {
        'Invalid login credentials': 'البيانات غير صحيحة',
        'User already registered': 'هذا البريد مسجل بالفعل.',
        'CORRUPTED_ACCOUNT': 'الحساب ده مسجل بس بياناته ناقصة من الداتابيز! يرجى عمل حساب جديد بإيميل مختلف.',
      };
      
      toast.error(msgs[err.message] || err.message || 'حدث خطأ. حاول مرة أخرى.');
      
      if (err.message === 'CORRUPTED_ACCOUNT') {
        signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', margin: 0, padding: 0 }}>
      {/* Right Side: Form Container */}
      <div 
        className="auth-right-panel animate-fade-in"
        style={{ 
          flex: '1', 
          padding: '100px 40px 40px', 
          background: 'var(--bg-primary)',
          position: 'relative',
          overflowY: 'auto'
        }}
      >
        <div style={{ maxWidth: '440px', width: '100%', margin: '0 auto' }}>
          
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              {isLogin ? 'مرحباً بعودتك 👋' : 'إنشاء حساب جديد ✨'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: 0 }}>
              {isLogin ? 'سجل الدخول للمتابعة إلى المنصة' : 'أدخل بياناتك للانضمام إلى منصة الامتحانات الذكية'}
            </p>
          </div>

          {!isLogin && (
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '14px', marginBottom: '32px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setRole('teacher')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: role === 'teacher' ? 'var(--bg-primary)' : 'transparent',
                  color: role === 'teacher' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: role === 'teacher' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  fontWeight: role === 'teacher' ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '15px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <BookOpen size={18} />
                  حساب مدرس
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole('student')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: role === 'student' ? 'var(--bg-primary)' : 'transparent',
                  color: role === 'student' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: role === 'student' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  fontWeight: role === 'student' ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '15px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <GraduationCap size={18} />
                  حساب طالب
                </div>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {!isLogin && (
              <>
                <Input
                  label="الاسم بالكامل"
                  id="name"
                  required
                  placeholder="أحمد محمد"
                  value={formData.name}
                  onChange={handleChange}
                />
                <Input
                  label="رقم الهاتف"
                  id="phone"
                  required
                  placeholder="01xxxxxxxxx"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{ direction: 'ltr', textAlign: 'left' }}
                />
                <Input
                  label="المحافظة / المدينة"
                  id="city"
                  required
                  placeholder="مثال: القاهرة، الإسكندرية..."
                  value={formData.city}
                  onChange={handleChange}
                />
                {role === 'student' && (
                  <>
                    <Input
                      label="رقم هاتف ولي الأمر"
                      id="parent_phone"
                      required
                      placeholder="01xxxxxxxxx"
                      value={formData.parent_phone || ''}
                      onChange={handleChange}
                      style={{ direction: 'ltr', textAlign: 'left' }}
                    />
                    <Input
                      label="المدرسة أو السنتر"
                      id="school"
                      required
                      placeholder="اسم مدرستك أو المركز..."
                      value={formData.school}
                      onChange={handleChange}
                    />
                    <Input
                      label="السنة الدراسية"
                      id="academic_year"
                      required
                      placeholder="الأول الثانوي"
                      value={formData.academic_year || ''}
                      onChange={handleChange}
                    />
                  </>
                )}
                {role === 'teacher' && (
                  <Input
                    label="المدرسة أو السنتر"
                    id="school"
                    required
                    placeholder="مكان عملك..."
                    value={formData.school || ''}
                    onChange={handleChange}
                  />
                )}
                {role === 'teacher' && (
                  <Input
                    label="المادة التي تدرسها"
                    id="subject"
                    required
                    placeholder="رياضيات، لغة عربية..."
                    value={formData.subject || ''}
                    onChange={handleChange}
                  />
                )}
              </>
            )}

            <Input
              label="البريد الإلكتروني"
              id="email"
              type="email"
              required
              placeholder="example@email.com"
              value={formData.email}
              onChange={handleChange}
              style={{ direction: 'ltr', textAlign: 'left' }}
            />

            <Input
              label="كلمة المرور"
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              suffix={
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            <Button
              type="submit"
              isLoading={loading}
              style={{ width: '100%', marginTop: '8px', height: '52px', fontSize: '1.1rem', borderRadius: '12px', fontWeight: '700' }}
            >
              {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب مجاني'}
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-muted)', fontSize: '15px' }}>
            {isLogin ? 'ليس لديك حساب؟ ' : 'لديك حساب بالفعل؟ '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ name: '', email: '', password: '', phone: '', city: '', school: '', academic_year: '', subject: '', parent_phone: '' });
              }}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                color: 'var(--brand-primary)', 
                fontWeight: 'bold',
                textDecoration: 'none',
                padding: '0 4px'
              }}
            >
              {isLogin ? 'سجل مجاناً الآن' : 'سجل الدخول'}
            </button>
          </div>
        </div>
      </div>

      {/* Left Side: Branding / Imagery (Hidden on mobile) */}
      <div 
        className="auth-left-panel flex-col justify-between"
        style={{ 
          flex: '1.2', 
          position: 'relative',
          overflow: 'hidden',
          padding: '60px',
          color: '#ffffff'
        }}
      >
        {/* Background Image with Overlay */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'url("https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=2070&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0
        }} />
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(59,130,246,0.8) 100%)',
          zIndex: 1
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.1)', padding: '12px 24px', borderRadius: '100px', backdropFilter: 'blur(10px)', marginBottom: '40px' }}>
              <GraduationCap size={28} color="#ffffff" />
              <span style={{ fontSize: '1.2rem', fontWeight: '700', letterSpacing: '0.5px', color: '#ffffff' }}>منصة امتحانات</span>
            </div>
            
            <h2 style={{ fontSize: '3.5rem', fontWeight: '900', lineHeight: '1.2', marginBottom: '24px', textShadow: '0 4px 12px rgba(0,0,0,0.1)', color: '#ffffff' }}>
              ارتقِ بتجربة<br/>التعلم والتقييم.
            </h2>
            <p style={{ fontSize: '1.25rem', opacity: '0.9', maxWidth: '480px', lineHeight: '1.6', color: '#ffffff' }}>
              منصة متكاملة توفر بيئة آمنة للامتحانات، تصحيح تلقائي فوري، وتحليلات دقيقة لأداء الطلاب لمساعدة المعلمين على التميز.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {['نظام حماية ضد الغش متطور', 'تصحيح تلقائي وتوليد أسئلة بالذكاء الاصطناعي', 'تقارير شاملة لمستوى الطالب'].map((feature, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '1.15rem', fontWeight: '500', background: 'rgba(255,255,255,0.05)', padding: '16px 20px', borderRadius: '16px', backdropFilter: 'blur(5px)', color: '#ffffff' }}>
                <CheckCircle2 size={24} color="#60a5fa" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

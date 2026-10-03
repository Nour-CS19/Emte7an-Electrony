import React from 'react';
import { BookOpen, CheckCircle, Shield, CreditCard, Zap, ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="hero">
        <div className="container hero-content text-center">
          <span className="badge badge-brand" style={{ display: 'inline-block', marginBottom: '24px', fontSize: '14px', padding: '8px 20px' }}>
            ✨ مجاني للطالب · اشتراك شهري بسيط للمدرس
          </span>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: '20px', maxWidth: '800px', margin: '0 auto 20px' }}>
            أنشئ <span className="grad-text">امتحان أونلاين</span> في دقائق،
            <br />
            والتصحيح فوري — حتى في الأسئلة المقالية
          </h1>

          <p className="text-muted" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', maxWidth: '700px', margin: '0 auto 36px' }}>
            الاختيار من متعدد وصح وخطأ يُصحَّح بالمطابقة، والسؤال المقالي يقارنه النظام بإجابتك النموذجية فيعطي درجة وتعليقاً يشرح سببها.
          </p>

          <div className="flex justify-center gap-4" style={{ flexWrap: 'wrap' }}>
            <Link to="/auth" state={{ role: 'teacher' }} className="btn btn-primary btn-lg">
              أنا مدرس — أنشئ امتحان
              <ArrowLeft size={20} />
            </Link>
            <Link to="/auth" state={{ role: 'student' }} className="btn btn-outline btn-lg">
              أنا طالب — عندي كود امتحان
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mb-8" style={{ paddingTop: '60px' }}>
        <h2 className="text-center" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '12px' }}>
          كيف تعمل امتحان أونلاين؟
        </h2>
        <p className="text-center text-muted" style={{ marginBottom: '48px', maxWidth: '500px', margin: '0 auto 48px' }}>
          ثلاث خطوات فقط — من غير تدريب ولا خبرة كمبيوتر.
        </p>

        <div className="grid-cols-3 stagger-children">
          <Card className="card-interactive">
            <div className="flex gap-4 items-center mb-4">
              <span className="question-number-badge">1</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>اكتب أسئلتك</h3>
            </div>
            <p className="text-muted" style={{ fontSize: '15px' }}>
              اختيار من متعدد، صح وخطأ، أو سؤال مقالي. تكتب السؤال، تحدد الإجابة الصحيحة والدرجة، وخلاص.
            </p>
          </Card>

          <Card className="card-interactive">
            <div className="flex gap-4 items-center mb-4">
              <span className="question-number-badge">2</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>شارك الكود مع طلابك</h3>
            </div>
            <p className="text-muted" style={{ fontSize: '15px' }}>
              كل امتحان له كود من 6 رموز ورابط جاهز للنسخ. الطالب يدخل الكود ويبدأ من أي جهاز.
            </p>
          </Card>

          <Card className="card-interactive">
            <div className="flex gap-4 items-center mb-4">
              <span className="question-number-badge">3</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>استلم النتائج مصححة</h3>
            </div>
            <p className="text-muted" style={{ fontSize: '15px' }}>
              فور التسليم تظهر الدرجة وتعليق على كل سؤال، وتقدر تعدّل أي درجة بنفسك لو حبيت.
            </p>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="container mb-8" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
        <h2 className="text-center" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '48px' }}>
          ليه تختار المنصة؟
        </h2>

        <div className="grid-cols-4 stagger-children">
          <Card className="card-interactive">
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <BookOpen size={24} className="text-brand" />
            </div>
            <h3 className="mb-2" style={{ fontSize: '1rem' }}>إنشاء الامتحانات مجاني</h3>
            <p className="text-muted" style={{ fontSize: '14px' }}>
              اعمل ما شئت من الامتحانات وبأي عدد من الأسئلة. لا رسوم على الإنشاء.
            </p>
          </Card>

          <Card className="card-interactive">
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <CheckCircle size={24} className="text-success" />
            </div>
            <h3 className="mb-2" style={{ fontSize: '1rem' }}>تصحيح تلقائي فوري</h3>
            <p className="text-muted" style={{ fontSize: '14px' }}>
              الموضوعية تُصحح لحظياً، والمقالية تُقارَن بإجابتك النموذجية وتأخذ درجة وتعليقاً.
            </p>
          </Card>

          <Card className="card-interactive">
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--warning-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Shield size={24} style={{ color: 'var(--warning)' }} />
            </div>
            <h3 className="mb-2" style={{ fontSize: '1rem' }}>أدوات تحدّ من الغش</h3>
            <p className="text-muted" style={{ fontSize: '14px' }}>
              التصحيح الآمن يتم على السيرفر — الطالب لا يرى الإجابات الصحيحة أبداً أثناء الامتحان.
            </p>
          </Card>

          <Card className="card-interactive">
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--info-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Zap size={24} style={{ color: 'var(--info)' }} />
            </div>
            <h3 className="mb-2" style={{ fontSize: '1rem' }}>سريع وسهل</h3>
            <p className="text-muted" style={{ fontSize: '14px' }}>
              واجهة بسيطة بالعربي. المدرس ينشئ الامتحان في دقائق والطالب يدخل بالكود فوراً.
            </p>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mb-8" style={{ paddingTop: '60px', paddingBottom: '80px' }}>
        <h2 className="text-center" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '12px' }}>
          خطط الاشتراك
        </h2>
        <p className="text-center text-muted" style={{ marginBottom: '48px', maxWidth: '500px', margin: '0 auto' }}>
          اختار الخطة اللي تناسب احتياجاتك
        </p>

        <div className="grid-cols-3 stagger-children">
          {/* Free Plan */}
          <Card className="card-interactive text-center" style={{ padding: '32px 24px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>للطالب</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--brand)' }}>
              مجاناً
            </div>
            <p className="text-muted mb-6" style={{ fontSize: '14px' }}>دائماً وإلى الأبد</p>
            
            <ul className="text-right flex flex-col gap-3 mb-8" style={{ fontSize: '15px' }}>
              <li className="flex items-center gap-2"><CheckCircle size={18} className="text-success" /> دخول لامحدود للامتحانات</li>
              <li className="flex items-center gap-2"><CheckCircle size={18} className="text-success" /> سجل كامل بالامتحانات السابقة</li>
              <li className="flex items-center gap-2"><CheckCircle size={18} className="text-success" /> نتائج فورية مفصلة</li>
            </ul>
            
            <Link to="/auth" state={{ role: 'student' }} className="btn btn-outline" style={{ width: '100%' }}>
              سجل كطالب
            </Link>
          </Card>

          {/* Pro Plan */}
          <Card className="card-interactive text-center" style={{ padding: '32px 24px', border: '2px solid var(--brand)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--brand)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
              الأكثر طلباً
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>للمدرس (الأساسي)</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--brand)' }}>
              150 <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>ج.م / شهر</span>
            </div>
            <p className="text-muted mb-6" style={{ fontSize: '14px' }}>اشتراك شهري مرن</p>
            
            <ul className="text-right flex flex-col gap-3 mb-8" style={{ fontSize: '15px' }}>
              <li className="flex items-center gap-2"><CheckCircle size={18} className="text-success" /> إنشاء عدد لا محدود من الامتحانات</li>
              <li className="flex items-center gap-2"><CheckCircle size={18} className="text-success" /> تصحيح آلي لـ 500 طالب شهرياً</li>
              <li className="flex items-center gap-2"><CheckCircle size={18} className="text-success" /> أسئلة مقالية بالذكاء الاصطناعي</li>
              <li className="flex items-center gap-2"><CheckCircle size={18} className="text-success" /> منع الغش وتغيير ترتيب الأسئلة</li>
            </ul>
            
            <Link to="/auth" state={{ role: 'teacher' }} className="btn btn-primary" style={{ width: '100%' }}>
              اشترك الآن
            </Link>
          </Card>

          {/* School Plan */}
          <Card className="card-interactive text-center" style={{ padding: '32px 24px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>للسناتر والمدارس</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--brand)' }}>
              450 <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>ج.م / شهر</span>
            </div>
            <p className="text-muted mb-6" style={{ fontSize: '14px' }}>للمؤسسات ذات الأعداد الكبيرة</p>
            
            <ul className="text-right flex flex-col gap-3 mb-8" style={{ fontSize: '15px' }}>
              <li className="flex items-center gap-2"><CheckCircle size={18} className="text-success" /> كل مميزات الباقة الأساسية</li>
              <li className="flex items-center gap-2"><CheckCircle size={18} className="text-success" /> تصحيح آلي لعدد لا محدود من الطلاب</li>
              <li className="flex items-center gap-2"><CheckCircle size={18} className="text-success" /> إضافة مساعدين (مصححين)</li>
              <li className="flex items-center gap-2"><CheckCircle size={18} className="text-success" /> تقارير وإحصائيات متقدمة</li>
            </ul>
            
            <Link to="/auth" state={{ role: 'teacher' }} className="btn btn-outline" style={{ width: '100%' }}>
              تواصل معنا
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Landing;

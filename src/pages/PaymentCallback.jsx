import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/ui';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [status, setStatus] = useState('processing');
  
  useEffect(() => {
    if (!profile) return;
    
    const verifyPayment = async () => {
      // Paymob redirects with ?success=true or ?success=false
      const isSuccess = searchParams.get('success') === 'true';
      
      if (isSuccess) {
        try {
          // Update the pending subscription to active
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('user_id', profile.id)
            .eq('status', 'pending');
            
          if (error) throw error;
          setStatus('success');
        } catch (err) {
          console.error('Error updating subscription:', err);
          setStatus('error');
        }
      } else {
        setStatus('failed');
      }
    };
    
    verifyPayment();
  }, [profile, searchParams]);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
      {status === 'processing' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="spinner" style={{ width: 48, height: 48, border: '4px solid var(--border-color)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%' }}></div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>جاري التحقق من عملية الدفع...</h2>
          <p className="text-muted">الرجاء الانتظار وعدم إغلاق هذه الصفحة.</p>
        </div>
      )}
      
      {status === 'success' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ background: 'var(--success-soft)', padding: '24px', borderRadius: '50%' }}>
            <CheckCircle size={80} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '8px' }}>تم الدفع بنجاح! 🎉</h2>
            <p className="text-muted" style={{ fontSize: '1.1rem' }}>شكراً لك. تم تفعيل اشتراكك بنجاح، يمكنك الآن الاستمتاع بكافة مميزات المنصة.</p>
          </div>
          <Button onClick={() => navigate('/dashboard')} style={{ padding: '14px 40px', fontSize: '1.1rem', borderRadius: '16px' }}>
            العودة للوحة التحكم
          </Button>
        </div>
      )}

      {status === 'failed' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ background: 'var(--danger-soft)', padding: '24px', borderRadius: '50%' }}>
            <XCircle size={80} style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '8px' }}>فشلت عملية الدفع</h2>
            <p className="text-muted" style={{ fontSize: '1.1rem' }}>عذراً، لم نتمكن من إتمام عملية الدفع. يرجى المحاولة مرة أخرى أو مراجعة البنك.</p>
          </div>
          <Button onClick={() => navigate('/dashboard')} variant="outline" style={{ padding: '14px 40px', fontSize: '1.1rem', borderRadius: '16px' }}>
            العودة للوحة التحكم
          </Button>
        </div>
      )}
      
      {status === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ background: 'var(--warning-soft)', padding: '24px', borderRadius: '50%' }}>
            <XCircle size={80} style={{ color: 'var(--warning)' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '8px' }}>تم الدفع ولكن..</h2>
            <p className="text-muted" style={{ fontSize: '1.1rem' }}>تمت عملية الدفع ولكن حدث خطأ داخلي أثناء تفعيل الباقة. يرجى التواصل مع الدعم الفني.</p>
          </div>
          <Button onClick={() => navigate('/dashboard')} variant="outline" style={{ padding: '14px 40px', fontSize: '1.1rem', borderRadius: '16px' }}>
            العودة للوحة التحكم
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaymentCallback;

import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { Button, Input, Spinner } from './ui';
import { X, Camera, Lock, User, Phone } from 'lucide-react';
import { createPortal } from 'react-dom';

const SettingsModal = ({ isOpen, onClose }) => {
  const { profile, user, updateProfileState } = useAuth();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [password, setPassword] = useState('');
  
  const fileInputRef = useRef(null);

  if (!isOpen || !profile) return null;

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صحيح');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('تم تحديث الصورة بنجاح');
      updateProfileState({ avatar_url: data.publicUrl });
      
    } catch (error) {
      toast.error(error.message || 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error('الاسم مطلوب');

    try {
      setLoading(true);
      
      // Update profile info
      if (fullName !== profile.full_name || phone !== profile.phone) {
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: fullName, phone })
          .eq('id', user.id);
          
        if (error) throw error;
      }

      // Update password if provided
      if (password) {
        if (password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }

      updateProfileState({ full_name: fullName, phone });
      toast.success('تم حفظ التعديلات بنجاح');
      onClose();
      
    } catch (error) {
      toast.error(error.message || 'حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setLoading(false);
    }
  };

  const currentAvatar = profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.full_name}&backgroundColor=f26b38`;

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999999, padding: '16px', animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'var(--bg-primary)', width: '100%', maxWidth: '450px',
        borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>تعديل الملف الشخصي</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
              <img 
                src={currentAvatar} 
                alt="Profile" 
                style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--brand-soft)' }}
              />
              <div style={{
                position: 'absolute', bottom: 0, right: 0, background: 'var(--brand-primary)',
                color: 'white', width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--bg-primary)'
              }}>
                <Camera size={16} />
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>اضغط لتغيير الصورة</span>
          </div>

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input 
              label="الاسم الكامل" 
              suffix={<User size={18} />} 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input 
              label="رقم الهاتف (اختياري)" 
              suffix={<Phone size={18} />} 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              style={{ direction: 'ltr', textAlign: 'left' }}
            />
            <Input 
              label="كلمة مرور جديدة (اتركها فارغة لعدم التغيير)" 
              suffix={<Lock size={18} />} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              style={{ direction: 'ltr', textAlign: 'left' }}
            />

            <Button type="submit" disabled={loading} style={{ marginTop: '12px' }}>
              {loading ? <Spinner size={20} color="white" /> : 'حفظ التعديلات'}
            </Button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsModal;

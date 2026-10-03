import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Track retry attempts for profile fetching
  const profileRetries = React.useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);
        setAuthError(null);
        if (session?.user) {
          profileRetries.current = 0;
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Retry on transient errors
        if (profileRetries.current < MAX_RETRIES) {
          profileRetries.current++;
          setTimeout(() => fetchProfile(userId), 1000 * profileRetries.current);
          return;
        }
        console.error('Error fetching profile:', error);
        setAuthError('لم نتمكن من تحميل بياناتك. حاول تسجيل الدخول مرة أخرى.');
      }
      setProfile(data || null);
    } catch (err) {
      console.error('Error:', err);
      setAuthError('حدث خطأ في الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email, password, fullName, role, extraData = {}) => {
    setAuthError(null);

    // Client-side validation
    const trimmedName = fullName?.trim();
    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('الاسم يجب أن يكون حرفين على الأقل');
    }
    if (trimmedName.length > 100) {
      throw new Error('الاسم طويل جداً');
    }
    if (!['teacher', 'student'].includes(role)) {
      throw new Error('دور المستخدم غير صحيح');
    }

    // Sanitize name — strip HTML tags
    const sanitizedName = trimmedName.replace(/<[^>]*>/g, '');

    const emailLower = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      throw new Error('البريد الإلكتروني غير صحيح');
    }
    if (password.length < 6) {
      throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }
    if (password.length > 72) {
      throw new Error('كلمة المرور طويلة جداً');
    }

    const { data, error } = await supabase.auth.signUp({
      email: emailLower,
      password,
      options: {
        data: {
          full_name: sanitizedName,
          role,
          ...extraData
        }
      }
    });

    if (error) throw error;

    let newProfile = null;

    if (data.user) {
      setUser(data.user);
      const profileToInsert = {
        id: data.user.id,
        full_name: sanitizedName,
        role,
        ...extraData
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileToInsert);

      if (profileError) {
        // If profile creation fails, clean up auth user
        console.error('Profile creation failed:', profileError);
        throw new Error(`DB Error: ${profileError.message || profileError.details}`);
      }

      newProfile = { ...profileToInsert, created_at: new Date().toISOString() };
      setProfile(newProfile);
    }

    return { ...data, profile: newProfile };
  }, []);

  const signIn = useCallback(async (email, password) => {
    setAuthError(null);
    const emailLower = email.toLowerCase().trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLower,
      password,
    });
    if (error) throw error;

    let profileData = null;
    // Explicitly fetch profile after login so navigation happens instantly
    if (data?.user) {
      setUser(data.user);
      const { data: pData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (profileError && profileError.code === 'PGRST116') {
        throw new Error('CORRUPTED_ACCOUNT');
      }
      
      profileData = pData;
      setProfile(profileData);
    }

    return { ...data, profile: profileData };
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    profile,
    loading,
    authError,
    signUp,
    signIn,
    signOut,
    isTeacher: profile?.role === 'teacher',
    isStudent: profile?.role === 'student',
    isAuthenticated: !!user && !!profile,
  }), [user, profile, loading, authError, signUp, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

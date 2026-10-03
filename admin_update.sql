-- Add super admin flag to profiles
ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('teacher_monthly', 'center_monthly')),
  status TEXT NOT NULL CHECK (status IN ('active', 'pending', 'expired', 'cancelled')),
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  reference_id TEXT, -- For Paymob/Fawry transaction IDs
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Add policy for super admins to view everything (assuming we use a function or direct check)
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR ALL
  USING ( (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = TRUE );

CREATE POLICY "Super admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING ( (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = TRUE );

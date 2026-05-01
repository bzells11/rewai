-- REW AI — Initial Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Users profile (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  company_name TEXT,
  buying_area TEXT,
  twilio_number TEXT,
  twilio_sid TEXT,
  twilio_auth_token TEXT,
  stripe_customer_id TEXT,
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'pro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own profile" ON public.users
  FOR ALL USING (auth.uid() = id);

-- Leads
CREATE TABLE public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  situation TEXT,
  asking_price INTEGER,
  timeline TEXT,
  status TEXT DEFAULT 'cold' CHECK (status IN ('cold', 'active', 'warm', 'hot', 'handed_off', 'dead')),
  ai_notes TEXT,
  ai_enabled BOOLEAN DEFAULT TRUE,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_at TIMESTAMPTZ,
  UNIQUE(user_id, phone)
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own leads" ON public.leads
  FOR ALL USING (auth.uid() = user_id);

-- Conversations (SMS threads)
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  ai_generated BOOLEAN DEFAULT FALSE,
  twilio_sid TEXT
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own lead conversations" ON public.conversations
  FOR ALL USING (
    lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid())
  );

-- Follow-up schedules
CREATE TABLE public.follow_up_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  attempt_number INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 10),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.follow_up_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own follow-up schedules" ON public.follow_up_schedules
  FOR ALL USING (
    lead_id IN (SELECT id FROM public.leads WHERE user_id = auth.uid())
  );

-- Campaigns (intro message templates)
CREATE TABLE public.campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  intro_template TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own campaigns" ON public.campaigns
  FOR ALL USING (auth.uid() = user_id);

-- Auto-create user profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance
CREATE INDEX leads_user_id_status_idx ON public.leads(user_id, status);
CREATE INDEX leads_phone_idx ON public.leads(phone);
CREATE INDEX conversations_lead_id_sent_at_idx ON public.conversations(lead_id, sent_at);
CREATE INDEX follow_ups_status_scheduled_idx ON public.follow_up_schedules(status, scheduled_at);

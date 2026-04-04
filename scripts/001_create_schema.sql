-- Hourglass Database Schema
-- This script creates all tables needed for the Hourglass meeting ops assistant

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- DROP EXISTING TYPES IF THEY EXIST (for clean re-runs)
-- ==========================================
DO $$ BEGIN
  DROP TYPE IF EXISTS provider_type CASCADE;
  DROP TYPE IF EXISTS connection_status CASCADE;
  DROP TYPE IF EXISTS audit_verdict CASCADE;
  DROP TYPE IF EXISTS audit_status CASCADE;
  DROP TYPE IF EXISTS approval_channel CASCADE;
  DROP TYPE IF EXISTS execution_status CASCADE;
  DROP TYPE IF EXISTS delivery_channel CASCADE;
  DROP TYPE IF EXISTS delivery_status CASCADE;
  DROP TYPE IF EXISTS meeting_document_type CASCADE;
  DROP TYPE IF EXISTS meeting_chat_role CASCADE;
  DROP TYPE IF EXISTS meeting_chat_scope CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ==========================================
-- CREATE ENUM TYPES
-- ==========================================
CREATE TYPE provider_type AS ENUM ('gmail', 'google_calendar', 'slack', 'whatsapp');
CREATE TYPE connection_status AS ENUM ('connected', 'disconnected', 'error', 'pending');
CREATE TYPE audit_verdict AS ENUM ('keep', 'shorten', 'asyncify', 'delegate', 'cancel', 'needs_context');
CREATE TYPE audit_status AS ENUM ('pending', 'approved', 'rejected', 'executed', 'expired');
CREATE TYPE approval_channel AS ENUM ('web', 'whatsapp', 'slack');
CREATE TYPE execution_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE delivery_channel AS ENUM ('web', 'whatsapp');
CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'responded');
CREATE TYPE meeting_document_type AS ENUM ('transcript', 'notes');
CREATE TYPE meeting_chat_role AS ENUM ('system', 'user', 'assistant');
CREATE TYPE meeting_chat_scope AS ENUM ('single_meeting', 'cross_meeting');

-- ==========================================
-- PROFILES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- ==========================================
-- USER PREFERENCES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  never_touch_external_meetings BOOLEAN DEFAULT FALSE,
  never_touch_investor_meetings BOOLEAN DEFAULT FALSE,
  only_suggest_never_execute BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_preferences_select_own" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_insert_own" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_update_own" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_delete_own" ON public.user_preferences;

CREATE POLICY "user_preferences_select_own" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_preferences_insert_own" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_preferences_update_own" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_preferences_delete_own" ON public.user_preferences FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- CONNECTED ACCOUNTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider provider_type NOT NULL,
  account_email TEXT,
  external_user_id TEXT,
  status connection_status DEFAULT 'disconnected',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON public.connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_provider ON public.connected_accounts(provider);

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connected_accounts_select_own" ON public.connected_accounts;
DROP POLICY IF EXISTS "connected_accounts_insert_own" ON public.connected_accounts;
DROP POLICY IF EXISTS "connected_accounts_update_own" ON public.connected_accounts;
DROP POLICY IF EXISTS "connected_accounts_delete_own" ON public.connected_accounts;

CREATE POLICY "connected_accounts_select_own" ON public.connected_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "connected_accounts_insert_own" ON public.connected_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "connected_accounts_update_own" ON public.connected_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "connected_accounts_delete_own" ON public.connected_accounts FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- CALENDAR EVENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  organizer_email TEXT,
  attendees JSONB DEFAULT '[]',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  meeting_url TEXT,
  is_external BOOLEAN DEFAULT FALSE,
  raw_payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_is_external ON public.calendar_events(is_external);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_select_own" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert_own" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update_own" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete_own" ON public.calendar_events;

CREATE POLICY "calendar_events_select_own" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "calendar_events_insert_own" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "calendar_events_update_own" ON public.calendar_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "calendar_events_delete_own" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- MEETING CONTEXTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.meeting_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  calendar_event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  email_summary TEXT,
  slack_summary TEXT,
  agenda_detected BOOLEAN DEFAULT FALSE,
  decision_owner TEXT,
  context_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(calendar_event_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_contexts_calendar_event_id ON public.meeting_contexts(calendar_event_id);

ALTER TABLE public.meeting_contexts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_contexts_select_own" ON public.meeting_contexts;
DROP POLICY IF EXISTS "meeting_contexts_insert_own" ON public.meeting_contexts;
DROP POLICY IF EXISTS "meeting_contexts_update_own" ON public.meeting_contexts;
DROP POLICY IF EXISTS "meeting_contexts_delete_own" ON public.meeting_contexts;

CREATE POLICY "meeting_contexts_select_own" ON public.meeting_contexts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meeting_contexts_insert_own" ON public.meeting_contexts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meeting_contexts_update_own" ON public.meeting_contexts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meeting_contexts_delete_own" ON public.meeting_contexts FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- MEETING DOCUMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.meeting_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  calendar_event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_type meeting_document_type NOT NULL,
  content TEXT NOT NULL,
  source_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_documents_user_id ON public.meeting_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_documents_calendar_event_id ON public.meeting_documents(calendar_event_id);

ALTER TABLE public.meeting_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_documents_select_own" ON public.meeting_documents;
DROP POLICY IF EXISTS "meeting_documents_insert_own" ON public.meeting_documents;
DROP POLICY IF EXISTS "meeting_documents_update_own" ON public.meeting_documents;
DROP POLICY IF EXISTS "meeting_documents_delete_own" ON public.meeting_documents;

CREATE POLICY "meeting_documents_select_own" ON public.meeting_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meeting_documents_insert_own" ON public.meeting_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meeting_documents_update_own" ON public.meeting_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meeting_documents_delete_own" ON public.meeting_documents FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- MEETING SUMMARIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.meeting_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  calendar_event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  decisions JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  open_questions JSONB DEFAULT '[]',
  participants JSONB DEFAULT '[]',
  source_document_ids UUID[] DEFAULT '{}',
  search_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(calendar_event_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_summaries_user_id ON public.meeting_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_summaries_calendar_event_id ON public.meeting_summaries(calendar_event_id);

ALTER TABLE public.meeting_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_summaries_select_own" ON public.meeting_summaries;
DROP POLICY IF EXISTS "meeting_summaries_insert_own" ON public.meeting_summaries;
DROP POLICY IF EXISTS "meeting_summaries_update_own" ON public.meeting_summaries;
DROP POLICY IF EXISTS "meeting_summaries_delete_own" ON public.meeting_summaries;

CREATE POLICY "meeting_summaries_select_own" ON public.meeting_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meeting_summaries_insert_own" ON public.meeting_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meeting_summaries_update_own" ON public.meeting_summaries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meeting_summaries_delete_own" ON public.meeting_summaries FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- MEETING CHUNKS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.meeting_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  calendar_event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  meeting_document_id UUID NOT NULL REFERENCES public.meeting_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  search_text TEXT NOT NULL,
  source_label TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_meeting_chunks_user_id ON public.meeting_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_chunks_calendar_event_id ON public.meeting_chunks(calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_meeting_chunks_document_id ON public.meeting_chunks(meeting_document_id);

ALTER TABLE public.meeting_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_chunks_select_own" ON public.meeting_chunks;
DROP POLICY IF EXISTS "meeting_chunks_insert_own" ON public.meeting_chunks;
DROP POLICY IF EXISTS "meeting_chunks_update_own" ON public.meeting_chunks;
DROP POLICY IF EXISTS "meeting_chunks_delete_own" ON public.meeting_chunks;

CREATE POLICY "meeting_chunks_select_own" ON public.meeting_chunks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meeting_chunks_insert_own" ON public.meeting_chunks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meeting_chunks_update_own" ON public.meeting_chunks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meeting_chunks_delete_own" ON public.meeting_chunks FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- MEETING CHAT THREADS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.meeting_chat_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scope meeting_chat_scope DEFAULT 'cross_meeting',
  calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_chat_threads_user_id ON public.meeting_chat_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_chat_threads_calendar_event_id ON public.meeting_chat_threads(calendar_event_id);

ALTER TABLE public.meeting_chat_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_chat_threads_select_own" ON public.meeting_chat_threads;
DROP POLICY IF EXISTS "meeting_chat_threads_insert_own" ON public.meeting_chat_threads;
DROP POLICY IF EXISTS "meeting_chat_threads_update_own" ON public.meeting_chat_threads;
DROP POLICY IF EXISTS "meeting_chat_threads_delete_own" ON public.meeting_chat_threads;

CREATE POLICY "meeting_chat_threads_select_own" ON public.meeting_chat_threads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meeting_chat_threads_insert_own" ON public.meeting_chat_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meeting_chat_threads_update_own" ON public.meeting_chat_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meeting_chat_threads_delete_own" ON public.meeting_chat_threads FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- MEETING CHAT MESSAGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.meeting_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.meeting_chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role meeting_chat_role NOT NULL,
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]',
  retrieval_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_chat_messages_thread_id ON public.meeting_chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_meeting_chat_messages_user_id ON public.meeting_chat_messages(user_id);

ALTER TABLE public.meeting_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_chat_messages_select_own" ON public.meeting_chat_messages;
DROP POLICY IF EXISTS "meeting_chat_messages_insert_own" ON public.meeting_chat_messages;
DROP POLICY IF EXISTS "meeting_chat_messages_update_own" ON public.meeting_chat_messages;
DROP POLICY IF EXISTS "meeting_chat_messages_delete_own" ON public.meeting_chat_messages;

CREATE POLICY "meeting_chat_messages_select_own" ON public.meeting_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.meeting_chat_threads
      WHERE meeting_chat_threads.id = meeting_chat_messages.thread_id
      AND meeting_chat_threads.user_id = auth.uid()
    )
  );
CREATE POLICY "meeting_chat_messages_insert_own" ON public.meeting_chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.meeting_chat_threads
      WHERE meeting_chat_threads.id = meeting_chat_messages.thread_id
      AND meeting_chat_threads.user_id = auth.uid()
    )
  );
CREATE POLICY "meeting_chat_messages_update_own" ON public.meeting_chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.meeting_chat_threads
      WHERE meeting_chat_threads.id = meeting_chat_messages.thread_id
      AND meeting_chat_threads.user_id = auth.uid()
    )
  );
CREATE POLICY "meeting_chat_messages_delete_own" ON public.meeting_chat_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.meeting_chat_threads
      WHERE meeting_chat_threads.id = meeting_chat_messages.thread_id
      AND meeting_chat_threads.user_id = auth.uid()
    )
  );

-- ==========================================
-- MEETING AUDITS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.meeting_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  calendar_event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  verdict audit_verdict NOT NULL,
  confidence NUMERIC(3, 2),
  rationale TEXT,
  risks TEXT[] DEFAULT '{}',
  approval_message TEXT,
  draft_email TEXT,
  draft_slack_message TEXT,
  draft_whatsapp_message TEXT,
  proposed_actions JSONB DEFAULT '[]',
  status audit_status DEFAULT 'pending',
  approved_via approval_channel,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_audits_user_id ON public.meeting_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_audits_status ON public.meeting_audits(status);
CREATE INDEX IF NOT EXISTS idx_meeting_audits_calendar_event_id ON public.meeting_audits(calendar_event_id);

ALTER TABLE public.meeting_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_audits_select_own" ON public.meeting_audits;
DROP POLICY IF EXISTS "meeting_audits_insert_own" ON public.meeting_audits;
DROP POLICY IF EXISTS "meeting_audits_update_own" ON public.meeting_audits;
DROP POLICY IF EXISTS "meeting_audits_delete_own" ON public.meeting_audits;

CREATE POLICY "meeting_audits_select_own" ON public.meeting_audits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meeting_audits_insert_own" ON public.meeting_audits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meeting_audits_update_own" ON public.meeting_audits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meeting_audits_delete_own" ON public.meeting_audits FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- EXECUTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_audit_id UUID NOT NULL REFERENCES public.meeting_audits(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  status execution_status DEFAULT 'pending',
  provider_response JSONB DEFAULT '{}',
  error_message TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_executions_meeting_audit_id ON public.executions(meeting_audit_id);

ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "executions_select_own" ON public.executions;
DROP POLICY IF EXISTS "executions_insert_own" ON public.executions;
DROP POLICY IF EXISTS "executions_update_own" ON public.executions;

CREATE POLICY "executions_select_own" ON public.executions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meeting_audits 
      WHERE meeting_audits.id = executions.meeting_audit_id 
      AND meeting_audits.user_id = auth.uid()
    )
  );
CREATE POLICY "executions_insert_own" ON public.executions 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meeting_audits 
      WHERE meeting_audits.id = executions.meeting_audit_id 
      AND meeting_audits.user_id = auth.uid()
    )
  );
CREATE POLICY "executions_update_own" ON public.executions 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meeting_audits 
      WHERE meeting_audits.id = executions.meeting_audit_id 
      AND meeting_audits.user_id = auth.uid()
    )
  );

-- ==========================================
-- APPROVAL REQUESTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meeting_audit_id UUID NOT NULL REFERENCES public.meeting_audits(id) ON DELETE CASCADE,
  channel delivery_channel NOT NULL,
  message_body TEXT NOT NULL,
  delivery_status delivery_status DEFAULT 'pending',
  response_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_user_id ON public.approval_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_meeting_audit_id ON public.approval_requests(meeting_audit_id);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_requests_select_own" ON public.approval_requests;
DROP POLICY IF EXISTS "approval_requests_insert_own" ON public.approval_requests;
DROP POLICY IF EXISTS "approval_requests_update_own" ON public.approval_requests;
DROP POLICY IF EXISTS "approval_requests_delete_own" ON public.approval_requests;

CREATE POLICY "approval_requests_select_own" ON public.approval_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "approval_requests_insert_own" ON public.approval_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "approval_requests_update_own" ON public.approval_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "approval_requests_delete_own" ON public.approval_requests FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- TRIGGER FOR AUTO-CREATING PROFILE ON SIGNUP
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- Also create default preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- UPDATED_AT TRIGGER FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
DROP TRIGGER IF EXISTS update_connected_accounts_updated_at ON public.connected_accounts;
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON public.calendar_events;
DROP TRIGGER IF EXISTS update_meeting_contexts_updated_at ON public.meeting_contexts;
DROP TRIGGER IF EXISTS update_meeting_documents_updated_at ON public.meeting_documents;
DROP TRIGGER IF EXISTS update_meeting_summaries_updated_at ON public.meeting_summaries;
DROP TRIGGER IF EXISTS update_meeting_chunks_updated_at ON public.meeting_chunks;
DROP TRIGGER IF EXISTS update_meeting_chat_threads_updated_at ON public.meeting_chat_threads;
DROP TRIGGER IF EXISTS update_meeting_chat_messages_updated_at ON public.meeting_chat_messages;
DROP TRIGGER IF EXISTS update_meeting_audits_updated_at ON public.meeting_audits;
DROP TRIGGER IF EXISTS update_executions_updated_at ON public.executions;
DROP TRIGGER IF EXISTS update_approval_requests_updated_at ON public.approval_requests;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_connected_accounts_updated_at BEFORE UPDATE ON public.connected_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meeting_contexts_updated_at BEFORE UPDATE ON public.meeting_contexts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meeting_documents_updated_at BEFORE UPDATE ON public.meeting_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meeting_summaries_updated_at BEFORE UPDATE ON public.meeting_summaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meeting_chunks_updated_at BEFORE UPDATE ON public.meeting_chunks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meeting_chat_threads_updated_at BEFORE UPDATE ON public.meeting_chat_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meeting_chat_messages_updated_at BEFORE UPDATE ON public.meeting_chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meeting_audits_updated_at BEFORE UPDATE ON public.meeting_audits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_executions_updated_at BEFORE UPDATE ON public.executions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

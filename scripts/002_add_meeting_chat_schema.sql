-- Incremental schema for meeting notes upload and meeting chat.
-- Run this in the Supabase SQL editor after the base schema has already been created.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'meeting_document_type'
  ) THEN
    CREATE TYPE meeting_document_type AS ENUM ('transcript', 'notes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'meeting_chat_role'
  ) THEN
    CREATE TYPE meeting_chat_role AS ENUM ('system', 'user', 'assistant');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'meeting_chat_scope'
  ) THEN
    CREATE TYPE meeting_chat_scope AS ENUM ('single_meeting', 'cross_meeting');
  END IF;
END $$;

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

DROP TRIGGER IF EXISTS update_meeting_documents_updated_at ON public.meeting_documents;
DROP TRIGGER IF EXISTS update_meeting_summaries_updated_at ON public.meeting_summaries;
DROP TRIGGER IF EXISTS update_meeting_chunks_updated_at ON public.meeting_chunks;
DROP TRIGGER IF EXISTS update_meeting_chat_threads_updated_at ON public.meeting_chat_threads;
DROP TRIGGER IF EXISTS update_meeting_chat_messages_updated_at ON public.meeting_chat_messages;

CREATE TRIGGER update_meeting_documents_updated_at
  BEFORE UPDATE ON public.meeting_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_summaries_updated_at
  BEFORE UPDATE ON public.meeting_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_chunks_updated_at
  BEFORE UPDATE ON public.meeting_chunks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_chat_threads_updated_at
  BEFORE UPDATE ON public.meeting_chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meeting_chat_messages_updated_at
  BEFORE UPDATE ON public.meeting_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

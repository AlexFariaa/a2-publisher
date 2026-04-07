-- ============================================================
-- Migration: Artigos GMB (Google My Business)
-- Execute este arquivo no SQL Editor do seu projeto Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gmb_posts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name  TEXT NOT NULL,
  format       TEXT NOT NULL CHECK (format IN ('dica', 'dado', 'pergunta', 'cta', 'mito', 'bastidores')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  cta          TEXT NOT NULL DEFAULT '',
  hashtags     TEXT[] NOT NULL DEFAULT '{}',
  source_url   TEXT,
  generated_at TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'recebido' CHECK (status IN ('recebido', 'publicado')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gmb_posts ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ler/escrever posts GMB
CREATE POLICY "gmb_posts_admin_all" ON public.gmb_posts
  FOR ALL USING (public.is_admin());

-- Índices para performance nas queries mais comuns
CREATE INDEX IF NOT EXISTS gmb_posts_client_id_idx ON public.gmb_posts(client_id);
CREATE INDEX IF NOT EXISTS gmb_posts_status_idx ON public.gmb_posts(status);
CREATE INDEX IF NOT EXISTS gmb_posts_created_at_idx ON public.gmb_posts(created_at DESC);

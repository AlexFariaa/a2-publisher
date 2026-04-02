-- ============================================================
-- Migration: Integração Gerador de Artigos → A2 Publisher
-- Executar no SQL Editor do Supabase (painel web)
-- Esta migration é aditiva — não altera dados existentes
-- ============================================================

-- ── Novas colunas em sites ──────────────────────────────────

ALTER TABLE public.sites
  -- Chave de autenticação para o gerador (16 bytes = 32 chars hex)
  -- Diferente da api_key pública (32 bytes = 64 chars)
  ADD COLUMN IF NOT EXISTS generator_api_key TEXT
    NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- Configuração GitHub para publicação em sites de código
  ADD COLUMN IF NOT EXISTS github_repo        TEXT,          -- ex: "AlexFariaa/site-cliente"
  ADD COLUMN IF NOT EXISTS github_branch      TEXT NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS blog_output_path   TEXT,          -- ex: "blog/" ou "src/data/blog/"
  ADD COLUMN IF NOT EXISTS blog_framework     TEXT
    CHECK (blog_framework IN ('vanilla-html', 'nextjs-ts-data', 'astro', 'none'));

-- Índice único para lookup O(1) no endpoint /api/import-post
CREATE UNIQUE INDEX IF NOT EXISTS sites_generator_api_key_idx
  ON public.sites(generator_api_key);

-- ── Novas colunas em posts ──────────────────────────────────

ALTER TABLE public.posts
  -- Origem do post: 'manual' (criado no editor) ou 'generated' (enviado pelo gerador)
  ADD COLUMN IF NOT EXISTS source     TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'generated')),

  -- HTML bruto gerado pelo pipeline — nunca retornado na API pública /api/posts
  ADD COLUMN IF NOT EXISTS raw_html   TEXT,

  -- SHA do blob no GitHub (não do commit) — necessário para PUT quando o arquivo já existe
  ADD COLUMN IF NOT EXISTS github_sha TEXT;

-- Templates HTML para sites vanilla-html
-- blog_html_before: tudo que vem antes do corpo do artigo (head, nav, abertura da div)
-- blog_html_after:  tudo que vem depois do corpo do artigo (sidebar, footer, fechamento)
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS blog_html_before TEXT,
  ADD COLUMN IF NOT EXISTS blog_html_after  TEXT;

-- ── Verificação ────────────────────────────────────────────
-- Após executar, confirme com:
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'sites'
--   ORDER BY ordinal_position;
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'posts'
--   ORDER BY ordinal_position;

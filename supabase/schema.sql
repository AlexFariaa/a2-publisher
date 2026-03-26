-- ============================================================
-- A2 Publisher — Schema Supabase
-- Execute este arquivo no SQL Editor do seu projeto Supabase
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABELA: profiles
-- Extende auth.users com role e dados extras
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id        UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email     TEXT NOT NULL,
  full_name TEXT,
  role      TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: cria profile automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. TABELA: sites
-- Cada site pertence a um cliente (user)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sites (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  domain     TEXT NOT NULL,
  api_key    TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 3. TABELA: posts
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id         UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  title           TEXT NOT NULL DEFAULT '',
  slug            TEXT NOT NULL DEFAULT '',
  content         JSONB,
  cover_image     TEXT,
  seo_title       TEXT,
  seo_description TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, slug)
);

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_posts_updated_at ON public.posts;
CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts    ENABLE ROW LEVEL SECURITY;

-- Helper: verifica se o usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── PROFILES ─────────────────────────────────────────────────
-- Usuário vê apenas seu próprio perfil
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin vê todos os perfis
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (public.is_admin());

-- ── SITES ────────────────────────────────────────────────────
-- Cliente vê apenas seus próprios sites
CREATE POLICY "sites_select_own" ON public.sites
  FOR SELECT USING (user_id = auth.uid());

-- Admin gerencia todos os sites
CREATE POLICY "sites_admin_all" ON public.sites
  FOR ALL USING (public.is_admin());

-- Leitura pública de sites (para os sites dos clientes buscarem pelo api_key)
CREATE POLICY "sites_public_read_by_apikey" ON public.sites
  FOR SELECT USING (true);

-- ── POSTS ────────────────────────────────────────────────────
-- Cliente gerencia posts dos seus sites
CREATE POLICY "posts_manage_own" ON public.posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE id = site_id AND user_id = auth.uid()
    )
  );

-- Admin gerencia todos os posts
CREATE POLICY "posts_admin_all" ON public.posts
  FOR ALL USING (public.is_admin());

-- Leitura pública apenas de posts publicados (para os sites dos clientes)
CREATE POLICY "posts_public_read_published" ON public.posts
  FOR SELECT USING (status = 'published');

-- ────────────────────────────────────────────────────────────
-- 5. STORAGE BUCKET para imagens
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Usuários autenticados podem fazer upload
CREATE POLICY "images_authenticated_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-images');

-- Leitura pública das imagens
CREATE POLICY "images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images');

-- Usuários deletam apenas seus uploads
CREATE POLICY "images_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ────────────────────────────────────────────────────────────
-- 6. PRIMEIRO ADMIN (execute manualmente após criar seu usuário)
-- Substitua o email abaixo pelo seu email de admin
-- ────────────────────────────────────────────────────────────
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'seu@email.com';

-- ────────────────────────────────────────────────────────────
-- 7. MIGRATION: Suporte a WordPress (Opção C)
-- Execute no SQL Editor do Supabase caso já tenha rodado o schema anterior
-- ────────────────────────────────────────────────────────────

-- Adiciona coluna platform na tabela sites (default 'supabase' para sites existentes)
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'supabase'
  CHECK (platform IN ('supabase', 'wordpress'));

-- Nova tabela: credenciais WordPress por site (1:1 com sites)
CREATE TABLE IF NOT EXISTS public.sites_wordpress_credentials (
  site_id                 UUID REFERENCES public.sites(id) ON DELETE CASCADE PRIMARY KEY,
  wp_url                  TEXT NOT NULL,
  wp_username             TEXT NOT NULL,
  wp_application_password TEXT NOT NULL
);

ALTER TABLE public.sites_wordpress_credentials ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ler/escrever credenciais WP (dados sensíveis)
CREATE POLICY "wp_creds_admin_all" ON public.sites_wordpress_credentials
  FOR ALL USING (public.is_admin());

-- ────────────────────────────────────────────────────────────
-- 8. MIGRATION: Agendamento de posts
-- Execute no SQL Editor do Supabase caso já tenha rodado o schema anterior
-- ────────────────────────────────────────────────────────────

-- Adiciona coluna published_at para controle de agendamento
-- Posts com status='published' e published_at no futuro ficam ocultos até o horário chegar
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS seo_title TEXT;

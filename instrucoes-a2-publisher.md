# Relatório Técnico — A2 Publisher

---

## 1. Objetivo do Projeto

O **A2 Publisher** é um CMS headless simplificado voltado para agências digitais que gerenciam múltiplos sites de clientes. Permite que cada cliente publique posts diretamente no próprio site — sem depender do desenvolvedor — através de um editor visual. O sistema suporta publicação via API própria (Supabase), envio direto ao WordPress via REST API, e commit automático em repositórios GitHub para sites estáticos (Next.js, Astro, HTML puro).

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework Web | Next.js (App Router) | **16.2.1** *(README menciona 15 incorretamente)* |
| UI | React | 19.2.4 |
| Linguagem | TypeScript | ^5 |
| Estilização | Tailwind CSS | ^4 |
| Componentes UI | Shadcn/UI + Base UI | ^4.1.0 / ^1.3.0 |
| Editor Rich Text | TipTap | ^3.20.5 (StarterKit, Image, Link, Placeholder) |
| Banco de Dados | Supabase (PostgreSQL) | @supabase/supabase-js ^2.100.0 |
| Auth | Supabase Auth (cookie-based via @supabase/ssr) | ^0.9.0 |
| Storage | Supabase Storage | — |
| Notificações | Sonner (toast) | ^2.0.7 |
| Icons | Lucide React | ^1.6.0 |
| Deploy alvo | Vercel / Netlify | — |

---

## 3. Estrutura de Pastas

```
a2-publisher/
├── src/
│   ├── app/
│   │   ├── (dashboard)/              # Grupo de rotas autenticadas (layout com sidebar)
│   │   │   ├── layout.tsx            # Guard de auth: busca user + profile, redireciona se não autenticado
│   │   │   ├── page.tsx              # Dashboard: lista de sites do usuário logado
│   │   │   ├── admin/
│   │   │   │   ├── clients/          # CRUD de clientes (apenas admin)
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── clients-list.tsx
│   │   │   │   │   └── new-client-dialog.tsx
│   │   │   │   ├── sites/            # CRUD de sites (apenas admin)
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── sites-list.tsx
│   │   │   │   │   └── new-site-dialog.tsx  # Formulário: supabase ou wordpress + credenciais
│   │   │   │   └── gmb-posts/        # Visualização de posts Google My Business
│   │   │   │       ├── page.tsx
│   │   │   │       └── gmb-posts-list.tsx
│   │   │   └── sites/[siteId]/
│   │   │       ├── page.tsx          # Lista de posts de um site
│   │   │       ├── posts-list.tsx
│   │   │       ├── delete-post-button.tsx
│   │   │       ├── integration/
│   │   │       │   ├── page.tsx      # Instruções de integração + config GitHub
│   │   │       │   ├── integration-client.tsx  # Formulário de config do GitHub push
│   │   │       │   └── actions.ts    # Server Action: salva config GitHub no site
│   │   │       └── posts/
│   │   │           ├── new/page.tsx  # Cria post vazio e redireciona para editor
│   │   │           └── [postId]/
│   │   │               ├── page.tsx        # Server component: carrega post e site
│   │   │               └── post-editor.tsx # Client component principal do editor
│   │   ├── api/
│   │   │   ├── posts/route.ts              # GET público: lista/busca posts por api_key
│   │   │   ├── publish-wordpress/route.ts  # POST: publica post no WordPress via REST API
│   │   │   ├── wordpress-taxonomies/route.ts # GET: categorias e tags do WP
│   │   │   ├── github/push/route.ts        # POST: push imediato de post para GitHub
│   │   │   ├── import-post/route.ts        # POST: webhook do gerador de artigos (IA)
│   │   │   ├── upload-image/route.ts       # POST: upload cover/thumb pelo gerador
│   │   │   ├── upload-inline-image/route.ts # POST: upload imagem inline pelo gerador
│   │   │   ├── gmb-posts/route.ts          # POST: webhook de posts GMB do gerador
│   │   │   ├── cron/publish-scheduled/route.ts # GET: cron de publicação agendada (GitHub)
│   │   │   └── admin/
│   │   │       ├── create-client/route.ts  # POST: cria usuário cliente (admin only)
│   │   │       └── gmb-posts/[id]/route.ts # PATCH/DELETE: gerencia status de post GMB
│   │   ├── login/page.tsx            # Tela de login (client component)
│   │   ├── layout.tsx                # Root layout (html/body, globals.css)
│   │   └── globals.css
│   ├── components/
│   │   ├── editor/
│   │   │   ├── tiptap-editor.tsx     # Wrapper do editor TipTap
│   │   │   ├── editor-toolbar.tsx    # Toolbar de formatação
│   │   │   └── table-of-contents.tsx # TOC gerado a partir dos headings
│   │   ├── layout/
│   │   │   └── sidebar.tsx           # Sidebar responsivo com nav + info do usuário
│   │   └── ui/                       # Shadcn/UI components (button, input, card, etc.)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts             # createClient() (SSR, com React.cache) + createAdminClient()
│   │   │   ├── client.ts             # createClient() para browser
│   │   │   └── types.ts              # Tipos TypeScript derivados do schema do Supabase
│   │   ├── github-push.ts            # Lógica completa de push para GitHub (4 estratégias)
│   │   ├── tiptap-to-html.ts         # Conversor TipTap JSON → HTML (server-side, para WP)
│   │   └── utils.ts                  # cn() helper (clsx + tailwind-merge)
│   └── proxy.ts                      # ⚠️ Lógica de middleware (ver seção 8 — bug crítico)
├── supabase/
│   ├── migration_generator.sql       # Migration: colunas gerador de artigos + GitHub push
│   └── migration_gmb_posts.sql       # Migration: tabela gmb_posts
├── public/                           # Assets estáticos (SVGs padrão Next.js)
├── package.json
├── next.config.ts                    # Vazio (sem configurações customizadas)
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
└── components.json                   # Config Shadcn/UI
```

---

## 4. Fluxo Principal

### Fluxo Admin

1. Admin acessa `/admin/clients` → cria um cliente (chama `POST /api/admin/create-client`, que usa Supabase Admin SDK para criar usuário + profile)
2. Admin acessa `/admin/sites` → cria um site, vincula ao cliente, escolhe plataforma (`supabase` ou `wordpress`)
3. Para WordPress: preenche URL, usuário e Application Password (armazenados em `sites_wordpress_credentials`)
4. Para GitHub push: acessa a aba Integração do site e configura `github_repo`, `github_branch`, `blog_output_path`, `blog_framework`

### Fluxo Cliente (publicação)

1. Cliente faz login em `/login` → Supabase Auth (email + senha) → redireciona para `/`
2. Dashboard lista apenas os sites vinculados ao `user_id` do cliente (RLS do Supabase)
3. Cliente entra num site → vê lista de posts → cria novo post ou edita existente
4. Editor (TipTap): título, slug (auto-gerado), imagem de capa, seo_title, seo_description, conteúdo rich text
5. **Auto-save**: qualquer mudança dispara debounce de 1500ms → salva rascunho no Supabase via cliente browser
6. **Publicação** depende da plataforma:
   - **Supabase**: atualiza `status = 'published'` e `published_at` → post fica disponível na `GET /api/posts`
   - **WordPress**: chama `POST /api/publish-wordpress` → server converte TipTap JSON para HTML, faz upload de imagem de capa para WP Media Library, cria/atualiza post via WP REST API, atualiza Yoast SEO (opcional), salva `wp_post_id` em `posts.wp_metadata`
   - **GitHub**: chama `POST /api/github/push` → server gera arquivo (`.html`, `.ts`, `.md`) e commita no repositório via GitHub API
7. Suporte a **agendamento**: se `published_at` for data futura, WordPress recebe `status: future`; GitHub usa cron job (`GET /api/cron/publish-scheduled`) que roda periodicamente e faz push quando o horário chegar

### Fluxo Gerador de IA (pipeline externo)

1. Sistema externo chama `POST /api/import-post` com header `X-Generator-Api-Key` → post criado como `draft`, `source: 'generated'`
2. Imagens enviadas via `POST /api/upload-image` e `POST /api/upload-inline-image` (mesmo header de auth)
3. Admin revisa no painel e clica em Publicar
4. Posts GMB (Google My Business) chegam via `POST /api/gmb-posts` com `Authorization: Bearer <INTERNAL_GMB_API_KEY>` → exibidos em `/admin/gmb-posts`

---

## 5. Integrações Externas

| Serviço | Como é usado | Ponto de entrada |
|---------|-------------|-----------------|
| **Supabase Auth** | Login email+senha, sessão via cookies | `supabase.auth.signInWithPassword()` |
| **Supabase PostgreSQL** | Armazenamento de profiles, sites, posts, gmb_posts | `@supabase/ssr` + `@supabase/supabase-js` |
| **Supabase Storage** | Bucket `post-images` — cover/thumb/inline images | `supabase.storage.from('post-images')` |
| **WordPress REST API** | Publicação de posts, upload de mídia, categorias/tags | `${wp_url}/wp-json/wp/v2/...` |
| **WordPress Custom Endpoint** | Atualização de Yoast SEO (opcional, requer Code Snippets) | `${wp_url}/wp-json/a2publisher/v1/seo/{id}` |
| **GitHub API v3** | Push de arquivos de posts para repositórios de clientes | `https://api.github.com/repos/...` |
| **Gerador de artigos (IA externo)** | Webhook de entrada de posts gerados | `POST /api/import-post`, `POST /api/upload-image` |
| **Pipeline GMB (externo)** | Webhook de posts Google My Business | `POST /api/gmb-posts` |

---

## 6. Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Sim | Chave pública anon do Supabase (usada no browser e server) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Sim | Chave service role (bypassa RLS) — usada em rotas admin e gerador |
| `NEXT_PUBLIC_APP_URL` | ✅ Sim | URL pública da aplicação (ex: `https://app.a2publisher.com`) — usada no retorno do import-post |
| `GITHUB_TOKEN` | ⚠️ Se usar GitHub push | Personal Access Token com permissão de `repo` — usado em `github-push.ts` |
| `CRON_SECRET` | ⚠️ Se usar agendamento GitHub | Secret para autenticar chamadas ao endpoint de cron (`/api/cron/publish-scheduled`) |
| `INTERNAL_GMB_API_KEY` | ⚠️ Se usar GMB | Chave para autenticar chamadas ao `POST /api/gmb-posts` |

---

## 7. Pontos de Configuração por Cliente

Cada cliente corresponde a um conjunto de registros no banco. O que muda de cliente para cliente está 100% armazenado no Supabase:

| O que configura | Tabela/Coluna | Valores |
|----------------|--------------|---------|
| Qual usuário acessa o site | `sites.user_id` | UUID do profile do cliente |
| Plataforma de publicação | `sites.platform` | `supabase` ou `wordpress` |
| Credenciais WordPress | `sites_wordpress_credentials` | `wp_url`, `wp_username`, `wp_application_password` |
| Repositório GitHub | `sites.github_repo` | ex: `AlexFariaa/site-clinicax` |
| Branch do GitHub | `sites.github_branch` | default: `main` |
| Caminho de saída dos posts | `sites.blog_output_path` | ex: `blog/` ou `src/data/blog/` |
| Framework do site | `sites.blog_framework` | `vanilla-html`, `nextjs-ts-data`, `nextjs`, `astro`, `none` |
| Template HTML antes do artigo | `sites.blog_html_before` | HTML completo com placeholders `[TÍTULO]`, `[SLUG]`, etc. |
| Template HTML após o artigo | `sites.blog_html_after` | HTML completo com placeholders |
| Chave do gerador de IA | `sites.generator_api_key` | Auto-gerada (16 bytes hex) |
| Chave pública de API | `sites.api_key` | Auto-gerada (32 bytes hex) |

**Nenhum arquivo de código precisa ser alterado por cliente** — tudo é configuração de banco.

---

## 8. Problemas Conhecidos / Limitações

### 🔴 Crítico

1. **`proxy.ts` não é um middleware ativo.** O arquivo `src/proxy.ts` exporta a função `proxy` e um `config` com `matcher`, mas **não existe `src/middleware.ts`**. O Next.js só executa middleware se o arquivo se chamar `middleware.ts` na raiz de `src/`. Isso significa que toda a proteção de rotas (redirecionar não-autenticados, proteger `/admin`) **não está sendo executada no edge**. A proteção existe apenas nos próprios Server Components (layout.tsx e page.tsx de admin), mas sem o middleware, um usuário poderia acessar rotas de API admin sem passar pelos guards de UI.

2. **Schema base ausente.** O README menciona `supabase/schema.sql` mas este arquivo **não existe no repositório**. Só existem duas migrations (`migration_generator.sql` e `migration_gmb_posts.sql`) que são aditivas. Um novo setup do zero não tem como criar as tabelas base (`profiles`, `sites`, `posts`, `sites_wordpress_credentials`), triggers ou RLS policies iniciais.

### 🟡 Médio

3. **Credenciais WordPress em texto plano.** A `wp_application_password` é armazenada em texto plano na tabela `sites_wordpress_credentials`. Embora protegida por RLS (somente admins), não há criptografia em repouso.

4. **`seo_title` inconsistente.** O campo existe no banco (`posts.seo_title`) e é usado no editor e na publicação WordPress, mas não é retornado pela API pública `/api/posts` na lista (apenas na busca por slug). Clientes Supabase perdem o `seo_title` na lista.

5. **Sem paginação na API pública `/api/posts`.** Retorna todos os posts publicados de uma vez. Pode ser problema para sites com muitos posts.

6. **Sem rate limiting** em nenhuma das APIs públicas ou webhooks.

7. **`is_admin()` SQL function** é referenciada nas migrations mas sua definição não está no repositório.

8. **`blog_framework = 'nextjs-ts-data'` com path `src/data/blog/` é detectado como erro**, mas a validação é heurística e frágil (compara string do caminho).

9. **Cover image no editor do usuário** usa o Supabase Storage diretamente pelo cliente browser (storage bucket `post-images` precisa ter política pública de leitura e escrita por usuários autenticados — não verificável sem o schema base).

### 🟢 Menor

10. **`README.md` desatualizado.** Menciona Next.js 15 (pacote é 16.2.1), schema simplificado sem vários campos que existem no banco (`seo_title`, `published_at`, `wp_metadata`, `source`, `raw_html`, etc.), e não documenta as integrações de gerador IA, GMB posts, nem GitHub push.

11. **Sem testes** (nenhuma configuração de Jest, Vitest ou Playwright).

12. **Sem error monitoring** (Sentry ou equivalente).

---

## 9. O que Está Funcionando Bem

1. **Supabase client com `React.cache`** — evita round-trips duplicados ao Supabase quando layout e página chamam `getUser()` na mesma requisição HTTP.

2. **Separação de clientes Supabase** — `createClient()` para usuários autenticados (respeita RLS) vs `createAdminClient()` (service role, bypassa RLS) — padrão correto e seguro.

3. **Editor com auto-save debounced** (1500ms) — UX fluida sem salvar a cada tecla.

4. **Integração WordPress completa** — upload de imagem de capa para Media Library, categorias, tags, agendamento, suporte a Yoast SEO, idempotência (atualiza post existente via `wp_post_id` em `wp_metadata`).

5. **4 estratégias de GitHub push** bem implementadas:
   - `vanilla-html`: arquivo `.html` com template do cliente
   - `nextjs-ts-data`: arquivo `.ts` simples com objeto de dados
   - `nextjs`: arquivo `.ts` tipado com `BlogPost` + atualização de index via âncoras
   - `astro`: arquivo `.md` com frontmatter YAML

6. **API pública com suporte a agendamento** — filtra por `published_at <= now`, permitindo posts futuros.

7. **Webhook de importação de posts com dupla validação** (`site_id` + `generator_api_key`) — evita que uma chave vaze e publique em outro site.

8. **Sanitização de filename** no upload de imagens inline (`filename.replace(/[^a-zA-Z0-9._-]/g, '-')`).

9. **SEO warnings no editor** — alerta sobre ausência de title, capa, meta description, alt text em imagens, etc.

---

## 10. Dependências Entre Módulos

```
post-editor.tsx
  ├── createClient (browser) → Supabase (auto-save, cover upload, publish Supabase)
  ├── POST /api/publish-wordpress → publish-wordpress/route.ts
  │     ├── createClient (auth check)
  │     ├── createAdminClient (credenciais WP via RLS bypass)
  │     └── tiptap-to-html.ts (converter)
  ├── POST /api/github/push → github/push/route.ts
  │     ├── createClient (auth check)
  │     ├── createAdminClient (post + site data)
  │     └── github-push.ts (lógica de commit)
  └── GET /api/wordpress-taxonomies → wordpress-taxonomies/route.ts
        └── createAdminClient (credenciais WP)

/api/import-post → createAdminClient + nenhum auth de usuário (generator_api_key)
/api/upload-image → createAdminClient + generator_api_key
/api/gmb-posts → createAdminClient + INTERNAL_GMB_API_KEY
/api/cron/publish-scheduled → createAdminClient + CRON_SECRET + github-push.ts

/api/posts (pública) → createClient (anon, lê posts published)

DashboardLayout → createClient → auth.getUser() + profiles
proxy.ts (middleware não ativo) → createServerClient + auth.getUser()
```

---

## 11. Autenticação / Autorização

### Autenticação

- **Provider**: Supabase Auth (email + senha)
- **Sessão**: Cookie-based via `@supabase/ssr` — cookies gerenciados automaticamente em Server Components, Route Handlers e Server Actions
- **Login**: `supabase.auth.signInWithPassword()` no cliente browser → cookies de sessão definidos
- **Logout**: `supabase.auth.signOut()` → redireciona para `/login`

### Autorização

- **Guard de UI** (Server Components): `DashboardLayout` verifica `auth.getUser()` → redireciona para `/login` se não autenticado; páginas `/admin/*` verificam `profile.role === 'admin'`
- **Guard de Middleware** (⚠️ não ativo): `proxy.ts` implementa a lógica mas não é carregado como middleware
- **RLS (Row Level Security)** no Supabase:
  - `profiles`: usuário vê apenas o próprio profile
  - `sites`: usuário vê apenas sites onde `user_id = auth.uid()`
  - `posts`: usuário vê apenas posts de sites seus
  - `sites_wordpress_credentials`: apenas admins (via função `is_admin()`)
  - `gmb_posts`: apenas admins
- **APIs internas com autenticação própria**:
  - `/api/admin/create-client`: verifica `role = 'admin'` via Supabase
  - `/api/publish-wordpress`: verifica dono do site ou admin
  - `/api/github/push`: verifica dono do site ou admin
  - `/api/import-post`: `X-Generator-Api-Key` header (chave por site)
  - `/api/upload-image`, `/api/upload-inline-image`: `X-Generator-Api-Key`
  - `/api/gmb-posts`: `Authorization: Bearer <INTERNAL_GMB_API_KEY>`
  - `/api/cron/publish-scheduled`: `Authorization: Bearer <CRON_SECRET>`
- **API pública `/api/posts`**: autenticada por `api_key` de query param (por site, sem vínculo de usuário)

---

## 12. Como Rodar Localmente

```bash
# 1. Clone e instale dependências
git clone https://github.com/AlexFariaa/a2-publisher.git
cd a2-publisher
npm install

# 2. Configure as variáveis de ambiente
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Opcional (só se usar GitHub push):
GITHUB_TOKEN=ghp_...

# Opcional (só se usar agendamento GitHub):
CRON_SECRET=seu_secret_aqui

# Opcional (só se receber posts GMB):
INTERNAL_GMB_API_KEY=sua_chave_gmb
EOF

# 3. Configure o banco de dados no Supabase
# - Acesse Supabase → SQL Editor
# - Execute o schema base (ATENÇÃO: arquivo schema.sql não está no repo — precisa ser criado)
# - Execute supabase/migration_generator.sql
# - Execute supabase/migration_gmb_posts.sql

# 4. Crie o usuário admin no Supabase
# - Authentication → Users → Add user → Create new user
# - Depois no SQL Editor:
# UPDATE public.profiles SET role = 'admin' WHERE email = 'seu@email.com';

# 5. Inicie o servidor de desenvolvimento
npm run dev
# Acesse: http://localhost:3000

# Outros comandos úteis:
npm run build   # Build de produção
npm run lint    # ESLint
```

> **⚠️ Atenção:** Para o middleware de proteção de rotas funcionar, é necessário renomear (ou criar um `src/middleware.ts`) que importe e re-exporte a função `proxy` de `src/proxy.ts`.

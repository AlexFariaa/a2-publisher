# A2 Publisher

CMS headless simplificado para agências que gerenciam múltiplos sites de clientes. Permite que clientes publiquem posts diretamente, sem depender do desenvolvedor e sem a complexidade do WordPress.

---

## Índice

- [O que é](#o-que-é)
- [Como funciona](#como-funciona)
- [Stack](#stack)
- [Configuração inicial](#configuração-inicial)
- [Estrutura do banco de dados](#estrutura-do-banco-de-dados)
- [Papéis de usuário](#papéis-de-usuário)
- [Integrando ao site do cliente](#integrando-ao-site-do-cliente)
- [API pública](#api-pública)
- [Estrutura de pastas](#estrutura-de-pastas)

---

## O que é

O A2 Publisher é um painel de publicação visual onde clientes da agência escrevem e publicam posts nos próprios sites, sem precisar de suporte técnico. A agência (admin) cadastra os clientes, vincula os sites a eles, e os clientes acessam apenas o que é deles.

O conteúdo fica salvo no Supabase e é consumido em tempo real pelo site do cliente via API.

---

## Como funciona

```
Admin cria cliente → Admin vincula site ao cliente
        ↓
Cliente faz login → Vê apenas seus sites
        ↓
Cliente escreve post no editor → Salva como rascunho automaticamente
        ↓
Cliente clica "Publicar" → Post fica disponível na API
        ↓
Site do cliente faz fetch na API → Exibe o post
```

---

## Stack

| Camada      | Tecnologia                        |
|-------------|-----------------------------------|
| Frontend    | Next.js 15 (App Router)           |
| Estilização | Tailwind CSS + Shadcn/UI          |
| Editor      | TipTap                            |
| Banco       | Supabase (PostgreSQL)             |
| Storage     | Supabase Storage                  |
| Auth        | Supabase Auth                     |
| Deploy      | Vercel / Netlify                  |

---

## Configuração inicial

### 1. Clone e instale

```bash
git clone https://github.com/AlexFariaa/a2-publisher.git
cd a2-publisher
npm install
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

As chaves estão em: **Supabase → Project Settings → API**

### 3. Suba o schema no Supabase

No painel do Supabase, vá em **SQL Editor** e execute o conteúdo do arquivo:

```
supabase/schema.sql
```

Isso cria as tabelas, triggers, RLS policies e o bucket de imagens.

### 4. Crie seu usuário admin

> ⚠️ **Importante:** crie o usuário **depois** de executar o schema. O trigger que cria o profile só funciona para usuários novos. Se você criar o usuário antes, o profile não será gerado automaticamente.

1. Vá em **Supabase → Authentication → Users → Add user → Create new user**
2. Informe email e senha
3. No **SQL Editor**, execute:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'seu@email.com';
```

**Se o usuário foi criado antes do schema**, o profile não existe ainda. Nesse caso rode o INSERT manual:

```sql
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'seu@email.com';
```

### 5. Rode localmente

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## Estrutura do banco de dados

### `profiles`
Extende `auth.users` com papel e nome do usuário.

| Coluna      | Tipo      | Descrição                    |
|-------------|-----------|------------------------------|
| id          | UUID (PK) | Referência ao auth.users     |
| email       | TEXT      | Email do usuário             |
| full_name   | TEXT      | Nome completo                |
| role        | TEXT      | `admin` ou `user`            |
| created_at  | TIMESTAMP |                              |

### `sites`
Cada site pertence a um cliente.

| Coluna     | Tipo      | Descrição                              |
|------------|-----------|----------------------------------------|
| id         | UUID (PK) |                                        |
| user_id    | UUID (FK) | Referência ao profiles (dono do site)  |
| name       | TEXT      | Nome do site (ex: "Clínica X")         |
| domain     | TEXT      | Domínio (ex: "clinicax.com.br")        |
| api_key    | TEXT      | Chave gerada automaticamente para a API|
| created_at | TIMESTAMP |                                        |

### `posts`

| Coluna          | Tipo      | Descrição                          |
|-----------------|-----------|------------------------------------|
| id              | UUID (PK) |                                    |
| site_id         | UUID (FK) | Referência ao sites                |
| title           | TEXT      | Título do post (H1)                |
| slug            | TEXT      | URL amigável (único por site)      |
| content         | JSONB     | Conteúdo do editor TipTap          |
| cover_image     | TEXT      | URL da imagem de capa              |
| seo_description | TEXT      | Meta description                   |
| status          | TEXT      | `draft` ou `published`             |
| created_at      | TIMESTAMP |                                    |
| updated_at      | TIMESTAMP | Atualizado automaticamente         |

---

## Papéis de usuário

### Admin
- Acessa todos os sites e posts
- Cadastra novos clientes (cria conta + define nome)
- Cria sites e vincula a clientes
- Gerencia tudo via `/admin`

### Cliente (user)
- Vê apenas os sites vinculados a ele pelo admin
- Cria, edita e publica posts nesses sites
- Não tem acesso à área administrativa

---

## Integrando ao site do cliente

Para que os posts apareçam no site do cliente, são necessárias **duas páginas**:

### Onde encontrar a API Key

No painel do A2 Publisher, acesse o site → botão **Integração**. Lá estará a `api_key` e os códigos prontos para copiar.

---

### Página 1 — Lista de posts (`/blog`)

Exibe todos os posts publicados. Pode ser adicionada a uma página existente ou criada do zero.

**Next.js (App Router):**

```tsx
// app/blog/page.tsx
export default async function BlogPage() {
  const res = await fetch(
    `https://seu-a2publisher.netlify.app/api/posts?api_key=SUA_API_KEY`,
    { next: { revalidate: 60 } } // revalida a cada 60 segundos
  )
  const { posts } = await res.json()

  return (
    <main>
      <h1>Blog</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <a href={`/blog/${post.slug}`}>
              {post.cover_image && <img src={post.cover_image} alt={post.title} />}
              <h2>{post.title}</h2>
              <p>{post.seo_description}</p>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

**HTML puro (com JavaScript):**

```html
<!-- blog.html -->
<div id="posts-lista"></div>

<script>
  fetch('https://seu-a2publisher.netlify.app/api/posts?api_key=SUA_API_KEY')
    .then(res => res.json())
    .then(({ posts }) => {
      const container = document.getElementById('posts-lista')
      container.innerHTML = posts.map(post => `
        <article>
          <a href="/blog/${post.slug}">
            ${post.cover_image ? `<img src="${post.cover_image}" alt="${post.title}">` : ''}
            <h2>${post.title}</h2>
            <p>${post.seo_description ?? ''}</p>
          </a>
        </article>
      `).join('')
    })
</script>
```

---

### Página 2 — Post individual (`/blog/[slug]`)

Uma única página que serve para **todos os posts**. Lê o slug da URL e busca o conteúdo correspondente.

**Next.js (App Router):**

```tsx
// app/blog/[slug]/page.tsx
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'

interface Props {
  params: { slug: string }
}

export default async function PostPage({ params }: Props) {
  const res = await fetch(
    `https://seu-a2publisher.netlify.app/api/posts?api_key=SUA_API_KEY&slug=${params.slug}`,
    { next: { revalidate: 60 } }
  )

  if (!res.ok) return <p>Post não encontrado.</p>

  const { post } = await res.json()

  // Converte o JSON do TipTap para HTML
  const html = generateHTML(post.content, [StarterKit, Image])

  return (
    <article>
      {post.cover_image && <img src={post.cover_image} alt={post.title} />}
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  )
}

// Gera os slugs estaticamente (opcional, para melhor performance)
export async function generateStaticParams() {
  const res = await fetch(
    `https://seu-a2publisher.netlify.app/api/posts?api_key=SUA_API_KEY`
  )
  const { posts } = await res.json()
  return posts.map((post: { slug: string }) => ({ slug: post.slug }))
}
```

**HTML puro (com JavaScript):**

```html
<!-- post.html -->
<!-- URL esperada: /post.html?slug=nome-do-post -->

<div id="post-conteudo"></div>

<script>
  const slug = new URLSearchParams(window.location.search).get('slug')

  fetch(`https://seu-a2publisher.netlify.app/api/posts?api_key=SUA_API_KEY&slug=${slug}`)
    .then(res => res.json())
    .then(({ post }) => {
      document.title = post.title
      document.getElementById('post-conteudo').innerHTML = `
        ${post.cover_image ? `<img src="${post.cover_image}" alt="${post.title}">` : ''}
        <h1>${post.title}</h1>
        <div>${renderTipTap(post.content)}</div>
      `
    })

  // Renderização básica do conteúdo TipTap para HTML puro
  function renderTipTap(doc) {
    if (!doc?.content) return ''
    return doc.content.map(node => nodeToHtml(node)).join('')
  }

  function nodeToHtml(node) {
    if (!node) return ''
    const inner = node.content ? node.content.map(nodeToHtml).join('') : (node.text ?? '')
    const marks = node.marks ?? []
    let text = inner
    for (const mark of marks) {
      if (mark.type === 'bold') text = `<strong>${text}</strong>`
      if (mark.type === 'italic') text = `<em>${text}</em>`
      if (mark.type === 'link') text = `<a href="${mark.attrs.href}">${text}</a>`
    }
    switch (node.type) {
      case 'paragraph':   return `<p>${text}</p>`
      case 'heading':     return `<h${node.attrs.level}>${text}</h${node.attrs.level}>`
      case 'bulletList':  return `<ul>${text}</ul>`
      case 'orderedList': return `<ol>${text}</ol>`
      case 'listItem':    return `<li>${text}</li>`
      case 'image':       return `<img src="${node.attrs.src}" alt="${node.attrs.alt ?? ''}">`
      case 'hardBreak':   return `<br>`
      default:            return text
    }
  }
</script>
```

> **Nota:** Em sites Next.js, use `generateHTML` do pacote `@tiptap/html` para conversão confiável. O renderizador manual acima cobre os casos básicos para HTML puro.

---

## API pública

### `GET /api/posts`

Retorna posts publicados de um site identificado pela `api_key`.

**Buscar todos os posts:**
```
GET /api/posts?api_key=SUA_API_KEY
```

**Buscar post por slug:**
```
GET /api/posts?api_key=SUA_API_KEY&slug=nome-do-post
```

**Respostas:**

```json
// Lista (sem o campo content para performance)
{
  "posts": [
    {
      "id": "uuid",
      "title": "Título do post",
      "slug": "titulo-do-post",
      "cover_image": "https://...",
      "seo_description": "Descrição para SEO",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}

// Post individual (inclui content)
{
  "post": {
    "id": "uuid",
    "title": "Título do post",
    "slug": "titulo-do-post",
    "content": { },
    "cover_image": "https://...",
    "seo_description": "Descrição para SEO",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Erros:**

| Status | Motivo                        |
|--------|-------------------------------|
| 400    | `api_key` não informada       |
| 401    | `api_key` inválida            |
| 404    | Post com esse slug não existe |

---

## Estrutura de pastas

```
src/
├── app/
│   ├── (dashboard)/          # Área autenticada
│   │   ├── page.tsx          # Dashboard — lista de sites
│   │   ├── layout.tsx        # Layout com sidebar
│   │   ├── admin/
│   │   │   ├── clients/      # Gerenciar clientes
│   │   │   └── sites/        # Gerenciar sites
│   │   └── sites/[siteId]/
│   │       ├── page.tsx      # Lista de posts do site
│   │       ├── integration/  # Instruções de integração + api_key
│   │       └── posts/
│   │           ├── new/      # Criar novo post
│   │           └── [postId]/ # Editar post existente
│   ├── api/
│   │   ├── posts/            # GET /api/posts (pública)
│   │   └── admin/
│   │       └── create-client/ # POST — cria usuário cliente
│   └── login/                # Tela de login
├── components/
│   ├── editor/               # TipTap + toolbar + sumário
│   ├── layout/               # Sidebar
│   └── ui/                   # Shadcn/UI components
└── lib/
    └── supabase/             # Clients (server/browser) + types
```

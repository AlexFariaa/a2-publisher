'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Site } from '@/lib/supabase/types'
import { ChevronLeft, Copy, Check, Globe, Code2, FileCode2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Props {
  site: Site
  apiBase: string
}

function CodeBlock({ code, language = 'js' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group rounded-lg overflow-hidden border border-neutral-200 bg-neutral-950">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-neutral-800 text-neutral-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      <pre className="text-sm text-neutral-200 p-5 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-neutral-900 text-white text-xs font-semibold flex items-center justify-center mt-0.5">
        {number}
      </div>
      <div className="flex-1 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        {children}
      </div>
    </div>
  )
}

type Tab = 'nextjs' | 'html'

export function IntegrationClient({ site, apiBase }: Props) {
  const [tab, setTab] = useState<Tab>('nextjs')
  const [apiKeyCopied, setApiKeyCopied] = useState(false)

  const apiUrl = `${apiBase}/api/posts?api_key=${site.api_key}`
  const apiUrlSlug = `${apiBase}/api/posts?api_key=${site.api_key}&slug=SLUG-DO-POST`

  function copyApiKey() {
    navigator.clipboard.writeText(site.api_key)
    setApiKeyCopied(true)
    toast.success('API Key copiada!')
    setTimeout(() => setApiKeyCopied(false), 2000)
  }

  const nextjsListCode = `// app/blog/page.tsx
export default async function BlogPage() {
  const res = await fetch(
    '${apiUrl}',
    { next: { revalidate: 60 } } // atualiza a cada 60 segundos
  )
  const { posts } = await res.json()

  return (
    <main>
      <h1>Blog</h1>
      <ul>
        {posts.map(post => (
          <li key={post.id}>
            <a href={\`/blog/\${post.slug}\`}>
              {post.cover_image && <img src={post.cover_image} alt={post.title} />}
              <h2>{post.title}</h2>
              <p>{post.seo_description}</p>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}`

  const nextjsPostCode = `// app/blog/[slug]/page.tsx
interface Props {
  params: Promise<{ slug: string }>
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const res = await fetch(
    '${apiUrlSlug}'.replace('SLUG-DO-POST', slug),
    { next: { revalidate: 60 } }
  )

  if (!res.ok) return <p>Post não encontrado.</p>
  const { post } = await res.json()

  return (
    <article>
      {post.cover_image && <img src={post.cover_image} alt={post.title} />}
      <h1>{post.title}</h1>
      {/* Renderiza o conteúdo HTML gerado pelo TipTap */}
      <div dangerouslySetInnerHTML={{ __html: renderContent(post.content) }} />
    </article>
  )
}

// Converte o JSON do TipTap em HTML simples
function renderContent(content) {
  if (!content?.content) return ''
  return content.content.map(node => nodeToHtml(node)).join('')
}

function nodeToHtml(node) {
  if (!node) return ''
  const children = node.content?.map(nodeToHtml).join('') ?? node.text ?? ''
  const marks = node.marks ?? []
  let text = children
  for (const mark of marks) {
    if (mark.type === 'bold') text = \`<strong>\${text}</strong>\`
    if (mark.type === 'italic') text = \`<em>\${text}</em>\`
    if (mark.type === 'link') text = \`<a href="\${mark.attrs.href}">\${text}</a>\`
  }
  switch (node.type) {
    case 'heading': return \`<h\${node.attrs.level}>\${text}</h\${node.attrs.level}>\`
    case 'paragraph': return \`<p>\${text}</p>\`
    case 'bulletList': return \`<ul>\${text}</ul>\`
    case 'orderedList': return \`<ol>\${text}</ol>\`
    case 'listItem': return \`<li>\${text}</li>\`
    case 'image': return \`<img src="\${node.attrs.src}" alt="\${node.attrs.alt ?? ''}" />\`
    case 'blockquote': return \`<blockquote>\${text}</blockquote>\`
    case 'hardBreak': return '<br />'
    case 'horizontalRule': return '<hr />'
    default: return text
  }
}`

  const htmlListCode = `<!-- Cole na página onde quer listar os posts (ex: blog.html) -->
<div id="posts-container">Carregando posts...</div>

<script>
  fetch('${apiUrl}')
    .then(r => r.json())
    .then(({ posts }) => {
      const container = document.getElementById('posts-container')

      if (!posts || posts.length === 0) {
        container.innerHTML = '<p>Nenhum post publicado ainda.</p>'
        return
      }

      container.innerHTML = posts.map(post => \`
        <article>
          \${post.cover_image ? \`<img src="\${post.cover_image}" alt="\${post.title}" />\` : ''}
          <h2><a href="/blog/\${post.slug}">\${post.title}</a></h2>
          <p>\${post.seo_description ?? ''}</p>
          <small>\${new Date(post.created_at).toLocaleDateString('pt-BR')}</small>
        </article>
      \`).join('')
    })
    .catch(() => {
      document.getElementById('posts-container').innerHTML = '<p>Erro ao carregar posts.</p>'
    })
</script>`

  const htmlPostCode = `<!-- Cole na página individual do post (ex: post.html) -->
<!-- A URL deve conter o slug: /blog.html?slug=nome-do-post -->

<div id="post-container">Carregando...</div>

<script>
  const slug = new URLSearchParams(window.location.search).get('slug')

  if (!slug) {
    document.getElementById('post-container').innerHTML = '<p>Post não encontrado.</p>'
  } else {
    fetch('${apiUrlSlug}'.replace('SLUG-DO-POST', slug))
      .then(r => r.json())
      .then(({ post, error }) => {
        if (error) {
          document.getElementById('post-container').innerHTML = '<p>Post não encontrado.</p>'
          return
        }

        // Atualiza SEO da página
        document.title = post.title
        document.querySelector('meta[name="description"]')
          ?.setAttribute('content', post.seo_description ?? '')

        document.getElementById('post-container').innerHTML = \`
          \${post.cover_image ? \`<img src="\${post.cover_image}" alt="\${post.title}" />\` : ''}
          <h1>\${post.title}</h1>
          <div class="post-content">\${renderContent(post.content)}</div>
        \`
      })
  }

  function renderContent(content) {
    if (!content?.content) return ''
    return content.content.map(nodeToHtml).join('')
  }

  function nodeToHtml(node) {
    if (!node) return ''
    const children = node.content?.map(nodeToHtml).join('') ?? node.text ?? ''
    let text = children
    for (const mark of (node.marks ?? [])) {
      if (mark.type === 'bold') text = \`<strong>\${text}</strong>\`
      if (mark.type === 'italic') text = \`<em>\${text}</em>\`
      if (mark.type === 'link') text = \`<a href="\${mark.attrs.href}">\${text}</a>\`
    }
    switch (node.type) {
      case 'heading': return \`<h\${node.attrs.level}>\${text}</h\${node.attrs.level}>\`
      case 'paragraph': return \`<p>\${text}</p>\`
      case 'bulletList': return \`<ul>\${text}</ul>\`
      case 'orderedList': return \`<ol>\${text}</ol>\`
      case 'listItem': return \`<li>\${text}</li>\`
      case 'image': return \`<img src="\${node.attrs.src}" alt="\${node.attrs.alt ?? ''}" />\`
      case 'blockquote': return \`<blockquote>\${text}</blockquote>\`
      case 'hardBreak': return '<br />'
      case 'horizontalRule': return '<hr />'
      default: return text
    }
  }
</script>`

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/sites/${site.id}`}
          className="text-sm text-neutral-400 hover:text-neutral-600 flex items-center gap-1 mb-4"
        >
          <ChevronLeft size={14} /> {site.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Integração</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Como conectar o A2 Publisher ao site <span className="font-medium text-neutral-700">{site.domain}</span>
        </p>
      </div>

      {/* API Key */}
      <div className="border border-neutral-200 rounded-lg bg-white p-5 mb-8 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Sua API Key</p>
          <Badge variant="secondary" className="text-xs">Não compartilhe publicamente</Badge>
        </div>
        <div className="flex items-center gap-3">
          <code className="flex-1 text-sm bg-neutral-50 border border-neutral-200 rounded-md px-3 py-2 font-mono truncate text-neutral-700">
            {site.api_key}
          </code>
          <button
            onClick={copyApiKey}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 shrink-0"
          >
            {apiKeyCopied ? <Check size={14} /> : <Copy size={14} />}
            Copiar
          </button>
        </div>
        <p className="text-xs text-neutral-400">
          Esta chave identifica seu site. Use-a nas chamadas de API abaixo.
        </p>
      </div>

      {/* Como funciona */}
      <div className="mb-8 p-5 bg-neutral-50 rounded-lg border border-neutral-200">
        <h2 className="text-sm font-semibold mb-3">Como funciona</h2>
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <div className="flex items-center gap-2">
            <span className="font-medium">A2 Publisher</span>
            <span className="text-neutral-300">→ salva posts no banco →</span>
            <span className="font-medium">API</span>
            <span className="text-neutral-300">→ seu site busca via fetch →</span>
            <span className="font-medium">Aparece no site</span>
          </div>
        </div>
        <p className="text-xs text-neutral-400 mt-3">
          Quando você publica um post aqui, ele fica disponível na API imediatamente.
          O site do cliente busca esses dados e exibe automaticamente — sem deploy, sem alteração de código.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-1 border-b border-neutral-200">
          <button
            onClick={() => setTab('nextjs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'nextjs'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Code2 size={14} /> Next.js / React
          </button>
          <button
            onClick={() => setTab('html')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'html'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <FileCode2 size={14} /> HTML puro
          </button>
        </div>
      </div>

      {/* Conteúdo das tabs */}
      <div className="space-y-8">
        {tab === 'nextjs' && (
          <>
            <Step number={1} title="Página de listagem dos posts (app/blog/page.tsx)">
              <p className="text-sm text-neutral-500">
                Crie a rota <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">/blog</code> no seu projeto Next.js com o código abaixo.
                O <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">revalidate: 60</code> faz o Next.js atualizar o cache a cada 60 segundos.
              </p>
              <CodeBlock code={nextjsListCode} />
            </Step>

            <Step number={2} title="Página individual do post (app/blog/[slug]/page.tsx)">
              <p className="text-sm text-neutral-500">
                Crie a rota dinâmica <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">/blog/[slug]</code> para exibir o conteúdo completo de cada post.
                A função <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">renderContent</code> converte o JSON do editor em HTML.
              </p>
              <CodeBlock code={nextjsPostCode} />
            </Step>

            <Step number={3} title="Pronto">
              <p className="text-sm text-neutral-500">
                Publique um post no A2 Publisher e acesse <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">/blog</code> no seu site.
                O post vai aparecer automaticamente, sem deploy.
              </p>
            </Step>
          </>
        )}

        {tab === 'html' && (
          <>
            <Step number={1} title="Página de listagem (ex: blog.html)">
              <p className="text-sm text-neutral-500">
                Cole o código abaixo na página onde você quer listar os posts, antes do{' '}
                <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">&lt;/body&gt;</code>.
              </p>
              <CodeBlock code={htmlListCode} language="html" />
            </Step>

            <Step number={2} title="Página individual do post (ex: post.html)">
              <p className="text-sm text-neutral-500">
                Crie uma página <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">post.html</code> e cole o código abaixo.
                O slug do post vem pela URL: <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">post.html?slug=nome-do-post</code>.
                Os links da listagem já devem apontar para esse formato.
              </p>
              <CodeBlock code={htmlPostCode} language="html" />
            </Step>

            <Step number={3} title="Pronto">
              <p className="text-sm text-neutral-500">
                Publique um post no A2 Publisher e acesse <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded">blog.html</code> no seu site.
                O post vai aparecer automaticamente.
              </p>
            </Step>
          </>
        )}
      </div>

      {/* Endpoints de referência */}
      <div className="mt-10 border border-neutral-200 rounded-lg bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-200 bg-neutral-50">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Endpoints disponíveis</p>
        </div>
        <div className="divide-y divide-neutral-100">
          <div className="px-5 py-3 flex items-start gap-4">
            <Badge className="text-xs mt-0.5 shrink-0">GET</Badge>
            <div>
              <code className="text-xs font-mono text-neutral-700">/api/posts?api_key=...</code>
              <p className="text-xs text-neutral-400 mt-0.5">Lista todos os posts publicados do site</p>
            </div>
          </div>
          <div className="px-5 py-3 flex items-start gap-4">
            <Badge className="text-xs mt-0.5 shrink-0">GET</Badge>
            <div>
              <code className="text-xs font-mono text-neutral-700">/api/posts?api_key=...&slug=nome-do-post</code>
              <p className="text-xs text-neutral-400 mt-0.5">Retorna um post específico pelo slug</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

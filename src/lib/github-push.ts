import type { SupabaseClient } from '@supabase/supabase-js'
import type { Post, Site } from '@/lib/supabase/types'

interface PushResult {
  success: boolean
  sha?: string
  commitUrl?: string
  error?: string
}

const GITHUB_API = 'https://api.github.com'

function githubHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

// Converte slug em camelCase para uso como identificador TypeScript
function toCamelCase(slug: string): string {
  return slug
    .split('-')
    .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

// Gera o arquivo .ts para framework nextjs-ts-data
function generateTsDataFile(post: Post): string {
  const safeTitle = post.title.replace(/'/g, "\\'").replace(/`/g, '\\`')
  const safeSeoTitle = (post.seo_title ?? post.title).replace(/'/g, "\\'").replace(/`/g, '\\`')
  const safeSeoDesc = (post.seo_description ?? '').replace(/'/g, "\\'").replace(/`/g, '\\`')
  const safeHtml = post.raw_html!.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')

  return `const post = {
  slug: '${post.slug}',
  title: '${safeTitle}',
  seoTitle: '${safeSeoTitle}',
  seoDescription: '${safeSeoDesc}',
  coverImage: '${post.cover_image ?? ''}',
  publishedAt: '${post.published_at ?? new Date().toISOString()}',
  content: \`${safeHtml}\`,
}

export default post
`
}

// Gera conteúdo HTML completo para vanilla-html (arquivo .html puro)
// Se blog_html_before e blog_html_after estiverem configurados no site, usa o template do cliente.
// Caso contrário, gera um HTML bare genérico (retrocompatibilidade).
const PT_BR_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ')
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function applyPostPlaceholders(template: string, post: Post): string {
  const seoTitle = post.seo_title ?? post.title
  const seoDesc = post.seo_description ?? ''
  const date = post.published_at ? new Date(post.published_at) : new Date()
  const dateIso = date.toISOString().split('T')[0]
  const dateFormatted = `${date.getUTCDate()} ${PT_BR_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
  const readingTime = estimateReadingTime(post.raw_html ?? '')

  return template
    .replace(/\[TÍTULO\]/g, seoTitle)
    .replace(/\[TITULO\]/g, seoTitle)
    .replace(/\[TÍTULO H1\]/g, post.title)
    .replace(/\[TITULO H1\]/g, post.title)
    .replace(/\[DESCRIÇÃO\]/g, seoDesc)
    .replace(/\[DESCRICAO\]/g, seoDesc)
    .replace(/\[SLUG\]/g, post.slug)
    .replace(/\[DATA-ISO\]/g, dateIso)
    .replace(/\[DATA FORMATADA\]/g, dateFormatted)
    .replace(/\[X min de leitura\]/g, `${readingTime} min de leitura`)
    .replace(/\[COVER\]/g, post.cover_image ?? '')
    .replace(/\[PALAVRAS-CHAVE\]/g, seoDesc)
}

function generateHtmlFile(post: Post, htmlBefore?: string | null, htmlAfter?: string | null): string {
  if (htmlBefore && htmlAfter) {
    const before = applyPostPlaceholders(htmlBefore, post)
    const after = applyPostPlaceholders(htmlAfter, post)
    return before + (post.raw_html ?? '') + after
  }

  // Fallback: HTML bare genérico
  const seoTitle = post.seo_title ?? post.title
  const seoDesc = post.seo_description ?? ''
  const coverMeta = post.cover_image
    ? `\n  <meta property="og:image" content="${post.cover_image}" />`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${seoTitle}</title>
  <meta name="description" content="${seoDesc}" />${coverMeta}
</head>
<body>
  <article>
    ${post.cover_image ? `<img src="${post.cover_image}" alt="${post.title}" />` : ''}
    <h1>${post.title}</h1>
    ${post.raw_html}
  </article>
</body>
</html>
`
}

// Gera arquivo .md com frontmatter YAML para Astro
function generateAstroFile(post: Post): string {
  const seoTitle = post.seo_title ?? post.title
  const seoDesc = post.seo_description ?? ''

  return `---
title: '${post.title.replace(/'/g, "\\'")}'
seoTitle: '${seoTitle.replace(/'/g, "\\'")}'
description: '${seoDesc.replace(/'/g, "\\'")}'
coverImage: '${post.cover_image ?? ''}'
publishedAt: '${post.published_at ?? new Date().toISOString()}'
---

${post.raw_html}
`
}

// ── Estratégia vanilla-html / astro: PUT simples ──────────────

async function pushSingleFile(
  repo: string,
  branch: string,
  filePath: string,
  content: string,
  commitMessage: string,
): Promise<{ sha: string; commitUrl: string } | { error: string }> {
  const encoded = Buffer.from(content, 'utf-8').toString('base64')

  // Verifica se o arquivo já existe para obter o sha atual
  let existingSha: string | undefined
  const getRes = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${filePath}?ref=${branch}`,
    { headers: githubHeaders() },
  )
  if (getRes.ok) {
    const existing = await getRes.json() as { sha: string }
    existingSha = existing.sha
  }

  const body: Record<string, unknown> = {
    message: commitMessage,
    content: encoded,
    branch,
  }
  if (existingSha) body.sha = existingSha

  const putRes = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${filePath}`,
    { method: 'PUT', headers: githubHeaders(), body: JSON.stringify(body) },
  )

  if (!putRes.ok) {
    const err = await putRes.text()
    return { error: `GitHub PUT falhou: ${putRes.status} — ${err}` }
  }

  const putData = await putRes.json() as { content: { sha: string }; commit: { html_url: string } }
  return {
    sha: putData.content.sha,
    commitUrl: putData.commit.html_url,
  }
}

// ── Estratégia nextjs-ts-data: Trees API (multi-file) ─────────

async function pushNextjsTsData(
  post: Post,
  repo: string,
  branch: string,
  outputPath: string,
): Promise<{ sha: string; commitUrl: string } | { error: string }> {
  const slug = post.slug
  const camel = toCamelCase(slug)
  const postFilePath = `${outputPath}${slug}.ts`
  const indexFilePath = `${outputPath}blog-posts.ts`

  // 1. Obter SHA do commit atual
  const refRes = await fetch(
    `${GITHUB_API}/repos/${repo}/git/refs/heads/${branch}`,
    { headers: githubHeaders() },
  )
  if (!refRes.ok) return { error: `Falha ao obter ref: ${refRes.status}` }
  const refData = await refRes.json() as { object: { sha: string } }
  const currentCommitSha = refData.object.sha

  // 2. Obter SHA da tree do commit atual
  const commitRes = await fetch(
    `${GITHUB_API}/repos/${repo}/git/commits/${currentCommitSha}`,
    { headers: githubHeaders() },
  )
  if (!commitRes.ok) return { error: `Falha ao obter commit: ${commitRes.status}` }
  const commitData = await commitRes.json() as { tree: { sha: string } }
  const baseTreeSha = commitData.tree.sha

  // 3. Criar blob do novo post
  const postContent = generateTsDataFile(post)
  const postBlobRes = await fetch(
    `${GITHUB_API}/repos/${repo}/git/blobs`,
    {
      method: 'POST',
      headers: githubHeaders(),
      body: JSON.stringify({ content: postContent, encoding: 'utf-8' }),
    },
  )
  if (!postBlobRes.ok) return { error: `Falha ao criar blob do post: ${postBlobRes.status}` }
  const postBlob = await postBlobRes.json() as { sha: string }

  // 4. Buscar e atualizar blog-posts.ts (adicionar import + entrada no array)
  let updatedIndexContent: string
  const indexRes = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${indexFilePath}?ref=${branch}`,
    { headers: githubHeaders() },
  )
  if (indexRes.ok) {
    const indexData = await indexRes.json() as { content: string }
    const existing = Buffer.from(indexData.content.replace(/\n/g, ''), 'base64').toString('utf-8')

    // Insere import no topo (após últimos imports existentes)
    const importLine = `import ${camel} from './${slug}'`
    const withImport = existing.replace(
      /((?:import .+\n)*)/,
      `$1${importLine}\n`,
    )

    // Insere entrada no início do array blogPosts
    updatedIndexContent = withImport.replace(
      /const blogPosts\s*=\s*\[/,
      `const blogPosts = [\n  ${camel},`,
    )
  } else {
    // Cria arquivo index do zero se não existir
    updatedIndexContent = `import ${camel} from './${slug}'\n\nconst blogPosts = [\n  ${camel},\n]\n\nexport default blogPosts\n`
  }

  // 5. Criar blob do index atualizado
  const indexBlobRes = await fetch(
    `${GITHUB_API}/repos/${repo}/git/blobs`,
    {
      method: 'POST',
      headers: githubHeaders(),
      body: JSON.stringify({ content: updatedIndexContent, encoding: 'utf-8' }),
    },
  )
  if (!indexBlobRes.ok) return { error: `Falha ao criar blob do index: ${indexBlobRes.status}` }
  const indexBlob = await indexBlobRes.json() as { sha: string }

  // 6. Criar nova tree com os dois arquivos
  const treeRes = await fetch(
    `${GITHUB_API}/repos/${repo}/git/trees`,
    {
      method: 'POST',
      headers: githubHeaders(),
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [
          { path: postFilePath, mode: '100644', type: 'blob', sha: postBlob.sha },
          { path: indexFilePath, mode: '100644', type: 'blob', sha: indexBlob.sha },
        ],
      }),
    },
  )
  if (!treeRes.ok) return { error: `Falha ao criar tree: ${treeRes.status}` }
  const treeData = await treeRes.json() as { sha: string }

  // 7. Criar novo commit
  const newCommitRes = await fetch(
    `${GITHUB_API}/repos/${repo}/git/commits`,
    {
      method: 'POST',
      headers: githubHeaders(),
      body: JSON.stringify({
        message: `blog: publicar artigo ${slug}`,
        tree: treeData.sha,
        parents: [currentCommitSha],
      }),
    },
  )
  if (!newCommitRes.ok) return { error: `Falha ao criar commit: ${newCommitRes.status}` }
  const newCommit = await newCommitRes.json() as { sha: string; html_url: string }

  // 8. Atualizar ref da branch
  const patchRes = await fetch(
    `${GITHUB_API}/repos/${repo}/git/refs/heads/${branch}`,
    {
      method: 'PATCH',
      headers: githubHeaders(),
      body: JSON.stringify({ sha: newCommit.sha }),
    },
  )
  if (!patchRes.ok) return { error: `Falha ao atualizar ref: ${patchRes.status}` }

  return { sha: postBlob.sha, commitUrl: newCommit.html_url }
}

// ── Função principal exportada ────────────────────────────────

export async function pushPostToGitHub(
  postId: string,
  supabaseAdmin: SupabaseClient,
): Promise<PushResult> {
  // 1. Buscar post + site
  const { data: postData, error: postError } = await supabaseAdmin
    .from('posts')
    .select('*, sites(github_repo, github_branch, blog_output_path, blog_framework, blog_html_before, blog_html_after)')
    .eq('id', postId)
    .single()

  if (postError || !postData) {
    return { success: false, error: 'Post não encontrado' }
  }

  const post = postData as Post & {
    sites: Pick<Site, 'github_repo' | 'github_branch' | 'blog_output_path' | 'blog_framework' | 'blog_html_before' | 'blog_html_after'>
  }
  const site = post.sites

  // 2. Validações
  if (!post.raw_html) return { success: false, error: 'Post não tem raw_html' }
  if (!site.github_repo) return { success: false, error: 'github_repo não configurado no site' }
  if (!site.blog_framework || site.blog_framework === 'none') {
    return { success: false, error: 'blog_framework não configurado ou é "none"' }
  }
  if (!process.env.GITHUB_TOKEN) return { success: false, error: 'GITHUB_TOKEN não configurado' }

  const repo = site.github_repo
  const branch = site.github_branch ?? 'main'
  const outputPath = site.blog_output_path
    ? site.blog_output_path.replace(/\/?$/, '/')  // garante trailing slash
    : 'blog/'

  // 3. Push conforme framework
  let result: { sha: string; commitUrl: string } | { error: string }
  const commitMsg = `blog: publicar artigo ${post.slug}`

  if (site.blog_framework === 'nextjs-ts-data') {
    result = await pushNextjsTsData(post, repo, branch, outputPath)
  } else if (site.blog_framework === 'astro') {
    const filePath = `${outputPath}${post.slug}.md`
    result = await pushSingleFile(repo, branch, filePath, generateAstroFile(post), commitMsg)
  } else {
    // vanilla-html (padrão)
    const filePath = `${outputPath}${post.slug}.html`
    result = await pushSingleFile(repo, branch, filePath, generateHtmlFile(post, site.blog_html_before, site.blog_html_after), commitMsg)
  }

  if ('error' in result) return { success: false, error: result.error }

  // 4. Salvar github_sha no post
  await supabaseAdmin
    .from('posts')
    .update({ github_sha: result.sha })
    .eq('id', postId)

  return { success: true, sha: result.sha, commitUrl: result.commitUrl }
}

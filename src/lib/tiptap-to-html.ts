// Converte o JSON do TipTap para HTML limpo
// Suporta as extensions usadas no editor: StarterKit + Image + Link

interface TipTapMark {
  type: string
  attrs?: Record<string, string>
}

interface TipTapNode {
  type: string
  text?: string
  attrs?: Record<string, string | number | null>
  content?: TipTapNode[]
  marks?: TipTapMark[]
}

interface TipTapDocument {
  type: 'doc'
  content?: TipTapNode[]
}

function nodeToHtml(node: TipTapNode): string {
  if (!node) return ''

  // Nó de texto puro — aplica marks (bold, italic, link)
  if (node.type === 'text') {
    let text = node.text ?? ''
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') text = `<strong>${text}</strong>`
      else if (mark.type === 'italic') text = `<em>${text}</em>`
      else if (mark.type === 'link') {
        const href = mark.attrs?.href ?? '#'
        const target = mark.attrs?.target ? ` target="${mark.attrs.target}"` : ''
        text = `<a href="${href}"${target}>${text}</a>`
      }
    }
    return text
  }

  const children = (node.content ?? []).map(nodeToHtml).join('')

  switch (node.type) {
    case 'doc':
      return children
    case 'paragraph':
      return `<p>${children}</p>`
    case 'heading': {
      const level = node.attrs?.level ?? 2
      return `<h${level}>${children}</h${level}>`
    }
    case 'bulletList':
      return `<ul>${children}</ul>`
    case 'orderedList':
      return `<ol>${children}</ol>`
    case 'listItem':
      return `<li>${children}</li>`
    case 'blockquote':
      return `<blockquote>${children}</blockquote>`
    case 'horizontalRule':
      return '<hr />'
    case 'hardBreak':
      return '<br />'
    case 'image': {
      const src = node.attrs?.src ?? ''
      const alt = node.attrs?.alt ?? ''
      const title = node.attrs?.title
      return `<img src="${src}" alt="${alt}"${title ? ` title="${String(title)}"` : ''} />`
    }
    case 'codeBlock':
      return `<pre><code>${children}</code></pre>`
    case 'code':
      return `<code>${children}</code>`
    default:
      return children
  }
}

export function tiptapJsonToHtml(doc: TipTapDocument | null | undefined): string {
  if (!doc?.content) return ''
  return doc.content.map(nodeToHtml).join('')
}

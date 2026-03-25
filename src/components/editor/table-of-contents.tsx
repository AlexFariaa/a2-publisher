'use client'

import type { JSONContent } from '@tiptap/react'

interface TocItem {
  id: string
  level: number
  text: string
}

function extractHeadings(content: JSONContent | null): TocItem[] {
  if (!content?.content) return []

  const headings: TocItem[] = []

  function traverse(nodes: JSONContent[]) {
    for (const node of nodes) {
      if (node.type === 'heading' && (node.attrs?.level === 2 || node.attrs?.level === 3)) {
        const text = node.content?.map(c => c.text ?? '').join('') ?? ''
        if (text.trim()) {
          headings.push({
            id: text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            level: node.attrs.level,
            text,
          })
        }
      }
      if (node.content) traverse(node.content)
    }
  }

  traverse(content.content)
  return headings
}

interface TableOfContentsProps {
  content: JSONContent | null
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const headings = extractHeadings(content)

  if (headings.length === 0) return null

  return (
    <div className="border border-neutral-200 rounded-lg bg-white p-4">
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
        Índice gerado
      </p>
      <ul className="space-y-1.5">
        {headings.map((h, i) => (
          <li
            key={i}
            className={`text-sm text-neutral-600 ${h.level === 3 ? 'pl-4' : ''}`}
          >
            <span className="text-neutral-300 mr-2 text-xs">H{h.level}</span>
            {h.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

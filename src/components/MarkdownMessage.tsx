import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface MarkdownMessageProps {
  source: string
}

export default function MarkdownMessage({ source }: MarkdownMessageProps) {
  const escaped = source.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const unsafe = marked.parse(escaped, {
    mangle: false,
    headerIds: false,
    breaks: true,
  })
  const html = DOMPurify.sanitize(unsafe)
  return <div class="markdown-message" dangerouslySetInnerHTML={{ __html: html }} />
}

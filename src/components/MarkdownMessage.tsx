import DOMPurify from 'dompurify'
import { marked } from 'marked'

export default function MarkdownMessage({ source }: { source: string }) {
  const renderer = new marked.Renderer()
  // Disable raw HTML entirely
  renderer.html = () => ''
  const raw = marked.parse(source, { renderer, mangle: false, headerIds: false })
  const sanitized = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'p',
      'em',
      'strong',
      'code',
      'pre',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'blockquote',
      'a',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'br'
    ],
    ALLOWED_ATTR: ['href', 'title'],
    RETURN_TRUSTED_TYPE: false
  }) as string
  return <div class="markdown-message" dangerouslySetInnerHTML={{ __html: sanitized }} />
}


import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface MarkdownMessageProps {
  source: string
}

export default function MarkdownMessage({ source }: MarkdownMessageProps) {
  const escaped = source.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // newer versions of `marked` removed the `mangle` and `headerIds` options;
  // passing them now results in a type error. These features are disabled
  // by default, so we only need to enable line breaks explicitly.
  const unsafe = marked.parse(escaped, {
    breaks: true,
    async: false,
  })
  const html = DOMPurify.sanitize(unsafe)
  return <div class="markdown-message" dangerouslySetInnerHTML={{ __html: html }} />
}

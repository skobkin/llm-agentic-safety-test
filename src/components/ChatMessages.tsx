import type { RefObject } from 'preact'
import MarkdownMessage from './MarkdownMessage'
import type { ChatMessage } from '../types'

interface Props {
  messages: ChatMessage[]
  pendingAssistant?: string
  removeMessage: (createdAt: number) => Promise<void>
  bottomRef: RefObject<HTMLDivElement>
}

export default function ChatMessages({
  messages,
  pendingAssistant,
  removeMessage,
  bottomRef,
}: Props) {
  return (
    <div style="flex: 1; overflow-y: auto;">
      {messages.map((m) => (
        <div
          key={m.createdAt}
          style="margin-bottom: 0.25rem; display: flex; gap: 0.25rem; align-items: flex-start;"
        >
          {m.role === 'user' && (
            <>
              <span>👨</span>
              <MarkdownMessage source={m.content} />
            </>
          )}
          {m.role === 'assistant' && (
            <>
              <span>🤖</span>
              <MarkdownMessage source={m.content} />
            </>
          )}
          {m.role === 'error' && <MarkdownMessage source={m.content} />}
          {m.role === 'reasoning' && (
            <details>
              <summary>🤖💭</summary>
              <pre style="white-space: pre-wrap;">{m.content}</pre>
            </details>
          )}
          {m.role === 'tool' && (
            <>
              🤖🔧 <mark>{m.toolName}()</mark> {JSON.stringify(m.args)}{' '}
              {m.result !== undefined && `=> ${JSON.stringify(m.result)}`}
            </>
          )}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              removeMessage(m.createdAt)
            }}
            style="margin-left: 0.5rem;"
          >
            x
          </a>
        </div>
      ))}
      {pendingAssistant && (
        <div
          style="margin-bottom: 0.25rem; display: flex; gap: 0.25rem; align-items: flex-start;"
        >
          <span>🤖</span>
          <MarkdownMessage source={pendingAssistant} />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}

import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocation } from 'wouter-preact'
import { useAppStore } from '../store'
import type { ChatMessage, ToolDefinition } from '../types'

export default function ChatScreen() {
  const { settings, messages, tools, addMessage, resetChat, addTool, clearTools, load } =
    useAppStore()
  const [, navigate] = useLocation()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!settings) navigate('/settings')
  }, [settings, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!settings) return
    const userMessage: ChatMessage = { role: 'user', content: input, createdAt: Date.now() }
    await addMessage(userMessage)
    setInput('')

    const payload = {
      model: 'gpt-3.5-turbo',
      messages: messages
        .filter((m) => m.role !== 'tool')
        .concat(userMessage)
        .map((m) => ({ role: m.role, content: m.content })),
      tools: tools
        .filter((t) => !t.disabled)
        .map((t) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: {
              type: 'object',
              properties: Object.fromEntries(t.args.map((a) => [a.name, { type: a.type }])),
            },
          },
        })),
    }

    try {
      const res = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiToken ? { Authorization: `Bearer ${settings.apiToken}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content ?? '[no reply]'
      await addMessage({ role: 'assistant', content, createdAt: Date.now() })
      const toolCalls = data.choices?.[0]?.message?.tool_calls
      if (toolCalls) {
        for (const call of toolCalls) {
          const args = JSON.parse(call.function.arguments)
          await addMessage({
            role: 'tool',
            toolName: call.function.name,
            args,
            createdAt: Date.now(),
          })
        }
      }
    } catch (err) {
      await addMessage({
        role: 'assistant',
        content: String(err),
        createdAt: Date.now(),
      })
    }
  }

  const onAddTool = async () => {
    const name = prompt('Tool name?')
    if (!name) return
    const description = prompt('Description?') || ''
    const tool: ToolDefinition = {
      id: crypto.randomUUID(),
      name,
      description,
      args: [],
      returnType: 'string',
      disabled: false,
      createdAt: Date.now(),
    }
    await addTool(tool)
  }

  return (
    <div class="container" style="display: flex; gap: 1rem;">
      <div style="flex: 1; overflow-y: auto; max-height: 80vh;">
        {messages.map((m) => (
          <p>
            {m.role === 'user' && `👨 ${m.content}`}
            {m.role === 'assistant' && `🤖 ${m.content}`}
            {m.role === 'tool' && (
              <em>
                🤖👉🔧 {m.toolName} {JSON.stringify(m.args)}
              </em>
            )}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
      <aside style="width: 300px;">
        <h3>Tools</h3>
        {tools.map((t) => (
          <div>
            <input
              type="checkbox"
              checked={!t.disabled}
              onChange={() => useAppStore.getState().updateTool({ ...t, disabled: !t.disabled })}
            />{' '}
            {t.name}
          </div>
        ))}
        <button onClick={onAddTool}>Add Tool</button>
        <hr />
        <button onClick={() => resetChat()}>Reset Chat</button>
        <button onClick={() => clearTools()}>Clear All Tools</button>
      </aside>
      <div style="position: fixed; bottom: 1rem; left: 1rem; right: 320px;">
        <input
          style="width: 100%;"
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage()
          }}
        />
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocation } from 'wouter-preact'
import { useAppStore } from '../store'
import type { ArgType, ChatMessage, ToolDefinition } from '../types'

export default function ChatScreen() {
  const { settings, messages, tools, addMessage, resetChat, addTool, clearTools, load } =
    useAppStore()
  const [, navigate] = useLocation()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const [dialog, setDialog] = useState<{ mode: 'export' | 'import'; text: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (dialog) {
      textareaRef.current?.focus()
      if (dialog.mode === 'export') textareaRef.current?.select()
    }
  }, [dialog])

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
      model: settings.model,
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
          const tool = tools.find((t) => t.name === call.function.name)
          await addMessage({
            role: 'tool',
            toolName: call.function.name,
            args,
            result: tool?.returnValue,
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
    let args: { name: string; type: ArgType }[] = []
    const argsInput = prompt('Parameters as JSON array (e.g. [{"name":"city","type":"string"}])?')
    if (argsInput) {
      try {
        const parsed = JSON.parse(argsInput) as { name: string; type: ArgType }[]
        if (Array.isArray(parsed)) args = parsed
      } catch {
        // ignore parse errors
      }
    }
    const returnType = (prompt('Return type (string/int/bool/object)?') || 'string') as ArgType
    const returnValue = prompt('Return value?') || ''
    const tool: ToolDefinition = {
      id: crypto.randomUUID(),
      name,
      description,
      args,
      returnType,
      returnValue,
      disabled: false,
      createdAt: Date.now(),
    }
    await addTool(tool)
  }

  return (
    <>
      <main class="container" style="display: flex; gap: 1rem; align-items: flex-start;">
        <div style="flex: 1; overflow-y: auto; max-height: 80vh;">
          {messages.map((m) => (
            <p>
              {m.role === 'user' && `👨 ${m.content}`}
              {m.role === 'assistant' && `🤖 ${m.content}`}
              {m.role === 'tool' && (
                <em>
                  🤖👉🔧 {m.toolName} {JSON.stringify(m.args)}{' '}
                  {m.result !== undefined && `=> ${JSON.stringify(m.result)}`}
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
              {t.name}{' '}
              <button
                onClick={() => useAppStore.getState().removeTool(t.id)}
                aria-label={`Delete ${t.name}`}
              >
                ✖
              </button>
            </div>
          ))}
          <button onClick={onAddTool}>Add Tool</button>
          <button
            onClick={() => setDialog({ mode: 'export', text: JSON.stringify(tools, null, 2) })}
            style="margin-left: 0.5rem;"
          >
            Export
          </button>
          <button
            onClick={() => {
              if (!confirm('Import will overwrite existing tools. Continue?')) return
              setDialog({ mode: 'import', text: '' })
            }}
            style="margin-left: 0.5rem;"
          >
            Import
          </button>
          <hr />
          <button onClick={() => resetChat()}>Reset Chat</button>
          <button onClick={() => clearTools()}>Clear All Tools</button>
          <hr />
          <button onClick={() => navigate('/settings')}>Settings</button>
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
      </main>
      {dialog && (
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
          <div style="background: white; padding: 1rem; width: 90%; max-width: 500px;">
            <textarea
              ref={textareaRef}
              style="width: 100%; height: 200px;"
              value={dialog.text}
              readOnly={dialog.mode === 'export'}
              onInput={
                dialog.mode === 'import'
                  ? (e) =>
                      setDialog({
                        ...dialog,
                        text: (e.target as HTMLTextAreaElement).value,
                      })
                  : undefined
              }
            />
            <div style="margin-top: 0.5rem; text-align: right;">
              {dialog.mode === 'import' ? (
                <button
                  onClick={async () => {
                    try {
                      const parsed = JSON.parse(dialog.text) as ToolDefinition[]
                      await useAppStore.getState().setTools(parsed)
                      setDialog(null)
                    } catch {
                      alert('Invalid JSON')
                    }
                  }}
                >
                  Import
                </button>
              ) : (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(dialog.text)
                    setDialog(null)
                  }}
                >
                  Copy
                </button>
              )}
              <button onClick={() => setDialog(null)} style="margin-left: 0.5rem;">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

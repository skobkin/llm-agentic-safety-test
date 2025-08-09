import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocation } from 'wouter-preact'
import { useAppStore } from '../store'
import type { ArgType, ChatMessage, ToolDefinition } from '../types'

export default function ChatScreen() {
  const {
    settings,
    messages,
    tools,
    addMessage,
    resetChat,
    addTool,
    clearTools,
    load,
    lastUsage,
    totalUsage,
    addUsage,
  } = useAppStore()
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
        .filter((m) => m.role !== 'tool' && m.role !== 'error')
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
      if (!res.ok || data.error) {
        const message = data.error?.message ?? `${res.status} ${res.statusText}`
        await addMessage({
          role: 'error',
          content: `❌ API: ${message}`,
          createdAt: Date.now(),
        })
        return
      }
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
      if (data.usage) {
        addUsage(data.usage)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await addMessage({
        role: 'error',
        content: `❌ API: ${message}`,
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
      <main class="container" style="display: flex; gap: 1rem; height: 100%;">
        <div style="flex: 0 0 70%; display: flex; flex-direction: column;">
          <div style="flex: 1; overflow-y: auto;">
            {messages.map((m) => (
              <p>
                {m.role === 'user' && `👨 ${m.content}`}
                {m.role === 'assistant' && `🤖 ${m.content}`}
                {m.role === 'error' && m.content}
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
          <div>
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
        <aside style="flex: 1; min-width: 300px; position: sticky; top: 0; align-self: flex-start;">
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
          <h3>Stats</h3>
          {lastUsage && (
            <div>
              <strong>Last:</strong>
              {lastUsage.prompt_tokens !== undefined && (
                <div>Prompt: {lastUsage.prompt_tokens}</div>
              )}
              {lastUsage.completion_tokens !== undefined && (
                <div>Completion: {lastUsage.completion_tokens}</div>
              )}
              {lastUsage.total_tokens !== undefined && <div>Total: {lastUsage.total_tokens}</div>}
            </div>
          )}
          {totalUsage && (
            <div style="margin-top: 0.5rem;">
              <strong>Session:</strong>
              {totalUsage.prompt_tokens !== undefined && (
                <div>Prompt: {totalUsage.prompt_tokens}</div>
              )}
              {totalUsage.completion_tokens !== undefined && (
                <div>Completion: {totalUsage.completion_tokens}</div>
              )}
              {totalUsage.total_tokens !== undefined && <div>Total: {totalUsage.total_tokens}</div>}
            </div>
          )}
          <hr />
          <button onClick={() => resetChat()}>Reset Chat</button>
          <button onClick={() => clearTools()}>Clear All Tools</button>
          <hr />
          <button onClick={() => navigate('/settings')}>Settings</button>
        </aside>
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

import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocation } from 'wouter-preact'
import { useAppStore } from '../store'
import type { ArgType, ChatMessage, ToolDefinition, Usage } from '../types'

type ChatCompletionResponse = {
  error?: { message?: string }
  choices?: {
    message?: {
      content?: string
      reasoning?: string
      tool_calls?: { function: { name: string; arguments?: string } }[]
    }
  }[]
  usage?: Usage
}

export default function ChatScreen() {
  const {
    settings,
    messages,
    tools,
    addMessage,
    removeMessage,
    resetChat,
    addTool,
    clearTools,
    load,
    lastUsage,
    totalUsage,
    addUsage,
    systemPrompt,
    setSystemPrompt,
  } = useAppStore()
  const [, navigate] = useLocation()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const [dialog, setDialog] = useState<{ mode: 'export' | 'import'; text: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [loading, setLoading] = useState(false)

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
    if (!settings || loading) return
    const userMessage: ChatMessage = { role: 'user', content: input, createdAt: Date.now() }
    await addMessage(userMessage)
    setInput('')
    setLoading(true)

    const activeTools = tools
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
      }))

    const apiMessages = messages
      .filter((m) => m.role !== 'tool' && m.role !== 'error' && m.role !== 'reasoning')
      .concat(userMessage)
      .map((m) => ({ role: m.role, content: m.content }))
    if (systemPrompt) apiMessages.unshift({ role: 'system', content: systemPrompt })

    const payload: Record<string, unknown> = {
      model: settings.model,
      messages: apiMessages,
      tool_choice: activeTools.length > 0 ? 'auto' : 'none',
      usage: { include: true },
    }
    if (activeTools.length > 0) payload.tools = activeTools

    try {
      let data: ChatCompletionResponse
      try {
        const res = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(settings.apiToken ? { Authorization: `Bearer ${settings.apiToken}` } : {}),
          },
          body: JSON.stringify(payload),
        })
        data = (await res.json()) as ChatCompletionResponse
        if (!res.ok || data.error) {
          const message = data.error?.message ?? `${res.status} ${res.statusText}`
          await addMessage({
            role: 'error',
            content: `❌ API: ${message}`,
            createdAt: Date.now(),
          })
          return
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        await addMessage({
          role: 'error',
          content: `❌ API: ${message}`,
          createdAt: Date.now(),
        })
        return
      }

      try {
        const reasoning = data.choices?.[0]?.message?.reasoning
        if (reasoning) {
          await addMessage({ role: 'reasoning', content: reasoning, createdAt: Date.now() })
        }
        const content = data.choices?.[0]?.message?.content ?? '[no reply]'
        await addMessage({ role: 'assistant', content, createdAt: Date.now() })
        const toolCalls = data.choices?.[0]?.message?.tool_calls
        if (toolCalls) {
          for (const call of toolCalls) {
            let args: Record<string, unknown> = {}
            try {
              if (call.function.arguments) {
                args = JSON.parse(call.function.arguments)
              }
            } catch {
              // ignore parse errors
            }
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
          content: `❌ App: ${message}`,
          createdAt: Date.now(),
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await addMessage({
        role: 'error',
        content: `❌ App: ${message}`,
        createdAt: Date.now(),
      })
    } finally {
      setLoading(false)
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
              <div key={m.createdAt} style="margin-bottom: 0.25rem;">
                {m.role === 'user' && <span>👨 {m.content}</span>}
                {m.role === 'assistant' && <span>🤖 {m.content}</span>}
                {m.role === 'error' && <span>{m.content}</span>}
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
            <div ref={bottomRef} />
          </div>
          {loading && <progress style="width: 100%;"></progress>}
          <div>
            <input
              style="width: 100%;"
              value={input}
              aria-busy={loading}
              disabled={loading}
              onInput={(e) => setInput((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage()
              }}
            />
          </div>
        </div>
        <aside style="flex: 1; min-width: 300px; position: sticky; top: 0; align-self: flex-start;">
          <details>
            <summary>System Prompt</summary>
            <textarea
              style="width: 100%;"
              value={systemPrompt}
              onInput={(e) => setSystemPrompt((e.target as HTMLTextAreaElement).value)}
            />
          </details>
          <h3>Tools</h3>
          <div role="group" style="margin-bottom: 0.5rem;">
            <button onClick={onAddTool}>Add Tool</button>
            <button
              onClick={() =>
                setDialog({
                  mode: 'export',
                  text: JSON.stringify({ systemPrompt, tools }, null, 2),
                })
              }
            >
              Export
            </button>
            <button
              onClick={() => {
                if (!confirm('Import will overwrite existing tools. Continue?')) return
                setDialog({ mode: 'import', text: '' })
              }}
            >
              Import
            </button>
          </div>
          <div style={tools.length > 5 ? 'max-height: 10rem; overflow-y: auto;' : undefined}>
            {tools.map((t) => (
              <div>
                <input
                  type="checkbox"
                  checked={!t.disabled}
                  onChange={() =>
                    useAppStore.getState().updateTool({ ...t, disabled: !t.disabled })
                  }
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
          </div>
          <h3>Stats</h3>
          {(lastUsage || totalUsage) && (
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Last</th>
                  <th>$</th>
                  <th>Total</th>
                  <th>$</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Prompt</th>
                  <td>{lastUsage?.prompt_tokens ?? '-'}</td>
                  <td>
                    {lastUsage?.prompt_cost !== undefined ? lastUsage.prompt_cost.toFixed(4) : '-'}
                  </td>
                  <td>{totalUsage?.prompt_tokens ?? '-'}</td>
                  <td>
                    {totalUsage?.prompt_cost !== undefined
                      ? totalUsage.prompt_cost.toFixed(4)
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <th>Completion</th>
                  <td>{lastUsage?.completion_tokens ?? '-'}</td>
                  <td>
                    {lastUsage?.completion_cost !== undefined
                      ? lastUsage.completion_cost.toFixed(4)
                      : '-'}
                  </td>
                  <td>{totalUsage?.completion_tokens ?? '-'}</td>
                  <td>
                    {totalUsage?.completion_cost !== undefined
                      ? totalUsage.completion_cost.toFixed(4)
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <th>Total</th>
                  <td>{lastUsage?.total_tokens ?? '-'}</td>
                  <td>
                    {lastUsage?.total_cost !== undefined ? lastUsage.total_cost.toFixed(4) : '-'}
                  </td>
                  <td>{totalUsage?.total_tokens ?? '-'}</td>
                  <td>
                    {totalUsage?.total_cost !== undefined ? totalUsage.total_cost.toFixed(4) : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
          <hr />
          <div role="group">
            <button onClick={() => resetChat()}>Reset Chat</button>
            <button onClick={() => clearTools()}>Clear All Tools</button>
            <button onClick={() => navigate('/settings')}>Settings</button>
          </div>
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
                      const parsed = JSON.parse(dialog.text)
                      if (Array.isArray(parsed)) {
                        await useAppStore.getState().setTools(parsed)
                        await setSystemPrompt('')
                      } else {
                        if (Array.isArray(parsed.tools)) {
                          await useAppStore.getState().setTools(parsed.tools)
                        }
                        await setSystemPrompt(parsed.systemPrompt ?? '')
                      }
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

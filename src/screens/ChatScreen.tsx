import { useEffect, useRef, useState } from 'preact/hooks'
import { useLocation } from 'wouter-preact'
import { useAppStore } from '../store'
import type { ArgType, ChatMessage, ToolDefinition, ChatCompletionResponse } from '../types'
import Modal from '../components/Modal'
import ChatMessages from '../components/ChatMessages'
import ToolsPanel from '../components/ToolsPanel'
import StatsTable from '../components/StatsTable'
import { requestChatCompletion } from '../services/llm'

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
  const [toolForm, setToolForm] = useState<{
    tool?: ToolDefinition
    name: string
    description: string
    args: string
    returnType: ArgType
    returnValue: string
  } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (dialog) {
      textareaRef.current?.focus()
      if (dialog.mode === 'export') textareaRef.current?.select()
    }
  }, [dialog])

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

    const runAssistant = async () => {
      for (;;) {
        const { settings: s, messages: msgs, tools: ts, systemPrompt: sp } = useAppStore.getState()
        if (!s) return

        let data: ChatCompletionResponse
        try {
          data = await requestChatCompletion(s, msgs, ts, sp)
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
          const content = data.choices?.[0]?.message?.content?.trim() ?? ''
          const toolCalls = data.choices?.[0]?.message?.tool_calls
          if (content || !toolCalls) {
            await addMessage({ role: 'assistant', content, createdAt: Date.now() })
          }
          if (data.usage) {
            addUsage(data.usage)
          }
          if (!toolCalls) {
            break
          }
          for (const call of toolCalls) {
            let args: Record<string, unknown> = {}
            try {
              if (call.function.arguments) {
                args = JSON.parse(call.function.arguments)
              }
            } catch {
              // ignore parse errors
            }
            const tool = ts.find((t) => t.name === call.function.name)
            await addMessage({
              role: 'tool',
              toolName: call.function.name,
              toolCallId: call.id,
              args,
              result: tool?.returnValue,
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
          break
        }
      }
    }

    try {
      await runAssistant()
    } finally {
      setLoading(false)
    }
  }

  const onAddTool = () => {
    setToolForm({
      name: '',
      description: '',
      args: '[]',
      returnType: 'string',
      returnValue: '',
    })
  }

  const onEditTool = (t: ToolDefinition) => {
    setToolForm({
      tool: t,
      name: t.name,
      description: t.description,
      args: JSON.stringify(t.args),
      returnType: t.returnType,
      returnValue: t.returnValue,
    })
  }

  return (
    <>
      <main class="container" style="display: flex; gap: 1rem; height: 100%;">
        <div style="flex: 0 0 70%; display: flex; flex-direction: column;">
          <ChatMessages messages={messages} removeMessage={removeMessage} bottomRef={bottomRef} />
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
          <ToolsPanel
            tools={tools}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            onAddTool={onAddTool}
            onEditTool={onEditTool}
            setDialog={setDialog}
          />
          <StatsTable lastUsage={lastUsage} totalUsage={totalUsage} />
          <hr />
          <div role="group">
            <button onClick={() => resetChat()}>Reset Chat</button>
            <button onClick={() => clearTools()}>Clear All Tools</button>
            <button onClick={() => navigate('/settings')}>Settings</button>
          </div>
        </aside>
      </main>
      {dialog && (
        <Modal>
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
        </Modal>
      )}

      {toolForm && (
        <Modal>
          <h3>{toolForm.tool ? 'Edit Tool' : 'Add Tool'}</h3>
          <label>
            Name
            <input
              value={toolForm.name}
              onInput={(e) =>
                setToolForm({ ...toolForm, name: (e.target as HTMLInputElement).value })
              }
            />
          </label>
          <label>
            Description
            <input
              value={toolForm.description}
              onInput={(e) =>
                setToolForm({
                  ...toolForm,
                  description: (e.target as HTMLInputElement).value,
                })
              }
            />
          </label>
          <label>
            Parameters (JSON)
            <textarea
              style="width: 100%; height: 100px;"
              value={toolForm.args}
              onInput={(e) =>
                setToolForm({ ...toolForm, args: (e.target as HTMLTextAreaElement).value })
              }
            />
          </label>
          <label>
            Return Type
            <select
              value={toolForm.returnType}
              onInput={(e) =>
                setToolForm({
                  ...toolForm,
                  returnType: (e.target as HTMLSelectElement).value as ArgType,
                })
              }
            >
              <option value="string">string</option>
              <option value="int">int</option>
              <option value="bool">bool</option>
              <option value="object">object</option>
            </select>
          </label>
          <label>
            Return Value
            <input
              value={toolForm.returnValue}
              onInput={(e) =>
                setToolForm({
                  ...toolForm,
                  returnValue: (e.target as HTMLInputElement).value,
                })
              }
            />
          </label>
          <div style="margin-top: 0.5rem; text-align: right;">
            <button
              onClick={async () => {
                if (!toolForm) return
                try {
                  const args = JSON.parse(toolForm.args) as {
                    name: string
                    type: ArgType
                  }[]
                  if (toolForm.tool) {
                    await useAppStore.getState().updateTool({
                      ...toolForm.tool,
                      name: toolForm.name,
                      description: toolForm.description,
                      args,
                      returnType: toolForm.returnType,
                      returnValue: toolForm.returnValue,
                    })
                  } else {
                    const tool: ToolDefinition = {
                      id: crypto.randomUUID(),
                      name: toolForm.name,
                      description: toolForm.description,
                      args,
                      returnType: toolForm.returnType,
                      returnValue: toolForm.returnValue,
                      disabled: false,
                      createdAt: Date.now(),
                    }
                    await addTool(tool)
                  }
                  setToolForm(null)
                } catch {
                  alert('Invalid parameters JSON')
                }
              }}
            >
              Save
            </button>
            <button onClick={() => setToolForm(null)} style="margin-left: 0.5rem;">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

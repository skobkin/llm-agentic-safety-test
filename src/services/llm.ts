import type { Settings, ChatMessage, ToolDefinition, ChatCompletionResponse } from '../types'

export async function requestChatCompletion(
  settings: Settings,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  systemPrompt: string,
): Promise<ChatCompletionResponse> {
  type ApiMessage =
    | { role: 'user' | 'assistant' | 'system'; content: string }
    | { role: 'tool'; content: string; tool_call_id: string }

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

  const apiMessages: ApiMessage[] = messages
    .filter((m) => m.role !== 'error' && m.role !== 'reasoning')
    .map((m) => {
      if (m.role === 'tool') {
        return {
          role: 'tool',
          content: String(m.result ?? ''),
          tool_call_id: m.toolCallId,
        }
      }
      return { role: m.role as 'user' | 'assistant' | 'system', content: m.content }
    })

  if (systemPrompt) apiMessages.unshift({ role: 'system', content: systemPrompt })

  const payload: Record<string, unknown> = {
    model: settings.model,
    messages: apiMessages,
    tool_choice: activeTools.length > 0 ? 'auto' : 'none',
    usage: { include: true },
  }
  if (activeTools.length > 0) payload.tools = activeTools

  const res = await fetch(`${settings.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.apiToken ? { Authorization: `Bearer ${settings.apiToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })
  const data = (await res.json()) as ChatCompletionResponse
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `${res.status} ${res.statusText}`)
  }
  return data
}

export type { ChatCompletionResponse } from '../types'

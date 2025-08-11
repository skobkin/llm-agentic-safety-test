import type { Settings, ChatMessage, ToolDefinition, ChatCompletionResponse } from '../types'

export async function requestChatCompletion(
  settings: Settings,
  messages: ChatMessage[],
  tools: ToolDefinition[],
  systemPrompt: string,
  onChunk?: (token: string) => void,
): Promise<ChatCompletionResponse> {
  type ApiMessage =
    | {
        role: 'user' | 'system'
        content: string
      }
    | {
        role: 'assistant'
        content: string
        tool_calls?: {
          id: string
          type: 'function'
          function: { name: string; arguments?: string }
        }[]
      }
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
      if (m.role === 'assistant') {
        return {
          role: 'assistant',
          content: m.content,
          ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
        }
      }
      return { role: m.role as 'user' | 'system', content: m.content }
    })

  if (systemPrompt) apiMessages.unshift({ role: 'system', content: systemPrompt })

  const payload: Record<string, unknown> = {
    model: settings.model,
    messages: apiMessages,
    tool_choice: activeTools.length > 0 ? 'auto' : 'none',
    usage: { include: true },
    ...(onChunk ? { stream: true } : {}),
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

  if (!onChunk) {
    const data = (await res.json()) as ChatCompletionResponse
    if (!res.ok || data.error) {
      throw new Error(data.error?.message ?? `${res.status} ${res.statusText}`)
    }
    return data
  }

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let toolCalls:
    | { id: string; type: 'function'; function: { name: string; arguments?: string } }[]
    | undefined
  let usage: ChatCompletionResponse['usage']

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value)
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const dataStr = trimmed.slice(5).trim()
      if (dataStr === '[DONE]') {
        buffer = ''
        continue
      }
      const json = JSON.parse(dataStr)
      const delta = json.choices?.[0]?.delta
      if (delta?.content) {
        content += delta.content
        onChunk(delta.content)
      }
      if (delta?.tool_calls) {
        toolCalls = toolCalls ?? []
        for (const tc of delta.tool_calls) {
          const index = tc.index ?? toolCalls.length
          const existing = toolCalls[index] ?? {
            id: tc.id ?? '',
            // Ensure the `type` field is always included for each tool call
            type: 'function',
            function: { name: tc.function?.name ?? '', arguments: '' },
          }
          if (tc.id) existing.id = tc.id
          if (tc.type) existing.type = tc.type
          if (tc.function?.name) existing.function.name = tc.function.name
          if (tc.function?.arguments)
            existing.function.arguments =
              (existing.function.arguments ?? '') + tc.function.arguments
          toolCalls[index] = existing
        }
      }
      if (json.choices?.[0]?.message?.tool_calls) {
        toolCalls = json.choices[0].message.tool_calls.map(
          (tc: {
            id: string
            type?: string
            function?: { name?: string; arguments?: string }
          }) => ({
            id: tc.id,
            type: tc.type ?? 'function',
            function: {
              name: tc.function?.name,
              arguments: tc.function?.arguments,
            },
          }),
        )
      }
      if (json.usage) {
        usage = json.usage
      }
    }
  }

  return {
    choices: [
      {
        message: {
          content,
          ...(toolCalls ? { tool_calls: toolCalls } : {}),
        },
      },
    ],
    ...(usage ? { usage } : {}),
  }
}

export type { ChatCompletionResponse } from '../types'

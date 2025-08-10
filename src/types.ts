export type Settings = {
  apiBaseUrl: string
  apiToken?: string
  model: string
}

export type ChatMessage =
  | { role: 'user'; content: string; createdAt: number }
  | { role: 'assistant'; content: string; createdAt: number }
  | { role: 'error'; content: string; createdAt: number }
  | { role: 'reasoning'; content: string; createdAt: number }
  | {
      role: 'tool'
      toolCallId: string
      toolName: string
      args: Record<string, unknown>
      result?: unknown
      createdAt: number
    }

export type ArgType = 'string' | 'int' | 'bool' | 'object'

export type ToolDefinition = {
  id: string
  name: string
  description: string
  args: { name: string; type: ArgType }[]
  returnType: ArgType
  returnValue: string
  disabled: boolean
  createdAt: number
}

export type Usage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  prompt_cost?: number
  completion_cost?: number
  total_cost?: number
}

export type ChatCompletionResponse = {
  error?: { message?: string }
  choices?: {
    message?: {
      content?: string
      reasoning?: string
      tool_calls?: { id: string; function: { name: string; arguments?: string } }[]
    }
  }[]
  usage?: Usage
}

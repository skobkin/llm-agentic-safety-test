export type Settings = {
  apiBaseUrl: string
  apiToken?: string
}

export type ChatMessage =
  | { role: 'user'; content: string; createdAt: number }
  | { role: 'assistant'; content: string; createdAt: number }
  | { role: 'tool'; toolName: string; args: Record<string, unknown>; createdAt: number }

export type ArgType = 'string' | 'int' | 'bool' | 'object'

export type ToolDefinition = {
  id: string
  name: string
  description: string
  args: { name: string; type: ArgType }[]
  returnType: ArgType
  disabled: boolean
  createdAt: number
}

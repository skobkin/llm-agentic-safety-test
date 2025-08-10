import { create } from 'zustand'
import type { Settings, ChatMessage, ToolDefinition, Usage } from './types'
import {
  saveSettings,
  loadSettings,
  saveMessages,
  loadMessages,
  saveTools,
  loadTools,
  removeMessages,
  removeTools,
  saveSystemPrompt,
  loadSystemPrompt,
} from './utils/storage'

interface AppState {
  settings?: Settings
  messages: ChatMessage[]
  tools: ToolDefinition[]
  lastUsage?: Usage
  totalUsage?: Usage
  systemPrompt: string
  setSettings: (s: Settings) => Promise<void>
  addMessage: (m: ChatMessage) => Promise<void>
  removeMessage: (createdAt: number) => Promise<void>
  addTool: (t: ToolDefinition) => Promise<void>
  updateTool: (t: ToolDefinition) => Promise<void>
  setTools: (ts: ToolDefinition[]) => Promise<void>
  removeTool: (id: string) => Promise<void>
  resetChat: () => Promise<void>
  clearTools: () => Promise<void>
  load: () => Promise<void>
  addUsage: (u: Usage) => void
  setSystemPrompt: (p: string) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: undefined,
  messages: [],
  tools: [],
  lastUsage: undefined,
  totalUsage: undefined,
  systemPrompt: '',
  async setSettings(s) {
    await saveSettings(s)
    set({ settings: s })
  },
  async addMessage(m) {
    const msgs = [...get().messages, m]
    await saveMessages(msgs)
    set({ messages: msgs })
  },
  async removeMessage(createdAt) {
    const msgs = get().messages.filter((m) => m.createdAt !== createdAt)
    await saveMessages(msgs)
    set({ messages: msgs })
  },
  async addTool(t) {
    const tools = [...get().tools, t]
    await saveTools(tools)
    set({ tools })
  },
  async updateTool(t) {
    const tools = get().tools.map((tool) => (tool.id === t.id ? t : tool))
    await saveTools(tools)
    set({ tools })
  },
  async setTools(ts) {
    await saveTools(ts)
    set({ tools: ts })
  },
  async removeTool(id) {
    const tools = get().tools.filter((t) => t.id !== id)
    await saveTools(tools)
    set({ tools })
  },
  async resetChat() {
    await removeMessages()
    set({ messages: [], lastUsage: undefined, totalUsage: undefined })
  },
  async clearTools() {
    await removeTools()
    set({ tools: [] })
  },
  async load() {
    const [settings, messages, tools, systemPrompt] = await Promise.all([
      loadSettings(),
      loadMessages(),
      loadTools(),
      loadSystemPrompt(),
    ])
    set({
      settings,
      messages,
      tools,
      systemPrompt,
    })
  },
  addUsage(u) {
    const prev = get().totalUsage ?? {}
    const totalCost = u.total_cost ?? u.cost ?? 0
    set({
      lastUsage: {
        ...u,
        ...(u.cost !== undefined && u.total_cost === undefined ? { total_cost: u.cost } : {}),
      },
      totalUsage: {
        prompt_tokens: (prev.prompt_tokens ?? 0) + (u.prompt_tokens ?? 0),
        completion_tokens: (prev.completion_tokens ?? 0) + (u.completion_tokens ?? 0),
        total_tokens: (prev.total_tokens ?? 0) + (u.total_tokens ?? 0),
        prompt_cost: (prev.prompt_cost ?? 0) + (u.prompt_cost ?? 0),
        completion_cost: (prev.completion_cost ?? 0) + (u.completion_cost ?? 0),
        total_cost: (prev.total_cost ?? 0) + totalCost,
      },
    })
  },
  async setSystemPrompt(p) {
    await saveSystemPrompt(p)
    set({ systemPrompt: p })
  },
}))

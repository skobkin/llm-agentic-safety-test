import { create } from 'zustand'
import localforage from 'localforage'
import type { Settings, ChatMessage, ToolDefinition, Usage } from './types'

const SETTINGS_KEY = 'settings'
const TOOLS_KEY = 'tools'
const HISTORY_KEY = 'history_default'

interface AppState {
  settings?: Settings
  messages: ChatMessage[]
  tools: ToolDefinition[]
  lastUsage?: Usage
  totalUsage?: Usage
  setSettings: (s: Settings) => Promise<void>
  addMessage: (m: ChatMessage) => Promise<void>
  addTool: (t: ToolDefinition) => Promise<void>
  updateTool: (t: ToolDefinition) => Promise<void>
  setTools: (ts: ToolDefinition[]) => Promise<void>
  removeTool: (id: string) => Promise<void>
  resetChat: () => Promise<void>
  clearTools: () => Promise<void>
  load: () => Promise<void>
  addUsage: (u: Usage) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: undefined,
  messages: [],
  tools: [],
  lastUsage: undefined,
  totalUsage: undefined,
  async setSettings(s) {
    await localforage.setItem(SETTINGS_KEY, s)
    set({ settings: s })
  },
  async addMessage(m) {
    const msgs = [...get().messages, m]
    await localforage.setItem(HISTORY_KEY, msgs)
    set({ messages: msgs })
  },
  async addTool(t) {
    const tools = [...get().tools, t]
    await localforage.setItem(TOOLS_KEY, tools)
    set({ tools })
  },
  async updateTool(t) {
    const tools = get().tools.map((tool) => (tool.id === t.id ? t : tool))
    await localforage.setItem(TOOLS_KEY, tools)
    set({ tools })
  },
  async setTools(ts) {
    await localforage.setItem(TOOLS_KEY, ts)
    set({ tools: ts })
  },
  async removeTool(id) {
    const tools = get().tools.filter((t) => t.id !== id)
    await localforage.setItem(TOOLS_KEY, tools)
    set({ tools })
  },
  async resetChat() {
    await localforage.removeItem(HISTORY_KEY)
    set({ messages: [], lastUsage: undefined, totalUsage: undefined })
  },
  async clearTools() {
    await localforage.removeItem(TOOLS_KEY)
    set({ tools: [] })
  },
  async load() {
    const [settings, messages, tools] = await Promise.all([
      localforage.getItem<Settings>(SETTINGS_KEY),
      localforage.getItem<ChatMessage[]>(HISTORY_KEY),
      localforage.getItem<ToolDefinition[]>(TOOLS_KEY),
    ])
    set({
      settings: settings ?? undefined,
      messages: messages ?? [],
      tools: tools ?? [],
    })
  },
  addUsage(u) {
    const prev = get().totalUsage ?? {}
    set({
      lastUsage: u,
      totalUsage: {
        prompt_tokens: (prev.prompt_tokens ?? 0) + (u.prompt_tokens ?? 0),
        completion_tokens: (prev.completion_tokens ?? 0) + (u.completion_tokens ?? 0),
        total_tokens: (prev.total_tokens ?? 0) + (u.total_tokens ?? 0),
      },
    })
  },
}))

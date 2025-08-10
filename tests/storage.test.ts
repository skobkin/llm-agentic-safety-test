import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveSettings,
  loadSettings,
  saveMessages,
  loadMessages,
  removeMessages,
  saveTools,
  loadTools,
  removeTools,
  saveSystemPrompt,
  loadSystemPrompt,
} from '../src/utils/storage'
import type { Settings, ChatMessage, ToolDefinition } from '../src/types'

const { store, setItem, getItem, removeItem } = vi.hoisted(() => {
  const store = new Map<string, unknown>()
  return {
    store,
    setItem: vi.fn(async (k: string, v: unknown) => {
      store.set(k, v)
    }),
    getItem: vi.fn(async (k: string) => store.get(k)),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k)
    }),
  }
})

vi.mock('localforage', () => ({
  default: { setItem, getItem, removeItem },
}))

beforeEach(() => {
  store.clear()
  setItem.mockClear()
  getItem.mockClear()
  removeItem.mockClear()
})

describe('storage utilities', () => {
  it('saves and loads settings', async () => {
    const s: Settings = { apiBaseUrl: 'u', model: 'm' }
    await saveSettings(s)
    expect(setItem).toHaveBeenCalledWith('settings', s)
    expect(await loadSettings()).toEqual(s)
  })

  it('handles messages with defaults', async () => {
    const msgs: ChatMessage[] = [{ role: 'user', content: 'hi', createdAt: 1 }]
    await saveMessages(msgs)
    expect(setItem).toHaveBeenCalledWith('history_default', msgs)
    expect(await loadMessages()).toEqual(msgs)
    await removeMessages()
    expect(removeItem).toHaveBeenCalledWith('history_default')
    expect(await loadMessages()).toEqual([])
  })

  it('handles tools and system prompt', async () => {
    const tools: ToolDefinition[] = [
      {
        id: 't',
        name: 'tool',
        description: '',
        args: [],
        returnType: 'string',
        returnValue: '',
        disabled: false,
        createdAt: 0,
      },
    ]
    await saveTools(tools)
    expect(setItem).toHaveBeenCalledWith('tools', tools)
    expect(await loadTools()).toEqual(tools)
    await removeTools()
    expect(removeItem).toHaveBeenCalledWith('tools')

    await saveSystemPrompt('sys')
    expect(setItem).toHaveBeenCalledWith('system_prompt', 'sys')
    expect(await loadSystemPrompt()).toBe('sys')
  })
})

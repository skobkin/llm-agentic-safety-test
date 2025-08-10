import localforage from 'localforage'
import type { Settings, ChatMessage, ToolDefinition } from '../types'

const SETTINGS_KEY = 'settings'
const TOOLS_KEY = 'tools'
const HISTORY_KEY = 'history_default'
const SYSTEM_PROMPT_KEY = 'system_prompt'

export async function saveSettings(s: Settings) {
  await localforage.setItem(SETTINGS_KEY, s)
}

export async function loadSettings() {
  return (await localforage.getItem<Settings>(SETTINGS_KEY)) ?? undefined
}

export async function saveMessages(msgs: ChatMessage[]) {
  await localforage.setItem(HISTORY_KEY, msgs)
}

export async function loadMessages() {
  return (await localforage.getItem<ChatMessage[]>(HISTORY_KEY)) ?? []
}

export async function removeMessages() {
  await localforage.removeItem(HISTORY_KEY)
}

export async function saveTools(ts: ToolDefinition[]) {
  await localforage.setItem(TOOLS_KEY, ts)
}

export async function loadTools() {
  return (await localforage.getItem<ToolDefinition[]>(TOOLS_KEY)) ?? []
}

export async function removeTools() {
  await localforage.removeItem(TOOLS_KEY)
}

export async function saveSystemPrompt(p: string) {
  await localforage.setItem(SYSTEM_PROMPT_KEY, p)
}

export async function loadSystemPrompt() {
  return (await localforage.getItem<string>(SYSTEM_PROMPT_KEY)) ?? ''
}

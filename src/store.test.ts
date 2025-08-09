import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './store'

beforeEach(async () => {
  await useAppStore.getState().resetChat()
  await useAppStore.getState().clearTools()
})

describe('store', () => {
  it('adds messages', async () => {
    await useAppStore.getState().addMessage({
      role: 'user',
      content: 'hi',
      createdAt: 1,
    })
    expect(useAppStore.getState().messages).toHaveLength(1)
  })

  it('adds tools', async () => {
    await useAppStore.getState().addTool({
      id: '1',
      name: 't',
      description: '',
      args: [],
      returnType: 'string',
      disabled: false,
      createdAt: 1,
    })
    expect(useAppStore.getState().tools).toHaveLength(1)
  })
})

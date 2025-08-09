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
      returnValue: 'ok',
      disabled: false,
      createdAt: 1,
    })
    expect(useAppStore.getState().tools).toHaveLength(1)
  })

  it('removes tools', async () => {
    await useAppStore.getState().addTool({
      id: '1',
      name: 't',
      description: '',
      args: [],
      returnType: 'string',
      returnValue: 'ok',
      disabled: false,
      createdAt: 1,
    })
    await useAppStore.getState().removeTool('1')
    expect(useAppStore.getState().tools).toHaveLength(0)
  })

  it('sets tools list', async () => {
    await useAppStore.getState().setTools([
      {
        id: '1',
        name: 't',
        description: '',
        args: [],
        returnType: 'string',
        returnValue: 'ok',
        disabled: false,
        createdAt: 1,
      },
    ])
    expect(useAppStore.getState().tools).toHaveLength(1)
  })

  it('tracks usage stats', () => {
    useAppStore.getState().addUsage({ prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 })
    expect(useAppStore.getState().lastUsage).toEqual({
      prompt_tokens: 1,
      completion_tokens: 2,
      total_tokens: 3,
    })
    useAppStore.getState().addUsage({ prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 })
    expect(useAppStore.getState().totalUsage).toEqual({
      prompt_tokens: 3,
      completion_tokens: 5,
      total_tokens: 8,
    })
  })

  it('clears stats when chat is reset', async () => {
    useAppStore.getState().addUsage({ prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 })
    await useAppStore.getState().addMessage({
      role: 'user',
      content: 'hi',
      createdAt: 1,
    })
    await useAppStore.getState().resetChat()
    expect(useAppStore.getState().messages).toHaveLength(0)
    expect(useAppStore.getState().lastUsage).toBeUndefined()
    expect(useAppStore.getState().totalUsage).toBeUndefined()
  })
})

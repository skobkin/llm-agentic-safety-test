import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requestChatCompletion } from '../src/services/llm'
import type { Settings, ChatMessage, ToolDefinition } from '../src/types'

describe('requestChatCompletion', () => {
  const fetchMock = vi.fn()
  const settings: Settings = { apiBaseUrl: 'https://api', model: 'gpt', apiToken: 't' }

  beforeEach(() => {
    fetchMock.mockReset()
    ;(globalThis as any).fetch = fetchMock
  })

  it('sends messages and tools', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [], usage: {} }),
    })
    const messages: ChatMessage[] = [
      { role: 'user', content: 'hi', createdAt: 1 },
      { role: 'assistant', content: 'hello', createdAt: 2 },
      { role: 'error', content: 'err', createdAt: 3 },
      { role: 'reasoning', content: 'think', createdAt: 4 },
      {
        role: 'tool',
        toolCallId: 'tc',
        toolName: 'foo',
        args: { a: 1 },
        result: 'res',
        createdAt: 5,
      },
    ]
    const tools: ToolDefinition[] = [
      {
        id: '1',
        name: 'foo',
        description: '',
        args: [{ name: 'a', type: 'int' }],
        returnType: 'string',
        returnValue: '',
        disabled: false,
        createdAt: 0,
      },
    ]

    await requestChatCompletion(settings, messages, tools, 'sys')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api/chat/completions')
    const body = JSON.parse(opts.body as string)
    expect(body.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'tool', content: 'res', tool_call_id: 'tc' },
    ])
    expect(body.tool_choice).toBe('auto')
    expect(body.tools).toHaveLength(1)
  })

  it('omits tools when none active', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    await requestChatCompletion(settings, [], [], '')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.tool_choice).toBe('none')
    expect(body.tools).toBeUndefined()
  })

  it('throws on API error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad',
      json: async () => ({ error: { message: 'bad request' } }),
    })
    await expect(requestChatCompletion(settings, [], [], '')).rejects.toThrow(
      'bad request',
    )
  })
})

import { render, fireEvent, waitFor } from '@testing-library/preact'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/store', () => {
  const state: any = {
    settings: undefined,
    messages: [],
    tools: [],
    lastUsage: undefined,
    totalUsage: undefined,
    systemPrompt: '',
    async addMessage(m: any) {
      state.messages.push(m)
    },
    async removeMessage(createdAt: number) {
      state.messages = state.messages.filter((m: any) => m.createdAt !== createdAt)
    },
    async resetChat() {},
    async addTool() {},
    async clearTools() {
      state.tools = []
    },
    addUsage(u: any) {
      state.lastUsage = u
      state.totalUsage = u
    },
    async setSystemPrompt(p: string) {
      state.systemPrompt = p
    },
  }
  const useAppStore = () => state
  ;(useAppStore as any).getState = () => state
  ;(useAppStore as any).setState = (s: any) => Object.assign(state, s)
  return { useAppStore }
})

import ChatScreen from '../src/screens/ChatScreen'
import { useAppStore } from '../src/store'

(Element.prototype as any).scrollIntoView = vi.fn()

vi.mock('localforage', () => ({
  default: {
    setItem: vi.fn(async () => {}),
    getItem: vi.fn(async () => null),
    removeItem: vi.fn(async () => {}),
  },
}))

vi.mock('wouter-preact', () => ({
  useLocation: () => ['', vi.fn()],
}))

describe('ChatScreen streaming', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    useAppStore.setState({
      settings: { apiBaseUrl: 'https://api', model: 'gpt' },
      messages: [],
      tools: [],
      lastUsage: undefined,
      totalUsage: undefined,
      systemPrompt: '',
    })
  })

  it('shows streaming assistant before final message and updates stats', async () => {
    const encoder = new TextEncoder()
    let controller: ReadableStreamDefaultController<Uint8Array>
    fetchMock.mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(c) {
          controller = c
          c.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":"hel"}}]}\n\n'),
          )
        },
      }),
    })

    const { getAllByRole, getByText, queryAllByText, getAllByText } = render(<ChatScreen />)
    const input = getAllByRole('textbox')[0] as HTMLInputElement
    await fireEvent.input(input, { target: { value: 'hi' } })
    await fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(getByText('hel')).toBeTruthy()
    })
    expect(queryAllByText('x')).toHaveLength(1)

    controller.enqueue(
      encoder.encode('data: {"choices":[{"delta":{"content":"lo"}}]}\n\n'),
    )
    await waitFor(() => {
      expect(getByText('hello')).toBeTruthy()
    })
    expect(queryAllByText('x')).toHaveLength(1)

    controller.enqueue(
      encoder.encode(
        'data: {"choices":[{"message":{}}],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}\n\n',
      ),
    )
    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
    controller.close()

    await waitFor(() => {
      expect(queryAllByText('x')).toHaveLength(2)
    })
    await waitFor(() => {
      expect(getByText('Stats')).toBeTruthy()
    })
    await waitFor(() => {
      expect(getAllByText('2').length).toBeGreaterThan(0)
    })
  })
})

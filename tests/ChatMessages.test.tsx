import { render, fireEvent } from '@testing-library/preact'
import { describe, it, expect, vi } from 'vitest'
import ChatMessages from '../src/components/ChatMessages'
import type { ChatMessage } from '../src/types'

// simple ref object for bottomRef
const createRef = () => ({ current: null }) as any

describe('ChatMessages', () => {
  it('renders various message types and handles removal', async () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'hi', createdAt: 1 },
      { role: 'assistant', content: 'hello', createdAt: 2 },
      { role: 'reasoning', content: 'thinking', createdAt: 3 },
      {
        role: 'tool',
        toolCallId: '1',
        toolName: 'foo',
        args: { a: 1 },
        result: 'bar',
        createdAt: 4,
      },
    ]
    const removeMessage = vi.fn().mockResolvedValue(undefined)
    const { container, getByText } = render(
      <ChatMessages
        messages={messages}
        removeMessage={removeMessage}
        bottomRef={createRef()}
      />,
    )

    // icons and content
    expect(container.textContent).toContain('👨')
    expect(container.textContent).toContain('🤖')
    expect(getByText('hi')).toBeTruthy()
    expect(getByText('hello')).toBeTruthy()
    expect(getByText('thinking')).toBeTruthy()
    expect(container.querySelector('mark')?.textContent).toBe('foo()')

    // remove first message
    const removeLink = container.querySelector('a') as HTMLAnchorElement
    await fireEvent.click(removeLink)
    expect(removeMessage).toHaveBeenCalledWith(1)
  })
})

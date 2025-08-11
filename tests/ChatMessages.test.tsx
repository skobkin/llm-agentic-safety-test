import { render, fireEvent } from '@testing-library/preact'
import { describe, it, expect, vi } from 'vitest'
import { createRef } from 'preact'
import ChatMessages from '../src/components/ChatMessages'
import type { ChatMessage } from '../src/types'

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
    const bottomRef = createRef<HTMLDivElement>()
    const { container, getByText } = render(
      <ChatMessages messages={messages} removeMessage={removeMessage} bottomRef={bottomRef} />,
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

  it('skips empty assistant messages with only tool calls', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content: '',
        createdAt: 1,
        toolCalls: [{ id: 'tc', type: 'function', function: { name: 'foo', arguments: '{}' } }],
      },
      { role: 'user', content: 'hi', createdAt: 2 },
    ]
    const removeMessage = vi.fn().mockResolvedValue(undefined)
    const bottomRef = createRef<HTMLDivElement>()
    const { container } = render(
      <ChatMessages messages={messages} removeMessage={removeMessage} bottomRef={bottomRef} />,
    )
    expect(container.textContent).not.toContain('🤖')
    expect(container.textContent).toContain('hi')
  })

  it('renders empty assistant messages without tool calls', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', content: '', createdAt: 1 },
      { role: 'user', content: 'hi', createdAt: 2 },
    ]
    const removeMessage = vi.fn().mockResolvedValue(undefined)
    const bottomRef = createRef<HTMLDivElement>()
    const { container } = render(
      <ChatMessages messages={messages} removeMessage={removeMessage} bottomRef={bottomRef} />,
    )
    expect((container.textContent?.match(/🤖/g) ?? []).length).toBe(1)
  })
})

import { render } from '@testing-library/preact'
import { describe, it, expect } from 'vitest'
import MarkdownMessage from '../src/components/MarkdownMessage'

describe('MarkdownMessage', () => {
  it('renders standard markdown', () => {
    const md = '**bold**\n\n- one\n- two\n\n```\ncode\n```'
    const { container } = render(<MarkdownMessage source={md} />)
    expect(container.querySelector('strong')?.textContent).toBe('bold')
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelector('pre code')?.textContent).toBe('code\n')
  })

  it('sanitizes malicious content', () => {
    const md = '<script>alert(1)</script>[x](javascript:alert(1))'
    const { container } = render(<MarkdownMessage source={md} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.innerHTML).not.toContain('javascript:')
  })
})

import { render } from '@testing-library/preact'
import { describe, it, expect } from 'vitest'
import MarkdownMessage from '../src/components/MarkdownMessage'

describe('MarkdownMessage', () => {
  it('renders basic markdown elements', () => {
    const source = '**bold**\n\n- a\n- b\n\n```\ncode\n```'
    const { container } = render(<MarkdownMessage source={source} />)
    expect(container.querySelector('strong')?.textContent).toBe('bold')
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelector('pre code')?.textContent).toBe('code\n')
  })

  it('strips script tags', () => {
    const { container } = render(<MarkdownMessage source={'<script>alert(1)</script>'} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).not.toContain('alert(1)')
  })

  it('sanitizes javascript urls', () => {
    const { container } = render(<MarkdownMessage source={'[x](javascript:alert(1))'} />)
    const link = container.querySelector('a')
    expect(link).not.toBeNull()
    expect(link!.getAttribute('href') ?? '').not.toMatch(/^javascript:/i)
  })
})

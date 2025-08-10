import { render } from '@testing-library/preact'
import { describe, it, expect } from 'vitest'
import StatsTable from '../src/components/StatsTable'
import type { Usage } from '../src/types'

describe('StatsTable', () => {
  it('renders usage values', () => {
    const last: Usage = {
      prompt_tokens: 1,
      completion_tokens: 2,
      total_tokens: 3,
      prompt_cost: 0.1,
      completion_cost: 0.2,
      total_cost: 0.3,
    }
    const total: Usage = {
      prompt_tokens: 4,
      completion_tokens: 5,
      total_tokens: 9,
      prompt_cost: 0.4,
      completion_cost: 0.5,
      total_cost: 0.9,
    }
    const { getByText } = render(<StatsTable lastUsage={last} totalUsage={total} />)
    expect(getByText('1')).toBeTruthy()
    expect(getByText('0.1000')).toBeTruthy()
    expect(getByText('0.9000')).toBeTruthy()
  })

  it('renders nothing without usage', () => {
    const { container } = render(<StatsTable />)
    expect(container.innerHTML).toBe('')
  })
})

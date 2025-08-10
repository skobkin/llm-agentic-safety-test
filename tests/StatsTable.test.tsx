import { render } from '@testing-library/preact'
import { describe, it, expect, beforeEach } from 'vitest'
import StatsTable from '../src/components/StatsTable'
import type { Usage } from '../src/types'
import { useAppStore } from '../src/store'

beforeEach(async () => {
  await useAppStore.getState().resetChat()
})

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
    expect(getByText('0.300000')).toBeTruthy()
    expect(getByText('0.900000')).toBeTruthy()
  })

  it('sums tiny costs accurately', () => {
    const { addUsage } = useAppStore.getState()
    addUsage({ cost: 0.000001 })
    addUsage({ cost: 0.000001 })
    addUsage({ cost: 0.000001 })
    const { lastUsage, totalUsage } = useAppStore.getState()
    const { getByText } = render(<StatsTable lastUsage={lastUsage} totalUsage={totalUsage} />)
    expect(getByText('0.000001')).toBeTruthy()
    expect(getByText('0.000003')).toBeTruthy()
  })

  it('renders nothing without usage', () => {
    const { container } = render(<StatsTable />)
    expect(container.innerHTML).toBe('')
  })
})

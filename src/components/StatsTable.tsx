import type { Usage } from '../types'

interface Props {
  lastUsage?: Usage
  totalUsage?: Usage
}

export default function StatsTable({ lastUsage, totalUsage }: Props) {
  if (!lastUsage && !totalUsage) return null
  return (
    <>
      <h3>Stats</h3>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Last</th>
            <th>$</th>
            <th>Total</th>
            <th>$</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Prompt</th>
            <td>{lastUsage?.prompt_tokens ?? '-'}</td>
            <td>{lastUsage?.prompt_cost !== undefined ? lastUsage.prompt_cost.toFixed(6) : '-'}</td>
            <td>{totalUsage?.prompt_tokens ?? '-'}</td>
            <td>
              {totalUsage?.prompt_cost !== undefined ? totalUsage.prompt_cost.toFixed(6) : '-'}
            </td>
          </tr>
          <tr>
            <th>Completion</th>
            <td>{lastUsage?.completion_tokens ?? '-'}</td>
            <td>
              {lastUsage?.completion_cost !== undefined
                ? lastUsage.completion_cost.toFixed(6)
                : '-'}
            </td>
            <td>{totalUsage?.completion_tokens ?? '-'}</td>
            <td>
              {totalUsage?.completion_cost !== undefined
                ? totalUsage.completion_cost.toFixed(6)
                : '-'}
            </td>
          </tr>
          <tr>
            <th>Total</th>
            <td>{lastUsage?.total_tokens ?? '-'}</td>
            <td>{lastUsage?.total_cost !== undefined ? lastUsage.total_cost.toFixed(6) : '-'}</td>
            <td>{totalUsage?.total_tokens ?? '-'}</td>
            <td>{totalUsage?.total_cost !== undefined ? totalUsage.total_cost.toFixed(6) : '-'}</td>
          </tr>
        </tbody>
      </table>
    </>
  )
}

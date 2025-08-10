import { render, fireEvent } from '@testing-library/preact'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ToolDefinition } from '../src/types'

const updateToolMock = vi.fn()
const removeToolMock = vi.fn()

vi.mock('../src/store', () => ({
  useAppStore: {
    getState: () => ({ updateTool: updateToolMock, removeTool: removeToolMock }),
  },
}))

import ToolsPanel from '../src/components/ToolsPanel'

describe('ToolsPanel', () => {
  beforeEach(() => {
    updateToolMock.mockReset()
    removeToolMock.mockReset()
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
  })

  it('handles tool actions', async () => {
    const tool: ToolDefinition = {
      id: 't1',
      name: 'test',
      description: '',
      args: [],
      returnType: 'string',
      returnValue: '',
      disabled: false,
      createdAt: 0,
    }
    const onAddTool = vi.fn()
    const onEditTool = vi.fn()
    const setDialog = vi.fn()
    const setSystemPrompt = vi.fn().mockResolvedValue(undefined)

    const { getByText, getByLabelText, getByRole } = render(
      <ToolsPanel
        tools={[tool]}
        systemPrompt="sys"
        setSystemPrompt={setSystemPrompt}
        onAddTool={onAddTool}
        onEditTool={onEditTool}
        setDialog={setDialog}
      />,
    )

    fireEvent.click(getByText('Add Tool'))
    expect(onAddTool).toHaveBeenCalled()

    fireEvent.click(getByLabelText('Edit test'))
    expect(onEditTool).toHaveBeenCalledWith(tool)

    fireEvent.click(getByLabelText('Delete test'))
    expect(removeToolMock).toHaveBeenCalledWith('t1')

    fireEvent.click(getByRole('checkbox'))
    expect(updateToolMock).toHaveBeenCalledWith({ ...tool, disabled: true })

    fireEvent.click(getByText('Export'))
    expect(setDialog).toHaveBeenCalledWith({
      mode: 'export',
      text: JSON.stringify({ systemPrompt: 'sys', tools: [tool] }, null, 2),
    })

    fireEvent.click(getByText('Import'))
    expect(setDialog).toHaveBeenCalledWith({ mode: 'import', text: '' })
  })
})

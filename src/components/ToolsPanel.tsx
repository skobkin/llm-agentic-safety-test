import { useAppStore } from '../store'
import type { ToolDefinition } from '../types'

interface Props {
  tools: ToolDefinition[]
  systemPrompt: string
  setSystemPrompt: (p: string) => Promise<void>
  onAddTool: () => void
  onEditTool: (t: ToolDefinition) => void
  setDialog: (d: { mode: 'export' | 'import'; text: string } | null) => void
}

export default function ToolsPanel({
  tools,
  systemPrompt,
  setSystemPrompt,
  onAddTool,
  onEditTool,
  setDialog,
}: Props) {
  return (
    <>
      <details>
        <summary>System Prompt</summary>
        <textarea
          style="width: 100%;"
          value={systemPrompt}
          onInput={(e) => setSystemPrompt((e.target as HTMLTextAreaElement).value)}
        />
      </details>
      <h3>Tools</h3>
      <div role="group" style="margin-bottom: 0.5rem;">
        <button onClick={onAddTool}>Add Tool</button>
        <button
          onClick={() =>
            setDialog({
              mode: 'export',
              text: JSON.stringify({ systemPrompt, tools }, null, 2),
            })
          }
        >
          Export
        </button>
        <button
          onClick={() => {
            if (!confirm('Import will overwrite existing tools. Continue?')) return
            setDialog({ mode: 'import', text: '' })
          }}
        >
          Import
        </button>
      </div>
      <div style={tools.length > 5 ? 'max-height: 10rem; overflow-y: auto;' : undefined}>
        {tools.map((t) => (
          <div>
            <input
              type="checkbox"
              checked={!t.disabled}
              onChange={() => useAppStore.getState().updateTool({ ...t, disabled: !t.disabled })}
            />{' '}
            {t.name}{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                onEditTool(t)
              }}
              aria-label={`Edit ${t.name}`}
              style="margin-left: 0.25rem;"
            >
              ✎
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                useAppStore.getState().removeTool(t.id)
              }}
              aria-label={`Delete ${t.name}`}
              style="margin-left: 0.25rem;"
            >
              ✖
            </a>
          </div>
        ))}
      </div>
    </>
  )
}

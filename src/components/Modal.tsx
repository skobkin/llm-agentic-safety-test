import type { ComponentChildren } from 'preact'

export default function Modal({ children }: { children: ComponentChildren }) {
  return (
    <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
      <div style="background: white; padding: 1rem; width: 90%; max-width: 500px;">{children}</div>
    </div>
  )
}

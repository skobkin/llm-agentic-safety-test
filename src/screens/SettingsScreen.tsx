import { useEffect, useState } from 'preact/hooks'
import Joi from 'joi'
import { useLocation } from 'wouter-preact'
import { useAppStore } from '../store'
import type { Settings } from '../types'

const schema = Joi.object<Settings>({
  apiBaseUrl: Joi.string().uri().required(),
  apiToken: Joi.string().optional(),
  model: Joi.string().required(),
})

export default function SettingsScreen() {
  const [apiBaseUrl, setUrl] = useState('')
  const [apiToken, setToken] = useState('')
  const [model, setModel] = useState('')
  const [error, setError] = useState<string>()
  const [, navigate] = useLocation()
  const setSettings = useAppStore((s) => s.setSettings)
  const settings = useAppStore((s) => s.settings)

  useEffect(() => {
    if (settings) {
      setUrl(settings.apiBaseUrl)
      setToken(settings.apiToken ?? '')
      setModel(settings.model)
    }
  }, [settings])

  const onSubmit = async (e: Event) => {
    e.preventDefault()
    const { error } = schema.validate({ apiBaseUrl, apiToken, model })
    if (error) {
      setError(error.message)
      return
    }
    await setSettings({ apiBaseUrl, apiToken, model })
    navigate('/chat')
  }

  return (
    <main class="container">
      <h1>Settings</h1>
      <form onSubmit={onSubmit}>
        <label>
          API Base URL
          <input value={apiBaseUrl} onInput={(e) => setUrl((e.target as HTMLInputElement).value)} />
        </label>
        <label>
          Model
          <input value={model} onInput={(e) => setModel((e.target as HTMLInputElement).value)} />
        </label>
        <label>
          Token
          <input
            type="password"
            value={apiToken}
            onInput={(e) => setToken((e.target as HTMLInputElement).value)}
          />
        </label>
        {error && <p style="color: var(--del-color);">{error}</p>}
        <div role="group">
          <button type="submit">Save & Continue</button>
          <button type="button" onClick={() => navigate('/chat')}>
            Back
          </button>
        </div>
      </form>
    </main>
  )
}

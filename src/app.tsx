import { useEffect } from 'preact/hooks'
import { Route, Router, Switch } from 'wouter-preact'
import SettingsScreen from './screens/SettingsScreen'
import ChatScreen from './screens/ChatScreen'
import { useAppStore } from './store'

export function App() {
  const load = useAppStore((s) => s.load)
  const settings = useAppStore((s) => s.settings)

  useEffect(() => {
    load()
  }, [load])

  const base = import.meta.env.BASE_URL.replace(/\/$/, '')

  return (
    <Router base={base}>
      <Switch>
        <Route path="/settings" component={SettingsScreen} />
        <Route path="/chat" component={ChatScreen} />
        <Route>{settings ? <ChatScreen /> : <SettingsScreen />}</Route>
      </Switch>
    </Router>
  )
}

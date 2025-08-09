```mermaid
graph TD
  Settings -->|stores| LocalForage
  Chat -->|uses| LocalForage
  Chat -->|state| Zustand
  Settings -->|state| Zustand
```

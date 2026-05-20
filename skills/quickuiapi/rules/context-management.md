## Context Management

### `UEProvider` and `useUEContext`

Provides global UE5 connection state management.

```tsx
import { UEProvider, useUEContext } from 'ue-connect'

// Provide context in the application root component
function App() {
  return (
    <UEProvider>
      <YourComponent />
    </UEProvider>
  )
}

// Use context in a child component
function YourComponent() {
  const { isConnected, isMobile, useMouse, setUseMouse } = useUEContext()

  return (
    <div>
      <p>Connection status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Device type: {isMobile ? 'Mobile device' : 'Desktop device'}</p>
      <button onClick={() => setUseMouse(!useMouse)}>{useMouse ? 'Disable mouse' : 'Enable mouse'}</button>
    </div>
  )
}
```

**Return value description:**

- `isConnected`: Indicates whether connected to UE5 window
- `isMobile`: Indicates whether it is a mobile device
- `useMouse`: Indicates whether mouse events are enabled
- `setUseMouse`: Function used to set whether to enable mouse events
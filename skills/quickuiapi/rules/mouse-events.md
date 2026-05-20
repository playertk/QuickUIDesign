## Mouse Events

### `useUEMouse`
- Manages mouse events and UE5 interaction, supports automatic detection of disabled areas.
- **`data-nohit`** attribute: Used to mark element areas that do not trigger mouse events

```tsx
import { useUEMouse } from 'ue-connect'

function MouseComponent() {
  const { useMouse, setUseMouse } = useUEMouse(true)

  return (
    <div>
      <button onClick={() => setUseMouse(!useMouse)}>{useMouse ? 'Disable mouse events' : 'Enable mouse events'}</button>

      {/* This area won't trigger mouse events */}
      <div data-nohit style={{ padding: '20px', background: '#f0f0f0' }}>
        Mouse event disabled area
      </div>
    </div>
  )
}
```

**Features:**

- Automatically detects elements with `data-nohit` attribute
- Automatically disables mouse events when mouse hovers over disabled areas
- Supports mobile device pixel ratio adaptation
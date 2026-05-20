## Low-level API


### `useUEEventJSON`

`useUEEventJSON` is a lower-level API used to directly send JSON format event data to UE5.  

```tsx
import { useUEEventJSON, type UseUEEventJSONOptions } from 'ue-connect'

function EventComponent() {
  const triggerEvent = useUEEventJSON({ functionName: 'MyBlueprintEvent' })

  const handleClick = () => {
    triggerEvent({
      playerName: 'Player 1',
      score: 100,
      level: 5,
      items: ['item1', 'item2']
    })
  }

  return <button onClick={handleClick}>Send game event</button>
}
```

**Parameter description:**

- `functionName` (in `UseUEEventJSONOptions`): Event name registered in UE5 blueprint. Passed as `{ functionName: '...' }` object.
- Returns a `triggerEvent(data: unknown)` function that sends data via `ue.uecommand.emitjsonevent(functionName, jsonString)`
- Supports complex nested JSON data structures
- Internally uses `JSONParser` to sanitize JSON strings (removes escape backslashes)
- Automatically detects connection status (`isConnected`) and mobile device (`isMobile`)


### `useUECallback`

Optimized callback management, only triggers when the backend actually sends new data, avoiding unnecessary repeated calls.

```tsx
import { useUECallback } from 'ue-connect'

function CallbackComponent() {
  useUECallback('OnPlayerDataUpdated', (onData) => {
    console.log('Player data updated:', onData)
    // Process player data
  })

  return <div>Callback component</div>
}
```

**Parameter description:**

- `functionName`: Callback function name (custom agreed-upon function name in UE5)
- `onData`: Data processing callback function, data sent by UE5

**Feature description:**

- **Performance optimization**: Only triggers callback when backend actually sends new data
- **Automatic management**: Registers global function when component mounts, automatically cleans up when unmounts
- **Stable reference**: Uses ref to maintain stable callback reference, avoiding frequent re-registration


### `filterUECallBackJSonData`

This is a general filtering function paired with `useUECallback`, used to process UE callback JSON sequences, supporting filtering and screening properties.

**Method signature:**

```tsx
function filterUECallBackJSonData<T extends Record<string, any>>(
  data: T | undefined,
  filters: Record<string, any>
): Partial<T> | undefined
```

**Parameter description:**

- `data`: UE callback JSON data to be processed
- `filters`: Filter condition object, keys are property names, values are filter values or filter functions

**Return value:**

- Filtered data object, returns `undefined` if no match

**Usage example (combined with useUECallback):**

```tsx
import { useUECallback, filterUECallBackJSonData } from 'ue-connect'
import { useState } from 'react'

function AuthComponent() {
  const [serverURL, setServerURL] = useState('')
  const [title, setTitle] = useState('')

  useUECallback(
    'OnPlayerDataUpdated', // Frontend callback function name
    (data) => {
      // Note: First check if returned data is a JSON string, treat normal strings as non-JSON
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch {
          console.error('Invalid JSON string treated as non-JSON:', data)
          return
        }
      }
    
      // Filter data
      const filter = filterUECallBackJSonData(data, { health: (vs: any) => vs, isAlive: (vs: any) => vs })
      
      // Callback logic processing
      console.log('Filtered data:', filter)
      /*
      Print result:
      Filtered data: { health: 100, isAlive: true }
      */
    }
  )

  return (
    <div>
      <p>Health: {filter?.health || 'Not specified'}</p>
      <p>Alive: {filter?.isAlive ? 'Yes' : 'No'}</p>
    </div>
  )
}
```

**Feature description:**

- **Flexible filtering**: Supports filtering using functions or values
- **Type safety**: Supports TypeScript generics, maintaining type consistency
- **Automatic cleanup**: Returns `undefined` when no matching properties, facilitating subsequent processing
- **Perfect integration with useUECallback**: Used in callback processing to simplify data handling logic


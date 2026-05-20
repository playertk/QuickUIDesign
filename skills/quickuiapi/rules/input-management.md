## Input Management

### `useInputBlocker`

Global input event interceptor. Disables right-click context menu and Tab key default behavior.

```tsx
import { useInputBlocker } from 'ue-connect'

function InputComponent() {
  // Enable all blocking (default)
  useInputBlocker()

  // Or customize blocking options
  useInputBlocker({
    disableContextMenu: true,  // Disable right-click menu
    disableTabKey: false       // Keep Tab key functional
  })

  return <div>Input blocked area</div>
}
```

**Options parameter description:**

- `disableContextMenu` (default: `true`): Whether to disable the right-click context menu (`contextmenu` event)
- `disableTabKey` (default: `true`): Whether to disable the Tab key default behavior

**Note:** This hook is purely side-effect based (registers `useEffect` only) and does not return any state values.
## Device Adaptation

### `useDPR`

Automatically adapts to device pixel ratio, ensuring consistent display across different devices.
Returns `{ ratio, toPhysical, toLogical }` for coordinate conversion.

```tsx
import { useDPR } from 'ue-connect'

function ResponsiveComponent() {
  const { ratio, toPhysical, toLogical } = useDPR()

  return (
    <div
      style={{
        width: `${toPhysical(100)}px`,
        height: `${toPhysical(50)}px`
      }}
    >
      Adaptive element (ratio: {ratio})
    </div>
  )
}
```

**Return value description:**

- `ratio`: Current device pixel ratio (e.g., 2 for Retina displays)
- `toPhysical(value)`: Converts logical coordinates to physical pixel coordinates (`value * ratio`)
- `toLogical(value)`: Converts physical coordinates back to logical coordinates (`value / ratio`)
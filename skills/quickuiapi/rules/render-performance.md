## Render Performance (React + Paint) inside UE5 WebView

Scope: FPS-oriented rules for `QuickUIDesign` UI running inside the UE5 WebView (CEF).
This file is not about `ue-connect` APIs — it is about how to structure React state, event handling and CSS so the WebView keeps its frame rate while UE is rendering at the same time.

**Apply these rules whenever you write or review a QuickUI component that:**
- handles pointer / mouse / wheel / scroll / resize events
- drags, follows the cursor, or animates
- renders a list or grid of repeated items
- shows a full-screen overlay, blur, glow or shadow
- pushes high-frequency data from UE (health, position, FPS, timers)

---

### 0. Diagnose first: React cost vs paint cost

| Symptom | Likely cause | How to confirm |
|---|---|---|
| React DevTools Profiler shows a dense commit stream, long Render time on the component | React side: state updates per event, unstable props, non-memoized children | Profiler + "Highlight updates when components render" |
| Commits are rare but FPS still drops | Paint/composite side: filter, blur, shadow, transitions, animation of layout properties | Performance panel → Paint flashing / Layer borders |
| Web FPS drops while UE FPS is fine | Web-only problem | `FpsMeter`-style rAF counter |
| Both drop together, UE thread busy | UE main thread throttling the WebView | UE Insights |

Rule of thumb: **if a frame does not change the DOM, React must not run at all.**

---

### 1. High-frequency events must never `setState`

Pointer/mouse events fire far above the display refresh rate (100+ Hz in CEF). One `setState` per event re-renders the whole subtree.

**Bad — a cursor-following element driven by state:**

```tsx
const [ghost, setGhost] = useState({ item, x: 0, y: 0 })   // ❌ every pointermove re-renders the panel + all children

const onPointerMove = (e: PointerEvent) => {
  setGhost({ item, x: e.clientX, y: e.clientY })
}
```

**Good — ref + direct DOM write, coalesced to one write per frame:**

```tsx
const ghostRef = useRef<HTMLDivElement | null>(null)
const posRef = useRef({ x: 0, y: 0 })
const rafRef = useRef(0)

const writeGhost = useCallback(() => {
  const el = ghostRef.current
  if (!el) return
  const { x, y } = posRef.current
  el.style.transform = `translate3d(${x - 28}px, ${y - 28}px, 0) scale(1.1)`
}, [])

const onPointerMove = (e: PointerEvent) => {
  posRef.current.x = e.clientX          // record only
  posRef.current.y = e.clientY
  if (rafRef.current === 0) {
    rafRef.current = requestAnimationFrame(() => {   // at most one DOM write per frame
      rafRef.current = 0
      writeGhost()
    })
  }
}
```

```tsx
// JSX: never declare transform in the style prop of a DOM-written element,
// otherwise the next React render overwrites the imperatively written value.
<div
  ref={ghostRef}
  className="fixed left-0 top-0 pointer-events-none will-change-transform"
  style={{ background: '...', border: '...' }}
/>
```

Notes:
- Position the element once after mount with `useLayoutEffect` (runs before paint → no flicker at 0,0).
- Keep `scale()` inside the imperatively written transform — a Tailwind `scale-110` class would be overridden by the inline transform anyway.
- Cancel the pending rAF in the effect cleanup.

State is only for things that change a **small, finite number of times** (drag started / drag ended / hovered slot changed).

---

### 2. Deduplicate state: only setState when the value actually changed

```tsx
// Bad: fires on every pointermove even when the hovered slot is unchanged
setHoverSlot(next)

// Good: bail out before touching state
if (hoverRef.current === next) return
hoverRef.current = next
setHoverSlot(next)
```

Keep a `ref` mirror of the state a document-level listener needs (`hoverRef`, `draggingRef`, `inventoryRef`) — this also avoids stale closures without re-registering listeners.

---

### 3. Keep `React.memo` effective

`memo` only helps when **every** prop keeps a stable reference. Three conditions must all hold:

1. **Stable callbacks** — `useCallback` with `[]` or refs only. Inline arrow props defeat memo:

```tsx
// Bad: new function identities on every parent render → every child re-renders
<ItemSlot onPointerEnter={(i) => setHoverSlot(i)} onContextMenu={handleContextMenu} />

// Good
const handlePointerEnter = useCallback((i: number) => {
  if (draggingRef.current !== null) setHoverSlot(i)
}, [])
<ItemSlot onPointerEnter={handlePointerEnter} onContextMenu={handleContextMenu} />
```

2. **Derived data memoized** — do not rebuild Maps/arrays in the render body, and do not put them in a callback's dependency list:

```tsx
const itemsMap = useMemo(() => {
  const map = new Map<number, FInventoryItem>()
  for (const item of inventory.items) map.set(item.slotIndex, item)
  return map
}, [inventory.items])
```

3. **Immutable updates** — mutating state in place makes the shallow prop comparison report "no change", so the child never refreshes:

```tsx
// Bad: same object reference reaches the child → memo skips the update
fromItem.slotIndex = toSlot

// Good: new object per changed item
next = items.map((it, i) => (i === fromIdx ? { ...it, slotIndex: toSlot } : it))
```

Also: export repeated children as `memo(function Name() {})`; keep stable keys (business id, not array position); prefer fewer, larger items over thousands of tiny nodes.

---

### 4. Paint & compositing rules (CEF / Blink)

| Avoid (expensive) | Use instead (cheap) | Why |
|---|---|---|
| `backdrop-filter: blur()` — especially full-screen overlays | opaque or semi-transparent solid background | forces a backdrop read-back + blur every composited frame |
| `filter: drop-shadow()` / `filter: blur()` | `text-shadow`, border, or nothing | filter creates an offscreen pass per element |
| `transition-all` | `transition-[transform,opacity]` (or the exact properties) | `all` also animates `box-shadow`/`filter`/`border-color` → repaint per frame |
| animating `width/height/top/left/margin` | animate `transform` / `opacity` | layout properties trigger layout + paint, transform/opacity only composite |
| infinite keyframe animations (`animate-pulse`, `animate-spin`) on UI chrome | one-shot animation or static styling | keeps the compositor busy forever, never idles |
| stacked `box-shadow` layers + extra absolutely-positioned glow `<div>` per item | one border + one background per item, merged shadow | shadows are pure paint cost, multiplied by item count |
| `will-change` on many elements | only on the element that actually moves | every promoted layer costs memory / layer explosion |
| `overflow: hidden` + `border-radius` nesting | avoid unnecessary clipping containers | each clip creates a mask / extra compositing step |
| reading layout (`getBoundingClientRect`, `elementFromPoint`) interleaved with style writes | read once, write in a rAF | read-after-write forces synchronous layout (layout thrash) |

Static content is cached by the compositor; **only the per-frame changing element pays**. So the rule is: keep the *moving* element limited to `transform`/`opacity`, and keep its decoration minimal.

DOM size matters too: fewer nodes → faster style recalc / layout. A 20-slot grid should not render 3 extra decorative `<div>`s per slot.

---

### 5. ue-connect / UE5 specific

- `useUEMouse` registers **document-level** `mousemove`/`mousedown`/`mouseup`/`wheel` handlers that forward to UE, and each one walks `parentElement` looking for `data-nohit`. Mark non-passthrough UI areas (panels, HUD blocks) with `data-nohit`, and keep the DOM tree shallow so the walk is short.
- While the cursor is over a `data-nohit` area, UE does **not** receive mouse position updates, so its cached cursor position goes stale. If an action still needs a world position (e.g. dropping an item on the ground), re-send it explicitly before the event:
  ```tsx
  window.ue?.uecommand?.jsmouseposition?.(Math.round(x * (window.devicePixelRatio || 1)), Math.round(y * (window.devicePixelRatio || 1)))
  ```
  Coordinates sent to UE are **physical pixels** (multiply CSS px by `devicePixelRatio`).
- With `setPointerCapture` (required for reliable drags in CEF), other elements stop receiving `pointerenter`/`pointerleave`. Hit-testing during a drag must use `elementFromPoint` + a `data-slot-index`-style attribute on the drop targets.
- HTML5 native `draggable` / `dragstart` / `drop` is unreliable in CEF and is intercepted by ue-connect — always implement drag with Pointer Events.
- One document-level listener (event delegation) beats one listener per item; during a drag, register listeners in an effect keyed on "is dragging" and remove them on `pointerup` / `pointercancel`.
- For frequent pushes from UE (`PlayerStateUpdate`, timers, FPS), reduce the send rate or aggregate on the UE side, then render at a UI-friendly cadence (e.g. text updated every 200–500 ms) instead of every frame.

---

### 6. PR self-review checklist

1. Any `setState` inside a pointer/mouse/scroll/resize handler? → move to ref + rAF DOM write.
2. Any state update whose value did not change? → add an equality bail-out.
3. Are props of `memo` children reference-stable (callbacks, arrays, objects, Map)?
4. Is any part of state mutated in place? → spread into new objects.
5. Any `backdrop-filter`, `filter`, infinite animation, `transition-all`, multi-layer shadow, per-item decorative node?
6. Do animations touch only `transform` / `opacity`?
7. Is the per-frame DOM write inside a rAF, and is `transform` kept out of the JSX style for that element?
8. Are `data-nohit` set on passthrough-free panels, and is `jsmouseposition` re-sent when a world position is needed from a `data-nohit` area?
9. List keys stable, node count minimal, changing subtree limited to 1–2 elements?

---

### 7. Worked example in this workspace

The inventory UI is the reference implementation of these rules:

- `QuickUIDesign/src/components/GameUI/InventoryPanel.tsx` — drag ghost via ref + rAF `transform`, hover dedupe + `ref` mirror, `itemsMap` via `useMemo`, stable `useCallback` handlers, immutable optimistic updates, no full-screen `backdrop-blur`, no `animate-pulse`.
- `QuickUIDesign/src/components/GameUI/ItemSlot.tsx` — `memo` component, `transition-[transform,opacity]` instead of `transition-all`, merged shadows, `text-shadow` instead of `drop-shadow` filter, no unused per-item DOM.
- `QuickUIDesign/src/components/GameUI/FpsMeter.tsx` — rAF counter updating state at a 500 ms cadence as an example of low-frequency UI text.

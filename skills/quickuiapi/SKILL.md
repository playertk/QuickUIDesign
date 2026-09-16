---
name: "QuickUIAPI"
description: "UE5-React connector for QuickUI Plugins. Invoke when developing or optimizing UE5 web UI with ue-connect (QuickUIAPI keyword), implementing UE5-Web communication, or fixing Web UI FPS/jank."
---

# QuickuiAPI Skill

Expert assistant for `ue-connect` library - a React connector module designed for Unreal Engine 5 (UE5) integration with `QuickUI` Plugins. This skill provides comprehensive guidance for using the ue-connect library with QuickUIDesign projects, enabling seamless communication between UE5 and web UI components.

>`QuickUIDesign` is a React-based interface template that allows developers to easily create interactive interfaces in UE5.

## When to use

Invoke this skill when:
- User uses the keyword `QuickUIAPI`
- User asks about `ue-connect` library usage
- Developing web UI for UE5 `QuickUI` Plugins
- Implementing UE5-Web bidirectional communication
- Using any `ue-connect` hooks or components
- Troubleshooting UE5-React integration issues
- Setting up `QuickUIDesign` projects with UE5
- Writing, reviewing or optimizing any QuickUI component where FPS / jank matters (drag & drop, animations, per-frame updates, HUD overlays, blurred panels, long item lists)

## Install
  - Copy the `ue-connect` library files into your project
  - Configure package.json to add a reference to the `ue-connect` library
```json
{
  "dependencies": {
    "ue-connect": "./ue-connect",
  }
}
```

## How to use
Read individual rule files for detailed explanations and code examples:
- [rules/context-management.md](rules/context-management.md) - Context Management, Provides global UE5 connection state management.
- [rules/event-communication.md](rules/event-communication.md) - Custom Events, Manages custom events (useQuickUIEventSender/useQuickUIEventListener).
- [rules/mouse-events.md](rules/mouse-events.md) - Mouse Events, Manages mouse events and UE5 interaction, supports automatic detection of disabled areas.
- [rules/input-management.md](rules/input-management.md) - Input Management, Global input event interceptor (right-click & Tab key).
- [rules/raw-data-channel.md](rules/raw-data-channel.md) - Low-level API (useUEEventJSON/useUECallback/filterUECallBackJSonData) used to directly send JSON data to UE5.
- [rules/device-adaptation.md](rules/device-adaptation.md) - Device Adaptation via useDPR hook, provides ratio/toPhysical/toLogical utilities.
- [rules/render-performance.md](rules/render-performance.md) - Render Performance (React + Paint), FPS rules for high-frequency events, memo, drag & drop, and expensive CSS in CEF.

## Performance is a mandatory default (not an optional pass)

The UI runs inside the UE5 WebView, which shares the frame budget with the game. Before writing or modifying **any** component, read [rules/render-performance.md](rules/render-performance.md) and apply it as part of the implementation — not as a later optimization step.

Minimum bar for every component you produce:
- No `setState` inside pointer/mouse/scroll/resize handlers → use `ref` + one DOM write per frame via `requestAnimationFrame` (write `transform`, never re-declare it in JSX).
- Only update state when the value actually changed (dedupe against a ref).
- `memo` children get reference-stable props (`useCallback` / `useMemo`) and state is updated immutably.
- No `backdrop-filter`, no `filter: drop-shadow`, no `transition-all`, no infinite keyframe animations, no repeated multi-layer shadows in per-item nodes.
- Animate only `transform` / `opacity`; use Pointer Events (not native `draggable`) for drag & drop.
- When a QuickUI change touches interactivity or animation, briefly state which of these rules were applied (and which were intentionally skipped) in your summary.


## Best Practices
1. **Performance Optimization** — see [rules/render-performance.md](rules/render-performance.md) for the full rule set
  - Use `data-nohit` attribute appropriately to avoid unnecessary mouse event processing
  - Disable mouse events when not needed to reduce performance overhead
  - Keep high-frequency events (pointer/mouse/wheel/scroll) out of React state; write DOM directly in a `requestAnimationFrame`
  - Keep `memo` children working: stable callbacks, memoized derived data, immutable state updates
  - Restrict CSS to compositor-friendly properties (`transform` / `opacity`); avoid `backdrop-filter`, `filter`, `transition-all`, infinite animations and stacked shadows

2. **Error Handling**
  - Always check `isConnected` status before sending events
  - Add error handling and user feedback for important operations

3. **Event Naming**
  - Use clear event naming conventions
  - Keep event names consistent between Web and UE5 ends

4. **Data Format**
  - Use consistent JSON data format
  - Avoid sending overly large data packets

5. **Type Safety**
  - Use TypeScript type definitions for custom event payloads
  - Make full use of type checking to avoid runtime errors

## 7. Notes
  - This library is designed specifically for UE5 and is not suitable for other game engines
  - Requires proper configuration of JavaScript interface in UE5 project
  - Ensure the browser supports required modern JavaScript features
  - Commercial license, unauthorized copying, distribution or use is strictly prohibited

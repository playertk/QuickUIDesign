---
name: "\"QuickUIAPI\""
description: "\"UE5-React connector for QuickUI Plugins. Invoke when developing UE5 web UI using QuickUIAPI keyword, using ue-connect hooks, or implementing UE5-Web communication.\""
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


## Best Practices
1. **Performance Optimization**
  - Use `data-nohit` attribute appropriately to avoid unnecessary mouse event processing
  - Disable mouse events when not needed to reduce performance overhead

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

## 自定义事件

### `useQuickUIEventSender` 和 `useQuickUIEventListener`

实现 Web 与 UE5 之间的自定义事件通信，允许用户设计自己的事件名称和 JSON 格式。
- `useQuickUIEventSender` 用于发送事件，需指定事件名称（对应后端 QuickUIListenEvent 接收）。通过 `emitjsonevent` 发送，自动回调到 `executejs`。
- `useQuickUIEventListener` 用于监听事件，需指定事件名称（对应后端 QuickUIEventCallBack 发送）。

```tsx
import { useQuickUIEventSender, useQuickUIEventListener } from 'ue-connect'

function EventSystemComponent() {
  // 发送事件 - 需要指定事件名称（对应后端 QuickUIListenEvent）
  const sendEvent = useQuickUIEventSender('playerUpdate')

  // 监听事件 - 监听来自 UE 的事件（对应后端 QuickUIEventCallBack）
  useQuickUIEventListener('gameStateChange', (event) => {
    console.log('Game state changed:', event)
    console.log('Event topic:', event.topic)
    console.log('Event payload:', event.payload)
    console.log('Timestamp:', event.timestamp)
    console.log('Event source:', event.source) // "web" 或 "ue"
  })

  const updatePlayer = () => {
    // 向 UE 发送事件（发送后即忘）
    sendEvent({
      health: 100,
      ammo: 30,
      position: { x: 10, y: 20, z: 30 }
    })
  }

  return <button onClick={updatePlayer}>Update player data</button>
}
```

**useQuickUIEventSender 参数说明：**

- `fnName`：事件名称（对应蓝图 / UMG 事件名称）
- 返回值：事件发送函数，接受 `payload?: QuickEventPayload` 参数
- 发送机制：优先尝试 `ue.uecommand.emitjsonevent(fnName, raw)`，不可用时回退到 `ue.uecommand.executejs(js)`

**useQuickUIEventListener 参数说明：**

- `fnName`：事件名称（对应蓝图 / UMG 事件名称）
- `handler`：事件处理函数，接收 `QuickEvent` 对象
  - `event.type`：事件类型（固定为 "event"），由 API 自动生成，用户无需处理
  - `event.topic`：事件主题/名称，由 API 根据注册时的 `fnName` 自动填充，用户无需处理
  - **`event.payload`：事件载荷数据，这是用户唯一需要关注和设计的字段**，用于传递业务层面的自定义数据内容（如玩家信息、游戏状态、UI 交互数据等），支持任意 JSON 结构，用户可根据业务需求自由定义其形状
  - `event.timestamp`：事件时间戳，由 API 自动生成，用户无需处理
  - `event.source`：事件来源（"web" 或 "ue"），由 API 自动识别填充，用户无需处理

> **核心设计思想**：`payload` 是用户真正需要设计和处理的数据入口，其余字段（`type`、`topic`、`timestamp`、`source`）均由 API 自动规范生成，用户只需了解其含义即可，无需手动编辑或干预。

### QuickEvent 类型

```tsx
interface QuickEvent<Payload = QuickEventPayload> {
  type: 'event' // 事件类型（固定为 "event"），由 API 自动生成
  topic: string // 事件主题/名称，由 API 根据 fnName 自动填充
  payload?: Payload // 【用户核心字段】事件载荷数据，用户在此设计业务数据内容
  timestamp: number // 事件时间戳，由 API 自动生成
  source: 'web' | 'ue' // 事件来源，由 API 自动识别填充
}

type QuickEventPayload = Record<string, any> | null
```

### 带类型的 QuickEvent 使用示例

```tsx
import { useQuickUIEventSender, useQuickUIEventListener, type QuickEvent } from 'ue-connect'

// 定义自定义载荷类型
interface PlayerEvent {
  playerId: string
  health: number
  position: { x: number; y: number; z: number }
}

function TypedComponent() {
  // 使用带类型的事件发送
  const sendPlayerUpdate = useQuickUIEventSender('playerUpdate')

  // 使用带类型的事件监听
  useQuickUIEventListener('playerUpdate', (event: QuickEvent<PlayerEvent>) => {
    if (event.payload) {
      console.log('Player ID:', event.payload.playerId)
      console.log('Player health:', event.payload.health)
      console.log('Player position:', event.payload.position)
    }
  })

  const updatePlayer = () => {
    sendPlayerUpdate({
      playerId: 'player123',
      health: 100,
      position: { x: 10, y: 20, z: 30 }
    })
  }

  return <button onClick={updatePlayer}>Update player</button>
}
```

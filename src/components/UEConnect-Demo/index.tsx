import { useState, useEffect, useRef } from 'react'
import {
  useQuickUIEventSender,
  useQuickUIEventListener,
  useInputKeyEventListener,
  useUEContext,
  useInputBlocker
} from 'ue-connect'

export default function UEConnectDemo() {
  // Disable context menu and Tab key
  useInputBlocker({ disableContextMenu: true, disableTabKey: true })

  const { isConnected, isMobile, useMouse, setUseMouse, lastKeyAction } = useUEContext()
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())

  const [selectedIndex, setSelectedIndex] = useState(0)

  const sendEvent_1 = useQuickUIEventSender('Event1')
  const [response, setResponse] = useState({ topic: '', payload: {}, timestamp: null, source: '' })
  const timeoutRef = useRef(null)

  // Receive UE4 engine event notifications
  useQuickUIEventListener('OnDefaultEvent', (event) => {
    console.log('Game State Changed:', event)
    console.log('Event Topic:', event.topic)
    console.log('Event Payload:', event.payload)
    console.log('Timestamp:', event.timestamp)
    console.log('Source:', event.source) // "web" 或 "ue"
    // Cache event data
    setResponse({ topic: event.topic, payload: event.payload, timestamp: event.timestamp, source: event.source })

    // Clear previous timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timer to clear response data 3 seconds later
    timeoutRef.current = setTimeout(() => {
      setResponse({ topic: '', payload: {}, timestamp: null, source: '' })
    }, 5000)
  })

  // Clear timer when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleClick = () => {
    sendEvent_1({ health: 100, ammo: 30 })
  }
  return (
    <div
      data-nohit
      className="flex flex-col items-center justify-center  absolute left-[200px] top-10 space-y-2 text-center text-white card p-4 rounded-md bg-slate-700/70"
    >
      <h2 className="cursor-target text-2xl">UE4 Context Test</h2>
      <p>UE Connection Status: {isConnected ? 'Connected' : 'Not Connected'}</p>
      <p>Mouse Click Detection: {useMouse ? 'On' : 'Off'}</p>
      <button className="bg-white text-black px-4 py-2 rounded-md cursor-target" onClick={() => setUseMouse(!useMouse)}>
        Toggle useMouse
      </button>
      <button className="bg-white text-black px-4 py-2 rounded-md cursor-target" onClick={handleClick}>
        Trigger Event1
      </button>
      <div className="flex flex-col items-start text-left space-y-2">
        <p>Callback Event:</p>
        <p className="text-green-400">Event Topic: {response.topic}</p>
        <p className="text-green-400">Event Payload: {JSON.stringify(response.payload)}</p>
        <p className="text-green-400">Event Timestamp: {response.timestamp}</p>
        <p className="text-green-400">Event Source: {response.source}</p>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'

export function ClickDeckToggle() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const checkState = () => {
      import('clickdeck-core')
        .then((mod) => {
          setVisible(!mod.isClickDeckActive())
        })
        .catch(() => {
          setVisible(false)
        })
    }

    window.addEventListener('clickdeck-state-change', checkState)
    checkState()

    return () => window.removeEventListener('clickdeck-state-change', checkState)
  }, [])

  const handleToggle = useCallback(async () => {
    try {
      const { toggleClickDeck, isClickDeckActive } = await import('clickdeck-core')
      toggleClickDeck()
      setVisible(!isClickDeckActive())
    } catch (err) {
      console.error('[ClickDeckToggle] Failed to toggle:', err)
    }
  }, [])

  if (process.env.NODE_ENV !== 'development') return null
  if (!visible) return null

  return (
    <button
      onClick={handleToggle}
      title="Open ClickDeck Visual Editor (Alt+Shift+C)"
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 999999,
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.15)',
        background: '#1a1a2e url(/clickdeck-assets/Bear-collapsed.png) center/28px no-repeat',
        cursor: 'pointer',
        opacity: 0.6,
        transition: 'opacity 0.2s, transform 0.2s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1'
        e.currentTarget.style.transform = 'scale(1.05)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.6'
        e.currentTarget.style.transform = 'scale(1)'
      }}
    />
  )
}

import { useEffect, useRef } from 'react'

const TOGGLE_SHORTCUT = { altKey: true, shiftKey: true, code: 'KeyC' }

const debug = console.log.bind(console, '[ClickDeck:CEF]')

export function ClickDeckDevTools(): JSX.Element | null {
  const toggleRef = useRef<() => void>()
  const destroyRef = useRef<() => void>()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    debug('DEV mode detected, initializing ClickDeck...')
    debug('navigator.language:', navigator.language)
    debug('userAgent:', navigator.userAgent?.substring(0, 120))

    import('clickdeck-core').then((mod) => {
      toggleRef.current = mod.toggleClickDeck
      destroyRef.current = mod.destroyClickDeck
      try {
        mod.initClickDeck({
          storage: undefined as any,
          language: navigator.language,
          assets: {
            logo: '/clickdeck-assets/logo2-panel.png',
            collapsedLogo: '/clickdeck-assets/logo-collapsed.png'
          }
        })
        debug('initClickDeck completed')
      } catch (err) {
        console.error('[ClickDeck:CEF] initClickDeck FAILED:', err)
      }
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.altKey === TOGGLE_SHORTCUT.altKey &&
        e.shiftKey === TOGGLE_SHORTCUT.shiftKey &&
        e.code === TOGGLE_SHORTCUT.code
      ) {
        e.preventDefault()
        e.stopPropagation()
        debug('Alt+Shift+C pressed, toggling ClickDeck')
        toggleRef.current?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    debug('Keyboard listener registered')

    return () => {
      debug('Cleaning up ClickDeck')
      destroyRef.current?.()
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [])

  return null
}

export default ClickDeckDevTools

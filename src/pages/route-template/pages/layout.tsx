import { useEffect } from 'react'
import autofit from 'autofit.js'

import '@/styles/index.css'
import AnimatedOutlet from '@/components/framer-motion/animated-outlet'
import { useQuickUIEventListener } from 'ue-connect'
import UEConnectDemo from '@/components/Ohters/UEConnect-Demo'
import ClickDeckDevTools from '@dev/react/ClickDeckDevTools'
import { ClickDeckToggle } from '@dev/react/ClickDeckToggle'

export function Layout({ Fit = false }: { Fit?: boolean }) {
  useQuickUIEventListener('UEcallback', (event) => {})
  useEffect(() => {
    //窗口自适应
    if (Fit)
      autofit.init({
        dw: 1920, // 设计稿宽度
        dh: 1080, // 设计稿高度
        el: 'body',
        resize: true,
        transition: 0.25,
        limit: 0.3
      })
  }, [])

  return (
    <>
      <div id="nav-bar" className="absolute">
        <ClickDeckDevTools />
        <ClickDeckToggle />
      </div>
      <AnimatedOutlet />
      <div id="no-animation-driven">
        {/* 
        The layout can add multiple parallel components. 
        If you want them to be independent of the animated routing, 
        you can place them in the no-animation-driven component. 
        */}
        <UEConnectDemo />
      </div>
    </>
  )
}

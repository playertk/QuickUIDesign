import { useEffect } from 'react'
import { useQuickUIEventListener } from 'ue-connect'
import autofit from 'autofit.js'
import '@/styles/index.css'
import { UEProvider } from 'ue-connect'
import UEConnectDemo from '@/components/Ohters/UEConnect-Demo'
import DemoContent from '@/components/Ohters/DemoContent'
import { ScreenAnchor, AnchorGrid } from '@/components/screen-anchor'
import ClickDeckDevTools from '@dev/react/ClickDeckDevTools'
import { ClickDeckToggle } from '@dev/react/ClickDeckToggle'

export default function App({ Fit = true }: { Fit?: boolean }) {
  // useQuickUIEventListener必须在React组件中调用一次（事件名称随意），
  // 否则在其子组件中调用无法触发事件
  useQuickUIEventListener('UEcallback', (event) => {})

  // 初始化autofit.js 一个同步UI的自适应布局工具适合UI在不同分辨率下保持一致的布局
  useEffect(() => {
    if (Fit)
      autofit.init({
        dw: 1920,
        dh: 1080,
        el: 'body',
        resize: true,
        transition: 0.25,
        limit: 0.25
      })
  }, [])

  return (
    <UEProvider>
      <ClickDeckDevTools />
      <ClickDeckToggle />
      <AnchorGrid>
        <ScreenAnchor name="center-left">
          <div className="w-[100px] h-[100px] justify-center flex flex-col items-center text-white bg-red-500">
            center-left
          </div>
        </ScreenAnchor>
        <ScreenAnchor name="center">
          <DemoContent />
        </ScreenAnchor>
        <ScreenAnchor name="center-right">
          <div className="w-[100px] h-[100px] justify-center flex flex-col items-center text-white bg-yellow-500">
            center-right
          </div>
        </ScreenAnchor>
        <ScreenAnchor name="top-left">
          <div className="w-[100px] h-[100px] justify-center flex flex-col items-center text-white bg-purple-500">
            top-left
          </div>
        </ScreenAnchor>
        <ScreenAnchor name="top-center">
          <div className="w-[100px] h-[100px] justify-center flex flex-col items-center text-white bg-purple-500">
            top-center
          </div>
        </ScreenAnchor>
        <ScreenAnchor name="top-right">
          <div className="w-[100px] h-[100px] justify-center flex flex-col items-center text-white bg-purple-500">
            top-right
          </div>
          <UEConnectDemo />
        </ScreenAnchor>
        <ScreenAnchor name="bottom-left">
          <div className="w-[100px] h-[100px] justify-center flex flex-col items-center text-white bg-green-500">
            botm-left
          </div>
        </ScreenAnchor>
        <ScreenAnchor name="bottom-center">
          <div className="w-[100px] h-[100px] justify-center flex flex-col items-center text-white bg-green-500">
            botm-center
          </div>
        </ScreenAnchor>
        <ScreenAnchor name="bottom-right">
          <div className="w-[100px] h-[100px] justify-center flex flex-col items-center text-white bg-green-500">
            botm-right
          </div>
        </ScreenAnchor>
      </AnchorGrid>
    </UEProvider>
  )
}

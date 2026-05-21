import { useEffect } from 'react'
import { useQuickUIEventListener } from 'ue-connect'
import autofit from 'autofit.js'
import '@/styles/index.css'
import base64Img from '@/assets/img/lufei-base64.txt'
import { UEProvider } from 'ue-connect'
import UEConnectDemo from '@/components/UEConnect-Demo'

export default function App({ Fit = false }: { Fit?: boolean }) {
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
        limit: 0.3
      })
  }, [])

  return (
    <UEProvider>
      <div className="flex flex-col items-center justify-center w-screen h-screen select-none overflow-hidden">
        <div className="w-full justify-center flex flex-col items-center text-white">
          <div className="text-4xl cursor-target">Hellow QuickUI</div>
          <div className="flex flex-row items-center justify-center  space-x-16 w-[60vw]">
            <p data-nohit className="flex items-center justify-center h-64 w-full bg-red-500/15">
              Has data-nohit Attribute: Mouse Non-Penetrable
            </p>
            <p className="flex items-center justify-center h-64 w-full bg-green-500/15">
              No data-nohit Attribute: Mouse Penetrable
            </p>
          </div>
        </div>
        <div className="absolute top-8 flex flex-row items-start justify-center space-x-12 text-white">
          <div className="flex flex-col items-center space-y-2">
            <p data-nohit className="text-sm">
              Mode 1: Base64 Inline
            </p>
            <img data-nohit src={base64Img} alt="lufei (base64)" className="w-36 h-36" />
          </div>
          <div className="flex flex-col items-center space-y-2">
            <p data-nohit className="text-sm">
              Mode 2: Static Asset (relative path)
            </p>
            <img data-nohit src="./img/lufei.png" alt="lufei (static)" className="w-36 h-36" />
          </div>
        </div>
        <UEConnectDemo />
      </div>
    </UEProvider>
  )
}

import { useNavigate, useLocation, Link } from 'react-router'
import AnimatedLayout from '@/components/framer-motion/animated-layout'
import { ScreenAnchor, AnchorGrid } from '@/components/screen-anchor'
import { QuickEvent, useQuickUIEventListener } from 'ue-connect'
import base64Img from '@/assets/img/lufei-base64.txt'

export default function ShowPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname

  // Listen for route navigation events from UE5
  useQuickUIEventListener('RouteNavigate', (event: QuickEvent) => {
    try {
      const payload = event.payload
      // Only navigate when payload contains a route field matching the target
      if (payload.route) {
        navigate(payload.route)
        console.log(`[RouteNavigate] Navigating to ${payload.route} (source: ${event.source})`)
      }
    } catch (error) {
      console.error('[RouteNavigate] Failed to handle navigation event:', error)
    }
  })

  return (
    <AnimatedLayout>
      <AnchorGrid>
        <ScreenAnchor name="top-center">
          <div data-nohit className="flex flex-col w-full h-full justify-center items-center">
            <div className="w-[100px] h-[100px] justify-center flex flex-col items-center text-white bg-purple-500">
              top-center
            </div>
            <div className="flex flex-col items-center space-y-1 mb-4 text-sm text-white  backdrop-blur-md rounded-xl px-8 py-4 shadow-lg bg-slate-700">
              <h1 className="text-3xl">Current Route: {location.pathname}</h1>
              <Link className="text-red-500 hover:text-blue-300 underline text-2xl" to="/">
                Jump to Home Page
              </Link>
            </div>
          </div>
        </ScreenAnchor>
        <ScreenAnchor name="bottom-center">
          <div
            data-nohit
            className=" justify-center flex flex-row items-center text-white select-none bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl px-8 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_8px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/10 -translate-y-[50px]"
          >
            <div className="flex flex-col items-center space-y-2">
              <p data-nohit className="text-sm">
                Mode 1: Base64 Inline
              </p>
              <img data-nohit src={base64Img} alt="lufei (base64)" className="w-36 h-36" />
            </div>

            <p className=" leading-relaxed text-center text-2xl w-[360px]">
              Using routing enables page switching, and the UE5 backend can also achieve page switching by calling
              routes
            </p>
            <div className="flex flex-col items-center space-y-2">
              <p data-nohit className="text-sm">
                Mode 2: Static Asset (relative path)
              </p>
              <img data-nohit src="./img/lufei.png" alt="lufei (static)" className="w-36 h-36" />
            </div>
          </div>
        </ScreenAnchor>
      </AnchorGrid>
    </AnimatedLayout>
  )
}

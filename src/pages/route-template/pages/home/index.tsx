import AnimatedLayout from '@/components/framer-motion/animated-layout'
import { ScreenAnchor, AnchorGrid } from '@/components/screen-anchor'
import DemoContent from '@/components/Ohters/DemoContent'
import { useNavigate, useLocation, Link } from 'react-router'
import { useQuickUIEventListener } from 'ue-connect'
import type { QuickEvent } from 'ue-connect'
/**
 * @description: Home Page - ScreenAnchor Component Demo
 *
 * The ScreenAnchor component is used to anchor child elements to nine preset positions on the screen:
 *   Horizontal: left / center / right
 *   Vertical: top / center / bottom
 *   Combinations: top-left, top-center, top-right,
 *                 center-left, center, center-right,
 *                 bottom-left, bottom-center, bottom-right
 *
 * Each colored block demonstrates an anchor position for intuitive visual verification of each component's positioning effect.
 */
export default function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname

  // Listen for route navigation events from UE5
  useQuickUIEventListener('RouteNavigate', (event: QuickEvent) => {
    try {
      const payload = event.payload
      // Only navigate when payload contains a route field matching the target
      if (payload.route) {
        console.log(`[RouteNavigate] Navigating to ${payload.route} (source: ${event.source})`)
        navigate(payload.route)
      }
    } catch (error) {
      console.error('[RouteNavigate] Failed to handle navigation event:', error)
    }
  })

  return (
    <AnimatedLayout>
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
          <div className="flex flex-col w-full h-full justify-center items-center">
            <div className="w-[100px] h-[100px] justify-center flex flex-col items-center text-white bg-purple-500">
              top-center
            </div>
            <div
              data-nohit
              className="flex flex-col items-center space-y-1 mb-4 text-sm text-white  backdrop-blur-md rounded-xl px-8 py-4 shadow-lg bg-slate-700"
            >
              <h1 className="text-3xl">Current Route: {location.pathname}</h1>
              <Link className="text-red-500 hover:text-blue-300 underline text-2xl" to="/show">
                Jump to ShowPage
              </Link>
            </div>
          </div>
        </ScreenAnchor>
        <ScreenAnchor name="top-right">
          <div className="w-[100px] h-[100px] justify-center flex flex-col items-center text-white bg-purple-500">
            top-right
          </div>
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
    </AnimatedLayout>
  )
}

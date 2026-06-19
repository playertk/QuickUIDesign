import { AnimatePresence } from 'framer-motion'
import React, { cloneElement } from 'react'
import { useLocation, useOutlet } from 'react-router'
/**
 * @description: ReactRouter <Outlet /> 二次封装器，使其路由跳转支持动画过渡效果
 */
export default function AnimatedOutlet() {
  const location = useLocation()
  const element = useOutlet()

  return (
    <>
      <AnimatePresence mode="wait" initial={true}>
        {element && cloneElement(element, { key: location.pathname })}
      </AnimatePresence>
    </>
  )
}

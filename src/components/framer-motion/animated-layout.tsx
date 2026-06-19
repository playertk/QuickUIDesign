import { default_animate } from '@/lib/data/animate-data'
import { motion, type Variant } from 'framer-motion'
import React, { ReactNode } from 'react'

// 定义动画类型
interface Props {
  animate?: { [key: string]: Variant }
  children: ReactNode
}

/**
 * @description: Framer Motion 动画布局组件 封装普通组件成威支持动画的组件
 */

export default function AnimatedLayout({ animate, children }: Props) {
  return (
    <motion.div
      variants={animate ? animate : default_animate}
      initial="hidden"
      animate="enter"
      exit="exit"
      className="relative"
    >
      {children}
    </motion.div>
  )
}

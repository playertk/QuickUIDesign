import type { ReactNode } from 'react'

export type AnchorName =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

interface ScreenAnchorProps {
  name: AnchorName
  children: ReactNode
  className?: string
}

const anchorStyles: Record<AnchorName, string> = {
  'top-left': 'absolute top-0 left-0 ',
  'top-center': 'absolute top-0 left-1/2 -translate-x-1/2 ',
  'top-right': 'absolute top-0 right-0 ',
  'center-left': 'absolute top-1/2 left-0 -translate-y-1/2',
  center: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'center-right': 'absolute top-1/2 right-0 -translate-y-1/2',
  'bottom-left': 'absolute bottom-0 left-0 ',
  'bottom-center': 'absolute bottom-0 left-1/2 -translate-x-1/2',
  'bottom-right': 'absolute bottom-0 right-0 '
}

export function ScreenAnchor({ name, children, className = '' }: ScreenAnchorProps) {
  if (!children) return null
  return <div className={`${anchorStyles[name]} ${className}`}>{children}</div>
}

export function AnchorGrid({ children }: { children: ReactNode }) {
  return <div className="select-none relative h-screen">{children}</div>
}

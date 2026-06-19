import AnimatedLayout from '@/components/framer-motion/animated-layout'
import React, { FC } from 'react'
import { ErrorResponse, Link, useLocation, useRouteError } from 'react-router'

const ErrorPage: FC = () => {
  const error = useRouteError() as ErrorResponse & Error
  const location = useLocation()
  const currentPath = location.pathname
  return (
    <AnimatedLayout>
      <h2>页面错误</h2>
      <Link to="/">返回</Link>
      <p>{error.statusText || error.message}</p>
      <h1 className="  ">当前路径：{currentPath}</h1>
    </AnimatedLayout>
  )
}

export default ErrorPage

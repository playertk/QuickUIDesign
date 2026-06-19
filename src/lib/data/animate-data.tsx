/*这里是Frame Motion预制动画配置
 */

export const default_animate = {
  hidden: {
    y: -10,
    opacity: 0
  },
  enter: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      type: 'easeInOut'
    }
  },
  exit: {
    y: -50 + Math.floor(Math.random() * 30) + 1,
    opacity: 0,
    transition: {
      duration: Math.random() * 0.1 + 0.5,
      type: 'easeInOut'
    }
  }
}



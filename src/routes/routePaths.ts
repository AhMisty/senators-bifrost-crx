export const routePaths = {
  options: '/options',
  sidepanel: '/sidepanel',
} as const

export const defaultRoutePath = routePaths.options
export const redirectRoutePaths = ['/', '/index.html'] as const

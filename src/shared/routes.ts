export const routes = {
  options: '/options',
  sidepanel: '/sidepanel',
} as const

export const defaultRoute = routes.options
export const redirectRoutes = ['/', '/index.html'] as const

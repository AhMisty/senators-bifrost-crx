import './app.css'
import 'uno.css'

import { render } from 'solid-js/web'

import { AppRoutes } from '@/routes/AppRoutes'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found.')
}

render(() => <AppRoutes />, rootElement)

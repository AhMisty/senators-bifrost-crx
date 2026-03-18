import { routePaths } from '@/routes/routePaths'

declare global {
  var __bifrostServiceInitialized: boolean | undefined
}

const extensionIndexUrl = chrome.runtime.getURL('index.html')
const extensionOrigin = new URL(extensionIndexUrl).origin

const handleNavigationRequest = async (request: Request): Promise<Response> => {
  const response = await fetch(request).catch(() => null)

  if (response && response.status !== 404) {
    return response
  }

  return fetch(extensionIndexUrl)
}

const handleFetch = (event: Event): void => {
  const fetchEvent = event as FetchEvent
  const { request } = fetchEvent

  if (
    request.method !== 'GET' ||
    request.mode !== 'navigate' ||
    new URL(request.url).origin !== extensionOrigin
  ) {
    return
  }

  fetchEvent.respondWith(handleNavigationRequest(request))
}

const configureSidePanel = (): void => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  void chrome.sidePanel.setOptions({ path: routePaths.sidepanel })
}

if (!globalThis.__bifrostServiceInitialized) {
  globalThis.__bifrostServiceInitialized = true
  globalThis.addEventListener('fetch', handleFetch)
  chrome.runtime.onInstalled.addListener(configureSidePanel)
}

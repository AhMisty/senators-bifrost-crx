const extensionIndexUrl = chrome.runtime.getURL('index.html')
const extensionOrigin = new URL(extensionIndexUrl).origin

const handleSpaNavigation = async (request: Request): Promise<Response> => {
  const response = await fetch(request).catch(() => null)

  if (response && response.status !== 404) {
    return response
  }

  return fetch(extensionIndexUrl)
}

globalThis.addEventListener('fetch', (event: Event) => {
  const fetchEvent = event as FetchEvent
  const { request } = fetchEvent

  if (
    request.method !== 'GET' &&
    request.mode !== 'navigate' &&
    new URL(request.url).origin !== extensionOrigin
  ) {
    return
  }

  fetchEvent.respondWith(handleSpaNavigation(request))
})

const extensionIndexUrl = chrome.runtime.getURL('index.html')
const extensionOrigin = new URL(extensionIndexUrl).origin

const handleSpaNavigation = async (request: Request): Promise<Response> => {
  const response = await fetch(request).catch(() => null)

  if (response && response.status !== 404) {
    return response
  }

  return fetch(extensionIndexUrl)
}

const isFetchEvent = (event: Event): event is FetchEvent => event instanceof FetchEvent

globalThis.addEventListener('fetch', (event: Event) => {
  if (!isFetchEvent(event)) {
    return
  }

  const { request } = event

  if (
    request.method !== 'GET' ||
    request.mode !== 'navigate' ||
    new URL(request.url).origin !== extensionOrigin
  ) {
    return
  }

  event.respondWith(handleSpaNavigation(request))
})

const base = `chrome-extension://${chrome.runtime.id}`

const spaHandler = async (fetchEvent: FetchEvent) => {
  const protoResponse = await fetch(fetchEvent.request).catch(() => null)
  if (protoResponse && protoResponse.status !== 404) {
    return protoResponse
  }
  return fetch(`${base}/index.html`)
}

globalThis.addEventListener('fetch', (event) => {
  const fetchEvent = event as FetchEvent
  if (!fetchEvent.request.url.startsWith(base)) return
  fetchEvent.respondWith(spaHandler(fetchEvent))
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  chrome.sidePanel.setOptions({
    path: '/sidepanel',
  })
})

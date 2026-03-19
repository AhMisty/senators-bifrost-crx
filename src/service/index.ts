import { routes } from '@/shared/routes'
import '@/service/spa'

chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.openOptionsPage()
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  chrome.sidePanel.setOptions({ path: routes.sidepanel })
})

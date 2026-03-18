import { routePaths } from '@/routes/routePaths'
import '@/services/spa'

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  chrome.sidePanel.setOptions({ path: routePaths.sidepanel })
})

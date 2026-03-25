import { routes } from '@/shared/routes'
import '@/service/spa'

chrome.runtime.onInstalled.addListener(() => {
  void chrome.runtime.openOptionsPage()
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  void chrome.sidePanel.setOptions({ path: routes.sidepanel })
})

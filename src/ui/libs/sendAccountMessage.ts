import {
  isAccountMessageResponse,
  type AccountMessage,
  type AccountMessageResult,
} from '@/shared/accountMessages'

export const sendAccountMessage = async (
  message: AccountMessage,
): Promise<AccountMessageResult> => {
  if (typeof chrome === 'undefined') {
    throw new Error('当前环境无法访问扩展服务')
  }

  const response: unknown = await chrome.runtime.sendMessage(message)

  if (!isAccountMessageResponse(response)) {
    throw new Error('扩展服务无响应')
  }

  if (!response.ok) {
    throw new Error(response.error)
  }

  return response.result
}

import { Courier } from '@senators/bifrost'

const forbiddenRequestHeaders = new Set(['connection', 'cookie'])

type ResponseHeaders = Headers & {
  getSetCookie(): string[]
}

export class ChromeCourier extends Courier {
  public override async get(url: string, headers?: HeadersInit): Promise<false | Response> {
    return this.request('GET', url, undefined, headers)
  }

  public override async post(
    url: string,
    body: unknown,
    headers?: HeadersInit,
  ): Promise<false | Response> {
    return this.request('POST', url, body, headers)
  }

  private async request(
    method: 'GET' | 'POST',
    url: string,
    body?: unknown,
    headers?: HeadersInit,
  ): Promise<false | Response> {
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), this.timeout)
    const requestUrl = new URL(url, this.base)

    try {
      const requestInit: RequestInit = {
        method,
        headers: this.normalizeHeaders(headers),
        credentials: 'include',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        signal: abortController.signal,
      }

      if (method === 'POST') {
        requestInit.body = this.serializeBody(body)
      }

      const response = await fetch(requestUrl, requestInit)
      const responseHeaders = await this.createResponseHeaders(requestUrl, response)

      clearTimeout(timeoutId)

      return {
        headers: responseHeaders,
        ok: response.ok,
        redirected: response.redirected,
        status: response.status,
        text: () => response.text(),
        url: response.url,
      } as Response
    } catch {
      clearTimeout(timeoutId)
      return false
    }
  }

  private normalizeHeaders(headers?: HeadersInit): Headers {
    const normalizedHeaders = new Headers()

    if (!headers) {
      return normalizedHeaders
    }

    for (const [name, value] of new Headers(headers)) {
      if (forbiddenRequestHeaders.has(name.toLowerCase())) {
        continue
      }

      normalizedHeaders.append(name, value)
    }

    return normalizedHeaders
  }

  private serializeBody(body?: unknown): string | undefined {
    if (body === null || body === undefined) {
      return undefined
    }

    if (typeof body === 'string') {
      return new URLSearchParams(body).toString()
    }

    if (body instanceof URLSearchParams) {
      return body.toString()
    }

    if (Array.isArray(body)) {
      return new URLSearchParams(body as string[][]).toString()
    }

    if (typeof body === 'object') {
      const searchParams = new URLSearchParams()

      for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        if (value === null || value === undefined) {
          continue
        }

        searchParams.append(key, String(value))
      }

      return searchParams.toString()
    }

    return String(body)
  }

  private async createResponseHeaders(
    requestUrl: URL,
    response: Response,
  ): Promise<ResponseHeaders> {
    const sessionCookies = await chrome.cookies.getAll({ url: new URL('/', requestUrl).toString() })
    const sessionCookieHeaders = sessionCookies.map((cookie) => `${cookie.name}=${cookie.value};`)
    const location = response.redirected ? response.url : null

    return {
      get(name: string): string | null {
        if (name.toLowerCase() === 'location') {
          return location
        }

        return response.headers.get(name)
      },
      getSetCookie(): string[] {
        return [...sessionCookieHeaders]
      },
    } as ResponseHeaders
  }
}

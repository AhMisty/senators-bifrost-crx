import { Courier } from '@senators/bifrost'

const blockedRequestHeaders = new Set(['connection', 'cookie'])

type RequestBody = string | URLSearchParams | Readonly<Record<string, unknown>>

type ChromeHeaders = Headers & {
  getSetCookie(): string[]
}

class ChromeResponseHeaders extends Headers implements ChromeHeaders {
  readonly #location: string | null
  readonly #setCookie: string[]

  public constructor(headers: HeadersInit, location: string | null, setCookie: string[]) {
    super(headers)
    this.#location = location
    this.#setCookie = [...setCookie]
  }

  public override get(name: string): string | null {
    if (name.toLowerCase() === 'location') {
      return this.#location
    }

    return super.get(name)
  }

  public getSetCookie(): string[] {
    return [...this.#setCookie]
  }

  public clone(): ChromeResponseHeaders {
    return new ChromeResponseHeaders(this, this.#location, this.#setCookie)
  }
}

class ChromeFetchResponse implements Response {
  private readonly source: Response
  private readonly sourceHeaders: ChromeResponseHeaders
  public readonly headers: ChromeHeaders

  public constructor(source: Response, sourceHeaders: ChromeResponseHeaders) {
    this.source = source
    this.sourceHeaders = sourceHeaders
    this.headers = sourceHeaders
  }

  public get body(): Response['body'] {
    return this.source.body
  }

  public get bodyUsed(): Response['bodyUsed'] {
    return this.source.bodyUsed
  }

  public get ok(): Response['ok'] {
    return this.source.ok
  }

  public get redirected(): Response['redirected'] {
    return this.source.redirected
  }

  public get status(): Response['status'] {
    return this.source.status
  }

  public get statusText(): Response['statusText'] {
    return this.source.statusText
  }

  public get type(): Response['type'] {
    return this.source.type
  }

  public get url(): Response['url'] {
    return this.source.url
  }

  public arrayBuffer(): ReturnType<Response['arrayBuffer']> {
    return this.source.arrayBuffer()
  }

  public blob(): ReturnType<Response['blob']> {
    return this.source.blob()
  }

  public async bytes(): Promise<Uint8Array<ArrayBuffer>> {
    return new Uint8Array(await this.source.arrayBuffer())
  }

  public formData(): ReturnType<Response['formData']> {
    return this.source.formData()
  }

  public json(): ReturnType<Response['json']> {
    return this.source.json()
  }

  public text(): ReturnType<Response['text']> {
    return this.source.text()
  }

  public clone(): Response {
    return new ChromeFetchResponse(this.source.clone(), this.sourceHeaders.clone())
  }
}

export class ChromeCourier extends Courier {
  public override async get(url: string, headers?: HeadersInit): Promise<false | Response> {
    return this.fetchForChrome(url, {
      method: 'GET',
      headers: this.normalizeRequestHeaders(headers),
    })
  }

  public override async post(
    url: string,
    body: RequestBody,
    headers?: HeadersInit,
  ): Promise<false | Response> {
    return this.fetchForChrome(url, {
      method: 'POST',
      headers: this.normalizeRequestHeaders(headers),
      body: this.stringifyBody(body),
    })
  }

  private async fetchForChrome(url: string, init: RequestInit): Promise<false | Response> {
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), this.timeout)
    const requestUrl = new URL(url, this.base)

    try {
      const response = await fetch(requestUrl, {
        ...init,
        credentials: 'include',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        signal: abortController.signal,
      })

      return new ChromeFetchResponse(
        response,
        await this.createChromeResponseHeaders(requestUrl, response),
      )
    } catch {
      return false
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private normalizeRequestHeaders(headers?: HeadersInit): Headers {
    const normalizedHeaders = new Headers()

    if (!headers) {
      return normalizedHeaders
    }

    for (const [name, value] of new Headers(headers)) {
      if (blockedRequestHeaders.has(name.toLowerCase())) {
        continue
      }

      normalizedHeaders.append(name, value)
    }

    return normalizedHeaders
  }

  private stringifyBody(body: RequestBody): string {
    if (typeof body === 'string') {
      return body
    }

    if (body instanceof URLSearchParams) {
      return body.toString()
    }

    const searchParams = new URLSearchParams()

    for (const [name, value] of Object.entries(body)) {
      searchParams.append(name, String(value))
    }

    return searchParams.toString()
  }

  private async createChromeResponseHeaders(
    requestUrl: URL,
    response: Response,
  ): Promise<ChromeResponseHeaders> {
    const cookieUrl = response.url || requestUrl.toString()
    const cookies = await chrome.cookies.getAll({ url: cookieUrl })
    const location = response.redirected ? response.url : null
    const setCookie = cookies.map((cookie) => `${cookie.name}=${cookie.value};`)

    return new ChromeResponseHeaders(response.headers, location, setCookie)
  }
}

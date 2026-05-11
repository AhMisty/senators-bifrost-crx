import {
  Courier,
  type CourierGetOptions,
  type CourierPostOptions,
  type RequestBody,
  type RequestHeaders,
} from '@senators/bifrost'

const blockedRequestHeaders = new Set(['connection', 'cookie'])

type ChromeHeaders = Headers & {
  getSetCookie(): string[]
}

type ChromeCookieSnapshot = Map<string, string>

const createCookieSnapshotKey = (cookie: chrome.cookies.Cookie): string =>
  [cookie.name, cookie.domain ?? '', cookie.path ?? ''].join('\u0000')

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
  public override async get(options: CourierGetOptions): Promise<false | Response> {
    const { url, headers } = options

    return this.fetchForChrome(url, {
      method: 'GET',
      headers: this.normalizeRequestHeaders(headers),
    })
  }

  public override async post(options: CourierPostOptions): Promise<false | Response> {
    const { url, body, headers } = options

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
    const previousCookies = await this.snapshotCookies(requestUrl)

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
        await this.createChromeResponseHeaders(requestUrl, response, previousCookies),
      )
    } catch {
      return false
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private normalizeRequestHeaders(headers?: RequestHeaders): Headers {
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

  private async snapshotCookies(url: URL): Promise<ChromeCookieSnapshot> {
    const cookies = await chrome.cookies.getAll({ url: url.toString() })

    return new Map(
      cookies.map((cookie) => [createCookieSnapshotKey(cookie), cookie.value] as const),
    )
  }

  private collectSetCookies(
    previousCookies: ChromeCookieSnapshot,
    currentCookies: chrome.cookies.Cookie[],
  ): string[] {
    return currentCookies.flatMap((cookie) => {
      const key = createCookieSnapshotKey(cookie)
      const previousValue = previousCookies.get(key)

      if (previousValue === cookie.value) {
        return []
      }

      return [`${cookie.name}=${cookie.value};`]
    })
  }

  private isLoginRequest(url: URL): boolean {
    return url.pathname.endsWith('/index.php') && url.searchParams.get('page') === 'login'
  }

  private isSuccessfulLoginResponse(requestUrl: URL, response: Response): boolean {
    if (!this.isLoginRequest(requestUrl) || !response.redirected || !response.url) {
      return false
    }

    try {
      return !new URL(response.url).pathname.endsWith('/index.php')
    } catch {
      return false
    }
  }

  private async createChromeResponseHeaders(
    requestUrl: URL,
    response: Response,
    previousCookies: ChromeCookieSnapshot,
  ): Promise<ChromeResponseHeaders> {
    const cookieUrl = response.url || requestUrl.toString()
    const cookies = await chrome.cookies.getAll({ url: cookieUrl })
    const location = response.redirected ? response.url : null
    const setCookie = this.collectSetCookies(previousCookies, cookies)
    const nextSetCookie =
      setCookie.length > 0 || !this.isSuccessfulLoginResponse(requestUrl, response)
        ? setCookie
        : cookies.map((cookie) => `${cookie.name}=${cookie.value};`)

    return new ChromeResponseHeaders(response.headers, location, nextSetCookie)
  }
}

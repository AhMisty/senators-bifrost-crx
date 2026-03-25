import { Courier } from '@senators/bifrost'

const forbiddenRequestHeaders = new Set(['connection', 'cookie'])

type ResponseHeaders = Headers & {
  getSetCookie(): string[]
}

type Stringifiable = {
  toString(): string
}

const hasCustomToString = (value: object): value is Stringifiable =>
  typeof value.toString === 'function' && value.toString !== Object.prototype.toString

const stringifyStringifiable = (value: Stringifiable): string => value.toString()

const isSearchParamTuple = (value: unknown): value is [string, string] =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === 'string' &&
  typeof value[1] === 'string'

const isSearchParamTupleArray = (value: unknown): value is Array<[string, string]> =>
  Array.isArray(value) && value.every(isSearchParamTuple)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

class ChromeResponseHeaders extends Headers implements ResponseHeaders {
  readonly #location: string | null
  readonly #setCookieHeaders: string[]

  public constructor(headers: HeadersInit, location: string | null, setCookieHeaders: string[]) {
    super(headers)
    this.#location = location
    this.#setCookieHeaders = [...setCookieHeaders]
  }

  public override get(name: string): string | null {
    if (name.toLowerCase() === 'location') {
      return this.#location
    }

    return super.get(name)
  }

  public getSetCookie(): string[] {
    return [...this.#setCookieHeaders]
  }

  public clone(): ChromeResponseHeaders {
    return new ChromeResponseHeaders(this, this.#location, this.#setCookieHeaders)
  }
}

class ChromeResponse implements Response {
  private readonly response: Response
  private readonly responseHeaders: ChromeResponseHeaders
  public readonly headers: ResponseHeaders

  public constructor(response: Response, responseHeaders: ChromeResponseHeaders) {
    this.response = response
    this.responseHeaders = responseHeaders
    this.headers = responseHeaders
  }

  public get body(): ReadableStream<Uint8Array<ArrayBuffer>> | null {
    return this.response.body
  }

  public get bodyUsed(): boolean {
    return this.response.bodyUsed
  }

  public get ok(): boolean {
    return this.response.ok
  }

  public get redirected(): boolean {
    return this.response.redirected
  }

  public get status(): number {
    return this.response.status
  }

  public get statusText(): string {
    return this.response.statusText
  }

  public get type(): ResponseType {
    return this.response.type
  }

  public get url(): string {
    return this.response.url
  }

  public arrayBuffer(): Promise<ArrayBuffer> {
    return this.response.arrayBuffer()
  }

  public blob(): Promise<Blob> {
    return this.response.blob()
  }

  public async bytes(): Promise<Uint8Array<ArrayBuffer>> {
    return new Uint8Array(await this.response.arrayBuffer())
  }

  public formData(): Promise<FormData> {
    return this.response.formData()
  }

  public json(): Promise<any> {
    return this.response.json()
  }

  public text(): Promise<string> {
    return this.response.text()
  }

  public clone(): Response {
    return new ChromeResponse(this.response.clone(), this.responseHeaders.clone())
  }
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
      return new ChromeResponse(response, responseHeaders)
    } catch {
      return false
    } finally {
      clearTimeout(timeoutId)
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

    if (isSearchParamTupleArray(body)) {
      return new URLSearchParams(body).toString()
    }

    if (isRecord(body)) {
      return this.serializeRecordBody(body)
    }

    return this.serializeBodyValue(body) ?? undefined
  }

  private serializeRecordBody(body: Record<string, unknown>): string {
    const searchParams = new URLSearchParams()

    for (const [key, value] of Object.entries(body)) {
      const serializedValue = this.serializeBodyValue(value)

      if (serializedValue === null) {
        continue
      }

      searchParams.append(key, serializedValue)
    }

    return searchParams.toString()
  }

  private serializeBodyValue(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value)
    }

    if (value instanceof URLSearchParams) {
      return value.toString()
    }

    if (value instanceof Date) {
      return value.toISOString()
    }

    if (typeof value === 'object' && hasCustomToString(value)) {
      return stringifyStringifiable(value)
    }

    return null
  }

  private async createResponseHeaders(
    requestUrl: URL,
    response: Response,
  ): Promise<ChromeResponseHeaders> {
    const sessionCookies = await chrome.cookies.getAll({ url: new URL('/', requestUrl).toString() })
    const sessionCookieHeaders = sessionCookies.map((cookie) => `${cookie.name}=${cookie.value};`)
    const location = response.redirected ? response.url : null

    return new ChromeResponseHeaders(response.headers, location, sessionCookieHeaders)
  }
}

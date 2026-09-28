export const DEFAULT_BASE_URL = 'https://api.aixingialaire.shop/v1'
export const DEFAULT_MODEL = 'gpt-6-luna'
const DEFAULT_TIMEOUT_MS = 15_000
const MAX_RESPONSE_BYTES = 65_536
const MAX_REQUEST_BYTES = 65_536
const MAX_MESSAGE_COUNT = 16
const MAX_MESSAGE_CONTENT_LENGTH = 8_192

class NghienAiProviderError extends Error {
  constructor(code, status) {
    super(code)
    this.name = 'NghienAiProviderError'
    this.code = code
    if (status !== undefined) this.status = status
  }
}

function logMetadata(logger, level, metadata) {
  const log = logger?.[level]
  if (typeof log !== 'function') return
  try {
    log.call(logger, metadata)
  } catch {
    // Provider error normalization does not depend on logging.
  }
}

function configurationError() {
  return new NghienAiProviderError('provider_configuration_error')
}

function buildEndpoint(baseUrl) {
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') throw configurationError()
  let parsedUrl
  try {
    parsedUrl = new URL(baseUrl)
  } catch {
    throw configurationError()
  }

  const approvedProviderHost = parsedUrl.hostname.toLowerCase() === 'api.aixingialaire.shop'
  if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password || !approvedProviderHost) {
    throw configurationError()
  }

  parsedUrl.pathname = `${parsedUrl.pathname.replace(/\/+$/, '')}/chat/completions`
  parsedUrl.search = ''
  parsedUrl.hash = ''
  return parsedUrl.toString()
}
function validateTimeout(timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw configurationError()
  }
  return timeoutMs
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isAssistantChoice(choice) {
  return isRecord(choice)
    && isRecord(choice.message)
    && choice.message.role === 'assistant'
    && typeof choice.message.content === 'string'
}

function validateCompletion(payload) {
  if (!isRecord(payload)
    || payload.model !== DEFAULT_MODEL
    || !Array.isArray(payload.choices)
    || payload.choices.length === 0
    || !payload.choices.every(isAssistantChoice)) {
    throw new NghienAiProviderError('invalid_provider_response')
  }
  return payload
}

async function readProviderResponse(response) {
  if (!response || typeof response.json !== 'function') {
    throw new NghienAiProviderError('invalid_provider_response')
  }

  const contentLength = response.headers?.get?.('content-length')
  if (/^\d+$/.test(contentLength ?? '') && Number(contentLength) > MAX_RESPONSE_BYTES) {
    throw new NghienAiProviderError('invalid_provider_response')
  }

  if (typeof response.body?.getReader === 'function') {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const chunks = []
    let totalBytes = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        totalBytes += value.byteLength
        if (totalBytes > MAX_RESPONSE_BYTES) {
          await reader.cancel()
          throw new NghienAiProviderError('invalid_provider_response')
        }
        chunks.push(decoder.decode(value, { stream: true }))
      }
      chunks.push(decoder.decode())
      return JSON.parse(chunks.join(''))
    } catch (error) {
      if (error?.code === 'invalid_provider_response') throw error
      throw new NghienAiProviderError('invalid_provider_response')
    }
  }

  try {
    const payload = await response.json()
    const serialized = JSON.stringify(payload)
    if (typeof serialized !== 'string' || new TextEncoder().encode(serialized).byteLength > MAX_RESPONSE_BYTES) {
      throw new NghienAiProviderError('invalid_provider_response')
    }
    return payload
  } catch (error) {
    if (error?.code === 'invalid_provider_response') throw error
    throw new NghienAiProviderError('invalid_provider_response')
  }
}

function requestError() {
  return new NghienAiProviderError('provider_request_error')
}

/**
 * Creates the server-only provisional OpenAI-compatible NghienAI adapter.
 *
 * @param {object} options
 * @param {string} options.apiKey - Provider credential; never included in errors or logs.
 * @param {string} [options.baseUrl] - NghienAI API base URL.
 * @param {string} [options.model] - Requested model identifier.
 * @param {typeof fetch} [options.fetchImpl] - Injectable fetch implementation.
 * @param {object} [options.logger] - Accepted for application logging integration.
 * @param {number} [options.timeoutMs] - Request timeout in milliseconds.
 * @returns {{complete: (input: {messages: unknown[]}) => Promise<object>}}
 */
export function createNghienAiChatAdapter({
  apiKey,
  baseUrl = DEFAULT_BASE_URL,
  model = DEFAULT_MODEL,
  fetchImpl = globalThis.fetch,
  logger = console,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (typeof apiKey !== 'string' || apiKey.trim() === '' || model !== DEFAULT_MODEL
    || typeof fetchImpl !== 'function') throw configurationError()

  const endpoint = buildEndpoint(baseUrl)
  const requestTimeoutMs = validateTimeout(timeoutMs)
  void logger


  return Object.freeze({
    complete: async ({ messages } = {}) => {
      if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGE_COUNT
        || !messages.every((message) => isRecord(message)
          && ['system', 'user', 'assistant'].includes(message.role)
          && typeof message.content === 'string'
          && message.content.length > 0
          && message.content.length <= MAX_MESSAGE_CONTENT_LENGTH)) {
        throw new NghienAiProviderError('invalid_provider_request')
      }

      let body
      try {
        body = JSON.stringify({ model: DEFAULT_MODEL, messages })
      } catch {
        throw new NghienAiProviderError('invalid_provider_request')
      }
      if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
        throw new NghienAiProviderError('invalid_provider_request')
      }

      const controller = new AbortController()
      let timedOut = false
      let timeout
      const timeoutPromise = new Promise((_resolve, reject) => {
        timeout = setTimeout(() => {
          timedOut = true
          controller.abort()
          reject(new NghienAiProviderError('provider_timeout'))
        }, requestTimeoutMs)
      })

      const request = (async () => {
        let response
        try {
          response = await fetchImpl(endpoint, {
            method: 'POST',
            headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
            body,
            signal: controller.signal,
          })
        } catch (error) {
          if (error?.name === 'AbortError') throw new NghienAiProviderError('provider_timeout')
          throw requestError()
        }

        const status = response?.status
        if (!(response?.ok === true || (typeof status === 'number' && status >= 200 && status < 300))) {
          throw new NghienAiProviderError('provider_http_error', status)
        }
        return validateCompletion(await readProviderResponse(response))
      })()

      try {
        return await Promise.race([request, timeoutPromise])
      } catch (error) {
        if (error instanceof NghienAiProviderError) {
          if (error.code === 'provider_http_error') {
            logMetadata(logger, 'warn', { event: 'nghienai_http_error', status: error.status })
          }
          throw error
        }
        if (timedOut || error?.name === 'AbortError') {
          logMetadata(logger, 'warn', { event: 'nghienai_timeout' })
          throw new NghienAiProviderError('provider_timeout')
        }
        throw requestError()
      } finally {
        clearTimeout(timeout)
      }
    },
  })
}

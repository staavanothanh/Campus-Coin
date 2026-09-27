const API_PREFIX = '/api/v1'
const HEALTH_PATH = `${API_PREFIX}/health`

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function notFoundResponse() {
  return jsonResponse({
    error: {
      code: 'not_found',
      message: 'Route not found',
    },
  }, 404)
}

export function createApiHandler({ now = () => new Date() } = {}) {
  return async function handleRequest(request) {
    const pathname = new URL(request.url).pathname

    if (request.method !== 'GET' || pathname !== HEALTH_PATH) return notFoundResponse()

    return jsonResponse({
      data: {
        status: 'pass',
        timestamp: now().toISOString(),
      },
    }, 200)
  }
}

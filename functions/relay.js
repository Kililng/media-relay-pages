export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)
  if (url.pathname !== '/relay') return new Response('not found', { status: 404 })
  const token = url.searchParams.get('token')
  const expected = context.env.RELAY_TOKEN || 'af58eb889fced9a76267dc01acf277a6daa369b63fd77d34'
  if (token !== expected) return new Response('forbidden', { status: 403 })
  const target = url.searchParams.get('url')
  if (!target) return new Response('missing url', { status: 400 })
  try {
    const resp = await fetch(target, { method: request.method, redirect: 'follow' })
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        'content-type': resp.headers.get('content-type') || 'application/octet-stream',
        'access-control-allow-origin': '*'
      }
    })
  } catch (e) {
    return new Response('upstream error: ' + e.message, { status: 502 })
  }
}

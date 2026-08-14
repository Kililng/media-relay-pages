export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)
  if (url.pathname !== '/relay' && url.pathname !== '/fetch') {
    return new Response('not found', { status: 404 })
  }
  const token = url.searchParams.get('token')
  const expected = context.env.RELAY_TOKEN || 'af58eb889fced9a76267dc01acf277a6daa369b63fd77d34'
  if (token !== expected) return new Response('forbidden', { status: 403 })
  const target = url.searchParams.get('url')
  if (!target) return new Response('missing url', { status: 400 })
  try {
    // 构造转发给上游的请求头：
    // - 透传调用方指定的 UA（解析器常需 facebookexternalhit 等爬虫 UA 才能拿到真图，否则 Instagram 返回登录页 HTML）
    // - 透传 Accept
    // - 透传 x-upstream-referer / x-upstream-cookie（由云函数 getViaRelay 注入），转为标准 Referer/Cookie
    // 透明转发调用方发来的所有请求头（除逐跳头），并映射 x-upstream-* 为真实头。
    // 这样 Content-Type / Origin / 小红书签名头(x-s/x-s-common/x-t) 都会自动带上，
    // 而非 405（XHS 在收不到 content-type 时无法解析 POST body）。
    const fwd = new Headers()
    const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    request.headers.forEach((value, key) => {
      const lk = key.toLowerCase()
      if (lk === 'x-upstream-referer') { fwd.set('Referer', value); return }
      if (lk === 'x-upstream-cookie') { fwd.set('Cookie', value); return }
      if (lk === 'host' || lk === 'connection' || lk === 'content-length' || lk === 'transfer-encoding') return
      fwd.set(key, value)
    })
    if (!fwd.has('User-Agent')) fwd.set('User-Agent', DEFAULT_UA)
    if (!fwd.has('Accept-Language')) fwd.set('Accept-Language', 'en-US,en;q=0.9')

    // 把请求体读成完整字符串再转发：直接转发 request.body 流会导致 Cloudflare 不补 content-length，
    // 上游收到空 body（XHS 因此返回 405）。读成字符串后 fetch 会自动设置正确的 content-length。
    let body
    if (request.method === 'POST' || request.method === 'PUT') {
      try { body = await request.text() } catch (e) { body = undefined }
    }
    const resp = await fetch(target, { method: request.method, headers: fwd, body, redirect: 'follow' })
    // 透传「最终跳转后的真实 URL」，便于云函数解析器从短链/重定向里拿到真实帖子 ID
    // （Cloudflare fetch 在 redirect:'follow' 后，resp.url 即为最终地址）
    const finalUrl = resp.url || target
    return new Response(resp.body, {
      status: resp.status,
      headers: {
        'content-type': resp.headers.get('content-type') || 'application/octet-stream',
        'access-control-allow-origin': '*',
        'x-final-url': finalUrl
      }
    })
  } catch (e) {
    return new Response('upstream error: ' + e.message, { status: 502 })
  }
}

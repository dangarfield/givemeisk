export async function handler (event, context) {
  console.log('boom', event, context)
  const method = event.httpMethod
  const url = `https://discord.com${event.path}${event.rawQuery.length > 0 ? `?${event.rawQuery}` : ''}`
  const auth = event.headers.authorization
  const options = {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: auth,
      'User-Agent': 'DiscordBot' // 'User-Agent': `DiscordBot ($url, $versionNumber)`
    }
  }
  if (event.body) {
    const params = new URLSearchParams()
    params.append('content', 'Text message')
    options.body = params.toString()
    // options.body = new URLSearchParams(event.body).toString()
    options.body = event.body
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }
  console.log('proxy', url, options)
  const req = await fetch(url, options)
  const res = await req.json()
  console.log('res', url, res, req.status)
  return {
    statusCode: req.status,
    body: JSON.stringify(res)
  }
}

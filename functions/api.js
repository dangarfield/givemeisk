export async function handler (event, context) {
  console.log('api', event, context)
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
    // options.body = new URLSearchParams(event.body).toString()
    options.body = event.body
    // options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    options.headers['Content-Type'] = 'application/json'
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

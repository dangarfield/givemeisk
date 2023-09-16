import { claimsCollection, giveawayGroupCollection } from '../function-utils/db'
import nacl from 'tweetnacl'

const CHANNEL_MESSAGE_WITH_SOURCE = 4

const PUBLIC_KEY = process.env.PUBLIC_KEY

const goodBody = (jsonBody) => {
  // TODO set flags so that it is ephemeral
  if (jsonBody.data) jsonBody.data.flags = 1 << 6
  const msg = {
    statusCode: 200,
    body: JSON.stringify(jsonBody),
    headers: {
      'Content-Type': 'application/json'
    }
  }
  console.log('goodBody', msg)
  return msg
}
const verifyUserAgent = (event) => {
  if (!event.headers['user-agent'].includes('Discord')) {
    console.log('INVALID user-agent', event.headers['user-agent'])
    return false
  }
  return true
}

const verifySignature = (event) => {
//   console.log('event', event.headers, event.body)
  const signature = event.headers['x-signature-ed25519']
  const timestamp = event.headers['x-signature-timestamp']
  const body = event.body // rawBody is expected to be a string, not raw bytes

  const isVerified = nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, 'hex'),
    Buffer.from(PUBLIC_KEY, 'hex')
  )
  console.log('nacl', PUBLIC_KEY, signature, timestamp, body, isVerified)
  if (!isVerified) {
    console.log('INVALID signature')
    return false
  }
  return true
}
const isPing = (payload) => {
  if (payload.type && payload.type === 1) {
    return true
  }
  return false
}
const getProgressStats = async (giveawayGroup) => {
  const claims = await claimsCollection.aggregate([
    {
      $match: {
        giveawayId: { $in: giveawayGroup.giveaways }
      }
    },
    {
      $group: {
        _id: '$contractSent',
        count: { $sum: 1 }
      }
    }
  ]).toArray()
  const completeCount = claims.find(c => c._id === true).count
  const falseCount = claims.find(c => c._id === false).count
  const totalCount = completeCount + falseCount
  const percent = Math.round(100 * (completeCount / totalCount))
  return {
    completeCount, totalCount, percent
  }
}
const handleGiveMeIsk = async (payload) => {
  const userId = payload.member.user.id
  //   let username = payload.member.user.username
  //   if (payload.member.user.global_name) username = payload.member.user.global_name
  const giveawayGroupId = payload.data.options.find(o => o.name === 'giveaway').value
  const giveawayGroup = await giveawayGroupCollection.findOne({ _id: giveawayGroupId.toLowerCase() })
  console.log('giveawayGroup', giveawayGroupId, giveawayGroup)
  if (!giveawayGroup) {
    return goodBody({
      type: CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `It doesn't look as though we have any \`${giveawayGroupId}\` giveaways at the minute. Are you sure you got the name right?`
      }
    })
  }
  const q = {
    $and: [
      { discordId: userId },
      { giveawayId: { $in: giveawayGroup.giveaways } }
    ]
  }
  console.log('find', q)
  const claims = await claimsCollection.find(q).toArray()
  console.log('claims', claims)
  if (claims.length === 0) {
    return goodBody({
      type: CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'It looks as though you\'ve missed out this time. But come back soon! o7'
      }
    })
  }

  const { completeCount, totalCount, percent } = await getProgressStats(giveawayGroup)
  const progressText = `\n\nIssuing contracts is time consuming! We're ${percent}% through issuing the ${totalCount} contracts for this giveaway! That's ${completeCount} complete and counting!`

  let showLink = true
  let eveSignUpText = '\n\nYou will need to send us your EVE contact details, click the button to claim your prizes!'
  if (claims[0].eveId !== false) {
    showLink = false
    eveSignUpText = `\n\nWe can see that you've linked you EVE details \`${claims[0].eveName}\`! We'll soon see you in game, wait patiently for your contracts and an EVE mail!`
  }
  let prizeText = `Nice, you've won! For now, we'll going to tell you that you've got \`${claims[0].prize}\` but the giveaway hasn't finished yet! Keep an eye out! There are more giveaways to win!`
  if (giveawayGroup.ended) {
    prizeText = `Nice, it's done. All over, you've won hoard of stuff! ${claims.map(c => c.prize).map(p => `\n - ${p} `).join('')}`
  }
  const data = {
    type: CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `${prizeText} ${eveSignUpText} ${progressText}`
    }
  }
  if (showLink) {
    data.data.components = [{
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: 'Claim your prize!',
          url: `https://givemeisk.netlify.app/claims?id=${claims[0]._id}`
        }
      ]
    }

    ]
  }

  console.log('data', data)
  return goodBody(data)
}
const isCommand = (payload, commandName) => {
  if (payload.type === 2 && payload.data && payload.data.name === commandName) {
    return true
  }
  return false
}
export async function handler (event, context) {
  if (!verifyUserAgent(event)) return { statusCode: 403, body: 'Forbidden' }
  if (!verifySignature(event)) return { statusCode: 401, body: JSON.stringify({ error: 'invalid request signature' }) }

  const payload = JSON.parse(event.body)
  console.log('payload', payload)

  if (isPing(payload)) {
    console.log('PING')
    return { statusCode: 200, body: JSON.stringify({ type: 1 }), headers: { 'Content-Type': 'application/json' } }
  }

  if (isCommand(payload, 'givemeisk')) {
    return await handleGiveMeIsk(payload)
  }

  // Return a response for other commands
  return {
    statusCode: 200,
    body: JSON.stringify({
      type: 1,
      data: {
        content: 'Unknown command'
      }
    })
  }
}

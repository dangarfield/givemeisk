import { giveawayGroupCollection } from '../function-utils/db'
const ADMIN_PASS = process.env.ADMIN_PASS

const goodBody = (jsonBody) => { return { statusCode: 200, body: JSON.stringify(jsonBody) } }

export async function handler (event, context) {
  try {
    const pass = event.headers.authorization
    console.log('giveawayGroups', event, pass)
    if (pass !== ADMIN_PASS) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorised' }) }
    }
    if (event.httpMethod === 'GET') {
      const giveaways = await giveawayGroupCollection.find().toArray()
      for (const giveaway of giveaways) {
        giveaway.id = giveaway._id
        delete giveaway._id
      }
      return goodBody(giveaways)
    } else if (event.httpMethod === 'POST') {
      const doc = JSON.parse(event.body)
      doc.giveaways = doc.giveaways.split(',')
      const _id = doc.id
      delete doc.id
      const update = { $set: doc }
      console.log('upsert', _id, update)
      const result = await giveawayGroupCollection.updateOne({ _id }, update, { upsert: true })
      console.log('result', result)
    } else if (event.httpMethod === 'DELETE') {
      const _id = JSON.parse(event.body).id

      await giveawayGroupCollection.deleteOne({ _id })
      console.log('delete', _id)
    }
    return { statusCode: 200, body: JSON.stringify({ error: 'Not implemented' }) }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error'
      })
    }
  }
}

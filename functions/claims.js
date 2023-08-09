import { claimsCollection } from '../function-utils/db'

const badRes = { statusCode: 400, body: JSON.stringify({ error: 'Bad request' }) }
export async function handler (event, context) {
  try {
    const pathSplit = event.path.split('/')
    console.log('claims', event, pathSplit)
    if (pathSplit.length !== 3) {
      return badRes
    }

    if (event.httpMethod === 'GET') {
      const itemId = pathSplit[2]
      const claim = await claimsCollection.findOne({ _id: itemId })

      console.log('claim', claim)
      if (claim === null) {
        return badRes
      }
      claim.itemId = claim._id
      delete claim._id
      delete claim.date
      delete claim.giveawayId

      return {
        statusCode: 200,
        body: JSON.stringify(claim)
      }
    } else if (event.httpMethod === 'POST') {
      const itemId = pathSplit[2]
      const body = JSON.parse(event.body)
      const updateDoc = {}
      if (body.eveId !== undefined) updateDoc.eveId = body.eveId
      if (body.eveName !== undefined) updateDoc.eveName = body.eveName
      if (body.contractSent !== undefined) updateDoc.contractSent = body.contractSent
      console.log('post', itemId, event.body, updateDoc)
      if (Object.keys(updateDoc).length === 0) {
        return badRes
      }
      const updateRes = await claimsCollection.findOneAndUpdate({ _id: itemId }, { $set: updateDoc })
      console.log('updateRes', updateRes)
      if (updateDoc.eveName && updateDoc.eveId) {
        const updateManyRes = await claimsCollection.updateMany(
          { discordId: updateRes.value.discordId },
          {
            $set: {
              eveId: updateDoc.eveId,
              eveName: updateDoc.eveName
            }
          }
        )
        console.log('updateManyRes', updateManyRes)
      }
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      }
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

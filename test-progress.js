import { MongoClient, ServerApiVersion } from 'mongodb'

// console.log('process.env.MONGO_URI', process.env.MONGO_URI)
const client = new MongoClient('mongodb+srv://dangarfielduk:qQqlme5FMUi9Eeb1@cluster0.38an20b.mongodb.net/?retryWrites=true&w=majority', {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
})
const db = client.db('givemeisk')

const claimsCollection = db.collection('claims')
const giveawayGroupCollection = db.collection('giveaway-group')

// TODO - Ensure indexes
const init = async () => {
  console.log('init')
  const giveawayGroupId = 'skullyisinsane'
  const giveawayGroup = await giveawayGroupCollection.findOne({ _id: giveawayGroupId.toLowerCase() })
  console.log('giveawayGroup', giveawayGroupId, giveawayGroup)

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
  const trueCount = claims.find(c => c._id === true).count
  const falseCount = claims.find(c => c._id === false).count
  const totalCount = trueCount + falseCount
  const percent = Math.round(100 * (trueCount / totalCount))

  console.log('claims', claims, trueCount, falseCount, totalCount, percent)
}
init()

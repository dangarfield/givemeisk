import fs from 'fs'
import { Client, GatewayIntentBits } from 'discord.js'
import papaparse from 'papaparse'
import dotenv from 'dotenv'
dotenv.config()
// import cron from 'node-cron'

const CSV = process.env.CSV
const COUNTDOWN = process.env.COUNTDOWN
const DISCORD_KEY = process.env.DISCORD_KEY
const CHANNEL_NAME = process.env.CHANNEL_NAME
const GUILD_NAME = process.env.GUILD_NAME
const DEBUG = process.env.DEBUG !== 'false'
const USER_EXCLUSION_LIST = process.env.USER_EXCLUSION_LIST.split(',')

const SECONDS_BETWEEN_GIVEAWAYS = process.env.SECONDS_BETWEEN_GIVEAWAYS
// const TIME_BETWEEN_GIVEAWAYS = 100

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] })

let guildMembers = []
let channelMembers = []
const prizeList = []

const getRandomItemFromArray = (array) => {
  const randomIndex = Math.floor(Math.random() * array.length)
  return array[randomIndex]
}

const excludeAndMap = (arr) => {
  return arr.filter(m => !m.user.bot && !USER_EXCLUSION_LIST.includes(m.user.globalName || m.user.username))
    .map(m => { return { discordId: m.user.id, discordUser: m.user.globalName || m.user.username } })
}
const updateMembersList = async () => {
  const guildID = client.guilds.cache.find(g => g.name === GUILD_NAME).id
  const guild = await client.guilds.fetch(guildID)
  guildMembers = excludeAndMap(await guild.members.fetch())
  const channelCache = client.channels.cache.find(c => c.name === CHANNEL_NAME)
  channelMembers = excludeAndMap(channelCache.members)
}
const loadCSV = async () => {
  const fileData = fs.readFileSync(CSV, 'utf-8')
  const parsedData = papaparse.parse(fileData, { header: true })
  //   console.log('parsedData', parsedData)
  for (const line of parsedData.data) {
    const prize = line.Prize.trim()
    const available = parseInt(line.Available)
    if (prize === '' || isNaN(available)) continue
    // console.log('prize', prize, available)
    for (let i = 0; i < available; i++) {
    //   if (i === 1) break
      prizeList.push({ index: prizeList.length, giveAwayOrder: Math.random(), prize, discordId: '', discordUser: '' })
    }
  }
  prizeList.sort((a, b) => a.giveAwayOrder - b.giveAwayOrder)
  for (let i = 0; i < prizeList.length; i++) {
    prizeList[i].giveAwayOrder = i
  }
//   console.log('prizeList', prizeList)
}

const savePrizeList = () => {
  const orderedPrizeList = JSON.parse(JSON.stringify(prizeList))
  orderedPrizeList.sort((a, b) => a.index - b.index)
  const csv = papaparse.unparse(orderedPrizeList)
  fs.writeFileSync('prize-list.csv', csv)
}
const formatTime = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  const timeParts = []
  if (hours > 0) {
    timeParts.push(`${hours}h`)
  }
  if (minutes > 0) {
    timeParts.push(`${minutes}m`)
  }
  if (remainingSeconds > 0 || timeParts.length === 0) {
    timeParts.push(`${remainingSeconds}s`)
  }
  return timeParts.join(' ')
}
let task
const giveAwayNextPrize = async () => {
  await updateMembersList()
  //   const user = { discordId: '123', discordUser: 'DAN' }
  const user = getRandomItemFromArray(guildMembers)
  const i = prizeList.findIndex(p => p.discordId === '')
  console.log('i', i)
  if (i < 0) {
    task.stop()
    client.destroy()
    console.log('Giveaway complete')
    return
  }
  const nextPrize = prizeList[i]
  nextPrize.discordId = user.discordId
  nextPrize.discordUser = user.discordUser
  const msg = `Woohoo: ${user.discordUser} wins prize ${i + 1} of ${prizeList.length} ---> ${nextPrize.prize} !!!`
  console.log('giveAwayNextPrize', nextPrize, msg)
  savePrizeList()

//   const channelCache = client.channels.cache.find(c => c.name === CHANNEL_NAME)
//   channelCache.send(msg)
}
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
const beginCountDown = async () => {
  const countdown = fs.readFileSync(COUNTDOWN, 'utf-8').split('\n').filter(l => l !== '')

  const countdownLineTime = 1000
  console.log('COUNTDOWN - Will take', formatTime(countdownLineTime * countdown.length), 'to display', countdown.length, 'lines')
  const channelCache = client.channels.cache.find(c => c.name === CHANNEL_NAME)

  for (let i = 0; i < countdown.length; i++) {
    const line = countdown[i]
    console.log(`SEND TO DISCORD ${i + 1} of ${countdown.length} :`, line)
    if (!DEBUG) {
      console.log('SENDDDDD')
    //   channelCache.send(line)
    }
  }
}
const beginGiveaway = async () => {
  console.log('Prizes: ', prizeList.length, 'Time required: ', formatTime(prizeList.length * SECONDS_BETWEEN_GIVEAWAYS * 1000))
  //   const cron10Seconds = '0,10,20,30,40,50 * * * * *'
  const cron1Second = '* * * * * *'
  //   const cron1Minute = '0 * * * * *'
  task = cron.schedule(cron1Second, giveAwayNextPrize, { scheduled: true })
}
const init = async () => {
  console.log('Program Initialising')

  await loadCSV()
  savePrizeList()

  client.login(DISCORD_KEY)
  client.on('ready', async () => {
    console.log('Connected to Discord Channel')

    await beginCountDown()
    // await beginGiveaway()
    // await updateMembersListFromMessages(client)
    // console.log('members', channelMembers.length, guildMembers.length)
  })

//   client.on(Events.MessageCreate, (msg) => {
//     console.log('MessageCreate', msg)
//   })
}
init()

const BASE_URL = 'https://discord.com/api/v10'

const executeFetchGet = async (path, params) => {
  const url = `${path}?${params.toString()}`
  const req = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bot ${persistedData.discordKey}`
    }
  })
  const res = await req.json()
  console.log('res', res)
  return res
}
const getAndUpdateChannels = async () => {
  const channels = (await executeFetchGet(`${BASE_URL}/guilds/${persistedData.guild.id}/channels`, new URLSearchParams()))// .map(g => { return { id: g.id, name: g.name } })
  console.log('channels', channels)
}
const getAndUpdateGuilds = async () => {
  const guilds = (await executeFetchGet(`${BASE_URL}/users/@me/guilds`, new URLSearchParams())).map(g => { return { id: g.id, name: g.name } })
  console.log('guilds', guilds)
  const selectOptions = guilds.map(g => `<option value="${g.id}">${g.name}</option>`).join('')
  const guildEle = document.querySelector('.guild')
  guildEle.innerHTML = selectOptions
  guildEle.removeAttribute('disabled')
  guildEle.dispatchEvent(new Event('change', { bubbles: true }))
}

const bindDiscordKeySelect = async () => {
  document.querySelector('.discord-key-button').addEventListener('click', async () => {
    persistedData.discordKey = document.querySelector('.discord-key').value
    saveData()
    await getAndUpdateGuilds()
  })
}
function getSelectedOptionText (selectElement) {
  const selectedIndex = selectElement.selectedIndex
  if (selectedIndex !== -1) {
    return selectElement.options[selectedIndex].textContent
  }
  return null // Return null if no option is selected
}

const bindGuildSelect = async () => {
  document.querySelector('.guild').addEventListener('change', async () => {
    const guildEle = document.querySelector('.guild')
    const guildId = guildEle.value
    const guildName = getSelectedOptionText(guildEle)
    console.log('guild', guildId, guildName)
    persistedData.guild = {
      id: guildEle.value,
      name: getSelectedOptionText(guildEle)
    }
    saveData()
    await getAndUpdateChannels()
  })
}
const saveData = () => {
  window.localStorage.setItem('givemeisk', JSON.stringify(persistedData))
}
const loadData = () => {
  let d = window.localStorage.getItem('givemeisk')
  d = d ? JSON.parse(d) : {}

  if (d.discordKey) document.querySelector('.discord-key').value = d.discordKey

  return d
}
const init = async () => {
  console.log('init', persistedData)
  bindDiscordKeySelect()
  bindGuildSelect()
}
const persistedData = loadData()
init()

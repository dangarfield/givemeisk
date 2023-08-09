import { nanoid } from 'nanoid'

const BASE_URL = '/api/v10'

const executeFetchGet = async (path, params) => {
  const url = `${path}?${params.toString()}`
  const req = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bot ${persistedData.discordKey}`
    }
  })
  const res = await req.json()
  // console.log('executeFetchGet', url, res)
  return res
}

const executeFetchPost = async (path, body) => {
  const url = `${path}`
  const req = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bot ${persistedData.discordKey}`,
      'Content-Type': 'application/json'
    },
    body
  })
  const res = await req.json()
  // console.log('executeFetchGet', url, res)
  return res
}

// RESULT ORDER FUNCTIONS
// ADD YOUR OWN ONE AND REGISTER IT IN bindResultSortButton for it to work!

// Don't change the order at all
const giveawayOrderResultSortOrder = (a, b) => {
  return a.giveawayOrder - b.giveawayOrder
}

// This sorts by id for now, maybe change to alphabetical later
const userResultSortOrder = (a, b) => {
  return a.winnerDiscordName.localeCompare(b.winnerDiscordName)
}

let members
let resultOrderFn = giveawayOrderResultSortOrder
const sleep = (s) => {
  return new Promise(resolve => setTimeout(resolve, s * 1000))
}

const sendMessage = async (isDryRun, logEle, task) => {
  console.log('sendMessage', task)
  const paramsBody = {}
  let pm
  if (!task.prizeMessage) {
    paramsBody.content = task.msg
    console.log('sendMessage - simple', isDryRun, task.msg)
    logEle.textContent = task.msg
  } else {
    const prizeTitle = task.perPrize > 1 ? `${task.perPrize}x ${task.prizeName}` : task.prizeName
    pm = {
      recipient: task.winnerDiscordId,
      body: {
        content: `Hey \`${task.winnerDiscordName}\`, you won! \`${prizeTitle}\`. [Click here to claim](${window.location.origin}/claims?id=${task.giveawayItemId})`
      }
    }
    let msg = task.prizeMessage
    if (window.location.href.includes('localhost')) {
      msg = task.prizeMessage.replace(/<@(\w+)>/g, (match, captureGroup) => captureGroup) // TEMPORARY to supress notifications from dev
      pm.recipient = '1136201410388709469'
    }

    const embed = {
      title: prizeTitle,
      description: msg,
      color: 0xFAD02C,
      thumbnail: {
        url: 'https://i.ibb.co/47rkmSp/favicon-32x32.png' // TODO - Update with netlify / github cdn version of favicon-32x32.png
      },
      footer: {
        text: 'To claim prizes: Check your PM!'
      }
    }
    if (task.sponsorMessage) {
      embed.fields = [
        {
          name: 'Sponsored by',
          value: task.sponsorMessage
        }
      ]
    }
    paramsBody.embeds = [embed]
    console.log('sendMessage - embed', isDryRun, msg)
    logEle.textContent = msg
  }
  console.log('paramsBody', paramsBody, pm)

  if (!isDryRun) {
    const messageRes = await executeFetchPost(`${BASE_URL}/channels/${persistedData.channel.id}/messages`, JSON.stringify(paramsBody))
    console.log('pmRes', messageRes)
    if (pm !== undefined) {
      const pmChannelRes = await executeFetchPost(`${BASE_URL}/users/@me/channels`, JSON.stringify({ recipient_id: pm.recipient }))
      console.log('pmChannelRes', pmChannelRes)
      const pmRes = await executeFetchPost(`${BASE_URL}/channels/${pmChannelRes.id}/messages`, JSON.stringify(pm.body))
      console.log('pmRes', pmRes)
    }
  }
}
const processTaskList = async (allTasks) => {
  const isDryRun = document.querySelector('.dry-run').checked
  const logEle = document.querySelector('.last-msg-sent')
  console.log('processTaskList', allTasks, isDryRun)
  for (const task of allTasks) {
    console.log('task', task)
    if (isDryRun) {
      await sleep(1)
    } else {
      await sleep(task.delay)
    }
    await sendMessage(isDryRun, logEle, task)
    if (task.giveawayOrder) {
      const r = persistedResult.find(r => r.giveawayOrder === task.giveawayOrder)
      r.msgSent = true
      saveResult()
      renderResult()
    }
  }
  renderResult()
  console.log('processTaskList END')
  window.alert('COMPLETE!!! Woohoo! You did it! You can copy the results to excel too!')
}
const disableInputs = () => {
  document.querySelector('.discord-key').setAttribute('disabled', 'disabled')
  document.querySelector('.discord-key-button').setAttribute('disabled', 'disabled')
  document.querySelector('.guild').setAttribute('disabled', 'disabled')
  document.querySelector('.channel').setAttribute('disabled', 'disabled')
  document.querySelector('.blacklist-dropdown .dropdown-toggle').setAttribute('disabled', 'disabled')
  for (const btn of [...document.querySelectorAll('.blacklist-holder .btn')]) {
    btn.setAttribute('disabled', 'disabled')
  }
  document.querySelector('.giveaway-gap').setAttribute('disabled', 'disabled')
  document.querySelector('.dry-run').setAttribute('disabled', 'disabled')
  document.querySelector('.black-to-white').setAttribute('disabled', 'disabled')
  document.querySelector('.start').setAttribute('disabled', 'disabled')
}
const executeRestart = async () => {
  disableInputs()
  const countafter = await validateCountafter(persistedData.countafter)
  console.log('executeGiveaway', persistedResult, countafter)
  const allTasks = [
    ...persistedResult.filter(r => !r.msgSent), // .map(r => { return { msg: r.prizeMessage, delay: persistedData.giveawayGap, giveawayOrder: r.giveawayOrder } }),
    ...countafter.map(c => { return { msg: c, delay: 1 } })]
  console.log('restartTasks', allTasks)
  allTasks[0].delay = 1
  await processTaskList(allTasks)
}
const saveGiveawayClaims = async () => {
  const giveawayId = nanoid(10)
  persistedData.giveawayId = giveawayId
  if (persistedData.historicGiveaways === undefined) persistedData.historicGiveaways = []
  persistedData.historicGiveaways.push(persistedData.giveawayId)
  saveData()
  document.querySelector('.giveaway-admin-link').setAttribute('href', `/admin?id=${giveawayId}`)
  // const prizeTitle =
  const claims = persistedResult.map(r => { return { itemId: r.giveawayItemId, giveawayId, discordId: r.winnerDiscordId, discordName: r.winnerDiscordName, prize: r.perPrize > 1 ? `${r.perPrize}x ${r.prizeName}` : r.prizeName, eveId: false, eveName: false, contractSent: false } })
  console.log('saveGiveawayClaims', giveawayId, persistedResult, claims)

  const isDryRun = document.querySelector('.dry-run').checked
  if (!isDryRun) {
    const saveRes = await executeFetchPost(`/giveaways/${giveawayId}`, JSON.stringify(claims))
    console.log('saveRes', saveRes)
  }
}
const executeGiveaway = async () => {
  disableInputs()
  const countdown = await validateCountdown(persistedData.countdown)
  const countafter = await validateCountafter(persistedData.countafter)
  console.log('executeGiveaway', countdown, persistedResult, countafter)
  const allTasks = [
    ...countdown.map(c => { return { msg: c, delay: 1 } }),
    ...persistedResult, // .map(r => { return { msg: r.prizeMessage, delay: persistedData.giveawayGap, giveawayOrder: r.giveawayOrder } }),
    ...countafter.map(c => { return { msg: c, delay: 1 } })]

  allTasks[0].delay = 1
  allTasks.find(r => r.giveawayOrder === 1).delay = 1
  console.log('allTasks', allTasks)
  await saveGiveawayClaims()
  await processTaskList(allTasks)
}
const bindClearResults = async () => {
  document.querySelector('.results-clear').addEventListener('click', () => {
    persistedResult = []
    saveResult()
    persistedData.tab = 'prizes'
    saveData()
    window.location.reload()
  })
}
const renderResult = () => {
  console.log('displayResult', persistedResult)
  let html = ''
  html += `<table class="table table-sm table-striped table-hover">
    <thead>
      <tr>
        <th scope="col">Order</th>
        <th scope="col">Giveaway Order</th>
        <th scope="col">Prize</th>
        <th scope="col">Items in each prize</th>
        <th scope="col">Prize Message</th>
        <th scope="col">Winner</th>
        <th scope="col">Message Sent</th>
      </tr>
    </thead>`
  html += persistedResult.sort((a, b) => { return resultOrderFn(a, b) }).map(row => `
    <tr${row.msgSent ? ' class="table-success"' : ''}>
      <th scope="row">${row.order}</th>
      <td>${row.giveawayOrder}</td>
      <td>${row.prizeName}</td>
      <td>${row.perPrize}</td>
      <td>${row.prizeMessage}</td>
      <td>${row.winnerDiscordName}</td>
      <td>${row.msgSent ? 'Yes' : 'No'}</td>
    </tr>`).join('')
  html += '</table>'
  document.querySelector('.tab[data-tab="results"] .grid-output').innerHTML = html

  const msgSentCount = persistedResult.filter(r => r.msgSent).length
  const timeLeft = formatTime((persistedResult.length - msgSentCount) * persistedData.giveawayGap)
  for (const resultProgressEle of [...document.querySelectorAll('.result-progress')]) {
    resultProgressEle.innerHTML = `
    <button type="button" class="btn btn-info mb-1" disabled>
      Progress: <span class="badge text-bg-primary">${msgSentCount}</span> of <span class="badge text-bg-secondary">${persistedResult.length}</span>
    </button>
    <button type="button" class="btn btn-info mb-1" disabled>
      Time left: <span class="badge text-bg-primary">${timeLeft}</span>
    </button>`
  }
}
const getWinner = () => {
  // TODO - Update this from API each time to get new members
  const useWhitelist = document.querySelector('.black-to-white').checked
  const potentialWinners = members.filter(m => useWhitelist === m.blacklisted)
  const randomIndex = Math.floor(Math.random() * potentialWinners.length)
  return potentialWinners[randomIndex]
}
const calculateAndPresentResults = async () => {
  console.log('calculateAndPresentResults')
  const isCountdownValid = await validateCountdown(persistedData.countdown)
  if (!isCountdownValid) {
    window.alert('Countdown is not valid, please fix and retry')
    document.querySelector('.nav-link[data-tab="countdown"]').click()
    return false
  }
  const isCountafterValid = await validateCountafter(persistedData.countafter)
  if (!isCountafterValid) {
    window.alert('Countafter is not valid, please fix and retry')
    document.querySelector('.nav-link[data-tab="countafter"]').click()
    return false
  }
  const prizeList = await validatePrizes(persistedData.prizes)
  if (!prizeList) {
    window.alert('Prizes are not valid, please fix and retry')
    document.querySelector('.nav-link[data-tab="prizes"]').click()
    return false
  }
  console.log('calculateAndPresentResults', prizeList)
  const giveawayList = []
  for (const line of prizeList) {
    for (let i = 0; i < line.noPrizes; i += line.perPrize) {
      let prizeMessage = line.prizeMessage ? line.prizeMessage : persistedData.defaultPrizeMessage
      const winner = getWinner()
      prizeMessage = prizeMessage.replace(/@user/g, `<@${winner.id}>`)
      prizeMessage = prizeMessage.replace(/@prize/g, line.perPrize > 1 ? `${line.perPrize}x ${line.prizeName}` : line.prizeName)
      console.log('winner', winner)
      giveawayList.push({ order: i + 1, giveawayOrder: Math.random(), prizeName: line.prizeName, perPrize: line.perPrize, prizeMessage, sponsorMessage: line.sponsorMessage, winnerDiscordId: winner.id, winnerDiscordName: winner.name, giveawayItemId: nanoid(10), msgSent: false })
    }
  }
  giveawayList.sort((a, b) => a.giveawayOrder - b.giveawayOrder)
  for (let i = 0; i < giveawayList.length; i++) {
    giveawayList[i].giveawayOrder = i + 1
  }
  console.log('giveawayList', giveawayList)
  persistedResult = giveawayList
  await renderResult()
  saveResult()
  document.querySelector('.nav-link[data-tab="results"]').removeAttribute('disabled')
  document.querySelector('.nav-link[data-tab="results"]').click()
  return true
}
const bindRestartButton = async () => {
  const ele = document.querySelector('.results-restart')
  ele.addEventListener('click', () => {
    executeRestart()
  })
}
const bindStartButton = async () => {
  const ele = document.querySelector('.start')
  if (persistedResult.length > 0) {
    ele.setAttribute('disabled', 'disabled')
    ele.textContent = 'Giveaway in progress'
    document.querySelector('.nav-link[data-tab="results"]').click()

    const restartEle = document.querySelector('.results-restart')
    restartEle.removeAttribute('disabled')
    restartEle.textContent = 'Restart from last message'
    return
  }
  ele.removeAttribute('disabled')
  ele.textContent = 'Start Giveaway'
  ele.addEventListener('click', async () => {
    // console.log('ele', ele, this)
    ele.setAttribute('disabled', 'disabled')
    ele.textContent = 'Giveaway running'
    // Don't do anything if there are results already
    const allValid = await calculateAndPresentResults()
    console.log('allValid', allValid)
    if (allValid) {
      await executeGiveaway()
    } else {
      ele.removeAttribute('disabled')
      ele.textContent = 'Start Giveaway'
    }
  })
}
const getAndUpdateMembers = async () => {
  const params = new URLSearchParams()
  params.append('limit', 1000)
  members = (await executeFetchGet(`${BASE_URL}/guilds/${persistedData.guild.id}/members`, params))
    .filter(m => !m.user.bot)
    .map(m => { return { id: m.user.id, name: m.user.global_name || m.user.username, username: m.user.username, globalName: m.user.global_name, blacklisted: false } })
    // .sort((a, b) => a.user.username.localeCompare(b.user.username))
    .sort((a, b) => a.name.localeCompare(b.name))
  if (persistedData.blacklist) {
    for (const member of members) {
      for (const blacklistMember of persistedData.blacklist) {
        if (member.id === blacklistMember.id) member.blacklisted = true
      }
    }
  }
  // console.log('members', members)
  // for (const m of members) {
  //   console.log('m', m.id, m.username, m.globalName, m)
  //   // console.log('m', m.user.id, m.user.username, m.user.global_name, m)
  // }
  document.querySelector('.blacklist-dropdown .dropdown-toggle').removeAttribute('disabled')
  await bindStartButton()
}
const renderBlackListPersisted = async () => {
  let blacklistHtml = ''
  for (const member of persistedData.blacklist) {
    // console.log('blacklisted member', member)
    blacklistHtml += `
    <button type="button" class="btn btn-outline-danger position-relative btn-sm mx-1 my-1" data-id="${member.id}" disabled>
      ${member.name}
      <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">X
      </span>
    </button>`
  }
  document.querySelector('.blacklist-holder').innerHTML = blacklistHtml
}
const renderBlackList = async () => {
  // console.log('renderBlackList')
  let html = ''
  html += '<input class="form-control member-search" type="text" placeholder="Search..">'
  html += members.map(m => `<li><button class="dropdown-item member${m.blacklisted ? ' active' : ''}" data-id="${m.id}">${m.name}</button>`).join('')
  document.querySelector('.blacklist-dropdown .dropdown-menu').innerHTML = html

  document.querySelector('.member-search').addEventListener('keyup', function () {
    const filterValue = this.value.toLowerCase()
    // console.log('filterValue', filterValue)
    for (const memberELe of [...document.querySelectorAll('.blacklist-dropdown .member')]) {
      // console.log('memberELe', memberELe, memberELe.textContent)
      if (memberELe.textContent.toLowerCase().includes(filterValue)) {
        memberELe.style.display = 'inherit'
      } else {
        memberELe.style.display = 'none'
      }
    }
  })
  for (const memberELe of [...document.querySelectorAll('.blacklist-dropdown .member')]) {
    memberELe.addEventListener('click', function () {
      const id = this.getAttribute('data-id')
      const member = members.find(m => m.id === id)
      member.blacklisted = !member.blacklisted
      // console.log('member click', id, member)
      renderBlackList()
    })
  }
  let blacklistHtml = ''
  const blacklistedMembers = members.filter(m => m.blacklisted).map(m => { return { id: m.id, name: m.name } })
  for (const member of blacklistedMembers) {
    // console.log('blacklisted member', member)
    blacklistHtml += `
    <button type="button" class="btn btn-outline-danger position-relative btn-sm mx-1 my-1" data-id="${member.id}">
      ${member.name}
      <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">X
      </span>
    </button>`
  }
  document.querySelector('.blacklist-holder').innerHTML = blacklistHtml
  for (const blacklistMemberEle of [...document.querySelectorAll('.blacklist-holder .btn')]) {
    blacklistMemberEle.addEventListener('click', function () {
      const id = this.getAttribute('data-id')
      const member = members.find(m => m.id === id)
      member.blacklisted = !member.blacklisted
      // console.log('member click', id, member)
      renderBlackList()
    })
  }

  // console.log('blacklistedMembers', blacklistedMembers)
  persistedData.blacklist = blacklistedMembers
  saveData()
}
const getAndUpdateChannels = async () => {
  const channels = (await executeFetchGet(`${BASE_URL}/guilds/${persistedData.guild.id}/channels`, new URLSearchParams())).map(g => { return { id: g.id, name: g.name } })
  // console.log('channels', channels)
  const selectOptions = channels.map(g => `<option value="${g.id}"${(persistedData.channel && persistedData.channel.name === g.name) ? ' selected' : ''}>${g.name}</option>`).join('')
  const channelEle = document.querySelector('.channel')
  channelEle.innerHTML = selectOptions
  channelEle.removeAttribute('disabled')
  channelEle.dispatchEvent(new Event('change', { bubbles: true }))
}
const getAndUpdateGuilds = async () => {
  try {
    const res = await executeFetchGet(`${BASE_URL}/users/@me/guilds`, new URLSearchParams())
    if (res.message && res.message.includes('Unauth')) {
      window.alert('YOUR DISCORD KEY IS INVALID')
      return
    }
    console.log('getAndUpdateGuilds res', res)
    const guilds = res.map(g => { return { id: g.id, name: g.name } })
    // console.log('guilds', guilds)
    const selectOptions = guilds.map(g => `<option value="${g.id}"${(persistedData.guild && persistedData.guild.name === g.name) ? ' selected' : ''}>${g.name}</option>`).join('')
    const guildEle = document.querySelector('.guild')
    guildEle.innerHTML = selectOptions
    guildEle.removeAttribute('disabled')
    guildEle.dispatchEvent(new Event('change', { bubbles: true }))
  } catch (error) {
    console.log('error', error)
    window.alert('ERROR WITH YOUR DISCORD KEY')
  }
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
const bindNavTabs = async () => {
  const navLinks = document.querySelectorAll('.nav-tabs .nav-link')
  navLinks.forEach(navLink => {
    navLink.addEventListener('click', () => {
      const type = navLink.getAttribute('data-tab')
      document.querySelectorAll('.tab').forEach(tab => {
        tab.style.display = tab.getAttribute('data-tab') === type ? 'block' : 'none'
      })
      navLinks.forEach(navLinkActive => {
        navLinkActive.classList.toggle('active', navLinkActive.getAttribute('data-tab') === type)
      })
      persistedData.tab = type
      saveData()
    })
  })
}
const validateCountdown = async (value) => {
  const ele = document.querySelector('.tab[data-tab="countdown"] .grid-validation')
  const lines = value.split('\n').filter(l => l !== '').map(v => '```arm\n' + v + '\n```')
  const isValid = lines.length > 0
  // console.log('validateCountdown', value, lines, isValid)
  if (!isValid) {
    ele.classList.remove('alert-light')
    ele.classList.remove('alert-success')
    ele.classList.add('alert-danger')
    ele.textContent = 'No lines created'
    return false
  } else {
    ele.classList.remove('alert-light')
    ele.classList.remove('alert-danger')
    ele.classList.add('alert-success')
    ele.textContent = `Countdown has ${lines.length} lines. It'll take approximately ${formatTime(lines.length)}`
    return lines
  }
}
const validateCountafter = async (value) => {
  const ele = document.querySelector('.tab[data-tab="countafter"] .grid-validation')
  const lines = value.split('\n').filter(l => l !== '').map(v => '```arm\n' + v + '\n```')
  const isValid = lines.length > 0
  // console.log('validateCountdown', value, lines, isValid)
  if (!isValid) {
    ele.classList.remove('alert-light')
    ele.classList.remove('alert-success')
    ele.classList.add('alert-danger')
    ele.textContent = 'No lines created'
    return false
  } else {
    ele.classList.remove('alert-light')
    ele.classList.remove('alert-danger')
    ele.classList.add('alert-success')
    ele.textContent = `Countafter has ${lines.length} lines. It'll take approximately ${formatTime(lines.length)}`
    return lines
  }
}
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.ceil(seconds % 60)
  let formattedTime = ''
  if (hours > 0) {
    formattedTime += hours + 'h '
  }
  if (minutes > 0) {
    formattedTime += minutes + 'm '
  }
  formattedTime += remainingSeconds + 's'
  return formattedTime
}
const displayPrizeValidation = (isValid, msg, prizeList) => {
  const validationEle = document.querySelector('.tab[data-tab="prizes"] .grid-validation')
  const outputEle = document.querySelector('.tab[data-tab="prizes"] .grid-output')
  if (!isValid) {
    validationEle.classList.remove('alert-light')
    validationEle.classList.remove('alert-success')
    validationEle.classList.add('alert-danger')
    outputEle.innerHTML = '<h3 class="text-center align-self w-100 text-muted"><i>Fix errors to continue</i></h3>'
  } else {
    validationEle.classList.remove('alert-light')
    validationEle.classList.remove('alert-danger')
    validationEle.classList.add('alert-success')

    let html = ''
    html += `<table class="table table-sm table-striped table-hover">
    <thead>
      <tr>
        <th scope="col">Prize</th>
        <th scope="col">No of Prizes</th>
        <th scope="col">Items in each prize</th>
        <th scope="col">Prize msg</th>
        <th scope="col">Sponsored msg</th>
      </tr>
    </thead>`
    html += prizeList.map(row => `
    <tr>
      <th scope="row">${row.prizeName}</th>
      <td>${row.noPrizes}</td>
      <td>${row.perPrize}</td>
      <td>${row.prizeMessage ? row.prizeMessage : ''}</td>
      <td>${row.sponsorMessage ? row.sponsorMessage : ''}</td>
    </tr>`).join('')
    html += '</table>'
    outputEle.innerHTML = html
  }
  validationEle.textContent = msg
  return isValid
}
const convertToInt = (inputString) => {
  const parsedInt = parseInt(inputString)
  return !isNaN(parsedInt) && Number.isInteger(parsedInt) ? parsedInt : false
}
const validatePrizes = (prizes) => {
  // console.log('validatePrizes', prizes)
  const rows = prizes.split('\n').map(r => r.split('\t'))

  // console.log('rows', rows)
  const prizeList = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row.length !== 5) return displayPrizeValidation(false, `Row ${i + 1} doesn't have 5 columns. It has ${row.length}`)
    if (i > 0) { // Eg, ignore the header
      const prizeName = row[0]
      if (prizeName.length === 0) return displayPrizeValidation(false, `Row ${i + 1}: Prize name must not be empty`)

      const noPrizes = convertToInt(row[1])
      if (noPrizes === false) return displayPrizeValidation(false, `Row ${i + 1}: No of prizes is invalid. It is ${row[1] === '' ? 'empty' : `"${row[1]}"`}, but it should be a number`)

      let perPrize = convertToInt(row[2])
      if (row[2] === '') perPrize = 1
      if (perPrize === false) return displayPrizeValidation(false, `Row ${i + 1}: Items in each prize is invalid. It is ${row[1] === '' ? 'empty' : `"${row[1]}"`}, but it should be a number or left empty`)
      // console.log('perPrize', i, perPrize)

      if (row[3].length > 0 && !row[3].includes('@user')) return displayPrizeValidation(false, `Row ${i + 1}: Prize message is invalid. It must include "@user" (without quotes) to display the result. You can also put @prize to display the prize if you so desire`)
      const prizeMessage = row[3].length > 0 ? row[3] : false
      // console.log('prizeMessage', i, prizeMessage)

      const sponsorMessage = row[4].length > 0 ? row[4] : false
      // console.log('prizeMessage', i, prizeMessage)
      prizeList.push({ prizeName, noPrizes, perPrize, prizeMessage, sponsorMessage })
    }
  }
  const totalPrizes = prizeList.reduce((s, p) => s + p.noPrizes, 0)
  const totalGiveaways = prizeList.reduce((s, p) => s + (p.noPrizes / p.perPrize), 0)
  const time = formatTime(totalGiveaways * persistedData.giveawayGap)
  // console.log('prizeList', prizeList, totalPrizes, totalGiveaways)
  displayPrizeValidation(true, `All good! We're set to giveaway ${totalPrizes.toLocaleString()} over ${totalGiveaways.toLocaleString()} giveaways. It'll take approximately ${time}`, prizeList)
  return prizeList
}
const bindPrizes = async () => {
  const ele = document.querySelector('.prizes')
  ele.addEventListener('input', async () => {
    const value = document.querySelector('.prizes').value
    // console.log('prizes', prizes)
    persistedData.prizes = value
    validatePrizes(value)
    saveData()
  })
}
const bindCountafter = async () => {
  const ele = document.querySelector('.countafter')
  ele.addEventListener('input', async () => {
    const value = document.querySelector('.countafter').value
    // console.log('countdown', value.length)
    persistedData.countafter = value
    validateCountafter(value)
    saveData()
  })
}
const bindCountdown = async () => {
  const ele = document.querySelector('.countdown')
  ele.addEventListener('input', async () => {
    const value = document.querySelector('.countdown').value
    // console.log('countdown', value.length)
    persistedData.countdown = value
    validateCountdown(value)
    saveData()
  })
}
const bindDefaultPrizeMessage = async () => {
  document.querySelector('.default-prize-message').addEventListener('change', async () => {
    const value = document.querySelector('.default-prize-message').value.trim()
    // console.log('defaultPrizeMessage', value)
    persistedData.defaultPrizeMessage = value
    saveData()
  })
}
const bindGiveawayGapRange = async () => {
  document.querySelector('.giveaway-gap').addEventListener('input', async () => {
    document.querySelector('.giveaway-gap-text').textContent = document.querySelector('.giveaway-gap').value
  })
  document.querySelector('.giveaway-gap').addEventListener('change', async () => {
    const val = parseInt(document.querySelector('.giveaway-gap').value)
    // console.log('CHANGE giveaway-gap', val)
    document.querySelector('.giveaway-gap-text').textContent = val
    persistedData.giveawayGap = val
    saveData()
    validatePrizes(persistedData.prizes)
  })
}
const bindChannelSelect = async () => {
  document.querySelector('.channel').addEventListener('change', async () => {
    const ele = document.querySelector('.channel')
    // const id = ele.value
    // const name = getSelectedOptionText(ele)
    // console.log('channel', id, name)
    persistedData.channel = {
      id: ele.value,
      name: getSelectedOptionText(ele)
    }
    saveData()
  })
}
const bindGuildSelect = async () => {
  document.querySelector('.guild').addEventListener('change', async () => {
    const guildEle = document.querySelector('.guild')
    // const guildId = guildEle.value
    // const guildName = getSelectedOptionText(guildEle)
    // console.log('guild', guildId, guildName)
    persistedData.guild = {
      id: guildEle.value,
      name: getSelectedOptionText(guildEle)
    }
    saveData()
    await getAndUpdateChannels()
    await getAndUpdateMembers()
    await renderBlackList()
  })
}

const bindResultSortButton = async () => {
  const resultOrderFunctions = [
    {
      name: 'Giveaway',
      id: 'giveaway',
      fn: giveawayOrderResultSortOrder
    },
    {
      name: 'User',
      id: 'user',
      fn: userResultSortOrder
    }
  ]

  let currentSortOrder = 0
  const resultOrderSpan = document.querySelector('#sort-order')
  document.querySelector('#result-sort-order').addEventListener('click', async () => {
    console.log('Hello from resultOrder onClick! Old sort order:', currentSortOrder)
    currentSortOrder = ++currentSortOrder % resultOrderFunctions.length

    resultOrderFn = resultOrderFunctions[currentSortOrder].fn
    resultOrderSpan.textContent = resultOrderFunctions[currentSortOrder].name
    resultOrderSpan.setAttribute('data-order', resultOrderFunctions[currentSortOrder].id)
    await renderResult()
  })
}

const saveResult = () => {
  window.localStorage.setItem('givemeisk-result', JSON.stringify(persistedResult))
}
const loadResult = () => {
  let d = window.localStorage.getItem('givemeisk-result')
  d = d ? JSON.parse(d) : []
  return d
}
const saveData = () => {
  window.localStorage.setItem('givemeisk', JSON.stringify(persistedData))
}
const loadData = () => {
  let d = window.localStorage.getItem('givemeisk')
  d = d
    ? JSON.parse(d)
    : {
        giveawayGap: 30,
        defaultPrizeMessage: 'Woohoo! @user just won something shiny! @prize',
        tab: 'instructions',
        countdown: 'Ready...\nSteady...\nGo...',
        countafter: 'All good things come to an end\nGoodnight one and all',
        prizes: ''
      }
  return d
}
const updateStateFromData = () => {
  const d = persistedData
  if (d.discordKey) document.querySelector('.discord-key').value = d.discordKey
  if (d.guild) document.querySelector('.guild').innerHTML = `<option value="${d.guild.id}" selected>${d.guild.name}</option>`
  if (d.channel) document.querySelector('.channel').innerHTML = `<option value="${d.channel.id}" selected>${d.channel.name}</option>`
  if (d.blacklist) renderBlackListPersisted()
  if (d.giveawayGap) {
    document.querySelector('.giveaway-gap').value = d.giveawayGap
    document.querySelector('.giveaway-gap-text').textContent = d.giveawayGap
  }
  if (d.defaultPrizeMessage) document.querySelector('.default-prize-message').value = d.defaultPrizeMessage
  if (d.tab) setTimeout(() => { document.querySelector(`.nav-link[data-tab="${d.tab}"]`).click() }, 10) // Not sure why this didn't init properly
  if (d.countdown) {
    document.querySelector('.countdown').value = d.countdown
    validateCountdown(d.countdown)
  }
  if (d.countafter) {
    document.querySelector('.countafter').value = d.countafter
    validateCountafter(d.countafter)
  }
  if (d.prizes) {
    document.querySelector('.prizes').value = d.prizes
    validatePrizes(d.prizes)
  }
  if (d.giveawayId) document.querySelector('.giveaway-admin-link').setAttribute('href', `/admin?id=${d.giveawayId}`)

  if (persistedResult.length > 0) {
    document.querySelector('.nav-link[data-tab="results"]').removeAttribute('disabled')
    setTimeout(() => { document.querySelector('.nav-link[data-tab="results"]').click() }, 10)
    document.querySelector('.nav-tab')
    renderResult()
  }
}
const stretchDiv = () => {
  const navbarHeight = document.querySelector('.navbar').offsetHeight
  // const titleHeight = document.querySelector('.title').offsetHeight
  const navtabHeight = document.querySelector('.nav-tabs').offsetHeight
  const { marginTop, marginBottom } = window.getComputedStyle(document.querySelector('.my-3'))
  const windowHeight = window.innerHeight
  // console.log('existingContentHeight', navbarHeight, titleHeight, parseInt(marginTop), parseInt(marginBottom))
  const adjustedHeight = windowHeight - navbarHeight - parseInt(marginTop) - parseInt(marginBottom) - navtabHeight - 10 + 'px'
  document.querySelector('.stretch').style.height = adjustedHeight
}
const bindBlackToWhite = () => {
  document.querySelector('.black-to-white').addEventListener('change', function () {
    if (this.checked) {
      document.querySelector('.blacklist-dropdown .dropdown-toggle').textContent = 'Select members to whitelist'
    } else {
      document.querySelector('.blacklist-dropdown .dropdown-toggle').textContent = 'Select members to blacklist'
    }
  })
}
const init = async () => {
  console.log('init', persistedData, persistedResult)
  window.addEventListener('resize', () => stretchDiv())
  stretchDiv()
  bindDiscordKeySelect()
  bindGuildSelect()
  bindChannelSelect()

  bindGiveawayGapRange()
  bindDefaultPrizeMessage()
  bindNavTabs()
  bindCountdown()
  bindCountafter()
  bindPrizes()
  bindClearResults()
  bindRestartButton()
  bindResultSortButton()
  bindBlackToWhite()
}
const persistedData = loadData()
let persistedResult = loadResult()
updateStateFromData()
init()

let data
let grid

const displayInvalid = () => {
  document.querySelector('.content').innerHTML =
      `<div class="d-flex justify-content-center align-items-center min-vh-100">
          <h3 class="text-center">Invalid link, please ask in discord</h3>
      </div>`
}
const displayError = () => {
  document.querySelector('.content').innerHTML =
      `<div class="d-flex justify-content-center align-items-center min-vh-100">
          <h3 class="text-center">Something went wrong, please ask in discord</h3>
      </div>`
}

const displayClaims = (giveawayId, claims, giveawayIdsToRemove, giveawayIdsToUse) => {
  console.log('giveawayIdsToRemove, giveawayIdsToUse', giveawayIdsToRemove.length, giveawayIdsToUse.length, giveawayIdsToUse.length === 0)

  const result = {}

  if (giveawayIdsToUse.length > 0) {
    claims = claims.filter(c => giveawayIdsToUse.includes(c.giveawayId))
    console.log('FILTERING BY giveawayIdsToUse', giveawayIdsToUse, claims.length)
  } else if (giveawayIdsToRemove.length > 0) {
    claims = claims.filter(c => !giveawayIdsToRemove.includes(c.giveawayId))
    console.log('FILTERING BY giveawayIdsToRemove', giveawayIdsToRemove, claims.length)
  } else {
    console.log('NO FILTER', claims.length)
  }

  claims.forEach(claim => {
    const { discordId, ...attributes } = claim
    if (!result[discordId]) {
      result[discordId] = {}
    }
    Object.entries(attributes).forEach(([key, value]) => {
      if (!result[discordId][key]) {
        result[discordId][key] = []
      }
      result[discordId][key].push(value)
    })
  })
  data = Object.keys(result).map((c, i) => {
    return [
      i,
      result[c].itemId.join(', '),
      result[c].giveawayId.join(', '),
      result[c].discordName[0],
      result[c].eveName[0] ? result[c].eveName[0] : '',
      result[c].prize.join(', '),
      result[c].contractSent.join(', '),
      null
    ]
  })

  const giveawayCounts = {}

  claims.forEach(item => {
    const giveawayId = item.giveawayId
    giveawayCounts[giveawayId] = (giveawayCounts[giveawayId] || 0) + 1
  })
  const giveawayCountsList = Object.keys(giveawayCounts).map(k => { return { giveawayId: k, count: giveawayCounts[k] } })
  console.log('data', data)
  console.log('result', result)
  console.log('claims', claims)
  console.log('giveawayCountsList', giveawayCountsList)

  let html = ''
  html += `
    <div class="container-fluid">
        <div class="row my-3">
            <div class="col">
                <h3>All Giveaways</h3>
                <p>To use:</p>
                <ul>
                  <li>Add a parameter of <code>password</code> in the url: eg <code>/super-admin?password=abc123</code>. It will show you all giveaways by default</li>
                  <li>To just select giveaways add a comma separated parameter of <code>only</code> in the url (for each giveaway id):
                    eg <code>/super-admin?password=abc123&only=ExV7mrYjXX,EylkT0WOXX</code></li>
                    <li>To use all, but ignore some add a comma separated parameter of <code>ignore</code> in the url (for each giveaway id):
                    eg <code>/super-admin?password=abc123&ignore=ExV7mrYjXX,EylkT0WOXX</code></li>
                  <li>If you have <code>only</code> it will not ignore any <code>ignore</code>'s if they are present in the url</li>
                </ul>
                ${giveawayIdsToUse.length > 0
                  ? `<p class="lead">Only showing giveaways: ${giveawayIdsToUse.map(g => `<code>${g}</code>`).join('')}</p>`
                  : ''}
                ${(giveawayIdsToUse.length === 0 && giveawayIdsToRemove.length > 0)
                  ? `<p class="lead">NOT showing giveaways: ${giveawayIdsToRemove.map(g => `<code>${g}</code>`).join('')}</p>`
                  : ''}
                ${(giveawayIdsToUse.length === 0 && giveawayIdsToRemove.length === 0)
                  ? '<p class="lead">Showing ALL giveaways</p>'
                  : ''}
                  <p>Giveaways with counts: ${giveawayCountsList.map(g => `
<div class="btn btn-primary btn-sm position-relative mb-2 me-2">
  ${g.giveawayId}
  <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
  ${g.count}
    <span class="visually-hidden">unread messages</span>
  </span>
</div>
`).join('')}</p>
                <div class="table-holder"></div>
            </div>
        </div>
    </div>`
  document.querySelector('.content').innerHTML = html

  grid = new window.gridjs.Grid({
    columns: [
      { name: 'Index', hidden: true },
      {
        name: 'ItemID',
        hidden: true,
        formatter: (cell, row) => {
          return window.gridjs.html(`<p>${row.cells[1].data.split(', ').join('<br/>')}</p>`)
        }
      },
      {
        name: 'GiveawayId',
        width: '100px',
        hidden: false,
        formatter: (cell, row) => {
          return window.gridjs.html(`<p>${row.cells[2].data.split(', ').join('<br/>')}</p>`)
        }
      },
      {
        name: 'Discord',
        width: '200px',
        sort: true,
        formatter: (cell, row) => {
          let name = row.cells[3].data
          // ﷽﷽
          if (name.length > 30) {
            // console.log('long name', name)
            name.slice(0, 30)
            if (name.includes('﷽')) name.slice(0, 3)
            name = name + '... (shortened)'
          }
          return window.gridjs.html(`<p>${name}</p>`)
        }
      },
      {
        name: 'EVE',
        width: '100px',
        sort: true,
        formatter: (cell, row) => {
          let name = row.cells[4].data
          if (name.length > 30) {
            name.slice(0, 30)
            name = name + '... (shortened)'
          }
          return window.gridjs.html(`<p>${name}</p>`)
        }
      },
      {
        name: 'Prize',
        width: '400px',
        sort: true,
        formatter: (cell, row) => {
          const prizeSplit = row.cells[5].data.split(', ')
          const claimIdSplit = row.cells[1].data.split(', ')
          return window.gridjs.html(`<ol>${prizeSplit.map((p, i) => `<li><a href="/claims?id=${claimIdSplit[i]}" target="_blank">${p}</a></li>`).join('')}</ol>`)
        }
      },

      {
        name: 'Contract Sent',
        width: '50px',
        sort: true,
        formatter: (cell, row) => {
          const contractSentSplit = row.cells[6].data.split(', ').map(b => b === 'true')
          // console.log('contractSentSplit', contractSentSplit)
          return window.gridjs.html(`<ol>${contractSentSplit.map((p, i) => `<li>${p ? 'YES' : 'NO'}</li>`).join('')}</ol>`)
        }
      },
      {
        name: 'Actions',
        width: '50px',
        sort: true,
        // formatter: (cell, row) => {
        //   return window.gridjs.html('<p>tbc a</p>')
        // }
        formatter: (cell, row) => {
          const contractSent = row.cells[6].data
          const contractSentSplit = contractSent.split(', ').map(c => c === 'true')
          const allSent = !contractSentSplit.includes(false)
          // console.log('allSent', itemIds, itemIdsSplit, contractSent, contractSentSplit, allSent)
          const cssClass = allSent ? 'btn-outline-primary' : 'btn-primary'
          const actionName = allSent ? 'Mark all as NOT SENT' : 'Mark all as SENT'
          return window.gridjs.h('button', {
            className: `btn ${cssClass} w-100`,
            onClick: function () {
              // This is hacky...
              // data[row.cells[0].data][4] = data[row.cells[0].data][4] === 'YES' ? 'NO' : 'YES'
              const itemIdsSplit = row.cells[1].data.split(', ')
              const contractSent = row.cells[6].data
              const updatedContractSent = contractSent.split(', ').map(c => !allSent).join(', ')
              const i = row.cells[0].data
              data[i][6] = updatedContractSent
              console.log('row', row, cell, itemIdsSplit, contractSent, updatedContractSent, i, data[i])
              grid.updateConfig().forceRender()
              updateClaimsWithContractSent(itemIdsSplit, !allSent)
            }
          }, actionName)
        }

      }
    ],

    data,
    fixedHeader: false,
    search: true

  }).render(document.querySelector('.table-holder'))
}
const updateClaimsWithContractSent = async (claimIds, contractSent) => {
  console.log('updateClaimsWithContractSent', claimIds, contractSent)
  for (const claimId of claimIds) {
    console.log('updateClaimsWithContractSent ONE', claimId, contractSent)
    const updateReq = await fetch(`/claims/${claimId}`, { method: 'POST', body: JSON.stringify({ contractSent }) })
    const updateRes = await updateReq.json()
    console.log('updateRes', updateRes)
  }
  window.alert('OK, saved. Go ahead!')
}
const init = async () => {
  console.log('super-admin')
  try {
    const queryParams = new URLSearchParams(window.location.search)
    if (!queryParams.has('password')) {
      return displayInvalid()
    }
    const giveawayId = queryParams.get('password')
    const claimsReq = await fetch(`/giveaways/${giveawayId}`)
    const claimsRes = await claimsReq.json()
    console.log('claimsRes', claimsRes)

    let giveawayIdsToRemove = []
    if (queryParams.has('ignore')) {
      giveawayIdsToRemove = queryParams.get('ignore').split(',')
    }
    let giveawayIdsToUse = []
    if (queryParams.has('only')) {
      giveawayIdsToUse = queryParams.get('only').split(',')
    }
    console.log('giveawayIdsToRemove / use', giveawayIdsToRemove, giveawayIdsToUse)
    displayClaims(giveawayId, claimsRes, giveawayIdsToRemove, giveawayIdsToUse)
  } catch (error) {
    console.error(error)
    return displayError()
  }
}
init()

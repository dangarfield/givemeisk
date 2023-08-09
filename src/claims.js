import { createSSO } from 'eve-sso-pkce'

const ssoConfig = window.location.href.includes('localhost')
  ? {
      clientId: 'e9b55ffd8f4043fe80b74386cd873057',
      redirectUri: 'http://localhost:8888/claims'
    }
  : {
      clientId: '01d081838e48479f95e2d934b1e5cdb7',
      redirectUri: 'https://givemeisk.netlify.app/claims'
    }
// console.log('ssoConfig', ssoConfig)
const sso = createSSO(ssoConfig)

const displayInvalid = () => {
  console.log('displayInvalid')
  document.querySelector('.content').innerHTML = '<h3 class="text-center">Invalid link, please ask in discord</h3>'
}
const displayError = () => {
  console.log('displayError')
  document.querySelector('.content').innerHTML = '<h3 class="text-center">Something went wrong, please ask in discord</h3>'
}
const displaySSO = () => {
  console.log('displaySSO')
  document.querySelector('.content').innerHTML = '<h3 class="text-center">Fetching EVE character details</h3>'
}
const displayClaim = (claim) => {
  console.log('displayClaim', claim)
  document.querySelector('.content').innerHTML = `
<div class="card-group col-6 text-center">
    <div class="card">
        <div class="card-body">
            <p class="card-text py-2"><i class="bi bi-trophy h1"></i></p>
            <h5 class="card-title pb-2">${claim.prize}</h5>
            <p class="card-text">Woohoo! You won!</p>
            <p class="card-text">Make sure your EVE details are correct!</p>
        </div>
    </div>
    <div class="card">
        <div class="card-body">
            <p class="card-text py-2"><i class="bi bi-discord h1"></i></p>
            <h5 class="card-title pb-2">${claim.discordName}</h5>
            <p class="card-text">What kind of a name is that?!</p>
        </div>
    </div>
    
           
    ${claim.eveId
? ` <div class="card">
        <div class="card-body">
            <img class="img-fluid py-2" src="https://image.eveonline.com/Character/${claim.eveId}_64.jpg">
            <h5 class="card-title pb-2">${claim.eveName}</h5>
            <p class="card-text">o7 Not you? Log in below</p>
            <a href="" class="eve-login"><img class="img-fluid " src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-black-small.png" alt="EVE SSO Login Buttons Small Black"></a>
        </div>
    </div>`
: ` <div class="card text-bg-light">
        <div class="card-body text-danger ">
            <p class="card-text py-2"><i class="bi bi-rocket-takeoff h1"></i></p>
            <h5 class="card-title pb-2">o7</h5>
            <p class="card-text">We don't have your eve details. Login below so we can get the contract to you</p>
            <a href="" class="eve-login"><img class="img-fluid " src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-black-small.png" alt="EVE SSO Login Buttons Small Black"></a>
        </div>
    </div>`}
            
    ${claim.contractSent
? ` <div class="card">
        <div class="card-body text-success text-bg-light">
            <p class="card-text py-2"><i class="bi bi-box-seam h1"></i></p>
            <h5 class="card-title pb-2"><i class="bi bi-tick"></i>CONTRACT SENT</h5>
            <p class="card-text">Check your contracts, you should have something shiny!</p>
            <p class="card-text"><small class="text-body-secondary">Missing?!<br/>Ask us on discord</small></p>
        </div>
    </div>`
: ` <div class="card">
        <div class="card-body text-primary text-bg-light">
            <p class="card-text py-2"><i class="bi bi-box-seam h1"></i></p>
            <h5 class="card-title pb-2"><i class="bi bi-tick"></i>NOT YET SENT</h5>
            <p class="card-text">Be patient, it'll be on it's way soon, just give it some time and make sure your EVE details are correct</p>
        </div>
    </div>`}
            
        
</div>`

  document.querySelector('.eve-login').addEventListener('click', async (event) => {
    event.preventDefault()
    // clearData('codeVerifier')
    // clearData('token')
    // console.log('scopes', scopes)
    const ssoUri = await sso.getUri()
    console.log('ssoUri', ssoUri)
    // saveData('codeVerifier', ssoUri.codeVerifier)
    // console.log('ssoUri', scopes, ssoUri)
    window.localStorage.setItem('givemeisk-claim-code-verifier', ssoUri.codeVerifier)
    window.localStorage.setItem('givemeisk-claim-claim-id', claim.itemId)
    window.location.assign(ssoUri.uri)
  })
}

const init = async () => {
  try {
    const queryParams = new URLSearchParams(window.location.search)

    if (queryParams.has('code') && queryParams.has('state')) {
      displaySSO()
      const code = queryParams.get('code')
      const state = queryParams.get('state')
      const codeVerifier = window.localStorage.getItem('givemeisk-claim-code-verifier')
      const itemId = window.localStorage.getItem('givemeisk-claim-claim-id')
      window.localStorage.removeItem('givemeisk-claim-code-verifier')
      window.localStorage.removeItem('givemeisk-claim-claim-id')
      console.log('code', code, state, codeVerifier, itemId)
      const token = await sso.getAccessToken(code, codeVerifier)
      console.log('token', token)
      const eveId = parseInt(token.payload.sub.replace('CHARACTER:EVE:', ''))
      const eveName = token.payload.name
      console.log('Update claim', itemId, eveId, eveName)
      const claimUpdateReq = await fetch(`/claims/${itemId}`, { method: 'POST', body: JSON.stringify({ eveId, eveName }) })
      const claimUpdateRes = await claimUpdateReq.json()
      console.log('claimUpdateRes', claimUpdateRes)
      window.location.assign(`/claims?id=${itemId}`)
      return
    }

    if (!queryParams.has('id')) {
      return displayInvalid()
    }
    const itemId = queryParams.get('id')
    console.log('itemId', itemId)
    const req = await fetch(`/claims/${itemId}`)
    const res = await req.json()
    console.log('res', res)
    if (res.error || res.itemId === undefined) {
      return displayInvalid()
    }
    displayClaim(res)
  } catch (error) {
    console.error(error)
    return displayError()
  }
}
init()

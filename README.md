# Give Me ISK

> Discord Bot to create and run a giveaway on discord - Members and prizes are allocated automatically. No install required! Winners are PM'd with a link to claim their prize and associate their EVE Online accounts. An admin page exists for you to quickly see what contracts you have left to fulfil

![Give Me ISK](https://i.ibb.co/SrdQhS0/Screenshot-2023-08-09-at-06-49-26.png)


- Live url: https://givemeisk.netlify.app/
- Source code available: https://github.com/dangarfield/givemeisk

## Local dev
- Install Nodejs, Netlify CLI
- `npm i`
- `npm run dev`

## Setup Bot
- TODO - I will fill this out later, but basically you need a discord bot key with the permissions to view your guild, channel, members and post messages. Add this bot to your guild

## Giveaway Setup
- After your've put your discord key in, select your guild and channel
- All changes are saved to your browser automatically. No data is sent to anywhere except discord APIs
- Blacklist any members
- You can execute a DRY RUN without sending any messages to discord, it'll be quicker
- Conversely, if you don't see anything on discord, check for this!
- Add messages for before and after your giveaway with COUNTDOWN and COUNTAFTER
- Copy and paste your spreadsheet into the prizes column
- Once finished, you can view the results
- IMPORTANT: This runs in your browser, if you get disconnected, refresh the page and you can start from where you last sent messages
- Once finished, you can view the results. Members will be PMd with a link to associate their EVE and Discord accounts set to mark it as fulfilled
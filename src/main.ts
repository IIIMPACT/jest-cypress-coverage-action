/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-console */
const github = require('@actions/github')
const core = require('@actions/core')
// import {execSync} from 'child_process'
// import fs from 'fs'

async function main(): Promise<void> {
  try {
    //start
    // `who-to-greet` input defined in action metadata file
    console.log('core: ', core)
    console.log('github: ', github)
    const nameToGreet = core.getInput('who-to-greet')
    console.log(`Hello iwe ndiwe ani ko iwe nhai ${nameToGreet}!`)
    const time = new Date().toTimeString()
    core.setOutput('time', time)
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload yachinja here: ${payload}`)
  } catch (error) {
    core.setFailed(error.message)
  }
}
main()

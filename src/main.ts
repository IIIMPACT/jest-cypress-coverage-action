/* eslint-disable no-console */
import core from '@actions/core'
import github from '@actions/github'
// import {execSync} from 'child_process'
// import fs from 'fs'

async function main(): Promise<void> {
  try {
    //start
    // `who-to-greet` input defined in action metadata file
    console.log('core: ', core)
    const nameToGreet = core.getInput('who-to-greet')
    console.log(`Hello iwe ndiwe ani ko iwe ${nameToGreet}!`)
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

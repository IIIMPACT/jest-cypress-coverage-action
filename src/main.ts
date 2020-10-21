import core from '@actions/core'
import github from '@actions/github'
import {execSync} from 'child_process'
import fs from 'fs'

async function main(): Promise<void> {
  try {
    const repoName = github.context.repo.repo
    console.log('repoName: ', repoName);
    const repoOwner = github.context.repo.owner
    console.log('repoOwner: ', repoOwner);
    const githubToken = core.getInput('accessToken')
    console.log('githubToken: ', githubToken);
    // const fullCoverage = JSON.parse(core.getInput('fullCoverageDiff'))
    // const commandToRun = core.getInput('runCommand')
    const githubClient = github.getOctokit(githubToken)
    console.log('githubClient: ', githubClient);
    const prNumber = github.context.issue.number
    console.log('prNumber : ', prNumber );
    const branchNameBase = github.context.payload.pull_request?.base.ref
    console.log('branchNameBase: ', branchNameBase);
    const branchNameHead = github.context.payload.pull_request?.head.ref
    console.log('branchNameHead: ', branchNameHead);
    //start
    // `who-to-greet` input defined in action metadata file
    const nameToGreet = core.getInput('who-to-greet')
    console.log(`Hello ${nameToGreet}!`)
    const time = new Date().toTimeString()
    core.setOutput('time', time)
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`)
  } catch (error) {
    core.setFailed(error.message)
  }
}
main()

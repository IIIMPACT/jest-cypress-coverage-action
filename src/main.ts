/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-console */
const github = require('@actions/github')
const core = require('@actions/core')
const execSync = require('@actions/core').execSync
// import fs from 'fs'

async function main(): Promise<void> {
  try {
    const repoName = github.context.repo.repo
    console.log('repoName: ', repoName)
    const repoOwner = github.context.repo.owner
    console.log('repoOwner : ', repoOwner)
    // const githubToken = core.getInput('accessToken')
    // const fullCoverage = JSON.parse(core.getInput('fullCoverageDiff'))
    // const commandToRun = core.getInput('runCommand')
    // const githubClient = github.getOctokit(githubToken)
    // console.log('githubClient: ', githubClient);
    const prNumber = github.context.issue.number
    console.log('prNumber: ', prNumber)
    const branchNameBase = github.context.payload.pull_request?.base.ref
    console.log('branchNameBase: ', branchNameBase)
    const branchNameHead = github.context.payload.pull_request?.head.ref
    console.log('branchNameHead: ', branchNameHead)
    execSync('echo "it can run stuff"')
    // const codeCoverageNew = <CoverageReport>(
    //   JSON.parse(fs.readFileSync('coverage-summary.json').toString())
    // )
  } catch (error) {
    core.setFailed(error.message)
  }
}
main()

/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-console */
const github = require('@actions/github')
const core = require('@actions/core')
const execSync = require('child_process').execSync
// const fs = require('fs-extra')
const fs = require('fs')
const DiffChecker = require('./DiffChecker').DiffChecker
// import fs from 'fs'

// const parsePullRequestId = (githubRef?: string): string => {
//   const result = githubRef ? /refs\/pull\/(\d+)\/merge/g.exec(githubRef) : null
//   if (!result) throw new Error('Reference not found.')
//   const [, pullRequestId] = result
//   return pullRequestId
// }

async function main(): Promise<void> {
  try {
    // console.log('execSync: ', execSync)
    // console.log('typeof execSync.execSync: ', typeof execSync)
    const repoName = github.context.repo.repo
    // console.log('repoName: ', repoName)
    const repoOwner = github.context.repo.owner
    // console.log('repoOwner : ', repoOwner)
    const githubToken = core.getInput('accessToken', {required: true})
    // console.log('githubToken: ', githubToken)
    // const sha = core.getInput('sha')
    // console.log('sha: ', sha)
    const fullCoverage = JSON.parse(core.getInput('fullCoverageDiff'))
    // console.log('fullCoverage : ', fullCoverage)
    // const commandToRun = core.getInput('runCommand')
    // console.log('commandToRun: ', commandToRun)
    const githubClient = github.getOctokit(githubToken)
    // console.log('githubClient: ', githubClient)
    const prNumber = github.context.issue.number
    console.log('!!!prNumber: ', prNumber)
    const branchNameBase = github.context.payload.pull_request?.base.ref
    console.log('branchNameBase: ', branchNameBase)
    const branchNameHead = github.context.payload.pull_request?.head.ref
    console.log('branchNameHead: ', branchNameHead)

    /*const client = new GitHub(githubToken, {})
    const result = await client.repos.listPullRequestsAssociatedWithCommit({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      // eslint-disable-next-line @typescript-eslint/camelcase
      commit_sha: sha || github.context.sha
    })
    const pr = result.data.length > 0 && result.data[0]
    console.log('pr', (pr && pr.number) || '')
    console.log('number', (pr && pr.number) || '')
    console.log('title', (pr && pr.title) || '')
    console.log('body', (pr && pr.body) || '')*/
    // const {GITHUB_REF, GITHUB_EVENT_PATH} = process.env
    // console.log('GITHUB_EVENT_PATH: ', GITHUB_EVENT_PATH)
    // console.log('GITHUB_REF: ', GITHUB_REF)
    // const pullRequestId = parsePullRequestId(GITHUB_REF)
    // console.log('pullRequestId: ', pullRequestId)
    // console.log('github.context.payload: ', github.context.payload)
    execSync('git fetch')
    execSync('git stash')
    execSync(`git checkout --progress --force ${branchNameBase}`)
    execSync('npm run test-all')
    const jestCodeCoverageNew = JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )
    console.log('111 jestCodeCoverageNew: ', jestCodeCoverageNew)
    execSync('git fetch')
    execSync('git stash')
    execSync(`git checkout --progress --force ${branchNameBase}`)
    execSync('npm run test-all')
    const jestCodeCoverageOld = JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )
    console.log('111 jestCodeCoverageOld: ', jestCodeCoverageOld)
    const currentDirectory = execSync('pwd')
      .toString()
      .trim()
    console.log('111 currentDirectory: ', currentDirectory)
    const diffChecker = new DiffChecker(
      jestCodeCoverageNew,
      jestCodeCoverageOld
    )
    let messageToPost = `Code coverage diff between base branch:${branchNameBase} and head branch: ${branchNameHead} \n`
    // console.log('messageToPost: ', messageToPost)
    const coverageDetails = diffChecker.getCoverageDetails(
      !fullCoverage,
      `${currentDirectory}/`
    )
    if (coverageDetails.length === 0) {
      messageToPost =
        'No changes to code coverage between the base branch and the head branch'
    } else {
      messageToPost +=
        'File | % Stmts | % Branch | % Funcs | % Lines \n -----|---------|----------|---------|------ \n'
      messageToPost += coverageDetails.join('\n')
    }
    console.log('messageToPost Final: ', messageToPost)
    await githubClient.issues.createComment({
      repo: repoName,
      owner: repoOwner,
      body: messageToPost,
      issue_number: prNumber
    })
  } catch (error) {
    core.setFailed(error.message)
  }
}
main()

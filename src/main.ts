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
const ThresholdChecker = require('./ThresholdChecker').ThresholdChecker

// const {merge: mergeJestCypressCoverage} = require('./mergeJestCypressCoverage')
// import fs from 'fs'

const parsePullRequestId = (githubRef?: string): string => {
  const result = githubRef ? /refs\/pull\/(\d+)\/merge/g.exec(githubRef) : null
  if (!result) throw new Error('Reference not found.')
  const [, pullRequestId] = result
  return pullRequestId
}

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
// await execSync('git fetch')
// await execSync('git stash')
// await execSync(`git checkout --progress --force ${branchNameBase}`)

async function main(): Promise<void> {
  try {
    const repoName = github.context.repo.repo
    const repoOwner = github.context.repo.owner
    const githubToken = core.getInput('accessToken', {required: true})
    const githubClient = github.getOctokit(githubToken)
    const prNumber = github.context.issue.number
    const branchNameBase = github.context.payload.pull_request?.base.ref
    const branchNameHead = github.context.payload.pull_request?.head.ref
    // console.log('Checkpoint: 0. start', github.context.payload.pull_request)
    console.log('Checkpoint: 0. start')

    const {GITHUB_REF, GITHUB_EVENT_PATH} = process.env
    console.log('GITHUB_EVENT_PATH: ', GITHUB_EVENT_PATH)
    console.log('GITHUB_REF: ', GITHUB_REF)
    const pullRequestId = parsePullRequestId(GITHUB_REF)
    console.log('pullRequestId: ', pullRequestId)
    // await execSync(
    //   `git diff --name-only d4c163dcda5d018906af631f391ca5ee32a1015e 8a52c4c710aedd4b4eacdb31a43fa9915a6221f4`
    // )
    // process.exit()

    // 1. Get the full code coverage of new branch (jest and cypress merged)
    //    a. Execute tests
    await execSync('npm run test:all') // should include cypress here or add it as separate
    console.log('Checkpoint: 1. tests completed')

    //    b Merge coverages
    await execSync(
      `npm run merge  -- --report ./jest-coverage-full/coverage-final.json`
    )
    console.log('Checkpoint: 2. first merge completed')
    // const fullCodeCoverageNew = await JSON.parse(
    //   fs.readFileSync('coverage/coverage-final.json').toString()
    // )
    const fullCodeCoverageSummaryNew = await JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )

    // Diff coverage
    // 2. Get the full code coverage of changed files (jest and cypress merged)
    await execSync(`git fetch origin ${branchNameBase}:${branchNameBase}`)
    await execSync(`git fetch origin ${branchNameHead}:${branchNameHead}`)
    await execSync(
      `npm run merge  -- --report ./jest-coverage-full/coverage-final.json --changedSince=${branchNameBase}`
    )
    console.log('Checkpoint: 3. PR merge completed')

    // const prCodeCoverageNew = await JSON.parse(
    //   fs.readFileSync('coverage/coverage-final.json').toString()
    // )

    const prCodeCoverageSummaryNew = await JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )
    console.log('Checkpoint: 3b. PR merge completed', prCodeCoverageSummaryNew)

    //    a. Check thresholds
    const thresholdChecker = new ThresholdChecker(prCodeCoverageSummaryNew, {})

    //    a. Post message
    const currentDirectory = await execSync('pwd')
      .toString()
      .trim()
    let thresholdMessageToPost = `Code coverage for changed files in ${branchNameHead} \n`
    const thresholdCoverageDetails = thresholdChecker.getCoverageDetails(
      `${currentDirectory}/`
    )

    //Check if passed
    let passed = true
    const {
      total: {
        branches: {pct: pctBranches},
        lines: {pct: pctLines},
        statements: {pct: pctStatements},
        functions: {pct: pctFunctions}
      }
    } = prCodeCoverageSummaryNew
    if (pctBranches < 70) {
      passed = false
    } else if (pctLines < 70) {
      passed = false
    } else if (pctStatements < 70) {
      passed = false
    } else if (pctFunctions < 70) {
      passed = false
    }

    console.log('HAS PASSED: ', passed)
    if (thresholdCoverageDetails.length === 0) {
      thresholdMessageToPost =
        'No changes to code coverage between the base branch and the head branch'
    } else {
      thresholdMessageToPost +=
        'File | % Stmts | % Branch | % Funcs | % Lines \n -----|---------|----------|---------|------ \n'
      thresholdMessageToPost += thresholdCoverageDetails.join('\n')
    }
    console.log('posting threshold message: ', thresholdMessageToPost)
    await githubClient.issues.createComment({
      repo: repoName,
      owner: repoOwner,
      body: thresholdMessageToPost,
      issue_number: prNumber
    })
    console.log('Checkpoint: 4. Threshold message posted')

    // Get development branch coverage
    //    a. checkout dev branch 2. get coverage diff and display
    await execSync('git fetch')
    await execSync('git stash')
    await execSync(`git checkout --progress --force ${branchNameBase}`)
    console.log('Checkpoint: 5. development checkout competed')

    //    b. run tests
    await execSync('npm run test:all')
    console.log('Checkpoint: 6. development tests completed')

    //    c. merge jest/cypress
    await execSync(
      `npm run merge  -- --report ./jest-coverage-full/coverage-final.json`
    )
    console.log('Checkpoint: 7. development merge completed')
    // const fullCodeCoverageOld = await JSON.parse(
    //   fs.readFileSync('coverage/coverage-final.json').toString()
    // )
    const fullCodeCoverageSummaryOld = await JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )

    // console.log('Checkpoint: 7b. fullCodeCoverageNew', fullCodeCoverageNew.)
    //    d. get coverage diff
    const diffChecker = new DiffChecker(
      fullCodeCoverageSummaryNew,
      fullCodeCoverageSummaryOld
    )

    let messageToPost = `Code coverage diff between base branch:${branchNameBase} and head branch: ${branchNameHead} \n`
    const fullCoverage = true
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
    console.log('diff messageToPost Final: ', messageToPost)
    await githubClient.issues.createComment({
      repo: repoName,
      owner: repoOwner,
      body: messageToPost,
      issue_number: prNumber
    })
    console.log('Checkpoint: 8. diff message posted')
  } catch (error) {
    core.setFailed(error.message)
  }
}
main()

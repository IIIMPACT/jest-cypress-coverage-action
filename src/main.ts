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

async function main(): Promise<void> {
  try {
    const repoName = github.context.repo.repo
    const repoOwner = github.context.repo.owner
    const githubToken = core.getInput('accessToken', {required: true})
    const prCoverageThreshold = JSON.parse(
      core.getInput('prCoverageThreshold', {
        required: true
      })
    )
    console.log('prCoverageThreshold: ', prCoverageThreshold)
    console.log('prCoverageThreshold type: ', typeof prCoverageThreshold)
    const fullCoverageDiff = core.getInput('fullCoverageDiff', {
      required: true
    })
    console.log('fullCoverageDiff: ', fullCoverageDiff)
    console.log('fullCoverageDiff type: ', typeof fullCoverageDiff)
    const githubClient = github.getOctokit(githubToken)
    const prNumber = github.context.issue.number
    const branchNameBase = github.context.payload.pull_request?.base.ref
    const branchNameHead = github.context.payload.pull_request?.head.ref
    console.log('Checkpoint: 0. start')

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

    const prCodeCoverageSummaryNew = await JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )
    console.log('Checkpoint: 3b. PR merge completed', prCodeCoverageSummaryNew)

    //    a. Check thresholds
    const thresholdChecker = new ThresholdChecker(
      prCodeCoverageSummaryNew,
      prCoverageThreshold.global
    )

    //    a. Post message
    const currentDirectory = await execSync('pwd')
      .toString()
      .trim()
    let thresholdMessageToPost = `## Code coverage \n### Code coverage for changed files in ${branchNameHead} \n`
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
    if (pctBranches < prCoverageThreshold.global.branches) {
      passed = false
    } else if (pctLines < prCoverageThreshold.global.lines) {
      passed = false
    } else if (pctStatements < prCoverageThreshold.global.statements) {
      passed = false
    } else if (pctFunctions < prCoverageThreshold.global.functions) {
      passed = false
    }

    console.log('HAS PASSED: ', passed)
    if (thresholdCoverageDetails.length === 0) {
      thresholdMessageToPost +=
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
    const fullCodeCoverageSummaryOld = await JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )

    // console.log('Checkpoint: 7b. fullCodeCoverageNew', fullCodeCoverageNew.)
    //    d. get coverage diff
    const diffChecker = new DiffChecker(
      fullCodeCoverageSummaryNew,
      fullCodeCoverageSummaryOld
    )

    let messageToPost = `## Coverage diff \n### Code coverage diff between base branch:${branchNameBase} and head branch: ${branchNameHead} \n`
    const coverageDetails = diffChecker.getCoverageDetails(
      !fullCoverageDiff,
      `${currentDirectory}/`
    )
    if (coverageDetails.length === 0) {
      messageToPost +=
        'No changes to code coverage between the base branch and the head branch'
    } else {
      messageToPost +=
        'File | % Stmts | % Branch | % Funcs | % Lines \n -----|---------|----------|---------|------ \n'
      messageToPost += coverageDetails.join('\n')
    }
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

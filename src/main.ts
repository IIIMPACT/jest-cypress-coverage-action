/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-console */
const github = require('@actions/github')
const core = require('@actions/core')
const execSync = require('child_process').execSync
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
    const fullCoverageDiff =
      core.getInput('fullCoverageDiff', {
        required: true
      }) === 'true'
    const githubClient = github.getOctokit(githubToken)
    const prNumber = github.context.issue.number
    const branchNameBase = github.context.payload.pull_request?.base.ref
    const branchNameHead = github.context.payload.pull_request?.head.ref

    let cypressError = null
    let cypressReport = ''

    // 1. Get the full code coverage of new branch (jest and cypress merged)
    //    a. Execute tests
    await execSync('npm run test:all') // should include cypress here or add it as separate
    try {
      await execSync('npm run test:cypress:staging') // should include cypress here or add it as separate
    } catch (e) {
      console.log('v2:Cypress failed', e)
      cypressError = e
    }

    try {
      if (fs.existsSync('./.nyc_output/out.json')) {
        cypressReport = '--report ./.nyc_output/out.json'
        console.log('v2:FILE: We have the file1!!!')
        console.log(
          'v2:cypress coverage>>>',
          await JSON.parse(
            fs.readFileSync('coverage/coverage-summary.json').toString()
          )
        )
      } else {
        cypressReport = ''
        console.log('v2:FILE: We have no file else1!!!')
      }
    } catch (err) {
      console.log('v2:Cypress report unavailable', err)
      cypressReport = ''
      console.log('v2:FILE: We have no file1!!!')
    }

    //    b Merge coverages
    await execSync(
      `npm run merge  -- --report ./coverage-jest/coverage-final.json ${cypressReport}`
    )
    const fullCodeCoverageSummaryNew = await JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )

    // Diff coverage
    // 2. Get the full code coverage of changed files (jest and cypress merged)
    await execSync(`git fetch origin ${branchNameBase}:${branchNameBase}`)
    await execSync(`git fetch origin ${branchNameHead}:${branchNameHead}`)
    await execSync(
      `npm run merge  -- --report ./coverage-jest/coverage-final.json  ${cypressReport} --changedSince=${branchNameBase}`
    )

    const prCodeCoverageSummaryNew = await JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )

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
    if (thresholdCoverageDetails.length === 0) {
      thresholdMessageToPost +=
        'No changes to code coverage between the base branch and the head branch'
    } else {
      thresholdMessageToPost +=
        'File | % Stmts | % Branch | % Funcs | % Lines \n -----|---------|----------|---------|------ \n'
      thresholdMessageToPost += thresholdCoverageDetails.join('\n')
      thresholdMessageToPost += '\n'
    }

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
    console.log(
      'v2:prCodeCoverageSummaryNew!!!!!!!!!!!',
      prCodeCoverageSummaryNew
    )
    if (pctBranches < prCoverageThreshold.global.branches) {
      passed = false
      console.log(`v2:
        Branches: ${pctBranches}:${
        prCoverageThreshold.global.branches
      } (${pctBranches <
        prCoverageThreshold.global.branches}) passed:${passed}`)
      thresholdMessageToPost += `- Branches coverage of ${pctBranches} does not meet required coverage of ${prCoverageThreshold.global.branches}`
    } else if (pctLines < prCoverageThreshold.global.lines) {
      passed = false
      console.log(`v2:
        Lines: ${pctLines}:${prCoverageThreshold.global.lines} (${pctLines <
        prCoverageThreshold.global.lines}) passed:${passed}`)
      thresholdMessageToPost += `- Lines coverage of ${pctLines} does not meet required coverage of ${prCoverageThreshold.global.lines}`
    } else if (pctStatements < prCoverageThreshold.global.statements) {
      passed = false
      console.log(`v2:
        Statements: ${pctStatements}:${
        prCoverageThreshold.global.statements
      } (${pctStatements <
        prCoverageThreshold.global.statements}) passed:${passed}`)
      thresholdMessageToPost += `- Statements coverage of ${pctStatements} does not meet required coverage of ${prCoverageThreshold.global.statements}`
    } else if (pctFunctions < prCoverageThreshold.global.functions) {
      console.log(`v2:
        Functions: ${pctFunctions}:${
        prCoverageThreshold.global.functions
      } (${pctFunctions <
        prCoverageThreshold.global.functions}) passed:${passed}`)
      thresholdMessageToPost += `- Functions coverage of ${pctFunctions} does not meet required coverage of ${prCoverageThreshold.global.functions}`
      passed = false
    }
    if (cypressError) {
      thresholdMessageToPost += `#### Cypress exited with an error: ${cypressError.message}!!!\n`
    }
    if (!cypressReport) {
      thresholdMessageToPost +=
        '#### No cypress report was found so no cypress coverage was included in this report!!!\n'
    }

    await githubClient.issues.createComment({
      repo: repoName,
      owner: repoOwner,
      body: thresholdMessageToPost,
      issue_number: prNumber
    })

    if (!passed) {
      throw new Error('PR does not meet code coverage threshold')
    }

    // Failing diff should not fail the PR
    try {
      cypressError = null
      cypressReport = ''
      // Get development branch coverage
      //    a. checkout dev branch 2. get coverage diff and display
      await execSync('git fetch')
      await execSync('git stash')
      await execSync(`git checkout --progress --force ${branchNameBase}`)

      //    b. run tests
      await execSync('npm run test:all')
      try {
        await execSync('npm run test:cypress:staging') // should include cypress here or add it as separate
      } catch (e) {
        console.log('v2:Cypress failed', e)
        cypressError = e
      }

      try {
        if (fs.existsSync('./.nyc_output/out.json')) {
          cypressReport = '--report ./.nyc_output/out.json'
          console.log('v2:FILE: We have the file2!!!')
        } else {
          cypressReport = ''
          console.log('v2:FILE: We have no file else2!!!')
        }
      } catch (err) {
        console.log('v2:Cypress report unavailable2', err)
        cypressReport = ''
        console.log('v2:FILE: We have no file2!!!')
      }

      //    c. merge jest/cypress
      await execSync(
        `npm run merge  -- --report ./coverage-jest/coverage-final.json ${cypressReport}`
      )
      const fullCodeCoverageSummaryOld = await JSON.parse(
        fs.readFileSync('coverage/coverage-summary.json').toString()
      )

      //    d. get coverage diff
      const diffChecker = new DiffChecker(
        fullCodeCoverageSummaryNew,
        fullCodeCoverageSummaryOld
      )

      let messageToPost = `## Coverage diff \n### Code coverage diff between base branch:${branchNameBase} and head branch: ${branchNameHead} \n`
      const coverageDetails = diffChecker.getCoverageDetails(
        fullCoverageDiff,
        `${currentDirectory}/`
      )
      if (coverageDetails.length === 0) {
        messageToPost +=
          'No changes to code coverage between the base branch and the head branch'
      } else {
        messageToPost +=
          'File | % Stmts | % Branch | % Funcs | % Lines \n -----|---------|----------|---------|------ \n'
        messageToPost += coverageDetails.join('\n')
        messageToPost += '\n'
      }
      if (cypressError) {
        thresholdMessageToPost += `#### Cypress exited with an error: ${cypressError.message}!!!\n`
      }
      if (!cypressReport) {
        messageToPost +=
          '#### No cypress report was found so no cypress coverage was included in this report!!!\n'
      }
      await githubClient.issues.createComment({
        repo: repoName,
        owner: repoOwner,
        body: messageToPost,
        issue_number: prNumber
      })
    } catch (error) {
      console.log('v2:Error with diff', error)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}
main()

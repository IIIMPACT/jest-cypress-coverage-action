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
// const {merge: mergeJestCypressCoverage} = require('./mergeJestCypressCoverage')
// import fs from 'fs'

// const parsePullRequestId = (githubRef?: string): string => {
//   const result = githubRef ? /refs\/pull\/(\d+)\/merge/g.exec(githubRef) : null
//   if (!result) throw new Error('Reference not found.')
//   const [, pullRequestId] = result
//   return pullRequestId
// }

async function main(): Promise<void> {
  try {
    // const sha = core.getInput('sha')
    // const fullCoverage = JSON.parse(core.getInput('fullCoverageDiff'))
    // const commandToRun = core.getInput('runCommand')
    // console.log('sha: ', sha)
    // console.log('fullCoverage : ', fullCoverage)
    // console.log('commandToRun: ', commandToRun)
    const repoName = github.context.repo.repo
    const repoOwner = github.context.repo.owner
    const githubToken = core.getInput('accessToken', {required: true})
    const githubClient = github.getOctokit(githubToken)
    const prNumber = github.context.issue.number
    const branchNameBase = github.context.payload.pull_request?.base.ref
    const branchNameHead = github.context.payload.pull_request?.head.ref
    console.log('repoName: ', repoName)
    console.log('repoOwner : ', repoOwner)
    console.log('prNumber: ', prNumber)
    console.log('branchNameBase: ', branchNameBase)
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
    // await execSync('git fetch')
    // await execSync('git stash')
    // await execSync(`git checkout --progress --force ${branchNameBase}`)
    const lis = await execSync(
      `git diff --name-only origin/${branchNameBase} origin/${branchNameBase}`
    )
    console.log('lis', lis)

    // Full coverage
    // 1 Get full code coverage current
    await execSync('npm run test:cypress:staging & npm run test:all') // should include cypress here or add it as separate
    // const jestFullCodeCoverageNew = await JSON.parse(
    //   fs.readFileSync('jest-coverage-full/coverage-final.json').toString()
    // )
    // console.log('jestFullCodeCoverageNew:', jestFullCodeCoverageNew)
    const jestFullCodeCoverageSummaryNew = await JSON.parse(
      fs.readFileSync('jest-coverage-full/coverage-summary.json').toString()
    )
    console.log(
      'jestFullCodeCoverageSummaryNew:',
      jestFullCodeCoverageSummaryNew
    )
    const cypressCodeCoverageNew = await JSON.parse(
      fs.readFileSync('./.nyc_output/out.json').toString()
    )
    console.log('cypressCodeCoverageNew:', cypressCodeCoverageNew)

    // 1.b Merge coverages
    await execSync(
      `npm run merge  -- --report ./jest-coverage-full/coverage-final.json --report ./.nyc_output/out.json`
    )
    // const jestFullCodeCoverageNew1 = await JSON.parse(
    //   fs.readFileSync('coverage/coverage-final.json').toString()
    // )
    // console.log('jestFullCodeCoverageNew1:', jestFullCodeCoverageNew1)
    const jestFullCodeCoverageSummaryNew1 = await JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )
    console.log(
      'jestFullCodeCoverageSummaryNew1:',
      jestFullCodeCoverageSummaryNew1
    )

    // Diff coverage
    // 2. get coverage on changed files of PR pull request and test this against threshold
    await execSync(
      `npm run merge  -- --report ./jest-coverage-full/coverage-final.json --report ./.nyc_output/out.json --changedSince=${branchNameBase}`
    )
    // const jestFullCodeCoverageNew2 = await JSON.parse(
    //   fs.readFileSync('coverage/coverage-final.json').toString()
    // )
    // console.log('jestFullCodeCoverageNew2:', jestFullCodeCoverageNew2)
    const jestFullCodeCoverageSummaryNew2 = await JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )
    console.log(
      'jestFullCodeCoverageSummaryNew2:',
      jestFullCodeCoverageSummaryNew2
    )

    // 3 Checkout dev
    // 2. get coverage diff and display
    await execSync('git fetch')
    await execSync('git stash')
    await execSync(`git checkout --progress --force ${branchNameBase}`)
    await execSync('npm run test:cypress:staging & npm run test:all')
    // const jestFullCodeCoverageOld = await JSON.parse(
    //   fs.readFileSync('jest-coverage-full/coverage-final.json').toString()
    // )
    // console.log('jestFullCodeCoverageOld: ', jestFullCodeCoverageOld)
    const jestFullCodeCoverageSummaryOld = await JSON.parse(
      fs.readFileSync('jest-coverage-full/coverage-summary.json').toString()
    )
    console.log('jestFullCodeCoverageOld: ', jestFullCodeCoverageSummaryOld)

    // 2. get coverage on changed files of PR pull request and test this against threshold
    await execSync(
      `npm run merge  -- --report ./jest-coverage-full/coverage-final.json --report ./.nyc_output/out.json`
    )
    // const jestFullCodeCoverageOld1 = await JSON.parse(
    //   fs.readFileSync('coverage/coverage-final.json').toString()
    // )
    // console.log('jestFullCodeCoverageOld1:', jestFullCodeCoverageOld1)
    const jestFullCodeCoverageSummaryOld1 = await JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )
    console.log(
      'jestFullCodeCoverageSummaryOld1:',
      jestFullCodeCoverageSummaryOld1
    )

    const currentDirectory = await execSync('pwd')
      .toString()
      .trim()
    const diffChecker = new DiffChecker(
      // jestFullCodeCoverageNew1,
      // jestFullCodeCoverageOld1
      jestFullCodeCoverageSummaryNew1,
      jestFullCodeCoverageSummaryOld1
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

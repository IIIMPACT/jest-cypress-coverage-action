// /* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-console */
// const github = require('@actions/github')
const core = require('@actions/core')
const actionsExec = require('@actions/exec')
const execSync = require('child_process').execSync
// const fs = require('fs-extra')
const fs = require('fs')
const fs1 = require('fs-extra')

// const createCoverageMap = require('istanbul-lib-coverage').createCoverageMap
const {createReporter} = require('istanbul-api')

const {exec} = require('child_process')

// const DiffChecker = require('./DiffChecker').DiffChecker
// import fs from 'fs'

// const parsePullRequestId = (githubRef?: string): string => {
//   const result = githubRef ? /refs\/pull\/(\d+)\/merge/g.exec(githubRef) : null
//   if (!result) throw new Error('Reference not found.')
//   const [, pullRequestId] = result
//   return pullRequestId
// }

type FileNamesMap = {[key: string]: boolean} | null

const result = async (command: string): Promise<string | Buffer> => {
  return new Promise((resolve, reject) => {
    exec(
      command,
      (err: Error, stdout: string | Buffer, stderr: string | Buffer) => {
        if (err !== null) {
          reject(err)
          return
        }
        if (typeof stderr !== 'string') {
          reject(stderr)
          return
        }
        resolve(stdout)
      }
    )
  })
}

async function mergeJestCypressCoverage(
  reportFiles: string[],
  reporters: string[] = ['json', 'html'],
  baseRef?: string
): Promise<void> {
  console.log('changedSince', baseRef)

  // const map = createCoverageMap({})

  // let fileNamesMap: FileNamesMap = {}
  let fileNamesMap: FileNamesMap = null

  if (baseRef) {
    const headRef =
      process.env.GITHUB_HEAD_REF || (await result('git branch --show-current'))

    const fileNamesStr = await result(
      `git diff --name-only ${baseRef} origin/${headRef}`
    )

    fileNamesMap = (fileNamesStr as string).split('\n').reduce(
      (acc, fileName) => ({
        ...acc,
        [`${process.cwd()}/${fileName}`]: true
      }),
      {}
    )
  }

  for (const file of reportFiles) {
    const r = fs1.readJsonSync(file)
    Object.entries<{data: any}>(r).reduce(
      // const o = Object.entries<{data: any}>(r).reduce(
      (acc: {[key: string]: any}, [key, value]) => {
        let output = value
        if (value.data) {
          output = value.data
        }
        if (!fileNamesMap || fileNamesMap[key]) {
          acc[key] = output
        }
        return acc
      },
      {}
    )
    // map.merge(o)
  }

  const reporter = createReporter()
  reporter.addAll(reporters)
  // reporter.write(map)
}

async function main(): Promise<void> {
  try {
    // console.log('execSync: ', execSync)
    // console.log('typeof execSync.execSync: ', typeof execSync)
    // const repoName = github.context.repo.repo
    // console.log('repoName: ', repoName)
    // const repoOwner = github.context.repo.owner
    // console.log('repoOwner : ', repoOwner)
    // const githubToken = core.getInput('accessToken', {required: true})
    // console.log('githubToken: ', githubToken)
    // const sha = core.getInput('sha')
    // console.log('sha: ', sha)
    // const fullCoverage = JSON.parse(core.getInput('fullCoverageDiff'))
    // console.log('fullCoverage : ', fullCoverage)
    // const commandToRun = core.getInput('runCommand')
    // console.log('commandToRun: ', commandToRun)
    // const githubClient = github.getOctokit(githubToken)
    // console.log('githubClient: ', githubClient)
    // const prNumber = github.context.issue.number
    // console.log('!!! prNumber: ', prNumber)
    // const branchNameBase = github.context.payload.pull_request?.base.ref
    // console.log('branchNameBase: ', branchNameBase)
    // const branchNameHead = github.context.payload.pull_request?.head.ref
    // console.log('branchNameHead: ', branchNameHead)

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
    await execSync('npm run test:all')
    await actionsExec('echo', 'right here')
    const jestFullCodeCoverageSummaryNew = await JSON.parse(
      fs.readFileSync('jest-coverage-full/coverage-summary.json').toString()
    )
    console.log(
      'jestFullCodeCoverageSummaryNew:',
      jestFullCodeCoverageSummaryNew
    )

    //write jestFullCodeCoverageSummaryNew to fs
    await mergeJestCypressCoverage(['jest-coverage-full/coverage-summary.json'])
    const jestFullCodeCoverageSummaryNew1 = await JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )
    console.log(
      'jestFullCodeCoverageSummaryNew1:',
      jestFullCodeCoverageSummaryNew1
    )
    /*console.log('111 jestCodeCoverageNew: ', jestCodeCoverageNew)
    await execSync('git fetch')
    await execSync('git stash')
    await execSync(`git checkout --progress --force ${branchNameBase}`)
    await execSync('npm run test:pr')
    const jestCodeCoverageOld = await JSON.parse(
      fs.readFileSync('coverage/coverage-summary.json').toString()
    )
    console.log('111 jestCodeCoverageOld: ', jestCodeCoverageOld)
    const currentDirectory = await execSync('pwd')
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
    })*/
  } catch (error) {
    core.setFailed(error.message)
  }
}
main()

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-console */

/*

yarn tsn-script ./scripts/mergeCoverage.ts --report ./coverage0/coverage-final.json --report ./coverage1/coverage-final.json

*/

const fs1 = require('fs-extra')
const yargs = require('yargs')
const {createCoverageMap} = require('istanbul-lib-coverage')
const {createReporter} = require('istanbul-api')
const {exec} = require('child_process')

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

async function main(): Promise<void> {
  const {
    argv
  }: {
    argv: {
      reporters: string[]
      report: string[]
      changedSince: string
    }
  } = yargs.options({
    report: {
      type: 'array', // array of string
      desc: 'Path of json coverage report file',
      demandOption: true
    },
    reporters: {
      type: 'array',
      default: ['json', 'html']
    },
    changedSince: {
      type: 'string',
      desc: 'changedSince branch',
      default: null
    }
  })
  const {reporters, report: reportFiles, changedSince: baseRef} = argv
  await merge(reportFiles, reporters, baseRef)
}

async function merge(
  reportFiles: string[],
  reporters: string[] = ['json', 'html'],
  baseRef?: string
): Promise<void> {
  console.log('changedSince', baseRef)

  const map = createCoverageMap({})

  let fileNamesMap: FileNamesMap = {}

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
    const o = Object.entries<{data: any}>(r).reduce(
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
    map.merge(o)
  }

  const reporter = createReporter()
  reporter.addAll(reporters)
  reporter.write(map)
}

/*main().catch(err => {
  console.error(err)
  process.exit(1)
})*/
export {merge}
export default main

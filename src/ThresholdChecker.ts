/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
// import {CoverageReport} from './Model/CoverageReport'
// import {DiffCoverageReport} from './Model/DiffCoverageReport'
// import {CoverageData} from './Model/CoverageData'
// import {DiffFileCoverageData} from './Model/DiffFileCoverageData'

// import { FileCoverage } from "istanbul-lib-coverage"

export class ThresholdChecker {
  private coverageReport: any[] /*: DiffCoverageReport*/ = []
  private pass: boolean = true
  constructor(
    coverageReport: any /*CoverageReport*/,
    coverageThreshold: any /*CoverageReport*/
  ) {
    console.log('coverageReport: ', coverageReport)
    console.log('coverageThreshold: ', coverageThreshold)
    const reportKeys = Object.keys(coverageReport)
    console.log('reportKeys: ', reportKeys)
    const coverageReportObj: {[key: string]: any} = {}
    console.log('coverageReportObj: ', coverageReportObj)
    for (const key of reportKeys) {
      console.log('key: ', key)
      console.log('coverageReport[key]: ', coverageReport[key])
      coverageReportObj[key] = {
        branches: this.getPassFail(
          coverageReport[key].branches,
          coverageThreshold.branches
        ),
        statements: this.getPassFail(
          coverageReport[key].statements,
          coverageThreshold.statements
        ),
        lines: this.getPassFail(
          coverageReport[key].lines,
          coverageThreshold.lines
        ),
        functions: this.getPassFail(
          coverageReport[key].functions,
          coverageThreshold.functions
        )
      }
    }
    this.coverageReport = Object.entries(coverageReportObj)
      .sort(([a], [b]) => {
        if (a === 'all' || a < b) {
          return -1
        }
        if (a > b) {
          return 1
        }
        return 0
      })
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      .map(([key, value]) => ({key, ...value}))
  }

  getPassFail(
    coverage: any,
    threshold: number
  ): {pct: number | 'unknown'; pass: boolean} {
    let pct: number | 'unknown'
    try {
      pct = this.getPercentage(coverage)
    } catch (e) {
      this.pass = false
      return {
        pct: 'unknown',
        pass: false
      }
    }
    if (!(pct < threshold)) {
      return {
        pct,
        pass: true
      }
    }
    this.pass = false
    return {
      pct,
      pass: false
    }
  }

  getCoverageDetails(currentDirectory: string): string[] {
    const returnStrings: string[] = []
    for (const fileCoverage of this.coverageReport) {
      const {key, statements, branches, functions, lines} = fileCoverage
      returnStrings.push(
        `${key.replace(currentDirectory, '')} | ${statements.pct} | ${
          branches.pct
        } | ${functions.pct} | ${lines.pct}`
      )
    }
    return returnStrings
  }

  private getPercentage(coverageData: any /*CoverageData*/): number {
    console.log('here coverageData: ', coverageData)
    return coverageData.pct
  }
}

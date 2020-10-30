/* eslint-disable @typescript-eslint/no-explicit-any */

export class ThresholdChecker {
  private coverageReport: any[] = []
  constructor(coverageReport: any, coverageThreshold: any) {
    const reportKeys = Object.keys(coverageReport)
    const coverageReportObj: {[key: string]: any} = {}
    for (const key of reportKeys) {
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
        if (a === 'total' || a < b) {
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
        `${key.replace(currentDirectory, '')} | <span style="color:blue">${
          statements.pct
        }</span> | ${branches.pct} | ${functions.pct} | ${lines.pct}`
      )
    }
    return returnStrings
  }

  private getPercentage(coverageData: any): number {
    return coverageData.pct
  }
}

import type { DailyTrendDatum } from './types'

export type RollingDailyTrendDatum = DailyTrendDatum & {
  rollingAverage: number
}

export function withRollingAverage(
  rows: DailyTrendDatum[],
  windowSize = 7,
): RollingDailyTrendDatum[] {
  if (!Number.isInteger(windowSize) || windowSize < 1) {
    throw new RangeError('windowSize must be a positive integer')
  }

  return rows.map((row, index) => {
    const windowStart = Math.max(0, index - windowSize + 1)
    const window = rows.slice(windowStart, index + 1)
    const total = window.reduce((sum, item) => sum + item.count, 0)

    return {
      ...row,
      rollingAverage: Math.round(total / window.length),
    }
  })
}

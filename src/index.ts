import { readFileSync } from 'fs'
import { resolve } from 'path'
import moment from 'moment'

type VestEvent = {
    grantNumber: string
    vestPeriod: number
    vestDate: Date
    vestedQty: number
}

type Grant = {
    grantNumber: string
    grantDate: Date
    grantQty: number
    vestedQty: number
    unvestedQty: number
    vestEvents: VestEvent[]
}

const args = process.argv.slice(2)
const file = resolve(args[0])
const content = readFileSync(file, 'utf8')
const lines = content.split('\r\n')

const grants = lines.filter((line) => line.startsWith('Grant'))
const grantSchedule: Grant[] = grants
    .map((line) => line.split(','))
    .map((row) => ({
        grantNumber: row[12],
        grantDate: new Date(row[2]),
        grantQty: parseInt(row[4]),
        vestedQty: parseInt(row[6]),
        unvestedQty: parseInt(row[7]),
        vestEvents: [],
    }))

const vesting = lines.filter((line) => line.includes('Vest Schedule'))
const vestingSchedule: VestEvent[] = vesting
    .map((line) => line.split(','))
    .map((row) => ({
        grantNumber: row[11],
        vestPeriod: parseInt(row[18]),
        vestDate: new Date(row[19]),
        vestedQty: parseInt(row[25]),
    }))

const grantScheduleByGrantNumber = grantSchedule.map((grant) => ({
    ...grant,
    vestEvents: vestingSchedule.filter(
        (vest) => vest.grantNumber === grant.grantNumber
    ),
}))

const forecast: Grant[] = grantScheduleByGrantNumber.map((grant) => {
    const { vestEvents, grantQty, grantDate } = grant
    const periods = vestEvents.length
    const hasCliff = grantDate > new Date('2021-01-01')

    const calcQty = (period: number) =>
        hasCliff
            ? period === 0
                ? Math.round(grantQty / 4)
                : Math.round((grantQty - grantQty / 4) / (periods - 1))
            : Math.round(grantQty / periods)

    return {
        ...grant,
        vestEvents: vestEvents.map((vest, idx) => ({
            ...vest,
            vestedQty: vest.vestedQty === 0 ? calcQty(idx) : vest.vestedQty,
        })),
    }
})

// create a single array of all vest events ordered by vest date
const vestsByDate: VestEvent[] = forecast
    .reduce(
        (vests, grant) => [...vests, ...grant.vestEvents],
        [] as VestEvent[]
    )
    .sort((a, b) => a.vestDate.getTime() - b.vestDate.getTime())

const vestsTotalByDate = vestsByDate.reduce(
    (total, vest) => ({
        ...total,
        [vest.vestDate.toISOString().split('T')[0]]:
            (total[vest.vestDate.toISOString().split('T')[0]] || 0) +
            vest.vestedQty,
    }),
    {} as { [date: string]: number }
)

const vestsTotalByQuarter = Object.keys(vestsTotalByDate).reduce(
    (total, date) => {
        const quarterStr = `${moment(date).year()}-Q${moment(date).quarter()}`
        return {
            ...total,
            [quarterStr]: (total[quarterStr] || 0) + vestsTotalByDate[date],
        }
    },
    {} as { [quarter: string]: number }
)

console.dir(vestsTotalByQuarter, { depth: null })

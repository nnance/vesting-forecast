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

const forecast = grantScheduleByGrantNumber.map((grant) => {
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

console.dir(forecast, { depth: null })

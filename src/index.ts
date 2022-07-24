import { readFileSync } from 'fs'
import { resolve } from 'path'

const args = process.argv.slice(2)
const file = resolve(args[0])
const content = readFileSync(file, 'utf8')
const lines = content.split('\r\n')
const vesting = lines.filter((line) => line.includes('Vest Schedule'))
const cells = vesting.map((line) => line.split(','))
const vestingSchedule = cells.map((cell) =>
    cell.map((value) => {
        if (value.includes('/')) {
            return Date.parse(value)
        } else if (value.includes('-')) {
            return Date.parse(value)
        } else if (!isNaN(Number(value))) {
            return Number(value)
        } else {
            return value
        }
    })
)
console.log(vestingSchedule)

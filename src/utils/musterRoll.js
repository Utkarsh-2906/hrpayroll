import * as XLSX from 'xlsx'

const NAME_KEYS = ['employeename', 'employee name', 'name', 'empname', 'employee']
const PRESENT_KEYS = ['presentdays', 'present days', 'present', 'p']
const ABSENT_KEYS = ['absentdays', 'absent days', 'absent', 'a']
const JOIN_DATE_KEYS = ['joiningdate', 'joining date', 'dateofjoining', 'date of joining', 'doj']

function normalizeKey(key) {
  return String(key).trim().toLowerCase()
}

function findValue(row, candidateKeys) {
  const normalizedRow = {}
  for (const key of Object.keys(row)) {
    normalizedRow[normalizeKey(key)] = row[key]
  }
  for (const candidate of candidateKeys) {
    if (normalizedRow[candidate] !== undefined) return normalizedRow[candidate]
  }
  return undefined
}

/**
 * Parses a joining-date cell value. Accepts a real Excel date (when the
 * column is formatted as a date) or plain text in DD-MM-YYYY / DD/MM/YYYY.
 * Returns `undefined` for a blank cell and `null` for an unparsable value.
 */
function parseJoiningDateValue(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return undefined
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    // Excel/Sheets date serials can carry a stray sub-day time component
    // (e.g. 18:29:50 instead of midnight) from floating-point drift in how
    // the source file was produced. Truncating to either UTC or local
    // calendar fields directly can land on the wrong side of that day's
    // boundary, so round to the nearest UTC midnight first — that recovers
    // the calendar day Excel itself displays regardless of which side of
    // midnight the noise fell on, and independent of local timezone.
    const roundedTime = Math.round(raw.getTime() / 86400000) * 86400000
    const rounded = new Date(roundedTime)
    return new Date(rounded.getUTCFullYear(), rounded.getUTCMonth(), rounded.getUTCDate())
  }

  const match = String(raw)
    .trim()
    .match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (!match) return null

  const [, day, month, year] = match.map(Number)
  const date = new Date(year, month - 1, day)
  const isValid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  return isValid ? date : null
}

/**
 * Reads the uploaded Excel file and returns employee rows.
 * Column headers are matched flexibly (case-insensitive, ignores spacing).
 */
export async function parseEmployeeFile(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  const employees = []
  const errors = []

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2 // account for header row
    const name = findValue(row, NAME_KEYS)
    const presentRaw = findValue(row, PRESENT_KEYS)
    const absentRaw = findValue(row, ABSENT_KEYS)
    const joinDateRaw = findValue(row, JOIN_DATE_KEYS)

    if (!name || String(name).trim() === '') return // skip blank rows

    const presentProvided = presentRaw !== undefined && String(presentRaw).trim() !== ''
    const absentProvided = absentRaw !== undefined && String(absentRaw).trim() !== ''
    const presentDays = presentProvided ? Number(presentRaw) : undefined
    const absentDays = absentProvided ? Number(absentRaw) : undefined

    if ((presentProvided && Number.isNaN(presentDays)) || (absentProvided && Number.isNaN(absentDays))) {
      errors.push(`Row ${rowNumber} (${name}): present/absent days must be numbers.`)
      return
    }
    if (!presentProvided && !absentProvided) {
      errors.push(`Row ${rowNumber} (${name}): enter Present Days or Absent Days.`)
      return
    }

    const joiningDate = parseJoiningDateValue(joinDateRaw)
    if (joiningDate === null) {
      errors.push(`Row ${rowNumber} (${name}): joining date must be in DD-MM-YYYY format (e.g. 12-06-2026).`)
      return
    }

    employees.push({
      name: String(name).trim(),
      presentDays,
      absentDays,
      joiningDate: joiningDate ?? null,
    })
  })

  if (employees.length === 0 && errors.length === 0) {
    errors.push(
      'No employee rows found. Expected columns: Employee Name, Present Days (or Absent Days), Joining Date (optional).'
    )
  }

  return { employees, errors }
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export { WEEKDAY_NAMES }

/**
 * Parses a comma-separated list of day numbers (e.g. "15, 26") into an array
 * of integers, reporting any values that aren't valid day numbers.
 */
export function parseHolidayInput(input) {
  const holidayDays = []
  const errors = []
  if (!input || !input.trim()) return { holidayDays, errors }

  const seen = new Set()
  input.split(',').forEach((raw) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    const day = Number(trimmed)
    if (!Number.isInteger(day) || day < 1) {
      errors.push(`"${trimmed}" is not a valid day number.`)
      return
    }
    if (!seen.has(day)) {
      seen.add(day)
      holidayDays.push(day)
    }
  })

  return { holidayDays, errors }
}

/**
 * Builds the calendar for the given month: total days, and which day numbers
 * fall on the chosen week-off weekday or are declared holidays. A day that
 * falls on both is treated as a week-off.
 */
export function getMonthCalendar(year, month, weekOffWeekday, holidayDayNumbers = []) {
  const totalDays = new Date(year, month + 1, 0).getDate()
  const invalidHolidayDays = holidayDayNumbers.filter((day) => day > totalDays)
  const holidaySet = new Set(holidayDayNumbers.filter((day) => day <= totalDays))

  const days = []
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day)
    const isWeekOff = date.getDay() === weekOffWeekday
    days.push({
      day,
      isWeekOff,
      isHoliday: !isWeekOff && holidaySet.has(day),
    })
  }

  const workingDays = days.filter((d) => !d.isWeekOff && !d.isHoliday).map((d) => d.day)
  const weekOffDays = days.filter((d) => d.isWeekOff).map((d) => d.day)
  const holidayDays = days.filter((d) => d.isHoliday).map((d) => d.day)

  return { totalDays, days, workingDays, weekOffDays, holidayDays, invalidHolidayDays }
}

// Deterministic seeded PRNG (mulberry32) so regenerating the same
// period+employee produces the same random layout.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return hash
}

function seededShuffle(pool, seed) {
  const rng = mulberry32(seed)
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = temp
  }
  return shuffled
}

/**
 * Randomly distributes an employee's absent day(s) and half-day (if any)
 * across the month's working days (excluding week-offs). Remaining working
 * days are marked present. Absent and half-day slots are drawn from a single
 * shuffle so they never overlap. The employee's joining day, if it falls
 * within workingDays, is excluded from that shuffle and always marked
 * present — an employee should never show absent/half-day on the day they joined.
 */
export function distributeAttendance({ employeeName, periodKey, workingDays, absentDays, hasHalfDay, joinDay }) {
  const seed = hashString(`${periodKey}:${employeeName}`)
  const eligibleDays = workingDays.filter((day) => day !== joinDay)
  const shuffled = seededShuffle(eligibleDays, seed)

  const absentDates = new Set(shuffled.slice(0, absentDays))
  const halfDayDate = hasHalfDay ? shuffled[absentDays] : undefined

  const statusByDay = {}
  for (const day of workingDays) {
    if (day === joinDay) statusByDay[day] = 'P'
    else if (absentDates.has(day)) statusByDay[day] = 'A'
    else if (day === halfDayDate) statusByDay[day] = 'HF'
    else statusByDay[day] = 'P'
  }
  return statusByDay
}

/**
 * Resolves the first day-of-month (1-based) an employee is considered
 * employed for this salary month, based on their joining date:
 * - no joining date, or joined before this month → day 1 (no restriction)
 * - joined during this month → their joining day
 * - joined after this month → totalDays + 1 (not employed at all this month)
 */
function resolveJoinDay(joiningDate, year, month, totalDays) {
  if (!joiningDate) return 1
  const joinYear = joiningDate.getFullYear()
  const joinMonth = joiningDate.getMonth()
  if (joinYear < year || (joinYear === year && joinMonth < month)) return 1
  if (joinYear === year && joinMonth === month) return joiningDate.getDate()
  return totalDays + 1
}

/**
 * Full pipeline: validates each employee's present+absent against the month's
 * working-day count, then builds the per-day P/A/W status grid for each row.
 */
export function buildMusterRollData({
  employees,
  year,
  month,
  weekOffWeekday,
  holidayInput,
  salaryMonthLabel,
}) {
  const { holidayDays: parsedHolidays, errors: holidayErrors } = parseHolidayInput(holidayInput)
  const calendar = getMonthCalendar(year, month, weekOffWeekday, parsedHolidays)
  const periodKey = `${year}-${month}-${weekOffWeekday}`
  const warnings = [...holidayErrors]

  if (calendar.invalidHolidayDays.length > 0) {
    warnings.push(
      `Holiday day(s) ${calendar.invalidHolidayDays.join(', ')} don't exist in this month and were ignored.`
    )
  }

  const rows = employees.map((employee, index) => {
    const joinDay = resolveJoinDay(employee.joiningDate, year, month, calendar.totalDays)
    const workingDaysForEmployee = calendar.workingDays.filter((day) => day >= joinDay)
    const expected = workingDaysForEmployee.length

    if (joinDay > calendar.totalDays) {
      warnings.push(`${employee.name}: joining date falls after this salary month; no attendance recorded.`)
    }

    const presentGiven = employee.presentDays !== undefined
    let absentDays
    let hasHalfDay

    if (presentGiven) {
      // Present days (from the file) are authoritative whenever they're given —
      // Absent is auto-calculated from the employee's working-day calendar, so
      // the Absent column can be left as 0/blank and doesn't need to be filled in.
      const roundedPresent = Math.round(employee.presentDays * 2) / 2
      if (roundedPresent !== employee.presentDays) {
        warnings.push(`${employee.name}: present days must be whole or half days; rounded to ${roundedPresent}.`)
      }

      hasHalfDay = roundedPresent % 1 !== 0
      const fullPresentGiven = Math.floor(roundedPresent)
      const maxPresent = Math.max(expected - (hasHalfDay ? 1 : 0), 0)
      const fullPresentDays = Math.min(fullPresentGiven, maxPresent)

      if (fullPresentDays !== fullPresentGiven) {
        warnings.push(
          `${employee.name}: present (${roundedPresent}) exceeds this month's ${expected} working days (after removing week-offs). Capped at ${fullPresentDays + (hasHalfDay ? 0.5 : 0)}.`
        )
      }

      absentDays = expected - fullPresentDays - (hasHalfDay ? 1 : 0)
    } else {
      // Fallback for rows with no Present value: Absent (from the file) is
      // authoritative instead, and present is derived from what remains.
      const roundedAbsent = Math.round(employee.absentDays * 2) / 2
      if (roundedAbsent !== employee.absentDays) {
        warnings.push(`${employee.name}: absent days must be whole or half days; rounded to ${roundedAbsent}.`)
      }

      hasHalfDay = roundedAbsent % 1 !== 0
      const fullAbsentGiven = Math.floor(roundedAbsent)
      absentDays = Math.min(fullAbsentGiven, Math.max(expected - (hasHalfDay ? 1 : 0), 0))

      if (absentDays !== fullAbsentGiven) {
        warnings.push(
          `${employee.name}: absent (${roundedAbsent}) exceeds this month's ${expected} working days (after removing week-offs). Capped at ${absentDays}.`
        )
      }
    }

    const statusByDay = distributeAttendance({
      employeeName: employee.name,
      periodKey,
      workingDays: workingDaysForEmployee,
      absentDays,
      hasHalfDay,
      joinDay,
    })

    const dayStatus = calendar.days.map((d) => {
      if (d.day < joinDay) return 'NJ'
      if (d.isWeekOff) return 'W'
      if (d.isHoliday) return 'H'
      return statusByDay[d.day]
    })

    const total = dayStatus.reduce((sum, status) => {
      if (status === 'P') return sum + 1
      if (status === 'HF') return sum + 0.5
      return sum
    }, 0)

    return {
      sr: index + 1,
      name: employee.name,
      dayStatus,
      total,
    }
  })

  return { calendar, rows, warnings, salaryMonthLabel }
}

/**
 * Get the current date in local timezone as YYYY-MM-DD string
 * This ensures dates are consistent with the user's local timezone,
 * not UTC time which can cause "day" boundaries to be wrong.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get week bounds (Monday to Sunday) in local timezone
 */
export function getLocalWeekBounds(date: Date = new Date()) {
  const dayOfWeek = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setHours(0, 0, 0, 0)
  
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  
  return {
    start: getLocalDateString(monday),
    end: getLocalDateString(sunday),
  }
}


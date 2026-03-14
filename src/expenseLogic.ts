export type TimeFilter = 'all' | 'month' | '30days'

export type Expense = {
  id: string
  description: string
  amount: number
  category: string
  date: string // ISO yyyy-mm-dd
  createdAt: string // ISO
}

export const STORAGE_KEY = 'em_expenses_v1'

export function loadExpenses(storage: Storage = window.localStorage): Expense[] {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Expense[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (e) =>
          typeof e.description === 'string' &&
          typeof e.category === 'string' &&
          typeof e.date === 'string' &&
          typeof e.amount === 'number',
      )
      .map((e) => ({
        ...e,
        createdAt: e.createdAt ?? new Date(e.date).toISOString(),
      }))
  } catch {
    return []
  }
}

export function saveExpenses(
  expenses: Expense[],
  storage: Storage = window.localStorage,
) {
  storage.setItem(STORAGE_KEY, JSON.stringify(expenses))
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function isWithinFilter(expense: Expense, filter: TimeFilter): boolean {
  if (filter === 'all') return true
  const today = new Date()
  const d = new Date(expense.date)
  if (Number.isNaN(d.getTime())) return false

  if (filter === '30days') {
    const cutoff = new Date()
    cutoff.setDate(today.getDate() - 30)
    return d >= cutoff && d <= today
  }

  if (filter === 'month') {
    return (
      d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
    )
  }

  return true
}


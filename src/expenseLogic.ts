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

/** Category options for the app; single source of truth. */
export const CATEGORIES = [
  'general',
  'food',
  'transport',
  'bills',
  'shopping',
  'fun',
  'health',
  'other',
] as const

export type ExpenseCategory = (typeof CATEGORIES)[number]

/** Human-readable labels for category option elements. */
export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  general: 'General',
  food: 'Food & groceries',
  transport: 'Transport',
  bills: 'Bills & utilities',
  shopping: 'Shopping',
  fun: 'Entertainment',
  health: 'Health',
  other: 'Other',
}

/** Result of validating form input for an expense. */
export type ExpenseFormValidation =
  | { valid: true; data: { description: string; amount: number; date: string; category: string } }
  | { valid: false; error: string }

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

/**
 * Returns a new expenses array with the expense matching `updated.id` replaced by `updated`.
 * Preserves order. If no matching id is found, returns the original array unchanged.
 */
export function updateExpense(
  expenses: Expense[],
  updated: Expense,
): Expense[] {
  const index = expenses.findIndex((e) => e.id === updated.id)
  if (index === -1) return expenses
  const next = [...expenses]
  next[index] = updated
  return next
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

/**
 * Filters expenses by time range and category. Returns a new array (does not mutate).
 */
export function filterExpenses(
  expenses: Expense[],
  timeFilter: TimeFilter,
  categoryFilter: string,
): Expense[] {
  return expenses.filter((e) => {
    if (!isWithinFilter(e, timeFilter)) return false
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
    return true
  })
}

/** Formats an ISO date string for display (e.g. "Mar 14"). */
export function formatExpenseDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Validates raw form values for creating/editing an expense.
 * Returns either valid data or an error message.
 */
export function validateExpenseForm(
  description: string,
  amountRaw: number,
  date: string,
  category: string,
): ExpenseFormValidation {
  const trimmed = description.trim()
  if (!trimmed) return { valid: false, error: 'Description is required' }
  if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
    return { valid: false, error: 'Amount must be a positive number' }
  }
  if (!date) return { valid: false, error: 'Date is required' }
  const normalizedCategory = CATEGORIES.includes(category as ExpenseCategory)
    ? category
    : 'general'
  return {
    valid: true,
    data: {
      description: trimmed,
      amount: amountRaw,
      date,
      category: normalizedCategory,
    },
  }
}


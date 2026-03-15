import { describe, expect, it, vi } from 'vitest'
import {
  STORAGE_KEY,
  filterExpenses,
  formatCurrency,
  formatExpenseDate,
  isWithinFilter,
  loadExpenses,
  saveExpenses,
  updateExpense,
  validateExpenseForm,
  type Expense,
} from './expenseLogic'

function makeExpense(date: string): Expense {
  return {
    id: '1',
    description: 'Test',
    amount: 10,
    category: 'general',
    date,
    createdAt: new Date(date).toISOString(),
  }
}

describe('formatCurrency', () => {
  it('formats numbers as currency', () => {
    const formatted = formatCurrency(12.5, 'USD')
    expect(formatted).toMatch(/12\.50/)
  })
})

describe('isWithinFilter', () => {
  it('always returns true for "all"', () => {
    const e = makeExpense('2000-01-01')
    expect(isWithinFilter(e, 'all')).toBe(true)
  })

  it('filters correctly for "month"', () => {
    const now = new Date()
    const currentMonthDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      5,
    ).toISOString()

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5)

    const inMonth = makeExpense(currentMonthDate)
    const outOfMonth = makeExpense(lastMonth.toISOString())

    expect(isWithinFilter(inMonth, 'month')).toBe(true)
    expect(isWithinFilter(outOfMonth, 'month')).toBe(false)
  })

  it('filters correctly for "30days"', () => {
    const now = new Date()
    const inside = new Date(now)
    inside.setDate(now.getDate() - 10)
    const outside = new Date(now)
    outside.setDate(now.getDate() - 40)

    expect(isWithinFilter(makeExpense(inside.toISOString()), '30days')).toBe(
      true,
    )
    expect(isWithinFilter(makeExpense(outside.toISOString()), '30days')).toBe(
      false,
    )
  })
})

describe('filterExpenses', () => {
  it('returns only expenses within time and category', () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5)
      .toISOString()
      .slice(0, 10)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5)
      .toISOString()
      .slice(0, 10)
    const expenses: Expense[] = [
      { ...makeExpense(thisMonth), id: '1', category: 'food' },
      { ...makeExpense(thisMonth), id: '2', category: 'transport' },
      { ...makeExpense(lastMonth), id: '3', category: 'food' },
    ]
    const result = filterExpenses(expenses, 'month', 'food')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('returns all when time is "all" and category is "all"', () => {
    const expenses: Expense[] = [
      makeExpense('2020-01-01'),
      makeExpense('2025-06-15'),
    ]
    expect(filterExpenses(expenses, 'all', 'all')).toHaveLength(2)
  })
})

describe('formatExpenseDate', () => {
  it('formats valid date string', () => {
    expect(formatExpenseDate('2026-03-14')).toMatch(/Mar.*14/)
  })

  it('returns original string for invalid date', () => {
    expect(formatExpenseDate('not-a-date')).toBe('not-a-date')
  })
})

describe('validateExpenseForm', () => {
  it('returns valid data for good input', () => {
    const r = validateExpenseForm('Coffee', 4.5, '2026-03-14', 'food')
    expect(r.valid).toBe(true)
    if (r.valid) {
      expect(r.data.description).toBe('Coffee')
      expect(r.data.amount).toBe(4.5)
      expect(r.data.date).toBe('2026-03-14')
      expect(r.data.category).toBe('food')
    }
  })

  it('trims description and normalizes category', () => {
    const r = validateExpenseForm('  Lunch  ', 10, '2026-03-14', 'food')
    expect(r.valid).toBe(true)
    if (r.valid) expect(r.data.description).toBe('Lunch')
  })

  it('returns error for empty description', () => {
    const r = validateExpenseForm('', 5, '2026-03-14', 'general')
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.error).toMatch(/description/i)
  })

  it('returns error for invalid amount', () => {
    expect(validateExpenseForm('X', 0, '2026-03-14', 'general').valid).toBe(false)
    expect(validateExpenseForm('X', -1, '2026-03-14', 'general').valid).toBe(false)
    expect(validateExpenseForm('X', NaN, '2026-03-14', 'general').valid).toBe(false)
  })

  it('returns error for missing date', () => {
    const r = validateExpenseForm('X', 1, '', 'general')
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.error).toMatch(/date/i)
  })
})

describe('updateExpense', () => {
  it('replaces expense with matching id and returns new array', () => {
    const expenses: Expense[] = [
      { id: '1', description: 'A', amount: 10, category: 'food', date: '2026-01-01', createdAt: '2026-01-01T00:00:00Z' },
      { id: '2', description: 'B', amount: 20, category: 'transport', date: '2026-01-02', createdAt: '2026-01-02T00:00:00Z' },
    ]
    const updated: Expense = {
      id: '2',
      description: 'B updated',
      amount: 25,
      category: 'bills',
      date: '2026-01-03',
      createdAt: '2026-01-02T00:00:00Z',
    }
    const result = updateExpense(expenses, updated)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(expenses[0])
    expect(result[1]).toEqual(updated)
  })

  it('does not mutate original array', () => {
    const expenses: Expense[] = [
      { id: '1', description: 'A', amount: 10, category: 'food', date: '2026-01-01', createdAt: '2026-01-01T00:00:00Z' },
    ]
    const updated: Expense = { ...expenses[0], description: 'A edited', amount: 15 }
    const result = updateExpense(expenses, updated)
    expect(result).not.toBe(expenses)
    expect(expenses[0].description).toBe('A')
    expect(result[0].description).toBe('A edited')
  })

  it('returns same array when no expense has matching id', () => {
    const expenses: Expense[] = [
      { id: '1', description: 'A', amount: 10, category: 'food', date: '2026-01-01', createdAt: '2026-01-01T00:00:00Z' },
    ]
    const updated: Expense = {
      id: 'other',
      description: 'X',
      amount: 1,
      category: 'other',
      date: '2026-01-01',
      createdAt: '2026-01-01T00:00:00Z',
    }
    const result = updateExpense(expenses, updated)
    expect(result).toBe(expenses)
    expect(result[0].description).toBe('A')
  })

  it('returns empty array unchanged when given empty array', () => {
    const result = updateExpense([], {
      id: '1',
      description: 'X',
      amount: 1,
      category: 'other',
      date: '2026-01-01',
      createdAt: '2026-01-01T00:00:00Z',
    })
    expect(result).toEqual([])
  })
})

describe('loadExpenses & saveExpenses', () => {
  it('returns [] for missing or invalid storage', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as unknown as Storage

    expect(loadExpenses(storage)).toEqual([])

    storage.getItem = vi.fn().mockReturnValue('not-json')
    expect(loadExpenses(storage)).toEqual([])
  })

  it('round-trips expenses through storage', () => {
    const backing = new Map<string, string>()
    const storage: Storage = {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => {
        backing.set(key, value)
      },
      removeItem: (key: string) => {
        backing.delete(key)
      },
      clear: () => {
        backing.clear()
      },
      key: (index: number) => Array.from(backing.keys())[index] ?? null,
      get length() {
        return backing.size
      },
    }

    const expenses: Expense[] = [
      {
        id: 'a',
        description: 'Coffee',
        amount: 4.5,
        category: 'food',
        date: '2026-03-14',
        createdAt: '2026-03-14T00:00:00.000Z',
      },
    ]

    saveExpenses(expenses, storage)

    expect(backing.has(STORAGE_KEY)).toBe(true)

    const loaded = loadExpenses(storage)
    expect(loaded).toHaveLength(1)
    expect(loaded[0].description).toBe('Coffee')
    expect(loaded[0].amount).toBe(4.5)
  })

  it('persists updated expense after save and load', () => {
    const backing = new Map<string, string>()
    const storage: Storage = {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => {
        backing.set(key, value)
      },
      removeItem: (key: string) => {
        backing.delete(key)
      },
      clear: () => {
        backing.clear()
      },
      key: (index: number) => Array.from(backing.keys())[index] ?? null,
      get length() {
        return backing.size
      },
    }

    const expenses: Expense[] = [
      {
        id: 'a',
        description: 'Coffee',
        amount: 4.5,
        category: 'food',
        date: '2026-03-14',
        createdAt: '2026-03-14T00:00:00.000Z',
      },
    ]
    saveExpenses(expenses, storage)
    const updated: Expense = {
      id: 'a',
      description: 'Coffee and pastry',
      amount: 8.5,
      category: 'food',
      date: '2026-03-14',
      createdAt: '2026-03-14T00:00:00.000Z',
    }
    const afterUpdate = updateExpense(loadExpenses(storage), updated)
    saveExpenses(afterUpdate, storage)

    const loaded = loadExpenses(storage)
    expect(loaded).toHaveLength(1)
    expect(loaded[0].description).toBe('Coffee and pastry')
    expect(loaded[0].amount).toBe(8.5)
    expect(loaded[0].id).toBe('a')
  })
})


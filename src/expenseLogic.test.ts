import { describe, expect, it, vi } from 'vitest'
import {
  STORAGE_KEY,
  Expense,
  formatCurrency,
  isWithinFilter,
  loadExpenses,
  saveExpenses,
  type TimeFilter,
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
})


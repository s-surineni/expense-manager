import './style.css'
import {
  type Expense,
  type TimeFilter,
  formatCurrency,
  isWithinFilter,
  loadExpenses,
  saveExpenses,
} from './expenseLogic'

function createLayout() {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return

  app.innerHTML = `
    <div class="shell">
      <header class="top-bar">
        <div class="brand">
          <span class="brand-mark">EM</span>
          <div class="brand-text">
            <h1>Expense Manager</h1>
            <p>Track your spending on web & phone</p>
          </div>
        </div>
        <div class="summary">
          <div>
            <span class="summary-label">This month</span>
            <div class="summary-value" id="summary-month">$0.00</div>
          </div>
          <div>
            <span class="summary-label">Last 30 days</span>
            <div class="summary-value" id="summary-30days">$0.00</div>
          </div>
        </div>
      </header>

      <main class="content">
        <section class="card add-card">
          <h2>Add expense</h2>
          <form id="expense-form" class="expense-form">
            <div class="field-group">
              <label>
                <span>Description</span>
                <input
                  id="field-description"
                  type="text"
                  required
                  maxlength="120"
                  placeholder="Groceries, taxi, subscription..."
                />
              </label>
            </div>
            <div class="field-row">
              <label>
                <span>Amount</span>
                <input
                  id="field-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputmode="decimal"
                  required
                  placeholder="0.00"
                />
              </label>
              <label>
                <span>Date</span>
                <input id="field-date" type="date" required />
              </label>
            </div>
            <div class="field-row">
              <label>
                <span>Category</span>
                <select id="field-category">
                  <option value="general">General</option>
                  <option value="food">Food & groceries</option>
                  <option value="transport">Transport</option>
                  <option value="bills">Bills & utilities</option>
                  <option value="shopping">Shopping</option>
                  <option value="fun">Entertainment</option>
                  <option value="health">Health</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <button type="submit" class="primary-btn">Save expense</button>
          </form>
        </section>

        <section class="card list-card">
          <header class="list-header">
            <h2>History</h2>
            <div class="filters">
              <select id="filter-time">
                <option value="all">All time</option>
                <option value="month">This month</option>
                <option value="30days">Last 30 days</option>
              </select>
              <select id="filter-category">
                <option value="all">All categories</option>
              </select>
            </div>
          </header>

          <div class="list-container">
            <ul id="expense-list" class="expense-list"></ul>
            <p id="empty-state" class="empty-state">No expenses yet. Add your first one above.</p>
          </div>
        </section>
      </main>

      <footer class="bottom-note">
        <p>Data is stored locally in this browser so it works offline.</p>
      </footer>
    </div>
  `
}

function render(expenses: Expense[], timeFilter: TimeFilter, categoryFilter: string) {
  const listEl = document.querySelector<HTMLUListElement>('#expense-list')
  const emptyEl = document.querySelector<HTMLParagraphElement>('#empty-state')
  const categoryFilterEl = document.querySelector<HTMLSelectElement>('#filter-category')
  const summaryMonthEl = document.querySelector<HTMLDivElement>('#summary-month')
  const summary30El = document.querySelector<HTMLDivElement>('#summary-30days')

  if (!listEl || !emptyEl || !categoryFilterEl || !summaryMonthEl || !summary30El) return

  const filtered = expenses.filter((e) => {
    if (!isWithinFilter(e, timeFilter)) return false
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
    return true
  })

  // Update list
  listEl.innerHTML = ''

  if (filtered.length === 0) {
    emptyEl.style.display = 'block'
  } else {
    emptyEl.style.display = 'none'
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    for (const exp of sorted) {
      const li = document.createElement('li')
      li.className = 'expense-item'
      li.dataset.id = exp.id

      const date = new Date(exp.date)
      const dateLabel = Number.isNaN(date.getTime())
        ? exp.date
        : date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })

      li.innerHTML = `
        <div class="expense-main">
          <div class="expense-line">
            <span class="expense-description">${exp.description}</span>
            <span class="expense-amount">${formatCurrency(exp.amount)}</span>
          </div>
          <div class="expense-meta">
            <span class="expense-date">${dateLabel}</span>
            <span class="expense-dot">•</span>
            <span class="expense-category">${exp.category}</span>
          </div>
        </div>
        <button class="icon-btn delete-btn" aria-label="Delete expense">✕</button>
      `

      listEl.appendChild(li)
    }
  }

  // Update category filter options based on all expenses
  const categories = Array.from(new Set(expenses.map((e) => e.category))).sort()
  const current = categoryFilterEl.value
  categoryFilterEl.innerHTML = `<option value="all">All categories</option>`
  for (const cat of categories) {
    const opt = document.createElement('option')
    opt.value = cat
    opt.textContent = cat
    if (cat === current) opt.selected = true
    categoryFilterEl.appendChild(opt)
  }

  // Update summaries
  const monthTotal = expenses
    .filter((e) => isWithinFilter(e, 'month'))
    .reduce((sum, e) => sum + e.amount, 0)
  const days30Total = expenses
    .filter((e) => isWithinFilter(e, '30days'))
    .reduce((sum, e) => sum + e.amount, 0)

  summaryMonthEl.textContent = formatCurrency(monthTotal)
  summary30El.textContent = formatCurrency(days30Total)
}

function init() {
  createLayout()

  let state = {
    expenses: loadExpenses(),
    timeFilter: 'month' as TimeFilter,
    categoryFilter: 'all',
  }

  const form = document.querySelector<HTMLFormElement>('#expense-form')
  const descriptionInput =
    document.querySelector<HTMLInputElement>('#field-description')
  const amountInput = document.querySelector<HTMLInputElement>('#field-amount')
  const dateInput = document.querySelector<HTMLInputElement>('#field-date')
  const categorySelect =
    document.querySelector<HTMLSelectElement>('#field-category')
  const timeFilterSelect =
    document.querySelector<HTMLSelectElement>('#filter-time')
  const categoryFilterSelect =
    document.querySelector<HTMLSelectElement>('#filter-category')
  const listEl = document.querySelector<HTMLUListElement>('#expense-list')

  if (!form || !descriptionInput || !amountInput || !dateInput || !categorySelect || !timeFilterSelect || !categoryFilterSelect || !listEl) {
    return
  }

  // Default date to today
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  dateInput.value = `${yyyy}-${mm}-${dd}`

  timeFilterSelect.value = state.timeFilter

  render(state.expenses, state.timeFilter, state.categoryFilter)

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const description = descriptionInput.value.trim()
    const amount = parseFloat(amountInput.value)
    const date = dateInput.value
    const category = categorySelect.value || 'general'

    if (!description || !Number.isFinite(amount) || amount <= 0 || !date) {
      return
    }

    const expense: Expense = {
      id: crypto.randomUUID(),
      description,
      amount,
      category,
      date,
      createdAt: new Date().toISOString(),
    }

    state.expenses = [expense, ...state.expenses]
    saveExpenses(state.expenses)
    render(state.expenses, state.timeFilter, state.categoryFilter)

    form.reset()
    dateInput.value = `${yyyy}-${mm}-${dd}`
    descriptionInput.focus()
  })

  timeFilterSelect.addEventListener('change', () => {
    state.timeFilter = timeFilterSelect.value as TimeFilter
    render(state.expenses, state.timeFilter, state.categoryFilter)
  })

  categoryFilterSelect.addEventListener('change', () => {
    state.categoryFilter = categoryFilterSelect.value
    render(state.expenses, state.timeFilter, state.categoryFilter)
  })

  listEl.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.classList.contains('delete-btn')) return
    const item = target.closest<HTMLLIElement>('.expense-item')
    if (!item || !item.dataset.id) return
    const id = item.dataset.id
    state.expenses = state.expenses.filter((exp) => exp.id !== id)
    saveExpenses(state.expenses)
    render(state.expenses, state.timeFilter, state.categoryFilter)
  })
}

init()


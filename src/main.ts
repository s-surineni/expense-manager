import './style.css'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Expense,
  type TimeFilter,
  filterExpenses,
  formatCurrency,
  formatExpenseDate,
  isWithinFilter,
  loadExpenses,
  saveExpenses,
  updateExpense,
  validateExpenseForm,
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
          <h2 id="form-heading">Add expense</h2>
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
                  ${CATEGORIES.map((c) => `<option value="${c}">${CATEGORY_LABELS[c]}</option>`).join('')}
                </select>
              </label>
            </div>
            <div class="form-actions">
              <button type="submit" class="primary-btn" id="submit-btn">Save expense</button>
              <button type="button" class="secondary-btn" id="cancel-edit-btn" style="display: none;">Cancel</button>
            </div>
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

function render(
  expenses: Expense[],
  timeFilter: TimeFilter,
  categoryFilter: string,
  onEdit: (expense: Expense) => void,
) {
  const listEl = document.querySelector<HTMLUListElement>('#expense-list')
  const emptyEl = document.querySelector<HTMLParagraphElement>('#empty-state')
  const categoryFilterEl = document.querySelector<HTMLSelectElement>('#filter-category')
  const summaryMonthEl = document.querySelector<HTMLDivElement>('#summary-month')
  const summary30El = document.querySelector<HTMLDivElement>('#summary-30days')

  if (!listEl || !emptyEl || !categoryFilterEl || !summaryMonthEl || !summary30El) return

  const filtered = filterExpenses(expenses, timeFilter, categoryFilter)

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

      const dateLabel = formatExpenseDate(exp.date)

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
        <div class="expense-actions">
          <button class="icon-btn edit-btn" aria-label="Edit expense">✎</button>
          <button class="icon-btn delete-btn" aria-label="Delete expense">✕</button>
        </div>
      `

      const editBtn = li.querySelector<HTMLButtonElement>('.edit-btn')
      if (editBtn) editBtn.addEventListener('click', () => onEdit(exp))

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
    editingId: null as string | null,
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
  const formHeading = document.querySelector<HTMLHeadingElement>('#form-heading')
  const submitBtn = document.querySelector<HTMLButtonElement>('#submit-btn')
  const cancelEditBtn = document.querySelector<HTMLButtonElement>('#cancel-edit-btn')

  if (
    !form ||
    !descriptionInput ||
    !amountInput ||
    !dateInput ||
    !categorySelect ||
    !timeFilterSelect ||
    !categoryFilterSelect ||
    !listEl ||
    !formHeading ||
    !submitBtn ||
    !cancelEditBtn
  ) {
    return
  }

  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')

  function setFormAddMode() {
    if (!formHeading || !submitBtn || !cancelEditBtn || !form || !dateInput) return
    state.editingId = null
    formHeading.textContent = 'Add expense'
    submitBtn.textContent = 'Save expense'
    cancelEditBtn.style.display = 'none'
    form.reset()
    dateInput.value = `${yyyy}-${mm}-${dd}`
  }

  function setFormEditMode(exp: Expense) {
    if (!descriptionInput || !amountInput || !dateInput || !categorySelect || !formHeading || !submitBtn || !cancelEditBtn) return
    state.editingId = exp.id
    descriptionInput.value = exp.description
    amountInput.value = String(exp.amount)
    dateInput.value = exp.date
    categorySelect.value = exp.category
    formHeading.textContent = 'Edit expense'
    submitBtn.textContent = 'Update expense'
    cancelEditBtn.style.display = 'inline-block'
  }

  timeFilterSelect.value = state.timeFilter
  setFormAddMode()

  render(state.expenses, state.timeFilter, state.categoryFilter, setFormEditMode)

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const validation = validateExpenseForm(
      descriptionInput.value,
      parseFloat(amountInput.value),
      dateInput.value,
      categorySelect.value || 'general',
    )
    if (!validation.valid) return
    const { description, amount, date, category } = validation.data

    if (state.editingId) {
      const existing = state.expenses.find((e) => e.id === state.editingId)
      if (existing) {
        const updated: Expense = {
          ...existing,
          description,
          amount,
          category,
          date,
        }
        state.expenses = updateExpense(state.expenses, updated)
        saveExpenses(state.expenses)
        setFormAddMode()
      }
    } else {
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
      form.reset()
      dateInput.value = `${yyyy}-${mm}-${dd}`
    }

    render(state.expenses, state.timeFilter, state.categoryFilter, setFormEditMode)
    descriptionInput.focus()
  })

  cancelEditBtn.addEventListener('click', () => {
    setFormAddMode()
    render(state.expenses, state.timeFilter, state.categoryFilter, setFormEditMode)
  })

  timeFilterSelect.addEventListener('change', () => {
    state.timeFilter = timeFilterSelect.value as TimeFilter
    render(state.expenses, state.timeFilter, state.categoryFilter, setFormEditMode)
  })

  categoryFilterSelect.addEventListener('change', () => {
    state.categoryFilter = categoryFilterSelect.value
    render(state.expenses, state.timeFilter, state.categoryFilter, setFormEditMode)
  })

  listEl.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (target.classList.contains('delete-btn')) {
      const item = target.closest<HTMLLIElement>('.expense-item')
      if (!item || !item.dataset.id) return
      const id = item.dataset.id
      state.expenses = state.expenses.filter((exp) => exp.id !== id)
      saveExpenses(state.expenses)
      if (state.editingId === id) setFormAddMode()
      render(state.expenses, state.timeFilter, state.categoryFilter, setFormEditMode)
    }
  })
}

init()


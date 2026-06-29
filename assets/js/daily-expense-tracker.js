(function () {
  "use strict";

  var STORAGE_KEY = "householdExpenseTools_daily_expenses_v1";

  var form = document.getElementById("expense-form");
  var nameInput = document.getElementById("expense-name");
  var amountInput = document.getElementById("expense-amount");
  var categoryInput = document.getElementById("expense-category");
  var dateInput = document.getElementById("expense-date");
  var statusArea = document.getElementById("expense-status");
  var todayTotalEl = document.getElementById("today-total");
  var monthTotalEl = document.getElementById("month-total");
  var allTotalEl = document.getElementById("all-total");
  var allTotalRangeEl = document.getElementById("all-total-range");
  var entryCountEl = document.getElementById("entry-count");
  var emptyState = document.getElementById("empty-state");
  var expenseList = document.getElementById("expense-list");
  var clearButton = document.getElementById("clear-expenses");

  var expenses = [];

  if (
    !form ||
    !nameInput ||
    !amountInput ||
    !categoryInput ||
    !dateInput ||
    !statusArea ||
    !todayTotalEl ||
    !monthTotalEl ||
    !allTotalEl ||
    !allTotalRangeEl ||
    !entryCountEl ||
    !emptyState ||
    !expenseList ||
    !clearButton
  ) {
    return;
  }

  function padNumber(number) {
    return String(number).padStart(2, "0");
  }

  function getTodayString() {
    var today = new Date();

    return [
      today.getFullYear(),
      padNumber(today.getMonth() + 1),
      padNumber(today.getDate())
    ].join("-");
  }

  function getCurrentMonthString() {
    var today = new Date();

    return [
      today.getFullYear(),
      padNumber(today.getMonth() + 1)
    ].join("-");
  }

  function formatAmount(value) {
    var number = Number(value);

    if (!Number.isFinite(number)) {
      return "0.00";
    }

    return number.toFixed(2);
  }

  function formatDateLabel(dateString) {
    var parts = String(dateString).split("-");

    if (parts.length !== 3) {
      return dateString;
    }

    var year = parts[0];
    var month = Number(parts[1]) - 1;
    var day = Number(parts[2]);

    var monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    if (!monthNames[month] || !day || !year) {
      return dateString;
    }

    return day + " " + monthNames[month] + " " + year;
  }

  function setStatus(message) {
    statusArea.textContent = message;
  }

  function isValidStoredExpense(item) {
    return (
      item &&
      typeof item.id === "string" &&
      typeof item.name === "string" &&
      typeof item.category === "string" &&
      typeof item.date === "string" &&
      Number.isFinite(Number(item.amount)) &&
      Number(item.amount) > 0
    );
  }

  function sortExpenses() {
    expenses.sort(function (a, b) {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }

      return b.id.localeCompare(a.id);
    });
  }

  function loadExpenses() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        expenses = [];
        return;
      }

      var parsed = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        expenses = [];
        return;
      }

      expenses = parsed
        .filter(isValidStoredExpense)
        .map(function (item) {
          return {
            id: String(item.id),
            name: String(item.name).trim(),
            amount: Number(item.amount),
            category: String(item.category),
            date: String(item.date)
          };
        });

      sortExpenses();
    } catch (error) {
      expenses = [];
      setStatus("Saved expenses could not be loaded in this browser.");
    }
  }

  function saveExpenses() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      return true;
    } catch (error) {
      setStatus("Your browser could not save this expense. Storage may be full or blocked.");
      return false;
    }
  }

  function createExpenseItem(expense) {
    var item = document.createElement("li");
    item.className = "expense-item";

    var content = document.createElement("div");
    content.className = "expense-item-content";

    var title = document.createElement("strong");
    title.textContent = expense.name;

    var meta = document.createElement("p");
    meta.textContent = expense.category + " | " + expense.date;

    var amount = document.createElement("p");
    amount.className = "expense-item-amount";
    amount.textContent = formatAmount(expense.amount);

    var deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button button-secondary expense-delete";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("data-expense-id", expense.id);
    deleteButton.setAttribute("aria-label", "Delete expense " + expense.name);

    content.appendChild(title);
    content.appendChild(meta);
    content.appendChild(amount);

    item.appendChild(content);
    item.appendChild(deleteButton);

    return item;
  }

  function updateSummary() {
    var todayString = getTodayString();
    var currentMonth = getCurrentMonthString();

    var todayTotal = 0;
    var monthTotal = 0;
    var allTotal = 0;
    var dates = [];

    expenses.forEach(function (expense) {
      var amount = Number(expense.amount);

      allTotal += amount;
      dates.push(expense.date);

      if (expense.date === todayString) {
        todayTotal += amount;
      }

      if (expense.date.slice(0, 7) === currentMonth) {
        monthTotal += amount;
      }
    });

    dates.sort();

    todayTotalEl.textContent = formatAmount(todayTotal);
    monthTotalEl.textContent = formatAmount(monthTotal);
    allTotalEl.textContent = formatAmount(allTotal);
    entryCountEl.textContent = String(expenses.length);

    if (dates.length === 0) {
      allTotalRangeEl.textContent = "All saved dates";
    } else if (dates[0] === dates[dates.length - 1]) {
      allTotalRangeEl.textContent = "Date: " + formatDateLabel(dates[0]);
    } else {
      allTotalRangeEl.textContent = formatDateLabel(dates[0]) + " to " + formatDateLabel(dates[dates.length - 1]);
    }
  }

  function renderExpenses() {
    sortExpenses();

    expenseList.textContent = "";

    expenses.forEach(function (expense) {
      expenseList.appendChild(createExpenseItem(expense));
    });

    emptyState.hidden = expenses.length > 0;
    expenseList.hidden = expenses.length === 0;
    clearButton.disabled = expenses.length === 0;

    updateSummary();
  }

  function validateExpense(name, amount, category, date) {
    if (!name) {
      return "Please enter an expense name.";
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return "Please enter a valid amount greater than 0.";
    }

    if (!category) {
      return "Please select a category.";
    }

    if (!date) {
      return "Please select a date.";
    }

    return "";
  }

  function resetFormDate() {
    dateInput.value = getTodayString();
  }

  function handleAddExpense(event) {
    event.preventDefault();

    var name = nameInput.value.trim();
    var amount = Number(amountInput.value);
    var category = categoryInput.value;
    var date = dateInput.value;

    var validationMessage = validateExpense(name, amount, category, date);

    if (validationMessage) {
      setStatus(validationMessage);
      return;
    }

    var expense = {
      id: String(Date.now()),
      name: name,
      amount: amount,
      category: category,
      date: date
    };

    expenses.push(expense);
    sortExpenses();

    if (!saveExpenses()) {
      expenses = expenses.filter(function (item) {
        return item.id !== expense.id;
      });

      renderExpenses();
      return;
    }

    form.reset();
    resetFormDate();
    renderExpenses();
    setStatus("Expense added successfully.");
    nameInput.focus();
  }

  function handleDeleteExpense(event) {
  var target = event.target;

  if (!target || !target.matches(".expense-delete")) {
    return;
  }

  var expenseId = target.getAttribute("data-expense-id");
  var expenseToDelete = expenses.find(function (expense) {
    return expense.id === expenseId;
  });

  var expenseName = expenseToDelete ? expenseToDelete.name : "this expense";
  var confirmed = window.confirm("Delete " + expenseName + " from this browser?");

  if (!confirmed) {
    setStatus("Delete cancelled.");
    return;
  }

  expenses = expenses.filter(function (expense) {
    return expense.id !== expenseId;
  });

  saveExpenses();
  renderExpenses();
  setStatus("Expense deleted.");
}

  function handleClearExpenses() {
    if (expenses.length === 0) {
      setStatus("There are no expenses to clear.");
      return;
    }

    var confirmed = window.confirm("Clear all saved expenses from this browser?");

    if (!confirmed) {
      setStatus("Clear all cancelled.");
      return;
    }

    expenses = [];
    saveExpenses();
    renderExpenses();
    setStatus("All expenses cleared.");
  }

  resetFormDate();
  loadExpenses();
  renderExpenses();

  form.addEventListener("submit", handleAddExpense);
  expenseList.addEventListener("click", handleDeleteExpense);
  clearButton.addEventListener("click", handleClearExpenses);
}());

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('monthly-expense-form');
  var resultArea = document.getElementById('monthly-expense-result');
  var resetButton = document.getElementById('reset-calculator');

  var expenseFields = [
    { id: 'rent-housing', label: 'Rent or housing' },
    { id: 'groceries', label: 'Groceries' },
    { id: 'utilities', label: 'Utilities' },
    { id: 'transport', label: 'Transport' },
    { id: 'phone-internet', label: 'Phone and internet' },
    { id: 'debt-emi', label: 'Debt or EMI payments' },
    { id: 'insurance-health', label: 'Insurance or health' },
    { id: 'other-expenses', label: 'Other expenses' }
  ];

  if (!form || !resultArea || !resetButton) {
    return;
  }

  function getNumber(id) {
    var input = document.getElementById(id);

    if (!input) {
      return 0;
    }

    var rawValue = input.value.trim();

    if (rawValue === '') {
      return 0;
    }

    var value = Number(rawValue);

    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return value;
  }

  function hasValue(id) {
    var input = document.getElementById(id);
    return input ? input.value.trim() !== '' : false;
  }
function hasNegativeValue(id) {
  var input = document.getElementById(id);

  if (!input || input.value.trim() === '') {
    return false;
  }

  var value = Number(input.value.trim());
  return Number.isFinite(value) && value < 0;
}
  
  function formatMoney(value) {
    if (!Number.isFinite(value)) {
      return '0.00';
    }

    return value.toFixed(2);
  }

  function clearResult() {
    resultArea.replaceChildren();
  }

  function addLine(label, value) {
    var row = document.createElement('p');
    var strong = document.createElement('strong');

    strong.textContent = label + ': ';
    row.appendChild(strong);
    row.appendChild(document.createTextNode(value));

    resultArea.appendChild(row);
  }

  function showMessage(message) {
    clearResult();
    var paragraph = document.createElement('p');
    paragraph.textContent = message;
    resultArea.appendChild(paragraph);
  }

  function calculate() {
    var income = getNumber('monthly-income');
    var incomeFilled = hasValue('monthly-income');

    var totalExpenses = 0;
    var anyExpenseFilled = false;
    var biggestExpenseLabel = 'None';
    var biggestExpenseValue = 0;

    expenseFields.forEach(function (field) {
      var value = getNumber(field.id);

      if (hasValue(field.id)) {
        anyExpenseFilled = true;
      }

      totalExpenses += value;

      if (value > biggestExpenseValue) {
        biggestExpenseValue = value;
        biggestExpenseLabel = field.label;
      }
    });

    var hasNegativeInput = hasNegativeValue('monthly-income') || expenseFields.some(function (field) {
  return hasNegativeValue(field.id);
});

if (hasNegativeInput) {
  showMessage('Enter 0 or a positive amount. Negative values are not supported.');
  return;
}

    if (!incomeFilled && !anyExpenseFilled) {
      showMessage('Enter monthly income or at least one expense amount to calculate.');
      return;
    }

    var remainingMoney = income - totalExpenses;

    clearResult();

    addLine('Total monthly expenses', formatMoney(totalExpenses));
    addLine('Remaining money', formatMoney(remainingMoney));

    if (income > 0) {
      var expensePercentage = (totalExpenses / income) * 100;
      addLine('Expense percentage of income', expensePercentage.toFixed(2) + '%');
    } else {
      addLine('Expense percentage of income', 'Needs monthly income');
    }

    if (biggestExpenseValue > 0) {
      addLine('Biggest expense category', biggestExpenseLabel + ' (' + formatMoney(biggestExpenseValue) + ')');
    } else {
      addLine('Biggest expense category', 'None');
    }

    var status = document.createElement('p');

    if (income <= 0 && totalExpenses > 0) {
      status.textContent = 'The tool can total expenses, but expense percentage needs monthly income.';
    } else if (income > 0 && totalExpenses > income) {
      status.textContent = 'Expenses are above income by ' + formatMoney(Math.abs(remainingMoney)) + '.';
    } else if (income > 0 && remainingMoney > 0) {
      status.textContent = 'Remaining money after expenses is ' + formatMoney(remainingMoney) + '.';
    } else if (income > 0 && remainingMoney === 0) {
      status.textContent = 'Expenses are equal to income.';
    } else {
      status.textContent = 'Monthly expense summary calculated.';
    }

    resultArea.appendChild(status);
  }

  function resetCalculator() {
    form.reset();
    showMessage('Enter monthly income or expenses, then calculate to see the summary.');
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    calculate();
  });

  resetButton.addEventListener('click', resetCalculator);
});

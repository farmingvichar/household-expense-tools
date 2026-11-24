(function () {
  "use strict";

  var form = document.getElementById("monthly-expense-form");
  var statusEl = document.getElementById("monthly-expense-result");
  var resetButton = document.getElementById("reset-calculator");

  if (!form || !statusEl) {
    return;
  }

  var curSelect = document.getElementById("currencySymbol");
  var incomeInput = document.getElementById("monthly-income");
  var submitBtn = document.getElementById("calculate-expenses");

  var outTotal = document.getElementById("totalMonthlyExpenses");
  var outRemaining = document.getElementById("remainingBalance");
  var outPercent = document.getElementById("expensePercentage");
  var outBiggest = document.getElementById("biggestExpense");
  var outAnnual = document.getElementById("annualExpenses");
  var outEmergency = document.getElementById("emergencyFundTarget");
  var outRule = document.getElementById("budgetRuleSummary");

  var expenseFields = [
    { id: "rent-housing", label: "Rent or mortgage" },
    { id: "utilities", label: "Utilities" },
    { id: "phone-internet", label: "Phone & internet" },
    { id: "debt-emi", label: "Debt or loans" },
    { id: "insurance-health", label: "Insurance & health" },
    { id: "groceries", label: "Groceries" },
    { id: "transport", label: "Transport" },
    { id: "other-expenses", label: "Other expenses" }
  ];

  var hasCalculated = false;

  function getCurrency() {
    return curSelect && curSelect.value ? curSelect.value : "$";
  }

  function formatMoney(symbol, amount) {
    if (!Number.isFinite(amount)) {
      return symbol + "0.00";
    }
    var formatted = Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return (amount < 0 ? "-" : "") + symbol + formatted;
  }

  function formatWholeMoney(symbol, amount) {
    if (!Number.isFinite(amount)) {
      return symbol + "0";
    }
    var formatted = Math.round(Math.abs(amount)).toLocaleString("en-US");
    return (amount < 0 ? "-" : "") + symbol + formatted;
  }

  function readRaw(id) {
    var input = document.getElementById(id);
    return input ? input.value.trim() : "";
  }

  function parseField(id) {
    var raw = readRaw(id);
    if (raw === "") {
      return { filled: false, valid: true, value: 0 };
    }
    var num = Number(raw);
    if (!Number.isFinite(num) || num < 0) {
      return { filled: true, valid: false, value: 0 };
    }
    return { filled: true, valid: true, value: num };
  }

  function clearOutputs(message) {
    var cur = getCurrency();
    if (outTotal) outTotal.textContent = cur + "0.00";
    if (outRemaining) outRemaining.textContent = cur + "0.00";
    if (outPercent) outPercent.textContent = "0.0%";
    if (outBiggest) outBiggest.textContent = "—";
    if (outAnnual) outAnnual.textContent = cur + "0.00";
    if (outEmergency) outEmergency.textContent = "—";
    if (outRule) {
      outRule.textContent =
        "Enter your monthly take-home income above to see your 50/30/20 budget targets.";
    }
    statusEl.textContent = message;
    hasCalculated = false;
    if (submitBtn) {
      submitBtn.textContent = "Calculate monthly expenses";
    }
  }

  function hasAnyInput() {
    if (incomeInput && incomeInput.value.trim() !== "") {
      return true;
    }
    return expenseFields.some(function (field) {
      return readRaw(field.id) !== "";
    });
  }

  function calculate(showEmptyError) {
    var cur = getCurrency();
    var incomeData = parseField("monthly-income");

    if (!incomeData.valid) {
      clearOutputs("Please enter 0 or a positive amount. Negative values are not supported.");
      return;
    }

    var totalExpenses = 0;
    var anyExpenseFilled = false;
    var biggestLabel = "";
    var biggestValue = 0;

    for (var i = 0; i < expenseFields.length; i++) {
      var field = expenseFields[i];
      var parsed = parseField(field.id);

      if (!parsed.valid) {
        clearOutputs("Please enter 0 or a positive amount. Negative values are not supported.");
        return;
      }

      if (parsed.filled) {
        anyExpenseFilled = true;
      }

      totalExpenses += parsed.value;

      if (parsed.value > biggestValue) {
        biggestValue = parsed.value;
        biggestLabel = field.label;
      }
    }

    if (!incomeData.filled && !anyExpenseFilled) {
      if (showEmptyError) {
        clearOutputs("Enter monthly income or at least one expense amount to calculate.");
      } else {
        clearOutputs("Enter monthly income or expenses, then calculate to see your summary.");
      }
      return;
    }

    var income = incomeData.value;
    var annualExpenses = totalExpenses * 12;
    var emergencyLow = totalExpenses * 3;
    var emergencyHigh = totalExpenses * 6;

    if (outTotal) outTotal.textContent = formatMoney(cur, totalExpenses);
    if (outAnnual) outAnnual.textContent = formatMoney(cur, annualExpenses);

    if (outEmergency) {
      outEmergency.textContent =
        totalExpenses > 0
          ? formatWholeMoney(cur, emergencyLow) + " – " + formatWholeMoney(cur, emergencyHigh)
          : "—";
    }

    if (outBiggest) {
      outBiggest.textContent =
        biggestValue > 0
          ? biggestLabel + " (" + formatMoney(cur, biggestValue) + ")"
          : "None";
    }

    if (income > 0) {
      var remaining = income - totalExpenses;
      var expensePct = (totalExpenses / income) * 100;
      var savingsPct = Math.max(0, (remaining / income) * 100);

      if (outRemaining) outRemaining.textContent = formatMoney(cur, remaining);
      if (outPercent) outPercent.textContent = expensePct.toFixed(1) + "%";

      if (outRule) {
        outRule.textContent =
          "50% Needs: " +
          formatMoney(cur, income * 0.5) +
          " · 30% Wants: " +
          formatMoney(cur, income * 0.3) +
          " · 20% Savings/Debt: " +
          formatMoney(cur, income * 0.2);
      }

      if (remaining < 0) {
        statusEl.textContent =
          "Expenses exceed take-home income by " +
          formatMoney(cur, Math.abs(remaining)) +
          " per month.";
      } else if (remaining === 0) {
        statusEl.textContent =
          "Zero-based balance: your monthly expenses match your take-home income exactly.";
      } else {
        statusEl.textContent =
          "You have " +
          formatMoney(cur, remaining) +
          " left over (" +
          savingsPct.toFixed(1) +
          "% of take-home pay) for savings or extra goals.";
      }
    } else {
      if (outRemaining) {
        outRemaining.textContent = incomeData.filled ? formatMoney(cur, -totalExpenses) : "Needs income";
      }
      if (outPercent) outPercent.textContent = "Needs income";
      if (outRule) {
        outRule.textContent =
          "Enter your monthly take-home income above to see your 50/30/20 budget targets.";
      }
      statusEl.textContent =
        "Total monthly bills calculated. Add monthly take-home income to see remaining balance and 50/30/20 targets.";
    }

    hasCalculated = true;
    if (submitBtn) {
      submitBtn.textContent = "Calculated ✓";
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    calculate(true);
  });

  function handleLiveChange() {
    if (hasAnyInput()) {
      calculate(false);
    } else if (hasCalculated) {
      clearOutputs("Enter monthly income or expenses, then calculate to see your summary.");
    } else {
      var cur = getCurrency();
      if (outTotal) outTotal.textContent = cur + "0.00";
      if (outRemaining) outRemaining.textContent = cur + "0.00";
      if (outAnnual) outAnnual.textContent = cur + "0.00";
    }
  }

  form.addEventListener("input", handleLiveChange);
  form.addEventListener("change", handleLiveChange);

  form.addEventListener("reset", function () {
    window.setTimeout(function () {
      clearOutputs("Enter monthly income or expenses, then calculate to see your summary.");
    }, 0);
  });

  if (resetButton && resetButton.type !== "reset") {
    resetButton.addEventListener("click", function () {
      form.reset();
      clearOutputs("Enter monthly income or expenses, then calculate to see your summary.");
    });
  }

  clearOutputs("Enter monthly income or expenses, then calculate to see your summary.");
})();

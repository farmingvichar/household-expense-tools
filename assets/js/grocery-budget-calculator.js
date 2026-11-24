(function () {
  "use strict";

  var form = document.getElementById("groceryBudgetForm");
  if (!form) return;

  var currencySelect = document.getElementById("currencySymbol");
  var monthlyBudgetInput = document.getElementById("monthlyBudget");
  var alreadySpentInput = document.getElementById("alreadySpent");
  var daysLeftInput = document.getElementById("daysLeft");
  var householdSizeInput = document.getElementById("householdSize");
  var submitBtn = form.querySelector('button[type="submit"]');

  var statusEl = document.getElementById("groceryBudgetStatus");
  var outRemaining = document.getElementById("remainingBudget");
  var outDaily = document.getElementById("dailyLimit");
  var outWeekly = document.getElementById("weeklyLimit");
  var outPercent = document.getElementById("budgetUsedPercentage");
  var outPerPerson = document.getElementById("perPersonBudget");

  var hasCalculated = false;

  function getCurrency() {
    return currencySelect && currencySelect.value ? currencySelect.value : "$";
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

  function formatPercentage(value) {
    var rounded = Math.round(value * 10) / 10;
    return (Number.isInteger(rounded) ? rounded : rounded.toFixed(1)) + "%";
  }

  function clearOutputs(message) {
    var cur = getCurrency();
    if (outRemaining) outRemaining.textContent = cur + "0.00";
    if (outDaily) outDaily.textContent = cur + "0.00";
    if (outWeekly) outWeekly.textContent = cur + "0.00";
    if (outPercent) outPercent.textContent = "0%";
    if (outPerPerson) {
      outPerPerson.textContent = "Add household size above to see per-person monthly and remaining amounts.";
    }
    if (statusEl) statusEl.textContent = message;
    hasCalculated = false;
    if (submitBtn) submitBtn.textContent = "Calculate budget";
  }

  function isReady() {
    return (
      monthlyBudgetInput.value.trim() !== "" &&
      daysLeftInput.value.trim() !== ""
    );
  }

  function calculate(showErrors) {
    var cur = getCurrency();
    var rawBudget = monthlyBudgetInput.value.trim();
    var rawSpent = alreadySpentInput.value.trim();
    var rawDays = daysLeftInput.value.trim();
    var rawSize = householdSizeInput ? householdSizeInput.value.trim() : "";

    if (rawBudget === "" || rawDays === "") {
      if (showErrors) {
        clearOutputs("Please enter your monthly grocery budget and days left in the month.");
      } else {
        clearOutputs("Enter your monthly grocery budget and days left to calculate.");
      }
      return;
    }

    var monthlyBudget = Number(rawBudget);
    var alreadySpent = rawSpent === "" ? 0 : Number(rawSpent);
    var daysLeft = Number(rawDays);
    var householdSize = rawSize === "" ? null : Number(rawSize);

    if (!Number.isFinite(monthlyBudget) || monthlyBudget <= 0) {
      clearOutputs("Monthly grocery budget must be greater than 0.");
      return;
    }
    if (!Number.isFinite(alreadySpent) || alreadySpent < 0) {
      clearOutputs("Already spent amount cannot be negative.");
      return;
    }
    if (!Number.isFinite(daysLeft) || daysLeft < 1 || daysLeft > 31 || !Number.isInteger(daysLeft)) {
      clearOutputs("Days left must be a whole number between 1 and 31.");
      return;
    }
    if (householdSize !== null && (!Number.isFinite(householdSize) || householdSize < 1 || householdSize > 20 || !Number.isInteger(householdSize))) {
      clearOutputs("Household size must be a whole number between 1 and 20 (or leave blank).");
      return;
    }

    var remaining = monthlyBudget - alreadySpent;
    var dailyLimit = remaining / daysLeft;
    var weeklyLimit = daysLeft >= 7 ? dailyLimit * 7 : remaining;
    var usedPct = (alreadySpent / monthlyBudget) * 100;

    if (outRemaining) outRemaining.textContent = formatMoney(cur, remaining);
    if (outDaily) outDaily.textContent = formatMoney(cur, dailyLimit);
    if (outWeekly) {
      outWeekly.textContent =
        daysLeft >= 7
          ? formatMoney(cur, weeklyLimit)
          : formatMoney(cur, weeklyLimit) + " (" + daysLeft + "d left)";
    }
    if (outPercent) outPercent.textContent = formatPercentage(usedPct);

    if (outPerPerson) {
      if (householdSize !== null && householdSize >= 1) {
        var perPersonMonthly = monthlyBudget / householdSize;
        var perPersonRemaining = remaining / householdSize;
        outPerPerson.textContent =
          formatMoney(cur, perPersonMonthly) +
          "/month per person · " +
          formatMoney(cur, perPersonRemaining) +
          " left per person (" +
          householdSize +
          (householdSize === 1 ? " person)" : " people)");
      } else {
        outPerPerson.textContent =
          "Add optional household size above to see your per-person monthly and remaining budget.";
      }
    }

    if (alreadySpent > monthlyBudget) {
      statusEl.textContent =
        "Over budget by " +
        formatMoney(cur, Math.abs(remaining)) +
        " with " +
        daysLeft +
        (daysLeft === 1 ? " day" : " days") +
        " left in the month.";
    } else if (alreadySpent === monthlyBudget) {
      statusEl.textContent = "Your monthly grocery budget is fully used (100%).";
    } else {
      statusEl.textContent =
        "You have " +
        formatMoney(cur, remaining) +
        " left (" +
        formatMoney(cur, dailyLimit) +
        "/day) for the next " +
        daysLeft +
        (daysLeft === 1 ? " day." : " days.");
    }

    hasCalculated = true;
    if (submitBtn) submitBtn.textContent = "Calculated ✓";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    calculate(true);
  });

  function handleLiveChange() {
    if (isReady()) {
      calculate(false);
    } else if (hasCalculated) {
      clearOutputs("Enter your monthly grocery budget and days left to calculate.");
    } else {
      var cur = getCurrency();
      if (outRemaining) outRemaining.textContent = cur + "0.00";
      if (outDaily) outDaily.textContent = cur + "0.00";
      if (outWeekly) outWeekly.textContent = cur + "0.00";
    }
  }

  form.addEventListener("input", handleLiveChange);
  form.addEventListener("change", handleLiveChange);

  form.addEventListener("reset", function () {
    window.setTimeout(function () {
      clearOutputs("Enter your monthly grocery budget and days left to calculate.");
    }, 0);
  });

  clearOutputs("Enter your monthly grocery budget and days left to calculate.");
})();

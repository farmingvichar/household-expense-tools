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
  var btnTimer = null;

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

  function setButtonLabel(text) {
    if (!submitBtn) return;
    if (btnTimer) {
      window.clearTimeout(btnTimer);
      btnTimer = null;
    }
    submitBtn.textContent = text;
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
    setButtonLabel("Calculate budget");
  }

  function isReady() {
    return (
      monthlyBudgetInput.value.trim() !== "" &&
      daysLeftInput.value.trim() !== ""
    );
  }

  function calculate(fromButtonClick) {
    var cur = getCurrency();
    var rawBudget = monthlyBudgetInput.value.trim();
    var rawSpent = alreadySpentInput.value.trim();
    var rawDays = daysLeftInput.value.trim();
    var rawSize = householdSizeInput ? householdSizeInput.value.trim() : "";

    if (rawBudget === "" || rawDays === "") {
      if (fromButtonClick) {
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
      clearOutputs("Enter your monthly grocery budget above (greater than 0) to calculate.");
      if (fromButtonClick) monthlyBudgetInput.focus();
      return;
    }
    if (!Number.isFinite(alreadySpent) || alreadySpent < 0) {
      clearOutputs("Already spent amount cannot be negative (enter 0 or leave blank).");
      if (fromButtonClick) alreadySpentInput.focus();
      return;
    }
    if (!Number.isFinite(daysLeft) || daysLeft < 1 || daysLeft > 365 || !Number.isInteger(daysLeft)) {
      clearOutputs("Days left must be a whole number between 1 and 365.");
      if (fromButtonClick) daysLeftInput.focus();
      return;
    }

    var validHouseholdSize =
      householdSize !== null &&
      Number.isFinite(householdSize) &&
      householdSize >= 1 &&
      householdSize <= 999 &&
      Number.isInteger(householdSize);

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
      if (validHouseholdSize) {
        var perPersonMonthly = monthlyBudget / householdSize;
        var perPersonRemaining = remaining / householdSize;
        outPerPerson.textContent =
          formatMoney(cur, perPersonMonthly) +
          "/month per person · " +
          formatMoney(cur, perPersonRemaining) +
          " left per person (" +
          householdSize +
          (householdSize === 1 ? " person)" : " people)");
      } else if (householdSize !== null) {
        outPerPerson.textContent =
          "Enter a whole number from 1 to 999 above to see per-person cost (or leave blank).";
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

    if (fromButtonClick && submitBtn) {
      if (submitBtn.textContent === "Calculated ✓") {
        setButtonLabel("Updated ✓");
        btnTimer = window.setTimeout(function () {
          submitBtn.textContent = "Calculated ✓";
        }, 900);
      } else {
        setButtonLabel("Calculated ✓");
      }
    } else {
      setButtonLabel("Calculate budget");
    }
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
      setButtonLabel("Calculate budget");
    }
  }

    var chipButtons = form.querySelectorAll("[data-chip-target]");

  function syncChipStates() {
    var cur = getCurrency();
    chipButtons.forEach(function (btn) {
      var targetId = btn.getAttribute("data-chip-target");
      var chipVal = btn.getAttribute("data-chip-value");
      var targetEl = document.getElementById(targetId);

      if (targetId === "monthlyBudget") {
        btn.textContent = cur + Number(chipVal).toLocaleString("en-US");
      }

      var isActive = targetEl && targetEl.value.trim() === chipVal;
      btn.classList.toggle("button-primary", Boolean(isActive));
      btn.classList.toggle("button-secondary", !isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  chipButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var targetId = btn.getAttribute("data-chip-target");
      var chipVal = btn.getAttribute("data-chip-value");
      var targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      targetEl.value = chipVal;
      syncChipStates();
      handleLiveChange();
    });
  });

  form.addEventListener("input", function () {
    syncChipStates();
    handleLiveChange();
  });

  form.addEventListener("change", function () {
    syncChipStates();
    handleLiveChange();
  });

  form.addEventListener("reset", function (e) {
    var hasData =
      monthlyBudgetInput.value.trim() !== "" ||
      alreadySpentInput.value.trim() !== "" ||
      daysLeftInput.value.trim() !== "" ||
      (householdSizeInput && householdSizeInput.value.trim() !== "");

    if (hasData && !window.confirm("Clear all entered grocery budget numbers?")) {
      e.preventDefault();
      return;
    }

    window.setTimeout(function () {
      syncChipStates();
      clearOutputs("All numbers cleared. Enter your monthly grocery budget and days left to calculate.");
    }, 0);
  });

  syncChipStates();
  clearOutputs("Enter your monthly grocery budget and days left to calculate.");
})();

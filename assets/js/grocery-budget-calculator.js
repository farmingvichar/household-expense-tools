"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("groceryBudgetForm");
  const currencySymbolInput = document.getElementById("currencySymbol");
  const monthlyBudgetInput = document.getElementById("monthlyBudget");
  const alreadySpentInput = document.getElementById("alreadySpent");
  const daysLeftInput = document.getElementById("daysLeft");
  const statusMessage = document.getElementById("groceryBudgetStatus");
  const remainingBudgetOutput = document.getElementById("remainingBudget");
  const dailyLimitOutput = document.getElementById("dailyLimit");
  const budgetUsedPercentageOutput = document.getElementById("budgetUsedPercentage");

  if (
    !form ||
    !currencySymbolInput ||
    !monthlyBudgetInput ||
    !alreadySpentInput ||
    !daysLeftInput ||
    !statusMessage ||
    !remainingBudgetOutput ||
    !dailyLimitOutput ||
    !budgetUsedPercentageOutput
  ) {
    return;
  }

  function formatMoney(symbol, amount) {
    const cleanAmount = Math.abs(amount).toFixed(2);

    if (amount < 0) {
      return "-" + symbol + cleanAmount;
    }

    return symbol + cleanAmount;
  }

  function formatPercentage(value) {
    const roundedValue = Math.round(value * 10) / 10;

    if (Number.isInteger(roundedValue)) {
      return roundedValue.toString() + "%";
    }

    return roundedValue.toFixed(1) + "%";
  }

  function resetResults() {
    remainingBudgetOutput.textContent = "0.00";
    dailyLimitOutput.textContent = "0.00";
    budgetUsedPercentageOutput.textContent = "0%";
    statusMessage.textContent = "Enter your grocery details and calculate your budget.";
  }

  function clearResultsForError(message) {
    remainingBudgetOutput.textContent = "0.00";
    dailyLimitOutput.textContent = "0.00";
    budgetUsedPercentageOutput.textContent = "0%";
    statusMessage.textContent = message;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const currencySymbol = currencySymbolInput.value.trim();
    const monthlyBudgetValue = monthlyBudgetInput.value.trim();
    const alreadySpentValue = alreadySpentInput.value.trim();
    const daysLeftValue = daysLeftInput.value.trim();

    const monthlyBudget = Number(monthlyBudgetValue);
    const alreadySpent = Number(alreadySpentValue);
    const daysLeft = Number(daysLeftValue);

    if (currencySymbol === "") {
      clearResultsForError("Please select a currency symbol.");
      return;
    }

    if (monthlyBudgetValue === "" || !Number.isFinite(monthlyBudget) || monthlyBudget <= 0) {
      clearResultsForError("Please enter a monthly grocery budget greater than 0.");
      return;
    }

    if (alreadySpentValue === "" || !Number.isFinite(alreadySpent) || alreadySpent < 0) {
      clearResultsForError("Please enter an already spent amount of 0 or greater.");
      return;
    }

    if (
  daysLeftValue === "" ||
  !Number.isFinite(daysLeft) ||
  daysLeft < 1 ||
  daysLeft > 31 ||
  !Number.isInteger(daysLeft)
) {
  clearResultsForError("Please enter days left as a whole number between 1 and 31.");
  return;
}

    const remainingBudget = monthlyBudget - alreadySpent;
    const dailySpendingLimit = remainingBudget / daysLeft;
    const budgetUsedPercentage = (alreadySpent / monthlyBudget) * 100;

    remainingBudgetOutput.textContent = formatMoney(currencySymbol, remainingBudget);
    dailyLimitOutput.textContent = formatMoney(currencySymbol, dailySpendingLimit);
    budgetUsedPercentageOutput.textContent = formatPercentage(budgetUsedPercentage);

    if (alreadySpent > monthlyBudget) {
      statusMessage.textContent = "You are over your grocery budget. The remaining budget is negative.";
      return;
    }

    if (alreadySpent === monthlyBudget) {
      statusMessage.textContent = "Your grocery budget is fully used.";
      return;
    }

    statusMessage.textContent = "Grocery budget calculated successfully.";
  });

  form.addEventListener("reset", function () {
    window.setTimeout(resetResults, 0);
  });

  resetResults();
});

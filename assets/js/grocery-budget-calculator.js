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

  if (!form || !currencySymbolInput || !monthlyBudgetInput || !alreadySpentInput || !daysLeftInput) return;

  // स्मार्ट कॉमा फ़ॉर्मेटिंग (e.g., 1,250.00)
  function formatMoney(symbol, amount) {
    const cleanAmount = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return (amount < 0 ? "-" : "") + symbol + cleanAmount;
  }

  function formatPercentage(value) {
    const roundedValue = Math.round(value * 10) / 10;
    return (Number.isInteger(roundedValue) ? roundedValue : roundedValue.toFixed(1)) + "%";
  }

  function resetResults() {
    remainingBudgetOutput.textContent = "0.00";
    dailyLimitOutput.textContent = "0.00";
    budgetUsedPercentageOutput.textContent = "0%";
    statusMessage.textContent = "Start typing to see your budget calculate automatically.";
  }

  function clearResultsForError(message) {
    remainingBudgetOutput.textContent = "0.00";
    dailyLimitOutput.textContent = "0.00";
    budgetUsedPercentageOutput.textContent = "0%";
    statusMessage.textContent = message;
  }

  // लाइव कैलकुलेशन फंक्शन
  function calculateLive() {
    const currencySymbol = currencySymbolInput.value.trim();
    const monthlyBudgetValue = monthlyBudgetInput.value.trim();
    const alreadySpentValue = alreadySpentInput.value.trim();
    const daysLeftValue = daysLeftInput.value.trim();

    // अगर कोई भी फ़ील्ड खाली है, तो रिसेट स्टेट में रखें
    if (!monthlyBudgetValue || !alreadySpentValue || !daysLeftValue) {
      resetResults();
      return;
    }

    const monthlyBudget = Number(monthlyBudgetValue);
    const alreadySpent = Number(alreadySpentValue);
    const daysLeft = Number(daysLeftValue);

    if (monthlyBudget <= 0) {
      clearResultsForError("Monthly budget must be greater than 0.");
      return;
    }
    if (alreadySpent < 0) {
      clearResultsForError("Already spent amount cannot be negative.");
      return;
    }
    if (daysLeft < 1 || daysLeft > 31 || !Number.isInteger(daysLeft)) {
      clearResultsForError("Days left must be a whole number between 1 and 31.");
      return;
    }

    const remainingBudget = monthlyBudget - alreadySpent;
    const dailySpendingLimit = remainingBudget / daysLeft;
    const budgetUsedPercentage = (alreadySpent / monthlyBudget) * 100;

    remainingBudgetOutput.textContent = formatMoney(currencySymbol, remainingBudget);
    dailyLimitOutput.textContent = formatMoney(currencySymbol, dailySpendingLimit);
    budgetUsedPercentageOutput.textContent = formatPercentage(budgetUsedPercentage);

    if (alreadySpent > monthlyBudget) {
      statusMessage.textContent = "⚠️ You are over your grocery budget.";
    } else if (alreadySpent === monthlyBudget) {
      statusMessage.textContent = "Your grocery budget is fully used.";
    } else {
      statusMessage.textContent = "Budget updated successfully.";
    }
  }

  // हर कीस्ट्रोक (Type करने) पर लाइव अपडेट
  form.addEventListener("input", calculateLive);
  
  // एंटर दबाने पर पेज रीफ्रेश होने से रोकना
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    calculateLive();
  });

  form.addEventListener("reset", function () {
    window.setTimeout(resetResults, 0);
  });

  resetResults();
});

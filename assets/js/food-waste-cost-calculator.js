"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("foodWasteForm");
  const currencySymbolInput = document.getElementById("currencySymbol");
  const totalCostInput = document.getElementById("totalCost");
  const quantityUnitInput = document.getElementById("quantityUnit");
  const totalQuantityInput = document.getElementById("totalQuantity");
  const wastedQuantityInput = document.getElementById("wastedQuantity");
  const statusMessage = document.getElementById("foodWasteStatus");
  const wastedValueOutput = document.getElementById("wastedValue");
  const usedValueOutput = document.getElementById("usedValue");
  const wastedPercentageOutput = document.getElementById("wastedPercentage");

  if (
    !form ||
    !currencySymbolInput ||
    !totalCostInput ||
    !quantityUnitInput ||
    !totalQuantityInput ||
    !wastedQuantityInput ||
    !statusMessage ||
    !wastedValueOutput ||
    !usedValueOutput ||
    !wastedPercentageOutput
  ) {
    return;
  }

  function formatMoney(symbol, amount) {
    const cleanAmount = Math.abs(amount).toLocaleString("en-US", {
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
    wastedValueOutput.textContent = "0.00";
    usedValueOutput.textContent = "0.00";
    wastedPercentageOutput.textContent = "0%";
    statusMessage.textContent = "Enter your food cost and quantity details to estimate the wasted value.";
  }

  function clearResultsForError(message) {
    wastedValueOutput.textContent = "0.00";
    usedValueOutput.textContent = "0.00";
    wastedPercentageOutput.textContent = "0%";
    statusMessage.textContent = message;
  }

  function calculateFoodWaste(isExplicitSubmit = false) {
    const currencySymbol = currencySymbolInput.value.trim();
    const quantityUnit = quantityUnitInput.value.trim();
    const totalCostValue = totalCostInput.value.trim();
    const totalQuantityValue = totalQuantityInput.value.trim();
    const wastedQuantityValue = wastedQuantityInput.value.trim();

    // जब तक अनिवार्य फील्ड न भरे हों, टाइप करते समय शांत रहें
    if (!totalCostValue || !totalQuantityValue || !wastedQuantityValue) {
      if (isExplicitSubmit) {
        if (!currencySymbol) {
          clearResultsForError("Please select a currency symbol.");
          return;
        }
        if (!quantityUnit) {
          clearResultsForError("Please select a quantity unit.");
          return;
        }
        if (!totalCostValue) {
          clearResultsForError("Please enter the total food or item cost.");
          return;
        }
        if (!totalQuantityValue) {
          clearResultsForError("Please enter the total quantity bought.");
          return;
        }
        if (!wastedQuantityValue) {
          clearResultsForError("Please enter the wasted quantity.");
          return;
        }
      } else {
        resetResults();
      }
      return;
    }

    const totalCost = Number(totalCostValue);
    const totalQuantity = Number(totalQuantityValue);
    const wastedQuantity = Number(wastedQuantityValue);

    if (!Number.isFinite(totalCost) || totalCost <= 0) {
      if (isExplicitSubmit) clearResultsForError("Total food or item cost must be greater than 0.");
      return;
    }

    if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) {
      if (isExplicitSubmit) clearResultsForError("Total quantity bought must be greater than 0.");
      return;
    }

    if (!Number.isFinite(wastedQuantity) || wastedQuantity < 0) {
      if (isExplicitSubmit) clearResultsForError("Wasted quantity must be 0 or greater.");
      return;
    }

    if (wastedQuantity > totalQuantity) {
      clearResultsForError("Wasted quantity cannot be greater than total quantity.");
      return;
    }

    const wastedPercentage = (wastedQuantity / totalQuantity) * 100;
    const estimatedWastedValue = (totalCost * wastedQuantity) / totalQuantity;
    const estimatedUsedValue = totalCost - estimatedWastedValue;

    wastedValueOutput.textContent = formatMoney(currencySymbol, estimatedWastedValue);
    usedValueOutput.textContent = formatMoney(currencySymbol, estimatedUsedValue);
    wastedPercentageOutput.textContent = formatPercentage(wastedPercentage);

    if (wastedQuantity === 0) {
      statusMessage.textContent = "No wasted quantity entered. Estimated wasted value is zero.";
    } else if (wastedQuantity === totalQuantity) {
      statusMessage.textContent = "All entered quantity is marked as wasted.";
    } else {
      statusMessage.textContent = "Food waste cost calculated successfully.";
    }
  }

  // लाइव कैलकुलेशन: टाइप करते ही रिजल्ट अपडेट
  form.addEventListener("input", function () {
    calculateFoodWaste(false);
  });

  // सेलेक्ट बॉक्स बदलने पर अपडेट
  currencySymbolInput.addEventListener("change", function () {
    calculateFoodWaste(false);
  });
  quantityUnitInput.addEventListener("change", function () {
    calculateFoodWaste(false);
  });

  // फॉर्म सबमिट (बटन क्लिक या कीबोर्ड एंटर)
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    calculateFoodWaste(true);
  });

  form.addEventListener("reset", function () {
    window.setTimeout(resetResults, 0);
  });

  resetResults();
});

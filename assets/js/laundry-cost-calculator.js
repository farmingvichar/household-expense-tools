"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("laundryCostForm");
  const currencySymbolInput = document.getElementById("currencySymbol");
  const loadsPerWeekInput = document.getElementById("loadsPerWeek");
  const washerCostInput = document.getElementById("washerCost");
  const dryerCostInput = document.getElementById("dryerCost");
  const suppliesCostInput = document.getElementById("suppliesCost");
  const waterCostInput = document.getElementById("waterCost");
  const otherCostInput = document.getElementById("otherCost");
  const statusMessage = document.getElementById("laundryCostStatus");
  const costPerLoadOutput = document.getElementById("costPerLoad");
  const weeklyLaundryCostOutput = document.getElementById("weeklyLaundryCost");
  const monthlyLaundryCostOutput = document.getElementById("monthlyLaundryCost");
  const yearlyLaundryCostOutput = document.getElementById("yearlyLaundryCost");
  const largestCostPartOutput = document.getElementById("largestCostPart");

  if (
    !form ||
    !currencySymbolInput ||
    !loadsPerWeekInput ||
    !washerCostInput ||
    !dryerCostInput ||
    !suppliesCostInput ||
    !waterCostInput ||
    !otherCostInput ||
    !statusMessage ||
    !costPerLoadOutput ||
    !weeklyLaundryCostOutput ||
    !monthlyLaundryCostOutput ||
    !yearlyLaundryCostOutput ||
    !largestCostPartOutput
  ) {
    return;
  }

  const calculateButton = form.querySelector('button[type="submit"]');
  let hasCalculated = false;

  function formatMoney(symbol, amount) {
    return symbol + amount.toFixed(2);
  }

  function formatLoads(value) {
    const roundedValue = Math.round(value * 100) / 100;

    if (Number.isInteger(roundedValue)) {
      return roundedValue.toString();
    }

    return roundedValue.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function resetResults() {
    costPerLoadOutput.textContent = "0.00";
    weeklyLaundryCostOutput.textContent = "0.00";
    monthlyLaundryCostOutput.textContent = "0.00";
    yearlyLaundryCostOutput.textContent = "0.00";
    largestCostPartOutput.textContent = "—";
    statusMessage.textContent = "Enter your laundry costs to estimate total laundry spending.";
    hasCalculated = false;

    if (calculateButton) {
      calculateButton.textContent = "Calculate laundry cost";
    }
  }

  function clearResultsForError(message) {
    costPerLoadOutput.textContent = "0.00";
    weeklyLaundryCostOutput.textContent = "0.00";
    monthlyLaundryCostOutput.textContent = "0.00";
    yearlyLaundryCostOutput.textContent = "0.00";
    largestCostPartOutput.textContent = "—";
    statusMessage.textContent = message;
    hasCalculated = false;

    if (calculateButton) {
      calculateButton.textContent = "Calculate laundry cost";
    }
  }

  function getRequiredNumber(input, emptyMessage, invalidMessage) {
    const rawValue = input.value.trim();

    if (rawValue === "") {
      return {
        isValid: false,
        message: emptyMessage,
        value: 0
      };
    }

    const numberValue = Number(rawValue);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      return {
        isValid: false,
        message: invalidMessage,
        value: 0
      };
    }

    return {
      isValid: true,
      message: "",
      value: numberValue
    };
  }

  function getOptionalNumber(input, invalidMessage) {
    const rawValue = input.value.trim();

    if (rawValue === "") {
      return {
        isValid: true,
        message: "",
        value: 0
      };
    }

    const numberValue = Number(rawValue);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      return {
        isValid: false,
        message: invalidMessage,
        value: 0
      };
    }

    return {
      isValid: true,
      message: "",
      value: numberValue
    };
  }

  function getLargestCostPart(parts) {
    const largestValue = Math.max.apply(
      null,
      parts.map(function (part) {
        return part.value;
      })
    );

    if (largestValue === 0) {
      return "—";
    }

    const largestParts = parts.filter(function (part) {
      return part.value === largestValue;
    });

    if (largestParts.length > 1) {
      return "Multiple parts are tied";
    }

    return largestParts[0].label;
  }

  function markResultAsChanged() {
    if (!hasCalculated) {
      return;
    }

    statusMessage.textContent = "Values changed. Tap Calculate laundry cost to update the result.";

    if (calculateButton) {
      calculateButton.textContent = "Calculate laundry cost";
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const currencySymbol = currencySymbolInput.value.trim();
    const loadsPerWeekValue = loadsPerWeekInput.value.trim();
    const loadsPerWeek = Number(loadsPerWeekValue);

    if (currencySymbol === "") {
      clearResultsForError("Please select a currency symbol.");
      return;
    }

    if (loadsPerWeekValue === "") {
      clearResultsForError("Please enter loads per week.");
      return;
    }

    if (!Number.isFinite(loadsPerWeek) || loadsPerWeek <= 0) {
      clearResultsForError("Loads per week must be greater than 0.");
      return;
    }

    const washerCost = getRequiredNumber(
      washerCostInput,
      "Please enter washer cost per load.",
      "Washer cost must be 0 or greater."
    );

    if (!washerCost.isValid) {
      clearResultsForError(washerCost.message);
      return;
    }

    const dryerCost = getRequiredNumber(
      dryerCostInput,
      "Please enter dryer cost per load. Use 0 if you do not use a dryer.",
      "Dryer cost must be 0 or greater."
    );

    if (!dryerCost.isValid) {
      clearResultsForError(dryerCost.message);
      return;
    }

    const suppliesCost = getRequiredNumber(
      suppliesCostInput,
      "Please enter detergent or supplies cost per load.",
      "Detergent/supplies cost must be 0 or greater."
    );

    if (!suppliesCost.isValid) {
      clearResultsForError(suppliesCost.message);
      return;
    }

    const waterCost = getOptionalNumber(
      waterCostInput,
      "Water cost must be 0 or greater."
    );

    if (!waterCost.isValid) {
      clearResultsForError(waterCost.message);
      return;
    }

    const otherCost = getOptionalNumber(
      otherCostInput,
      "Other cost must be 0 or greater."
    );

    if (!otherCost.isValid) {
      clearResultsForError(otherCost.message);
      return;
    }

    const costParts = [
      { label: "Washer", value: washerCost.value },
      { label: "Dryer", value: dryerCost.value },
      { label: "Detergent/supplies", value: suppliesCost.value },
      { label: "Water", value: waterCost.value },
      { label: "Other", value: otherCost.value }
    ];

    const costPerLoadValue =
      washerCost.value +
      dryerCost.value +
      suppliesCost.value +
      waterCost.value +
      otherCost.value;

    if (costPerLoadValue <= 0) {
      clearResultsForError("At least one cost field must be greater than 0.");
      return;
    }

    const weeklyLaundryCostValue = costPerLoadValue * loadsPerWeek;
    const monthlyLaundryCostValue = weeklyLaundryCostValue * 4.345;
    const yearlyLaundryCostValue = weeklyLaundryCostValue * 52;
    const largestCostPartValue = getLargestCostPart(costParts);

    costPerLoadOutput.textContent = formatMoney(currencySymbol, costPerLoadValue);
    weeklyLaundryCostOutput.textContent = formatMoney(currencySymbol, weeklyLaundryCostValue);
    monthlyLaundryCostOutput.textContent = formatMoney(currencySymbol, monthlyLaundryCostValue);
    yearlyLaundryCostOutput.textContent = formatMoney(currencySymbol, yearlyLaundryCostValue);
    largestCostPartOutput.textContent = largestCostPartValue;

    statusMessage.textContent =
      "Calculated for " + formatLoads(loadsPerWeek) + " load" +
      (loadsPerWeek === 1 ? "" : "s") +
      " per week.";

    hasCalculated = true;

    if (calculateButton) {
      calculateButton.textContent = "Calculated ✓";
    }
  });

  form.addEventListener("input", markResultAsChanged);
  form.addEventListener("change", markResultAsChanged);

  form.addEventListener("reset", function () {
    window.setTimeout(resetResults, 0);
  });

  resetResults();
});

"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("toiletPaperValueForm");
  const currencySymbolInput = document.getElementById("currencySymbol");

  const packANameInput = document.getElementById("packAName");
  const packAPriceInput = document.getElementById("packAPrice");
  const packARollsInput = document.getElementById("packARolls");
  const packASheetsPerRollInput = document.getElementById("packASheetsPerRoll");
  const packAPlyInput = document.getElementById("packAPly");
  const packASquareFeetInput = document.getElementById("packASquareFeet");

  const packBNameInput = document.getElementById("packBName");
  const packBPriceInput = document.getElementById("packBPrice");
  const packBRollsInput = document.getElementById("packBRolls");
  const packBSheetsPerRollInput = document.getElementById("packBSheetsPerRoll");
  const packBPlyInput = document.getElementById("packBPly");
  const packBSquareFeetInput = document.getElementById("packBSquareFeet");

  const statusMessage = document.getElementById("toiletPaperValueStatus");

  const packATotalSheetsOutput = document.getElementById("packATotalSheets");
  const packBTotalSheetsOutput = document.getElementById("packBTotalSheets");

  const packACostPer100SheetsOutput = document.getElementById("packACostPer100Sheets");
  const packBCostPer100SheetsOutput = document.getElementById("packBCostPer100Sheets");

  const packACostPer100PlySheetsOutput = document.getElementById("packACostPer100PlySheets");
  const packBCostPer100PlySheetsOutput = document.getElementById("packBCostPer100PlySheets");

  const betterValueBySheetsOutput = document.getElementById("betterValueBySheets");
  const betterValueByPlyOutput = document.getElementById("betterValueByPly");

  const differencePer100SheetsOutput = document.getElementById("differencePer100Sheets");
  const differencePercentageOutput = document.getElementById("differencePercentage");
  const costPerSquareFootOutput = document.getElementById("costPerSquareFoot");

  if (
    !form ||
    !currencySymbolInput ||
    !packANameInput ||
    !packAPriceInput ||
    !packARollsInput ||
    !packASheetsPerRollInput ||
    !packAPlyInput ||
    !packASquareFeetInput ||
    !packBNameInput ||
    !packBPriceInput ||
    !packBRollsInput ||
    !packBSheetsPerRollInput ||
    !packBPlyInput ||
    !packBSquareFeetInput ||
    !statusMessage ||
    !packATotalSheetsOutput ||
    !packBTotalSheetsOutput ||
    !packACostPer100SheetsOutput ||
    !packBCostPer100SheetsOutput ||
    !packACostPer100PlySheetsOutput ||
    !packBCostPer100PlySheetsOutput ||
    !betterValueBySheetsOutput ||
    !betterValueByPlyOutput ||
    !differencePer100SheetsOutput ||
    !differencePercentageOutput ||
    !costPerSquareFootOutput
  ) {
    return;
  }

  const calculateButton = form.querySelector('button[type="submit"]');
  let hasCalculated = false;

  function formatMoney(symbol, amount) {
    return symbol + amount.toFixed(2);
  }

  function formatSheets(value) {
    return value.toLocaleString("en-US");
  }

  function formatPercentage(value) {
    return value.toFixed(1) + "%";
  }

  function resetResults() {
    packATotalSheetsOutput.textContent = "0";
    packBTotalSheetsOutput.textContent = "0";
    packACostPer100SheetsOutput.textContent = "0.00";
    packBCostPer100SheetsOutput.textContent = "0.00";
    packACostPer100PlySheetsOutput.textContent = "0.00";
    packBCostPer100PlySheetsOutput.textContent = "0.00";
    betterValueBySheetsOutput.textContent = "—";
    betterValueByPlyOutput.textContent = "—";
    differencePer100SheetsOutput.textContent = "0.00";
    differencePercentageOutput.textContent = "—";
    costPerSquareFootOutput.textContent = "—";
    statusMessage.textContent = "Enter two toilet paper packs to compare value.";
    hasCalculated = false;

    if (calculateButton) {
      calculateButton.textContent = "Compare toilet paper value";
    }
  }

  function clearResultsForError(message) {
    packATotalSheetsOutput.textContent = "0";
    packBTotalSheetsOutput.textContent = "0";
    packACostPer100SheetsOutput.textContent = "0.00";
    packBCostPer100SheetsOutput.textContent = "0.00";
    packACostPer100PlySheetsOutput.textContent = "0.00";
    packBCostPer100PlySheetsOutput.textContent = "0.00";
    betterValueBySheetsOutput.textContent = "—";
    betterValueByPlyOutput.textContent = "—";
    differencePer100SheetsOutput.textContent = "0.00";
    differencePercentageOutput.textContent = "—";
    costPerSquareFootOutput.textContent = "—";
    statusMessage.textContent = message;
    hasCalculated = false;

    if (calculateButton) {
      calculateButton.textContent = "Compare toilet paper value";
    }
  }

  function getDisplayName(inputValue, fallbackName) {
    const trimmedName = inputValue.trim();

    if (trimmedName === "") {
      return fallbackName;
    }

    return trimmedName;
  }

  function getRequiredPositiveNumber(input, emptyMessage, invalidMessage) {
    const rawValue = input.value.trim();

    if (rawValue === "") {
      return {
        isValid: false,
        message: emptyMessage,
        value: 0
      };
    }

    const numberValue = Number(rawValue);

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
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

  function getRequiredPositiveWholeNumber(input, emptyMessage, invalidMessage) {
    const result = getRequiredPositiveNumber(input, emptyMessage, invalidMessage);

    if (!result.isValid) {
      return result;
    }

    if (!Number.isInteger(result.value)) {
      return {
        isValid: false,
        message: invalidMessage,
        value: 0
      };
    }

    return result;
  }

  function getOptionalPositiveNumber(input, invalidMessage) {
    const rawValue = input.value.trim();

    if (rawValue === "") {
      return {
        isValid: true,
        message: "",
        value: null
      };
    }

    const numberValue = Number(rawValue);

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      return {
        isValid: false,
        message: invalidMessage,
        value: null
      };
    }

    return {
      isValid: true,
      message: "",
      value: numberValue
    };
  }

  function getBetterValue(labelA, valueA, labelB, valueB) {
    const difference = Math.abs(valueA - valueB);

    if (difference < 0.000001) {
      return "Both packs are tied.";
    }

    if (valueA < valueB) {
      return labelA + " is cheaper.";
    }

    return labelB + " is cheaper.";
  }

  function getSquareFootText(symbol, labelA, squareFeetA, priceA, labelB, squareFeetB, priceB) {
    const hasA = squareFeetA !== null;
    const hasB = squareFeetB !== null;

    if (!hasA && !hasB) {
      return "—";
    }

    if (hasA && !hasB) {
      return labelA + ": " + formatMoney(symbol, priceA / squareFeetA) + "/sq ft. Add " + labelB + " square feet to compare.";
    }

    if (!hasA && hasB) {
      return labelB + ": " + formatMoney(symbol, priceB / squareFeetB) + "/sq ft. Add " + labelA + " square feet to compare.";
    }

    const costA = priceA / squareFeetA;
    const costB = priceB / squareFeetB;
    const difference = Math.abs(costA - costB);
    let cheaperText = "Both packs are tied per sq ft.";

    if (difference >= 0.000001) {
      cheaperText = costA < costB ? labelA + " is cheaper." : labelB + " is cheaper.";
    }

    return (
      labelA +
      ": " +
      formatMoney(symbol, costA) +
      "/sq ft · " +
      labelB +
      ": " +
      formatMoney(symbol, costB) +
      "/sq ft · " +
      cheaperText
    );
  }

  function markResultAsChanged() {
    if (!hasCalculated) {
      return;
    }

    statusMessage.textContent = "Values changed. Tap Compare toilet paper value to update the result.";

    if (calculateButton) {
      calculateButton.textContent = "Compare toilet paper value";
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const currencySymbol = currencySymbolInput.value.trim();

    if (currencySymbol === "") {
      clearResultsForError("Please select a currency symbol.");
      return;
    }

    const packAName = getDisplayName(packANameInput.value, "Pack A");
    const packBName = getDisplayName(packBNameInput.value, "Pack B");

    const packAPrice = getRequiredPositiveNumber(
      packAPriceInput,
      "Please enter Pack A final price.",
      "Pack A final price must be greater than 0."
    );

    if (!packAPrice.isValid) {
      clearResultsForError(packAPrice.message);
      return;
    }

    const packARolls = getRequiredPositiveWholeNumber(
      packARollsInput,
      "Please enter Pack A rolls.",
      "Pack A rolls must be a whole number greater than 0."
    );

    if (!packARolls.isValid) {
      clearResultsForError(packARolls.message);
      return;
    }

    const packASheetsPerRoll = getRequiredPositiveWholeNumber(
      packASheetsPerRollInput,
      "Please enter Pack A sheets per roll.",
      "Pack A sheets per roll must be a whole number greater than 0."
    );

    if (!packASheetsPerRoll.isValid) {
      clearResultsForError(packASheetsPerRoll.message);
      return;
    }

    const packAPly = getRequiredPositiveWholeNumber(
      packAPlyInput,
      "Please enter Pack A ply.",
      "Pack A ply must be a whole number greater than 0."
    );

    if (!packAPly.isValid) {
      clearResultsForError(packAPly.message);
      return;
    }

    const packASquareFeet = getOptionalPositiveNumber(
      packASquareFeetInput,
      "Pack A total square feet must be greater than 0."
    );

    if (!packASquareFeet.isValid) {
      clearResultsForError(packASquareFeet.message);
      return;
    }

    const packBPrice = getRequiredPositiveNumber(
      packBPriceInput,
      "Please enter Pack B final price.",
      "Pack B final price must be greater than 0."
    );

    if (!packBPrice.isValid) {
      clearResultsForError(packBPrice.message);
      return;
    }

    const packBRolls = getRequiredPositiveWholeNumber(
      packBRollsInput,
      "Please enter Pack B rolls.",
      "Pack B rolls must be a whole number greater than 0."
    );

    if (!packBRolls.isValid) {
      clearResultsForError(packBRolls.message);
      return;
    }

    const packBSheetsPerRoll = getRequiredPositiveWholeNumber(
      packBSheetsPerRollInput,
      "Please enter Pack B sheets per roll.",
      "Pack B sheets per roll must be a whole number greater than 0."
    );

    if (!packBSheetsPerRoll.isValid) {
      clearResultsForError(packBSheetsPerRoll.message);
      return;
    }

    const packBPly = getRequiredPositiveWholeNumber(
      packBPlyInput,
      "Please enter Pack B ply.",
      "Pack B ply must be a whole number greater than 0."
    );

    if (!packBPly.isValid) {
      clearResultsForError(packBPly.message);
      return;
    }

    const packBSquareFeet = getOptionalPositiveNumber(
      packBSquareFeetInput,
      "Pack B total square feet must be greater than 0."
    );

    if (!packBSquareFeet.isValid) {
      clearResultsForError(packBSquareFeet.message);
      return;
    }

    const packATotalSheets = packARolls.value * packASheetsPerRoll.value;
    const packBTotalSheets = packBRolls.value * packBSheetsPerRoll.value;

    const packACostPer100Sheets = (packAPrice.value / packATotalSheets) * 100;
    const packBCostPer100Sheets = (packBPrice.value / packBTotalSheets) * 100;

    const packATotalPlySheets = packATotalSheets * packAPly.value;
    const packBTotalPlySheets = packBTotalSheets * packBPly.value;

    const packACostPer100PlySheets = (packAPrice.value / packATotalPlySheets) * 100;
    const packBCostPer100PlySheets = (packBPrice.value / packBTotalPlySheets) * 100;

    const sheetDifference = Math.abs(packACostPer100Sheets - packBCostPer100Sheets);
    const higherSheetCost = Math.max(packACostPer100Sheets, packBCostPer100Sheets);
    const differencePercent = higherSheetCost > 0 ? (sheetDifference / higherSheetCost) * 100 : 0;

    packATotalSheetsOutput.textContent = formatSheets(packATotalSheets);
    packBTotalSheetsOutput.textContent = formatSheets(packBTotalSheets);

    packACostPer100SheetsOutput.textContent = formatMoney(currencySymbol, packACostPer100Sheets);
    packBCostPer100SheetsOutput.textContent = formatMoney(currencySymbol, packBCostPer100Sheets);

    packACostPer100PlySheetsOutput.textContent = formatMoney(currencySymbol, packACostPer100PlySheets);
    packBCostPer100PlySheetsOutput.textContent = formatMoney(currencySymbol, packBCostPer100PlySheets);

    betterValueBySheetsOutput.textContent = getBetterValue(
      packAName,
      packACostPer100Sheets,
      packBName,
      packBCostPer100Sheets
    );

    betterValueByPlyOutput.textContent = getBetterValue(
      packAName,
      packACostPer100PlySheets,
      packBName,
      packBCostPer100PlySheets
    );

    differencePer100SheetsOutput.textContent = formatMoney(currencySymbol, sheetDifference);
    differencePercentageOutput.textContent = formatPercentage(differencePercent);

    costPerSquareFootOutput.textContent = getSquareFootText(
      currencySymbol,
      packAName,
      packASquareFeet.value,
      packAPrice.value,
      packBName,
      packBSquareFeet.value,
      packBPrice.value
    );

    statusMessage.textContent = "Calculated. For different ply counts, check the ply-adjusted result first.";
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

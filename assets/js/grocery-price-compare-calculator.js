"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("groceryPriceCompareForm");
  const currencySymbolInput = document.getElementById("currencySymbol");
  const itemANameInput = document.getElementById("itemAName");
  const itemAPriceInput = document.getElementById("itemAPrice");
  const itemAQuantityInput = document.getElementById("itemAQuantity");
  const itemAUnitInput = document.getElementById("itemAUnit");
  const itemBNameInput = document.getElementById("itemBName");
  const itemBPriceInput = document.getElementById("itemBPrice");
  const itemBQuantityInput = document.getElementById("itemBQuantity");
  const itemBUnitInput = document.getElementById("itemBUnit");
  const statusMessage = document.getElementById("priceCompareStatus");
  const itemAUnitPriceOutput = document.getElementById("itemAUnitPrice");
  const itemBUnitPriceOutput = document.getElementById("itemBUnitPrice");
  const betterValueResultOutput = document.getElementById("betterValueResult");
  const differencePerUnitOutput = document.getElementById("differencePerUnit");

  if (
    !form ||
    !currencySymbolInput ||
    !itemANameInput ||
    !itemAPriceInput ||
    !itemAQuantityInput ||
    !itemAUnitInput ||
    !itemBNameInput ||
    !itemBPriceInput ||
    !itemBQuantityInput ||
    !itemBUnitInput ||
    !statusMessage ||
    !itemAUnitPriceOutput ||
    !itemBUnitPriceOutput ||
    !betterValueResultOutput ||
    !differencePerUnitOutput
  ) {
    return;
  }

  const compareButton = form.querySelector('button[type="submit"]');
  let hasCalculatedResult = false;
  let buttonTimerId = null;

  if (!compareButton) {
    return;
  }

  function formatMoney(symbol, amount) {
    return symbol + amount.toFixed(2);
  }

  function formatPercentage(value) {
    const roundedValue = Math.round(value * 10) / 10;

    if (Number.isInteger(roundedValue)) {
      return roundedValue.toString() + "%";
    }

    return roundedValue.toFixed(1) + "%";
  }

  function setCompareButtonText(text) {
    if (buttonTimerId) {
      window.clearTimeout(buttonTimerId);
      buttonTimerId = null;
    }

    compareButton.textContent = text;
  }

  function resetResults() {
    hasCalculatedResult = false;
    setCompareButtonText("Compare prices");
    itemAUnitPriceOutput.textContent = "0.00";
    itemBUnitPriceOutput.textContent = "0.00";
    betterValueResultOutput.textContent = "—";
    differencePerUnitOutput.textContent = "0.00";
    statusMessage.textContent = "Enter two item prices, quantities, and units to compare normalized unit price.";
  }

  function clearResultsForError(message) {
    hasCalculatedResult = false;
    setCompareButtonText("Compare prices");
    itemAUnitPriceOutput.textContent = "0.00";
    itemBUnitPriceOutput.textContent = "0.00";
    betterValueResultOutput.textContent = "—";
    differencePerUnitOutput.textContent = "0.00";
    statusMessage.textContent = message;
  }

  function markCalculationComplete() {
    hasCalculatedResult = true;
    setCompareButtonText("Calculated ✓");

    buttonTimerId = window.setTimeout(function () {
      compareButton.textContent = "Recalculate";
      buttonTimerId = null;
    }, 1000);
  }

    function clearStaleResult() {
    if (!hasCalculatedResult) {
      return;
    }

    hasCalculatedResult = false;
    setCompareButtonText("Compare prices");
    statusMessage.textContent = "Values changed. Tap Compare prices to update the result.";
  
  }

  function getDisplayName(inputValue, fallbackName) {
    const trimmedName = inputValue.trim();

    if (trimmedName === "") {
      return fallbackName;
    }

    return trimmedName;
  }

  function getUnitDetails(unit) {
    const units = {
      g: { category: "weight", factor: 0.001, displayUnit: "kg" },
      kg: { category: "weight", factor: 1, displayUnit: "kg" },
      oz: { category: "weight", factor: 0.028349523125, displayUnit: "kg" },
      lb: { category: "weight", factor: 0.45359237, displayUnit: "kg" },
      ml: { category: "volume", factor: 0.001, displayUnit: "liter" },
      liters: { category: "volume", factor: 1, displayUnit: "liter" },
      items: { category: "items", factor: 1, displayUnit: "item" },
      packs: { category: "packs", factor: 1, displayUnit: "pack" }
    };

    return units[unit] || null;
  }

  function areUnitsCompatible(itemAUnitDetails, itemBUnitDetails) {
    if (!itemAUnitDetails || !itemBUnitDetails) {
      return false;
    }

    return itemAUnitDetails.category === itemBUnitDetails.category;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const currencySymbol = currencySymbolInput.value.trim();
    const itemAName = getDisplayName(itemANameInput.value, "Item A");
    const itemBName = getDisplayName(itemBNameInput.value, "Item B");

    const itemAPriceValue = itemAPriceInput.value.trim();
    const itemAQuantityValue = itemAQuantityInput.value.trim();
    const itemAUnitValue = itemAUnitInput.value.trim();
    const itemBPriceValue = itemBPriceInput.value.trim();
    const itemBQuantityValue = itemBQuantityInput.value.trim();
    const itemBUnitValue = itemBUnitInput.value.trim();

    const itemAPrice = Number(itemAPriceValue);
    const itemAQuantity = Number(itemAQuantityValue);
    const itemBPrice = Number(itemBPriceValue);
    const itemBQuantity = Number(itemBQuantityValue);

    const itemAUnitDetails = getUnitDetails(itemAUnitValue);
    const itemBUnitDetails = getUnitDetails(itemBUnitValue);

    if (currencySymbol === "") {
      clearResultsForError("Please select a currency symbol.");
      return;
    }

    if (itemAPriceValue === "") {
      clearResultsForError("Please enter Item A total price.");
      return;
    }

    if (!Number.isFinite(itemAPrice) || itemAPrice <= 0) {
      clearResultsForError("Item A total price must be greater than 0.");
      return;
    }

    if (itemAQuantityValue === "") {
      clearResultsForError("Please enter Item A quantity.");
      return;
    }

    if (!Number.isFinite(itemAQuantity) || itemAQuantity <= 0) {
      clearResultsForError("Item A quantity must be greater than 0.");
      return;
    }

    if (itemAUnitValue === "") {
      clearResultsForError("Please select Item A unit.");
      return;
    }

    if (itemBPriceValue === "") {
      clearResultsForError("Please enter Item B total price.");
      return;
    }

    if (!Number.isFinite(itemBPrice) || itemBPrice <= 0) {
      clearResultsForError("Item B total price must be greater than 0.");
      return;
    }

    if (itemBQuantityValue === "") {
      clearResultsForError("Please enter Item B quantity.");
      return;
    }

    if (!Number.isFinite(itemBQuantity) || itemBQuantity <= 0) {
      clearResultsForError("Item B quantity must be greater than 0.");
      return;
    }

    if (itemBUnitValue === "") {
      clearResultsForError("Please select Item B unit.");
      return;
    }

    if (!areUnitsCompatible(itemAUnitDetails, itemBUnitDetails)) {
      clearResultsForError("Selected units are not compatible. Compare weight with weight, volume with volume, items with items, or packs with packs.");
      return;
    }

    const normalizedItemAQuantity = itemAQuantity * itemAUnitDetails.factor;
    const normalizedItemBQuantity = itemBQuantity * itemBUnitDetails.factor;
    const normalizedUnit = itemAUnitDetails.displayUnit;

    const itemAUnitPrice = itemAPrice / normalizedItemAQuantity;
    const itemBUnitPrice = itemBPrice / normalizedItemBQuantity;
    const difference = Math.abs(itemAUnitPrice - itemBUnitPrice);
    const higherUnitPrice = Math.max(itemAUnitPrice, itemBUnitPrice);
    const percentageDifference = higherUnitPrice > 0 ? (difference / higherUnitPrice) * 100 : 0;

    itemAUnitPriceOutput.textContent = formatMoney(currencySymbol, itemAUnitPrice) + " / " + normalizedUnit;
    itemBUnitPriceOutput.textContent = formatMoney(currencySymbol, itemBUnitPrice) + " / " + normalizedUnit;
    differencePerUnitOutput.textContent = formatMoney(currencySymbol, difference) + " / " + normalizedUnit;

    markCalculationComplete();

    if (difference === 0) {
      betterValueResultOutput.textContent = "Both items have the same normalized unit price.";
      statusMessage.textContent = "Both items have the same price per " + normalizedUnit + ".";
      return;
    }

    if (itemAUnitPrice < itemBUnitPrice) {
      betterValueResultOutput.textContent = itemAName + " is the better value by " + formatPercentage(percentageDifference) + ".";
      statusMessage.textContent = itemAName + " has the lower price per " + normalizedUnit + ".";
      return;
    }

    betterValueResultOutput.textContent = itemBName + " is the better value by " + formatPercentage(percentageDifference) + ".";
    statusMessage.textContent = itemBName + " has the lower price per " + normalizedUnit + ".";
  });

  [
    currencySymbolInput,
    itemANameInput,
    itemAPriceInput,
    itemAQuantityInput,
    itemAUnitInput,
    itemBNameInput,
    itemBPriceInput,
    itemBQuantityInput,
    itemBUnitInput
  ].forEach(function (input) {
    input.addEventListener("input", clearStaleResult);
    input.addEventListener("change", clearStaleResult);
  });

  form.addEventListener("reset", function () {
    window.setTimeout(resetResults, 0);
  });

  resetResults();
});

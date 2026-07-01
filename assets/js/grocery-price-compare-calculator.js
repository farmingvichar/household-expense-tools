"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("groceryPriceCompareForm");
  const currencySymbolInput = document.getElementById("currencySymbol");
  const quantityUnitInput = document.getElementById("quantityUnit");
  const itemANameInput = document.getElementById("itemAName");
  const itemAPriceInput = document.getElementById("itemAPrice");
  const itemAQuantityInput = document.getElementById("itemAQuantity");
  const itemBNameInput = document.getElementById("itemBName");
  const itemBPriceInput = document.getElementById("itemBPrice");
  const itemBQuantityInput = document.getElementById("itemBQuantity");
  const statusMessage = document.getElementById("priceCompareStatus");
  const itemAUnitPriceOutput = document.getElementById("itemAUnitPrice");
  const itemBUnitPriceOutput = document.getElementById("itemBUnitPrice");
  const betterValueResultOutput = document.getElementById("betterValueResult");
  const differencePerUnitOutput = document.getElementById("differencePerUnit");

  if (
    !form ||
    !currencySymbolInput ||
    !quantityUnitInput ||
    !itemANameInput ||
    !itemAPriceInput ||
    !itemAQuantityInput ||
    !itemBNameInput ||
    !itemBPriceInput ||
    !itemBQuantityInput ||
    !statusMessage ||
    !itemAUnitPriceOutput ||
    !itemBUnitPriceOutput ||
    !betterValueResultOutput ||
    !differencePerUnitOutput
  ) {
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

  function resetResults() {
    itemAUnitPriceOutput.textContent = "0.00";
    itemBUnitPriceOutput.textContent = "0.00";
    betterValueResultOutput.textContent = "—";
    differencePerUnitOutput.textContent = "0.00";
    statusMessage.textContent = "Enter two item prices and quantities to compare price per unit.";
  }

  function clearResultsForError(message) {
    itemAUnitPriceOutput.textContent = "0.00";
    itemBUnitPriceOutput.textContent = "0.00";
    betterValueResultOutput.textContent = "—";
    differencePerUnitOutput.textContent = "0.00";
    statusMessage.textContent = message;
  }

  function getDisplayName(inputValue, fallbackName) {
    const trimmedName = inputValue.trim();

    if (trimmedName === "") {
      return fallbackName;
    }

    return trimmedName;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const currencySymbol = currencySymbolInput.value.trim();
    const quantityUnit = quantityUnitInput.value.trim();
    const itemAName = getDisplayName(itemANameInput.value, "Item A");
    const itemBName = getDisplayName(itemBNameInput.value, "Item B");

    const itemAPriceValue = itemAPriceInput.value.trim();
    const itemAQuantityValue = itemAQuantityInput.value.trim();
    const itemBPriceValue = itemBPriceInput.value.trim();
    const itemBQuantityValue = itemBQuantityInput.value.trim();

    const itemAPrice = Number(itemAPriceValue);
    const itemAQuantity = Number(itemAQuantityValue);
    const itemBPrice = Number(itemBPriceValue);
    const itemBQuantity = Number(itemBQuantityValue);

    if (currencySymbol === "") {
      clearResultsForError("Please select a currency symbol.");
      return;
    }

    if (quantityUnit === "") {
      clearResultsForError("Please select a quantity unit.");
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

    const itemAUnitPrice = itemAPrice / itemAQuantity;
    const itemBUnitPrice = itemBPrice / itemBQuantity;
    const difference = Math.abs(itemAUnitPrice - itemBUnitPrice);
    const higherUnitPrice = Math.max(itemAUnitPrice, itemBUnitPrice);
    const percentageDifference = higherUnitPrice > 0 ? (difference / higherUnitPrice) * 100 : 0;

    itemAUnitPriceOutput.textContent = formatMoney(currencySymbol, itemAUnitPrice) + " / " + quantityUnit;
    itemBUnitPriceOutput.textContent = formatMoney(currencySymbol, itemBUnitPrice) + " / " + quantityUnit;
    differencePerUnitOutput.textContent = formatMoney(currencySymbol, difference) + " / " + quantityUnit;

    if (difference === 0) {
      betterValueResultOutput.textContent = "Both items have the same unit price.";
      statusMessage.textContent = "Both items have the same price per selected unit.";
      return;
    }

    if (itemAUnitPrice < itemBUnitPrice) {
      betterValueResultOutput.textContent = itemAName + " is the better value by " + formatPercentage(percentageDifference) + ".";
      statusMessage.textContent = itemAName + " has the lower price per selected unit.";
      return;
    }

    betterValueResultOutput.textContent = itemBName + " is the better value by " + formatPercentage(percentageDifference) + ".";
    statusMessage.textContent = itemBName + " has the lower price per selected unit.";
  });

  form.addEventListener("reset", function () {
    window.setTimeout(resetResults, 0);
  });

  resetResults();
});

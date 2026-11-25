(function () {
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
    const resetButton = document.getElementById("resetCompareBtn");
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
    let buttonTimerId = null;
    let hasUserChangedItemBUnit = false;

    const UNITS = {
      oz: { category: "weight", system: "us", factorToBase: 0.028349523125 },
      lb: { category: "weight", system: "us", factorToBase: 0.45359237 },
      g: { category: "weight", system: "metric", factorToBase: 0.001 },
      kg: { category: "weight", system: "metric", factorToBase: 1 },
      fl_oz: { category: "volume", system: "us", factorToBase: 0.0295735295625 },
      gal: { category: "volume", system: "us", factorToBase: 3.785411784 },
      ml: { category: "volume", system: "metric", factorToBase: 0.001 },
      liters: { category: "volume", system: "metric", factorToBase: 1 },
      items: { category: "items", system: "count", factorToBase: 1 },
      packs: { category: "packs", system: "count", factorToBase: 1 }
    };

    function formatMoney(symbol, amount, decimals) {
      const formatted = amount.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      return symbol + formatted;
    }

    function formatPercentage(value) {
      const roundedValue = Math.round(value * 10) / 10;

      if (Number.isInteger(roundedValue)) {
        return roundedValue.toString() + "%";
      }

      return roundedValue.toFixed(1) + "%";
    }

    function setCompareButtonFeedback() {
      if (!compareButton) {
        return;
      }

      if (buttonTimerId) {
        window.clearTimeout(buttonTimerId);
        buttonTimerId = null;
      }

      compareButton.textContent = "Compared ✓";

      buttonTimerId = window.setTimeout(function () {
        compareButton.textContent = "Compare prices";
        buttonTimerId = null;
      }, 1000);
    }

    function getDisplayName(inputValue, fallbackName) {
      const trimmedName = inputValue.trim();
      return trimmedName === "" ? fallbackName : trimmedName;
    }

    function getUnitDetails(unit) {
      return UNITS[unit] || null;
    }

    function areUnitsCompatible(unitA, unitB) {
      return Boolean(unitA && unitB && unitA.category === unitB.category);
    }

    function getComparisonTarget(unitAKey, unitBKey) {
      const unitA = getUnitDetails(unitAKey);
      const unitB = getUnitDetails(unitBKey);

      if (!areUnitsCompatible(unitA, unitB)) {
        return null;
      }

      if (unitA.category === "weight") {
        if (unitA.system === "us" && unitB.system === "us") {
          if (unitAKey === "lb" && unitBKey === "lb") {
            return { label: "lb", baseSize: UNITS.lb.factorToBase };
          }
          return { label: "oz", baseSize: UNITS.oz.factorToBase };
        }

        if (unitA.system === "metric" && unitB.system === "metric") {
          if (unitAKey === "g" && unitBKey === "g") {
            return { label: "100 g", baseSize: 0.1 };
          }
          return { label: "kg", baseSize: 1 };
        }

        if (unitAKey === "oz") {
          return { label: "oz", baseSize: UNITS.oz.factorToBase };
        }
        if (unitAKey === "lb") {
          return { label: "lb", baseSize: UNITS.lb.factorToBase };
        }
        if (unitAKey === "g") {
          return { label: "100 g", baseSize: 0.1 };
        }
        return { label: "kg", baseSize: 1 };
      }

      if (unitA.category === "volume") {
        if (unitA.system === "us" && unitB.system === "us") {
          if (unitAKey === "gal" && unitBKey === "gal") {
            return { label: "gal (US)", baseSize: UNITS.gal.factorToBase };
          }
          return { label: "fl oz", baseSize: UNITS.fl_oz.factorToBase };
        }

        if (unitA.system === "metric" && unitB.system === "metric") {
          if (unitAKey === "ml" && unitBKey === "ml") {
            return { label: "100 ml", baseSize: 0.1 };
          }
          return { label: "liter", baseSize: 1 };
        }

        if (unitAKey === "fl_oz") {
          return { label: "fl oz", baseSize: UNITS.fl_oz.factorToBase };
        }
        if (unitAKey === "gal") {
          return { label: "gal (US)", baseSize: UNITS.gal.factorToBase };
        }
        if (unitAKey === "ml") {
          return { label: "100 ml", baseSize: 0.1 };
        }
        return { label: "liter", baseSize: 1 };
      }

      if (unitA.category === "items") {
        return { label: "item", baseSize: 1 };
      }

      return { label: "pack", baseSize: 1 };
    }

    function clearOutputs(message) {
      itemAUnitPriceOutput.textContent = "0.00";
      itemBUnitPriceOutput.textContent = "0.00";
      betterValueResultOutput.textContent = "—";
      differencePerUnitOutput.textContent = "0.00";
      statusMessage.textContent = message;
    }

    function resetAll() {
      if (buttonTimerId) {
        window.clearTimeout(buttonTimerId);
        buttonTimerId = null;
      }

      if (compareButton) {
        compareButton.textContent = "Compare prices";
      }

      hasUserChangedItemBUnit = false;
      form.reset();
      itemAUnitInput.value = "oz";
      itemBUnitInput.value = "oz";
      clearOutputs("Enter both prices and quantities to compare unit prices live.");
    }

    function hasAnyInputValue() {
      return (
        itemAPriceInput.value.trim() !== "" ||
        itemAQuantityInput.value.trim() !== "" ||
        itemBPriceInput.value.trim() !== "" ||
        itemBQuantityInput.value.trim() !== "" ||
        itemANameInput.value.trim() !== "" ||
        itemBNameInput.value.trim() !== ""
      );
    }

    function calculateComparison(options) {
      const focusInvalid = Boolean(options && options.focusInvalid);
      const fromSubmit = Boolean(options && options.fromSubmit);

      const currencySymbol = currencySymbolInput.value.trim();
      const itemAName = getDisplayName(itemANameInput.value, "Item A");
      const itemBName = getDisplayName(itemBNameInput.value, "Item B");

      const itemAPriceRaw = itemAPriceInput.value.trim();
      const itemAQuantityRaw = itemAQuantityInput.value.trim();
      const itemAUnitValue = itemAUnitInput.value.trim();
      const itemBPriceRaw = itemBPriceInput.value.trim();
      const itemBQuantityRaw = itemBQuantityInput.value.trim();
      const itemBUnitValue = itemBUnitInput.value.trim();

      const itemAUnitDetails = getUnitDetails(itemAUnitValue);
      const itemBUnitDetails = getUnitDetails(itemBUnitValue);

      if (currencySymbol === "") {
        clearOutputs("Please select a currency symbol.");
        if (focusInvalid) currencySymbolInput.focus();
        return;
      }

      if (!itemAUnitDetails) {
        clearOutputs("Please select Item A unit.");
        if (focusInvalid) itemAUnitInput.focus();
        return;
      }

      if (!itemBUnitDetails) {
        clearOutputs("Please select Item B unit.");
        if (focusInvalid) itemBUnitInput.focus();
        return;
      }

      if (!areUnitsCompatible(itemAUnitDetails, itemBUnitDetails)) {
        clearOutputs("Selected units cannot be compared. Match weight with weight, volume with volume, items with items, or packs with packs.");
        if (focusInvalid) itemBUnitInput.focus();
        return;
      }

      const requiredFields = [
        { raw: itemAPriceRaw, el: itemAPriceInput, label: "Item A total price" },
        { raw: itemAQuantityRaw, el: itemAQuantityInput, label: "Item A quantity" },
        { raw: itemBPriceRaw, el: itemBPriceInput, label: "Item B total price" },
        { raw: itemBQuantityRaw, el: itemBQuantityInput, label: "Item B quantity" }
      ];

      for (let i = 0; i < requiredFields.length; i += 1) {
        const field = requiredFields[i];
        if (field.raw !== "") {
          const parsed = Number(field.raw);
          if (!Number.isFinite(parsed) || parsed <= 0) {
            clearOutputs(field.label + " must be greater than 0.");
            if (focusInvalid) field.el.focus();
            return;
          }
        }
      }

      for (let i = 0; i < requiredFields.length; i += 1) {
        const field = requiredFields[i];
        if (field.raw === "") {
          if (fromSubmit) {
            clearOutputs("Please enter " + field.label + ".");
            if (focusInvalid) field.el.focus();
          } else {
            clearOutputs("Enter both prices and quantities to compare unit prices live.");
          }
          return;
        }
      }

      const itemAPrice = Number(itemAPriceRaw);
      const itemAQuantity = Number(itemAQuantityRaw);
      const itemBPrice = Number(itemBPriceRaw);
      const itemBQuantity = Number(itemBQuantityRaw);

      const target = getComparisonTarget(itemAUnitValue, itemBUnitValue);
      if (!target) {
        clearOutputs("Selected units cannot be compared.");
        return;
      }

      const itemATargetQty = (itemAQuantity * itemAUnitDetails.factorToBase) / target.baseSize;
      const itemBTargetQty = (itemBQuantity * itemBUnitDetails.factorToBase) / target.baseSize;

      const itemAUnitPrice = itemAPrice / itemATargetQty;
      const itemBUnitPrice = itemBPrice / itemBTargetQty;

      const difference = Math.abs(itemAUnitPrice - itemBUnitPrice);
      const higherUnitPrice = Math.max(itemAUnitPrice, itemBUnitPrice);
      const isEffectivelyEqual = higherUnitPrice === 0 || difference <= higherUnitPrice * 1e-9;

      const decimals =
        itemAUnitPrice < 1 ||
        itemBUnitPrice < 1 ||
        (!isEffectivelyEqual && difference < 0.05)
          ? 3
          : 2;

      const unitSuffix = " / " + target.label;

      itemAUnitPriceOutput.textContent = formatMoney(currencySymbol, itemAUnitPrice, decimals) + unitSuffix;
      itemBUnitPriceOutput.textContent = formatMoney(currencySymbol, itemBUnitPrice, decimals) + unitSuffix;

      if (fromSubmit) {
        setCompareButtonFeedback();
      }

      if (isEffectivelyEqual) {
        differencePerUnitOutput.textContent = formatMoney(currencySymbol, 0, decimals) + unitSuffix;
        betterValueResultOutput.textContent = "Same unit price";
        statusMessage.textContent = "Both options cost the same per " + target.label + ".";
        return;
      }

      const percentageDifference = (difference / higherUnitPrice) * 100;
      const formattedDiff = formatMoney(currencySymbol, difference, decimals);
      const formattedPercent = formatPercentage(percentageDifference);

      differencePerUnitOutput.textContent = formattedDiff + unitSuffix;

      if (itemAUnitPrice < itemBUnitPrice) {
        betterValueResultOutput.textContent = itemAName + " (" + formattedPercent + " cheaper)";
        statusMessage.textContent = itemAName + " is the better value—saving " + formattedDiff + " per " + target.label + ".";
        return;
      }

      betterValueResultOutput.textContent = itemBName + " (" + formattedPercent + " cheaper)";
      statusMessage.textContent = itemBName + " is the better value—saving " + formattedDiff + " per " + target.label + ".";
    }

    itemAUnitInput.addEventListener("change", function () {
      const unitA = getUnitDetails(itemAUnitInput.value);
      const unitB = getUnitDetails(itemBUnitInput.value);

      if (!hasUserChangedItemBUnit || !areUnitsCompatible(unitA, unitB)) {
        itemBUnitInput.value = itemAUnitInput.value;
        if (!areUnitsCompatible(unitA, unitB)) {
          hasUserChangedItemBUnit = false;
        }
      }

      calculateComparison({ focusInvalid: false, fromSubmit: false });
    });

    itemBUnitInput.addEventListener("change", function () {
      hasUserChangedItemBUnit = true;
      calculateComparison({ focusInvalid: false, fromSubmit: false });
    });

    [
      currencySymbolInput,
      itemANameInput,
      itemAPriceInput,
      itemAQuantityInput,
      itemBNameInput,
      itemBPriceInput,
      itemBQuantityInput
    ].forEach(function (input) {
      input.addEventListener("input", function () {
        calculateComparison({ focusInvalid: false, fromSubmit: false });
      });
      input.addEventListener("change", function () {
        calculateComparison({ focusInvalid: false, fromSubmit: false });
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      calculateComparison({ focusInvalid: true, fromSubmit: true });
    });

    if (resetButton) {
      resetButton.addEventListener("click", function () {
        if (hasAnyInputValue()) {
          const confirmed = window.confirm("Clear all entered prices and quantities?");
          if (!confirmed) {
            return;
          }
        }
        resetAll();
        itemAPriceInput.focus();
      });
    }

    clearOutputs("Enter both prices and quantities to compare unit prices live.");
  });
})();

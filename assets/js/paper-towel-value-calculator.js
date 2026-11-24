(function () {
  "use strict";

  var form = document.getElementById("paperTowelForm");
  if (!form) return;

  var curSelect = document.getElementById("currencySymbol");
  var packANameInput = document.getElementById("packAName");
  var priceInput = document.getElementById("packagePrice");
  var rollsInput = document.getElementById("totalRolls");
  var sheetsInput = document.getElementById("sheetsPerRoll");
  var sqFtInput = document.getElementById("totalSqFt");

  var packBNameInput = document.getElementById("packBName");
  var packBPriceInput = document.getElementById("packBPrice");
  var packBRollsInput = document.getElementById("packBRolls");
  var packBSheetsInput = document.getElementById("packBSheetsPerRoll");
  var packBSqFtInput = document.getElementById("packBSqFt");

  var statusMsg = document.getElementById("paperTowelStatus");
  var outCostPerRoll = document.getElementById("costPerRoll");
  var outCostPer100 = document.getElementById("costPer100Sheets");
  var outCostPerSqFt = document.getElementById("costPerSqFt");
  var outTotalSheets = document.getElementById("totalSheetsCount");
  var outComparison = document.getElementById("packComparisonResult");
  var submitBtn = form.querySelector('button[type="submit"]');

  var hasCalculated = false;

  function getCurrency() {
    return curSelect && curSelect.value ? curSelect.value : "$";
  }

  function getLabel(input, fallback) {
    if (!input) return fallback;
    var trimmed = input.value.trim();
    return trimmed !== "" ? trimmed : fallback;
  }

  function formatMoney(symbol, amount) {
    var clean = Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return (amount < 0 ? "-" : "") + symbol + clean;
  }

  function formatAreaCost(symbol, perSqFt) {
    var perSqFtText = Math.abs(perSqFt).toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });
    return symbol + perSqFtText + "/sq ft (" + formatMoney(symbol, perSqFt * 100) + "/100 sq ft)";
  }

  function clearOutputs(message) {
    var cur = getCurrency();
    outCostPerRoll.textContent = cur + "0.00";
    outCostPer100.textContent = cur + "0.00";
    outCostPerSqFt.textContent = "—";
    outTotalSheets.textContent = "0";
    if (outComparison) {
      outComparison.textContent = "Enter optional Pack B details above to compare two packs side by side.";
    }
    statusMsg.textContent = message;
    hasCalculated = false;
    if (submitBtn) {
      submitBtn.textContent = "Calculate paper towel value";
    }
  }

  function isPackAReady() {
    return (
      priceInput.value.trim() !== "" &&
      rollsInput.value.trim() !== "" &&
      sheetsInput.value.trim() !== ""
    );
  }

  function evaluatePackB(cur, packA) {
    if (!outComparison || !packBPriceInput || !packBRollsInput || !packBSheetsInput) {
      return;
    }

    var rawPriceB = packBPriceInput.value.trim();
    var rawRollsB = packBRollsInput.value.trim();
    var rawSheetsB = packBSheetsInput.value.trim();
    var rawSqFtB = packBSqFtInput ? packBSqFtInput.value.trim() : "";

    if (rawPriceB === "" && rawRollsB === "" && rawSheetsB === "" && rawSqFtB === "") {
      outComparison.textContent = "Enter optional Pack B details above to compare two packs side by side.";
      return;
    }

    if (rawPriceB === "" || rawRollsB === "" || rawSheetsB === "") {
      outComparison.textContent = "Add Pack B price, rolls, and sheets per roll to compare against " + packA.name + ".";
      return;
    }

    var priceB = Number(rawPriceB);
    var rollsB = Number(rawRollsB);
    var sheetsB = Number(rawSheetsB);
    var sqFtB = rawSqFtB !== "" ? Number(rawSqFtB) : null;

    if (!Number.isFinite(priceB) || priceB <= 0) {
      outComparison.textContent = "Pack B price must be greater than 0 to compare.";
      return;
    }
    if (!Number.isFinite(rollsB) || rollsB <= 0 || !Number.isInteger(rollsB)) {
      outComparison.textContent = "Pack B rolls must be a whole number (minimum 1).";
      return;
    }
    if (!Number.isFinite(sheetsB) || sheetsB <= 0 || !Number.isInteger(sheetsB)) {
      outComparison.textContent = "Pack B sheets per roll must be a whole number (minimum 1).";
      return;
    }
    if (sqFtB !== null && (!Number.isFinite(sqFtB) || sqFtB <= 0)) {
      outComparison.textContent = "Pack B total square feet must be greater than 0 (or leave blank).";
      return;
    }

    var nameB = getLabel(packBNameInput, "Pack B");
    var costPerRollB = priceB / rollsB;
    var totalSheetsB = rollsB * sheetsB;
    var costPer100B = (priceB / totalSheetsB) * 100;
    var costPerSqFtB = sqFtB !== null ? priceB / sqFtB : null;

    var packBSummary =
      nameB +
      ": " +
      formatMoney(cur, costPerRollB) +
      "/roll · " +
      formatMoney(cur, costPer100B) +
      "/100 sheets";

    if (costPerSqFtB !== null) {
      packBSummary += " · " + formatAreaCost(cur, costPerSqFtB);
    }

    var verdict = "";
    if (packA.costPerSqFt !== null && costPerSqFtB !== null) {
      var diffSqFt = Math.abs(packA.costPerSqFt - costPerSqFtB);
      if (diffSqFt < 0.000001) {
        verdict = "Both packs are tied on price per sq ft.";
      } else {
        var higherSqFt = Math.max(packA.costPerSqFt, costPerSqFtB);
        var pctSqFt = ((diffSqFt / higherSqFt) * 100).toFixed(1);
        var winnerSqFt = packA.costPerSqFt < costPerSqFtB ? packA.name : nameB;
        verdict = winnerSqFt + " is the better deal — saves " + pctSqFt + "% per sq ft.";
      }
    } else {
      var diff100 = Math.abs(packA.costPer100 - costPer100B);
      if (diff100 < 0.000001) {
        verdict = "Both packs are tied per 100 sheets.";
      } else {
        var higher100 = Math.max(packA.costPer100, costPer100B);
        var pct100 = ((diff100 / higher100) * 100).toFixed(1);
        var winner100 = packA.costPer100 < costPer100B ? packA.name : nameB;
        verdict = winner100 + " is cheaper — saves " + pct100 + "% per 100 sheets.";
      }
      if (packA.costPerSqFt !== null || costPerSqFtB !== null) {
        verdict += " Add square feet to both packs for an area comparison.";
      }
    }

    outComparison.textContent = verdict + " " + packBSummary;
  }

  function runCalculation(showErrors) {
    var cur = getCurrency();
    var rawPrice = priceInput.value.trim();
    var rawRolls = rollsInput.value.trim();
    var rawSheets = sheetsInput.value.trim();
    var rawSqFt = sqFtInput.value.trim();

    var price = Number(rawPrice);
    var rolls = Number(rawRolls);
    var sheetsPerRoll = Number(rawSheets);
    var sqFt = rawSqFt !== "" ? Number(rawSqFt) : null;

    if (rawPrice === "" || !Number.isFinite(price) || price <= 0) {
      if (showErrors) {
        clearOutputs("Please enter a valid Pack A price greater than 0.");
      }
      return;
    }
    if (rawRolls === "" || !Number.isFinite(rolls) || rolls <= 0 || !Number.isInteger(rolls)) {
      if (showErrors) {
        clearOutputs("Please enter a valid whole number of rolls (minimum 1).");
      }
      return;
    }
    if (rawSheets === "" || !Number.isFinite(sheetsPerRoll) || sheetsPerRoll <= 0 || !Number.isInteger(sheetsPerRoll)) {
      if (showErrors) {
        clearOutputs("Please enter a whole number of sheets per roll (printed on packaging).");
      }
      return;
    }
    if (sqFt !== null && (!Number.isFinite(sqFt) || sqFt <= 0)) {
      if (showErrors) {
        clearOutputs("Total square feet must be greater than 0 (or leave blank to skip).");
      }
      return;
    }

    var nameA = getLabel(packANameInput, "Pack A");
    var costPerRoll = price / rolls;
    var totalSheets = rolls * sheetsPerRoll;
    var costPer100 = (price / totalSheets) * 100;
    var costPerSqFt = sqFt !== null ? price / sqFt : null;

    outCostPerRoll.textContent = formatMoney(cur, costPerRoll);
    outCostPer100.textContent = formatMoney(cur, costPer100);
    outTotalSheets.textContent = totalSheets.toLocaleString("en-US");

    if (costPerSqFt !== null) {
      outCostPerSqFt.textContent = formatAreaCost(cur, costPerSqFt);
      statusMsg.textContent =
        "Calculated for " +
        nameA +
        ": " +
        totalSheets.toLocaleString("en-US") +
        " total sheets across " +
        rolls +
        " rolls.";
    } else {
      outCostPerSqFt.textContent = "—";
      statusMsg.textContent =
        "Calculated for " +
        nameA +
        ": " +
        totalSheets.toLocaleString("en-US") +
        " total sheets across " +
        rolls +
        " rolls. Add total sq ft to compare select-a-size vs. full sheets.";
    }

    evaluatePackB(cur, {
      name: nameA,
      costPerRoll: costPerRoll,
      costPer100: costPer100,
      costPerSqFt: costPerSqFt
    });

    hasCalculated = true;
    if (submitBtn) {
      submitBtn.textContent = "Calculated ✓";
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    runCalculation(true);
  });

  function handleLiveChange() {
    if (isPackAReady()) {
      runCalculation(false);
    } else if (!hasCalculated) {
      var cur = getCurrency();
      outCostPerRoll.textContent = cur + "0.00";
      outCostPer100.textContent = cur + "0.00";
    } else {
      statusMsg.textContent = "Values changed. Tap Calculate paper towel value to update.";
      if (submitBtn) {
        submitBtn.textContent = "Calculate paper towel value";
      }
    }
  }

  form.addEventListener("input", handleLiveChange);
  form.addEventListener("change", handleLiveChange);

  form.addEventListener("reset", function () {
    window.setTimeout(function () {
      clearOutputs("Enter package price and roll counts to view unit costs.");
    }, 0);
  });

  clearOutputs("Enter package price and roll counts to view unit costs.");
})();

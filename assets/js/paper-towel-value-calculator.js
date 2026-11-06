(function () {
  "use strict";

  var form = document.getElementById("paperTowelForm");
  if (!form) return;

  var curSelect = document.getElementById("currencySymbol");
  var priceInput = document.getElementById("packagePrice");
  var rollsInput = document.getElementById("totalRolls");
  var sheetsInput = document.getElementById("sheetsPerRoll");
  var sqFtInput = document.getElementById("totalSqFt");

  var statusMsg = document.getElementById("paperTowelStatus");
  var outCostPerRoll = document.getElementById("costPerRoll");
  var outCostPer100 = document.getElementById("costPer100Sheets");
  var outCostPerSqFt = document.getElementById("costPerSqFt");
  var outTotalSheets = document.getElementById("totalSheetsCount");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var price = parseFloat(priceInput.value);
    var rolls = parseFloat(rollsInput.value);
    var sheetsPerRoll = parseFloat(sheetsInput.value);
    var sqFt = parseFloat(sqFtInput.value);
    var cur = curSelect ? curSelect.value : "$";

    if (isNaN(price) || price <= 0) {
      statusMsg.textContent = "Please enter a valid package price greater than 0.";
      return;
    }
    if (isNaN(rolls) || rolls <= 0 || !Number.isInteger(rolls)) {
      statusMsg.textContent = "Please enter a valid whole number of rolls (minimum 1).";
      return;
    }
    if (isNaN(sheetsPerRoll) || sheetsPerRoll <= 0) {
      statusMsg.textContent = "Please enter the number of sheets per roll (printed on packaging).";
      return;
    }

    // Calculations
    var costPerRoll = price / rolls;
    var totalSheets = rolls * sheetsPerRoll;
    var costPer100 = (price / totalSheets) * 100;

    outCostPerRoll.textContent = cur + costPerRoll.toFixed(2);
    outCostPer100.textContent = cur + costPer100.toFixed(2);
    outTotalSheets.textContent = totalSheets.toLocaleString();

    if (!isNaN(sqFt) && sqFt > 0) {
      var costPerSqFt = price / sqFt;
      outCostPerSqFt.textContent = cur + costPerSqFt.toFixed(3);
      statusMsg.textContent = "Calculated successfully: " + totalSheets.toLocaleString() + " total sheets across " + rolls + " rolls.";
    } else {
      outCostPerSqFt.textContent = "—";
      statusMsg.textContent = "Calculated successfully: " + totalSheets.toLocaleString() + " total sheets across " + rolls + " rolls. (Square feet skipped).";
    }
  });

  form.addEventListener("reset", function () {
    setTimeout(function () {
      var cur = curSelect ? curSelect.value : "$";
      outCostPerRoll.textContent = cur + "0.00";
      outCostPer100.textContent = cur + "0.00";
      outCostPerSqFt.textContent = "—";
      outTotalSheets.textContent = "0";
      statusMsg.textContent = "Enter package price and roll counts to view unit costs.";
    }, 10);
  });
})();

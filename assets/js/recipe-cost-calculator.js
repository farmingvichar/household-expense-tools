"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("recipeCostForm");
  const recipeNameInput = document.getElementById("recipeName");
  const servingsInput = document.getElementById("servings");
  const ingredientsContainer = document.getElementById("ingredientsContainer");
  const addIngredientBtn = document.getElementById("addIngredientBtn");
  const statusMessage = document.getElementById("recipeStatus");

  const totalRecipeCostOutput = document.getElementById("totalRecipeCost");
  const costPerServingOutput = document.getElementById("costPerServing");
  const totalIngredientsCountOutput = document.getElementById("totalIngredientsCount");
  const breakdownContainer = document.getElementById("breakdownContainer");

  if (
    !form ||
    !servingsInput ||
    !ingredientsContainer ||
    !addIngredientBtn ||
    !statusMessage ||
    !totalRecipeCostOutput ||
    !costPerServingOutput ||
    !totalIngredientsCountOutput ||
    !breakdownContainer
  ) {
    return;
  }

  const calculateButton = form.querySelector('button[type="submit"]');
  let hasCalculatedResult = false;
let buttonTimerId = null;
let latestCalculation = null;

  function getUnitDetails(unit) {
    const units = {
      g: { category: "mass", factor: 1, baseUnit: "g" },
      kg: { category: "mass", factor: 1000, baseUnit: "g" },
      oz: { category: "mass", factor: 28.349523125, baseUnit: "g" },
      lb: { category: "mass", factor: 453.59237, baseUnit: "g" },
      ml: { category: "volume", factor: 1, baseUnit: "ml" },
      l: { category: "volume", factor: 1000, baseUnit: "ml" },
      each: { category: "count", factor: 1, baseUnit: "each" }
    };
    return units[unit] || null;
  }

  function createIngredientRow(data = {}) {
    const row = document.createElement("div");
    row.className = "ingredient-row";
row.style.cssText = "background: var(--color-surface, #f8fafc); padding: 1rem; border-radius: 8px; border: 1px solid var(--color-border, #e2e8f0);";

    row.innerHTML = `
      <div class="form-field" style="margin-bottom: 0;">
        <label>Ingredient name</label>
        <input type="text" class="ing-name" placeholder="e.g. Flour" value="" required />
      </div>
      <div class="form-field" style="margin-bottom: 0;">
        <label>Package price ($)</label>
        <input type="number" class="ing-price" placeholder="0.00" min="0" step="0.01" inputmode="decimal" value="${data.price !== undefined ? data.price : ""}" required />
      </div>
      <div class="form-field" style="margin-bottom: 0;">
        <label>Package qty</label>
        <input type="number" class="ing-pkg-qty" placeholder="0" min="0.0001" step="any" inputmode="decimal" value="${data.pkgQty !== undefined ? data.pkgQty : ""}" required />
      </div>
      <div class="form-field" style="margin-bottom: 0;">
        <label>Package unit</label>
        <select class="ing-pkg-unit" required>
          <option value="g" ${data.pkgUnit === "g" ? "selected" : ""}>g</option>
          <option value="kg" ${data.pkgUnit === "kg" ? "selected" : ""}>kg</option>
          <option value="oz" ${data.pkgUnit === "oz" ? "selected" : ""}>oz</option>
          <option value="lb" ${data.pkgUnit === "lb" ? "selected" : ""}>lb</option>
          <option value="ml" ${data.pkgUnit === "ml" ? "selected" : ""}>ml</option>
          <option value="l" ${data.pkgUnit === "l" ? "selected" : ""}>L</option>
          <option value="each" ${data.pkgUnit === "each" ? "selected" : ""}>each</option>
        </select>
      </div>
      <div class="form-field" style="margin-bottom: 0;">
        <label>Recipe qty</label>
        <input type="number" class="ing-rec-qty" placeholder="0" min="0.0001" step="any" inputmode="decimal" value="${data.recQty !== undefined ? data.recQty : ""}" required />
      </div>
      <div class="form-field" style="margin-bottom: 0;">
        <label>Recipe unit</label>
        <select class="ing-rec-unit" required>
          <option value="g" ${data.recUnit === "g" ? "selected" : ""}>g</option>
          <option value="kg" ${data.recUnit === "kg" ? "selected" : ""}>kg</option>
          <option value="oz" ${data.recUnit === "oz" ? "selected" : ""}>oz</option>
          <option value="lb" ${data.recUnit === "lb" ? "selected" : ""}>lb</option>
          <option value="ml" ${data.recUnit === "ml" ? "selected" : ""}>ml</option>
          <option value="l" ${data.recUnit === "l" ? "selected" : ""}>L</option>
          <option value="each" ${data.recUnit === "each" ? "selected" : ""}>each</option>
        </select>
      </div>
      <div>
        <button type="button" class="button-secondary remove-ing-btn" aria-label="Remove ingredient" style="padding: 0.6rem 0.8rem; color: #b91c1c; border-color: #fca5a5;">✕</button>
      </div>
    `;

    // Safely assign text content for ingredient name to prevent any innerHTML risks
    const nameInput = row.querySelector(".ing-name");
    if (data.name) {
      nameInput.value = data.name;
    }

    const removeBtn = row.querySelector(".remove-ing-btn");
    removeBtn.addEventListener("click", function () {
      if (ingredientsContainer.querySelectorAll(".ingredient-row").length > 1) {
        row.remove();
        clearStaleResult();
      } else {
        statusMessage.textContent = "A recipe must have at least one ingredient.";
      }
    });

    row.querySelectorAll("input, select").forEach(function (input) {
      input.addEventListener("input", clearStaleResult);
      input.addEventListener("change", clearStaleResult);
    });

    ingredientsContainer.appendChild(row);
  }
  createIngredientRow();
    function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatMoney(amount) {
    return "$" + amount.toFixed(2);
  }

  function setCalculateButtonText(text) {
    if (buttonTimerId) {
      window.clearTimeout(buttonTimerId);
      buttonTimerId = null;
    }
    if (calculateButton) {
      calculateButton.textContent = text;
    }
  }

    function resetResults() {
    hasCalculatedResult = false;
    setCalculateButtonText("Calculate recipe cost");
    totalRecipeCostOutput.textContent = "$0.00";
    costPerServingOutput.textContent = "$0.00";
    totalIngredientsCountOutput.textContent = "0";
    breakdownContainer.innerHTML = '<p style="color: var(--color-text-muted); font-style: italic;">No calculations performed yet.</p>';
    statusMessage.textContent = "Add your ingredients and tap Calculate recipe cost to view individual costs, total cost, and cost per serving.";
    
    const printBtn = document.getElementById("printRecipeBtn");
    const downloadBtn = document.getElementById("downloadTxtBtn");
    if (printBtn) printBtn.style.display = "none";
    if (downloadBtn) downloadBtn.style.display = "none";
  }


  function clearResultsForError(message) {
    hasCalculatedResult = false;
    setCalculateButtonText("Calculate recipe cost");
    totalRecipeCostOutput.textContent = "$0.00";
    costPerServingOutput.textContent = "$0.00";
    totalIngredientsCountOutput.textContent = "0";
    breakdownContainer.innerHTML = '<p style="color: var(--color-text-muted); font-style: italic;">Calculation error.</p>';
    statusMessage.textContent = message;
  }

  function markCalculationComplete() {
    hasCalculatedResult = true;
    setCalculateButtonText("Calculated ✓");
    buttonTimerId = window.setTimeout(function () {
      if (calculateButton) {
        calculateButton.textContent = "Recalculate";
      }
      buttonTimerId = null;
    }, 1000);
  }

    function clearStaleResult() {
    if (!hasCalculatedResult) {
      return;
    }

    hasCalculatedResult = false;
    latestCalculation = null;
    setCalculateButtonText("Calculate recipe cost");
    statusMessage.textContent = "Values changed. Tap Calculate recipe cost to update results.";

    const printBtn = document.getElementById("printRecipeBtn");
    const downloadBtn = document.getElementById("downloadTxtBtn");

    if (printBtn) printBtn.style.display = "none";
    if (downloadBtn) downloadBtn.style.display = "none";
  }
  addIngredientBtn.addEventListener("click", function () {
    createIngredientRow();
    clearStaleResult();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const servingsValue = servingsInput.value.trim();
    const servings = Number(servingsValue);

    if (servingsValue === "" || !Number.isFinite(servings) || servings <= 0) {
      clearResultsForError("Servings must be a number greater than zero.");
      return;
    }

    const rows = ingredientsContainer.querySelectorAll(".ingredient-row");
    if (rows.length === 0) {
      clearResultsForError("Please add at least one ingredient.");
      return;
    }

    let totalRecipeCost = 0;
    const breakdownItems = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nameInput = row.querySelector(".ing-name");
      const priceInput = row.querySelector(".ing-price");
      const pkgQtyInput = row.querySelector(".ing-pkg-qty");
      const pkgUnitSelect = row.querySelector(".ing-pkg-unit");
      const recQtyInput = row.querySelector(".ing-rec-qty");
      const recUnitSelect = row.querySelector(".ing-rec-unit");

      const rawName = nameInput.value.trim();
      const name = rawName !== "" ? rawName : `Ingredient ${i + 1}`;
      const priceVal = priceInput.value.trim();
      const pkgQtyVal = pkgQtyInput.value.trim();
      const recQtyVal = recQtyInput.value.trim();

      const price = Number(priceVal);
      const pkgQty = Number(pkgQtyVal);
      const recQty = Number(recQtyVal);

      const pkgUnit = pkgUnitSelect.value;
      const recUnit = recUnitSelect.value;

      if (priceVal === "" || !Number.isFinite(price) || price < 0) {
        clearResultsForError(`Ingredient "${name}": Package price must be zero or greater.`);
        return;
      }

      if (pkgQtyVal === "" || !Number.isFinite(pkgQty) || pkgQty <= 0) {
        clearResultsForError(`Ingredient "${name}": Package quantity must be greater than zero.`);
        return;
      }

      if (recQtyVal === "" || !Number.isFinite(recQty) || recQty <= 0) {
        clearResultsForError(`Ingredient "${name}": Recipe quantity used must be greater than zero.`);
        return;
      }

      const pkgDetails = getUnitDetails(pkgUnit);
      const recDetails = getUnitDetails(recUnit);

      if (!pkgDetails || !recDetails || pkgDetails.category !== recDetails.category) {
        clearResultsForError(`Ingredient "${name}": Unit mismatch. Cannot convert between ${pkgUnit} and ${recUnit}. Mass, volume, and count units cannot be mixed.`);
        return;
      }

      const normalizedPkgQty = pkgQty * pkgDetails.factor;
      const normalizedRecQty = recQty * recDetails.factor;

      const ingredientCost = (price / normalizedPkgQty) * normalizedRecQty;
      totalRecipeCost += ingredientCost;

      breakdownItems.push({
  name: name,
  cost: ingredientCost,
  pkgQty: pkgQty,
  pkgUnit: pkgUnit,
  recQty: recQty,
  recUnit: recUnit,
  price: price
});
    }

    const costPerServing = totalRecipeCost / servings;
    
latestCalculation = {
  recipeName: recipeNameInput.value.trim() || "Homemade Recipe",
  servings: servings,
  totalRecipeCost: totalRecipeCost,
  costPerServing: costPerServing,
  breakdownItems: breakdownItems.map(function (item) {
    return {
      name: item.name,
      cost: item.cost,
      pkgQty: item.pkgQty,
      pkgUnit: item.pkgUnit,
      recQty: item.recQty,
      recUnit: item.recUnit,
      price: item.price
    };
  })
};
    totalRecipeCostOutput.textContent = formatMoney(totalRecipeCost);
    costPerServingOutput.textContent = formatMoney(costPerServing);
    totalIngredientsCountOutput.textContent = breakdownItems.length.toString();

    // Clear and build breakdown safely using textContent for user input values
    breakdownContainer.innerHTML = "";
    const table = document.createElement("table");
    table.style.cssText = "width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr style="border-bottom: 2px solid var(--color-border, #e2e8f0);">
        <th style="padding: 0.75rem;">Ingredient</th>
        <th style="padding: 0.75rem;">Amount Used</th>
        <th style="padding: 0.75rem; text-align: right;">Cost</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    breakdownItems.forEach(function (item) {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--color-border, #e2e8f0)";

      const tdName = document.createElement("td");
      tdName.style.cssText = "padding: 0.75rem; font-weight: 500;";
      tdName.textContent = item.name;

      const tdAmount = document.createElement("td");
      tdAmount.style.cssText = "padding: 0.75rem; color: var(--color-text-muted);";
      tdAmount.textContent = `${item.recQty} ${item.recUnit} (pkg: ${item.pkgQty} ${item.pkgUnit})`;

      const tdCost = document.createElement("td");
      tdCost.style.cssText = "padding: 0.75rem; text-align: right; font-weight: 600;";
      tdCost.textContent = formatMoney(item.cost);

      tr.appendChild(tdName);
      tr.appendChild(tdAmount);
      tr.appendChild(tdCost);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    breakdownContainer.appendChild(table);

        markCalculationComplete();
    statusMessage.textContent = "Recipe cost calculated successfully.";

    // Show export buttons once calculated
    const printBtn = document.getElementById("printRecipeBtn");
    const downloadBtn = document.getElementById("downloadTxtBtn");
    if (printBtn) printBtn.style.display = "inline-block";
    if (downloadBtn) downloadBtn.style.display = "inline-block";
  });


  [servingsInput, recipeNameInput].forEach(function (element) {
    element.addEventListener("input", clearStaleResult);
    element.addEventListener("change", clearStaleResult);
  });

  form.addEventListener("reset", function () {
    window.setTimeout(function () {
      ingredientsContainer.innerHTML = "";
      createIngredientRow(); // Exactly ONE empty row on reset
      resetResults();
    }, 0);
  });
    // Safe & Reliable Print / PDF Report Generator
  const printBtn = document.getElementById("printRecipeBtn");
  if (printBtn) {
    printBtn.addEventListener("click", function () {
  if (!hasCalculatedResult || !latestCalculation) {
    statusMessage.textContent = "Please calculate the recipe cost before printing.";
    return;
  }

  const recipeName = latestCalculation.recipeName;
  const servings = latestCalculation.servings;
  const totalCost = formatMoney(latestCalculation.totalRecipeCost);
  const perServing = formatMoney(latestCalculation.costPerServing);
      let printWindowContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(recipeName)} - Cost Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #121826;
              margin: 0;
              padding: 20px;
              background: #fff;
            }

            .header {
              border-bottom: 2px solid #0f766e;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }

            .brand {
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #0f766e;
              font-weight: bold;
              margin-bottom: 4px;
            }

            h1 {
              font-size: 20px;
              margin: 0;
              color: #0f172a;
            }

            .summary-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }

            .summary-table td {
              border: 1px solid #cbd5e1;
              background: #f8fafc;
              padding: 12px;
              text-align: center;
              width: 33.33%;
            }

            .summary-label {
              font-size: 11px;
              color: #64748b;
              margin-bottom: 4px;
              text-transform: uppercase;
            }

            .summary-value {
              font-size: 16px;
              font-weight: bold;
              color: #0f766e;
            }

            table.main-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }

            table.main-table th,
            table.main-table td {
              border: 1px solid #cbd5e1;
              padding: 8px 10px;
              text-align: left;
              font-size: 12px;
              word-break: break-word;
              overflow-wrap: break-word;
            }

            table.main-table th {
              background-color: #f1f5f9;
              color: #334155;
            }

            .footer {
              margin-top: 30px;
              font-size: 10px;
              color: #94a3b8;
              text-align: center;
              border-top: 1px solid #e2e8f0;
              padding-top: 10px;
            }
          </style>
        </head>

        <body>
          <div class="header">
            <div class="brand">Household Expense Tools</div>
            <h1>Recipe Cost Report: ${escapeHtml(recipeName)}</h1>
          </div>

          <table class="summary-table">
            <tr>
              <td>
                <div class="summary-label">Total Servings</div>
                <div class="summary-value">${escapeHtml(servings)}</div>
              </td>

              <td>
                <div class="summary-label">Total Recipe Cost</div>
                <div class="summary-value">${escapeHtml(totalCost)}</div>
              </td>

              <td>
                <div class="summary-label">Cost Per Serving</div>
                <div class="summary-value">${escapeHtml(perServing)}</div>
              </td>
            </tr>
          </table>

          <h3 style="font-size: 14px; color: #0f172a; margin-top: 20px; margin-bottom: 8px;">
            Ingredient Breakdown
          </h3>

          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 30%;">Ingredient Name</th>
                <th style="width: 17%;">Amount Used</th>
                <th style="width: 18%;">Package Quantity</th>
                <th style="width: 15%;">Package Price</th>
                <th style="width: 15%;">Ingredient Cost</th>
              </tr>
            </thead>

            <tbody>
      `;

      latestCalculation.breakdownItems.forEach(function (item, index) {
          

      printWindowContent += `
              <tr>
                <td
                  colspan="5"
                  style="text-align: right; font-weight: bold; background: #f1f5f9;"
                >
                  Total Recipe Cost:
                </td>

                <td style="font-weight: bold; background: #f1f5f9;">
                  ${escapeHtml(totalCost)}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            Generated via Household Expense Tools &bull; Free browser-based utility calculators.
            <br>
            https://farmingvichar.github.io/
          </div>
        </body>
        </html>
      `;

      let iframe = document.getElementById("printIframe");

      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "printIframe";
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow.document;

      doc.open();
      doc.write(printWindowContent);
      doc.close();

      iframe.contentWindow.focus();

      setTimeout(function () {
        iframe.contentWindow.print();
      }, 500);
    });
  }
}); 

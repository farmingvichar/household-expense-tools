/**
 * Household Expense Tools - Grocery Shrinkflation Calculator Script
 * Client-side calculation engine for shrinkflation X-Ray comparison.
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("shrinkForm");
    if (!form) return;

    const currencySel = document.getElementById("currencySymbol");
    const unitSel = document.getElementById("quantityUnit");

    const oldPriceIn = document.getElementById("oldPrice");
    const oldSizeIn = document.getElementById("oldSize");
    const newPriceIn = document.getElementById("newPrice");
    const newSizeIn = document.getElementById("newSize");

    const svgOldSizeLabel = document.getElementById("svgOldSizeLabel");
    const svgOldUnit = document.getElementById("svgOldUnit");
    const svgNewSizeLabel = document.getElementById("svgNewSizeLabel");
    const svgNewUnit = document.getElementById("svgNewUnit");
    const svgAirZone = document.getElementById("svgAirZone");
    const svgAirText = document.getElementById("svgAirText");
    const svgFillZone = document.getElementById("svgFillZone");

    const verdictTitle = document.getElementById("verdictTitle");
    const verdictText = document.getElementById("verdictText");
    const statusMessage = document.getElementById("shrinkStatus");

    const oldUnitOutput = document.getElementById("oldUnitOutput");
    const newUnitOutput = document.getElementById("newUnitOutput");
    const weightLossOutput = document.getElementById("weightLossOutput");
    const trueInflationOutput = document.getElementById("trueInflationOutput");
    const annualLossOutput = document.getElementById("annualLossOutput");

    const copyBtn = document.getElementById("copyBtn");
    const resetBtn = document.getElementById("resetBtn");

    function formatUnitMoney(symbol, amount) {
      const absVal = Math.abs(amount);
      const decimals = absVal > 0 && absVal < 0.1 ? 4 : 3;
      return (amount < 0 ? "-" : "") + symbol + absVal.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }

    function formatStandardMoney(symbol, amount) {
      const absVal = Math.abs(amount);
      return (amount < 0 ? "-" : "") + symbol + absVal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    function setRestingState(message) {
      const sym = currencySel ? currencySel.value : "$";
      
      if (svgAirZone) {
        svgAirZone.setAttribute("height", "0");
        svgAirZone.setAttribute("opacity", "0");
      }
      if (svgFillZone) {
        svgFillZone.setAttribute("y", "25");
        svgFillZone.setAttribute("height", "200");
      }
      if (svgAirText) svgAirText.setAttribute("opacity", "0");

      if (svgOldSizeLabel) svgOldSizeLabel.textContent = "Original Pack";
      if (svgOldUnit) svgOldUnit.textContent = "---";
      if (svgNewSizeLabel) {
        svgNewSizeLabel.textContent = "Current Pack";
        svgNewSizeLabel.setAttribute("y", "112");
        svgNewSizeLabel.setAttribute("fill", "#ffffff");
      }
      if (svgNewUnit) {
        svgNewUnit.textContent = "---";
        svgNewUnit.setAttribute("y", "134");
        svgNewUnit.setAttribute("fill", "#e2e8f0");
      }

      if (oldUnitOutput) oldUnitOutput.textContent = sym + "0.00";
      if (newUnitOutput) newUnitOutput.textContent = sym + "0.00";
      if (weightLossOutput) weightLossOutput.textContent = "0%";
      if (trueInflationOutput) trueInflationOutput.textContent = "0%";
      if (annualLossOutput) annualLossOutput.textContent = sym + "0.00";

      if (verdictTitle) verdictTitle.textContent = "Consumer verdict";
      if (verdictText) verdictText.textContent = "Awaiting package numbers.";
      if (statusMessage) {
        statusMessage.textContent = message || "Enter package prices and sizes or tap an example button above to run the X-Ray comparison.";
      }
      if (copyBtn) copyBtn.dataset.clipboard = "";
    }

    function updateCalculation() {
      const sym = currencySel ? currencySel.value : "$";
      const unit = unitSel ? unitSel.value : "oz";

      const oldPRaw = oldPriceIn.value.trim();
      const oldSRaw = oldSizeIn.value.trim();
      const newPRaw = newPriceIn.value.trim();
      const newSRaw = newSizeIn.value.trim();

      if (!oldPRaw || !oldSRaw || !newPRaw || !newSRaw) {
        setRestingState("Enter all four price and size numbers to see the live X-Ray breakdown.");
        return;
      }

      const oldP = Number(oldPRaw);
      const oldS = Number(oldSRaw);
      const newP = Number(newPRaw);
      const newS = Number(newSRaw);

      if (!Number.isFinite(oldP) || !Number.isFinite(oldS) || !Number.isFinite(newP) || !Number.isFinite(newS) || oldP <= 0 || oldS <= 0 || newP <= 0 || newS <= 0) {
        setRestingState("All package prices and quantities must be positive numbers greater than zero.");
        return;
      }

      const oldUnitRate = oldP / oldS;
      const newUnitRate = newP / newS;
      const sizeLossPct = ((oldS - newS) / oldS) * 100;
      const inflationPct = ((newUnitRate - oldUnitRate) / oldUnitRate) * 100;
      const annualImpact = (newUnitRate - oldUnitRate) * oldS * 24;

      if (oldUnitOutput) oldUnitOutput.textContent = formatUnitMoney(sym, oldUnitRate) + " / " + unit;
      if (newUnitOutput) newUnitOutput.textContent = formatUnitMoney(sym, newUnitRate) + " / " + unit;

      if (weightLossOutput) {
        if (Math.abs(sizeLossPct) < 0.05) {
          weightLossOutput.textContent = "0% (Same size)";
        } else if (sizeLossPct > 0) {
          weightLossOutput.textContent = "-" + sizeLossPct.toFixed(1) + "% (" + (oldS - newS).toFixed(2).replace(/\.00$/, "") + " " + unit + " lost)";
        } else {
          weightLossOutput.textContent = "+" + Math.abs(sizeLossPct).toFixed(1) + "% bonus size";
        }
      }

      if (trueInflationOutput) {
        if (Math.abs(inflationPct) < 0.05) {
          trueInflationOutput.textContent = "0%";
        } else if (inflationPct > 0) {
          trueInflationOutput.textContent = "+" + inflationPct.toFixed(1) + "%";
        } else {
          trueInflationOutput.textContent = inflationPct.toFixed(1) + "% (Cheaper)";
        }
      }

      if (annualLossOutput) {
        annualLossOutput.textContent = annualImpact > 0
          ? "+" + formatStandardMoney(sym, annualImpact) + " / yr"
          : formatStandardMoney(sym, annualImpact) + " / yr";
      }

      if (svgOldSizeLabel) svgOldSizeLabel.textContent = oldS + " " + unit + " (" + sym + oldP.toFixed(2) + ")";
      if (svgOldUnit) svgOldUnit.textContent = formatUnitMoney(sym, oldUnitRate) + " / " + unit;
      if (svgNewSizeLabel) svgNewSizeLabel.textContent = newS + " " + unit + " (" + sym + newP.toFixed(2) + ")";
      if (svgNewUnit) svgNewUnit.textContent = formatUnitMoney(sym, newUnitRate) + " / " + unit;

      if (svgAirZone && svgFillZone && svgAirText) {
        if (sizeLossPct > 0.05) {
          const ratio = Math.min(Math.max(newS / oldS, 0.06), 1);
          const fillHeight = Math.round(200 * ratio);
          const airHeight = 200 - fillHeight;
          const fillY = 25 + airHeight;

          svgAirZone.setAttribute("y", "25");
          svgAirZone.setAttribute("height", String(airHeight));
          svgAirZone.setAttribute("fill", "url(#airStripes)");
          svgAirZone.setAttribute("stroke", "#ef4444");
          svgAirZone.setAttribute("opacity", "1");

          svgFillZone.setAttribute("y", String(fillY));
          svgFillZone.setAttribute("height", String(fillHeight));

          // Fix 3: Show air percentage label safely ONLY when air gap height is >= 24px
          if (airHeight >= 24) {
            svgAirText.textContent = "−" + sizeLossPct.toFixed(1) + "%";
            svgAirText.setAttribute("y", String(25 + (airHeight / 2)));
            svgAirText.setAttribute("fill", "#b91c1c");
            svgAirText.setAttribute("opacity", "1");
          } else {
            svgAirText.setAttribute("opacity", "0");
          }

          if (fillHeight >= 55) {
            const centerFillY = fillY + (fillHeight / 2);
            svgNewSizeLabel.setAttribute("y", String(centerFillY - 8));
            svgNewSizeLabel.setAttribute("fill", "#ffffff");
            svgNewUnit.setAttribute("y", String(centerFillY + 12));
            svgNewUnit.setAttribute("fill", "#e2e8f0");
          } else {
            svgNewSizeLabel.setAttribute("y", "125");
            svgNewSizeLabel.setAttribute("fill", "#1e293b");
            svgNewUnit.setAttribute("y", "145");
            svgNewUnit.setAttribute("fill", "#1e293b");
          }
        } else if (sizeLossPct < -0.05) {
          const bonusPct = Math.abs(sizeLossPct);
          const bonusHeight = Math.min(Math.max(Math.round(200 * (bonusPct / (100 + bonusPct))), 26), 95);
          const baseHeight = 200 - bonusHeight;
          const baseY = 25 + bonusHeight;

          svgAirZone.setAttribute("y", "25");
          svgAirZone.setAttribute("height", String(bonusHeight));
          svgAirZone.setAttribute("fill", "url(#bonusStripes)");
          svgAirZone.setAttribute("stroke", "#10b981");
          svgAirZone.setAttribute("opacity", "1");

          svgFillZone.setAttribute("y", String(baseY));
          svgFillZone.setAttribute("height", String(baseHeight));

          svgAirText.textContent = "+" + bonusPct.toFixed(1) + "% BONUS";
          svgAirText.setAttribute("y", String(25 + (bonusHeight / 2)));
          svgAirText.setAttribute("fill", "#047857");
          svgAirText.setAttribute("opacity", "1");

          const centerFillY = baseY + (baseHeight / 2);
          svgNewSizeLabel.setAttribute("y", String(centerFillY - 8));
          svgNewSizeLabel.setAttribute("fill", "#ffffff");
          svgNewUnit.setAttribute("y", String(centerFillY + 12));
          svgNewUnit.setAttribute("fill", "#e2e8f0");
        } else {
          svgAirZone.setAttribute("height", "0");
          svgAirZone.setAttribute("opacity", "0");
          svgFillZone.setAttribute("y", "25");
          svgFillZone.setAttribute("height", "200");
          svgAirText.setAttribute("opacity", "0");

          svgNewSizeLabel.setAttribute("y", "112");
          svgNewSizeLabel.setAttribute("fill", "#ffffff");
          svgNewUnit.setAttribute("y", "134");
          svgNewUnit.setAttribute("fill", "#e2e8f0");
        }
      }

      if (verdictTitle && verdictText) {
        if (inflationPct > 20) {
          verdictTitle.textContent = "Extreme Shrinkflation Alert (+" + inflationPct.toFixed(1) + "% True Hike)";
          verdictText.textContent = "This package underwent aggressive volume reduction. The real cost per " + unit + " surged by " + inflationPct.toFixed(1) + "%. Buying 2 packs a month costs an extra " + formatStandardMoney(sym, annualImpact) + " over 12 months. Consider store brands or bulk alternatives.";
        } else if (inflationPct >= 5) {
          verdictTitle.textContent = "Sneaky Shrinkflation Detected (+" + inflationPct.toFixed(1) + "% Unit Hike)";
          verdictText.textContent = "The shelf price looks familiar, but you pay " + inflationPct.toFixed(1) + "% more per " + unit + ". Buying 2 packs monthly drains an extra " + formatStandardMoney(sym, annualImpact) + " annually from your budget for empty air space.";
        } else if (inflationPct > 0.05) {
          verdictTitle.textContent = "Fair / Minimal Change (+" + inflationPct.toFixed(1) + "% Variation)";
          verdictText.textContent = "The unit price shifted by under 5%, aligning with normal seasonal retail adjustments or packaging redesigns.";
        } else if (inflationPct < -0.05) {
          verdictTitle.textContent = "Bonus Value Detected (" + inflationPct.toFixed(1) + "% Lower Unit Cost)";
          verdictText.textContent = "Good news! Your cost per " + unit + " dropped by " + Math.abs(inflationPct).toFixed(1) + "%. You get more usable product per dollar spent.";
        } else {
          verdictTitle.textContent = "Identical Unit Value (0% Change)";
          verdictText.textContent = "Both packages deliver the exact same unit cost of " + formatUnitMoney(sym, newUnitRate) + " per " + unit + ".";
        }
      }

      if (statusMessage) {
        statusMessage.textContent = "X-Ray comparison updated successfully.";
      }

      if (copyBtn) {
        copyBtn.dataset.clipboard =
          "Shrinkflation X-Ray Alert: " +
          (sizeLossPct > 0 ? sizeLossPct.toFixed(1) + "% less product = " : "") +
          (inflationPct > 0 ? "+" : "") + inflationPct.toFixed(1) + "% hidden price hike! " +
          "(Old: " + oldS + " " + unit + " @ " + sym + oldP.toFixed(2) + " vs. New: " + newS + " " + unit + " @ " + sym + newP.toFixed(2) + "). " +
          "Checked on https://householdexpensetools.com/tools/shrinkflation-calculator/";
      }
    }

    form.addEventListener("input", updateCalculation);
    
    // 1. Page reload रोकने और बटन का डार्क कलर (Focus) हटाने का पैच
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      updateCalculation();
      if (document.activeElement) {
        document.activeElement.blur(); 
      }
    });

    if (currencySel) currencySel.addEventListener("change", updateCalculation);
    if (unitSel) unitSel.addEventListener("change", updateCalculation);

    const btnChips = document.getElementById("presetChips");
    const btnCoffee = document.getElementById("presetCoffee");
    const btnSoap = document.getElementById("presetSoap");

    if (btnChips) {
      btnChips.addEventListener("click", function () {
        currencySel.value = "$";
        unitSel.value = "oz";
        oldPriceIn.value = "4.29";
        oldSizeIn.value = "16";
        newPriceIn.value = "4.29";
        newSizeIn.value = "13.5";
        updateCalculation();
      });
    }

    if (btnCoffee) {
      btnCoffee.addEventListener("click", function () {
        currencySel.value = "$";
        unitSel.value = "oz";
        oldPriceIn.value = "8.99";
        oldSizeIn.value = "12";
        newPriceIn.value = "8.99";
        newSizeIn.value = "10.5";
        updateCalculation();
      });
    }

    if (btnSoap) {
      btnSoap.addEventListener("click", function () {
        currencySel.value = "$";
        unitSel.value = "fl oz";
        oldPriceIn.value = "3.49";
        oldSizeIn.value = "24";
        newPriceIn.value = "3.49";
        newSizeIn.value = "21.6";
        updateCalculation();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        const textToCopy = copyBtn.dataset.clipboard;
        if (!textToCopy) {
          if (statusMessage) statusMessage.textContent = "Please enter package numbers or choose a preset before copying.";
          return;
        }

        function showCopiedState() {
          const originalLabel = copyBtn.textContent;
          copyBtn.textContent = "Copied! ✓";
          if (statusMessage) statusMessage.textContent = "Summary copied to your clipboard.";
          window.setTimeout(function () {
            copyBtn.textContent = originalLabel;
          }, 2000);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy).then(showCopiedState).catch(function () {
            if (statusMessage) statusMessage.textContent = textToCopy;
          });
        } else {
          const tempInput = document.createElement("textarea");
          tempInput.value = textToCopy;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand("copy");
          document.body.removeChild(tempInput);
          showCopiedState();
        }
      });
    }

    // 2. Clear numbers पर Cancel दबाने से रीसेट रोकने का फाइनल पैच
    if (resetBtn) {
      resetBtn.addEventListener("click", function (e) {
        e.preventDefault(); 
        if (confirm("Clear all package numbers?")) {
          form.reset();
          window.setTimeout(function () {
            setRestingState("Cleared all numbers. Enter new package details to compare.");
          }, 10);
        }
      });
    }

    setRestingState();
  });
})();

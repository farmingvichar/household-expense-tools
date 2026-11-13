(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    // 1. Core Elements
    const form = document.getElementById("second-income-form");
    const resultsSection = document.getElementById("second-income-results");
    const statusMessage = document.getElementById("status-message");
    
    // Dynamic path-based localStorage key to prevent conflict with US tool
    const storageKey = 'saved_tool_' + window.location.pathname;

    // Inputs
    const currencyEl = document.getElementById("global-currency");
    const payBasisEl = document.getElementById("pay-basis");
    const grossPayEl = document.getElementById("gross-pay");
    const hoursGroup = document.getElementById("hours-group");
    const weeklyHoursEl = document.getElementById("weekly-hours");
    const taxRateEl = document.getElementById("tax-rate");
    const careCostEl = document.getElementById("childcare-cost");
    const careFreqEl = document.getElementById("childcare-freq");
    const careSubsidyEl = document.getElementById("care-subsidy");
    const subsidyFreqEl = document.getElementById("subsidy-freq");
    const workExpensesEl = document.getElementById("work-expenses");

    // Outputs
    const resNetMonthly = document.getElementById("res-net-monthly");
    const resNetYearly = document.getElementById("res-net-yearly");
    const resRealHourly = document.getElementById("res-real-hourly");
    const resBreakeven = document.getElementById("res-breakeven");
    const resRetentionRate = document.getElementById("res-retention-rate");
    const barTax = document.getElementById("bar-tax");
    const barCare = document.getElementById("bar-care");
    const barNet = document.getElementById("bar-net");

    // 2. Multi-Currency Data (Zero API, Instant Switch)
    const currData = {
      "USD": { sym: "$", ann: "55000", mon: "4500", hr: "28", care: "1500" },
      "INR": { sym: "₹", ann: "1200000", mon: "100000", hr: "600", care: "15000" },
      "GBP": { sym: "£", ann: "45000", mon: "3750", hr: "22", care: "1200" },
      "EUR": { sym: "€", ann: "50000", mon: "4100", hr: "25", care: "1300" },
      "CAD": { sym: "C$", ann: "65000", mon: "5400", hr: "33", care: "1600" },
      "AUD": { sym: "A$", ann: "75000", mon: "6250", hr: "38", care: "1800" },
      "AED": { sym: "AED ", ann: "180000", mon: "15000", hr: "90", care: "4000" }
    };

    // Helper: Formats money smoothly (e.g. ₹ 12,00,000.00 or $ 1,200.00)
    function formatMoney(cents) {
      const code = currencyEl.value;
      const sym = currData[code].sym;
      const val = cents / 100;
      // Use 'en-IN' for Indian Rupee grouping, 'en-US' for others
      const locale = code === "INR" ? "en-IN" : "en-US";
      return sym + val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // 3. UI Interactions & Placeholders
    function updateUI() {
      const isHourly = payBasisEl.value === "hourly";
      const isMonthly = payBasisEl.value === "monthly";
      const code = currencyEl.value;
      const data = currData[code];

      // Toggle Hours Field
      hoursGroup.style.display = isHourly ? "block" : "none";

      // Update All Symbol Spans
      document.querySelectorAll(".curr-sym").forEach(el => {
        el.textContent = data.sym.trim();
      });

      // Update Smart Placeholders
      if (isHourly) grossPayEl.placeholder = data.hr;
      else if (isMonthly) grossPayEl.placeholder = data.mon;
      else grossPayEl.placeholder = data.ann;
      
      careCostEl.placeholder = data.care;

      // Recalculate instantly if results are already visible
      if (resultsSection.style.display === "block") {
        calculateEngine();
      }
    }

    currencyEl.addEventListener("change", updateUI);
    payBasisEl.addEventListener("change", updateUI);

    document.querySelectorAll(".tax-preset").forEach(btn => {
      btn.addEventListener("click", function () {
        taxRateEl.value = this.getAttribute("data-rate");
        this.blur();
      });
    });

    // 4. Core Math Engine (Strict Cents-Safe Architecture)
    function calculateEngine() {
      const code = currencyEl.value;
      const basis = payBasisEl.value;
      let rawGross = parseFloat(grossPayEl.value) || 0;
      const hours = parseFloat(weeklyHoursEl.value) || 40;
      const taxRate = parseFloat(taxRateEl.value) || 0;
      const careRaw = parseFloat(careCostEl.value) || 0;
      const isCareWeekly = careFreqEl.value === "weekly";
      const subsidyRaw = parseFloat(careSubsidyEl.value) || 0;
      const isSubsidyYearly = subsidyFreqEl.value === "yearly";
      const workExpMonthly = parseFloat(workExpensesEl.value) || 0;

      // Convert to Annual Gross Baseline
      let annualGross = rawGross;
      if (basis === "hourly") annualGross = rawGross * hours * 52;
      if (basis === "monthly") annualGross = rawGross * 12;
      
      let annualGrossCents = Math.round(annualGross * 100);
      
      if (annualGrossCents <= 0) {
        statusMessage.textContent = "Please enter a gross pay greater than zero.";
        statusMessage.classList.remove("visually-hidden");
        return;
      }
      statusMessage.classList.add("visually-hidden");

      // Tax & Deductions
      let taxRateDecimal = taxRate / 100;
      let annualTaxCents = Math.round(annualGrossCents * taxRateDecimal);
      let annualNetSalaryCents = annualGrossCents - annualTaxCents;

      // Expenses & Subsidies
      let annualCareCents = isCareWeekly ? Math.round(careRaw * 100 * 52) : Math.round(careRaw * 100 * 12);
      let annualSubsidyCents = isSubsidyYearly ? Math.round(subsidyRaw * 100) : Math.round(subsidyRaw * 100 * 12);
      let annualWorkExpCents = Math.round(workExpMonthly * 100 * 12);

      let totalOutflowCents = annualCareCents + annualWorkExpCents - annualSubsidyCents;
      if (totalOutflowCents < 0) totalOutflowCents = 0; // Subsidy can't make you richer than expenses

      let annualSurplusCents = annualNetSalaryCents - totalOutflowCents;
      let monthlySurplusCents = Math.round(annualSurplusCents / 12);

      // Break-Even Math (Gross needed to cover Tax + Outflows)
      let breakEvenGrossCents = taxRateDecimal < 1 ? Math.round(totalOutflowCents / (1 - taxRateDecimal)) : 0;

      // Real Hourly Rate
      let monthlyHours = (hours * 52) / 12;
      let realHourlyCents = Math.round(monthlySurplusCents / monthlyHours);

      // DOM Updates
      resNetMonthly.textContent = formatMoney(monthlySurplusCents);
      resNetYearly.textContent = formatMoney(annualSurplusCents) + ' / year';
      
      if (monthlySurplusCents < 0) {
        resNetMonthly.style.color = '#e11d48';
        resRealHourly.textContent = 'Losing Money';
        resRealHourly.style.color = '#e11d48';
      } else {
        resNetMonthly.style.color = 'var(--color-primary)';
        resRealHourly.textContent = formatMoney(realHourlyCents) + ' / hr';
        resRealHourly.style.color = 'var(--color-text-main)';
      }

      resBreakeven.textContent = formatMoney(breakEvenGrossCents) + ' / year';

      // Paycheck Retention Rate & Bar Chart
      let retentionPct = (annualSurplusCents / annualGrossCents) * 100;
      let taxPct = (annualTaxCents / annualGrossCents) * 100;
      let expensePct = (totalOutflowCents / annualGrossCents) * 100;
      
      if (retentionPct < 0) retentionPct = 0; 
      
      resRetentionRate.textContent = retentionPct.toFixed(1) + "% Kept";
      resRetentionRate.style.color = retentionPct > 0 ? "var(--color-primary)" : "#e11d48";

      barTax.style.width = taxPct + "%";
      barCare.style.width = expensePct + "%";
      barNet.style.width = retentionPct + "%";

      resultsSection.style.display = "block";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      calculateEngine();
      if (document.activeElement) document.activeElement.blur();
    });

    // 5. Restore Saved Data
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        currencyEl.value = parsed.curr || "USD";
        payBasisEl.value = parsed.basis || "annual";
        grossPayEl.value = parsed.gross || "";
        weeklyHoursEl.value = parsed.hours || "40";
        taxRateEl.value = parsed.tax || "20";
        careCostEl.value = parsed.care || "";
        careFreqEl.value = parsed.careFreq || "monthly";
        careSubsidyEl.value = parsed.subsidy || "";
        subsidyFreqEl.value = parsed.subsidyFreq || "monthly";
        workExpensesEl.value = parsed.workExp || "";
        updateUI();
        if (grossPayEl.value && careCostEl.value) calculateEngine();
      } catch (e) { console.error("Restore failed", e); }
    } else {
      updateUI();
    }

    // 6. Action Bar Controls
    let saveTimer = null;
    document.getElementById("btn-save").addEventListener("click", function () {
      const data = {
        curr: currencyEl.value,
        basis: payBasisEl.value,
        gross: grossPayEl.value,
        hours: weeklyHoursEl.value,
        tax: taxRateEl.value,
        care: careCostEl.value,
        careFreq: careFreqEl.value,
        subsidy: careSubsidyEl.value,
        subsidyFreq: subsidyFreqEl.value,
        workExp: workExpensesEl.value
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
      const btn = this;
      clearTimeout(saveTimer);
      btn.textContent = "Saved!";
      saveTimer = setTimeout(() => btn.textContent = "Save", 2000);
      btn.blur();
    });

    let copyTimer = null;
    document.getElementById("btn-copy").addEventListener("click", function () {
      const code = currencyEl.value;
      const basis = payBasisEl.value;
      const rawGross = parseFloat(grossPayEl.value) || 0;
      const locale = code === "INR" ? "en-IN" : "en-US";
      const formattedGross = currData[code].sym + rawGross.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      let grossLabel = `${formattedGross} / year`;
      if (basis === "monthly") grossLabel = `${formattedGross} / month`;
      if (basis === "hourly") grossLabel = `${formattedGross} / hr`;

      const text = `Second Income Reality Check:\nGross Pay: ${grossLabel}\nNet Surplus: ${resNetMonthly.textContent} (${resNetYearly.textContent})\nReal Hourly Rate: ${resRealHourly.textContent}\nPaycheck Kept: ${resRetentionRate.textContent}\nCalculated via HouseholdExpenseTools.com`;
      
      navigator.clipboard.writeText(text).then(() => {
        const btn = this;
        clearTimeout(copyTimer);
        btn.textContent = "Copied!";
        copyTimer = setTimeout(() => btn.textContent = "Copy", 2000);
        btn.blur();
      });
    });

    document.getElementById("btn-pdf").addEventListener("click", function () {
      this.blur();
      if (resultsSection.style.display === "none") {
        form.reportValidity();
        return;
      }
      document.title = "Second Income vs. Childcare Cost Calculator | Household Expense Tools";
      window.print();
    });

    let clearTimer = null;
    document.getElementById("btn-clear").addEventListener("click", function () {
      const hasCalculated = resultsSection.style.display !== "none";
      const hasSaved = localStorage.getItem(storageKey) !== null;
      const hasCustomInputs =
        grossPayEl.value.trim() !== "" ||
        careCostEl.value.trim() !== "" ||
        careSubsidyEl.value.trim() !== "" ||
        workExpensesEl.value.trim() !== "" ||
        taxRateEl.value.trim() !== "20" ||
        weeklyHoursEl.value.trim() !== "40";

      if (!hasCalculated && !hasSaved && !hasCustomInputs) {
        const btn = this;
        clearTimeout(clearTimer);
        btn.textContent = "No Data";
        clearTimer = setTimeout(() => { btn.textContent = "Clear All"; }, 1500);
        btn.blur();
        return;
      }

      if (confirm("Are you sure you want to clear all data?")) {
        clearTimeout(clearTimer);
        this.textContent = "Clear All";
        form.reset();
        localStorage.removeItem(storageKey);
        resultsSection.style.display = "none";
        // Reset defaults
        currencyEl.value = "USD";
        payBasisEl.value = "annual";
        updateUI();
      }
      this.blur();
    });
  });
})();

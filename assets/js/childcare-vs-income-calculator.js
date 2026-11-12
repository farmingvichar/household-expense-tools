document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('childcare-form');
  var resultsSection = document.getElementById('results-section');
  var storageKey = 'saved_tool_' + window.location.pathname;

  // DOM Elements - Inputs
  var incomeTypeEl = document.getElementById('income-type');
  var grossIncomeEl = document.getElementById('gross-income');
  var hoursGroup = document.getElementById('hours-group');
  var hoursPerWeekEl = document.getElementById('hours-per-week');
  var taxRateEl = document.getElementById('tax-rate');
  var fsaEl = document.getElementById('fsa-contribution');
  var childcareCostEl = document.getElementById('childcare-cost');
  var childcareFreqEl = document.getElementById('childcare-frequency');
  var workExpensesEl = document.getElementById('work-expenses');

  // DOM Elements - Outputs
  var resNetMonthly = document.getElementById('res-net-monthly');
  var resNetYearly = document.getElementById('res-net-yearly');
  var resEffectiveHourly = document.getElementById('res-effective-hourly');
  var resBreakeven = document.getElementById('res-breakeven');
  var barTax = document.getElementById('bar-tax');
  var barChildcare = document.getElementById('bar-childcare');
  var barNet = document.getElementById('bar-net');

  // DOM Elements - Action Buttons
  var btnSave = document.getElementById('btn-save');
  var btnCopy = document.getElementById('btn-copy');
  var btnPdf = document.getElementById('btn-pdf');
  var btnClear = document.getElementById('btn-clear');

  if (!form || !resultsSection) {
    return;
  }

  // --- Helper Functions (Adapted from monthly-expense-calculator.js) ---
  function getNumber(inputElement) {
    if (!inputElement) return 0;
    var rawValue = inputElement.value.trim();
    if (rawValue === '') return 0;
    var value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  }

  function hasNegativeValue(inputElement) {
    if (!inputElement || inputElement.value.trim() === '') return false;
    var value = Number(inputElement.value.trim());
    return Number.isFinite(value) && value < 0;
  }

  function formatMoney(cents) {
    var dollars = cents / 100;
    if (!Number.isFinite(dollars)) return '0.00';
    return dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // --- UI Interaction Logic ---
  
  // Toggle Hourly/Annual field
  incomeTypeEl.addEventListener('change', function () {
    if (this.value === 'hourly') {
      hoursGroup.style.display = 'block';
    } else {
      hoursGroup.style.display = 'none';
    }
  });

  // 1-Tap Tax Presets
  var taxPresets = document.querySelectorAll('.tax-preset');
  taxPresets.forEach(function (btn) {
    btn.addEventListener('click', function () {
      taxRateEl.value = this.getAttribute('data-rate');
      this.blur(); // Remove focus for better mobile UX
    });
  });

  // --- Restore Saved Data Logic ---
  var savedData = localStorage.getItem(storageKey);
  if (savedData) {
    try {
      var parsed = JSON.parse(savedData);
      incomeTypeEl.value = parsed.incomeType || 'annual';
      grossIncomeEl.value = parsed.gross || '';
      hoursPerWeekEl.value = parsed.hours || '40';
      taxRateEl.value = parsed.tax || '22';
      fsaEl.value = parsed.fsa || '';
      childcareCostEl.value = parsed.childcare || '';
      childcareFreqEl.value = parsed.childcareFreq || 'monthly';
      workExpensesEl.value = parsed.workExpenses || '';
      
      incomeTypeEl.dispatchEvent(new Event('change'));
      calculateEngine();
    } catch (e) {
      console.error('Failed to restore saved data', e);
    }
  }

  // --- Core Math Engine (Cents-Safe) ---
  function calculateEngine() {
    // 1. Validation check just like your old tool
    var inputsToCheck = [grossIncomeEl, hoursPerWeekEl, taxRateEl, fsaEl, childcareCostEl, workExpensesEl];
    var hasNegativeInput = inputsToCheck.some(function(input) {
      return hasNegativeValue(input);
    });

    if (hasNegativeInput) {
      alert('Please enter 0 or a positive amount. Negative values are not supported.');
      return;
    }

    // 2. Parse Inputs
    var isHourly = incomeTypeEl.value === 'hourly';
    var rawIncome = getNumber(grossIncomeEl);
    var hours = getNumber(hoursPerWeekEl) || 40;
    var taxRate = getNumber(taxRateEl);
    var fsaRaw = getNumber(fsaEl);
    var fsa = Math.min(fsaRaw, 7500); // Max $7500 allowed for DCFSA
    var childcareRaw = getNumber(childcareCostEl);
    var isChildcareWeekly = childcareFreqEl.value === 'weekly';
    var workExpensesMonthly = getNumber(workExpensesEl);

    // 3. Convert to Annual Base in Cents to avoid JS floating point errors
    var annualGross = isHourly ? (rawIncome * hours * 52) : rawIncome;
    var annualGrossCents = Math.round(annualGross * 100);
    
    if (annualGrossCents <= 0) {
      alert('Please enter a valid Gross Pay to calculate.');
      return;
    }

    var taxRateDecimal = taxRate / 100;
    var annualTaxCents = Math.round(annualGrossCents * taxRateDecimal);
    var fsaSavingsCents = Math.round((fsa * 100) * taxRateDecimal);
    
    var annualNetSalaryCents = annualGrossCents - annualTaxCents + fsaSavingsCents;

    var annualChildcareCents = isChildcareWeekly ? Math.round(childcareRaw * 100 * 52) : Math.round(childcareRaw * 100 * 12);
    var annualWorkExpensesCents = Math.round(workExpensesMonthly * 100 * 12);

    var annualNetGainCents = annualNetSalaryCents - annualChildcareCents - annualWorkExpensesCents;
    var monthlyNetGainCents = Math.round(annualNetGainCents / 12);

    // Break-even required gross salary
    var requiredNetCents = annualChildcareCents + annualWorkExpensesCents - fsaSavingsCents;
    var breakEvenGrossCents = taxRateDecimal < 1 ? Math.round(requiredNetCents / (1 - taxRateDecimal)) : 0;

    // Effective Hourly Rate
    var monthlyHours = (hours * 52) / 12;
    var effectiveHourly = (monthlyNetGainCents / 100) / monthlyHours;

    // 4. Update UI DOM Elements
    resNetMonthly.textContent = '$' + formatMoney(monthlyNetGainCents);
    resNetYearly.textContent = '$' + formatMoney(annualNetGainCents) + ' / year';
    
    if (monthlyNetGainCents < 0) {
      resNetMonthly.style.color = '#e11d48'; // Red warning tint
      resEffectiveHourly.textContent = 'Losing Money';
      resEffectiveHourly.style.color = '#e11d48';
    } else {
      resNetMonthly.style.color = 'var(--color-primary)';
      resEffectiveHourly.textContent = '$' + effectiveHourly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' / hr';
      resEffectiveHourly.style.color = 'var(--color-text-main)';
    }

    resBreakeven.textContent = '$' + formatMoney(breakEvenGrossCents) + ' / year';

    // 5. Update Visual Breakdown Bar
    var taxPct = (annualTaxCents / annualGrossCents) * 100;
    var expensePct = ((annualChildcareCents + annualWorkExpensesCents) / annualGrossCents) * 100;
    var netPct = (annualNetGainCents / annualGrossCents) * 100;
    
    if (netPct < 0) netPct = 0; // Prevent bar from breaking if expenses exceed income
    
    barTax.style.width = taxPct + '%';
    barChildcare.style.width = expensePct + '%';
    barNet.style.width = netPct + '%';

    // Show results block
    resultsSection.style.display = 'block';
  }

  // --- Event Listeners for Forms and Action Bar ---
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    calculateEngine();
    if (document.activeElement) document.activeElement.blur(); // Remove mobile keyboard
  });

  if (btnSave) {
    btnSave.addEventListener('click', function () {
      var data = {
        incomeType: incomeTypeEl.value,
        gross: grossIncomeEl.value,
        hours: hoursPerWeekEl.value,
        tax: taxRateEl.value,
        fsa: fsaEl.value,
        childcare: childcareCostEl.value,
        childcareFreq: childcareFreqEl.value,
        workExpenses: workExpensesEl.value
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
      var btn = this;
      btn.textContent = 'Saved!';
      setTimeout(function () { btn.textContent = 'Save'; }, 2000);
      btn.blur();
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', function () {
      var text = "Childcare vs Take-Home Reality:\n" +
                 "Gross Income: $" + grossIncomeEl.value + "\n" +
                 "Net Monthly Gain: " + resNetMonthly.textContent + "\n" +
                 "Effective Hourly: " + resEffectiveHourly.textContent + "\n" +
                 "Calculated via HouseholdExpenseTools.com";
      navigator.clipboard.writeText(text).then(function () {
        var btn = btnCopy;
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Copy'; }, 2000);
        btn.blur();
      });
    });
  }

  if (btnPdf) {
    btnPdf.addEventListener('click', function () {
      this.blur();
      window.print();
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', function () {
      if (confirm('Are you sure you want to clear all data?')) {
        form.reset();
        localStorage.removeItem(storageKey);
        resultsSection.style.display = 'none';
        incomeTypeEl.dispatchEvent(new Event('change'));
      }
      this.blur();
    });
  }
});

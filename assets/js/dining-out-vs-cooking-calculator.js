(function () {
    "use strict";

    const form = document.getElementById("diningCalcForm");
    const currencySelect = document.getElementById("currencySelect");
    
    // Inputs
    const dinersInput = document.getElementById("diners");
    const mealsOutInput = document.getElementById("mealsOut");
    const costOutInput = document.getElementById("costOut");
    const markupInput = document.getElementById("markup");
    const costHomeInput = document.getElementById("costHome");
    
    // Outputs
    const outMonthlyTotalEl = document.getElementById("outMonthlyTotal");
    const homeMonthlyTotalEl = document.getElementById("homeMonthlyTotal");
    const monthlySavingsEl = document.getElementById("monthlySavings");
    const annualSavingsEl = document.getElementById("annualSavings");
    const statusMsg = document.getElementById("calcStatus");
    
    // Buttons
    const calcBtn = document.getElementById("calcBtn");
    const copyBtn = document.getElementById("copyBtn");
    const resetBtn = document.getElementById("resetBtn");

    // Track state to auto-update currency if already calculated
    let hasCalculated = false;

    // Format safely for currency
    function formatCurrency(amount, sym) {
        return sym + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Helper: Cents-safe rounding to prevent floating-point errors
    function roundCents(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    function calculateSavings(e) {
        if (e) {
            e.preventDefault();
            if (e.type === 'submit') calcBtn.blur();
        }

        const sym = currencySelect.value;
        const diners = parseFloat(dinersInput.value) || 0;
        const mealsOut = parseFloat(mealsOutInput.value) || 0;
        const costOut = parseFloat(costOutInput.value) || 0;
        const markup = parseFloat(markupInput.value) || 0;
        const costHome = parseFloat(costHomeInput.value) || 0;

        // Validation
        if (diners <= 0 || mealsOut < 0 || costOut < 0 || markup < 0 || costHome < 0) {
            statusMsg.textContent = "Please ensure all values are valid numbers (zero or higher).";
            statusMsg.style.color = "#d32f2f";
            return;
        }

        // Math Logic
        const weeksPerMonth = 4.333;
        
        // Calculate true cost per restaurant meal (including tax/tip/fees)
        const trueCostOut = roundCents(costOut * (1 + (markup / 100)));
        
        // Weekly Totals
        const weeklyOut = roundCents(trueCostOut * diners * mealsOut);
        const weeklyHome = roundCents(costHome * diners * mealsOut);

        // Monthly Totals
        const monthlyOut = roundCents(weeklyOut * weeksPerMonth);
        const monthlyHome = roundCents(weeklyHome * weeksPerMonth);

        // Savings
        const monthlySavings = roundCents(monthlyOut - monthlyHome);
        const annualSavings = roundCents(monthlySavings * 12);

        // Update DOM
        outMonthlyTotalEl.textContent = formatCurrency(monthlyOut, sym);
        homeMonthlyTotalEl.textContent = formatCurrency(monthlyHome, sym);
        monthlySavingsEl.textContent = formatCurrency(monthlySavings, sym);
        annualSavingsEl.textContent = formatCurrency(annualSavings, sym);

        // Status Update
        statusMsg.textContent = monthlySavings > 0 
            ? `Success! By cooking these meals at home, you save ${formatCurrency(annualSavings, sym)} per year.`
            : `Calculation complete. Currently, your restaurant costs equal or undercut your estimated home grocery costs.`;
        statusMsg.style.color = "inherit";

        hasCalculated = true;
    }

    // UX Enhancement: Auto-update symbols if user changes currency dropdown
    function handleCurrencyChange() {
        if (hasCalculated) {
            calculateSavings();
        } else {
            const sym = currencySelect.value;
            outMonthlyTotalEl.textContent = formatCurrency(0, sym);
            homeMonthlyTotalEl.textContent = formatCurrency(0, sym);
            monthlySavingsEl.textContent = formatCurrency(0, sym);
            annualSavingsEl.textContent = formatCurrency(0, sym);
        }
    }

    function copySummary() {
        copyBtn.blur();
        
        const textToCopy = `Dining Out vs. Home Cooking Summary:\n` +
            `Monthly Dining Out: ${outMonthlyTotalEl.textContent}\n` +
            `Monthly Home Cooking: ${homeMonthlyTotalEl.textContent}\n` +
            `Net Monthly Savings: ${monthlySavingsEl.textContent}\n` +
            `Annual Savings: ${annualSavingsEl.textContent}\n` +
            `Calculated at householdexpensetools.com`;

        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
        }).catch(() => {
            alert("Unable to copy to clipboard. Please copy manually.");
        });
    }

    function resetCalculator() {
        resetBtn.blur();
        if (confirm("Clear all numbers?")) {
            form.reset();
            hasCalculated = false;
            const sym = currencySelect.value;
            
            // Clean reset to 0.00
            outMonthlyTotalEl.textContent = formatCurrency(0, sym);
            homeMonthlyTotalEl.textContent = formatCurrency(0, sym);
            monthlySavingsEl.textContent = formatCurrency(0, sym);
            annualSavingsEl.textContent = formatCurrency(0, sym);
            
            statusMsg.textContent = "Enter your details to estimate the result.";
            statusMsg.style.color = "inherit";
        }
    }

    // Event Listeners
    form.addEventListener("submit", calculateSavings);
    currencySelect.addEventListener("change", handleCurrencyChange);
    copyBtn.addEventListener("click", copySummary);
    resetBtn.addEventListener("click", resetCalculator);

})();

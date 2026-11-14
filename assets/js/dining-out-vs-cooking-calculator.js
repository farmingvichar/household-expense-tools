(function () {
    "use strict";

    const form = document.getElementById("diningCalcForm");
    const currencySelect = document.getElementById("currencySelect");
    
    // Form Inputs
    const dinersInput = document.getElementById("diners");
    const mealsOutInput = document.getElementById("mealsOut");
    const costOutInput = document.getElementById("costOut");
    const markupInput = document.getElementById("markup");
    const costHomeInput = document.getElementById("costHome");
    
    // Result Outputs
    const outMonthlyTotalEl = document.getElementById("outMonthlyTotal");
    const homeMonthlyTotalEl = document.getElementById("homeMonthlyTotal");
    const monthlySavingsEl = document.getElementById("monthlySavings");
    const annualSavingsEl = document.getElementById("annualSavings");
    const statusMsg = document.getElementById("calcStatus");
    
    // Action Buttons
    const calcBtn = document.getElementById("calcBtn");
    const saveBtn = document.getElementById("saveBtn");
    const copyBtn = document.getElementById("copyBtn");
    const pdfBtn = document.getElementById("pdfBtn");
    const resetBtn = document.getElementById("resetBtn");

    // Dynamic Local Storage Key (Unique for this specific tool page)
    const storageKey = 'saved_tool_' + window.location.pathname;
    let hasCalculated = false;

    // Helper: Safely format currency
    function formatCurrency(amount, sym) {
        return sym + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Helper: Cents-safe rounding to prevent floating-point errors
    function roundCents(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    // --- CORE CALCULATION LOGIC (Original & Safe) ---
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
        
        // True cost per restaurant meal (including tax/tip/fees)
        const trueCostOut = roundCents(costOut * (1 + (markup / 100)));
        
        const weeklyOut = roundCents(trueCostOut * diners * mealsOut);
        const weeklyHome = roundCents(costHome * diners * mealsOut);

        const monthlyOut = roundCents(weeklyOut * weeksPerMonth);
        const monthlyHome = roundCents(weeklyHome * weeksPerMonth);

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

    // --- FEATURE 1: LOAD SAVED DATA (Runs on Page Load) ---
    function loadSavedData() {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.currency) currencySelect.value = data.currency;
                if (data.diners) dinersInput.value = data.diners;
                if (data.mealsOut) mealsOutInput.value = data.mealsOut;
                if (data.costOut) costOutInput.value = data.costOut;
                if (data.markup) markupInput.value = data.markup;
                if (data.costHome) costHomeInput.value = data.costHome;
                calculateSavings(); // Auto-calculate so user sees their saved results instantly
            } catch (e) {
                console.error("Failed to load saved tool data.");
            }
        }
    }

    // --- FEATURE 2: SAVE DATA ---
    function saveData() {
        saveBtn.blur();
        const data = {
            currency: currencySelect.value,
            diners: dinersInput.value,
            mealsOut: mealsOutInput.value,
            costOut: costOutInput.value,
            markup: markupInput.value,
            costHome: costHomeInput.value
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
        
        // Show temporary confirmation
        const originalText = saveBtn.textContent;
        saveBtn.textContent = "Saved!";
        setTimeout(() => { saveBtn.textContent = originalText; }, 2000);
    }

    // --- FEATURE 3: COPY SUMMARY ---
    function copySummary() {
        copyBtn.blur();
        if (!hasCalculated) calculateSavings(); // Ensure results exist
        
        const textToCopy = `Dining Out vs. Home Cooking Breakdown:\n` +
            `----------------------------------------\n` +
            `Monthly Dining Out: ${outMonthlyTotalEl.textContent}\n` +
            `Monthly Home Cooking: ${homeMonthlyTotalEl.textContent}\n` +
            `Net Monthly Savings: ${monthlySavingsEl.textContent}\n` +
            `Annual Savings: ${annualSavingsEl.textContent}\n\n` +
            `Calculated privately at householdexpensetools.com`;

        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
        }).catch(() => {
            alert("Unable to copy to clipboard. Please copy manually.");
        });
    }

    // --- FEATURE 4: DOWNLOAD PDF (Native Print API for Speed) ---
    function downloadPDF() {
        pdfBtn.blur();
        if (!hasCalculated) calculateSavings();
        window.print(); // Triggers the @media print CSS layout in HTML
    }

        // --- FEATURE 5: CLEAR ALL (Reset UI & Delete Save) ---
    function clearAll() {
        resetBtn.blur();
        
        // Smart Check: Determine if the form actually has numeric data entered
        const hasData = (parseFloat(dinersInput.value) > 0) || 
                        (parseFloat(mealsOutInput.value) > 0) || 
                        (parseFloat(costOutInput.value) > 0) || 
                        (parseFloat(markupInput.value) > 0) || 
                        (parseFloat(costHomeInput.value) > 0);

        // If form is empty, bypass popup. If filled, ask for confirmation.
        if (!hasData || confirm("Clear all numbers and delete saved data?")) {
            form.reset();
            hasCalculated = false;

            
            // Delete from browser storage
            localStorage.removeItem(storageKey); 
            
            const sym = currencySelect.value;
            outMonthlyTotalEl.textContent = formatCurrency(0, sym);
            homeMonthlyTotalEl.textContent = formatCurrency(0, sym);
            monthlySavingsEl.textContent = formatCurrency(0, sym);
            annualSavingsEl.textContent = formatCurrency(0, sym);
            
            statusMsg.textContent = "Enter your details to estimate the result.";
            statusMsg.style.color = "inherit";

            // Show temporary confirmation
            const originalText = resetBtn.textContent;
            resetBtn.textContent = "Cleared!";
            setTimeout(() => { resetBtn.textContent = originalText; }, 1500);
        }
    }

    // UX Enhancement: Auto-update currency symbols on change
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

    // --- INITIALIZATION & EVENT LISTENERS ---
    document.addEventListener("DOMContentLoaded", loadSavedData); // Auto-load saved inputs
    
    form.addEventListener("submit", calculateSavings);
    currencySelect.addEventListener("change", handleCurrencyChange);
    
    // Action Bar Listeners
    saveBtn.addEventListener("click", saveData);
    copyBtn.addEventListener("click", copySummary);
    pdfBtn.addEventListener("click", downloadPDF);
    resetBtn.addEventListener("click", clearAll);

})();

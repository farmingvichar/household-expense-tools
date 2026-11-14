(function () {
    "use strict";

    // MASTER FIX: HTML load hone ke baad hi JS chale, jisse koi error na aaye aur page upar scroll na ho.
    document.addEventListener("DOMContentLoaded", function () {
        const form = document.getElementById("diningCalcForm");
        
        // Safety lock: Agar form nahi mila toh code error nahi dega.
        if (!form) return;

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

        // Dynamic Local Storage Key
        const storageKey = 'saved_tool_' + window.location.pathname;
        let hasCalculated = false;

        function formatCurrency(amount, sym) {
            return sym + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function roundCents(value) {
            return Math.round((value + Number.EPSILON) * 100) / 100;
        }

        // --- CORE CALCULATION LOGIC ---
        function calculateSavings(e) {
            if (e) {
                e.preventDefault(); // CRITICAL FIX: Page upar scroll hone se rokega
                if (e.type === 'submit' && calcBtn) calcBtn.blur();
            }

            const sym = currencySelect ? currencySelect.value : "$";
            const diners = parseFloat(dinersInput.value) || 0;
            const mealsOut = parseFloat(mealsOutInput.value) || 0;
            const costOut = parseFloat(costOutInput.value) || 0;
            const markup = parseFloat(markupInput.value) || 0;
            const costHome = parseFloat(costHomeInput.value) || 0;

            // Validation
            if (diners <= 0 || mealsOut < 0 || costOut < 0 || markup < 0 || costHome < 0) {
                if (statusMsg) {
                    statusMsg.textContent = "Please ensure all values are valid numbers (zero or higher).";
                    statusMsg.style.color = "#d32f2f";
                }
                return;
            }

            // Math Logic
            const weeksPerMonth = 4.333;
            const trueCostOut = roundCents(costOut * (1 + (markup / 100)));
            const weeklyOut = roundCents(trueCostOut * diners * mealsOut);
            const weeklyHome = roundCents(costHome * diners * mealsOut);
            const monthlyOut = roundCents(weeklyOut * weeksPerMonth);
            const monthlyHome = roundCents(weeklyHome * weeksPerMonth);
            const monthlySavings = roundCents(monthlyOut - monthlyHome);
            const annualSavings = roundCents(monthlySavings * 12);

            // Update DOM
            if (outMonthlyTotalEl) outMonthlyTotalEl.textContent = formatCurrency(monthlyOut, sym);
            if (homeMonthlyTotalEl) homeMonthlyTotalEl.textContent = formatCurrency(monthlyHome, sym);
            if (monthlySavingsEl) monthlySavingsEl.textContent = formatCurrency(monthlySavings, sym);
            if (annualSavingsEl) annualSavingsEl.textContent = formatCurrency(annualSavings, sym);

            // Status Update
            if (statusMsg) {
                statusMsg.textContent = monthlySavings > 0 
                    ? `Success! By cooking these meals at home, you save ${formatCurrency(annualSavings, sym)} per year.`
                    : `Calculation complete. Currently, your restaurant costs equal or undercut your estimated home grocery costs.`;
                statusMsg.style.color = "inherit";
            }

            hasCalculated = true;
        }

        // --- FEATURE 1: LOAD SAVED DATA ---
        function loadSavedData() {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    if (data.currency && currencySelect) currencySelect.value = data.currency;
                    if (data.diners && dinersInput) dinersInput.value = data.diners;
                    if (data.mealsOut && mealsOutInput) mealsOutInput.value = data.mealsOut;
                    if (data.costOut && costOutInput) costOutInput.value = data.costOut;
                    if (data.markup && markupInput) markupInput.value = data.markup;
                    if (data.costHome && costHomeInput) costHomeInput.value = data.costHome;
                    calculateSavings(); 
                } catch (e) {
                    console.error("Failed to load saved tool data.");
                }
            }
        }

        // --- FEATURE 2: SAVE DATA ---
        function saveData() {
            if (saveBtn) saveBtn.blur();
            const data = {
                currency: currencySelect ? currencySelect.value : "$",
                diners: dinersInput ? dinersInput.value : "",
                mealsOut: mealsOutInput ? mealsOutInput.value : "",
                costOut: costOutInput ? costOutInput.value : "",
                markup: markupInput ? markupInput.value : "",
                costHome: costHomeInput ? costHomeInput.value : ""
            };
            localStorage.setItem(storageKey, JSON.stringify(data));
            
            if (saveBtn) {
                const originalText = saveBtn.textContent;
                saveBtn.textContent = "Saved!";
                setTimeout(() => { saveBtn.textContent = originalText; }, 2000);
            }
        }

        // --- FEATURE 3: COPY SUMMARY ---
        function copySummary() {
            if (copyBtn) copyBtn.blur();
            
            // FIX: Ab auto-calculate nahi hoga. Error message dikhayega.
            if (!hasCalculated) {
                if (statusMsg) {
                    statusMsg.textContent = "Please calculate your savings before copying.";
                    statusMsg.style.color = "#d32f2f";
                }
                return;
            }
            
            const textToCopy = `Dining Out vs. Home Cooking Breakdown:\n` +
                `----------------------------------------\n` +
                `Monthly Dining Out: ${outMonthlyTotalEl ? outMonthlyTotalEl.textContent : ''}\n` +
                `Monthly Home Cooking: ${homeMonthlyTotalEl ? homeMonthlyTotalEl.textContent : ''}\n` +
                `Net Monthly Savings: ${monthlySavingsEl ? monthlySavingsEl.textContent : ''}\n` +
                `Annual Savings: ${annualSavingsEl ? annualSavingsEl.textContent : ''}\n\n` +
                `Calculated privately at householdexpensetools.com`;

            navigator.clipboard.writeText(textToCopy).then(() => {
                if (copyBtn) {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = "Copied!";
                    setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
                }
            }).catch(() => {
                alert("Unable to copy to clipboard. Please copy manually.");
            });
        }

        // --- FEATURE 4: DOWNLOAD PDF ---
        function downloadPDF() {
            if (pdfBtn) pdfBtn.blur();
            
            // FIX: Ab auto-calculate nahi hoga. Error message dikhayega.
            if (!hasCalculated) {
                if (statusMsg) {
                    statusMsg.textContent = "Please calculate your savings before saving a PDF.";
                    statusMsg.style.color = "#d32f2f";
                }
                return;
            }
            window.print(); 
        }

        // --- FEATURE 5: CLEAR ALL ---
        function clearAll() {
            if (resetBtn) resetBtn.blur();
            
            // Smart Logic: Check empty form or modified defaults
            const isCompletelyEmpty = (!dinersInput || dinersInput.value.trim() === "") && 
                                      (!mealsOutInput || mealsOutInput.value.trim() === "") && 
                                      (!costOutInput || costOutInput.value.trim() === "") && 
                                      (!markupInput || markupInput.value.trim() === "") && 
                                      (!costHomeInput || costHomeInput.value.trim() === "");

            const hasChanges = (dinersInput && dinersInput.value !== dinersInput.defaultValue) ||
                               (mealsOutInput && mealsOutInput.value !== mealsOutInput.defaultValue) ||
                               (costOutInput && costOutInput.value !== costOutInput.defaultValue) ||
                               (markupInput && markupInput.value !== markupInput.defaultValue) ||
                               (costHomeInput && costHomeInput.value !== costHomeInput.defaultValue);

            const needsPopup = hasCalculated || (hasChanges && !isCompletelyEmpty);

            if (!needsPopup || confirm("Clear all numbers and delete saved data?")) {
                form.reset();
                hasCalculated = false;
                localStorage.removeItem(storageKey); 
                
                const sym = currencySelect ? currencySelect.value : "$";
                if (outMonthlyTotalEl) outMonthlyTotalEl.textContent = formatCurrency(0, sym);
                if (homeMonthlyTotalEl) homeMonthlyTotalEl.textContent = formatCurrency(0, sym);
                if (monthlySavingsEl) monthlySavingsEl.textContent = formatCurrency(0, sym);
                if (annualSavingsEl) annualSavingsEl.textContent = formatCurrency(0, sym);
                
                if (statusMsg) {
                    statusMsg.textContent = "Enter your details to estimate the result.";
                    statusMsg.style.color = "inherit";
                }

                // FIX: Fast Speed (500ms)
                if (resetBtn) {
                    const originalText = resetBtn.textContent;
                    resetBtn.textContent = "Cleared!";
                    setTimeout(() => { resetBtn.textContent = originalText; }, 500);
                }
            }
        }

        // UX Enhancement: Auto-update currency symbols on change
        function handleCurrencyChange() {
            if (hasCalculated) {
                calculateSavings();
            } else {
                const sym = currencySelect ? currencySelect.value : "$";
                if (outMonthlyTotalEl) outMonthlyTotalEl.textContent = formatCurrency(0, sym);
                if (homeMonthlyTotalEl) homeMonthlyTotalEl.textContent = formatCurrency(0, sym);
                if (monthlySavingsEl) monthlySavingsEl.textContent = formatCurrency(0, sym);
                if (annualSavingsEl) annualSavingsEl.textContent = formatCurrency(0, sym);
            }
        }

        // --- INITIALIZATION & EVENT LISTENERS ---
        loadSavedData();
        
        form.addEventListener("submit", calculateSavings);
        if (currencySelect) currencySelect.addEventListener("change", handleCurrencyChange);
        
        if (saveBtn) saveBtn.addEventListener("click", saveData);
        if (copyBtn) copyBtn.addEventListener("click", copySummary);
        if (pdfBtn) pdfBtn.addEventListener("click", downloadPDF);
        if (resetBtn) resetBtn.addEventListener("click", clearAll);

    }); // Wrapper End
})();

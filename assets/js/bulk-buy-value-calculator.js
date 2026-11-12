(function () {
    "use strict";

    const form = document.getElementById("bulkValueForm");
    
    // Inputs
    const stdPriceInput = document.getElementById("stdPrice");
    const stdWeightInput = document.getElementById("stdWeight");
    const bulkPriceInput = document.getElementById("bulkPrice");
    const bulkWeightInput = document.getElementById("bulkWeight");
    
    // Slider & Visualizer Elements
    const usageSlider = document.getElementById("usageSlider");
    const usageValueText = document.getElementById("usageValue");
    const bulkFill = document.getElementById("bulkFill");
    const bulkWasteLabel = document.getElementById("bulkWasteLabel");
    
    // Outputs
    const stdUnitPriceOut = document.getElementById("stdUnitPriceOut");
    const bulkIllusionOut = document.getElementById("bulkIllusionOut");
    const trueBulkOut = document.getElementById("trueBulkOut");
    const moneyWastedOut = document.getElementById("moneyWastedOut");
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

    // Helper: Safely format currency
    function formatCurrency(amount) {
        return "$" + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Helper: Safely format unit price (up to 3 decimals for accuracy)
    function formatUnitPrice(amount) {
        return "$" + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    }

    // --- VISUALIZER REAL-TIME UPDATE ---
    function updateVisualizer() {
        const usage = parseInt(usageSlider.value, 10);
        const waste = 100 - usage;
        
        // Update Text Labels
        usageValueText.textContent = usage + "%";
        bulkWasteLabel.textContent = waste + "% Wasted";
        
        // Update CSS Jar Animation
        bulkFill.style.height = usage + "%";
        
        // If waste is high, turn label red
        if (waste > 0) {
            bulkWasteLabel.style.color = "#d32f2f"; // Red
        } else {
            bulkWasteLabel.style.color = "var(--primary)"; // Green
        }

        // If user already clicked calculate, update math in real-time as they drag the slider
        if (hasCalculated) {
            calculateValue();
        }
    }

    // --- CORE MATH LOGIC ---
    function calculateValue(e) {
        if (e) {
            e.preventDefault();
            if (e.type === 'submit') calcBtn.blur();
        }

        const stdPrice = parseFloat(stdPriceInput.value) || 0;
        const stdWeight = parseFloat(stdWeightInput.value) || 0;
        const bulkPrice = parseFloat(bulkPriceInput.value) || 0;
        const bulkWeight = parseFloat(bulkWeightInput.value) || 0;
        const usagePct = parseInt(usageSlider.value, 10) || 0;

        // Validation
        if (stdPrice <= 0 || stdWeight <= 0 || bulkPrice <= 0 || bulkWeight <= 0) {
            statusMsg.textContent = "Please enter valid numbers greater than zero for all price and weight fields.";
            statusMsg.style.color = "#d32f2f";
            return;
        }
        if (bulkWeight <= stdWeight) {
            statusMsg.textContent = "Bulk weight should normally be larger than standard weight to compare properly.";
            statusMsg.style.color = "#d32f2f";
        }

        // 1. Calculate Standard Unit Price
        const stdUnitPrice = stdPrice / stdWeight;

        // 2. Calculate Bulk Illusion Unit Price (Assuming 100% used)
        const bulkIllusionPrice = bulkPrice / bulkWeight;

        // 3. Calculate True Bulk Unit Price (Based on actual usage)
        const usableWeight = bulkWeight * (usagePct / 100);
        const trueBulkPrice = bulkPrice / usableWeight; // Price divided by what you ACTUALLY ate

        // 4. Calculate Money Wasted
        const wastePct = (100 - usagePct) / 100;
        const moneyWasted = bulkPrice * wastePct;

        // 5. Calculate Breakeven Point (How much you MUST eat to beat the standard price)
        const breakevenWeight = bulkPrice / stdUnitPrice; 
        const breakevenPct = Math.ceil((breakevenWeight / bulkWeight) * 100);

        // Update Output DOM
        stdUnitPriceOut.textContent = formatUnitPrice(stdUnitPrice) + " / unit";
        bulkIllusionOut.textContent = formatUnitPrice(bulkIllusionPrice) + " / unit";
        trueBulkOut.textContent = formatUnitPrice(trueBulkPrice) + " / unit";
        moneyWastedOut.textContent = formatCurrency(moneyWasted);

        // Update Status Message (The "Aha!" Moment)
        if (usagePct === 100 && bulkIllusionPrice < stdUnitPrice) {
             statusMsg.innerHTML = `<strong>Great Deal!</strong> If you use 100%, the bulk item is cheaper.`;
             statusMsg.style.color = "var(--primary)";
        } else if (trueBulkPrice > stdUnitPrice) {
             statusMsg.innerHTML = `<strong>Stop!</strong> Because you waste ${100-usagePct}%, you are paying <strong>${formatUnitPrice(trueBulkPrice)}</strong> per unit. You must use at least <strong>${breakevenPct}%</strong> of the bulk size to make it cheaper than the standard size.`;
             statusMsg.style.color = "#d32f2f"; // Red warning
        } else {
             statusMsg.innerHTML = `<strong>Still a Deal.</strong> Even with ${100-usagePct}% waste, the bulk size is still slightly cheaper than the standard size.`;
             statusMsg.style.color = "var(--primary)"; // Green success
        }

        hasCalculated = true;
    }

    // --- FEATURE 1: LOAD SAVED DATA ---
    function loadSavedData() {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.stdPrice) stdPriceInput.value = data.stdPrice;
                if (data.stdWeight) stdWeightInput.value = data.stdWeight;
                if (data.bulkPrice) bulkPriceInput.value = data.bulkPrice;
                if (data.bulkWeight) bulkWeightInput.value = data.bulkWeight;
                if (data.usage) {
                    usageSlider.value = data.usage;
                    updateVisualizer(); // Update the Jars to match saved state
                }
                calculateValue(); // Auto-calculate 
            } catch (e) {
                console.error("Failed to load saved tool data.");
            }
        }
    }

    // --- FEATURE 2: SAVE DATA ---
    function saveData() {
        saveBtn.blur();
        const data = {
            stdPrice: stdPriceInput.value,
            stdWeight: stdWeightInput.value,
            bulkPrice: bulkPriceInput.value,
            bulkWeight: bulkWeightInput.value,
            usage: usageSlider.value
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
        
        const originalText = saveBtn.textContent;
        saveBtn.textContent = "Saved!";
        setTimeout(() => { saveBtn.textContent = originalText; }, 2000);
    }

    // --- FEATURE 3: COPY SUMMARY ---
    function copySummary() {
        copyBtn.blur();
        if (!hasCalculated) calculateValue(); 
        
        const textToCopy = `Bulk-Buy Value & Spoilage Check:\n` +
            `-----------------------------------\n` +
            `Estimated Usage: ${usageValueText.textContent}\n` +
            `Standard Unit Price: ${stdUnitPriceOut.textContent}\n` +
            `True Bulk Unit Price (after waste): ${trueBulkOut.textContent}\n` +
            `Money Wasted on Spoilage: ${moneyWastedOut.textContent}\n\n` +
            `Calculated privately at householdexpensetools.com`;

        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
        }).catch(() => {
            alert("Unable to copy to clipboard. Please copy manually.");
        });
    }

    // --- FEATURE 4: DOWNLOAD PDF (Print) ---
    function downloadPDF() {
        pdfBtn.blur();
        if (!hasCalculated) calculateValue();
        window.print(); 
    }

    // --- FEATURE 5: CLEAR ALL ---
    function clearAll() {
        resetBtn.blur();
        if (confirm("Clear all numbers and delete saved data?")) {
            form.reset();
            hasCalculated = false;
            
            // Delete from browser storage
            localStorage.removeItem(storageKey); 
            
            // Reset UI
            usageSlider.value = 70;
            updateVisualizer();
            
            stdUnitPriceOut.textContent = "$0.00 / unit";
            bulkIllusionOut.textContent = "$0.00 / unit";
            trueBulkOut.textContent = "$0.00 / unit";
            moneyWastedOut.textContent = "$0.00";
            
            statusMsg.textContent = "Enter standard and bulk details to see the true math.";
            statusMsg.style.color = "inherit";

            const originalText = resetBtn.textContent;
            resetBtn.textContent = "Cleared!";
            setTimeout(() => { resetBtn.textContent = originalText; }, 1500);
        }
    }

    // --- INITIALIZATION & EVENT LISTENERS ---
    document.addEventListener("DOMContentLoaded", loadSavedData); 
    
    form.addEventListener("submit", calculateValue);
    
    // Real-time Visualizer Update on Slider drag
    usageSlider.addEventListener("input", updateVisualizer);
    
    // Action Bar Listeners
    saveBtn.addEventListener("click", saveData);
    copyBtn.addEventListener("click", copySummary);
    pdfBtn.addEventListener("click", downloadPDF);
    resetBtn.addEventListener("click", clearAll);

})();

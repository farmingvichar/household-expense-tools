(() => {
  "use strict";

  const STORAGE_KEY = "hbw_budget_data_v1";
  const VALID_CURRENCIES = ["$", "C$", "£", "A$", "€", "₹", "¥"];
  const VALID_BUCKETS = ["Needs", "Wants", "Savings/Debt"];
  const VALID_MODES = ["zero-based", "50-30-20"];
  const VALID_PAPERS = ["letter", "a4"];
  const VALID_DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY"];

  const PDF_CURRENCY_MAP = {
    "$": "$",
    "C$": "C$",
    "£": "£",
    "A$": "A$",
    "€": "€",
    "₹": "INR ",
    "¥": "JPY "
  };

  let rowIdCounter = 1;

  function nextId(prefix) {
    rowIdCounter += 1;
    return prefix + "_" + Date.now().toString(36) + "_" + rowIdCounter;
  }

  function createDefaultState() {
    return {
      mode: "zero-based",
      paper: "letter",
      currency: "$",
      dateFormat: "MM/DD/YYYY",
      title: "Monthly Household Budget",
      period: "",
      notes: "",
      incomes: [
        { id: nextId("inc"), name: "Paycheck 1", amount: "4200" },
        { id: nextId("inc"), name: "Side Income", amount: "800" }
      ],
      expenses: [
        { id: nextId("exp"), name: "Rent / Mortgage", bucket: "Needs", amount: "1650" },
        { id: nextId("exp"), name: "Groceries", bucket: "Needs", amount: "600" },
        { id: nextId("exp"), name: "Utilities & Internet", bucket: "Needs", amount: "240" },
        { id: nextId("exp"), name: "Auto & Gas", bucket: "Needs", amount: "350" },
        { id: nextId("exp"), name: "Emergency Savings", bucket: "Savings/Debt", amount: "500" },
        { id: nextId("exp"), name: "Dining & Entertainment", bucket: "Wants", amount: "250" }
      ]
    };
  }

  function roundMoney(num) {
    if (!Number.isFinite(num)) {
      return 0;
    }
    const rounded = Math.round(num * 100) / 100;
    return Object.is(rounded, -0) ? 0 : rounded;
  }

  function parseAmount(rawValue) {
    if (rawValue === null || rawValue === undefined) {
      return 0;
    }
    const cleaned = String(rawValue).replace(/,/g, "").trim();
    if (!cleaned) {
      return 0;
    }
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return roundMoney(parsed);
  }

  function formatNumber(num) {
    const safe = roundMoney(num);
    return Math.abs(safe).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatMoney(num, symbol, forPdf) {
    const safe = roundMoney(num);
    const prefix = forPdf ? (PDF_CURRENCY_MAP[symbol] || "$") : (symbol || "$");
    const sign = safe < 0 ? "-" : "";
    return sign + prefix + formatNumber(safe);
  }

  function formatToday(dateFormat) {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const yyyy = String(now.getFullYear());
    return dateFormat === "DD/MM/YYYY"
      ? dd + "/" + mm + "/" + yyyy
      : mm + "/" + dd + "/" + yyyy;
  }

  function sanitizeFilename(title) {
    const base = String(title || "")
      .trim()
      .replace(/[^a-zA-Z0-9\s-_]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return (base || "Monthly-Household-Budget") + ".pdf";
  }

  function normalizeRowList(rows, isExpense) {
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.map((row) => {
      const safeRow = row && typeof row === "object" ? row : {};
      const item = {
        id: typeof safeRow.id === "string" && safeRow.id ? safeRow.id : nextId(isExpense ? "exp" : "inc"),
        name: typeof safeRow.name === "string" ? safeRow.name.slice(0, 48) : "",
        amount: safeRow.amount !== undefined && safeRow.amount !== null ? String(safeRow.amount) : ""
      };
      if (isExpense) {
        item.bucket = VALID_BUCKETS.includes(safeRow.bucket) ? safeRow.bucket : "Needs";
      }
      return item;
    });
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return createDefaultState();
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        return createDefaultState();
      }
      return {
        mode: VALID_MODES.includes(parsed.mode) ? parsed.mode : "zero-based",
        paper: VALID_PAPERS.includes(parsed.paper) ? parsed.paper : "letter",
        currency: VALID_CURRENCIES.includes(parsed.currency) ? parsed.currency : "$",
        dateFormat: VALID_DATE_FORMATS.includes(parsed.dateFormat) ? parsed.dateFormat : "MM/DD/YYYY",
        title: typeof parsed.title === "string" ? parsed.title.slice(0, 60) : "Monthly Household Budget",
        period: typeof parsed.period === "string" ? parsed.period.slice(0, 32) : "",
        notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 240) : "",
        incomes: normalizeRowList(parsed.incomes, false),
        expenses: normalizeRowList(parsed.expenses, true)
      };
    } catch (_err) {
      return createDefaultState();
    }
  }

  function saveState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_err) {
      // Ignore storage quota or private-mode restrictions safely
    }
  }

  function computeSummary(state) {
    let totalIncome = 0;
    for (let i = 0; i < state.incomes.length; i += 1) {
      totalIncome = roundMoney(totalIncome + parseAmount(state.incomes[i].amount));
    }

    let totalPlanned = 0;
    const buckets = {
      Needs: 0,
      Wants: 0,
      "Savings/Debt": 0
    };

    for (let i = 0; i < state.expenses.length; i += 1) {
      const exp = state.expenses[i];
      const amt = parseAmount(exp.amount);
      totalPlanned = roundMoney(totalPlanned + amt);
      const bucketKey = VALID_BUCKETS.includes(exp.bucket) ? exp.bucket : "Needs";
      buckets[bucketKey] = roundMoney(buckets[bucketKey] + amt);
    }

    const remaining = roundMoney(totalIncome - totalPlanned);

    const pct = {
      Needs: totalIncome > 0 ? Math.round((buckets.Needs / totalIncome) * 1000) / 10 : 0,
      Wants: totalIncome > 0 ? Math.round((buckets.Wants / totalIncome) * 1000) / 10 : 0,
      "Savings/Debt": totalIncome > 0 ? Math.round((buckets["Savings/Debt"] / totalIncome) * 1000) / 10 : 0
    };

    const targets = {
      Needs: roundMoney(totalIncome * 0.5),
      Wants: roundMoney(totalIncome * 0.3),
      "Savings/Debt": roundMoney(totalIncome * 0.2)
    };

    return {
      totalIncome,
      totalPlanned,
      remaining,
      buckets,
      pct,
      targets
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    const shell = document.getElementById("hbw-shell");
    if (!shell) {
      return;
    }

    const el = {
      shell,
      modeZeroBtn: document.getElementById("hbw-mode-zero"),
      modeRuleBtn: document.getElementById("hbw-mode-503020"),
      paperLetterBtn: document.getElementById("hbw-paper-letter"),
      paperA4Btn: document.getElementById("hbw-paper-a4"),
      currencySelect: document.getElementById("hbw-currency"),
      dateFormatSelect: document.getElementById("hbw-date-format"),
      form: document.getElementById("hbw-form"),
      titleInput: document.getElementById("hbw-title"),
      periodInput: document.getElementById("hbw-period"),
      notesInput: document.getElementById("hbw-notes"),
      addIncomeBtn: document.getElementById("hbw-add-income"),
      addExpenseBtn: document.getElementById("hbw-add-expense"),
      incomeList: document.getElementById("hbw-income-list"),
      expenseList: document.getElementById("hbw-expense-list"),
      incomeRowTpl: document.getElementById("hbw-income-row-tpl"),
      expenseRowTpl: document.getElementById("hbw-expense-row-tpl"),
      totalIncomeOut: document.getElementById("hbw-total-income"),
      totalPlannedOut: document.getElementById("hbw-total-planned"),
      balanceCard: document.getElementById("hbw-balance-card"),
      balanceLabel: document.getElementById("hbw-balance-label"),
      remainingBalanceOut: document.getElementById("hbw-remaining-balance"),
      ruleSummaryBox: document.getElementById("hbw-rule-summary"),
      ruleNeedsOut: document.getElementById("hbw-rule-needs"),
      ruleWantsOut: document.getElementById("hbw-rule-wants"),
      ruleSavingsOut: document.getElementById("hbw-rule-savings"),
      downloadBtn: document.getElementById("hbw-download-pdf"),
      clearBtn: document.getElementById("hbw-clear-btn"),
      resetBtn: document.getElementById("hbw-reset-btn"),
      statusBox: document.getElementById("hbw-status"),
      previewMeta: document.getElementById("hbw-preview-meta"),
      paperSheet: document.getElementById("hbw-paper-sheet"),
      sheetTitle: document.getElementById("hbw-sheet-title"),
      sheetSubtitle: document.getElementById("hbw-sheet-subtitle"),
      sheetDate: document.getElementById("hbw-sheet-date"),
      sheetIncome: document.getElementById("hbw-sheet-income"),
      sheetPlanned: document.getElementById("hbw-sheet-planned"),
      sheetBalanceLabel: document.getElementById("hbw-sheet-balance-label"),
      sheetBalance: document.getElementById("hbw-sheet-balance"),
      sheetRuleBar: document.getElementById("hbw-sheet-rule-bar"),
      sheetRuleText: document.getElementById("hbw-sheet-rule-text"),
      sheetIncomeList: document.getElementById("hbw-sheet-income-list"),
      sheetTbody: document.getElementById("hbw-sheet-tbody"),
      sheetTableTotal: document.getElementById("hbw-sheet-table-total"),
      sheetNotesContent: document.getElementById("hbw-sheet-notes-content"),
      mobilePreviewBtn: document.getElementById("hbw-mobile-preview-btn"),
      mobileDownloadBtn: document.getElementById("hbw-mobile-download-btn"),
      modal: document.getElementById("hbw-preview-modal"),
      modalZoomStage: document.getElementById("hbw-modal-zoom-stage"),
      modalCloseBtn: document.getElementById("hbw-modal-close"),
      modalDownloadBtn: document.getElementById("hbw-modal-download-btn"),
      zoomOutBtn: document.getElementById("hbw-zoom-out"),
      zoomInBtn: document.getElementById("hbw-zoom-in"),
      zoomLevelOut: document.getElementById("hbw-zoom-level")
    };

    let state = loadState();
    let modalZoom = 1;
    let lastFocusedBeforeModal = null;
    const downloadFeedbackTimers = new WeakMap();

    function setStatus(message) {
      if (el.statusBox) {
        el.statusBox.textContent = message;
      }
    }

    function createEmptyHint(text) {
      const p = document.createElement("p");
      p.className = "hbw-micro-note";
      p.style.padding = "0.5rem 0.25rem";
      p.style.margin = "0";
      p.textContent = text;
      return p;
    }

    function renderIncomeRows() {
      el.incomeList.innerHTML = "";
      if (state.incomes.length === 0) {
        el.incomeList.appendChild(
          createEmptyHint("No income rows added yet. Click + Add Income, or download a blank write-in sheet.")
        );
        return;
      }

      const frag = document.createDocumentFragment();
      state.incomes.forEach((item) => {
        const clone = el.incomeRowTpl.content.cloneNode(true);
        const rowEl = clone.querySelector(".hbw-income-row");
        const nameInput = clone.querySelector(".hbw-row-name");
        const amountInput = clone.querySelector(".hbw-row-amount");

        rowEl.dataset.rowId = item.id;
        nameInput.value = item.name;
        amountInput.value = item.amount;
        frag.appendChild(clone);
      });
      el.incomeList.appendChild(frag);
    }

    function renderExpenseRows() {
      el.expenseList.innerHTML = "";
      if (state.expenses.length === 0) {
        el.expenseList.appendChild(
          createEmptyHint("No expense rows added yet. Click + Add Expense, or download a blank write-in sheet.")
        );
        return;
      }

      const frag = document.createDocumentFragment();
      state.expenses.forEach((item) => {
        const clone = el.expenseRowTpl.content.cloneNode(true);
        const rowEl = clone.querySelector(".hbw-expense-row");
        const nameInput = clone.querySelector(".hbw-row-name");
        const bucketSelect = clone.querySelector(".hbw-row-bucket");
        const amountInput = clone.querySelector(".hbw-row-amount");

        rowEl.dataset.rowId = item.id;
        nameInput.value = item.name;
        bucketSelect.value = VALID_BUCKETS.includes(item.bucket) ? item.bucket : "Needs";
        amountInput.value = item.amount;
        frag.appendChild(clone);
      });
      el.expenseList.appendChild(frag);
    }

    function syncSettingsControls() {
      el.shell.setAttribute("data-mode", state.mode);

      const isZero = state.mode === "zero-based";
      el.modeZeroBtn.classList.toggle("is-active", isZero);
      el.modeZeroBtn.setAttribute("aria-checked", String(isZero));
      el.modeRuleBtn.classList.toggle("is-active", !isZero);
      el.modeRuleBtn.setAttribute("aria-checked", String(!isZero));

      const isLetter = state.paper === "letter";
      el.paperLetterBtn.classList.toggle("is-active", isLetter);
      el.paperLetterBtn.setAttribute("aria-checked", String(isLetter));
      el.paperA4Btn.classList.toggle("is-active", !isLetter);
      el.paperA4Btn.setAttribute("aria-checked", String(!isLetter));

      el.paperSheet.setAttribute("data-paper", state.paper);
      el.previewMeta.textContent = (isLetter ? "US Letter" : "A4") + " \u2022 Ink-Saver B&W";

      el.currencySelect.value = state.currency;
      el.dateFormatSelect.value = state.dateFormat;

      el.titleInput.value = state.title;
      el.periodInput.value = state.period;
      el.notesInput.value = state.notes;

      el.ruleSummaryBox.hidden = isZero;
      el.sheetRuleBar.hidden = isZero;
    }

    function getBalanceMeta(summary, mode) {
      const hasAnyValue = summary.totalIncome > 0 || summary.totalPlanned > 0;
      if (mode === "zero-based") {
        if (!hasAnyValue) {
          return { label: "Left to Assign", sheetLabel: "Unallocated", statusClass: "" };
        }
        if (summary.remaining === 0) {
          return { label: "Zero-Based Balanced!", sheetLabel: "Balanced", statusClass: "is-balanced" };
        }
        if (summary.remaining > 0) {
          return { label: "Unallocated", sheetLabel: "Unallocated", statusClass: "is-unallocated" };
        }
        return { label: "Over Budget", sheetLabel: "Over Budget", statusClass: "is-over" };
      }

      if (!hasAnyValue) {
        return { label: "Remaining", sheetLabel: "Remaining", statusClass: "" };
      }
      if (summary.remaining < 0) {
        return { label: "Over Budget", sheetLabel: "Over Budget", statusClass: "is-over" };
      }
      if (summary.remaining === 0) {
        return { label: "Fully Allocated", sheetLabel: "Remaining", statusClass: "is-balanced" };
      }
      return { label: "Unallocated", sheetLabel: "Remaining", statusClass: "is-unallocated" };
    }

    function getFormattedSheetDate() {
      const todayStr = formatToday(state.dateFormat);
      const periodStr = state.period.trim();
      return periodStr ? periodStr + " (" + todayStr + ")" : todayStr;
    }

    function syncModalPreviewIfOpen() {
      if (el.modal.hidden) {
        return;
      }
      const clone = el.paperSheet.cloneNode(true);
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach((node) => {
        node.removeAttribute("id");
      });
      el.modalZoomStage.innerHTML = "";
      el.modalZoomStage.appendChild(clone);
      applyModalZoom();
    }

    function updateOutputs() {
      const summary = computeSummary(state);
      const sym = state.currency;
      const balanceMeta = getBalanceMeta(summary, state.mode);

      // Left Builder Summary
      el.totalIncomeOut.textContent = formatMoney(summary.totalIncome, sym, false);
      el.totalPlannedOut.textContent = formatMoney(summary.totalPlanned, sym, false);
      el.remainingBalanceOut.textContent = formatMoney(summary.remaining, sym, false);
      el.balanceLabel.textContent = balanceMeta.label;

      el.balanceCard.classList.remove("is-balanced", "is-unallocated", "is-over");
      if (balanceMeta.statusClass) {
        el.balanceCard.classList.add(balanceMeta.statusClass);
      }

      // 50/30/20 Live Split Summary
      const needsStr = summary.pct.Needs.toFixed(1) + "% (" + formatMoney(summary.buckets.Needs, sym, false) + ")";
      const wantsStr = summary.pct.Wants.toFixed(1) + "% (" + formatMoney(summary.buckets.Wants, sym, false) + ")";
      const savingsStr = summary.pct["Savings/Debt"].toFixed(1) + "% (" + formatMoney(summary.buckets["Savings/Debt"], sym, false) + ")";

      el.ruleNeedsOut.textContent = needsStr;
      el.ruleWantsOut.textContent = wantsStr;
      el.ruleSavingsOut.textContent = savingsStr;

      // Right Live WYSIWYG Paper Preview
      const displayTitle = state.title.trim() || "Monthly Household Budget";
      el.sheetTitle.textContent = displayTitle;
      el.sheetSubtitle.textContent =
        state.mode === "zero-based"
          ? "Zero-Based Monthly Worksheet"
          : "50/30/20 Rule Monthly Worksheet";
      el.sheetDate.textContent = getFormattedSheetDate();

      el.sheetIncome.textContent = formatMoney(summary.totalIncome, sym, false);
      el.sheetPlanned.textContent = formatMoney(summary.totalPlanned, sym, false);
      el.sheetBalanceLabel.textContent = balanceMeta.sheetLabel;
      el.sheetBalance.textContent = formatMoney(summary.remaining, sym, false);

      el.sheetRuleText.textContent =
        "Needs " + summary.pct.Needs.toFixed(1) + "% (" + formatMoney(summary.buckets.Needs, sym, false) + ") \u2022 " +
        "Wants " + summary.pct.Wants.toFixed(1) + "% (" + formatMoney(summary.buckets.Wants, sym, false) + ") \u2022 " +
        "Savings/Debt " + summary.pct["Savings/Debt"].toFixed(1) + "% (" + formatMoney(summary.buckets["Savings/Debt"], sym, false) + ")";

      // Sheet Income Grid
      el.sheetIncomeList.innerHTML = "";
      if (state.incomes.length === 0) {
        for (let i = 0; i < 2; i += 1) {
          const itemDiv = document.createElement("div");
          itemDiv.className = "hbw-sheet-income-item";
          const nameSpan = document.createElement("span");
          nameSpan.className = "hbw-sheet-income-name";
          nameSpan.textContent = "Income Source " + (i + 1);
          const amtSpan = document.createElement("span");
          amtSpan.className = "hbw-sheet-income-amt";
          amtSpan.textContent = "\u00A0";
          itemDiv.appendChild(nameSpan);
          itemDiv.appendChild(amtSpan);
          el.sheetIncomeList.appendChild(itemDiv);
        }
      } else {
        state.incomes.forEach((inc, idx) => {
          const itemDiv = document.createElement("div");
          itemDiv.className = "hbw-sheet-income-item";
          const nameSpan = document.createElement("span");
          nameSpan.className = "hbw-sheet-income-name";
          nameSpan.textContent = inc.name.trim() || ("Income Source " + (idx + 1));
          const amtSpan = document.createElement("span");
          amtSpan.className = "hbw-sheet-income-amt";
          amtSpan.textContent = formatMoney(parseAmount(inc.amount), sym, false);
          itemDiv.appendChild(nameSpan);
          itemDiv.appendChild(amtSpan);
          el.sheetIncomeList.appendChild(itemDiv);
        });
      }

      // Sheet 4-Column Expense Table
      el.sheetTbody.innerHTML = "";
      if (state.expenses.length === 0) {
        for (let i = 0; i < 8; i += 1) {
          const tr = document.createElement("tr");
          const tdItem = document.createElement("td");
          tdItem.innerHTML = "&nbsp;";
          const tdPlan = document.createElement("td");
          tdPlan.className = "hbw-num-cell";
          tdPlan.innerHTML = "&nbsp;";
          const tdActual = document.createElement("td");
          tdActual.className = "hbw-blank-cell";
          const tdPaid = document.createElement("td");
          tdPaid.className = "hbw-check-cell";
          tdPaid.textContent = "\u2610";
          tr.appendChild(tdItem);
          tr.appendChild(tdPlan);
          tr.appendChild(tdActual);
          tr.appendChild(tdPaid);
          el.sheetTbody.appendChild(tr);
        }
      } else {
        state.expenses.forEach((exp, idx) => {
          const tr = document.createElement("tr");

          const tdItem = document.createElement("td");
          const labelSpan = document.createElement("span");
          labelSpan.textContent = exp.name.trim() || ("Expense Item " + (idx + 1));
          tdItem.appendChild(labelSpan);

          if (state.mode === "50-30-20") {
            const tag = document.createElement("span");
            tag.className = "hbw-sheet-bucket-tag";
            tag.textContent = exp.bucket;
            tdItem.appendChild(tag);
          }

          const tdPlan = document.createElement("td");
          tdPlan.className = "hbw-num-cell";
          tdPlan.textContent = formatMoney(parseAmount(exp.amount), sym, false);

          const tdActual = document.createElement("td");
          tdActual.className = "hbw-blank-cell";

          const tdPaid = document.createElement("td");
          tdPaid.className = "hbw-check-cell";
          tdPaid.textContent = "\u2610";

          tr.appendChild(tdItem);
          tr.appendChild(tdPlan);
          tr.appendChild(tdActual);
          tr.appendChild(tdPaid);
          el.sheetTbody.appendChild(tr);
        });
      }

      el.sheetTableTotal.textContent =
        state.expenses.length === 0 ? "\u00A0" : formatMoney(summary.totalPlanned, sym, false);

      // Sheet Notes Box
      el.sheetNotesContent.innerHTML = "";
      const notesTrimmed = state.notes.trim();
      if (notesTrimmed) {
        const p = document.createElement("p");
        p.className = "hbw-sheet-notes-text";
        p.textContent = notesTrimmed;
        el.sheetNotesContent.appendChild(p);
      } else {
        for (let i = 0; i < 3; i += 1) {
          const line = document.createElement("div");
          line.className = "hbw-note-line";
          el.sheetNotesContent.appendChild(line);
        }
      }

      syncModalPreviewIfOpen();
    }

    function persistAndRefresh() {
      saveState(state);
      updateOutputs();
    }

    // ----------------------------------------------------------------------
    // Mobile Preview Modal Controls (100dvh)
    // ----------------------------------------------------------------------
    function applyModalZoom() {
      el.modalZoomStage.style.transform = "scale(" + modalZoom + ")";
      el.modalZoomStage.style.width = (100 / modalZoom).toFixed(2) + "%";
      el.zoomLevelOut.textContent = Math.round(modalZoom * 100) + "%";
      el.zoomOutBtn.disabled = modalZoom <= 0.75;
      el.zoomInBtn.disabled = modalZoom >= 1.75;
    }

    function openPreviewModal() {
      lastFocusedBeforeModal = document.activeElement;
      modalZoom = 1;
      el.modal.hidden = false;
      document.body.style.overflow = "hidden";
      syncModalPreviewIfOpen();
      el.modalCloseBtn.focus();
    }

    function closePreviewModal() {
      if (el.modal.hidden) {
        return;
      }
      el.modal.hidden = true;
      document.body.style.overflow = "";
      if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
        lastFocusedBeforeModal.focus();
      }
    }

    // ----------------------------------------------------------------------
    // Download Confirmation Feedback
    // ----------------------------------------------------------------------
    function flashDownloadSuccess(triggerBtn) {
      const targets = [el.downloadBtn, el.mobileDownloadBtn, el.modalDownloadBtn].filter(Boolean);
      if (triggerBtn && !targets.includes(triggerBtn)) {
        targets.push(triggerBtn);
      }

      targets.forEach((btn) => {
        if (!btn.dataset.originalLabel) {
          btn.dataset.originalLabel = btn.textContent;
        }
        if (downloadFeedbackTimers.has(btn)) {
          window.clearTimeout(downloadFeedbackTimers.get(btn));
        }
        btn.textContent = "\u2713 PDF Downloaded!";
        const timerId = window.setTimeout(() => {
          btn.textContent = btn.dataset.originalLabel;
          downloadFeedbackTimers.delete(btn);
        }, 1500);
        downloadFeedbackTimers.set(btn, timerId);
      });
    }

    // ----------------------------------------------------------------------
    // Programmatic Vector PDF Engine (jsPDF + jspdf-autotable)
    // ----------------------------------------------------------------------
    function generatePdf(triggerBtn) {
      if (!window.jspdf || typeof window.jspdf.jsPDF !== "function") {
        const msg = "PDF library is still loading. Please wait a second and try again.";
        setStatus(msg);
        window.alert(msg);
        return;
      }

      const JsPDFConstructor = window.jspdf.jsPDF;
      const doc = new JsPDFConstructor({
        orientation: "portrait",
        unit: "mm",
        format: state.paper === "a4" ? "a4" : "letter"
      });

      if (typeof doc.autoTable !== "function") {
        const msg = "PDF table plugin is still loading. Please wait a second and try again.";
        setStatus(msg);
        window.alert(msg);
        return;
      }

      const MARGIN = 12.7; // 0.5 inch safe printer margin on all 4 sides
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const printableWidth = pageWidth - MARGIN * 2;
      const summary = computeSummary(state);
      const sym = state.currency;
      const balanceMeta = getBalanceMeta(summary, state.mode);

      let cursorY = MARGIN;

      // 1. Header
      const displayTitle = state.title.trim() || "Monthly Household Budget";
      const subtitle =
        state.mode === "zero-based"
          ? "Zero-Based Monthly Worksheet"
          : "50/30/20 Rule Monthly Worksheet";
      const dateText = getFormattedSheetDate();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(17, 17, 17);
      doc.text(displayTitle, MARGIN, cursorY + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(68, 68, 68);
      doc.text(subtitle, MARGIN, cursorY + 10);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(85, 85, 85);
      doc.text("DATE / PERIOD", pageWidth - MARGIN, cursorY + 3.5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(17, 17, 17);
      doc.text(dateText, pageWidth - MARGIN, cursorY + 9, { align: "right" });

      cursorY += 13;
      doc.setDrawColor(17, 17, 17);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, cursorY, pageWidth - MARGIN, cursorY);
      cursorY += 4.5;

      // 2. Summary KPI Strip (4 pure white ink-saver boxes)
      const kpiHeight = 14;
      const kpiWidth = printableWidth / 4;
      const kpis = [
        { label: "TOTAL INCOME", value: formatMoney(summary.totalIncome, sym, true), blank: false },
        { label: "TOTAL PLANNED", value: formatMoney(summary.totalPlanned, sym, true), blank: false },
        { label: balanceMeta.sheetLabel.toUpperCase(), value: formatMoney(summary.remaining, sym, true), blank: false },
        { label: "ACTUAL TOTAL", value: "", blank: true }
      ];

      doc.setDrawColor(204, 204, 204);
      doc.setLineWidth(0.25);
      doc.setFillColor(255, 255, 255);
      doc.rect(MARGIN, cursorY, printableWidth, kpiHeight, "FD");

      kpis.forEach((kpi, idx) => {
        const boxX = MARGIN + idx * kpiWidth;
        if (idx > 0) {
          doc.setDrawColor(204, 204, 204);
          doc.line(boxX, cursorY, boxX, cursorY + kpiHeight);
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.setTextColor(85, 85, 85);
        doc.text(kpi.label, boxX + 2.5, cursorY + 4.5);

        if (kpi.blank) {
          doc.setDrawColor(136, 136, 136);
          doc.setLineWidth(0.25);
          doc.line(boxX + 2.5, cursorY + 11.2, boxX + kpiWidth - 2.5, cursorY + 11.2);
        } else {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(17, 17, 17);
          doc.text(kpi.value, boxX + 2.5, cursorY + 11);
        }
      });

      cursorY += kpiHeight + 4;

      // 3. Optional 50/30/20 Breakdown Bar
      if (state.mode === "50-30-20") {
        const ruleBoxH = 11.5;
        doc.setDrawColor(204, 204, 204);
        doc.setLineWidth(0.25);
        doc.setFillColor(255, 255, 255);
        doc.rect(MARGIN, cursorY, printableWidth, ruleBoxH, "FD");

        const colW = printableWidth / 3;
        const ruleParts = [
          {
            title: "NEEDS (TARGET 50% / " + formatMoney(summary.targets.Needs, sym, true) + ")",
            actual: summary.pct.Needs.toFixed(1) + "%  (" + formatMoney(summary.buckets.Needs, sym, true) + ")"
          },
          {
            title: "WANTS (TARGET 30% / " + formatMoney(summary.targets.Wants, sym, true) + ")",
            actual: summary.pct.Wants.toFixed(1) + "%  (" + formatMoney(summary.buckets.Wants, sym, true) + ")"
          },
          {
            title: "SAVINGS/DEBT (TARGET 20% / " + formatMoney(summary.targets["Savings/Debt"], sym, true) + ")",
            actual: summary.pct["Savings/Debt"].toFixed(1) + "%  (" + formatMoney(summary.buckets["Savings/Debt"], sym, true) + ")"
          }
        ];

        ruleParts.forEach((part, idx) => {
          const rx = MARGIN + idx * colW;
          if (idx > 0) {
            doc.setDrawColor(204, 204, 204);
            doc.line(rx, cursorY, rx, cursorY + ruleBoxH);
          }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.6);
          doc.setTextColor(85, 85, 85);
          doc.text(part.title, rx + 2.2, cursorY + 4.2);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(17, 17, 17);
          doc.text(part.actual, rx + 2.2, cursorY + 9.2);
        });

        cursorY += ruleBoxH + 4;
      }

      // 4. Income Sources Block (Compact 2-Column Ink-Saver Box)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(17, 17, 17);
      doc.text("INCOME SOURCES", MARGIN, cursorY + 3);
      cursorY += 4.5;

      const incomeEntries =
        state.incomes.length > 0
          ? state.incomes.map((inc, idx) => ({
              name: inc.name.trim() || ("Income Source " + (idx + 1)),
              amountText: formatMoney(parseAmount(inc.amount), sym, true)
            }))
          : [
              { name: "Income Source 1", amountText: "" },
              { name: "Income Source 2", amountText: "" }
            ];

      const incRows = Math.ceil(incomeEntries.length / 2);
      const incRowH = 6.2;
      const incBoxH = incRows * incRowH + 2.5;
      const halfW = printableWidth / 2;

      doc.setDrawColor(204, 204, 204);
      doc.setLineWidth(0.25);
      doc.setFillColor(255, 255, 255);
      doc.rect(MARGIN, cursorY, printableWidth, incBoxH, "FD");

      incomeEntries.forEach((entry, idx) => {
        const colIdx = idx % 2;
        const rowIdx = Math.floor(idx / 2);
        const xLeft = MARGIN + colIdx * halfW + 2.5;
        const xRight = MARGIN + (colIdx + 1) * halfW - 2.5;
        const yBase = cursorY + 5.2 + rowIdx * incRowH;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(17, 17, 17);
        const maxNameWidth = halfW - 28;
        const truncatedName = doc.splitTextToSize(entry.name, maxNameWidth)[0] || "";
        doc.text(truncatedName, xLeft, yBase);

        if (entry.amountText) {
          doc.setFont("helvetica", "bold");
          doc.text(entry.amountText, xRight, yBase, { align: "right" });
        }

        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(xLeft, yBase + 1.4, xRight, yBase + 1.4);
      });

      cursorY += incBoxH + 5;

      // 5. Expenses Table (Ink-Saver 4-Column Vector Table via jspdf-autotable)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(17, 17, 17);
      doc.text("PLANNED VS. ACTUAL MONTHLY EXPENSES", MARGIN, cursorY + 2.5);
      cursorY += 4;

      const tableBody =
        state.expenses.length > 0
          ? state.expenses.map((exp, idx) => {
              const baseName = exp.name.trim() || ("Expense Item " + (idx + 1));
              const label = state.mode === "50-30-20" ? baseName + " [" + exp.bucket + "]" : baseName;
              return [label, formatMoney(parseAmount(exp.amount), sym, true), "", ""];
            })
          : Array.from({ length: 10 }, () => ["", "", "", ""]);

      const colWidths = {
        0: printableWidth * 0.44,
        1: printableWidth * 0.20,
        2: printableWidth * 0.20,
        3: printableWidth * 0.16
      };

      doc.autoTable({
        startY: cursorY,
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN + 5, left: MARGIN },
        tableWidth: printableWidth,
        theme: "grid",
        showHead: "everyPage",
        rowPageBreak: "avoid",
        head: [["Category / Expense Item", "Planned", "Actual Spent", "Paid / Diff"]],
        body: tableBody,
        foot: [[
          "Total",
          state.expenses.length > 0 ? formatMoney(summary.totalPlanned, sym, true) : "",
          "",
          ""
        ]],
        styles: {
          font: "helvetica",
          fontSize: 9,
          textColor: [17, 17, 17],
          fillColor: [255, 255, 255],
          lineColor: [204, 204, 204],
          lineWidth: 0.25,
          cellPadding: { top: 2.6, right: 2.8, bottom: 2.6, left: 2.8 },
          valign: "middle",
          minCellHeight: 7.4
        },
        headStyles: {
          fontStyle: "bold",
          fontSize: 8.5,
          textColor: [17, 17, 17],
          fillColor: [255, 255, 255],
          lineColor: [17, 17, 17],
          lineWidth: 0.35
        },
        footStyles: {
          fontStyle: "bold",
          fontSize: 9,
          textColor: [17, 17, 17],
          fillColor: [255, 255, 255],
          lineColor: [17, 17, 17],
          lineWidth: 0.35
        },
        columnStyles: {
          0: { cellWidth: colWidths[0], halign: "left", overflow: "linebreak" },
          1: { cellWidth: colWidths[1], halign: "right" },
          2: { cellWidth: colWidths[2], halign: "right" },
          3: { cellWidth: colWidths[3], halign: "center" }
        },
        didParseCell(data) {
          if (data.section === "head" || data.section === "foot") {
            if (data.column.index === 1 || data.column.index === 2) {
              data.cell.styles.halign = "right";
            } else if (data.column.index === 3) {
              data.cell.styles.halign = "center";
            } else {
              data.cell.styles.halign = "left";
            }
          }
        },
        didDrawCell(data) {
          if (data.section === "body" && data.column.index === 3) {
            const boxSize = 3.4;
            const boxX = data.cell.x + (data.cell.width - boxSize) / 2;
            const boxY = data.cell.y + (data.cell.height - boxSize) / 2;
            doc.setDrawColor(17, 17, 17);
            doc.setLineWidth(0.3);
            doc.rect(boxX, boxY, boxSize, boxSize, "S");
          }
        }
      });

      // 6. Monthly Goals & Notes Box (with Page-Cut Protection < 38mm)
      const tableEndY = doc.lastAutoTable ? doc.lastAutoTable.finalY : cursorY + 40;
      const remainingSpace = pageHeight - MARGIN - tableEndY;
      let notesY;

      if (remainingSpace < 38) {
        doc.addPage();
        notesY = MARGIN;
      } else {
        notesY = tableEndY + 6;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(17, 17, 17);
      doc.text("MONTHLY GOALS & NOTES", MARGIN, notesY + 2.5);

      const notesBoxY = notesY + 4.5;
      const notesBoxH = 26;

      doc.setDrawColor(204, 204, 204);
      doc.setLineWidth(0.25);
      doc.setFillColor(255, 255, 255);
      doc.rect(MARGIN, notesBoxY, printableWidth, notesBoxH, "FD");

      const notesTrimmed = state.notes.trim();
      if (notesTrimmed) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(17, 17, 17);
        const wrappedNotes = doc.splitTextToSize(notesTrimmed, printableWidth - 6);
        doc.text(wrappedNotes.slice(0, 4), MARGIN + 3, notesBoxY + 6);
      } else {
        doc.setDrawColor(204, 204, 204);
        doc.setLineWidth(0.2);
        const lineSpacing = notesBoxH / 4;
        for (let lineIdx = 1; lineIdx <= 3; lineIdx += 1) {
          const lineY = notesBoxY + lineIdx * lineSpacing;
          doc.line(MARGIN + 3, lineY, pageWidth - MARGIN - 3, lineY);
        }
      }

      // 7. Muted Footer on Every Page
      const totalPages = doc.internal.getNumberOfPages();
      const footerY = pageHeight - 6.5;

      for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
        doc.setPage(pageNum);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(119, 119, 119);
        doc.text("Generated free at householdexpensetools.com", MARGIN, footerY);
        doc.text("Page " + pageNum + " of " + totalPages, pageWidth - MARGIN, footerY, {
          align: "right"
        });
      }

      const filename = sanitizeFilename(displayTitle);
      doc.save(filename);
      flashDownloadSuccess(triggerBtn);
      setStatus("Downloaded " + filename + " (" + (state.paper === "a4" ? "A4" : "US Letter") + ", ink-saver PDF).");
    }

    // ----------------------------------------------------------------------
    // Event Listeners
    // ----------------------------------------------------------------------
    el.form.addEventListener("submit", (event) => {
      event.preventDefault();
      generatePdf(el.downloadBtn);
    });

    // Mode Toggle
    [el.modeZeroBtn, el.modeRuleBtn].forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextMode = btn.getAttribute("data-mode");
        if (!VALID_MODES.includes(nextMode) || state.mode === nextMode) {
          return;
        }
        state.mode = nextMode;
        syncSettingsControls();
        persistAndRefresh();
        setStatus(
          nextMode === "zero-based"
            ? "Switched to Zero-Based Budget mode."
            : "Switched to 50/30/20 Rule mode. Tag each expense as Needs, Wants, or Savings/Debt."
        );
      });
    });

    // Paper Size Toggle
    [el.paperLetterBtn, el.paperA4Btn].forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextPaper = btn.getAttribute("data-paper");
        if (!VALID_PAPERS.includes(nextPaper) || state.paper === nextPaper) {
          return;
        }
        state.paper = nextPaper;
        syncSettingsControls();
        persistAndRefresh();
        setStatus(
          nextPaper === "letter"
            ? "Paper size set to US Letter (8.5\" x 11\")."
            : "Paper size set to A4 (210 x 297 mm)."
        );
      });
    });

    // Currency & Date Selects
    el.currencySelect.addEventListener("change", () => {
      if (VALID_CURRENCIES.includes(el.currencySelect.value)) {
        state.currency = el.currencySelect.value;
        persistAndRefresh();
      }
    });

    el.dateFormatSelect.addEventListener("change", () => {
      if (VALID_DATE_FORMATS.includes(el.dateFormatSelect.value)) {
        state.dateFormat = el.dateFormatSelect.value;
        persistAndRefresh();
      }
    });

    // Title, Period, Notes
    el.titleInput.addEventListener("input", () => {
      state.title = el.titleInput.value;
      persistAndRefresh();
    });

    el.periodInput.addEventListener("input", () => {
      state.period = el.periodInput.value;
      persistAndRefresh();
    });

    el.notesInput.addEventListener("input", () => {
      state.notes = el.notesInput.value;
      persistAndRefresh();
    });

    // Add Income Row (Auto-Focus & Smooth Scroll)
    el.addIncomeBtn.addEventListener("click", () => {
      const newRow = { id: nextId("inc"), name: "", amount: "" };
      state.incomes.push(newRow);
      renderIncomeRows();
      persistAndRefresh();

      const domRow = el.incomeList.querySelector('[data-row-id="' + newRow.id + '"]');
      if (domRow) {
        const nameInput = domRow.querySelector(".hbw-row-name");
        domRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
        if (nameInput) {
          nameInput.focus();
        }
      }
      setStatus("Added a new income row.");
    });

    // Add Expense Row (Auto-Focus & Smooth Scroll)
    el.addExpenseBtn.addEventListener("click", () => {
      const newRow = { id: nextId("exp"), name: "", bucket: "Needs", amount: "" };
      state.expenses.push(newRow);
      renderExpenseRows();
      persistAndRefresh();

      const domRow = el.expenseList.querySelector('[data-row-id="' + newRow.id + '"]');
      if (domRow) {
        const nameInput = domRow.querySelector(".hbw-row-name");
        domRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
        if (nameInput) {
          nameInput.focus();
        }
      }
      setStatus("Added a new expense row.");
    });

    // Dynamic Income List Delegation
    el.incomeList.addEventListener("input", (event) => {
      const rowEl = event.target.closest(".hbw-income-row");
      if (!rowEl) {
        return;
      }
      const rowData = state.incomes.find((item) => item.id === rowEl.dataset.rowId);
      if (!rowData) {
        return;
      }
      if (event.target.classList.contains("hbw-row-name")) {
        rowData.name = event.target.value;
      } else if (event.target.classList.contains("hbw-row-amount")) {
        rowData.amount = event.target.value;
      }
      persistAndRefresh();
    });

    el.incomeList.addEventListener("click", (event) => {
      const removeBtn = event.target.closest(".hbw-row-remove");
      if (!removeBtn) {
        return;
      }
      const rowEl = removeBtn.closest(".hbw-income-row");
      if (!rowEl) {
        return;
      }
      state.incomes = state.incomes.filter((item) => item.id !== rowEl.dataset.rowId);
      renderIncomeRows();
      persistAndRefresh();
      setStatus("Removed income row.");
    });

    // Dynamic Expense List Delegation
    el.expenseList.addEventListener("input", (event) => {
      const rowEl = event.target.closest(".hbw-expense-row");
      if (!rowEl) {
        return;
      }
      const rowData = state.expenses.find((item) => item.id === rowEl.dataset.rowId);
      if (!rowData) {
        return;
      }
      if (event.target.classList.contains("hbw-row-name")) {
        rowData.name = event.target.value;
      } else if (event.target.classList.contains("hbw-row-amount")) {
        rowData.amount = event.target.value;
      }
      persistAndRefresh();
    });

    el.expenseList.addEventListener("change", (event) => {
      if (!event.target.classList.contains("hbw-row-bucket")) {
        return;
      }
      const rowEl = event.target.closest(".hbw-expense-row");
      if (!rowEl) {
        return;
      }
      const rowData = state.expenses.find((item) => item.id === rowEl.dataset.rowId);
      if (!rowData) {
        return;
      }
      rowData.bucket = VALID_BUCKETS.includes(event.target.value) ? event.target.value : "Needs";
      persistAndRefresh();
    });

    el.expenseList.addEventListener("click", (event) => {
      const removeBtn = event.target.closest(".hbw-row-remove");
      if (!removeBtn) {
        return;
      }
      const rowEl = removeBtn.closest(".hbw-expense-row");
      if (!rowEl) {
        return;
      }
      state.expenses = state.expenses.filter((item) => item.id !== rowEl.dataset.rowId);
      renderExpenseRows();
      persistAndRefresh();
      setStatus("Removed expense row.");
    });

    // One-Tap Select on Amount Input Focus (Mobile Chrome & Desktop friendly)
    function handleAmountFocus(event) {
      if (!event.target.classList.contains("hbw-row-amount")) {
        return;
      }
      const input = event.target;
      window.requestAnimationFrame(() => {
        if (document.activeElement === input && typeof input.select === "function") {
          input.select();
        }
      });
    }

    el.incomeList.addEventListener("focusin", handleAmountFocus);
    el.expenseList.addEventListener("focusin", handleAmountFocus);

    // Clear / Start Blank
    el.clearBtn.addEventListener("click", () => {
      state.incomes = [];
      state.expenses = [];
      state.period = "";
      state.notes = "";
      if (!state.title.trim()) {
        state.title = "Monthly Household Budget";
      }
      syncSettingsControls();
      renderIncomeRows();
      renderExpenseRows();
      persistAndRefresh();
      setStatus("Worksheet cleared. Add your own rows or download a blank printable write-in PDF.");
    });

    // Reset Defaults
    el.resetBtn.addEventListener("click", () => {
      state = createDefaultState();
      syncSettingsControls();
      renderIncomeRows();
      renderExpenseRows();
      persistAndRefresh();
      setStatus("Restored sample household budget defaults.");
    });

    // PDF Download Triggers (Desktop, Mobile Sticky Bar, Modal Footer)
    el.downloadBtn.addEventListener("click", () => generatePdf(el.downloadBtn));
    el.mobileDownloadBtn.addEventListener("click", () => generatePdf(el.mobileDownloadBtn));
    el.modalDownloadBtn.addEventListener("click", () => generatePdf(el.modalDownloadBtn));

    // Mobile Preview Modal Triggers
    el.mobilePreviewBtn.addEventListener("click", openPreviewModal);
    el.modalCloseBtn.addEventListener("click", closePreviewModal);

    el.modal.addEventListener("click", (event) => {
      if (event.target.getAttribute("data-close-modal") === "true") {
        closePreviewModal();
      }
    });

    el.zoomInBtn.addEventListener("click", () => {
      modalZoom = Math.min(1.75, Math.round((modalZoom + 0.25) * 100) / 100);
      applyModalZoom();
    });

    el.zoomOutBtn.addEventListener("click", () => {
      modalZoom = Math.max(0.75, Math.round((modalZoom - 0.25) * 100) / 100);
      applyModalZoom();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !el.modal.hidden) {
        closePreviewModal();
      }
    });

    // Initial Render
    syncSettingsControls();
    renderIncomeRows();
    renderExpenseRows();
    updateOutputs();
  });
})();

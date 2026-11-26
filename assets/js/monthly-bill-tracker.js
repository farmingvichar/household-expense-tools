(() => {
  "use strict";

  const STORAGE_KEY = "mbt_bill_tracker_v1";
  const VALID_MODES = ["monthly", "annual"];
  const VALID_PAPERS = ["letter", "a4"];
  const VALID_CURRENCIES = ["$", "C$", "£", "A$", "€", "₹", "¥"];
  const VALID_METHODS = ["Auto-Pay", "Manual"];
  const VALID_MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  const PDF_CURRENCY_MAP = {
    "$": "$",
    "C$": "C$",
    "£": "£",
    "A$": "A$",
    "€": "EUR ",
    "₹": "INR ",
    "¥": "JPY "
  };

  let rowIdCounter = 1;

  function nextId(prefix) {
    rowIdCounter += 1;
    return prefix + "_" + Date.now().toString(36) + "_" + rowIdCounter;
  }

  function getDefaultMonthName() {
    const idx = new Date().getMonth();
    return VALID_MONTHS[idx] || "November";
  }

  function getDefaultYear() {
    const yr = new Date().getFullYear();
    return yr >= 2020 && yr <= 2099 ? String(yr) : "2026";
  }

  function createDefaultState() {
    return {
      mode: "monthly",
      paper: "letter",
      currency: "$",
      month: getDefaultMonthName(),
      year: getDefaultYear(),
      title: "Monthly Household Bill Tracker",
      notes: "",
      bills: [
        { id: nextId("bill"), dueDay: "1", name: "Rent / Mortgage", amount: "1650", method: "Auto-Pay" },
        { id: nextId("bill"), dueDay: "5", name: "Electric & Gas", amount: "145", method: "Manual" },
        { id: nextId("bill"), dueDay: "10", name: "Fiber Internet", amount: "75", method: "Auto-Pay" },
        { id: nextId("bill"), dueDay: "15", name: "Cell Phone Plan", amount: "85", method: "Auto-Pay" },
        { id: nextId("bill"), dueDay: "20", name: "Auto Insurance", amount: "130", method: "Auto-Pay" },
        { id: nextId("bill"), dueDay: "25", name: "Credit Card Payment", amount: "100", method: "Manual" }
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

  function parseDueDay(rawValue) {
    if (rawValue === null || rawValue === undefined) {
      return null;
    }
    const cleaned = String(rawValue).trim();
    if (!cleaned) {
      return null;
    }
    const num = Math.trunc(Number(cleaned));
    if (!Number.isFinite(num) || num <= 0) {
      return null;
    }
    if (num < 1) {
      return 1;
    }
    if (num > 31) {
      return 31;
    }
    return num;
  }

  function formatOrdinalDay(rawValue) {
    const day = parseDueDay(rawValue);
    if (day === null) {
      return "\u2014";
    }
    const mod100 = day % 100;
    if (mod100 >= 11 && mod100 <= 13) {
      return day + "th";
    }
    switch (day % 10) {
      case 1:
        return day + "st";
      case 2:
        return day + "nd";
      case 3:
        return day + "rd";
      default:
        return day + "th";
    }
  }

  function sanitizeYear(rawValue) {
    const parsed = Math.trunc(Number(String(rawValue || "").trim()));
    if (!Number.isFinite(parsed)) {
      return getDefaultYear();
    }
    if (parsed < 2020) {
      return "2020";
    }
    if (parsed > 2099) {
      return "2099";
    }
    return String(parsed);
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

  function sanitizeFilename(title) {
    const base = String(title || "")
      .trim()
      .replace(/[^a-zA-Z0-9\s-_]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return (base || "Monthly-Household-Bill-Tracker") + ".pdf";
  }

  function normalizeBills(rows) {
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.map((row) => {
      const safe = row && typeof row === "object" ? row : {};
      const parsedDay = parseDueDay(safe.dueDay);
      return {
        id: typeof safe.id === "string" && safe.id ? safe.id : nextId("bill"),
        dueDay: parsedDay !== null ? String(parsedDay) : "",
        name: typeof safe.name === "string" ? safe.name.slice(0, 48) : "",
        amount: safe.amount !== undefined && safe.amount !== null ? String(safe.amount) : "",
        method: VALID_METHODS.includes(safe.method) ? safe.method : "Manual"
      };
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
        mode: VALID_MODES.includes(parsed.mode) ? parsed.mode : "monthly",
        paper: VALID_PAPERS.includes(parsed.paper) ? parsed.paper : "letter",
        currency: VALID_CURRENCIES.includes(parsed.currency) ? parsed.currency : "$",
        month: VALID_MONTHS.includes(parsed.month) ? parsed.month : getDefaultMonthName(),
        year: sanitizeYear(parsed.year),
        title: typeof parsed.title === "string" ? parsed.title.slice(0, 60) : "Monthly Household Bill Tracker",
        notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 240) : "",
        bills: normalizeBills(parsed.bills)
      };
    } catch (_err) {
      return createDefaultState();
    }
  }

  function saveState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_err) {
      // Safely ignore storage quota or private browsing restrictions
    }
  }

  function computeSummary(state) {
    let totalBills = 0;
    let totalAutoPay = 0;
    let totalManual = 0;

    for (let i = 0; i < state.bills.length; i += 1) {
      const bill = state.bills[i];
      const amt = parseAmount(bill.amount);
      totalBills = roundMoney(totalBills + amt);
      if (bill.method === "Auto-Pay") {
        totalAutoPay = roundMoney(totalAutoPay + amt);
      } else {
        totalManual = roundMoney(totalManual + amt);
      }
    }

    return {
      totalBills,
      totalAutoPay,
      totalManual,
      count: state.bills.length
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    const shell = document.getElementById("mbt-shell");
    if (!shell) {
      return;
    }

    const el = {
      shell,
      modeMonthlyBtn: document.getElementById("mbt-mode-monthly"),
      modeAnnualBtn: document.getElementById("mbt-mode-annual"),
      paperLetterBtn: document.getElementById("mbt-paper-letter"),
      paperA4Btn: document.getElementById("mbt-paper-a4"),
      currencySelect: document.getElementById("mbt-currency"),
      monthSelect: document.getElementById("mbt-month"),
      yearInput: document.getElementById("mbt-year"),
      form: document.getElementById("mbt-form"),
      titleInput: document.getElementById("mbt-title"),
      sortDueBtn: document.getElementById("mbt-sort-due"),
      addBillBtn: document.getElementById("mbt-add-bill"),
      billList: document.getElementById("mbt-bill-list"),
      billRowTpl: document.getElementById("mbt-bill-row-tpl"),
      notesInput: document.getElementById("mbt-notes"),
      totalBillsOut: document.getElementById("mbt-total-bills"),
      totalAutoPayOut: document.getElementById("mbt-total-autopay"),
      totalManualOut: document.getElementById("mbt-total-manual"),
      downloadBtn: document.getElementById("mbt-download-pdf"),
      clearBtn: document.getElementById("mbt-clear-btn"),
      resetBtn: document.getElementById("mbt-reset-btn"),
      statusBox: document.getElementById("mbt-status"),
      previewMeta: document.getElementById("mbt-preview-meta"),
      paperSheet: document.getElementById("mbt-paper-sheet"),
      sheetTitle: document.getElementById("mbt-sheet-title"),
      sheetSubtitle: document.getElementById("mbt-sheet-subtitle"),
      sheetPeriod: document.getElementById("mbt-sheet-period"),
      sheetTotal: document.getElementById("mbt-sheet-total"),
      sheetAutoPay: document.getElementById("mbt-sheet-autopay"),
      sheetManual: document.getElementById("mbt-sheet-manual"),
      sheetCount: document.getElementById("mbt-sheet-count"),
      monthlyView: document.getElementById("mbt-monthly-view"),
      annualView: document.getElementById("mbt-annual-view"),
      sheetMonthlyTbody: document.getElementById("mbt-sheet-monthly-tbody"),
      sheetMonthlyTotal: document.getElementById("mbt-sheet-monthly-total"),
      sheetAnnualTbody: document.getElementById("mbt-sheet-annual-tbody"),
      sheetAnnualTotal: document.getElementById("mbt-sheet-annual-total"),
      sheetNotesContent: document.getElementById("mbt-sheet-notes-content"),
      mobilePreviewBtn: document.getElementById("mbt-mobile-preview-btn"),
      mobileDownloadBtn: document.getElementById("mbt-mobile-download-btn"),
      modal: document.getElementById("mbt-preview-modal"),
      modalZoomStage: document.getElementById("mbt-modal-zoom-stage"),
      modalCloseBtn: document.getElementById("mbt-modal-close"),
      modalDownloadBtn: document.getElementById("mbt-modal-download-btn"),
      zoomOutBtn: document.getElementById("mbt-zoom-out"),
      zoomInBtn: document.getElementById("mbt-zoom-in"),
      zoomLevelOut: document.getElementById("mbt-zoom-level")
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

    function renderBillRows() {
      el.billList.innerHTML = "";
      if (state.bills.length === 0) {
        el.billList.appendChild(
          createEmptyHint("No bills added yet. Click + Add Bill, or download a blank printable checklist.")
        );
        return;
      }

      const frag = document.createDocumentFragment();
      state.bills.forEach((bill) => {
        const clone = el.billRowTpl.content.cloneNode(true);
        const rowEl = clone.querySelector(".mbt-bill-row");
        const dueInput = clone.querySelector(".mbt-row-due");
        const nameInput = clone.querySelector(".mbt-row-name");
        const amountInput = clone.querySelector(".mbt-row-amount");
        const methodSelect = clone.querySelector(".mbt-row-method");

        rowEl.dataset.rowId = bill.id;
        dueInput.value = bill.dueDay;
        nameInput.value = bill.name;
        amountInput.value = bill.amount;
        methodSelect.value = VALID_METHODS.includes(bill.method) ? bill.method : "Manual";
        frag.appendChild(clone);
      });

      el.billList.appendChild(frag);
    }

    function syncSettingsControls() {
      el.shell.setAttribute("data-mode", state.mode);

      const isMonthly = state.mode === "monthly";
      el.modeMonthlyBtn.classList.toggle("is-active", isMonthly);
      el.modeMonthlyBtn.setAttribute("aria-checked", String(isMonthly));
      el.modeAnnualBtn.classList.toggle("is-active", !isMonthly);
      el.modeAnnualBtn.setAttribute("aria-checked", String(!isMonthly));

      const isLetter = state.paper === "letter";
      el.paperLetterBtn.classList.toggle("is-active", isLetter);
      el.paperLetterBtn.setAttribute("aria-checked", String(isLetter));
      el.paperA4Btn.classList.toggle("is-active", !isLetter);
      el.paperA4Btn.setAttribute("aria-checked", String(!isLetter));

      el.paperSheet.setAttribute("data-paper", state.paper);
      el.previewMeta.textContent = (isLetter ? "US Letter" : "A4") + " \u2022 Ink-Saver B&W";

      el.currencySelect.value = state.currency;
      el.monthSelect.value = state.month;
      el.yearInput.value = state.year;

      el.titleInput.value = state.title;
      el.notesInput.value = state.notes;

      el.monthlyView.hidden = !isMonthly;
      el.annualView.hidden = isMonthly;
    }

    function getDisplayPeriod() {
      const yr = sanitizeYear(state.year);
      if (state.mode === "annual") {
        return "Annual " + yr + " (Jan\u2013Dec)";
      }
      return state.month + " " + yr;
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

      const clonedMonthly = clone.querySelector(".mbt-monthly-view");
      const clonedAnnual = clone.querySelector(".mbt-annual-view");
      const isMonthly = state.mode === "monthly";
      if (clonedMonthly) {
        clonedMonthly.hidden = !isMonthly;
        clonedMonthly.style.display = isMonthly ? "block" : "none";
      }
      if (clonedAnnual) {
        clonedAnnual.hidden = isMonthly;
        clonedAnnual.style.display = isMonthly ? "none" : "block";
      }

      el.modalZoomStage.innerHTML = "";
      el.modalZoomStage.appendChild(clone);
      applyModalZoom();
    }

    function updateOutputs() {
      const summary = computeSummary(state);
      const sym = state.currency;

      // Left Builder Summary Bar
      el.totalBillsOut.textContent = formatMoney(summary.totalBills, sym, false);
      el.totalAutoPayOut.textContent = formatMoney(summary.totalAutoPay, sym, false);
      el.totalManualOut.textContent = formatMoney(summary.totalManual, sym, false);

      // Right Paper Preview Header & KPIs
      const displayTitle = state.title.trim() || "Monthly Household Bill Tracker";
      el.sheetTitle.textContent = displayTitle;
      el.sheetSubtitle.textContent =
        state.mode === "monthly"
          ? "Single-Month Bill Payment Checklist"
          : "12-Month Annual Bill Grid (Jan\u2013Dec)";
      el.sheetPeriod.textContent = getDisplayPeriod();

      el.sheetTotal.textContent = formatMoney(summary.totalBills, sym, false);
      el.sheetAutoPay.textContent = formatMoney(summary.totalAutoPay, sym, false);
      el.sheetManual.textContent = formatMoney(summary.totalManual, sym, false);
      el.sheetCount.textContent = String(summary.count);

      // Mode A: Single-Month Checklist Preview Table
      el.sheetMonthlyTbody.innerHTML = "";
      if (state.bills.length === 0) {
        for (let i = 0; i < 8; i += 1) {
          const tr = document.createElement("tr");
          const tdDue = document.createElement("td");
          tdDue.className = "mbt-due-cell";
          tdDue.innerHTML = "&nbsp;";
          const tdName = document.createElement("td");
          tdName.innerHTML = "&nbsp;";
          const tdAmt = document.createElement("td");
          tdAmt.className = "hbw-num-cell";
          tdAmt.innerHTML = "&nbsp;";
          const tdMethod = document.createElement("td");
          tdMethod.className = "mbt-method-cell";
          tdMethod.innerHTML = "&nbsp;";
          const tdPaid = document.createElement("td");
          tdPaid.className = "hbw-check-cell";
          tdPaid.textContent = "\u2610";

          tr.appendChild(tdDue);
          tr.appendChild(tdName);
          tr.appendChild(tdAmt);
          tr.appendChild(tdMethod);
          tr.appendChild(tdPaid);
          el.sheetMonthlyTbody.appendChild(tr);
        }
      } else {
        state.bills.forEach((bill, idx) => {
          const tr = document.createElement("tr");

          const tdDue = document.createElement("td");
          tdDue.className = "mbt-due-cell";
          tdDue.textContent = formatOrdinalDay(bill.dueDay);

          const tdName = document.createElement("td");
          tdName.textContent = bill.name.trim() || ("Bill " + (idx + 1));

          const tdAmt = document.createElement("td");
          tdAmt.className = "hbw-num-cell";
          tdAmt.textContent = formatMoney(parseAmount(bill.amount), sym, false);

          const tdMethod = document.createElement("td");
          tdMethod.className = "mbt-method-cell";
          const badge = document.createElement("span");
          const isAuto = bill.method === "Auto-Pay";
          badge.className = "mbt-method-badge " + (isAuto ? "mbt-badge-auto" : "mbt-badge-manual");
          badge.textContent = isAuto ? "Auto-Pay" : "Manual";
          tdMethod.appendChild(badge);

          const tdPaid = document.createElement("td");
          tdPaid.className = "hbw-check-cell";
          tdPaid.textContent = "\u2610";

          tr.appendChild(tdDue);
          tr.appendChild(tdName);
          tr.appendChild(tdAmt);
          tr.appendChild(tdMethod);
          tr.appendChild(tdPaid);
          el.sheetMonthlyTbody.appendChild(tr);
        });
      }

      el.sheetMonthlyTotal.textContent =
        state.bills.length === 0 ? "\u00A0" : formatMoney(summary.totalBills, sym, false);

      // Mode B: 12-Month Annual Grid Preview Table
      el.sheetAnnualTbody.innerHTML = "";
      if (state.bills.length === 0) {
        for (let i = 0; i < 8; i += 1) {
          const tr = document.createElement("tr");
          const tdName = document.createElement("td");
          tdName.innerHTML = "&nbsp;";
          const tdAmt = document.createElement("td");
          tdAmt.className = "hbw-num-cell";
          tdAmt.innerHTML = "&nbsp;";
          tr.appendChild(tdName);
          tr.appendChild(tdAmt);
          for (let m = 0; m < 12; m += 1) {
            const tdM = document.createElement("td");
            tdM.className = "mbt-ann-check";
            tdM.textContent = "\u2610";
            tr.appendChild(tdM);
          }
          el.sheetAnnualTbody.appendChild(tr);
        }
      } else {
        state.bills.forEach((bill, idx) => {
          const tr = document.createElement("tr");

          const tdName = document.createElement("td");
          const duePrefix = parseDueDay(bill.dueDay) !== null ? formatOrdinalDay(bill.dueDay) + " " : "";
          tdName.textContent = duePrefix + (bill.name.trim() || ("Bill " + (idx + 1)));

          const tdAmt = document.createElement("td");
          tdAmt.className = "hbw-num-cell";
          tdAmt.textContent = formatMoney(parseAmount(bill.amount), sym, false);

          tr.appendChild(tdName);
          tr.appendChild(tdAmt);

          for (let m = 0; m < 12; m += 1) {
            const tdM = document.createElement("td");
            tdM.className = "mbt-ann-check";
            tdM.textContent = "\u2610";
            tr.appendChild(tdM);
          }

          el.sheetAnnualTbody.appendChild(tr);
        });
      }

      el.sheetAnnualTotal.textContent =
        state.bills.length === 0 ? "\u00A0" : formatMoney(summary.totalBills, sym, false);

      // Notes Box
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
      el.modalZoomStage.style.transformOrigin = modalZoom < 1 ? "top center" : "top left";
      el.modalZoomStage.style.transform = "scale(" + modalZoom + ")";
      el.modalZoomStage.style.width = "100%";
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
      const isMonthly = state.mode === "monthly";

      let cursorY = MARGIN;

      // 1. Header
      const displayTitle = state.title.trim() || "Monthly Household Bill Tracker";
      const subtitle = isMonthly
        ? "Single-Month Bill Payment Checklist"
        : "12-Month Annual Bill Grid (Jan-Dec)";
      const periodText = isMonthly
        ? state.month + " " + sanitizeYear(state.year)
        : "Annual " + sanitizeYear(state.year) + " (Jan-Dec)";

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
      doc.text("PERIOD", pageWidth - MARGIN, cursorY + 3.5, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(17, 17, 17);
      doc.text(periodText, pageWidth - MARGIN, cursorY + 9, { align: "right" });

      cursorY += 13;
      doc.setDrawColor(17, 17, 17);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, cursorY, pageWidth - MARGIN, cursorY);
      cursorY += 4.5;

      // 2. Summary Strip (4 pure white ink-saver KPI boxes)
      const kpiHeight = 14;
      const kpiWidth = printableWidth / 4;
      const kpis = [
        { label: "EST. MONTHLY TOTAL", value: formatMoney(summary.totalBills, sym, true) },
        { label: "AUTO-PAY TOTAL", value: formatMoney(summary.totalAutoPay, sym, true) },
        { label: "MANUAL PAY TOTAL", value: formatMoney(summary.totalManual, sym, true) },
        { label: "BILLS LISTED", value: String(summary.count) }
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

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(17, 17, 17);
        doc.text(kpi.value, boxX + 2.5, cursorY + 11);
      });

      cursorY += kpiHeight + 5;

      // 3. Vector Bill Table (Mode A or Mode B)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(17, 17, 17);
      doc.text(
        isMonthly ? "MONTHLY BILL PAYMENT CHECKLIST" : "12-MONTH ANNUAL BILL TRACKER GRID (JAN-DEC)",
        MARGIN,
        cursorY + 2.5
      );
      cursorY += 4;

      if (isMonthly) {
        // Mode A: 5 Columns summing to 100% printable width (13% / 39% / 19% / 17% / 12%)
        const bodyRows =
          state.bills.length > 0
            ? state.bills.map((bill, idx) => [
                formatOrdinalDay(bill.dueDay),
                bill.name.trim() || ("Bill " + (idx + 1)),
                formatMoney(parseAmount(bill.amount), sym, true),
                bill.method === "Auto-Pay" ? "Auto-Pay" : "Manual",
                ""
              ])
            : Array.from({ length: 12 }, () => ["", "", "", "", ""]);

        doc.autoTable({
          startY: cursorY,
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN + 5, left: MARGIN },
          tableWidth: printableWidth,
          theme: "grid",
          showHead: "everyPage",
          showFoot: "lastPage",
          rowPageBreak: "avoid",
          head: [["Due Day", "Bill / Utility Name", "Est. Amount", "Method", "Paid"]],
          body: bodyRows,
          foot: [[
            "",
            "Total Estimated Monthly Bills",
            state.bills.length > 0 ? formatMoney(summary.totalBills, sym, true) : "",
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
            cellPadding: { top: 2.6, right: 2.6, bottom: 2.6, left: 2.6 },
            valign: "middle",
            minCellHeight: 7.6
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
            0: { cellWidth: printableWidth * 0.13, halign: "center" },
            1: { cellWidth: printableWidth * 0.39, halign: "left", overflow: "linebreak" },
            2: { cellWidth: printableWidth * 0.19, halign: "right" },
            3: { cellWidth: printableWidth * 0.17, halign: "center" },
            4: { cellWidth: printableWidth * 0.12, halign: "center" }
          },
          didParseCell(data) {
            if (data.section === "head" || data.section === "foot") {
              if (data.column.index === 0 || data.column.index === 3 || data.column.index === 4) {
                data.cell.styles.halign = "center";
              } else if (data.column.index === 2) {
                data.cell.styles.halign = "right";
              } else {
                data.cell.styles.halign = "left";
              }
            }
          },
          didDrawCell(data) {
            if (data.section === "body" && data.column.index === 4) {
              const boxSize = 3.4;
              const boxX = data.cell.x + (data.cell.width - boxSize) / 2;
              const boxY = data.cell.y + (data.cell.height - boxSize) / 2;
              doc.setDrawColor(17, 17, 17);
              doc.setLineWidth(0.3);
              doc.rect(boxX, boxY, boxSize, boxSize, "S");
            }
          }
        });
      } else {
        // Mode B: 14 Columns summing to 100% printable width (26% / 14% / 12 x 5%)
        const bodyRows =
          state.bills.length > 0
            ? state.bills.map((bill, idx) => {
                const duePrefix = parseDueDay(bill.dueDay) !== null ? formatOrdinalDay(bill.dueDay) + " - " : "";
                const label = duePrefix + (bill.name.trim() || ("Bill " + (idx + 1)));
                return [
                  label,
                  formatMoney(parseAmount(bill.amount), sym, true),
                  "", "", "", "", "", "", "", "", "", "", "", ""
                ];
              })
            : Array.from({ length: 12 }, () => [
                "", "", "", "", "", "", "", "", "", "", "", "", "", ""
              ]);

        const annualColStyles = {
          0: { cellWidth: printableWidth * 0.26, halign: "left", overflow: "linebreak" },
          1: { cellWidth: printableWidth * 0.14, halign: "right" }
        };
        for (let m = 0; m < 12; m += 1) {
          annualColStyles[m + 2] = { cellWidth: printableWidth * 0.05, halign: "center" };
        }

        doc.autoTable({
          startY: cursorY,
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN + 5, left: MARGIN },
          tableWidth: printableWidth,
          theme: "grid",
          showHead: "everyPage",
          showFoot: "lastPage",
          rowPageBreak: "avoid",
          head: [["Bill / Utility Name", "Est. Amt"].concat(MONTH_INITIALS)],
          body: bodyRows,
          foot: [[
            "Monthly Total",
            state.bills.length > 0 ? formatMoney(summary.totalBills, sym, true) : "",
            {
              content: "Tick each box after verifying payment",
              colSpan: 12,
              styles: { halign: "right", fontStyle: "normal", fontSize: 7.5, textColor: [85, 85, 85] }
            }
          ]],
          styles: {
            font: "helvetica",
            fontSize: 8,
            textColor: [17, 17, 17],
            fillColor: [255, 255, 255],
            lineColor: [204, 204, 204],
            lineWidth: 0.25,
            cellPadding: { top: 2.3, right: 1.5, bottom: 2.3, left: 1.8 },
            valign: "middle",
            minCellHeight: 7.2
          },
          headStyles: {
            fontStyle: "bold",
            fontSize: 7.6,
            textColor: [17, 17, 17],
            fillColor: [255, 255, 255],
            lineColor: [17, 17, 17],
            lineWidth: 0.35
          },
          footStyles: {
            fontStyle: "bold",
            fontSize: 8,
            textColor: [17, 17, 17],
            fillColor: [255, 255, 255],
            lineColor: [17, 17, 17],
            lineWidth: 0.35
          },
          columnStyles: annualColStyles,
          didParseCell(data) {
            if (data.section === "head") {
              if (data.column.index === 0) {
                data.cell.styles.halign = "left";
              } else if (data.column.index === 1) {
                data.cell.styles.halign = "right";
              } else {
                data.cell.styles.halign = "center";
              }
            } else if (data.section === "foot") {
              if (data.column.index === 0) {
                data.cell.styles.halign = "left";
              } else if (data.column.index === 1) {
                data.cell.styles.halign = "right";
              }
            }
          },
          didDrawCell(data) {
            if (data.section === "body" && data.column.index >= 2) {
              const boxSize = 3.0;
              const boxX = data.cell.x + (data.cell.width - boxSize) / 2;
              const boxY = data.cell.y + (data.cell.height - boxSize) / 2;
              doc.setDrawColor(17, 17, 17);
              doc.setLineWidth(0.28);
              doc.rect(boxX, boxY, boxSize, boxSize, "S");
            }
          }
        });
      }

      // 4. Notes Box with Page-Cut Protection (< 38mm remaining -> addPage)
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
      doc.text("NOTES & RATE-CHANGE REMINDERS", MARGIN, notesY + 2.5);

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

      // 5. Muted Footer on Every Page
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
      setStatus(
        "Downloaded " +
          filename +
          " (" +
          (state.paper === "a4" ? "A4" : "US Letter") +
          ", " +
          (isMonthly ? "Single-Month" : "12-Month Annual") +
          " ink-saver PDF)."
      );
    }

    // ----------------------------------------------------------------------
    // Event Listeners
    // ----------------------------------------------------------------------
    el.form.addEventListener("submit", (event) => {
      event.preventDefault();
      generatePdf(el.downloadBtn);
    });

    // Tracker Mode Switcher
    [el.modeMonthlyBtn, el.modeAnnualBtn].forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextMode = btn.getAttribute("data-mode");
        if (!VALID_MODES.includes(nextMode) || state.mode === nextMode) {
          return;
        }
        state.mode = nextMode;
        syncSettingsControls();
        persistAndRefresh();
        setStatus(
          nextMode === "monthly"
            ? "Switched to Single-Month Bill Checklist mode."
            : "Switched to 12-Month Annual Grid (Jan-Dec) mode."
        );
      });
    });

    // Paper Size Switcher
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

    // Currency, Month & Year Controls
    el.currencySelect.addEventListener("change", () => {
      if (VALID_CURRENCIES.includes(el.currencySelect.value)) {
        state.currency = el.currencySelect.value;
        persistAndRefresh();
      }
    });

    el.monthSelect.addEventListener("change", () => {
      if (VALID_MONTHS.includes(el.monthSelect.value)) {
        state.month = el.monthSelect.value;
        persistAndRefresh();
      }
    });

    el.yearInput.addEventListener("input", () => {
      const cleaned = el.yearInput.value.replace(/[^0-9]/g, "").slice(0, 4);
      state.year = cleaned || getDefaultYear();
      persistAndRefresh();
    });

    el.yearInput.addEventListener("blur", () => {
      state.year = sanitizeYear(el.yearInput.value);
      el.yearInput.value = state.year;
      persistAndRefresh();
    });

    el.yearInput.addEventListener("focus", () => {
      window.requestAnimationFrame(() => {
        if (document.activeElement === el.yearInput && typeof el.yearInput.select === "function") {
          el.yearInput.select();
        }
      });
    });

    // Title & Notes
    el.titleInput.addEventListener("input", () => {
      state.title = el.titleInput.value;
      persistAndRefresh();
    });

    el.notesInput.addEventListener("input", () => {
      state.notes = el.notesInput.value;
      persistAndRefresh();
    });

    // Sort by Due Date (1st -> 31st)
    el.sortDueBtn.addEventListener("click", () => {
      if (state.bills.length < 2) {
        setStatus("Add at least two bills to sort by due date.");
        return;
      }
      state.bills.sort((a, b) => {
        const dayA = parseDueDay(a.dueDay);
        const dayB = parseDueDay(b.dueDay);
        const rankA = dayA !== null ? dayA : 99;
        const rankB = dayB !== null ? dayB : 99;
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
      renderBillRows();
      persistAndRefresh();
      setStatus("Sorted bills chronologically by due date (1st to 31st).");
    });

    // Add Bill Row (Auto-Focus Bill Name & Smooth Scroll)
    el.addBillBtn.addEventListener("click", () => {
      const newBill = {
        id: nextId("bill"),
        dueDay: "",
        name: "",
        amount: "",
        method: "Manual"
      };
      state.bills.push(newBill);
      renderBillRows();
      persistAndRefresh();

      const domRow = el.billList.querySelector('[data-row-id="' + newBill.id + '"]');
      if (domRow) {
        const nameInput = domRow.querySelector(".mbt-row-name");
        domRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
        if (nameInput) {
          nameInput.focus();
        }
      }
      setStatus("Added a new bill row.");
    });

    // Dynamic Bill List Delegation
    el.billList.addEventListener("input", (event) => {
      const rowEl = event.target.closest(".mbt-bill-row");
      if (!rowEl) {
        return;
      }
      const billData = state.bills.find((item) => item.id === rowEl.dataset.rowId);
      if (!billData) {
        return;
      }

      if (event.target.classList.contains("mbt-row-due")) {
        const raw = event.target.value;
        if (raw === "") {
          billData.dueDay = "";
        } else {
          const clamped = parseDueDay(raw);
          billData.dueDay = clamped !== null ? String(clamped) : "";
        }
      } else if (event.target.classList.contains("mbt-row-name")) {
        billData.name = event.target.value;
      } else if (event.target.classList.contains("mbt-row-amount")) {
        billData.amount = event.target.value;
      }
      persistAndRefresh();
    });

    el.billList.addEventListener("focusout", (event) => {
      if (!event.target.classList.contains("mbt-row-due")) {
        return;
      }
      const rowEl = event.target.closest(".mbt-bill-row");
      if (!rowEl) {
        return;
      }
      const billData = state.bills.find((item) => item.id === rowEl.dataset.rowId);
      if (!billData) {
        return;
      }
      const clamped = parseDueDay(event.target.value);
      billData.dueDay = clamped !== null ? String(clamped) : "";
      event.target.value = billData.dueDay;
      persistAndRefresh();
    });

    el.billList.addEventListener("change", (event) => {
      if (!event.target.classList.contains("mbt-row-method")) {
        return;
      }
      const rowEl = event.target.closest(".mbt-bill-row");
      if (!rowEl) {
        return;
      }
      const billData = state.bills.find((item) => item.id === rowEl.dataset.rowId);
      if (!billData) {
        return;
      }
      billData.method = VALID_METHODS.includes(event.target.value) ? event.target.value : "Manual";
      persistAndRefresh();
    });

    el.billList.addEventListener("click", (event) => {
      const removeBtn = event.target.closest(".mbt-row-remove");
      if (!removeBtn) {
        return;
      }
      const rowEl = removeBtn.closest(".mbt-bill-row");
      if (!rowEl) {
        return;
      }
      state.bills = state.bills.filter((item) => item.id !== rowEl.dataset.rowId);
      renderBillRows();
      persistAndRefresh();
      setStatus("Removed bill row.");
    });

    // One-Tap Select on Focus for Due Day & Amount Inputs
    el.billList.addEventListener("focusin", (event) => {
      if (
        !event.target.classList.contains("mbt-row-due") &&
        !event.target.classList.contains("mbt-row-amount")
      ) {
        return;
      }
      const input = event.target;
      window.requestAnimationFrame(() => {
        if (document.activeElement === input && typeof input.select === "function") {
          input.select();
        }
      });
    });

    // Clear / Start Blank (with Strict Confirmation Popup)
    el.clearBtn.addEventListener("click", () => {
      const confirmed = window.confirm(
        "Clear all bills and start with a blank tracker? Your current entries will be removed."
      );
      if (!confirmed) {
        return;
      }
      state.bills = [];
      state.notes = "";
      if (!state.title.trim()) {
        state.title = "Monthly Household Bill Tracker";
      }
      syncSettingsControls();
      renderBillRows();
      persistAndRefresh();
      setStatus("Bill tracker cleared. Add your own bills or download a blank printable checklist PDF.");
    });

    // Reset Defaults
    el.resetBtn.addEventListener("click", () => {
      state = createDefaultState();
      syncSettingsControls();
      renderBillRows();
      persistAndRefresh();
      setStatus("Restored sample household bill defaults.");
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
    renderBillRows();
    updateOutputs();
  });
})();

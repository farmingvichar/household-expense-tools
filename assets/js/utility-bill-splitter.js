/**
 * Household Expense Tools - Roommate Utility Bill Splitter
 * Cents-safe mathematical engine, debt settlement algorithm, and UI state manager.
 */

(function () {
  "use strict";

  const KEY = "hxt-utility-bill-splitter";
  const CATS = ["Electricity", "Water", "Wi-Fi / Internet", "Gas", "Shared groceries", "Other"];
  const SPLITS = [
    ["equal", "Equal split"],
    ["percent", "By percent"],
    ["amount", "Fixed amounts"],
    ["days", "By days / shares"]
  ];
  
    let currencySym = "$";
  let uid = 1, state, lastText = "";

  // Helpers
  function nid() { return "i" + (uid++); }
  function $(s) { return document.querySelector(s); }
  function esc(s) { 
    return String(s).replace(/[&<>"']/g, function (c) { 
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; 
    }); 
  }
  function fmt(c) { 
    return (c < 0 ? "-" : "") + currencySym + Math.abs(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); 
  }

  function toCents(s) { 
    const n = Number(String(s).replace(/[$,\s]/g, "")); 
    return isFinite(n) ? Math.round(n * 100) : NaN; 
  }
  function num(v) { 
    if (v === undefined || v === "") return 0; 
    const n = Number(v); 
    return isFinite(n) ? n : NaN; 
  }

  // Default State
  function defaults() {
    const a = nid(), b = nid(), c = nid();
    return { 
      people: [
        { id: a, name: "Alex" }, 
        { id: b, name: "Sam" }, 
        { id: c, name: "Jordan" }
      ], 
      bills: [newBill(a, "Electricity")] 
    };
  }
  function newBill(payer, cat) { 
    return { id: nid(), cat: cat || "Electricity", amount: "", payer: payer, split: "equal", vals: {} }; 
  }
  function pname(p, i) { 
    return p.name.trim() || ("Roommate " + (i + 1)); 
  }

  // Local Storage Management
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || !Array.isArray(d.people) || !Array.isArray(d.bills) || d.people.length < 2) return false;
      state = { people: d.people, bills: d.bills };
      uid = Number(d.uid) || 100;
      return true;
    } catch (e) { return false; }
  }
    function save() {
    if (!$("#persist").checked) return;
    try { 
      localStorage.setItem(KEY, JSON.stringify({ people: state.people, bills: state.bills, uid: uid })); 
      localStorage.setItem(KEY + "-curr", currencySym);
    } catch (e) {}
  }
  function unsave() { 
    try { 
      localStorage.removeItem(KEY); 
      localStorage.removeItem(KEY + "-curr");
    } catch (e) {} 
  }

  // Math Engine: Cents-safe allocation with rotating remainders
  function allocate(total, w, offset) {
    const n = w.length;
    let sum = 0, i;
    for (i = 0; i < n; i++) sum += w[i];
    
    const exact = w.map(x => total * x / sum);
    const base = exact.map(Math.floor);
    
    let used = 0;
    for (i = 0; i < n; i++) used += base[i];
    
    const rem = total - used;
    const order = [];
    for (i = 0; i < n; i++) order.push(i);
    
    order.sort((a, b) => {
      const fa = exact[a] - base[a], fb = exact[b] - base[b];
      if (Math.abs(fa - fb) > 1e-9) return fb - fa;
      return ((a - offset + n) % n) - ((b - offset + n) % n);
    });
    
    for (i = 0; i < rem; i++) base[order[i % n]]++;
    return base;
  }

  function billShares(b, idx) {
    if (String(b.amount).trim() === "") return { skip: true };
    const total = toCents(b.amount);
    const n = state.people.length;
    let i, w = [];

    if (!(total > 0)) return { err: "Bill amount must be greater than zero." };
    if (total > 100000000) return { err: "Bill amount is too large." };

    if (b.split === "equal") { 
      for (i = 0; i < n; i++) w.push(1); 
      return { total: total, shares: allocate(total, w, idx) }; 
    }

    if (b.split === "amount") {
      let cs = [], s = 0;
      for (i = 0; i < n; i++) { 
        let c = b.vals[state.people[i].id] === undefined || b.vals[state.people[i].id] === "" ? 0 : toCents(b.vals[state.people[i].id]);
        if (!(c >= 0)) return { err: "Enter amounts of $0 or more." }; 
        cs.push(c); s += c; 
      }
      if (s !== total) return { err: "Amounts add up to " + fmt(s) + ". " + (s < total ? "Remaining: " : "Over by: ") + fmt(Math.abs(total - s)) + "." };
      return { total: total, shares: cs };
    }

    let sum = 0;
    for (i = 0; i < n; i++) { 
      let v = num(b.vals[state.people[i].id]);
      if (!(v >= 0)) return { err: b.split === "percent" ? "Enter percentages of 0 or more." : "Enter days or shares of 0 or more." };
      w.push(v); sum += v; 
    }

    if (b.split === "percent") {
      if (Math.abs(sum - 100) > 0.001) { 
        let d = Math.round(Math.abs(100 - sum) * 100) / 100;
        return { err: "Percentages add up to " + (Math.round(sum * 100) / 100) + "%. " + (sum < 100 ? "Remaining: " : "Over by: ") + d + "%." };
      }
    } else if (!(sum > 0)) {
      return { err: "Enter at least one day or share above 0." };
    }
    
    return { total: total, shares: allocate(total, w, idx) };
  }

  // Minimum Transaction Settlement Engine
  function settle(nets) {
    const cr = [], db = [], out = [];
    nets.forEach(x => { 
      if (x.net > 0) cr.push({ i: x.i, a: x.net }); 
      else if (x.net < 0) db.push({ i: x.i, a: -x.net }); 
    });
    cr.sort((a, b) => b.a - a.a); 
    db.sort((a, b) => b.a - a.a);
    
    let i = 0, j = 0;
    while (i < db.length && j < cr.length) {
      const m = Math.min(db[i].a, cr[j].a);
      out.push({ from: db[i].i, to: cr[j].i, a: m });
      db[i].a -= m; cr[j].a -= m;
      if (db[i].a === 0) i++;
      if (cr[j].a === 0) j++;
    }
    return out;
  }

  // Rendering Functions
  function optList(sel) {
    return state.people.map((p, i) => `<option data-pid="${p.id}" value="${p.id}"${sel === p.id ? " selected" : ""}>${esc(pname(p, i))}</option>`).join("");
  }

  function renderPeople() {
    $("#people").innerHTML = state.people.map((p, i) => `
      <div class="row">
        <input type="text" maxlength="24" data-name="${p.id}" value="${esc(p.name)}" aria-label="Roommate ${i + 1} name" placeholder="Roommate ${i + 1}" autocomplete="off">
        <button type="button" class="x" data-rmp="${p.id}" aria-label="Remove ${esc(pname(p, i))}"${state.people.length <= 2 ? " disabled" : ""}>&times;</button>
      </div>`).join("");
    $("#add-person").disabled = state.people.length >= 10;
  }

  function valsHtml(b) {
    if (b.split === "equal") return "";
    const unit = b.split === "percent" ? "%" : b.split === "amount" ? "$" : "days";
    const label = b.split === "percent" ? "Percent" : b.split === "amount" ? "Amount" : "Days or shares";
    return `
      <div class="vals">
        <label>${label} for each person</label>
        ${state.people.map((p, i) => `
          <div class="vrow">
            <span data-lbl="${p.id}">${esc(pname(p, i))}</span>
            <input type="text" inputmode="decimal" data-val="${p.id}" value="${esc(b.vals[p.id] === undefined ? "" : b.vals[p.id])}" placeholder="${unit}" aria-label="${esc(label)} for ${esc(pname(p, i))}">
          </div>`).join("")}
      </div>`;
  }

  function renderBills() {
    $("#bills").innerHTML = state.bills.map((b) => `
      <div class="bill" data-bid="${b.id}">
        <div class="top">
          <select data-f="cat" aria-label="Bill type">${CATS.map(c => `<option${c === b.cat ? " selected" : ""}>${c}</option>`).join("")}</select>
          <button type="button" class="x" data-rmb="${b.id}" aria-label="Remove bill"${state.bills.length <= 1 ? " disabled" : ""}>&times;</button>
        </div>
        <label>Amount</label>
                <div class="money">
          <span aria-hidden="true">${esc(currencySym)}</span>
          <input type="text" inputmode="decimal" data-f="amount" value="${esc(b.amount)}" placeholder="0.00" aria-label="Bill amount" autocomplete="off">
        </div>
        <label>Paid by</label>
        <select data-f="payer">${optList(b.payer)}</select>
        <label>Split method</label>
        <select data-f="split">${SPLITS.map(s => `<option value="${s[0]}"${s[0] === b.split ? " selected" : ""}>${s[1]}</option>`).join("")}</select>
        ${valsHtml(b)}
        <p class="err" role="alert"></p>
      </div>`).join("");
  }

  function compute() {
    const n = state.people.length;
    let i, paid = Array(n).fill(0), owed = Array(n).fill(0), used = 0, total = 0, bad = 0;
    
    const names = state.people.map(pname);
    let seen = {}, dup = false, empty = false;
    
    state.people.forEach(p => { 
      const key = p.name.trim().toLowerCase(); 
      if (!key) empty = true; else if (seen[key]) dup = true; seen[key] = 1; 
    });
    
    $("#people-err").textContent = dup ? "Two roommates have the same name. Give each a different name." : empty ? "Some names are empty. We will show them as Roommate 1, 2, and so on." : "";
    
    state.bills.forEach((b, idx) => {
      const r = billShares(b, idx);
      const el = document.querySelector(`[data-bid="${b.id}"] .err`);
      if (r.skip) { if (el) el.textContent = ""; return; }
      if (r.err) { bad++; if (el) el.textContent = r.err; return; }
      if (el) el.textContent = "";
      
      let pi = state.people.findIndex(p => p.id === b.payer);
      if (pi < 0) pi = 0;
      
      paid[pi] += r.total; total += r.total; used++;
      for (i = 0; i < n; i++) owed[i] += r.shares[i];
    });

    const box = $("#results");
    if (!used) {
      box.innerHTML = `<p class="note">${bad ? "Fix the highlighted bill to see the summary." : "Enter a bill amount to see the summary."}</p>`;
      lastText = ""; $("#copy").disabled = true; save(); return;
    }

    const nets = [];
    let sumNet = 0;
    for (i = 0; i < n; i++) { 
      const nt = paid[i] - owed[i]; 
      nets.push({ i: i, net: nt }); 
      sumNet += nt; 
    }

    if (sumNet !== 0) { 
      box.innerHTML = '<p class="err">Internal check failed: balances do not add up. Please reset and try again.</p>'; 
      lastText = ""; $("#copy").disabled = true; return; 
    }

    const pays = settle(nets);
    
    let html = (bad ? '<p class="err">Some bills have errors and are left out of this summary.</p>' : "") +
      `<p class="note">${used} ${used === 1 ? "bill" : "bills"}, total ${fmt(total)}</p><div class="cards">` +
      nets.map(x => {
        const cls = x.net > 0 ? "pc get" : "pc";
        const msg = x.net > 0 ? "Gets back" : x.net < 0 ? "Owes" : "All settled";
        return `<div class="${cls}"><b>${esc(names[x.i])}</b><span class="amt">${x.net === 0 ? "$0.00" : fmt(Math.abs(x.net))}</span> <span class="note">${msg}</span></div>`;
      }).join("") + '</div>';

    if (pays.length) {
      html += '<h3>Payments to settle up</h3>' + pays.map(p => `<div class="pay"><span>${esc(names[p.from])} pays ${esc(names[p.to])}</span><strong>${fmt(p.a)}</strong></div>`).join("");
    } else {
      html += '<p>Everyone is even. No payments needed.</p>';
    }
    box.innerHTML = html;

    // Generate Copy Text
    const lines = [`Roommate bill summary (${used} ${used === 1 ? "bill" : "bills"}, total ${fmt(total)})`, ""];
    if (pays.length) pays.forEach(p => lines.push(`${names[p.from]} pays ${names[p.to]}: ${fmt(p.a)}`));
    else lines.push("Everyone is even.");
    lines.push("", "Calculated at householdexpensetools.com");
    lastText = lines.join("\n");
    $("#copy").disabled = false;
    save();
  }

  // Event Listeners
  function bill(el) { 
    const w = el.closest(".bill"); 
    if (!w) return null; 
    return state.bills.find(b => b.id === w.dataset.bid); 
  }

  document.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset.name) {
      const k = state.people.findIndex(p => p.id === t.dataset.name);
      state.people[k].name = t.value;
      const nm = pname(state.people[k], k);
      document.querySelectorAll(`option[data-pid="${t.dataset.name}"]`).forEach(o => o.textContent = nm);
      document.querySelectorAll(`[data-lbl="${t.dataset.name}"]`).forEach(o => o.textContent = nm);
      compute(); return;
    }
    const b = bill(t);
    if (!b) return;
    if (t.dataset.f === "amount") { b.amount = t.value; compute(); }
    else if (t.dataset.val) { b.vals[t.dataset.val] = t.value; compute(); }
  });

  document.addEventListener("change", e => {
    const t = e.target, b = bill(t);
    if (!b || !t.dataset.f) return;
    if (t.dataset.f === "cat") b.cat = t.value;
    else if (t.dataset.f === "payer") b.payer = t.value;
    else if (t.dataset.f === "split") { b.split = t.value; b.vals = {}; renderBills(); }
    compute();
  });

  document.addEventListener("click", e => {
    const t = e.target.closest("button");
    if (!t) return;
    
    if (t.id === "add-person" && state.people.length < 10) { 
      state.people.push({ id: nid(), name: "" }); 
      renderPeople(); renderBills(); compute(); 
      const ins = document.querySelectorAll("[data-name]"); ins[ins.length - 1].focus(); 
    }
    else if (t.dataset.rmp && state.people.length > 2) {
      const id = t.dataset.rmp; 
      state.people = state.people.filter(p => p.id !== id);
      state.bills.forEach(b => { if (b.payer === id) b.payer = state.people[0].id; delete b.vals[id]; });
      renderPeople(); renderBills(); compute();
    }
    else if (t.id === "add-bill") { 
      state.bills.push(newBill(state.people[0].id, "Water")); 
      renderBills(); compute(); 
      const a = document.querySelectorAll('[data-f="amount"]'); a[a.length - 1].focus(); 
    }
    else if (t.dataset.rmb && state.bills.length > 1) { 
      const bid = t.dataset.rmb; 
      state.bills = state.bills.filter(b => b.id !== bid); 
      renderBills(); compute(); 
    }
            else if (t.id === "reset") { 
      // Smart Check: Ignore default names and check for REAL user data
      let hasData = false;
      
      const defNames = ["Alex", "Sam", "Jordan"];
      if (state.people.length !== 3) {
          hasData = true;
      } else {
          state.people.forEach((p, i) => { 
              if (p.name.trim() !== defNames[i] && p.name.trim() !== "") hasData = true; 
          });
      }
      
      if (state.bills.length !== 1) hasData = true;
      state.bills.forEach(b => { 
          if (b.amount.trim() !== "") hasData = true; 
          if (Object.values(b.vals).some(v => String(v).trim() !== "")) hasData = true;
      });
      
      if (!hasData || confirm("Clear all roommates and bills?")) { 
          state = defaults(); 
          renderPeople(); 
          renderBills(); 
          compute(); 
          $("#copy-status").textContent = ""; 
      } 
    }


    else if (t.id === "copy" && lastText) { 
      copyText(lastText); 
    }
  });

  function copyText(txt) {
    const ok = () => { $("#copy-status").textContent = "Copied ✓"; setTimeout(() => $("#copy-status").textContent = "", 2500); };
    const fb = () => {
      const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { $("#copy-status").textContent = "Copy failed. Select text manually."; }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fb); else fb();
  }

  $("#persist").addEventListener("change", function () { if (this.checked) save(); else unsave(); });

  // Init
  const restored = load();
  if (!restored) state = defaults();
  
  // Set up currency dropdown
  const currSel = $("#global-currency");
  if (currSel) {
    try { 
      const savedCurr = localStorage.getItem(KEY + "-curr");
      if (savedCurr) { currSel.value = savedCurr; currencySym = savedCurr; }
    } catch(e) {}
    
    currSel.addEventListener("change", function() {
      currencySym = this.value;
      renderBills(); 
      compute();     
      save();
    });
  }

  $("#persist").checked = restored;
  renderPeople(); renderBills(); compute();

})();


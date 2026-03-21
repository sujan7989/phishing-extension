document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["lastDetection"], (res) => {
    const d        = res?.lastDetection || {};
    const url      = d.url        || "Unknown";
    const reason   = d.reason     || "Suspicious patterns detected";
    const prob     = Number(d.probability) || 0;
    const features = (d.features && typeof d.features === "object") ? d.features : {};

    // Summary cards
    const urlEl     = document.getElementById("detailUrl");
    const verdictEl = document.getElementById("detailVerdict");
    const probEl    = document.getElementById("detailProb");
    const barEl     = document.getElementById("detailBar");
    const reasonEl  = document.getElementById("detailReason");
    const tsEl      = document.getElementById("timestamp");

    if (urlEl)     urlEl.textContent     = url;
    if (verdictEl) verdictEl.textContent = prob >= 30 ? "⚠️ PHISHING" : "✅ LEGITIMATE";
    if (probEl)    probEl.textContent    = prob + "%";
    if (reasonEl)  reasonEl.textContent  = reason;
    if (tsEl)      tsEl.textContent      = "Analyzed: " + new Date().toLocaleString();

    // Animate risk bar
    if (barEl) {
      setTimeout(() => {
        barEl.style.width      = prob + "%";
        barEl.style.background = prob >= 70 ? "#c62828" : prob >= 40 ? "#f57c00" : "#388e3c";
      }, 100);
    }

    // Features table with badges
    const tbody = document.getElementById("featuresBody");
    if (tbody) {
      const keys = Object.keys(features);
      if (!keys.length) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#888;">No AI features available</td></tr>`;
      } else {
        tbody.innerHTML = "";
        keys.forEach((k) => {
          let raw = features[k];
          let display = typeof raw === "object" ? JSON.stringify(raw) : String(raw);
          if (display.length > 200) display = display.slice(0, 200) + "…";

          // Badge coloring
          let cell = display;
          const lower = display.toLowerCase();
          if (lower === "yes" || lower === "phishing") {
            cell = `<span class="badge badge-yes">${display}</span>`;
          } else if (lower === "no" || lower === "legitimate") {
            cell = `<span class="badge badge-no">${display}</span>`;
          } else if (lower === "none" || lower === "0") {
            cell = `<span class="badge badge-no">${display}</span>`;
          } else if (
            k.toLowerCase().includes("keyword") ||
            k.toLowerCase().includes("spoof") ||
            k.toLowerCase().includes("typo") ||
            k.toLowerCase().includes("tld") ||
            k.toLowerCase().includes("embed") ||
            k.toLowerCase().includes("brand")
          ) {
            // Warn badge for any suspicious signal that has a real value
            cell = `<span class="badge badge-warn">${display}</span>`;
          }

          const tr = document.createElement("tr");
          tr.innerHTML = `<td><strong>${k}</strong></td><td>${cell}</td>`;
          tbody.appendChild(tr);
        });
      }
    }

    // Back button — smart label
    const backBtn = document.getElementById("backBtn");
    if (backBtn) {
      // Show contextual label based on where user came from
      if (document.referrer.includes("dashboard")) {
        backBtn.textContent = "⬅ Back to Dashboard";
      } else if (document.referrer.includes("warning")) {
        backBtn.textContent = "⬅ Back to Warning";
      } else {
        backBtn.textContent = "⬅ Back";
      }
      backBtn.addEventListener("click", () => { window.history.back(); });
    }

    // Report button
    const reportBtn = document.getElementById("reportBtn");
    if (reportBtn) {
      reportBtn.addEventListener("click", () => {
        if (!url || url === "Unknown") { alert("No site to report."); return; }
        chrome.runtime.sendMessage({ action: "reportSite", url }, () => {
          reportBtn.textContent = "✅ Reported!";
          reportBtn.disabled = true;
        });
      });
    }
  });
});

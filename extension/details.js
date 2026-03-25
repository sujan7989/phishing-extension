document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["lastDetection"], (res) => {
    const d        = res?.lastDetection || {};
    const url      = d.url        || "Unknown";
    const reason   = d.reason     || "Suspicious patterns detected";
    const prob     = Number(d.probability) || 0;
    const features = (d.features && typeof d.features === "object") ? d.features : {};

    renderPage(url, reason, prob, features);

    // If features are empty or minimal, fetch live from API
    if (url !== "Unknown" && Object.keys(features).length < 3) {
      fetchFeaturesFromAPI(url);
    }
  });
});

// ── Live API fetch to enrich features ──────────────────────
function fetchFeaturesFromAPI(url) {
  const APIs = [
    "https://phishing-extension-tib4.onrender.com/predict",
    "http://127.0.0.1:5000/predict",
  ];
  (async () => {
    for (const api of APIs) {
      try {
        const res = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (data?.features && typeof data.features === "object" && Object.keys(data.features).length > 0) {
          renderPage(url, data.reason || "Suspicious patterns detected", data.probability || 0, data.features);
          chrome.storage.local.set({ lastDetection: {
            url, reason: data.reason, probability: data.probability, features: data.features,
          }});
          return;
        }
      } catch (_) { /* try next */ }
    }
  })();
}

// ── Render all page content ─────────────────────────────────
function renderPage(url, reason, prob, features) {
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

  if (barEl) {
    setTimeout(() => {
      barEl.style.width      = prob + "%";
      barEl.style.background = prob >= 70 ? "#c62828" : prob >= 40 ? "#f57c00" : "#388e3c";
    }, 100);
  }

  // Features table
  const tbody = document.getElementById("featuresBody");
  if (tbody) {
    const keys = Object.keys(features);
    if (!keys.length) {
      tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#888;">⏳ Loading features...</td></tr>`;
    } else {
      tbody.innerHTML = "";
      keys.forEach((k) => {
        let raw     = features[k];
        let display = typeof raw === "object" ? JSON.stringify(raw) : String(raw);
        if (display.length > 200) display = display.slice(0, 200) + "…";

        let cell        = display;
        const lower     = display.toLowerCase();
        const keyLower  = k.toLowerCase();

        if (lower === "yes" || lower === "phishing") {
          cell = `<span class="badge badge-yes">${display}</span>`;
        } else if (lower === "no" || lower === "legitimate") {
          cell = `<span class="badge badge-no">${display}</span>`;
        } else if (lower === "none" || lower === "0") {
          cell = `<span class="badge badge-no">${display}</span>`;
        } else if (
          keyLower.includes("keyword") || keyLower.includes("spoof") ||
          keyLower.includes("typo")    || keyLower.includes("tld") ||
          keyLower.includes("embed")   || keyLower.includes("brand")
        ) {
          cell = `<span class="badge badge-warn">${display}</span>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `<td><strong>${k}</strong></td><td>${cell}</td>`;
        tbody.appendChild(tr);
      });
    }
  }

  // Back button
  const backBtn = document.getElementById("backBtn");
  if (backBtn && !backBtn._bound) {
    backBtn._bound = true;
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
  if (reportBtn && !reportBtn._bound) {
    reportBtn._bound = true;
    reportBtn.addEventListener("click", () => {
      if (!url || url === "Unknown") { alert("No site to report."); return; }
      chrome.runtime.sendMessage({ action: "reportSite", url }, () => {
        reportBtn.textContent = "✅ Reported!";
        reportBtn.disabled = true;
      });
    });
  }
}

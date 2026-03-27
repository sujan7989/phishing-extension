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

    // Always fetch VirusTotal intelligence
    if (url !== "Unknown") {
      fetchVirusTotal(url);
      renderContentSignals(d);
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
          // HTTPS = Yes should be green, not red
          if (k.toLowerCase().includes("https")) {
            cell = `<span class="badge badge-no">${display}</span>`;
          } else {
            cell = `<span class="badge badge-yes">${display}</span>`;
          }
        } else if (lower === "no" || lower === "legitimate") {
          // HTTPS = No should be red
          if (k.toLowerCase().includes("https")) {
            cell = `<span class="badge badge-yes">${display}</span>`;
          } else {
            cell = `<span class="badge badge-no">${display}</span>`;
          }
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

// ── VirusTotal Intelligence ─────────────────────────────────
function fetchVirusTotal(url) {
  const vtStatus  = document.getElementById("vtStatus");
  const vtEngines = document.getElementById("vtEngines");
  const vtLink    = document.getElementById("vtLink");
  const vtCard    = document.getElementById("vtCard");
  if (!vtStatus) return;

  const VT_APIS = [
    "https://phishing-extension-tib4.onrender.com/virustotal",
    "http://127.0.0.1:5000/virustotal",
  ];

  (async () => {
    for (const api of VT_APIS) {
      try {
        const res = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const vt   = data?.virustotal;
        if (!vt) continue;

        if (vt.error) {
          vtStatus.textContent  = "VirusTotal: " + vt.error;
          vtEngines.textContent = "";
          if (vt.vt_link) {
            vtLink.href = vt.vt_link;
            vtLink.style.display = "inline-block";
          }
          return;
        }

        const detected = vt.engines_detected || 0;
        const total    = vt.engines_total    || 0;
        const verdict  = vt.verdict          || "unknown";

        // Color the card based on verdict
        if (verdict === "malicious") {
          vtCard.style.background   = "#fff5f5";
          vtCard.style.borderColor  = "#ef9a9a";
          vtStatus.style.color      = "#c62828";
          vtStatus.textContent      = `🚨 Flagged by ${detected} / ${total} security engines`;
        } else if (verdict === "suspicious") {
          vtCard.style.background   = "#fff8e1";
          vtCard.style.borderColor  = "#ffe082";
          vtStatus.style.color      = "#f57f17";
          vtStatus.textContent      = `⚠️ Suspicious — ${detected} / ${total} engines flagged`;
        } else {
          vtCard.style.background   = "#f1f8e9";
          vtCard.style.borderColor  = "#a5d6a7";
          vtStatus.style.color      = "#2e7d32";
          vtStatus.textContent      = `✅ Clean — 0 / ${total} engines flagged`;
        }

        vtEngines.innerHTML =
          `<span style="color:#c62828">Malicious: ${vt.malicious}</span> &nbsp;|&nbsp; ` +
          `<span style="color:#f57f17">Suspicious: ${vt.suspicious}</span> &nbsp;|&nbsp; ` +
          `<span style="color:#2e7d32">Harmless: ${vt.harmless}</span> &nbsp;|&nbsp; ` +
          `<span style="color:#888">Undetected: ${vt.undetected}</span>`;

        if (vt.vt_link) {
          vtLink.href = vt.vt_link;
          vtLink.style.display = "inline-block";
        }
        return;
      } catch (_) { /* try next */ }
    }
    // All failed
    if (vtStatus) vtStatus.textContent = "VirusTotal unavailable — backend offline";
  })();
}

// ── Content Analysis Signals ────────────────────────────────
function renderContentSignals(d) {
  const section = document.getElementById("contentSection");
  const card    = document.getElementById("contentCard");
  if (!section || !card) return;

  const features = d.features || {};
  const items = [];

  if (features["Password Field"] === "Yes")
    items.push({ icon: "🔑", text: "Password input field detected on page", bad: false });
  if (features["Form Action Mismatch"])
    items.push({ icon: "🚨", text: `Form submits to different domain: <strong>${features["Form Action Mismatch"]}</strong>`, bad: true });
  if (features["Hidden Iframes"])
    items.push({ icon: "👁️", text: `${features["Hidden Iframes"]} hidden iframe(s) found`, bad: true });
  if (features["Suspicious Scripts"])
    items.push({ icon: "⚠️", text: `${features["Suspicious Scripts"]} script(s) from suspicious domains`, bad: true });
  if (features["Title Spoofing"])
    items.push({ icon: "🎭", text: `Page title spoofs brand: <strong>${features["Title Spoofing"]}</strong>`, bad: true });

  // Also show domain age if available
  if (features["Domain Age"] && features["Domain Age"] !== "Unknown") {
    const isNew = features["Domain Age"].includes("NEW");
    items.push({
      icon: isNew ? "🆕" : "📅",
      text: `Domain age: <strong>${features["Domain Age"]}</strong>`,
      bad: isNew,
    });
  }

  if (!items.length) {
    // Poll storage once more after a short delay — content script may not have run yet
    setTimeout(() => {
      chrome.storage.local.get(["lastDetection"], (res) => {
        const f = res?.lastDetection?.features || {};
        const hasContent = f["Password Field"] || f["Form Action Mismatch"] ||
                           f["Hidden Iframes"] || f["Title Spoofing"] || f["Domain Age"];
        if (hasContent) {
          renderContentSignals(res.lastDetection);
        } else {
          section.style.display = "block";
          card.innerHTML = `<span style="color:#aaa;">No suspicious page content detected.</span>`;
        }
      });
    }, 2000);
    return;
  }

  section.style.display = "block";
  card.innerHTML = items.map(item =>
    `<div style="margin-bottom:8px;">
      ${item.icon}
      <span style="color:${item.bad ? "#c62828" : "#333"}">${item.text}</span>
    </div>`
  ).join("");
}

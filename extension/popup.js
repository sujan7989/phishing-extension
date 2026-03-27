document.addEventListener("DOMContentLoaded", () => {
  const resultDiv    = document.getElementById("result");
  const dashBtn      = document.getElementById("openDashboard");
  const reportBtn    = document.getElementById("reportBtn");
  const scanInput    = document.getElementById("scanInput");
  const scanBtn      = document.getElementById("scanBtn");
  const scanResult   = document.getElementById("scanResult");
  const statBlocked  = document.getElementById("statBlocked");
  const statWeek     = document.getElementById("statWeek");
  const statToday    = document.getElementById("statToday");

  const API_URLS = [
    "https://phishing-extension-tib4.onrender.com/predict",
    "http://127.0.0.1:5000/predict",
    "http://localhost:5000/predict",
  ];

  async function fetchPredict(url) {
    for (const api of API_URLS) {
      try {
        const res = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) return res.json();
      } catch (_) { /* try next */ }
    }
    throw new Error("All API endpoints unreachable");
  }

  // ── Online / offline indicator ───────────────────────────
  const statusEl = document.getElementById("onlineStatus");
  chrome.storage.local.get(["backendOnline"], (res) => {
    if (statusEl) {
      const online = res.backendOnline !== false;
      statusEl.textContent  = online ? "🟢 Online" : "🔴 Local mode";
      statusEl.style.color  = online ? "#a5d6a7" : "#ffcc80";
    }
  });

  // ── Load stats from history ──────────────────────────────
  chrome.storage.local.get(["phishingHistory"], (res) => {
    const history = Array.isArray(res.phishingHistory) ? res.phishingHistory : [];
    const now     = new Date();
    const todayStr = now.toDateString();
    const weekAgo  = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const total   = history.length;
    const today   = history.filter(h => h.time && new Date(h.time).toDateString() === todayStr).length;
    const week    = history.filter(h => h.time && new Date(h.time) >= weekAgo).length;

    if (statBlocked) statBlocked.textContent = total;
    if (statWeek)    statWeek.textContent    = week;
    if (statToday)   statToday.textContent   = today;
  });

  // ── Current tab prediction ───────────────────────────────
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (!tabs?.[0]?.url) {
      resultDiv.textContent = "No active tab found.";
      return;
    }
    const url = tabs[0].url;

    if (url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
      resultDiv.className = "result-box safe";
      resultDiv.innerHTML = "✅ Internal page — no check needed.";
      return;
    }

    resultDiv.className = "result-box";
    resultDiv.innerHTML = "🔍 Analyzing current page...";

    try {
      const data       = await fetchPredict(url);
      const prediction = (data.prediction || "unknown").toLowerCase();
      const prob       = parseFloat(data.probability) || 0;
      const icon       = prediction === "phishing" ? "🚨" : prediction === "suspicious" ? "⚠️" : "✅";

      resultDiv.className = "result-box " + (
        prediction === "phishing" ? "phishing" :
        prediction === "suspicious" ? "suspicious" : "safe"
      );
      resultDiv.innerHTML =
        `<strong>${icon} ${prediction.charAt(0).toUpperCase() + prediction.slice(1)}</strong><br>` +
        `Risk Score: ${prob.toFixed(1)}%`;

      // Show content signals if any were detected on this page
      showContentSignals(url);
    } catch {
      resultDiv.className = "result-box safe";
      resultDiv.innerHTML = "⚡ Running in local mode — still protected.";
    }
  });

  // ── Manual URL scan ──────────────────────────────────────
  async function runManualScan() {
    let url = (scanInput.value || "").trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    scanResult.className = "scan-result checking";
    scanResult.textContent = "🔍 Scanning...";
    scanBtn.disabled = true;

    try {
      const data       = await fetchPredict(url);
      const prediction = (data.prediction || "unknown").toLowerCase();
      const prob       = parseFloat(data.probability) || 0;
      const icon       = prediction === "phishing" ? "🚨" : "✅";

      scanResult.className = "scan-result " + (prediction === "phishing" ? "phishing" : "safe");
      scanResult.innerHTML =
        `<strong>${icon} ${prediction.charAt(0).toUpperCase() + prediction.slice(1)}</strong> — ${prob.toFixed(1)}% risk`;
    } catch {
      scanResult.className = "scan-result checking";
      scanResult.textContent = "⚡ Local mode — backend unreachable. Try again shortly.";
    }
    scanBtn.disabled = false;
  }

  if (scanBtn)   scanBtn.addEventListener("click", runManualScan);
  if (scanInput) scanInput.addEventListener("keydown", (e) => { if (e.key === "Enter") runManualScan(); });

  // ── Content signals from page inspection ─────────────────
  function showContentSignals(tabUrl) {
    chrome.storage.local.get(["lastDetection"], (res) => {
      const d = res?.lastDetection || {};
      // Only show if it's for the current tab's URL
      if (!d.url || !tabUrl.startsWith(d.url.split("?")[0])) return;
      const f = d.features || {};
      const items = [];
      if (f["Password Field"] === "Yes")   items.push("🔑 Password form detected");
      if (f["Form Action Mismatch"])        items.push(`🚨 Form submits to: ${f["Form Action Mismatch"]}`);
      if (f["Hidden Iframes"])              items.push(`👁️ ${f["Hidden Iframes"]} hidden iframe(s)`);
      if (f["Title Spoofing"])              items.push(`🎭 Title spoofs: ${f["Title Spoofing"]}`);
      if (f["Domain Age"]?.includes("NEW")) items.push(`🆕 ${f["Domain Age"]}`);

      const el = document.getElementById("contentSignals");
      if (el && items.length) {
        el.style.display = "block";
        el.innerHTML = "<strong>📄 Page Signals:</strong><br>" + items.join("<br>");
      }
    });
  }

  // ── Dashboard ────────────────────────────────────────────
  if (dashBtn) {
    dashBtn.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("dashboard.html") });
      }
      window.close();
    });
  }

  // ── Report ───────────────────────────────────────────────
  if (reportBtn) {
    reportBtn.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) { alert("No active tab URL found."); return; }
      chrome.runtime.sendMessage({ action: "reportSite", url: tab.url });
      reportBtn.textContent = "✅ Reported!";
      reportBtn.disabled = true;
      setTimeout(() => {
        reportBtn.textContent = "🚨 Report This Site";
        reportBtn.disabled = false;
      }, 2000);
    });
  }
});
